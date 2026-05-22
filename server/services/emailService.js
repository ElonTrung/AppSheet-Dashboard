import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';

// Danh sách các từ khóa lọc email hóa đơn
const INVOICE_SUBJECT_KEYWORDS = ['hóa đơn', 'hoa don', 'invoice', 'tra cứu', 'tra cuu'];

// Biểu thức Regex quét link tra cứu hóa đơn phổ biến tại VN
const LOOKUP_URL_REGEX = /https?:\/\/(?:www\.)?(?:[a-zA-Z0-9-]+\.)*(?:meinvoice\.vn|einvoice\.vn|einvoice\.com\.vn|sinvoice\.viettel\.vn|hoadondientu\.gdt\.gov\.vn|vnpt-invoice\.com\.vn|invoice\.vnpt\.vn|hoadondientu\.vn|e-invoice\.com\.vn|bkav\.com\.vn|hdbdt\.vnpt\.vn|cyberbill\.vn|smartvas\.com\.vn|vinaeinvoice\.vn|minvoice\.vn)[^\s"'><]*/gi;

// Biểu thức Regex quét mã tra cứu/mã nhận hóa đơn
// Thường là chuỗi chữ-số độ dài khoảng 6-12 ký tự ngẫu nhiên đi kèm tiêu đề
const LOOKUP_CODE_KEYWORDS = [
  /mã\s+tra\s+cứu\s+hóa\s+đơn[\s:]+([a-z0-9\-]{4,30})/i,
  /ma\s+tra\s+cuu\s+hoa\s+don[\s:]+([a-z0-9\-]{4,30})/i,
  /mã\s+tra\s+cứu[\s:]+([a-z0-9\-]{4,30})/i,
  /ma\s+tra\s+cuu[\s:]+([a-z0-9\-]{4,30})/i,
  /số\s+bảo\s+mật[\s:]+([a-z0-9\-]{4,30})/i,
  /so\s+bao\s+mat[\s:]+([a-z0-9\-]{4,30})/i,
  /mã\s+nhận\s+hóa\s+đơn[\s:]+([a-z0-9\-]{4,30})/i,
  /ma\s+nhan\s+hoa\s+don[\s:]+([a-z0-9\-]{4,30})/i,
  /mã\s+nhận[\s:]+([a-z0-9\-]{4,30})/i,
  /ma\s+nhan[\s:]+([a-z0-9\-]{4,30})/i,
  /mật\s+khẩu\s+tra\s+cứu[\s:]+([a-z0-9\-]{4,30})/i,
  /mat\s+khau\s+tra\s+cuu[\s:]+([a-z0-9\-]{4,30})/i,
  /mã\s+bảo\s+mật[\s:]+([a-z0-9\-]{4,30})/i,
  /ma\s+bao\s+mat[\s:]+([a-z0-9\-]{4,30})/i,
  /mã\s+số\s+tra\s+cứu[\s:]+([a-z0-9\-]{4,30})/i,
  /ma\s+so\s+tra\s+cuu[\s:]+([a-z0-9\-]{4,30})/i,
  /mã\s+truy\s+cập[\s:]+([a-z0-9\-]{4,30})/i,
  /ma\s+truy\s+cap[\s:]+([a-z0-9\-]{4,30})/i
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
      if (/mã\s+tra\s+cứu|ma\s+tra\s+cuu|mã\s+nhận/i.test(text)) {
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
    /(?:mã\s+số\s+thuế\s+của\s+Đơn\s+vị\s+bán|ma\s+so\s+thue\s+cua\s+don\s+vi\s+ban|mã\s+số\s+thuế\s+đơn\s+vị\s+bán|ma\s+so\s+thue\s+don\s+vi\s+ban|mã\s+số\s+thuế\s+người\s+bán|ma\s+so\s+thue\s+nguoi\s+ban|mã\s+số\s+thuế\s+bên\s+bán|ma\s+so\s+thue\s+ben\s+ban)[\s:]+(\d+)/i,
    /mst\s+(?:đơn\s+vị\s+bán|don\s+vi\s+ban|người\s+bán|nguoi\s+ban|bên\s+bán|ben\s+ban)[\s:]+(\d+)/i,
    /(?:mã\s+số\s+thuế|ma\s+so\s+thue|mst)[\s:]+(\d{10,13})/i
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
      // Tìm kiếm tất cả các thư trong hộp thư
      console.log('Đang quét danh sách thư trong hộp thư...');
      const messages = await client.search({ all: true });
      console.log(`Tìm thấy tổng cộng ${messages.length} thư.`);

      // Cắt lấy 50 thư gần đây nhất (mới nhất), đảo ngược để xử lý thư mới nhất trước
      const limitedMessages = messages.slice(-50).reverse();
      console.log(`Sẽ tiến hành kiểm tra ${limitedMessages.length} thư gần nhất.`);

      for (const uid of limitedMessages) {
        // Tải nội dung email thô
        const messageData = await client.fetchOne(uid, { source: true, envelope: true });
        
        if (!messageData || !messageData.source) continue;

        // Lấy tiêu đề và người gửi để kiểm tra xem có phải email hóa đơn không
        const subject = messageData.envelope.subject || '';
        const from = messageData.envelope.from ? messageData.envelope.from[0].address : '';
        const subjectLower = subject.toLowerCase();

        // Kiểm tra xem tiêu đề email có chứa các từ khóa hóa đơn không
        const isInvoiceEmail = INVOICE_SUBJECT_KEYWORDS.some(kw => subjectLower.includes(kw));

        if (isInvoiceEmail) {
          console.log(`>>> Phát hiện Email hóa đơn đầu vào: "${subject}" từ [${from}]`);
          
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
              date: messageData.envelope.date,
              ...invoiceInfo
            });

            // Đánh dấu thư đã đọc (SEEN) sau khi đã quét thành công thông tin tra cứu
            await client.messageFlagsAdd(uid, ['\\Seen']);
            console.log(`  + Đã đánh dấu Đã Đọc cho email UID: ${uid}`);
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
