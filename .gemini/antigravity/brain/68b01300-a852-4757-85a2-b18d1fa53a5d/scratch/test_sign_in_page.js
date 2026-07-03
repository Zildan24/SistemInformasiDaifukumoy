const http = require('http');

http.get('http://localhost:3000/sign-in', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Body length:', data.length);
    if (data.includes('DAIFUKUMOY')) {
      console.log('Success: Page contains DAIFUKUMOY branding!');
    } else {
      console.log('Warning: Page does not contain expected branding.');
    }
    if (data.includes('Ingat Saya (24 Jam)')) {
      console.log('Success: Page contains the Remember Me checkbox text!');
    }
  });
}).on('error', (err) => {
  console.error('Error fetching page:', err.message);
});
