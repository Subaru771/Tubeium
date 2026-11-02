'use strict';
(()=>{
  const api=window.youplusDownloads, $=id=>document.getElementById(id);
  let jobs=[],filter='all',notifyTimer;
  const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
  function notice(message){const n=$('notice');n.textContent=message;n.classList.add('show');clearTimeout(notifyTimer);notifyTimer=setTimeout(()=>n.classList.remove('show'),2800);}
  function showError(e){notice(String(e?.message||e).slice(0,350));}
  function jobControl(j,action,label){const b=el('button',null,label);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await api.action(j.id,action);}catch(e){showError(e);}finally{b.disabled=false;}});return b;}
  function render(){
    const active=jobs.filter(j=>['queued','running'].includes(j.status)).length,done=jobs.filter(j=>j.status==='completed').length;
    $('stats').textContent=`${jobs.length} tasks · ${active} queued/running · ${done} completed`;
    const subset=jobs.filter(j=>filter==='all'||filter==='active'&&['running','queued','paused','error'].includes(j.status)||filter==='completed'&&j.status==='completed');
    $('empty').hidden=!!subset.length;const root=$('jobs');root.replaceChildren();
    for(const j of subset){
      const row=el('article','job');const top=el('div','job-top');top.append(el('span','job-title',`${j.scope==='channel'?'Channel':j.scope==='playlist'?'Playlist':'Video'} · ${j.mode}`),el('span','status '+j.status,j.status));
      row.append(top,el('p','job-url',j.source));
      const details=el('div','details');details.append(el('span',null,j.detail||'Waiting'),el('span',null,`${Math.round(j.progress||0)}%${j.scope!=='video'?' of current item':''}`));row.append(details);
      const bar=el('div','bar');const progress=el('div');progress.style.width=(j.progress||0)+'%';bar.append(progress);row.append(bar);
      if(j.error)row.append(el('div','error-text',j.error));
      const buttons=el('div','actions');
      if(['queued','running'].includes(j.status))buttons.append(jobControl(j,'pause','Pause'));
      if(['paused','error','cancelled'].includes(j.status))buttons.append(jobControl(j,'resume','Resume'));
      if(['queued','running','paused','error'].includes(j.status))buttons.append(jobControl(j,'cancel','Cancel'));
      if(j.status==='completed'&&j.files?.some(f=>/\.(mp4|webm|mkv|m4v|mov|mp3|m4a|opus|ogg|wav)$/i.test(f))){
        const b=el('button',null,'▶ Play inside Tubeium');b.onclick=()=>api.playOffline(j.id,0).catch(showError);buttons.append(b);
      }
      if(j.files?.length)buttons.append(jobControl(j,'open','Open media'));
      buttons.append(jobControl(j,'reveal','Show in folder'));
      if(j.status!=='running')buttons.append(jobControl(j,'remove','Remove from list'));
      row.append(buttons);root.append(row);
    }
  }
  function appearance(a){if(a && /^#[0-9a-fA-F]{6}$/.test(a.accent||''))document.documentElement.style.setProperty('--accent',a.accent);if(a && Number.isFinite(a.fontPercent))document.documentElement.style.fontSize=Math.max(16,Math.min(24,17*a.fontPercent/125))+'px';}
  async function boot(){
    try{const initial=await api.init();appearance(initial);jobs=initial.jobs;render();api.subscribeAppearance(appearance);api.subscribe(next=>{jobs=next;render();});}
    catch(e){showError(e);}
  }
  $('queue-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;
    try {await api.add($('url').value,$('scope').value,$('mode').value);$('url').value='';notice('Added to download queue');}
    catch(err){showError(err);}finally{button.disabled=false;}
  });
  $('folder').addEventListener('click',()=>api.folder().catch(showError));
  $('health').addEventListener('click',async()=>{try{const h=await api.health();notice(`Downloader: ${h.downloader}. FFmpeg: ${h.ffmpeg}.`);}catch(e){showError(e);}});
  $('tabs').addEventListener('click',e=>{const btn=e.target.closest('button[data-filter]');if(!btn)return;filter=btn.dataset.filter;for(const b of $('tabs').querySelectorAll('button'))b.classList.toggle('selected',b===btn);render();});
  boot();
})();
