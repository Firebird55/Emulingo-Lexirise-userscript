import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mockApi} from '../tests/mock-api.mjs';
const live=process.argv.includes('--live');
const port=Number(process.env.EMULINGO_PREVIEW_PORT||4317);
const key=live?(await readFile(new URL('../LexiriseAPIKey.txt',import.meta.url),'utf8')).trim():'';
const allowed=new Set(['/v1/me','/v1/settings','/v1/analyze/text','/v1/dictionary/lookup','/v1/analyze/context']);
const server=createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.startsWith('/fixture-api/')){
      const path=pathname.slice('/fixture-api'.length);const data=[];for await(const chunk of req)data.push(chunk);const body=Buffer.concat(data).toString();
      if(live){if(!allowed.has(path)||(path==='/v1/settings'&&req.method!=='GET')){res.writeHead(403);res.end('{"error":"Live preview is read-only"}');return;}
        const response=await fetch('https://api.lexirise.app'+path,{method:req.method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:req.method==='GET'?undefined:body});res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());
      }else{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(mockApi(req.method,path,body?JSON.parse(body):{})));}return;
    }
    const files={'/play':'tests/fixture.html','/panel':'tests/panel-fixture.html','/mock-manager.js':'tests/mock-manager.js','/emulingo-lexirise.user.js':'dist/emulingo-lexirise.user.js'};
    const file=files[pathname];if(!file){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});res.end(await readFile(file));
  }catch(e){console.error(e.message);res.writeHead(500);res.end('{"error":"Preview request failed"}');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}/play (${live?'real Lexirise responses; account writes blocked':'mock Lexirise'})`));
