const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE UNCAUGHT EXCEPTION:', error.message);
    errors.push(error.message);
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  if (errors.length === 0) {
    console.log("No console errors detected.");
  }
  
  await browser.close();
})();
