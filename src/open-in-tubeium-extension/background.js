'use strict';
const isYouTube=raw=>{
 try{const u=new URL(raw);return u.protocol==='https:'&&['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}
};
chrome.runtime.onInstalled.addListener(()=>{
 chrome.contextMenus.create({id:'tubeium-open-link',title:'Open link in Tubeium',contexts:['link']});
 chrome.contextMenus.create({id:'tubeium-open-page',title:'Open this video in Tubeium',contexts:['page']});
});
chrome.contextMenus.onClicked.addListener((info,tab)=>{
 const url=info.menuItemId==='tubeium-open-link'?info.linkUrl:info.menuItemId==='tubeium-open-page'?(info.pageUrl||tab?.url):null;
 if(isYouTube(url))chrome.tabs.create({url:'tubeium://open?url='+encodeURIComponent(url)});
});
chrome.action.onClicked.addListener(async tab=>{
 if(isYouTube(tab?.url))chrome.tabs.create({url:'tubeium://open?url='+encodeURIComponent(tab.url)});
});
