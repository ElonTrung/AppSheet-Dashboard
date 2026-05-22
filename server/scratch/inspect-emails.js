import dotenv from 'dotenv';
import path from 'path';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

dotenv.config({ path: path.resolve('./server/.env') });
const config = process.env;

async function run() {
  const client = new ImapFlow({
    host: config.EMAIL_IMAP_HOST || 'imap.gmail.com',
    port: parseInt(config.EMAIL_IMAP_PORT) || 993,
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
      const uids = [29447, 29442, 29428];
      for (const uid of uids) {
        console.log(`=== FETCHING UID: ${uid} ===`);
        try {
          const messageData = await client.fetchOne(uid, { source: true, envelope: true });
          if (!messageData || !messageData.source) {
            console.log(`UID ${uid} not found or no source.`);
            continue;
          }
          const parsed = await simpleParser(messageData.source);
          console.log(`Subject: ${parsed.subject}`);
          console.log(`Text Length: ${parsed.text?.length || 0}`);
          console.log(`Html Length: ${parsed.html?.length || 0}`);
          console.log(`--- RAW TEXT ---`);
          console.log(parsed.text || '(empty)');
          console.log(`--- RAW HTML (PART) ---`);
          console.log(parsed.html ? parsed.html.substring(0, 2000) : '(empty)');
        } catch (err) {
          console.error(`Error fetching UID ${uid}:`, err);
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    console.error('Connection error:', error);
  }
}

run();
