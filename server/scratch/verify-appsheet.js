import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getAppSheetPurchaseOrders } from '../services/appsheetService.js';

dotenv.config({ path: path.resolve(fs.existsSync('./server/.env') ? './server/.env' : './.env') });
const config = process.env;

async function verify() {
  console.log('=== VERIFYING APPSHEET RECORD ===');
  const pos = await getAppSheetPurchaseOrders(config);
  
  // Find the row for Bình Minh
  const bmRow = pos.find(p => p.So_mua_hang === '001/KTBM');
  if (bmRow) {
    console.log('Found Bình Minh Record:');
    console.log(`- So_mua_hang: ${bmRow.So_mua_hang}`);
    console.log(`- Ten_NCC: ${bmRow.Ten_NCC}`);
    console.log(`- Tong_tien_mua_hang_co_VAT: ${bmRow.Tong_tien_mua_hang_co_VAT}`);
    console.log(`- So_hd: "${bmRow.So_hd}"`);
    console.log(`- So_tien_hoa_don: "${bmRow.So_tien_hoa_don}"`);
  } else {
    console.log('Could not find Bình Minh record with primary key 001/KTBM.');
  }

  // Find the row for Phát Bình Minh too
  const pbmRow = pos.find(p => p.Ten_NCC && p.Ten_NCC.toLowerCase().includes('phát bình minh'));
  if (pbmRow) {
    console.log('\nFound Phát Bình Minh Record:');
    console.log(`- So_mua_hang: ${pbmRow.So_mua_hang}`);
    console.log(`- Ten_NCC: ${pbmRow.Ten_NCC}`);
    console.log(`- Tong_tien_mua_hang_co_VAT: ${pbmRow.Tong_tien_mua_hang_co_VAT}`);
    console.log(`- So_hd: "${pbmRow.So_hd}"`);
    console.log(`- So_tien_hoa_don: "${pbmRow.So_tien_hoa_don}"`);
  } else {
    console.log('\nCould not find any record containing "Phát Bình Minh".');
  }
}

verify();
