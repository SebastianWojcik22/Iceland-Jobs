import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 2000 });
const pdfData = readFileSync('C:/Users/sebas/Desktop/Sebastian_Wojcik_CV_PM.pdf');
const base64 = pdfData.toString('base64');

await page.setContent(`<!DOCTYPE html>
<html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head><body style="margin:0;background:#fff">
<canvas id="c"></canvas>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const data = atob('${base64}');
const arr = new Uint8Array(data.length);
for(let i=0;i<data.length;i++) arr[i]=data.charCodeAt(i);
pdfjsLib.getDocument({data:arr}).promise.then(pdf=>pdf.getPage(1)).then(p=>{
  const vp = p.getViewport({scale:3});
  const c = document.getElementById('c');
  c.width=vp.width; c.height=vp.height;
  p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(()=>document.title='ready');
});
</script></body></html>`);

await page.waitForFunction(() => document.title === 'ready', { timeout: 15000 });

const photoBuffer = await page.screenshot({
  clip: { x: 152, y: 12, width: 200, height: 200 }
});
writeFileSync('C:/Users/sebas/Desktop/sebastian_photo.png', photoBuffer);
await browser.close();
console.log('Photo extracted');
