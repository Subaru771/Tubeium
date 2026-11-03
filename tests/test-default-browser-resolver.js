'use strict';
const assert=require('node:assert/strict');
const db=require('../src/default-browser');
// reg.exe output formats, including a localized default-value label and CRLF line endings.
assert.equal(db.parseRegValue('\r\nHKEY\\x\r\n    ProgId    REG_SZ    BraveHTML\r\n\r\n','ProgId'),'BraveHTML');
assert.equal(db.parseRegValue('\r\n    (Par défaut)    REG_SZ    "C:\\a b\\x.exe" %1\r\n','').length>0,true);
assert.equal(db.parseRegValue('    <NO NAME>    REG_SZ    "C:\\x.exe" %1',''),'"C:\\x.exe" %1');
assert.equal(db.parseRegValue('',''),'');
// Command parsing.
assert.deepEqual(db.splitCommand('"C:\\Program Files\\A\\a.exe" --flag "two words" plain'),['C:\\Program Files\\A\\a.exe','--flag','two words','plain']);
assert.deepEqual(db.buildLaunch('"C:\\b\\brave.exe" --single-argument %1','https://u'),{exe:'C:\\b\\brave.exe',args:['--single-argument','https://u']});
assert.deepEqual(db.buildLaunch('"C:\\f\\firefox.exe" -osint -url "%1"','https://u'),{exe:'C:\\f\\firefox.exe',args:['-osint','-url','https://u']});
assert.deepEqual(db.buildLaunch('"C:\\x.exe"','https://u'),{exe:'C:\\x.exe',args:['https://u']});
assert.equal(db.buildLaunch('rundll32 something','https://u'),null,'only real .exe programs are launched');
assert.equal(db.buildLaunch('','https://u'),null);
assert.equal(db.expandEnv('%ProgramFiles%\\x.exe %1',{ProgramFiles:'C:\\PF'}),'C:\\PF\\x.exe %1');
// Classification.
for(const [hints,id] of [[['BraveHTML'],'brave'],[['ChromeHTML'],'chrome'],[['MSEdgeHTM'],'edge'],[['OperaStable'],'opera'],[['VivaldiHTM'],'vivaldi'],[['FirefoxURL-1'],'firefox'],[['AppXabc','C:\\x\\foo.exe'],'other']])assert.equal(db.classify(...hints),id);
assert.equal(db.classify('C:\\Program Files\\BraveSoftware\\brave.exe'),'brave');
assert(db.CHROMIUM_BASED.has('brave')&&db.CHROMIUM_BASED.has('opera')&&!db.CHROMIUM_BASED.has('firefox'));
// Resolver: falls back to http when https has no choice; reports unusable commands without throwing.
const reg=(map)=>(key)=>map[key]||'';
const UC=s=>`HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\${s}\\UserChoice`;
let r=db.resolveDefaultBrowser({env:{},exists:()=>true,query:reg({[UC('http')]:'    ProgId    REG_SZ    BraveHTML',['HKCR\\BraveHTML\\shell\\open\\command']:'    (Default)    REG_SZ    "C:\\b\\brave.exe" --single-argument %1'})});
assert.equal(r.id,'brave');assert.equal(r.exe,'C:\\b\\brave.exe');
r=db.resolveDefaultBrowser({env:{},exists:()=>false,query:reg({[UC('https')]:'    ProgId    REG_SZ    MSEdgeHTM',['HKCR\\MSEdgeHTM\\shell\\open\\command']:'    (Default)    REG_SZ    "C:\\gone\\msedge.exe" %1'})});
assert.equal(r.id,'edge');assert.equal(r.exe,'','a missing program is not launched');
assert.equal(db.resolveDefaultBrowser({env:{},exists:()=>true,query:()=>''}),null);
console.log('PASS: default-browser registry parsing, command building and classification');
