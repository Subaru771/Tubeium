'use strict';
(() => {
  const api=window.youplusSettings;
  const $=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const SECTIONS=[
    {id:'general',title:'General',icon:'⌂',subtitle:'Start-up, window behavior and updates',parts:[
      ['App & window',['closeToTray','launchAtLogin','rememberWindow','startPage','showSettingsButton']],
      ['Updates',['autoCheckUpdates','autoDownloadUpdates']]
    ]},
    {id:'appearance',title:'Appearance',icon:'◐',subtitle:'Theme, text and what you see on YouTube',parts:[
      ['Theme & text',['settingsTheme','pageTheme','accentColor','dashboardFontSize','youtubeFontSize','pageZoom']],
      ['YouTube layout',['compactDensity','gridColumns','hideShorts','hideComments','hideRelated','hideSidebar']]
    ]},
    {id:'playback',title:'Playback',icon:'▶',subtitle:'Video, sound and player controls',parts:[
      ['Video & sound',['preferredQuality','defaultSpeed','rememberSpeed','defaultVolume','rememberVolume','autoplayNext','loopVideo','autoCaptions','autoTheater']],
      ['Player tools',['showOverlayToolbar','toolQuality','wheelVolume','wheelSeek','doubleClickSeek']]
    ]},
    {id:'downloads',title:'Downloads',icon:'↓',subtitle:'One-click downloading, formats and file location',parts:[
      ['Download button & formats',['showDownloadButton','videoQuality','videoContainer','audioFormat','audioQuality']],
      ['Files & queue',['downloadBaseFolder','filenameTemplate','openAfterDownload','downloadSubtitles','parallelDownloads','autoRestoreDownloads']]
    ]},
    {id:'privacy',title:'Privacy & Ads',icon:'◇',subtitle:'Ad blocking, SponsorBlock and distraction controls',parts:[
      ['Blocking',['blockAds','sponsorBlock','sbCategories','sponsorToast']],
      ['Privacy & focus',['disableAutoplayPreviews','confirmExternalLinks','hideHomeFeed','reduceAnimations','hideLiveChat']]
    ]},
    {id:'library',title:'Library & Keys',icon:'★',subtitle:'Local library, keyboard and sign-in assistance',parts:[
      ['Your library',['localLibraryEnabled','recordWatchProgress','resumeWatchedVideos','showBookmarkButton','showScreenshotButton']],
      ['Keyboard',['enableSpeedKeys','enableSeekKeys','seekSeconds']],
      ['Sign-in assistance',['showSigninHelpButton']]
    ]}
  ];
  // Advanced is always available as a seventh sidebar tab. Its topics show
  // only less-common settings; options in the six main tabs are not duplicated.
  const ADVANCED_TOPICS=[
    {id:'player',title:'Player & audio',icon:'▶',groups:['playback','controls','shorts']},
    {id:'interface',title:'Appearance & feed',icon:'▦',groups:['appearance','accessibility','home','navigation','watch']},
    {id:'downloads',title:'Download details',icon:'↓',groups:['downloads']},
    {id:'privacy',title:'Privacy & blocking',icon:'◇',groups:['blocking','privacy']},
    {id:'shortcuts',title:'Shortcuts & devices',icon:'⌘',groups:['shortcuts']},
    {id:'library',title:'Local library',icon:'★',groups:['library']},
    {id:'system',title:'Windows & tools',icon:'⚙',groups:['general','advanced']}
  ];
  const mainKeys=new Set(SECTIONS.flatMap(section=>section.parts.flatMap(([,keys])=>keys)));
  const topicForGroup=groupId=>ADVANCED_TOPICS.find(t=>t.groups.includes(groupId))?.id||'system';
  let data=null,current='general',advancedTopic='player',search='',toastTimer=null;
  const allSettings=()=>data.groups.flatMap(g=>g.settings);
  const metaByKey=key=>allSettings().find(m=>m.key===key);
  const commonRows=sections=>sections.flatMap(category=>category.parts.flatMap(([part,keys])=>
    keys.map(key=>({key,meta:metaByKey(key),category:category.title,section:part})).filter(item=>item.meta)));
  const advancedRows=()=>data.groups.flatMap(group=>group.settings.filter(meta=>!mainKeys.has(meta.key))
    .map(meta=>({key:meta.key,meta,category:group.title,section:meta.section||'Other',
      topic:topicForGroup(group.id)})));
  function notify(message){
    const t=$('toast');t.textContent=message;t.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
  }
  function error(err){notify('Could not save: '+String(err?.message||err));}
  function theme(){
    const s=data?.settings||{},mode=s.settingsTheme==='system'
      ?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')
      :(s.settingsTheme||'dark');
    document.body.dataset.theme=mode;
    document.documentElement.style.setProperty('--accent',s.accentColor||'#aa7dff');
    document.documentElement.style.setProperty('--ui-font-scale',
      String(Math.max(100,Math.min(170,Number(s.dashboardFontSize)||125))/125));
  }
  matchMedia('(prefers-color-scheme: light)').addEventListener('change',theme);
  window.tubeiumSidebarResize?.init({
    shell:document.querySelector('.app-shell'),sidebar:document.querySelector('.sidebar'),
    handle:$('sidebar-resizer'),root:document.documentElement,win:window
  });
  async function update(patch,message){
    try{data.settings=await api.update(patch);theme();render();if(message)notify(message);}
    catch(e){error(e);render();}
  }
  function commitLater(input, key, ms=550){
    let previous=input.value; const save=()=>{if(input.value!==previous){previous=input.value;update({[key]:input.value});}};
    input.addEventListener('blur',save);
    input.addEventListener('keydown',e=>{if(e.key==='Enter')input.blur();});
  }
  function hotkeyOf(e){
    if(['Control','Meta','Alt','Shift','Escape','Tab'].includes(e.key)) return '';
    const mods=[];
    if(e.ctrlKey)mods.push('Ctrl');if(e.altKey)mods.push('Alt');if(e.shiftKey)mods.push('Shift');if(e.metaKey)mods.push('Meta');
    let k=e.key.length===1 ? e.key.toUpperCase() : e.key;
    if(e.code==='Space')k='Space';
    if(!/^(?:[A-Z]|[0-9]|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|\[|\]|\\|,|\.|\/|;|'|=|-|Space|F(?:[1-9]|1[0-2]))$/.test(k))return '';
    return [...mods,k].join('+');
  }
  function buildControl(meta){
    const k=meta.key,v=data.settings[k];
    const wrap=el('div','setting-control');
    if(meta.type==='toggle'){
      const label=el('label','switch');const input=el('input');input.type='checkbox';input.checked=!!v;input.setAttribute('aria-label',meta.label);const track=el('span','switch-track');label.append(input,track);input.onchange=()=>update({[k]:input.checked});wrap.append(label);
    } else if(meta.type==='select'){
      const select=el('select','select-control');select.setAttribute('aria-label',meta.label);
      for(const [value,label] of meta.options){const opt=el('option',null,label);opt.value=value;select.append(opt);} select.value=String(v);select.onchange=()=>update({[k]:select.value});wrap.append(select);
    } else if(meta.type==='range'){
      const box=el('div','range-control');const input=el('input');input.type='range';input.min=meta.min;input.max=meta.max;input.step=meta.step;input.value=v;input.setAttribute('aria-label',meta.label);const value=el('span','range-value',String(v)+(meta.unit||''));input.oninput=()=>value.textContent=input.value+(meta.unit||'');input.onchange=()=>update({[k]:Number(input.value)});box.append(input,value);wrap.append(box);
    } else if(meta.type==='color'){
      const div=el('div','color-control');const color=el('input');color.type='color';color.value=v;color.setAttribute('aria-label',meta.label);const value=el('code',null,v);color.oninput=()=>{value.textContent=color.value;document.documentElement.style.setProperty('--accent',color.value);};color.onchange=()=>update({[k]:color.value});div.append(color,value);wrap.append(div);
    } else if(meta.type==='multiselect'){
      const grid=el('div','multi-grid');
      for(const [key,label] of meta.options){const chip=el('label','category-chip');const inp=el('input');inp.type='checkbox';inp.checked=v.includes(key);inp.onchange=()=>{const next=new Set(data.settings[k]);if(inp.checked)next.add(key);else next.delete(key);update({[k]:[...next]});};chip.append(inp,el('span',null,label));grid.append(chip);}wrap.append(grid);
    } else if(meta.type==='hotkey'){
      const b=el('button','hotkey-control',v);b.type='button';b.title='Click and press a new shortcut';
      b.onclick=()=>{b.classList.add('recording');b.textContent='Press a key…';b.focus();};
      b.onkeydown=(e)=>{if(!b.classList.contains('recording'))return;if(e.key==='Escape'){b.classList.remove('recording');b.textContent=v;return;}const hotkey=hotkeyOf(e);if(hotkey){e.preventDefault();b.classList.remove('recording');update({[k]:hotkey});}};
      b.onblur=()=>{b.classList.remove('recording');b.textContent=data.settings[k];};wrap.append(b);
    } else if(meta.type==='text'){
      const input=el('input','text-control');input.type='text';input.maxLength=meta.maxLength;input.value=v;input.placeholder=meta.placeholder||'';input.setAttribute('aria-label',meta.label);commitLater(input,k);wrap.append(input);
    } else if(meta.type==='textarea'){
      const area=el('textarea','css-editor');area.spellcheck=false;area.maxLength=meta.maxLength;area.value=v;area.placeholder=meta.placeholder||'';area.setAttribute('aria-label',meta.label);const foot=el('div','editor-foot');const btn=el('button','secondary-button','Save custom CSS');btn.onclick=()=>update({[k]:area.value},'Custom CSS saved');foot.append(btn);wrap.append(area,foot);
    } else if(meta.type==='folder'){
      const folder=el('div','folder-control');const display=el('span','folder-display',v||'Default: '+data.defaultDownloads);display.title=v||data.defaultDownloads;const choose=el('button','secondary-button','Browse…');choose.onclick=async()=>{try{data.settings=await api.chooseFolder();theme();render();notify('Download location updated');}catch(e){error(e);}};const clear=el('button','text-button','Reset');clear.onclick=()=>update({[k]:''});folder.append(display,choose,clear);wrap.append(folder);
    }
    return wrap;
  }

  function categoryRows(){
    // Search finds every setting, even when its Advanced topic is not selected.
    if(search.trim())return [...commonRows(SECTIONS),...advancedRows()];
    if(current==='advanced')return advancedRows().filter(item=>item.topic===advancedTopic);
    return commonRows(SECTIONS.filter(section=>section.id===current));
  }
  function nav(){
    const region=$('navigation');region.replaceChildren();
    for(const category of SECTIONS){
      const button=el('button','nav-item'+(category.id===current?' active':''));
      button.type='button';button.setAttribute('aria-current',category.id===current?'page':'false');
      button.append(el('span','nav-icon',category.icon),el('span','nav-title',category.title));
      button.onclick=()=>selectCategory(category.id);
      region.append(button);
    }
    const separator=el('div','nav-section-divider');
    separator.setAttribute('aria-hidden','true');
    region.append(separator);
    const extra=el('button','nav-item advanced-nav'+(current==='advanced'?' active':''));
    extra.type='button';extra.setAttribute('aria-current',current==='advanced'?'page':'false');
    extra.append(el('span','nav-icon','⚙'),el('span','nav-title','Advanced'));
    extra.onclick=()=>selectCategory('advanced');
    region.append(extra);
  }
  function renderAdvancedTopics(){
    const region=$('advanced-topics');
    region.hidden=current!=='advanced'||!!search.trim();
    if(region.hidden){region.replaceChildren();return;}
    const rows=advancedRows();
    region.replaceChildren();
    for(const topic of ADVANCED_TOPICS){
      const count=rows.filter(item=>item.topic===topic.id).length;
      if(!count)continue;
      const button=el('button','topic-button'+(topic.id===advancedTopic?' active':''));
      button.type='button';
      button.setAttribute('aria-pressed',String(topic.id===advancedTopic));
      button.append(el('span','topic-icon',topic.icon),
        el('span','topic-name',topic.title),
        el('small','topic-count',String(count)));
      button.onclick=()=>{
        advancedTopic=topic.id;
        render();
        $('scroll-area').scrollTop=0;
      };
      region.append(button);
    }
  }
  function selectCategory(id){
    if(id!=='advanced'&&!SECTIONS.some(s=>s.id===id))return;
    // Advanced is a permanent sidebar destination, not a hidden mode.
    current=id;search='';$('global-search').value='';nav();render();
    $('scroll-area').scrollTop=0;
  }
  function render(){
    if(!data)return;
    const topic=ADVANCED_TOPICS.find(t=>t.id===advancedTopic)||ADVANCED_TOPICS[0];
    const group=current==='advanced'
      ?{title:'Advanced',subtitle:topic.title+' · Less-used controls grouped by purpose. Everyday preferences stay in their main tabs.'}
      :SECTIONS.find(g=>g.id===current)||SECTIONS[0];
    const q=search.trim().toLowerCase();
    const rows=categoryRows().filter(item=>!q||(
      item.meta.label+' '+item.meta.description+' '+item.key+' '+item.category+' '+item.section
    ).toLowerCase().includes(q));
    $('crumb-name').textContent=group.title;
    $('category-heading').textContent=q?'Search results':group.title;
    $('category-description').textContent=q
      ?rows.length+' matching settings'+(current==='advanced'?' (including advanced)':'')
      :group.subtitle;
    $('reset-section').hidden=current==='advanced'||!!q;
    renderAdvancedTopics();
    const root=$('settings-list');root.replaceChildren();
    if(!rows.length){
      root.append(el('p','empty-search',q?'No results. Try a different search term.':'Nothing to show here.'));
      return;
    }
    const groups=new Map();
    for(const item of rows){
      const section=(q||current==='advanced'?item.category+' / ':'')+item.section;
      if(!groups.has(section))groups.set(section,[]);
      groups.get(section).push(item.meta);
    }
    let panelIndex=0;
    for(const [title,settings] of groups){
      const panel=el('details','settings-panel');
      // Expose the first two Advanced groups, keep the rest neatly folded.
      panel.open=current!=='advanced'||!!q||panelIndex<2;
      panelIndex++;
      const heading=el('summary','settings-panel-title');
      heading.append(el('strong',null,title),el('small',null,String(settings.length)));
      const body=el('div','settings-panel-body');
      for(const meta of settings){
        const row=el('div','setting-row'+(['multiselect','textarea'].includes(meta.type)?' stacked':''));
        row.dataset.settingKey=meta.key;
        const info=el('div','setting-info');
        info.append(el('b',null,meta.label),el('p',null,meta.description));
        row.append(info,buildControl(meta));
        body.append(row);
      }
      panel.append(heading,body);
      root.append(panel);
    }
  }
  async function run(action,message){
    try{const v=await action();if(message)notify(message);return v;}catch(e){error(e);return null;}
  }
  function wire(){
    $('global-search').oninput=e=>{search=e.target.value;render();};
    $('global-search').onkeydown=e=>{if(e.key==='Escape'){e.target.value='';search='';render();}};
    $('reset-section').onclick=async()=>{
      const section=SECTIONS.find(g=>g.id===current);
      if(!section||!confirm('Restore the visible '+section.title+' preferences to their defaults?'))return;
      const patch=Object.fromEntries(section.parts.flatMap(([_,keys])=>keys).map(key=>[key,metaByKey(key)?.defaultValue]).filter(([,v])=>v!==undefined));
      await update(patch,'Section restored');
    };
    $('reset-all').onclick=async()=>{
      if(!confirm('Reset ALL 201 preferences, including the Advanced tab?'))return;
      const result=await run(()=>api.reset('all'));
      if(result){data.settings=result;theme();render();notify('All preferences reset');}
    };
    $('go-downloads').onclick=()=>run(()=>api.openDownloads());
    $('go-player').onclick=()=>run(()=>api.openPlayer());
    $('open-download-folder').onclick=()=>run(()=>api.openFolder(),'Downloads folder opened');
    $('import').onclick=async()=>{
      const next=await run(()=>api.import());
      if(next){data.settings=next;theme();render();notify('Settings imported');}
    };
    $('export').onclick=()=>run(()=>api.export(),'Export complete');
    $('backup-all').onclick=()=>run(()=>api.backup(),'Backup saved');
    $('restore-all').onclick=async()=>{
      if(!confirm('Restore the saved backup?'))return;
      const res=await run(()=>api.restoreBackup());
      if(res?.restored){data=await api.initialize();theme();render();notify('Backup restored');}
    };
    $('check-updates').onclick=()=>run(()=>api.checkUpdates());
    $('clear-cache').onclick=async()=>{
      if(confirm('Clear YouTube temporary cached files?'))await run(()=>api.clearCache(),'Cache cleared');
    };
    $('clear-cookies').onclick=async()=>{
      if(confirm('Clear cookies and sign out of YouTube?'))await run(()=>api.clearCookies(),'Cookies cleared');
    };
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        e.preventDefault();$('global-search').focus();$('global-search').select();
      }
    });
    api.onSettings(s=>{
      if(!data)return;
      data.settings=s;theme();
      if(!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))render();
    });
  }
  async function boot(){
    try{
      data=await api.initialize();
      const missing=SECTIONS.flatMap(g=>g.parts.flatMap(([_,keys])=>keys)).filter(k=>!metaByKey(k));
      if(missing.length)throw Error('Unknown settings: '+missing.join(', '));
      theme();wire();nav();render();
    }catch(e){error(e);}
  }
  boot();
})();
