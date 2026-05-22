import { parseInvoiceXml } from './services/xmlParser.js';

const filePath = 'D:\\Dashboard\\server\\downloads\\1779353172484_1C26THA_00003100_4001106158.xml';
console.log('Parsing local XML:', filePath);

const result = parseInvoiceXml(filePath);
console.log('Result:', JSON.stringify(result, null, 2));
