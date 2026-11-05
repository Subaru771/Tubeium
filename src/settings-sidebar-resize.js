'use strict';
// Keep the real sidebar, the divider and the content in the same flex layout.
// Never let the resize grip move independently of the sidebar.
(() => {
  const MIN_WIDTH = 205;
  const MAX_WIDTH = 480;
  const DEFAULT_WIDTH = 249;
  const MIN_MAIN_WIDTH = 420;
  const STORAGE_KEY = 'tubeium.settings.sidebarWidth.v1';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function init({ shell, sidebar, handle, root, win }) {
    if (!shell || !sidebar || !handle || !root || !win) return;
    let storage = null;
    try { storage = win.localStorage; } catch { /* Resizing must still work. */ }
    let preferred = DEFAULT_WIDTH;
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      if (saved != null && saved !== '') {
        const number = Number(saved);
        if (Number.isFinite(number)) preferred = clamp(Math.round(number), MIN_WIDTH, MAX_WIDTH);
      }
    } catch { /* Retain the default when local storage is blocked. */ }

    const availableMax = () => {
      const viewportWidth = Number(shell.clientWidth) || Number(win.innerWidth) || 1080;
      return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, viewportWidth - MIN_MAIN_WIDTH));
    };
    const visibleWidth = () => clamp(preferred, MIN_WIDTH, availableMax());

    function render() {
      const width = visibleWidth();
      const pixels = width + 'px';
      // Setting the actual flex child's basis prevents the detached-handle
      // bug shown in the Windows screen recording.
      sidebar.style.setProperty('width', pixels);
      sidebar.style.setProperty('flex-basis', pixels);
      root.style.setProperty('--settings-sidebar-width', pixels);
      handle.setAttribute('aria-valuemin', String(MIN_WIDTH));
      handle.setAttribute('aria-valuemax', String(availableMax()));
      handle.setAttribute('aria-valuenow', String(width));
      handle.setAttribute('aria-valuetext', pixels);
      handle.title = 'Drag to resize sidebar; arrow keys adjust, double-click resets (' + pixels + ')';
    }

    function setWidth(next, persist) {
      if (!Number.isFinite(next)) return;
      preferred = clamp(Math.round(next), MIN_WIDTH, MAX_WIDTH);
      render();
      if (persist) {
        try { storage?.setItem(STORAGE_KEY, String(preferred)); }
        catch { /* Local persistence is optional. */ }
      }
    }

    let drag = null;
    function stopDrag(cancelled = false) {
      if (!drag) return;
      const before = drag.preferred;
      drag = null;
      handle.classList.remove('dragging');
      root.classList.remove('settings-sidebar-dragging');
      if (cancelled) { preferred = before; render(); }
      else setWidth(preferred, true);
    }
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault();
      drag = {pointerId:event.pointerId, x:event.clientX, width:visibleWidth(), preferred};
      handle.classList.add('dragging');
      root.classList.add('settings-sidebar-dragging');
      try { win.getSelection?.()?.removeAllRanges(); } catch {}
      try { handle.setPointerCapture(event.pointerId); } catch {}
    });
    // Window-level listeners are essential: resizing must not stop or select
    // text when the cursor moves away from the narrow divider.
    win.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      setWidth(drag.width + event.clientX - drag.x, false);
    }, true);
    win.addEventListener('pointerup', event => {
      if (drag && event.pointerId === drag.pointerId) stopDrag();
    }, true);
    win.addEventListener('pointercancel', event => {
      if (drag && event.pointerId === drag.pointerId) stopDrag(true);
    }, true);
    handle.addEventListener('lostpointercapture', event => {
      if (drag && event.pointerId === drag.pointerId) stopDrag(true);
    });
    win.addEventListener('blur', () => stopDrag(true));
    win.addEventListener('keydown', event => {
      if (drag && event.key === 'Escape') {
        event.preventDefault();
        stopDrag(true);
      }
    });

    handle.addEventListener('keydown', event => {
      let next;
      const step = event.shiftKey ? 30 : 10;
      if (event.key === 'ArrowRight') next = visibleWidth() + step;
      else if (event.key === 'ArrowLeft') next = visibleWidth() - step;
      else if (event.key === 'Home') next = MIN_WIDTH;
      else if (event.key === 'End') next = availableMax();
      else return;
      event.preventDefault();
      setWidth(next, true);
    });
    handle.addEventListener('dblclick', event => {
      event.preventDefault();
      stopDrag(true);
      setWidth(DEFAULT_WIDTH, true);
    });
    win.addEventListener('resize', render);
    render();
  }

  window.tubeiumSidebarResize = Object.freeze({
    init, DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH, STORAGE_KEY,
  });
})();
