import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve('./.env') });
const config = process.env;

async function testFetch() {
  const appId = config.APPSHEET_APP_ID || 'e488fb86-d7f7-4dd2-970d-8246e1a05eee';
  const accessKey = config.APPSHEET_ACCESS_KEY || 'V2-WQdVR-MbOzC-ROAZT-aYCDs-NjjEo-nEp0D-VuZ4U-nVdeQ';
  const tableName = 'muahang';

  const url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${tableName}/Action`;

  const payload = {
    "Action": "Find",
    "Properties": {
      "Locale": "vi-VN",
      "Timezone": "Asia/Ho_Chi_Minh"
    },
    "Rows": []
  };

  try {
    console.log('Sending request to AppSheet API (Action: Find)...');
    const response = await axios.post(url, payload, {
      headers: {
        'ApplicationAccessKey': accessKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Number of rows returned:', response.data ? response.data.length : 0);
    if (response.data && response.data.length > 0) {
      console.log('First row columns and values:', JSON.stringify(response.data[0], null, 2));
    }
  } catch (error) {
    const errorMsg = error.response && error.response.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    console.error('Error fetching from AppSheet:', errorMsg);
  }
}

testFetch();
