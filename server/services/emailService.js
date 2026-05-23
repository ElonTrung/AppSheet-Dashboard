import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';

// Danh sách các từ khóa lọc email hóa đơn
const INVOICE_SUBJECT_KEYWORDS = ['hóa đơn', 'hoa don', 'invoice', 'tra cứu', 'tra cuu'];

// Danh sách các từ khóa loại trừ email hóa đơn đầu ra của chính công ty gửi đi
const INVOICE_SUBJECT_EXCLUDE_KEYWORDS = [
  'tín thịnh gửi',
  'tin thinh gui',
  'tín thịnh gởi',
  'tin thinh goi',
  'chi nhánh hà nội gửi',
  'chi nhanh ha noi gui',
  'chi nhánh hà nội gởi',
  'chi nhanh ha noi goi'
];

// Biểu thức Regex quét link tra cứu hóa đơn phổ biến tại VN
const LOOKUP_URL_REGEX = /https?:\/\/(?:www\.)?(?:[a-zA-Z0-9-]+\.)*(?:meinvoice\.vn|einvoice\.vn|einvoice\.com\.vn|(?:sinvoice|vinvoice)\.viettel\.vn|hoadondientu\.gdt\.gov\.vn|vnpt-invoice\.com\.vn|invoice\.vnpt\.vn|hoadondientu\.vn|e-invoice\.com\.vn|bkav\.com\.vn|hdbdt\.vnpt\.vn|cyberbill\.vn|smartvas\.com\.vn|vinaeinvoice\.vn|minvoice\.vn|vin-hoadon\.com|vin-hoadon\.vn|easyinvoice\.vn)[^\s"'><]*/gi;

// Biểu thức Regex quét mã tra cứu/mã nhận hóa đơn
// Thường là chuỗi chữ-số độ dài khoảng 6-12 ký tự ngẫu nhiên đi kèm tiêu đề
const LOOKUP_CODE_KEYWORDS = [
  /mã\s+số\s+bí\s+mật[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+so\s+bi\s+mat[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+số\s+bảo\s+mật[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+so\s+bao\s+mat[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+tra\s+cứu\s+hóa\s+đơn[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+tra\s+cuu\s+hoa\s+don[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+tra\s+cứu[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+tra\s+cuu[\s:]+([a-z0-9\-]{4,45})/i,
  /số\s+bảo\s+mật[\s:]+([a-z0-9\-]{4,45})/i,
  /so\s+bao\s+mat[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+nhận\s+hóa\s+đơn[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+nhan\s+hoa\s+don[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+nhận[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+nhan[\s:]+([a-z0-9\-]{4,45})/i,
  /mật\s+khẩu\s+tra\s+cứu[\s:]+([a-z0-9\-]{4,45})/i,
  /mat\s+khau\s+tra\s+cuu[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+bảo\s+mật[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+bao\s+mat[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+số\s+tra\s+cứu[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+so\s+tra\s+cuu[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+truy\s+cập[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+truy\s+cap[\s:]+([a-z0-9\-]{4,45})/i,
  /nhập\s+mã\s+số[\s:]+([a-z0-9\-]{4,45})/i,
  /nhap\s+ma\s+so[\s:]+([a-z0-9\-]{4,45})/i,
  /mã\s+số(?![\s]*thuế)[\s:]+([a-z0-9\-]{4,45})/i,
  /ma\s+so(?![\s]*thue)[\s:]+([a-z0-9\-]{4,45})/i
];

/**
 * Phân tích nội dung email thô và trích xuất link + mã tra cứu
 * @param {string} htmlBody 
 * @param {string} textBody 
 * @returns {object}
 */
function sanitizeHtmlBodyForUrls(html) {
  if (!html) return '';
  return html
    .replace(/&nbsp;?/g, ' ')
    .replace(/&nbsp/g, ' ')
    .replace(/\xa0/g, ' ');
}

export function extractInvoiceDetails(htmlBody, textBody = '') {
  const result = {
    lookupUrl: null,
    lookupCode: null,
    provider: 'Unknown',
    sellerMst: null
  };

  // Decode common URL breakages in htmlBody first to avoid grabbing entities like &nbsp; into lookupUrl
  const sanitizedHtmlBody = sanitizeHtmlBodyForUrls(htmlBody);
  const sanitizedTextBody = sanitizeHtmlBodyForUrls(textBody);
  const bodyToScan = sanitizedHtmlBody + '\n' + sanitizedTextBody;

  // 1. Trích xuất link tra cứu
  let urlMatches = bodyToScan.match(LOOKUP_URL_REGEX);
  if (urlMatches && urlMatches.length > 0) {
    // Lọc bỏ các link tracking/webhook để lấy link tra cứu trực tiếp thực sự
    urlMatches = urlMatches.filter(url => !url.includes('EmailTrackingHandler') && !url.includes('/WebHook/') && !url.includes('tracking'));
  }

  if (urlMatches && urlMatches.length > 0) {
    // Ưu tiên link dài hơn (thường chứa token trực tiếp)
    const bestUrl = urlMatches.reduce((a, b) => a.length > b.length ? a : b);
    
    // Giải mã HTML entities (như &amp; thành &)
    const decodedUrl = bestUrl.replace(/&amp;/g, '&');
    
    // Loại bỏ các ký tự dấu câu và ngoặc thừa ở cuối link (như dấu chấm, dấu phẩy, dấu đóng ngoặc vuông/tròn)
    result.lookupUrl = decodedUrl.replace(/[.,;:\s\])]+$/, '');
    
    // Nhận diện nhà cung cấp dựa trên tên miền
    const urlLower = result.lookupUrl.toLowerCase();
    if (urlLower.includes('meinvoice')) result.provider = 'MISA';
    else if (urlLower.includes('vnpt') || urlLower.includes('vnpt-invoice')) result.provider = 'VNPT';
    else if (urlLower.includes('viettel') || urlLower.includes('sinvoice')) result.provider = 'VIETTEL';
    else if (urlLower.includes('einvoice') || urlLower.includes('e-invoice')) result.provider = 'THAISON';
    else if (urlLower.includes('bkav')) result.provider = 'BKAV';
    else if (urlLower.includes('cyberbill')) result.provider = 'CYBERBILL';
    else if (urlLower.includes('minvoice')) result.provider = 'MINVOICE';
    else result.provider = 'OTHER';
  }

  // Get fully stripped plain text for robust matching of codes & MSTs (ignoring inline HTML tags like <strong>)
  let plainTextToScan = textBody || '';
  if (htmlBody) {
    const $ = cheerio.load(htmlBody);
    const cleanHtmlText = $.text().replace(/\xa0/g, ' ').replace(/&nbsp;?/g, ' ');
    plainTextToScan = cleanHtmlText + '\n' + plainTextToScan;
  } else {
    plainTextToScan = plainTextToScan.replace(/\xa0/g, ' ').replace(/&nbsp;?/g, ' ');
  }

  // 2. Trích xuất mã tra cứu bằng Regex Keywords trên plain text
  for (const regex of LOOKUP_CODE_KEYWORDS) {
    const match = plainTextToScan.match(regex);
    if (match && match[1]) {
      const code = match[1].trim();
      // Loại bỏ ký tự thừa hoặc ký tự kết thúc như dấu chấm, dấu phẩy
      result.lookupCode = code.replace(/[.,;:_]$/, '');
      break;
    }
  }

  // 3. Nếu chưa quét được mã tra cứu bằng Regex thông thường, quét thông qua các thẻ HTML bằng Cheerio
  if (!result.lookupCode && htmlBody) {
    const $ = cheerio.load(htmlBody);
    // Tìm các đoạn text chứa từ khóa tra cứu và lấy text đứng ngay sau nó
    $('td, p, span, div, b, strong').each((i, elem) => {
      const text = $(elem).text().trim();
      if (/mã\s+tra\s+cứu|ma\s+tra\s+cuu|mã\s+nhận|mã\s+số(?![\s]*thuế)|ma\s+so(?![\s]*thue)/i.test(text)) {
        // Lấy text của thẻ con hoặc thẻ lân cận
        const siblingText = $(elem).next().text().trim() || $(elem).parent().text().trim();
        const codeMatch = siblingText.match(/:?\s*([A-Z0-9\-]{6,12})/i);
        if (codeMatch && codeMatch[1]) {
          result.lookupCode = codeMatch[1];
          return false; // Break loop
        }
      }
    });
  }

  // 4. Nếu link tra cứu là link trực tiếp chứa token (ví dụ của MISA), có thể không cần mã tra cứu
  if (result.lookupUrl && result.lookupUrl.includes('token=') && !result.lookupCode) {
    // Trích xuất mã token làm lookupCode tạm thời hoặc đánh dấu không cần code
    result.lookupCode = 'DIRECT_URL';
  }

  // 5. Trích xuất Mã số thuế người bán (sellerMst) - phục vụ cho M-Invoice/Bình Minh
  const mstRegexes = [
    /(?:mã\s+số\s+thuế\s+của\s+Đơn\s+vị\s+bán|ma\s+so\s+thue\s+cua\s+don\s+vi\s+ban|mã\s+số\s+thuế\s+đơn\s+vị\s+bán|ma\s+so\s+thue\s+don\s+vi\s+ban|mã\s+số\s+thuế\s+người\s+bán|ma\s+so\s+thue\s+nguoi\s+ban|mã\s+số\s+thuế\s+bên\s+bán|ma\s+so\s+thue\s+ben\s+ban)[\s:]+([0-9\-]+)/i,
    /mst\s+(?:đơn\s+vị\s+bán|don\s+vi\s+ban|người\s+bán|nguoi\s+ban|bên\s+bán|ben\s+ban)[\s:]+([0-9\-]+)/i,
    /(?:mã\s+số\s+thuế|ma\s+so\s+thue|mst)[\s:]+([0-9\-]{10,15})/i
  ];

  for (const regex of mstRegexes) {
    const match = plainTextToScan.match(regex);
    if (match && match[1]) {
      result.sellerMst = match[1].trim();
      break;
    }
  }

  return result;
}

/**
 * Kết nối vào hòm thư Gmail, quét email chưa đọc và trích xuất hóa đơn
 * @param {object} config Cấu hình kết nối từ file .env
 * @returns {Promise<Array>} Danh sách các hóa đơn cần xử lý
 */
export async function fetchInvoiceEmails(config) {
  const imapConfig = {
    host: config.EMAIL_IMAP_HOST || 'imap.gmail.com',
    port: parseInt(config.EMAIL_IMAP_PORT) || 993,
    secure: true,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS
    },
    logger: false
  };

  const client = new ImapFlow(imapConfig);
  const invoicesToProcess = [];

  try {
    console.log(`Đang kết nối tới hòm thư Gmail: ${config.EMAIL_USER}...`);
    await client.connect();

    // Mở hộp thư đến (INBOX) ở chế độ ghi (để có thể đánh dấu đã đọc sau khi xử lý)
    const lock = await client.getMailboxLock('INBOX');
    try {
      // 1. Quét danh sách thư chưa đọc (unseen) trong vòng 15 ngày qua để tránh quét hàng nghìn thư cũ từ nhiều năm trước
      console.log('Đang quét danh sách thư chưa đọc trong 15 ngày qua...');
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      const unseenMessages = await client.search({ unseen: true, since: fifteenDaysAgo });
      console.log(`Tìm thấy ${unseenMessages.length} thư chưa đọc trong vòng 15 ngày gần đây.`);

      // 2. Quét danh sách tất cả các thư để lấy 30 thư gần nhất (phục vụ đối soát lại hóa đơn cũ chưa khớp)
      console.log('Đang quét danh sách 30 thư gần nhất...');
      const allMessages = await client.search({ all: true });
      const recentMessages = allMessages.slice(-30);

      // Gộp danh sách, loại bỏ trùng lặp UID và đảo ngược để thư mới nhất được xử lý trước
      const combinedMessages = Array.from(new Set([...unseenMessages, ...recentMessages])).reverse();
      console.log(`Sẽ tiến hành kiểm tra ${combinedMessages.length} thư (gồm thư chưa đọc gần đây và 30 thư gần nhất).`);

      console.log('Đang tải trước danh sách envelope theo lô (batch)...');
      const envelopes = [];
      const batchSize = 500;
      for (let i = 0; i < combinedMessages.length; i += batchSize) {
        const batch = combinedMessages.slice(i, i + batchSize);
        for await (const msg of client.fetch(batch, { envelope: true })) {
          envelopes.push(msg);
        }
      }
      console.log(`Đã tải xong ${envelopes.length} envelopes.`);

      for (const msg of envelopes) {
        const seq = msg.seq;
        const uid = msg.uid;
        if (!seq || !msg.envelope) continue;

        // Lấy tiêu đề và người gửi để kiểm tra xem có phải email hóa đơn không
        const subject = msg.envelope.subject || '';
        const from = msg.envelope.from ? msg.envelope.from[0].address : '';
        const subjectLower = subject.toLowerCase().replace(/\s+/g, ' ');

        // Kiểm tra xem tiêu đề email có chứa các từ khóa hóa đơn không
        const isInvoiceEmail = INVOICE_SUBJECT_KEYWORDS.some(kw => subjectLower.includes(kw));
        
        // Bỏ qua các email hóa đơn đầu ra gửi cho khách hàng
        const isExcluded = INVOICE_SUBJECT_EXCLUDE_KEYWORDS.some(kw => subjectLower.includes(kw));

        if (isInvoiceEmail && !isExcluded) {
          console.log(`>>> Phát hiện Email hóa đơn đầu vào: "${subject}" từ [${from}]`);
          
          // 2. Chỉ tải full source khi chắc chắn đây là email hóa đơn
          const messageData = await client.fetchOne(seq, { source: true });
          if (!messageData || !messageData.source) continue;

          // Parse nội dung email thô
          const parsed = await simpleParser(messageData.source);
          const htmlContent = parsed.html || '';
          const textContent = parsed.text || '';

          // Trích xuất thông tin tra cứu
          const invoiceInfo = extractInvoiceDetails(htmlContent, textContent);
          
          if (invoiceInfo.lookupUrl) {
            console.log(`  + Đã trích xuất: [${invoiceInfo.provider}] Link: ${invoiceInfo.lookupUrl} - Mã: ${invoiceInfo.lookupCode}`);
            
            invoicesToProcess.push({
              emailUid: uid,
              subject: subject,
              sender: from,
              date: msg.envelope.date,
              ...invoiceInfo
            });

            // Đánh dấu thư đã đọc (SEEN) sau khi đã quét thành công thông tin tra cứu
            await client.messageFlagsAdd(seq, ['\\Seen']);
            console.log(`  + Đã đánh dấu Đã Đọc cho email Seq: ${seq} (UID: ${uid})`);
          } else {
            console.log(`  - Không trích xuất được link tra cứu từ email này.`);
          }
        }
      }
    } finally {
      // Giải phóng khóa hộp thư
      lock.release();
    }

    await client.logout();
    console.log('Đã ngắt kết nối Email an toàn.');
  } catch (error) {
    console.error('Lỗi khi kết nối hoặc đọc email:', error);
    try { await client.logout(); } catch (e) {}
  }

  return invoicesToProcess;
}
