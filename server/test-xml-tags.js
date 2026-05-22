import { downloadInvoiceXml } from './services/crawlerService.js';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';

async function testXmlTags() {
  const invoice = {
    lookupUrl: 'https://www.meinvoice.vn/tra-cuu/?sc=XAF7FGQANN05&m=vlxdtinthinh@gmail.com;info@habico.vn&n=CÔNG',
    lookupCode: 'DIRECT_URL',
    provider: 'MISA',
    subject: 'Test MISA XML tags'
  };

  const xmlPath = await downloadInvoiceXml(invoice);
  if (!xmlPath) {
    console.error('Download failed.');
    return;
  }

  console.log('Successfully downloaded to:', xmlPath);
  const xmlData = fs.readFileSync(xmlPath, 'utf-8');
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  
  const jsonObj = parser.parse(xmlData);
  console.log('Parsed XML JSON structure (top-level keys):', Object.keys(jsonObj));
  
  // Save JSON representation
  fs.writeFileSync('d:/Dashboard/server/downloads/test_parsed.json', JSON.stringify(jsonObj, null, 2), 'utf-8');
  console.log('JSON structure written to server/downloads/test_parsed.json');
}

testXmlTags();
