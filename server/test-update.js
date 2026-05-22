import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve('./.env') });
const config = process.env;

async function testUpdate() {
  const appId = config.APPSHEET_APP_ID || 'e488fb86-d7f7-4dd2-970d-8246e1a05eee';
  const accessKey = config.APPSHEET_ACCESS_KEY || 'V2-WQdVR-MbOzC-ROAZT-aYCDs-NjjEo-nEp0D-VuZ4U-nVdeQ';
  const tableName = 'muahang';

  const url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${tableName}/Action`;

  const payload = {
    "Action": "Edit",
    "Properties": {
      "Locale": "vi-VN",
      "Timezone": "Asia/Ho_Chi_Minh"
    },
    "Rows": [
      {
        "So_mua_hang": "007/NGLM",
        "So_hd": "304",
        "So_tien_hoa_don": 1738800
      }
    ]
  };

  try {
    console.log('Sending Edit request for So_hd and So_tien_hoa_don to AppSheet API...');
    const response = await axios.post(url, payload, {
      headers: {
        'ApplicationAccessKey': accessKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    const errorMsg = error.response && error.response.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    console.error('Error updating AppSheet:', errorMsg);
  }
}

testUpdate();
