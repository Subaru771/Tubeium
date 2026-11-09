'use strict';
(async()=>{
 const api=window.tubeiumLibrary, $=id=>document.getElementById(id);
 let filter='watch-later';let initial=await api.init();
 document.documentElement.style.setProperty('--accent',initial.accent||'#aa7dff');
 document.documentElement.style.setProperty('--font',String((initial.fontPercent||125)/100));
 $('sort').value=initial.defaultSort||'recent';
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
 function toast(str){const t=$('toast');t.textContent=str;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2800);}
 function duration(sec){const s=Math.floor(sec||0);return Math.floor(s/3600)?`${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
 async function refresh(){try{
 $('playlist-actions').hidden=filter!=='playlists';
 if(filter==='playlists'){
  const q=$('search').value.trim().toLowerCase(),pls=(await api.playlists()).filter(v=>!q||v.name.toLowerCase().includes(q));
  $('count').textContent=pls.length+(pls.length===1?' playlist':' playlists');const list=$('list');list.replaceChildren();
  if(!pls.length){list.append(el('div','empty','No playlists yet. Create one and add videos from Bookmarks or History.'));return;}
  const allVideos=await api.list('all','');const videoMap=new Map(allVideos.map(v=>[v.id,v]));
  for(const pl of pls){const card=el('section','playlist-card');card.append(el('h2',null,pl.name+' · '+pl.ids.length+' videos'));
   const actions=el('div','actions'),rename=el('button',null,'Rename'),remove=el('button','danger','Delete');
   rename.onclick=async()=>{const name=prompt('Rename playlist',pl.name);if(name!==null){try{await api.playlistRename(pl.id,name);await refresh();}catch(e){toast(e.message);}}};
   remove.onclick=async()=>{if(confirm('Delete this local playlist? The saved videos will remain in the library.')){await api.playlistDelete(pl.id);await refresh();}};
   actions.append(rename,remove);card.append(actions);
   const entries=el('div','playlist-entries');for(const id of pl.ids){const v=videoMap.get(id);const wrap=el('div','playlist-entry');const watch=el('button',null,'▶ '+(v?.title||id));watch.onclick=()=>api.open(id).catch(e=>toast(e.message));const drop=el('button','danger','×');drop.title='Remove video from playlist';drop.onclick=async()=>{await api.playlistRemove(pl.id,id);refresh();};wrap.append(watch,drop);entries.append(wrap);}card.append(entries);list.append(card);}
  return;
 }
 let items=filter==='offline' ? (await api.offline()).filter(x=>x.title.toLowerCase().includes($('search').value.toLowerCase())) : await api.list(filter,$('search').value);
 if(filter!=='offline'){
  const sort=$('sort').value;
  if(sort==='title')items.sort((a,b)=>a.title.localeCompare(b.title));
  if(sort==='channel')items.sort((a,b)=>a.channel.localeCompare(b.channel));
  if(sort==='duration')items.sort((a,b)=>b.duration-a.duration);
 }$('count').textContent=items.length+' '+(items.length===1?'video':'videos');const list=$('list');list.replaceChildren();
 if(!items.length){list.append(el('div','empty',filter==='watch-later'?'No videos saved yet. Use ◷ Watch Later on any video or Home thumbnail.':filter==='bookmarks'?'No bookmarks yet. Save videos using ★ in the Tubeium player.':'Nothing to show here yet.'));return;}
 for(const v of items){if(filter==='offline'){
   const card=el('article','video');const info=el('div');info.append(el('h2',null,v.title),el('div','meta','Saved locally · '+v.scope));
   const buttons=el('div','actions'),play=el('button',null,'▶ Play offline');play.onclick=()=>api.playOffline(v.id,v.index).catch(e=>toast(e.message));buttons.append(play);card.append(info,buttons);list.append(card);continue;
 }const card=el('article','video');const img=el('img','thumb');img.src='https://i.ytimg.com/vi/'+v.id+'/mqdefault.jpg';img.alt='';img.loading='lazy';
 const info=el('div');info.append(el('h2',null,v.title),el('div','meta',(v.channel||'YouTube')+(v.position?'  ·  '+duration(v.position)+(v.duration?' / '+duration(v.duration):''):'')+(v.bookmarked?'  ·  ★ Bookmarked':'')+(v.watchLater?'  ·  ◷ Watch Later':'')));
 const buttons=el('div','actions');const open=el('button',null,'▶ Watch');open.onclick=()=>api.open(v.id).catch(e=>toast(e.message));
 const later=el('button',v.watchLater?'danger':'',v.watchLater?'− Watch Later':'+ Watch Later');
 later.onclick=async()=>{
   try{await api.watchLaterEdit(v.id,!v.watchLater);await refresh();
     toast(v.watchLater?'Removed from Tubeium Watch Later':'Saved to Tubeium Watch Later');}
   catch(e){toast(e.message);}
 };
 const remove=el('button','danger','Remove');remove.onclick=async()=>{if(confirm('Remove this video from your local library?')){await api.remove(v.id);await refresh();}};const add=el('button',null,'+ Playlist');add.onclick=async()=>{try{const playlists=await api.playlists();if(!playlists.length){toast('Create a playlist first in the Playlists tab');return;}const choices=playlists.map((p,i)=>(i+1)+'. '+p.name).join('\n');const choice=prompt('Add to which playlist? Enter number:\n'+choices);if(!choice)return;const index=Number(choice)-1;if(!Number.isInteger(index)||!playlists[index]){toast('Invalid playlist number');return;}await api.playlistAdd(playlists[index].id,v.id);toast('Added to '+playlists[index].name);}catch(e){toast(e.message);}};buttons.append(open,later,add,remove);card.append(img,info,buttons);list.append(card);}
 }catch(e){toast('Could not read local library: '+e.message);}}
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));refresh();});
 $('search').addEventListener('input',()=>refresh());
 $('sort').onchange=refresh;
 $('playlist-create').onclick=async()=>{const name=prompt('Name your new local playlist');if(name!==null){try{await api.playlistCreate(name);await refresh();}catch(e){toast(e.message);}}};
 $('settings').onclick=()=>api.settings();
 $('export').onclick=async()=>{try{if(await api.export())toast('Library exported successfully');}catch(e){toast(e.message);}};
 $('import').onclick=async()=>{try{const n=await api.import();toast(n+' entries imported');refresh();}catch(e){toast(e.message);}};
 $('clear').onclick=async()=>{if(confirm('Clear local watch progress and history? Bookmarks and Watch Later will stay.')){await api.clear('history');refresh();toast('Local history cleared');}};
 refresh();
})();
