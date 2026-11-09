'use strict';
(() => {
  const api=window.youplusDownloads,$=id=>document.getElementById(id);
  const el=(tag,className,text)=>{
    const n=document.createElement(tag);if(className)n.className=className;
    if(text!==undefined)n.textContent=text;return n;
  };
  let jobs=[],filter='all',noticeTimer;
  const cards=new Map();
  const liveStatus=new Set(['queued','running']);
  const issueStatus=new Set(['paused','error','cancelled']);
  function notice(message){
    const n=$('notice');n.textContent=String(message).slice(0,250);
    n.classList.add('show');clearTimeout(noticeTimer);
    noticeTimer=setTimeout(()=>n.classList.remove('show'),3000);
  }
  const showError=e=>notice(String(e?.message||e));
  const fallbackTitle=j=>{
    if(j.scope==='playlist')return 'YouTube playlist';
    if(j.scope==='channel')return 'Channel videos';
    const id=String(j.source||'').match(/[?&]v=([\w-]{11})/);
    return id?'Video '+id[1]:'YouTube video';
  };
  const statusText=s=>({queued:'Queued',running:'Downloading',paused:'Paused',
    completed:'Completed',error:'Failed',cancelled:'Cancelled'})[s]||s||'Queued';
  function control(j,action,label,cls=''){
    const b=el('button',cls,label);b.type='button';
    b.addEventListener('click',async()=>{
      b.disabled=true;
      try{
        const updated=await api.action(j.id,action);
        if(Array.isArray(updated)){jobs=updated;render();}
      }catch(e){showError(e);}
      finally{b.disabled=false;}
    });
    return b;
  }
  function makeRow(j){
    const row=el('article','job');row.dataset.jobId=j.id;
    const icon=el('span','job-icon','↓');
    icon.setAttribute('aria-hidden','true');
    const content=el('div','job-content');
    const title=el('h3','job-title');
    const meta=el('div','job-meta');
    const status=el('span','meta-pill');
    const quality=el('span','meta-pill');
    const channel=el('span','meta-channel');
    meta.append(status,quality,channel);
    const statusLine=el('div','status-line');
    const detail=el('span','detail-text');
    const pct=el('span','progress-value');
    statusLine.append(detail,pct);
    const bar=el('div','bar'),fill=el('div');bar.append(fill);
    bar.setAttribute('role','progressbar');
    bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
    const error=el('p','job-error');
    content.append(title,meta,statusLine,bar,error);
    const actions=el('div','job-actions');
    row.append(icon,content,actions);
    row._view={icon,title,status,quality,channel,detail,pct,bar,fill,error,actions,actionKey:''};
    return row;
  }
  function updateRow(row,j){
    const v=row._view,st=statusText(j.status);
    const title=String(j.title||fallbackTitle(j)).trim()||fallbackTitle(j);
    if(v.title.textContent!==title)v.title.textContent=title;
    v.title.title=title;
    v.icon.textContent=j.mode==='audio'?'♫':j.mode==='thumbnail'?'▧':j.scope==='playlist'?'▤':'↓';
    v.icon.className='job-icon '+(j.status==='completed'?'completed':j.status==='error'?'error':'');
    row.className='job'+(j.status==='running'?' is-running':'');
    v.status.textContent=st;
    const confirmed=String(j.resolvedQuality||'').trim();
    const quality=confirmed||String(j.quality||(
      j.mode==='audio'?'Audio':j.mode==='thumbnail'?'Thumbnail':'Video')).trim();
    v.quality.textContent=quality;
    v.quality.className='meta-pill '+(confirmed?'confirmed':'pending');
    v.quality.title=confirmed?'Confirmed downloaded stream':'Requested format / maximum quality';
    v.channel.textContent=String(j.channel||'');
    v.channel.hidden=!v.channel.textContent;
    const detail=String(j.detail||(
      j.status==='queued'?'Waiting in queue':j.status==='running'?'Preparing download':st));
    v.detail.textContent=detail.slice(0,120);
    const progress=Math.round(Math.max(0,Math.min(100,Number(j.progress)||0)));
    v.pct.textContent=progress+'%';
    v.bar.classList.toggle('completed',j.status==='completed');
    v.bar.setAttribute('aria-valuenow',String(progress));
    v.bar.setAttribute('aria-label',title+' download progress');
    v.fill.style.width=progress+'%';
    v.error.hidden=!j.error;
    v.error.textContent=j.error?String(j.error).slice(0,600):'';

    const hasFiles=Array.isArray(j.files)&&j.files.length>0;
    const media=hasFiles&&j.files.some(f=>/\.(mp4|webm|mkv|m4v|mov|mp3|m4a|opus|ogg|wav)$/i.test(f));
    // Preserve current DOM actions on progress updates so keyboard focus and
    // the More menu do not vanish every time yt-dlp sends a progress line.
    const key=j.status+'|'+hasFiles+'|'+media;
    if(v.actionKey===key)return;
    v.actionKey=key;
    const controls=v.actions;controls.replaceChildren();
    const run=action=>control(j,action,action==='resume'?'Resume':action==='pause'?'Pause':action==='remove'?'Remove from list':action==='cancel'?'Cancel':action);
    if(j.status==='completed'){
      if(media){
        const play=el('button','primary-action','▶ Play');play.type='button';
        play.onclick=()=>api.playOffline(j.id,0).catch(showError);controls.append(play);
      }
      controls.append(control(j,'reveal','Show file'));
    }else if(liveStatus.has(j.status)){
      controls.append(control(j,'pause','Pause','primary-action'));
    }else if(issueStatus.has(j.status)){
      controls.append(control(j,'resume',j.status==='error'?'Retry':'Resume','primary-action'));
    }
    const more=el('details','more-actions');
    const trigger=el('summary',null,'⋯');trigger.setAttribute('aria-label','More actions for '+title);
    more.append(trigger);
    const menu=el('div','more-menu');
    if(hasFiles)menu.append(control(j,'open','Open saved file'));
    if(j.status!=='completed')menu.append(control(j,'reveal','Open folder'));
    if(j.status==='running'||j.status==='queued'||j.status==='paused'||j.status==='error'){
      menu.append(control(j,'cancel','Cancel download'));
    }
    if(j.status!=='running')menu.append(control(j,'remove','Remove from list','danger'));
    more.append(menu);controls.append(more);
  }
  function render(){
    const active=jobs.filter(j=>liveStatus.has(j.status)).length;
    const finished=jobs.filter(j=>j.status==='completed').length;
    const trouble=jobs.filter(j=>j.status==='error').length;
    $('count').textContent=String(jobs.length);
    $('stats').textContent=jobs.length?[
      active?active+' in progress':null,
      finished?finished+' finished':null,
      trouble?trouble+' failed':null
    ].filter(Boolean).join(' · ')||'All caught up':'Nothing queued';
    const selected=jobs.filter(j=>filter==='all'||
      filter==='active'&&(liveStatus.has(j.status)||issueStatus.has(j.status))||
      filter==='completed'&&j.status==='completed');
    const region=$('jobs');
    $('empty').hidden=selected.length>0;
    const wanted=new Set(selected.map(j=>j.id));
    for(const [id,row] of cards){
      if(wanted.has(id))continue;
      if(row.parentElement===region)row.remove();
      cards.delete(id);
    }
    selected.forEach((j,i)=>{
      let row=cards.get(j.id);
      if(!row){row=makeRow(j);cards.set(j.id,row);}
      updateRow(row,j);
      // Reorder only when necessary. Updating progress never destroys the card
      // or collapses an open action menu.
      const before=region.children[i]||null;
      if(before!==row)region.insertBefore(row,before);
    });
  }
  function appearance(a){
    if(a&&/^#[0-9a-fA-F]{6}$/.test(a.accent||''))document.documentElement.style.setProperty('--accent',a.accent);
    if(a&&Number.isFinite(a.fontPercent)){
      document.documentElement.style.fontSize=Math.max(13,Math.min(19,13*a.fontPercent/125))+'px';
    }
  }
  async function boot(){
    try{
      const initial=await api.init();
      appearance(initial);jobs=Array.isArray(initial.jobs)?initial.jobs:[];
      const target=$('path');target.textContent=initial.folder||'';
      target.title=initial.folder||'';
      render();
      api.subscribeAppearance(appearance);
      api.subscribe(next=>{jobs=Array.isArray(next)?next:[];render();});
    }catch(e){showError(e);}
  }
  $('queue-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;
    try{
      const task=await api.add($('url').value,$('scope').value,$('mode').value);
      $('url').value='';
      notice('Queued: '+String(task?.title||'new download').slice(0,75)+
        (task?.quality?' · '+task.quality:''));
    }catch(e){showError(e);}
    finally{button.disabled=false;}
  });
  $('folder').addEventListener('click',()=>api.folder().catch(showError));
  $('health').addEventListener('click',async()=>{
    try{const h=await api.health();notice('Downloader: '+h.downloader+' · FFmpeg: '+h.ffmpeg);}
    catch(e){showError(e);}
  });
  $('tabs').addEventListener('click',e=>{
    const button=e.target.closest('button[data-filter]');if(!button)return;
    filter=button.dataset.filter;
    for(const b of $('tabs').querySelectorAll('button')){
      b.classList.toggle('selected',b===button);
      b.setAttribute('aria-pressed',String(b===button));
    }
    render();
  });
  boot();
})();
