'use strict';
const assert=require('node:assert/strict');
const {parseSource,formatArgs,newTask,normalizeQueue}=require('../download-queue');
const {DEFAULTS}=require('../settings-schema');
const video='dQw4w9WgXcQ';
assert.deepEqual(parseSource(video),{source:'https://www.youtube.com/watch?v='+video,scope:'video'});
assert.deepEqual(parseSource('https://youtu.be/'+video+'?t=12'),parseSource(video));
assert.deepEqual(parseSource('https://www.youtube.com/shorts/'+video),parseSource(video));
assert.deepEqual(parseSource('https://youtube.com/watch?v='+video+'&list=PL1234567890X'),parseSource(video));
assert.deepEqual(parseSource('https://youtube.com/playlist?list=PL1234567890X','playlist'),{source:'https://www.youtube.com/playlist?list=PL1234567890X',scope:'playlist'});
assert.deepEqual(parseSource('https://youtube.com/@some.channel/videos','channel'),{source:'https://www.youtube.com/@some.channel/videos',scope:'channel'});
for(const unsafe of [
  'http://youtube.com/watch?v='+video,
  'https://youtube.com.evil.com/watch?v='+video,
  'https://evil.com/watch?v='+video,
  'javascript:alert(1)',
  'https://youtube.com/@some.channel/playlists',
  'https://youtube.com/watch?v=invalid',
  'https://user:pass@youtube.com/watch?v='+video,
])assert.throws(()=>parseSource(unsafe),undefined,unsafe);
assert.throws(()=>parseSource('https://youtube.com/watch?v='+video,'playlist'));
assert.throws(()=>parseSource('https://youtube.com/playlist?list=PL1234567890X','video'));
const task=newTask(video,'video','video');
assert.equal(task.status,'queued');assert.equal(task.files.length,0);
const args=formatArgs(task,DEFAULTS,'C:/Users/Example/Downloads','ffmpeg','C:/state/archive.txt');
assert.ok(args.includes('--no-playlist'));assert.ok(!args.includes('--yes-playlist'));
assert.equal(args.at(-1),'https://www.youtube.com/watch?v='+video);assert.equal(args.at(-2),'--');
assert.ok(args.includes('--continue'));assert.ok(args.includes('--part'));
const playlist=newTask('https://youtube.com/playlist?list=PL1234567890X','playlist','audio');
const pa=formatArgs(playlist,{...DEFAULTS,maxPlaylistItems:'25'},'C:/Downloads','ffmpeg','C:/archive');
assert.ok(pa.includes('--yes-playlist'));assert.equal(pa[pa.indexOf('--playlist-end')+1],'25');
assert.equal(pa[pa.indexOf('--download-archive')+1],'C:/archive');
assert.ok(pa[pa.indexOf('-o')+1].includes('playlist_index'));
const channel=newTask('https://youtube.com/@some.channel/videos','channel','thumbnail');
assert.ok(formatArgs(channel,DEFAULTS,'C:/Downloads',null,'C:/archive').includes('--skip-download'));
const persisted=normalizeQueue({jobs:[{...task,status:'running',progress:44,files:['C:/tmp/test.mp4']}, {...task,id:'bad',status:'running'}]});
assert.equal(persisted.length,1);assert.equal(persisted[0].status,'paused');
assert.equal(persisted[0].progress,44);
assert.throws(()=>newTask('bad','video','unknown'));
console.log('PASS: URL validation, playlist/channel limits, safe CLI arguments and interrupted queue restore');
