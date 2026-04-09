const https = require('https');

const APP_ID = "e488fb86-d7f7-4dd2-970d-8246e1a05eee";
const ACCESS_KEY = "V2-WQdVR-MbOzC-ROAZT-aYCDs-NjjEo-nEp0D-VuZ4U-nVdeQ";

const postData = JSON.stringify({
  Action: "Find",
  Properties: {
    Locale: "vi-VN",
    Timezone: "SE Asia Standard Time"
  },
  Rows: []
});

const options = {
  hostname: 'api.appsheet.com',
  port: 443,
  path: `/api/v2/apps/${APP_ID}/tables/baogia/Action`,
  method: 'POST',
  headers: {
    'ApplicationAccessKey': ACCESS_KEY,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      console.log("FIRST ROW:");
      console.log(JSON.stringify(parsedData[0], null, 2));
    } catch (e) {
      console.error("Parse error", e);
    }
  });
});

req.on('error', (e) => {
  console.error("Fetch error", e);
});

req.write(postData);
req.end();
