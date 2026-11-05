'use strict';
// The Settings left sidebar contains two independent flex panels:
// a scrollable category list above and a scrollable quick-actions panel below.
// This controller resizes the real lower panel, never just the divider.
(() => {
  const STORAGE_KEY = 'tubeium.settings.lowerPanelHeight.v1';
  const DEFAULT_HEIGHT = 370;
  const MIN_HEIGHT = 160;
  const MAX_HEIGHT = 680;
  const MIN_NAV_HEIGHT = 110;
  const DIVIDER_HEIGHT = 12;
  const BOTTOM_PADDING = 20;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function init({ sidebar, navigation, panel, handle, root, win }) {
    if (!sidebar || !navigation || !panel || !handle || !root || !win) return;
    let storage = null;
    try { storage = win.localStorage; } catch { /* Resize remains functional. */ }
    let preferred = DEFAULT_HEIGHT;
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      if (saved != null && saved !== '' && Number.isFinite(Number(saved))) {
        preferred = clamp(Math.round(Number(saved)), MIN_HEIGHT, MAX_HEIGHT);
      }
    } catch { /* Keep the default. */ }

    const availableMax = () => {
      // The category list must never disappear behind the quick-actions panel.
      const sidebarHeight = Number(sidebar.clientHeight) || Number(win.innerHeight) || 900;
      const bar = sidebar.getBoundingClientRect?.();
      const nav = navigation.getBoundingClientRect?.();
      const navTop = bar && nav ? Math.max(0, nav.top - bar.top) : 135;
      return Math.max(0, Math.min(MAX_HEIGHT,
        Math.floor(sidebarHeight - navTop - MIN_NAV_HEIGHT - DIVIDER_HEIGHT - BOTTOM_PADDING)));
    };
    const bounds = () => {
      const max = availableMax();
      return {min:Math.min(MIN_HEIGHT, max),max};
    };
    const currentHeight = () => {
      const {min,max} = bounds();
      return clamp(preferred,min,max);
    };

    function render() {
      const size = currentHeight();
      const pixels = size + 'px';
      // Apply directly to the real flex child, not just to the drag handle.
      panel.style.setProperty('height',pixels);
      panel.style.setProperty('flex-basis',pixels);
      root.style.setProperty('--settings-actions-height',pixels);
      const {min,max} = bounds();
      handle.setAttribute('aria-valuemin',String(min));
      handle.setAttribute('aria-valuemax',String(max));
      handle.setAttribute('aria-valuenow',String(size));
      handle.setAttribute('aria-valuetext',pixels);
      handle.title = 'Resize lower sidebar: drag up/down, arrows adjust, double-click resets ('+pixels+')';
    }
    function setHeight(next, save=false) {
      if (!Number.isFinite(next)) return;
      preferred = clamp(Math.round(next), MIN_HEIGHT, MAX_HEIGHT);
      render();
      if (save) {
        try { storage?.setItem(STORAGE_KEY,String(preferred)); } catch {}
      }
    }
    let drag=null;
    function finish(cancel=false) {
      if (!drag) return;
      const original=drag.preferred;
      drag=null;
      handle.classList.remove('dragging');
      root.classList.remove('settings-actions-dragging');
      if (cancel) {
        preferred=original;
        render();
      } else setHeight(preferred,true);
    }
    handle.addEventListener('pointerdown',event=>{
      if (event.button!==0 || event.isPrimary===false) return;
      event.preventDefault();
      drag={pointerId:event.pointerId,y:event.clientY,height:currentHeight(),preferred};
      handle.classList.add('dragging');
      root.classList.add('settings-actions-dragging');
      try { win.getSelection?.()?.removeAllRanges(); } catch {}
      try { handle.setPointerCapture(event.pointerId); } catch {}
    });
    win.addEventListener('pointermove',event=>{
      if (!drag || event.pointerId!==drag.pointerId) return;
      event.preventDefault();
      // Moving divider UP enlarges the lower panel; moving DOWN shrinks it.
      setHeight(drag.height + drag.y - event.clientY);
    },true);
    win.addEventListener('pointerup',event=>{
      if (drag && event.pointerId===drag.pointerId) finish();
    },true);
    win.addEventListener('pointercancel',event=>{
      if (drag && event.pointerId===drag.pointerId) finish(true);
    },true);
    handle.addEventListener('lostpointercapture',event=>{
      if (drag && event.pointerId===drag.pointerId) finish(true);
    });
    win.addEventListener('blur',()=>finish(true));
    win.addEventListener('keydown',event=>{
      if (drag && event.key==='Escape') {event.preventDefault();finish(true);}
    });
    handle.addEventListener('keydown',event=>{
      let next;
      const step=event.shiftKey?30:10;
      if(event.key==='ArrowUp') next=currentHeight()+step;
      else if(event.key==='ArrowDown') next=currentHeight()-step;
      else if(event.key==='Home') next=MIN_HEIGHT;
      else if(event.key==='End') next=availableMax();
      else return;
      event.preventDefault();
      setHeight(next,true);
    });
    handle.addEventListener('dblclick',event=>{
      event.preventDefault();
      finish(true);
      setHeight(DEFAULT_HEIGHT,true);
    });
    win.addEventListener('resize',render);
    render();
  }
  window.tubeiumActionsResize=Object.freeze({
    init,STORAGE_KEY,DEFAULT_HEIGHT,MIN_HEIGHT,MAX_HEIGHT,
  });
})();
