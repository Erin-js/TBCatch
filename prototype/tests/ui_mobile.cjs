/* UI preview checks only; no clinical or physical-device validation. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const BASE=process.env.BASE_URL||'http://localhost:8765',OUT=path.join(__dirname,'../test-results/mobile-redesign');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true});const page=await context.newPage();let predictions=0;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('/api/analyze'))predictions++;});
  await page.goto(BASE);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('html').getAttribute('lang'),'id');
  async function fits(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);}
  await fits();await page.screenshot({path:path.join(OUT,`${width}-home.png`),fullPage:true});
  await page.locator('.hero-copy a[href="#check"]').click();await page.waitForFunction(()=>document.querySelector('#preview-tools').hidden===false);
  assert(await page.locator('#landing').isHidden());await fits();
  await page.screenshot({path:path.join(OUT,`${width}-pulse.png`)});
  await page.locator('#preview-tools summary').click();
  await page.locator('[data-preview="permission"]').click();assert.match(await page.locator('#pulse-error').innerText(),/izin kamera ditolak/);
  await page.locator('[data-preview="weak"]').click();assert.match(await page.locator('#pulse-error').innerText(),/belum stabil/);
  await page.locator('[data-preview="empty"]').click();assert(await page.locator('#analyze-button').isDisabled());
  await page.locator('[data-preview="audio"]').click();await page.locator('#preview-tools summary').click();
  await page.screenshot({path:path.join(OUT,`${width}-audio.png`)});await fits();
  await page.locator('#analyze-button').click();assert(await page.locator('#questionnaire-panel').isVisible());
  await page.locator('#age').fill('');await page.locator('#questionnaire-button').click();assert(await page.locator('#questionnaire-panel').isVisible());
  await page.locator('#age').fill('42');await page.locator('[data-step="audio"]').click();await page.locator('#analyze-button').click();assert.equal(await page.locator('#age').inputValue(),'42');
  await fits();await page.screenshot({path:path.join(OUT,`${width}-form.png`)});
  await page.locator('#questionnaire-button').click();await page.locator('#result-panel').waitFor({state:'visible'});
  assert.match(await page.locator('#result-tag').innerText(),/FIKTIF/);await fits();
  await page.screenshot({path:path.join(OUT,`${width}-result.png`)});
  const download=page.waitForEvent('download');await page.locator('#download-result').click();const file=await download;assert.match(file.suggestedFilename(),/SIMULASI/);
  await page.locator('#exit-simulation').click();assert(await page.locator('#simulation-banner').isHidden());assert.equal(await page.locator('#bpm').innerText(),'—');
  assert.equal(predictions,0,'Preview must never call model API');assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: layout, navigation, preview failures, form, result, download, reset`);
 }
 // A stubbed API checks the production UI contract without a trained model.
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),payloads=[];
 await page.route('**/api/health',r=>r.fulfill({json:{ready:true,phase:'Ready'}}));
 await page.route('**/api/analyze',r=>{const body=r.request().postDataJSON();payloads.push(body);return r.fulfill({json:{stage:body.stage,category:'research_screening_negative',score:.08,threshold:2/11,audio_seconds:1,elapsed_seconds:.1}});});
 await page.goto(BASE+'/#check');await page.waitForTimeout(200);
 assert(await page.locator('#preview-tools').isHidden());
 await page.locator('.manual summary').click();await page.locator('#manual-bpm').fill('80');await page.locator('#use-manual').click();await page.locator('#next-audio').click();
 const wav=Buffer.alloc(44+32000);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);
 for(let i=0;i<16000;i++)wav.writeInt16LE(Math.round(5000*Math.sin(i/16)),44+i*2);
 await page.locator('#audio-upload').setInputFiles({name:'synthetic-test.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>!document.querySelector('#audio-preview').hidden);
 await page.locator('#cough-confirm').check();await page.locator('#analyze-button').click();await page.locator('#questionnaire-panel').waitFor({state:'visible'});
 await page.locator('#age').fill('35');await page.locator('#sex').selectOption('0');await page.locator('#cough-days').fill('14');
 for(const input of await page.locator('input[type=radio][value="0"]').all())await input.check();
 await page.locator('#questionnaire-button').click();await page.locator('#result-panel').waitFor({state:'visible'});
 assert.equal(payloads.length,2);assert.equal(payloads[0].stage,'initial');assert.equal(payloads[1].stage,'questionnaire');assert.equal(Object.keys(payloads[1].clinical).length,9);assert(Object.values(payloads[1].clinical).every(v=>typeof v==='number'));assert.equal(payloads[1].pulse.source,'manual');
 assert.match(await page.locator('#result-content').innerText(),/Skrining negatif/);assert(await page.locator('#busy').isHidden());
 await context.close();console.log('PASS stubbed API: manual pulse, audio upload, initial stage, nine numeric answers, final result');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
