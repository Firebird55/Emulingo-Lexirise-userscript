import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {firefox} from 'playwright';

const port=4318;
const server=spawn(process.execPath,['scripts/preview.mjs'],{
  cwd:new URL('..',import.meta.url),
  env:{...process.env,EMULINGO_PREVIEW_PORT:String(port)},
  stdio:['ignore','pipe','pipe'],
});

let browser;
try{
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Preview server did not start.')),10000);
    server.once('error',reject);
    server.stdout.on('data',chunk=>{if(String(chunk).includes(`127.0.0.1:${port}`)){clearTimeout(timer);resolve();}});
    server.stderr.on('data',chunk=>process.stderr.write(chunk));
  });
  browser=await firefox.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1400,height:900}});
  await page.goto(`http://127.0.0.1:${port}/play`,{waitUntil:'domcontentloaded'});
  await page.locator('button[aria-label="Open Lexirise settings"]:visible').waitFor();

  // Simulate the high stacking context used by the live game shell.
  await page.addStyleTag({content:'[data-lx-overlay]{position:fixed!important;inset:0!important;z-index:0!important;pointer-events:auto!important} #app{position:relative!important;z-index:10!important}'});
  // Firefox isolates userscripts from page JavaScript. A rejected cross-world event must not block the dialog.
  await page.evaluate(()=>{
    const original=window.dispatchEvent.bind(window);
    window.dispatchEvent=event=>{
      if(event.type==='lexirise-open-word')throw new DOMException('Permission denied to access cross-world event.','SecurityError');
      return original(event);
    };
  });
  let button=page.locator('button[aria-label="Open Lexirise settings"]:visible');
  // Emulingo may rebuild its controls and preserve markup without preserving listeners.
  await button.evaluate(node=>node.replaceWith(node.cloneNode(true)));
  button=page.locator('button[aria-label="Open Lexirise settings"]:visible');
  await button.click();
  const dialog=page.getByRole('dialog',{name:'Lexirise reading options'});
  await dialog.waitFor();
  assert.equal(await dialog.evaluate(node=>{
    const rect=node.getBoundingClientRect();
    const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
    const root=node.getRootNode();
    const host=root instanceof ShadowRoot?root.host:null;
    const documentTop=document.elementFromPoint(x,y);
    const shadowTop=root instanceof ShadowRoot?root.elementFromPoint(x,y):documentTop;
    return documentTop===host&&!!shadowTop&&(shadowTop===node||node.contains(shadowTop));
  }),true,'Settings dialog must be topmost in Firefox.');

  await page.getByRole('button',{name:'Close Lexirise settings'}).click();
  await button.click();
  assert.equal(await dialog.isVisible(),true,'Settings dialog must reopen.');

  await page.setViewportSize({width:390,height:844});
  const bounds=await dialog.boundingBox();
  assert(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=844,'Settings dialog must fit the Firefox mobile viewport.');
  console.log('Firefox settings dialog: isolated-world failure, open, topmost, reopen, and viewport-fit checks passed.');
}finally{
  await browser?.close();
  server.kill();
}
