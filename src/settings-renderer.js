'use strict';
(() => {
  const api = window.youplusSettings;
  let data = null;
  let current = 'overview';
  let timer = null;
  const $ = (id) => document.getElementById(id);
  function el(tag, className, text) { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = text; return n; }
  // Resizing is purely local to this Settings window and never changes YouTube.
  window.tubeiumSidebarResize?.init({
    shell: document.querySelector('.app-shell'),
    handle: $('sidebar-resizer'),
    root: document.documentElement,
    win: window,
  });
  function toast(text) { const n=$('toast'); n.textContent=text; n.classList.add('show'); clearTimeout(timer); timer=setTimeout(()=>n.classList.remove('show'),2800); }
  function error(err) { toast('Something went wrong: '+(err.message || String(err))); }
  function theme() {
    const s=data?.settings || {};
    const choice=s.settingsTheme || 'dark';
    const mode=choice==='system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light':'dark') : choice;
    document.body.dataset.theme=mode;
    document.documentElement.style.setProperty('--accent',s.accentColor || '#aa7dff');
    document.documentElement.style.setProperty('--glow',(s.accentColor || '#aa7dff')+'25');
    const fontPercent = Math.max(100,Math.min(170,Number(s.dashboardFontSize)||125));
    document.documentElement.style.setProperty('--ui-font-scale', String(fontPercent/100));
    const fontLabel=$('font-percent'); if(fontLabel) fontLabel.textContent=fontPercent+'%';
  }
  matchMedia('(prefers-color-scheme: light)').addEventListener('change',theme);
  async function update(patch, message) {
    try { data.settings=await api.update(patch); theme(); renderCategory(); if(message) toast(message); }
    catch(e) { error(e); renderCategory(); }
  }
  function nav() {
    const n=$('navigation'); n.replaceChildren();
    const items=[{id:'overview',title:'Overview',icon:'◇',settings:[]},...data.groups];
    for(const g of items){
      const b=el('button','nav-item'+(current===g.id?' active':'')); b.type='button';
      b.append(el('span','nav-icon',g.icon),el('span','nav-title',g.title));
      if(g.id!=='overview') b.append(el('span','nav-count',String(g.settings.length)));
      b.onclick=()=>selectCategory(g.id); n.append(b);
    }
  }
  function selectCategory(id){
    const g=data.groups.find(x=>x.id===id);
    if(id!=='overview'&&!g) return;
    current=id; nav(); $('overview').hidden=id!=='overview'; $('category-view').hidden=id==='overview';
    $('crumb-name').textContent=id==='overview'?'Overview':g.title;
    if(g){$('category-number').textContent=String(data.groups.indexOf(g)+1).padStart(2,'0');$('category-heading').textContent=g.title;$('category-description').textContent=g.subtitle;$('search').value='';renderCategory();}
    $('scroll-area').scrollTop=0;
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
      const folder=el('div','folder-control');const display=el('span','folder-display',v||'Default: '+data.defaultDownloads);display.title=v||data.defaultDownloads;const choose=el('button','secondary-button','Browse…');choose.onclick=async()=>{try{data.settings=await api.chooseFolder();renderCategory();toast('Download location updated');}catch(e){error(e);}};const clear=el('button','text-button','Reset');clear.onclick=()=>update({[k]:''});folder.append(display,choose,clear);wrap.append(folder);
    }
    return wrap;
  }
  function renderCategory(){
    if(current==='overview')return;
    const g=data.groups.find(x=>x.id===current);if(!g)return;
    const query=$('search').value.trim().toLowerCase();
    const searchGroups = query ? data.groups : [g];
    const matches=searchGroups.flatMap(group=>group.settings.filter(m=>!query||(m.label+' '+m.description+' '+m.key+' '+group.title).toLowerCase().includes(query)).map(m=>({...m,searchGroup:group.title})));
    const list=$('settings-list');list.replaceChildren();
    let lastSection = null;
    const maintenanceSearch = Boolean(query && ['clear cookies','cookies','sign out','clear cache','cached files','browsing data'].some(word => word.includes(query) || query.includes(word)));
    if(!matches.length && !maintenanceSearch){list.append(el('div','empty-search','No matching settings. Try another keyword or select a different category.'));}
    for(const m of matches){
      const sectionName = query ? m.searchGroup+' / '+(m.section || 'Other') : (m.section || 'Other');
      if (sectionName!==lastSection) {
        list.append(el('div','settings-section-heading',sectionName));
        lastSection=sectionName;
      }
      const stacked=['multiselect','textarea'].includes(m.type);
      const row=el('div','setting-row'+(stacked?' stacked':''));
      const info=el('div','setting-info');info.append(el('b',null,m.label),el('p',null,m.description));
      if(query && m.searchGroup !== g.title) info.append(el('span','search-group-tag',m.searchGroup));
      row.append(info,buildControl(m));list.append(row);
    }
    if(maintenanceSearch){
      const link=el('button','maintenance-search-link','Open Privacy & Local Data → Clear cache / cookies');
      link.type='button';link.onclick=()=>selectCategory('privacy');list.append(link);
    }
    $('utilities').hidden=current!=='privacy'||Boolean(query);

  }
  function wire(){
    $('start-customizing').onclick=()=>selectCategory('appearance');
    const resizeFont=(direction)=>{ const value=Math.max(100,Math.min(170,(Number(data.settings.dashboardFontSize)||125)+direction)); if(value!==data.settings.dashboardFontSize)update({dashboardFontSize:value}); };
    $('font-smaller').onclick=()=>resizeFont(-5);
    $('font-larger').onclick=()=>resizeFont(5);
    document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;if(e.key==='+'||e.key==='='){e.preventDefault();resizeFont(5);}else if(e.key==='-'){e.preventDefault();resizeFont(-5);}else if(e.key==='0'){e.preventDefault();update({dashboardFontSize:125});}});
    $('search').oninput=renderCategory;
    $('search').onkeydown=e=>{if(e.key==='Escape'){$('search').value='';renderCategory();}};
    $('reset-section').onclick=async()=>{if(!confirm('Restore defaults for this section?'))return;try{data.settings=await api.reset(current);renderCategory();theme();toast('Section restored to defaults');}catch(e){error(e);}};
    $('reset-all').onclick=async()=>{if(!confirm('Restore ALL Tubeium settings to defaults?'))return;try{data.settings=await api.reset('all');renderCategory();theme();toast('All options restored');}catch(e){error(e);}};
    $('presets').addEventListener('click',async e=>{const b=e.target.closest('[data-preset]');if(!b)return;try{data.settings=await api.applyPreset(b.dataset.preset);theme();toast('Preset applied. You can fine-tune every setting.');}catch(e){error(e);}});
    $('export').onclick=async()=>{try{const ok=await api.export();if(ok)toast('Settings exported');}catch(e){error(e);}};
    $('import').onclick=async()=>{try{data.settings=await api.import();theme();renderCategory();toast('Settings imported');}catch(e){error(e);}};
    $('go-player').onclick=()=>api.openPlayer().catch(error);
    $('go-downloads').onclick=()=>api.openDownloads().catch(error);
    $('go-library').onclick=()=>api.openLibrary().catch(error);
    $('backup-all').onclick=async()=>{try{if(await api.backup())toast('Backup saved — no Google cookies included');}catch(e){error(e);}};
    $('restore-all').onclick=async()=>{if(!confirm('Restore backed-up settings and merge local library / playlists? Google sign-in is not affected.'))return;try{const response=await api.restoreBackup();if(response.restored){data=await api.initialize();theme();selectCategory(current);toast('Backup restored');}}catch(e){error(e);}};
    $('check-updates').onclick=()=>api.checkUpdates().catch(error);
    $('clear-cache').onclick=async()=>{if(!confirm('Clear YouTube cached files?'))return;try{await api.clearCache();toast('Cache cleared');}catch(e){error(e);}};
    $('clear-cookies').onclick=async()=>{if(!confirm('Clear cookies? You will be signed out of Google/YouTube in this app.'))return;try{await api.clearCookies();toast('Cookies cleared. Reload YouTube to see the result.');}catch(e){error(e);}};
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&current!=='overview'){e.preventDefault();$('search').focus();}});
    api.onSettings(s=>{if(!data)return;data.settings=s;theme();if(!document.querySelector('.hotkey-control.recording') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))renderCategory();});
  }
  async function boot(){
    try {data=await api.initialize();$('option-count').textContent=String(data.groups.reduce((n,g)=>n+g.settings.length,0));$('category-count').textContent=String(data.groups.length);theme();wire();selectCategory('overview');}
    catch(e){error(e);}
  }
  boot();
})();
