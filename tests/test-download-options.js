'use strict';
const assert=require('node:assert/strict');
const {DEFAULTS}=require('../src/settings-schema');
const {newTask,formatArgs,normalizeQueue}=require('../src/download-queue');
const initial={...DEFAULTS,videoQuality:'1080',videoContainer:'mp4',audioFormat:'m4a'};
const changed={...DEFAULTS,videoQuality:'2160',videoContainer:'mkv',audioFormat:'wav'};
const task=newTask('abcdefghijk','video','video',{settings:initial});
for(const job of [task,normalizeQueue({jobs:[JSON.parse(JSON.stringify(task))]})[0]]){
 const args=formatArgs(job,changed,'/tmp','ffmpeg','/tmp/archive');
 assert.equal(args[args.indexOf('--merge-output-format')+1],'mp4');
 assert.equal(args[args.indexOf('-f')+1],'bv*[height<=1080]+ba/b[height<=1080]');
 assert.equal(job.quality,'Up to 1080p · MP4');
 const withoutFfmpeg=formatArgs(job,changed,'/tmp',null,'/tmp/archive');
 assert.equal(withoutFfmpeg[withoutFfmpeg.indexOf('-f')+1],'b[height<=1080]');
}
const audio=newTask('abcdefghijk','video','audio',{settings:initial});
const args=formatArgs(audio,changed,'/tmp','ffmpeg','/tmp/archive');
assert.equal(args[args.indexOf('--audio-format')+1],'m4a');
const best=formatArgs({...task,options:{...initial,videoQuality:'best'}},changed,'/tmp','ffmpeg','/tmp/archive');
assert.equal(best[best.indexOf('-f')+1],'bv*+ba/b');
const restored=normalizeQueue({jobs:[{...task,options:{videoQuality:'999999',videoContainer:'--unsafe',unexpected:'data'}}]})[0];
assert.equal(restored.options.videoQuality,DEFAULTS.videoQuality);assert.equal(restored.options.videoContainer,DEFAULTS.videoContainer);assert(!('unexpected' in restored.options));
console.log('PASS: queued formats survive settings changes and restart; all resolution fallbacks stay capped');
