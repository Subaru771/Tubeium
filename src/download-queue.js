'use strict';
// Download task core. No Electron import: URL validation, argument construction and
// queue transitions can be tested without Electron or network connectivity.
const path = require('node:path');
const crypto = require('node:crypto');
const {cleanTitle,cleanChannel,requestedQuality,fallbackTitle}=require('./download-metadata');
const {normalize}=require('./settings-schema');
const DOWNLOAD_OPTION_KEYS=[
  'filenameTemplate','downloadRetries','maxPlaylistItems','downloadThumbnail',
  'downloadDescription','downloadInfoJson','downloadRateLimit','downloadSubtitles',
  'downloadSubLanguage','convertSubtitles','embedSubtitles','embedMetadata',
  'embedThumbnail','audioFormat','audioQuality','videoQuality','videoContainer'
];
function snapshotDownloadOptions(input){
  const normalized=normalize(input);
  return Object.fromEntries(DOWNLOAD_OPTION_KEYS.map(key=>[key,normalized[key]]));
}
const SAFE_ID = /^[\w-]{11}$/;
const SAFE_LIST = /^[\w-]{10,80}$/;

function parseSource(raw, requestedScope='video') {
  if (typeof raw !== 'string' || raw.length > 2048) throw new Error('Invalid YouTube link');
  let input=raw.trim();
  if (SAFE_ID.test(input)) input='https://www.youtube.com/watch?v='+input;
  let u;
  try { u=new URL(input); } catch { throw new Error('Enter a YouTube video or playlist URL'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port ||
      !['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(u.hostname.toLowerCase()))
    throw new Error('Only HTTPS YouTube links are supported');
  const host=u.hostname.toLowerCase(), pathname=u.pathname;
  const videoId = host === 'youtu.be' ? pathname.slice(1) :
    pathname === '/watch' ? u.searchParams.get('v') :
    (/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/.exec(pathname)||[])[1];
  const listId=u.searchParams.get('list');
  const isPlaylistPath=pathname==='/playlist';
  if (requestedScope==='playlist') {
    if (!SAFE_LIST.test(listId||'') || !(isPlaylistPath || pathname==='/watch')) throw new Error('A supported YouTube playlist URL is required');
    return {source:`https://www.youtube.com/playlist?list=${listId}`, scope:'playlist'};
  }
  if (requestedScope === 'channel') {
    if (host === 'youtu.be' || !(/^\/@[a-zA-Z0-9_.-]{3,30}\/videos\/?$/.test(pathname) ||
      /^\/channel\/UC[\w-]{22}\/videos\/?$/.test(pathname)))
      throw new Error('Use a YouTube channel Videos-tab URL such as youtube.com/@creator/videos');
    return {source:'https://www.youtube.com'+pathname.replace(/\/$/,''),scope:'channel'};
  }
  if (requestedScope !== 'video') throw new Error('Invalid download scope');
  if (!SAFE_ID.test(videoId||'')) throw new Error('A valid YouTube video URL is required');
  return {source:`https://www.youtube.com/watch?v=${videoId}`, scope:'video'};
}

function formatArgs(task, settings, folder, ffmpeg, archivePath) {
  if (!task || !['video','audio','thumbnail'].includes(task.mode)) throw new Error('Invalid download mode');
  settings=task.options?snapshotDownloadOptions(task.options):settings;
  const templates={
    'title-id':'%(title).150B [%(id)s].%(ext)s',
    title:'%(title).170B.%(ext)s',
    'channel-title':'%(uploader).55B - %(title).110B.%(ext)s',
    'date-title':'%(upload_date)s - %(title).140B.%(ext)s',
  };
  const template=templates[settings.filenameTemplate]||templates['title-id'];
  const playlistPrefix=task.scope==='playlist'||task.scope==='channel' ? '%(playlist_title).70B/%(playlist_index)03d - ' : '';
  const args=['--ignore-config','--continue','--part','--newline','--progress','--no-simulate',
    '--print','after_move:filepath',
    '--print','before_dl:TUBEIUM_META:%(.{title,channel,height,resolution,format_id})j',
    '--windows-filenames',
    '--paths', folder, '-o', playlistPrefix+template,
    '--retries',String(settings.downloadRetries||'5')];
  if (ffmpeg && ffmpeg !== 'ffmpeg') args.push('--ffmpeg-location',ffmpeg);
  if (task.scope==='playlist'||task.scope==='channel') {
    args.push('--yes-playlist','--ignore-errors','--playlist-end',String(settings.maxPlaylistItems||50),
      '--download-archive',archivePath);
  } else args.push('--no-playlist');
  if (settings.downloadThumbnail || task.mode==='thumbnail') args.push('--write-thumbnail');
  if (settings.downloadDescription) args.push('--write-description');
  if (settings.downloadInfoJson) args.push('--write-info-json');
  if (settings.downloadRateLimit !== '0') args.push('--limit-rate',String(settings.downloadRateLimit)+'K');
  if (settings.downloadSubtitles) {
    const languages=String(settings.downloadSubLanguage||'en').split(',').map(x=>x.trim())
      .filter(x=>/^[a-zA-Z0-9-]+$/.test(x)).slice(0,12);
    args.push('--write-subs','--write-auto-subs','--sub-langs',languages.join(',')||'en');
    if (settings.convertSubtitles && ffmpeg) args.push('--convert-subs','srt');
    if (settings.embedSubtitles && ffmpeg && task.mode==='video') args.push('--embed-subs');
  }
  if (ffmpeg && settings.embedMetadata && task.mode!=='thumbnail') args.push('--embed-metadata');
  if (ffmpeg && settings.embedThumbnail && task.mode==='audio') args.push('--embed-thumbnail');
  if (task.mode==='thumbnail') args.push('--skip-download');
  else if (task.mode==='audio') {
    args.push('-f','ba/b');
    if (settings.audioFormat!=='best') {
      if (!ffmpeg) throw new Error('FFmpeg is required for audio conversion');
      args.push('-x','--audio-format',settings.audioFormat,'--audio-quality',settings.audioQuality);
    }
  } else if (ffmpeg) {
    const q=settings.videoQuality==='best'?'':`[height<=${settings.videoQuality}]`;
    args.push('-f',`bv*${q}+ba/b${q}`,'--merge-output-format',settings.videoContainer);
  } else {
    const q=settings.videoQuality==='best'?'':`[height<=${settings.videoQuality}]`;
    args.push('-f',`b${q}`);
  }
  args.push('--',task.source);
  return args;
}

function newTask(source,scope,mode,extras={}) {
  if (!['video','audio','thumbnail'].includes(mode)) throw new Error('Unknown download mode');
  const parsed=parseSource(source,scope);
  const settings=snapshotDownloadOptions(extras.settings);
  const task={id:crypto.randomUUID(),source:parsed.source,scope:parsed.scope,mode,status:'queued',
    progress:0,detail:'Queued',files:[],error:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
    title:cleanTitle(extras.title)||'',channel:cleanChannel(extras.channel)||'',
    quality:requestedQuality(mode,settings),resolvedQuality:'',
    ...(extras.settings?{options:settings}:{}),
    container:mode==='video'?String(settings.videoContainer||'mp4').toLowerCase():'',
  };
  // Human-readable URL/id fallback while yt-dlp resolves the real title.
  task.title=task.title||fallbackTitle(task);
  return task;
}
function normalizeQueue(data) {
  const jobs=Array.isArray(data?.jobs)?data.jobs:[];
  return jobs.filter(j=> j && typeof j.id==='string' && /^[a-f0-9-]{36}$/.test(j.id) &&
    ['video','audio','thumbnail'].includes(j.mode) && ['video','playlist','channel'].includes(j.scope))
    .slice(-200).flatMap(j=>{
      try {
        const parsed=parseSource(j.source,j.scope);
        const status=['completed','error','paused','cancelled','queued'].includes(j.status)?j.status:'paused';
        return [{id:j.id,source:parsed.source,scope:parsed.scope,mode:j.mode,status,
          progress:Math.max(0,Math.min(100,Number(j.progress)||0)),detail:String(j.detail||'').slice(0,250),
          title:cleanTitle(j.title)||fallbackTitle(j),channel:cleanChannel(j.channel),
          quality:cleanTitle(j.quality).slice(0,55),resolvedQuality:cleanTitle(j.resolvedQuality).slice(0,55),
          container:['mp4','mkv'].includes(j.container)?j.container:'',
          ...(j.options&&typeof j.options==='object'&&!Array.isArray(j.options)?{options:snapshotDownloadOptions(j.options)}:{}),
          error:String(j.error||'').slice(0,600), files:Array.isArray(j.files)?j.files.filter(f=>typeof f==='string'&&f.length<1000).slice(-200):[],
          createdAt:String(j.createdAt||''),updatedAt:String(j.updatedAt||'')}];
      } catch {return [];} });
}
module.exports={parseSource,formatArgs,newTask,normalizeQueue,snapshotDownloadOptions};
