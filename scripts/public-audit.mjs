import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:128*1024*1024});
export function privateContent(text){
 return /(?:[A-Z]:[\\/]+Users[\\/]+(?!Public\b|Default\b)[^\s"'<>\\/]+)/i.test(text)
 || /(?:[A-Z]:[\\/]+tools[\\/]+)/i.test(text)
 || /lx_[A-Za-z0-9]{40,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}/.test(text);
}
export function publicIdentity(email){return /^[^\s<>]+@users\.noreply\.github\.com$/.test(email);}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/public-audit.mjs')){
 execFileSync(process.execPath,['scripts/secret-check.mjs'],{stdio:'inherit'});
 const refs=git('for-each-ref','--format=%(refname)').trim().split('\n').filter(Boolean);
 const ids=[...new Set(git('rev-list','HEAD',...refs).trim().split('\n').filter(Boolean))];
 for(const id of ids){
  const [author,committer]=git('show','-s','--format=%ae%n%ce',id).trim().split('\n');
  if(!publicIdentity(author)||!publicIdentity(committer))throw new Error('Non-noreply identity in public history; sanitize the publishing copy.');
  if(privateContent(git('show','-s','--format=%B',id)))throw new Error('Private data in commit message');
 }
 const objects=[...new Set(git('rev-list','--objects','HEAD',...refs).trim().split('\n').map(line=>line.split(' ')[0]))];
 const batch=execFileSync('git',['cat-file','--batch'],{input:objects.join('\n')+'\n',maxBuffer:512*1024*1024});
 let offset=0;
 while(offset<batch.length){
  const end=batch.indexOf(10,offset);if(end<0)break;
  const [id,type,length]=batch.subarray(offset,end).toString().split(' ');offset=end+1;const size=Number(length);
  if(!Number.isFinite(size))throw new Error('Unscannable object');
  if(type==='blob'&&privateContent(batch.subarray(offset,offset+size).toString()))throw new Error('Private data in reachable blob; publication blocked.');
  offset+=size+1;
 }
 for(const file of git('ls-files').trim().split('\n').filter(Boolean))if(privateContent(readFileSync(file,'utf8')))throw new Error('Private data in working file; publication blocked.');
 console.log('Public privacy audit passed: '+ids.length+' commits; reachable history and tracked working files checked.');
}

