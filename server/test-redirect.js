import axios from 'axios';

async function testRedirect() {
  const url = 'https://api.meinvoice.vn/api/v3/WebHook/EmailTrackingHandler.ashx?TransactionID=25F8F3E18WK3&Email=vlxdtinthinh@gmail.com';
  console.log('Fetching URL with axios (no redirects):', url);

  try {
    const response = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Body:', response.data);
  } catch (error) {
    console.error('Error during axios fetch:', error.message);
    if (error.response) {
      console.log('Error Status:', error.response.status);
      console.log('Error Headers:', JSON.stringify(error.response.headers, null, 2));
    }
  }
}

testRedirect();
