'use strict';
// Per-window memory only. Never use Google/browser history or persist visits.
function videoURL(raw){
 try{
  const url=new URL(raw);if(url.protocol!=='https:'||!/(^|\.)youtube\.com$/.test(url.hostname))return null;
  const id=url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:shorts|live)\/([\w-]{11})\/?$/)?.[1];
  if(!/^[\w-]{11}$/.test(id||''))return null;
  const target=new URL(url.pathname,'https://www.youtube.com');
  for(const key of ['v','list','index'])if(url.searchParams.has(key))target.searchParams.set(key,url.searchParams.get(key));
  return target.href;
 }catch{return null;}
}
class PlaybackHistory{
 constructor(){this.items=[];this.index=-1;}
 record(raw){
  const url=videoURL(raw);if(!url||this.items[this.index]===url)return this.state();
  if(this.items[this.index-1]===url)this.index--;
  else if(this.items[this.index+1]===url)this.index++;
  else{this.items=this.items.slice(0,this.index+1);this.items.push(url);if(this.items.length>100)this.items.shift();this.index=this.items.length-1;}
  return this.state();
 }
 move(direction){
  if(![-1,1].includes(direction))throw new Error('Invalid navigation');
  const url=this.items[this.index+direction];if(!url)return null;
  this.index+=direction;return url;
 }
 state(){return {items:[...this.items],index:this.index};}
}
module.exports={PlaybackHistory,videoURL};
