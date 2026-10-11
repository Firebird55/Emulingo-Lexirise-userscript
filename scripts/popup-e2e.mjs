import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,firefox} from 'playwright';
const port=4322;
const server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,EMULINGO_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe']});
try {
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Preview timeout')),15000);server.stdout.on('data',chunk=>{if(String(chunk).includes('127.0.0.1:'+port)){clearTimeout(timer);resolve();}});server.once('error',reject);});
 for(const [name,engine] of [['chromium',chromium],['firefox',firefox]]) {
  const browser=await engine.launch({headless:true});
  try {
   for(const touch of [false,true]) {
    const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch});
    const page=await context.newPage(),writes=[];
    page.on('pageerror',error=>console.error(error.message));
    const ids=['grammar','definition','context','components','similar','words','notes','examples','translation'];
    let settings;
    await page.route('**/fixture-api/v1/analyze/text',async route=>{const response=await route.fetch(),body=await response.json();for(const token of body.occurrences??[])if(token.word==='的')body.stateByEntryId[token.entryId]={proficiency:4,saved_expression_id:88};await route.fulfill({json:body});});
    await page.route('**/fixture-api/v1/dictionary/lookup',async route=>{const response=await route.fetch(),body=await response.json();if(body.characterInfo)body.characterInfo.statistics.topWords=[{word:'我的',trad:'我的',gloss:'my',share:.4}];await route.fulfill({json:body});});
    await page.route('**/fixture-api/v1/vocabulary/88',route=>route.fulfill({json:{notes:'A saved vocabulary note.'}}));
    await page.route('**/fixture-api/v1/settings',async route=>{
     const request=route.request();
     if(!settings){const response=await route.fetch();settings=await response.json();settings.global.wordPopupOpenMode='hover';settings.languageSettings.zh.wordPopup={tabs:ids.map(id=>({id,enabled:!['notes','similar'].includes(id)})),definition:[{id:'frequency',enabled:true},{id:'senses',enabled:true},{id:'breakdown',enabled:false},{id:'dictionaries',enabled:false}],openOn:'last'};}
     if(request.method()==='PATCH'){const body=request.postDataJSON();writes.push(body);for(const [language,patch] of Object.entries(body.languageSettings??{}))Object.assign(settings.languageSettings[language],patch);Object.assign(settings.global,body.global??{});}
     await route.fulfill({json:settings});
    });
    await page.goto(`http://127.0.0.1:${port}/play`);
    await page.locator('#current').evaluate(node=>node.scrollIntoView({block:'start'}));
    const words=page.locator('#current .reading-hanzi');await words.first().waitFor();
    if(touch)await words.first().tap();else await words.first().hover();
    await page.locator('.word-sheet').waitFor();
    assert.deepEqual(await page.getByRole('tab').allTextContents(),['Grammar','Definition','Context','Components','Examples','Translation']);
    assert.equal(await page.getByRole('tab',{selected:true}).textContent(),'Grammar');
    await page.getByRole('tab',{name:'Definition',exact:true}).click();
    await page.locator('.word-frequency').waitFor();
    assert.equal(await page.locator('.word-character-summary').count(),0);assert.equal(await page.locator('.word-dictionary').count(),0);
    const sections=await page.locator('.word-definition-sections').evaluate(node=>[...node.children].sort((a,b)=>Number(getComputedStyle(a).order)-Number(getComputedStyle(b).order)).map(n=>n.textContent));
    assert.match(sections[0],/Frequency/);
    await page.getByRole('tab',{name:'Translation',exact:true}).click();
    assert.match(await page.locator('.word-sheet-body').textContent(),/Professor Oak/);
    await page.keyboard.press('Escape');await page.locator('.word-sheet').waitFor({state:'hidden'});
    if(touch)await words.nth(1).tap();else await words.nth(1).hover();
    await page.locator('.word-sheet').waitFor();assert.equal(await page.getByRole('tab',{selected:true}).textContent(),'Translation','Last used tab remembered across words');
    await page.getByRole('tab',{name:'Translation',exact:true}).press('Home');assert.equal(await page.getByRole('tab',{selected:true}).textContent(),'Grammar');
    await page.keyboard.press('Escape');await page.locator('.word-sheet').waitFor({state:'hidden'});
    await page.locator('button[aria-label="Open Lexirise settings"]:visible').click();await page.getByLabel('Word popup open on').waitFor();
    await page.getByLabel('Word popup open on').selectOption('first');await page.getByLabel('Examples tab',{exact:true}).uncheck();
    assert.equal(writes.length,0,'Draft edits must not write');
    await page.getByRole('button',{name:'Save to Lexirise',exact:true}).click();await page.getByText('Saved to Lexirise.',{exact:true}).waitFor();
    assert.deepEqual(Object.keys(writes[0]),['languageSettings']);assert.deepEqual(Object.keys(writes[0].languageSettings),['zh']);assert.equal(writes[0].languageSettings.zh.wordPopup.openOn,'first');
    await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Lexirise reading options'}).waitFor({state:'hidden'});
    if(touch)await words.first().tap();else await words.first().hover();
    await page.locator('.word-sheet').waitFor();assert.equal(await page.getByRole('tab',{name:'Examples',exact:true}).count(),0);assert.equal(await page.getByRole('tab',{selected:true}).textContent(),'Grammar');
    await page.keyboard.press('Escape');
    await page.locator('button[aria-label="Open Lexirise settings"]:visible').click();await page.getByLabel('Notes tab',{exact:true}).check();
    await page.getByRole('button',{name:'Save to Lexirise',exact:true}).click();await page.getByText('Saved to Lexirise.',{exact:true}).waitFor();await page.keyboard.press('Escape');
    const character=words.filter({hasText:/^的$/}).first();if(touch)await character.tap();else await character.hover();
    await page.getByRole('tab',{name:'Words',exact:true}).waitFor();await page.getByRole('tab',{name:'Words',exact:true}).click();assert.match(await page.locator('.word-sheet-body').textContent(),/my/);
    await page.getByRole('tab',{name:'Notes',exact:true}).click();await page.getByText('A saved vocabulary note.',{exact:true}).waitFor();await page.keyboard.press('Escape');
    await page.locator('button[aria-label="Open Lexirise settings"]:visible').click();await page.getByLabel('disableWordPopups',{exact:true}).check();
    await page.getByRole('button',{name:'Save to Lexirise',exact:true}).click();await page.getByText('Saved to Lexirise.',{exact:true}).waitFor();
    await page.keyboard.press('Escape');await words.first().click();
    assert.equal(await words.first().getAttribute('aria-haspopup'),null,'Disabled popup also removes the accessibility promise');assert.equal(await page.locator('.word-sheet').count(),0);
    console.log(`${name} ${touch?'touch':'hover'}: account popup order, sections, last tab, translation, words, notes, keyboard, explicit save and disable passed`);
    await context.close();
   }
  } finally {await browser.close();}
 }
} finally {server.kill();}
