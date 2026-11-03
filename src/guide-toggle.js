'use strict';

// Do not intercept YouTube's own event handler. Only let an explicit hamburger
// click temporarily override Tubeium's hide-sidebar stylesheet.
const GUIDE_SELECTOR = 'ytd-masthead #guide-button, ytd-app #guide-button';
function isGuideButtonClick(event) {
  if (!event) return false;
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
  return path.some(node => node && typeof node.matches === 'function' && node.matches(GUIDE_SELECTOR));
}
function handleGuideButtonClick(event, root) {
  if (!root?.classList?.contains('uyp-hide-sidebar') || !isGuideButtonClick(event)) return false;
  root.classList.toggle('uyp-guide-open');
  return true;
}
module.exports = {isGuideButtonClick, handleGuideButtonClick};
