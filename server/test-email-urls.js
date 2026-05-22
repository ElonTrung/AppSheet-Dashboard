import dotenv from 'dotenv';
import path from 'path';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

dotenv.config({ path: path.resolve('./.env') });
const config = process.env;

const LOOKUP_URL_REGEX = /https?:\/\/(?:www\.)?(?:[a-zA-Z0-9-]+\.)*(?:meinvoice\.vn|einvoice\.vn|sinvoice\.viettel\.vn|hoadondientu\.gdt\.gov\.vn|vnpt-invoice\.com\.vn|invoice\.vnpt\.vn|hoadondientu\.vn|e-invoice\.com\.vn|bkav\.com\.vn|hdbdt\.vnpt\.vn|cyberbill\.vn|smartvas\.com\.vn|vinaeinvoice\.vn)[^\s"'><]*/gi;

async function run() {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS
    },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const messages = await client.search({ all: true });
      console.log(`Total messages: ${messages.length}`);
      
      // Lấy 50 thư gần nhất
      const last50 = messages.slice(-50).reverse();
      
      for (const uid of last50) {
        const messageData = await client.fetchOne(uid, { source: true, envelope: true });
        const subject = messageData.envelope.subject || '';
        const subjectLower = subject.toLowerCase();
        
        if (['hóa đơn', 'hoa don', 'invoice', 'tra cứu', 'tra cuu'].some(kw => subjectLower.includes(kw))) {
          console.log(`\n======================================================`);
          console.log(`UID: ${uid} | Subject: ${subject}`);
          const parsed = await simpleParser(messageData.source);
          const body = (parsed.html || '') + '\n' + (parsed.text || '');
          const matches = body.match(LOOKUP_URL_REGEX) || [];
          console.log('Matched URLs:');
          matches.forEach((m, idx) => {
            console.log(`  [${idx}] ${m}`);
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error(err);
  }
}

run();
