
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {chromium,firefox} from 'playwright';
import manifest from '../vendor/lexirise-components/capabilities.json' with {type:'json'};
const port=4320,server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,EMULINGO_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Preview startup timeout')),15000);server.stdout.on('data',b=>{if(String(b).includes('127.0.0.1:'+port)){clearTimeout(timer);resolve();}});server.stderr.on('data',b=>process.stderr.write(b));server.once('error',reject);});
try{
 for(const[name,engine]of [['chromium',chromium],['firefox',firefox]]){
 const browser=await engine.launch({headless:true});try{
 for(const mode of ['play','panel']){
 for(const[pw,ph,zoom]of [[1920,1080,1],[1920,1080,1.25],[1280,720,1.5],[1280,720,2],[390,844,1],[320,568,1],[568,320,1],[900,720,1],[768,1024,1.25],[3840,2160,2]]){
  const width=Math.floor(pw/zoom),height=Math.floor(ph/zoom),context=await browser.newContext({viewport:{width,height},deviceScaleFactor:zoom,hasTouch:width<=568}),page=await context.newPage(),writes=[];
  page.on('request',r=>{if(r.url().includes('/v1/settings')&&r.method()==='PATCH')writes.push(r.postDataJSON());});
  await page.goto('http://127.0.0.1:'+port+'/'+mode+(mode==='panel'?'?code=fixture-'+pw+'-'+zoom:''));
  // Landscape phones legitimately show only a small scrollable feed beneath the game.
  // Scroll the current native card into view, just as a user would, before lazy analysis.
  await page.locator('#current').evaluate(n=>n.scrollIntoView({block:'start'}));
  await page.locator('.reading-hanzi').first().click();await page.locator('.word-sheet').waitFor();
  assert.equal(await page.locator(mode==='panel'?'nav[aria-label="Second screen views"]':width>=900?'.desktop-controls':'.mobile-controls').isVisible(),true,'Correct Emulingo host layout');
  assert(await page.locator('.translation-feed').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Reader fits its translation-feed container');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Game controls and feed do not overflow horizontally');
  await page.locator('.word-sheet').evaluate(node=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  let bounds=await page.locator('.word-sheet').boundingBox();assert(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,name+' lookup fits '+width+'x'+height+' '+JSON.stringify(bounds));
  assert.equal(await page.locator('.word-sheet').evaluate(n=>n.getRootNode() instanceof ShadowRoot),true);
  for(const tab of ['Context','Examples','Similar','Components','Grammar','Definition'])await page.getByRole('tab',{name:tab,exact:true}).click();
  await page.keyboard.press('Escape');await page.locator('.word-sheet').waitFor({state:'hidden'});
  await page.locator('button[aria-label="Open Lexirise settings"]:visible').click();
  const dialog=page.getByRole('dialog',{name:'Lexirise reading options'});await page.getByLabel('Edit account language').waitFor();
  bounds=await dialog.boundingBox();assert(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,name+' settings fits '+width+'x'+height);
  await page.getByLabel('Local text size',{exact:true}).fill('31');assert.equal(writes.length,0);
  if(zoom===1&&pw===1920){
   for(const[lang,cap]of Object.entries(manifest.languages)){await page.getByLabel('Edit account language').selectOption(lang);assert.equal(await page.getByLabel('readingAid',{exact:true}).count(),cap.readings.length?1:0,lang+' readings');assert.equal(await page.getByLabel('script',{exact:true}).count(),cap.scripts.length?1:0,lang+' script');}
   await page.getByLabel('Edit account language').selectOption('nl');
   const font=await page.getByLabel('fontSize',{exact:true}).inputValue()==='lg'?'md':'lg';
   const translation=await page.getByLabel('translationLanguage',{exact:true}).inputValue()==='fr'?'en':'fr';
   await page.getByLabel('fontSize',{exact:true}).selectOption(font);
   await page.getByLabel('translationLanguage',{exact:true}).selectOption(translation);assert.equal(writes.length,0);
   await page.getByRole('button',{name:'Save to Lexirise',exact:true}).click();await page.getByText('Saved to Lexirise.',{exact:true}).waitFor();
   assert.deepEqual(writes.at(-1),{global:{translationLanguage:translation},languageSettings:{nl:{fontSize:font}}});
   await page.getByLabel('fontSize',{exact:true}).selectOption('sm');await page.getByRole('button',{name:'Discard account changes',exact:true}).click();assert.equal(await page.getByLabel('fontSize',{exact:true}).inputValue(),font);
  }
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  if(mode==='panel'&&zoom===1&&pw===1920){
   await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await page.locator('#native-state').textContent(),'Native Settings opened');assert.equal(await dialog.count(),0);
   await page.getByRole('button',{name:'Flashcards',exact:true}).click();await page.locator('[data-lx-reader]').waitFor({state:'hidden'});assert.equal(await page.locator('button[aria-label="Open Lexirise settings"]').count(),1);
   await page.getByRole('button',{name:'Translations',exact:true}).click();await page.locator('.reading-hanzi').first().waitFor();assert.equal(await page.locator('#current [data-lx-reader]').count(),2,'Speaker and dialogue enhanced once each');
   await page.getByRole('button',{name:'Delete translation',exact:true}).last().click();assert.equal(await page.locator('#native-state').textContent(),'Native translation deleted');
   await page.evaluate(()=>{history.pushState({},'', '/panel?code=changed-code');dispatchEvent(new PopStateEvent('popstate'));});
   await page.locator('.reading-hanzi').first().click();await page.locator('.word-sheet').waitFor();await page.keyboard.press('Escape');
   await page.evaluate(()=>{history.pushState({},'', '/unrelated');dispatchEvent(new PopStateEvent('popstate'));});await page.locator('[data-lx-reader]').first().waitFor({state:'hidden'});
   await page.evaluate(()=>{history.pushState({},'', '/panel');dispatchEvent(new PopStateEvent('popstate'));});await page.locator('.reading-hanzi').first().waitFor();
  }
  if(zoom===1&&pw===1920){
   for(const[w,h]of [[320,568],[1280,720],[568,320],[900,720],[390,844]]){
    await page.setViewportSize({width:w,height:h});
    const button=page.locator('button[aria-label="Open Lexirise settings"]:visible');await button.click();await dialog.waitFor();
    const box=await dialog.boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=w+1&&box.y+box.height<=h+1,'Resize settings fits');
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    assert(await page.locator('.translation-feed').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Resize keeps reader inside feed');
   }
  }
  console.log(name+' '+mode+': '+width+'x'+height+' zoom/DPR '+zoom+' passed');await context.close();
 }
 }
 }finally{await browser.close();}
 }
}finally{server.kill();}
