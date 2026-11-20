// Render poster.html with a given background plate to a 1080x1350 PNG.
// Usage: node compose.js <background.png> <out.png>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [bg, out] = process.argv.slice(2);
  const dir = __dirname;
  const html = fs.readFileSync(path.join(dir, 'poster.html'), 'utf8').replace('BG', path.basename(bg));
  const tmp = path.join(dir, '_render.html');
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto('file://' + tmp);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('.brand,.headline span,.tagline,.cta')].map(e => {
      const r = e.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(e);
      const t = range.getBoundingClientRect();
      return `${e.className || e.textContent}: x ${Math.round(t.left)}-${Math.round(t.right)} y ${Math.round(t.top)}-${Math.round(t.bottom)}`;
    }));
  console.log(boxes.join('\n'));
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  await browser.close();
  fs.unlinkSync(tmp);
})();
