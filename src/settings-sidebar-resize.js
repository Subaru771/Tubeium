'use strict';
// Standalone browser-side resize controller. No Node modules or unsafe IPC.
(() => {
  const MIN_WIDTH = 205;
  const MAX_WIDTH = 480;
  const DEFAULT_WIDTH = 249;
  const MIN_MAIN_WIDTH = 420;
  const STORAGE_KEY = 'tubeium.settings.sidebarWidth.v1';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function init({ shell, handle, root, win }) {
    if (!shell || !handle || !root || !win) return;
    let storage = null;
    try { storage = win.localStorage; } catch { /* Restricted storage: resize still works. */ }

    let preferred = DEFAULT_WIDTH;
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      if (saved !== null && saved !== undefined && saved !== '') {
        const number = Number(saved);
        if (Number.isFinite(number)) preferred = clamp(Math.round(number), MIN_WIDTH, MAX_WIDTH);
      }
    } catch { /* Continue with the default width. */ }

    const availableMax = () => {
      const shellWidth = Number(shell.clientWidth) || Number(win.innerWidth) || 1080;
      return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, shellWidth - MIN_MAIN_WIDTH));
    };
    const visibleWidth = () => clamp(preferred, MIN_WIDTH, availableMax());

    function render() {
      const width = visibleWidth();
      root.style.setProperty('--settings-sidebar-width', width + 'px');
      handle.setAttribute('aria-valuemin', String(MIN_WIDTH));
      handle.setAttribute('aria-valuemax', String(availableMax()));
      handle.setAttribute('aria-valuenow', String(width));
      handle.setAttribute('aria-valuetext', width + ' pixels');
      handle.title = 'Resize sidebar: drag, use arrow keys, or double-click to reset (' + width + 'px)';
    }
    function setWidth(next, save) {
      preferred = clamp(Math.round(next), MIN_WIDTH, MAX_WIDTH);
      render();
      if (save) {
        try { storage?.setItem(STORAGE_KEY, String(preferred)); }
        catch { /* Storage is optional, resizing is not. */ }
      }
    }

    let drag = null;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault();
      drag = { pointerId: event.pointerId, x: event.clientX, width: visibleWidth() };
      handle.classList.add('dragging');
      try { handle.setPointerCapture(event.pointerId); } catch { /* Fallback to ordinary pointer events. */ }
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      setWidth(drag.width + event.clientX - drag.x, false);
    });
    function finishDrag(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      handle.classList.remove('dragging');
      if (event.type === 'pointercancel') { render(); return; }
      setWidth(preferred, true);
    }
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);
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
    handle.addEventListener('dblclick', () => setWidth(DEFAULT_WIDTH, true));
    win.addEventListener('resize', render);
    render();
  }

  window.tubeiumSidebarResize = Object.freeze({
    init, DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH, STORAGE_KEY,
  });
})();
