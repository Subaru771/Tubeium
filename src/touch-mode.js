'use strict';
// Shared adaptive input controller for Tubeium's local pages.
// Switch density on genuine pointer input, without locking hybrid PCs to touch.
(() => {
  const view = window, doc = document, root = doc.documentElement;
  const media = ['(any-pointer: coarse)', '(pointer: coarse)', '(hover: none)']
    .map(query => view.matchMedia?.(query)).filter(Boolean);
  let lastInput = null;
  let lastTouchAt = -Infinity;
  let currentTouch = null, currentCompact = null;

  const hasTouchHardware = () =>
    Number(view.navigator?.maxTouchPoints || 0) > 0 ||
    media.some(query => query.matches);

  function update() {
    const touch = lastInput === 'touch' || lastInput === 'pen' ||
      (lastInput === null && hasTouchHardware());
    const compact = touch && view.innerWidth <= 820;
    if (touch !== currentTouch) {
      root.classList.toggle('tubeium-touch', touch);
      currentTouch = touch;
    }
    if (compact !== currentCompact) {
      root.classList.toggle('tubeium-touch-compact', compact);
      currentCompact = compact;
    }
    root.dataset.tubeiumInput = touch ? 'touch' : 'desktop';
    root.dataset.tubeiumPointer = lastInput || 'auto';
  }

  for (const query of media) query.addEventListener?.('change', update);
  view.addEventListener('resize', update, { passive: true });
  doc.addEventListener('pointerdown', event => {
    root.classList.toggle('tubeium-keyboard-focus', false);
    if (event.isTrusted === false) return;
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      lastInput = event.pointerType;
      lastTouchAt = view.performance?.now?.() ?? Date.now();
    } else if (event.pointerType === 'mouse') {
      const now = view.performance?.now?.() ?? Date.now();
      // Some touch drivers synthesize mouse events immediately after a tap.
      if (now - lastTouchAt < 850) return;
      lastInput = 'mouse';
    } else return;
    update();
  }, { passive: true });

  // Keyboard use should never accidentally trigger a touch action or layout.
  // Keep the current density so keyboard shortcuts remain usable on tablets.
  doc.addEventListener('keydown', event => {
    if (event.key === 'Tab') root.classList.toggle('tubeium-keyboard-focus', true);
  }, { passive: true });

  update();
})();
