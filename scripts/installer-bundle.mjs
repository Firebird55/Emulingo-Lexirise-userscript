import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Stored ZIPs avoid platform-specific shell tools and untracked dependencies.
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function installerBundle(version){
 const root='Emulingo-Lexirise-installer-'+version+'/';
 const files=['Install.cmd','INSTALL.html','INSTALL.md','README.md','AGENTS.md','CONTRIBUTING.md','RELEASE.md','LICENSE','NOTICE.md','scripts/install.mjs'].map(name=>[name,readFileSync(name)]);
 files.push(['emulingo-lexirise.user.js',readFileSync('dist/emulingo-lexirise.user.js')]);
 files.push(['emulingo-lexirise.meta.js',readFileSync('dist/emulingo-lexirise.meta.js')]);
 files.push(['THIRD_PARTY_NOTICES.txt',readFileSync('dist/THIRD_PARTY_NOTICES.txt')]);
 files.push(['SHA256SUMS',Buffer.from(files.map(([name,data])=>createHash('sha256').update(data).digest('hex')+'  '+name).join('\n')+'\n')]);
 const local=[],central=[];let offset=0;
 for(const[name,data]of files){const filename=Buffer.from(root+name),crc=crc32(data),header=Buffer.alloc(30);
 header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x0800,6);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
 local.push(header,filename,data);const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x0800,8);entry.writeUInt16LE(0x21,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(data.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(filename.length,28);entry.writeUInt32LE(offset,42);central.push(entry,filename);offset+=header.length+filename.length+data.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 writeFileSync('release/Emulingo-Lexirise-installer-'+version+'.zip',Buffer.concat([...local,directory,end]));
}
