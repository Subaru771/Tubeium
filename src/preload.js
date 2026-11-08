if (/(^|\.)youtube\.com$/i.test(location.hostname)) {
const { ipcRenderer, webFrame } = require('electron');
// Electron appends additionalArguments to preload process.argv. A saved OFF
// choice is respected before YouTube's own page scripts run.
const earlyBlockAds = !process.argv.includes('--tubeium-ad-block=off');
// Sandboxed preload scripts can only require('electron') under Electron 45.
// Inline this tiny pure handler rather than trying to require a local module,
// which previously aborted the entire preload (Settings, ad skipping, and UI).
const GUIDE_SELECTOR = 'ytd-masthead #guide-button, ytd-app #guide-button';
function handleGuideButtonClick(event, root) {
  if (!root?.classList?.contains('uyp-hide-sidebar') || !event) return false;
  const path = typeof event.composedPath === 'function'
    ? event.composedPath() : [event.target];
  const guideClick = path.some(node =>
    node && typeof node.matches === 'function' && node.matches(GUIDE_SELECTOR)
  );
  if (!guideClick) return false;
  root.classList.toggle('uyp-guide-open');
  return true;
}

// Install before YouTube's page scripts. Only ad metadata in player responses is
// filtered; video/audio URLs, authentication, playback and recommendations stay intact.
// This is best-effort: YouTube can change its response format at any time.
function installPageAdFilter(initialEnabled) {
  if (window.__tubeiumAdFilter) return;
  let enabled = initialEnabled === true;
  const adFields = ['adPlacements', 'playerAds', 'adSlots', 'adBreakParams', 'adBreakHeartbeatParams', 'ad3Module', 'adSafetyReason'];
  // Feed / search / sidebar items that are ads. Matched as wrapper keys of an array item.
  const adItemKeys = ['adSlotRenderer', 'promotedSparklesWebRenderer', 'promotedSparklesTextSearchRenderer',
    'promotedVideoRenderer', 'compactPromotedVideoRenderer', 'searchPyvRenderer', 'displayAdRenderer',
    'inFeedAdLayoutRenderer', 'bannerPromoRenderer', 'statementBannerRenderer', 'brandVideoSingletonRenderer',
    'brandVideoShelfRenderer', 'actionCompanionAdRenderer', 'playerLegacyDesktopWatchAdsRenderer'];
  const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
  const strip = (value) => {
    if (!isPlainObject(value)) return false;
    let changed = false;
    for (const key of adFields) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        delete value[key];
        changed = true;
      }
    }
    return changed;
  };
  // Player data can sit at the top level or inside a navigation response.
  const stripPlayerData = (value) => {
    if (!isPlainObject(value)) return false;
    let changed = strip(value);
    if (isPlainObject(value.playerResponse) && strip(value.playerResponse)) changed = true;
    return changed;
  };
  const isAdItem = (item) => {
    if (!isPlainObject(item)) return false;
    for (const key of adItemKeys) if (key in item) return true;
    const inner = item.richItemRenderer && item.richItemRenderer.content;
    if (isPlainObject(inner)) for (const key of adItemKeys) if (key in inner) return true;
    return false;
  };
  // Remove ad entries from feed/search/watch-next lists (bounded depth walk).
  const pruneFeed = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 28) return false;
    let changed = false;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        if (isAdItem(node[i])) { node.splice(i, 1); changed = true; continue; }
        if (pruneFeed(node[i], depth + 1)) changed = true;
      }
    } else {
      for (const key of Object.keys(node)) if (pruneFeed(node[key], depth + 1)) changed = true;
    }
    return changed;
  };
  const cleanNavigation = (data) => {
    let changed = stripPlayerData(data);
    try { if (pruneFeed(data, 0)) changed = true; } catch { /* keep response intact */ }
    return changed;
  };
  // Initial page data is assigned to globals, not fetched.
  const hookGlobal = (name, cleaner) => {
    let current = window[name];
    if (enabled) cleaner(current);
    const descriptor = Object.getOwnPropertyDescriptor(window, name);
    if (descriptor && !descriptor.configurable) return;
    try {
      Object.defineProperty(window, name, {
        configurable: true, enumerable: true,
        get: () => current,
        set: (data) => { current = data; if (enabled) cleaner(current); },
      });
    } catch { /* Do not interfere if YouTube owns a protected property. */ }
  };
  hookGlobal('ytInitialPlayerResponse', stripPlayerData);
  hookGlobal('ytInitialData', cleanNavigation);
  // YouTube parses most API text through JSON.parse; strip ad metadata there too.
  const nativeParse = JSON.parse;
  JSON.parse = function(text, reviver) {
    const out = nativeParse.call(this, text, reviver);
    if (enabled) { try { stripPlayerData(out); } catch { /* never break parsing */ } }
    return out;
  };
  // Single-page navigation fetches fresh JSON. Only YouTube's own API responses
  // are touched, and only when the setting is enabled; media is never rewritten.
  const apiPath = /^\/youtubei\/v1\/(?:player|next|get_watch|browse|search|reel\/reel_item_watch|reel\/reel_watch_sequence)\/?$/;
  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      if (!enabled || !response || !response.ok) return response;
      try {
        const request = args[0];
        const url = typeof request === 'string' ? request : request && request.url;
        const parsed = new URL(url, location.href);
        if (!/(^|\.)youtube\.com$/.test(parsed.hostname) || !apiPath.test(parsed.pathname)) return response;
        const data = await response.clone().json();
        if (!cleanNavigation(data)) return response;
        const headers = new Headers(response.headers);
        headers.delete('content-length'); headers.delete('content-encoding');
        return new Response(JSON.stringify(data), {
          status: response.status, statusText: response.statusText, headers,
        });
      } catch { return response; }
    };
  }
  Object.defineProperty(window, '__tubeiumAdFilter', {
    value: Object.freeze({
      setEnabled: (next) => { enabled = next === true; },
      // Test hook returns only a boolean, never user credentials or video data.
      isEnabled: () => enabled,
    }),
    configurable: true,
  });
}
// Electron executes this in the page's main world; the isolated preload cannot
// patch YouTube's own fetch or ytInitialPlayerResponse objects directly.
// executeInMainWorld runs synchronously, so the filter is in place before any
// YouTube script; webFrame.executeJavaScript (async) is only a fallback.
try {
  const { contextBridge } = require('electron');
  if (contextBridge && typeof contextBridge.executeInMainWorld === 'function') {
    contextBridge.executeInMainWorld({ func: installPageAdFilter, args: [earlyBlockAds] });
  } else {
    void webFrame.executeJavaScript('(' + installPageAdFilter.toString() + ')(' + String(earlyBlockAds) + ')', false).catch(() => {});
  }
} catch {
  try { void webFrame.executeJavaScript('(' + installPageAdFilter.toString() + ')(' + String(earlyBlockAds) + ')', false).catch(() => {}); }
  catch { /* Page-level filtering optional; native skip fallback remains. */ }
}

let state = { hideShorts: true, blockAds: earlyBlockAds, sponsorBlock: true, speedStep: '0.25', mini: false };
let persistedState = {...state};
let activeViewingProfile = null;
let playbackMemory = { speed: 1, volume: 100, muted: false };
let appliedVideo = null;
let playerPreferenceSignature = '';
let memorySaveTimer = null;

const LABELS = {
  sponsor: 'sponsor', selfpromo: 'self-promo', interaction: 'reminder',
  intro: 'intro', outro: 'outro', preview: 'recap', filler: 'filler',
};

const CSS = `
/* Hide Shorts */
html.uyp-noshorts ytd-rich-shelf-renderer[is-shorts],
html.uyp-noshorts ytd-reel-shelf-renderer,
html.uyp-noshorts ytd-guide-entry-renderer:has(a[title="Shorts"]),
html.uyp-noshorts ytd-mini-guide-entry-renderer[aria-label="Shorts"],
html.uyp-noshorts ytd-rich-item-renderer:has(a[href^="/shorts/"]),
html.uyp-noshorts ytd-video-renderer:has(a[href^="/shorts/"]),
html.uyp-noshorts yt-chip-cloud-chip-renderer:has(a[title="Shorts"]) { display: none !important; }

/* Hide ad slots and banners */
html.uyp-noads ytd-ad-slot-renderer,
html.uyp-noads ytd-in-feed-ad-layout-renderer,
html.uyp-noads ytd-display-ad-renderer,
html.uyp-noads ytd-promoted-sparkles-web-renderer,
html.uyp-noads ytd-promoted-video-renderer,
html.uyp-noads ytd-compact-promoted-video-renderer,
html.uyp-noads ytd-search-pyv-renderer,
html.uyp-noads ytd-promoted-sparkles-text-search-renderer,
html.uyp-noads ytd-brand-video-singleton-renderer,
html.uyp-noads ytd-brand-video-shelf-renderer,
html.uyp-noads .ytd-display-ad-renderer,
html.uyp-noads ytd-rich-section-renderer:has(ytd-ad-slot-renderer),
html.uyp-noads ytd-banner-promo-renderer,
html.uyp-noads ytd-statement-banner-renderer,
html.uyp-noads ytd-companion-slot-renderer,
html.uyp-noads ytd-action-companion-ad-renderer,
html.uyp-noads ytd-player-legacy-desktop-watch-ads-renderer,
html.uyp-noads ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
html.uyp-noads #masthead-ad,
html.uyp-noads #player-ads,
html.uyp-noads .ytp-ad-overlay-container,
html.uyp-noads .ytp-ad-module,
html.uyp-noads .ytp-suggested-action-badge,
html.uyp-noads ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"] { display: none !important; }

/* Mini player: show only the video */
html.uyp-mini #masthead-container,
html.uyp-mini ytd-masthead,
html.uyp-mini tp-yt-app-drawer,
html.uyp-mini #guide,
html.uyp-mini ytd-mini-guide-renderer,
html.uyp-mini #secondary,
html.uyp-mini #below,
html.uyp-mini #related,
html.uyp-mini #comments,
html.uyp-mini ytd-watch-metadata { display: none !important; }
html.uyp-mini ytd-app { --ytd-masthead-height: 0px !important; }
html.uyp-mini ytd-watch-flexy { --ytd-watch-flexy-masthead-height: 0px !important; }
html.uyp-mini #page-manager { margin: 0 !important; }
html.uyp-mini ytd-watch-flexy #columns,
html.uyp-mini ytd-watch-flexy #primary,
html.uyp-mini ytd-watch-flexy #primary-inner { margin: 0 !important; padding: 0 !important; max-width: none !important; }
html.uyp-mini body, html.uyp-mini html { overflow: hidden !important; }
html.uyp-mini ::-webkit-scrollbar { display: none; }
/* Independently adjustable YouTube typography. Do not enlarge the video canvas. */
html.uyp-yt-font #video-title,
html.uyp-yt-font ytd-rich-grid-media #video-title,
html.uyp-yt-font ytd-video-renderer #video-title,
html.uyp-yt-font ytd-compact-video-renderer #video-title,
html.uyp-yt-font ytd-watch-metadata h1,
html.uyp-yt-font ytd-watch-metadata h1 yt-formatted-string { font-size:calc(17px * var(--uyp-yt-font-scale,1.1))!important;line-height:1.4!important; }
html.uyp-yt-font #channel-name,
html.uyp-yt-font #metadata-line,
html.uyp-yt-font #metadata-line span,
html.uyp-yt-font ytd-video-meta-block,
html.uyp-yt-font #description yt-formatted-string { font-size:calc(13px * var(--uyp-yt-font-scale,1.1))!important;line-height:1.55!important; }
html.uyp-yt-font ytd-guide-entry-renderer .title,
html.uyp-yt-font ytd-mini-guide-entry-renderer .title,
html.uyp-yt-font ytd-masthead #search-input input,
html.uyp-yt-font #guide-section-title { font-size:calc(14px * var(--uyp-yt-font-scale,1.1))!important;line-height:1.4!important; }
/* Layout & Focus customization */
html.uyp-hide-sidebar:not(.uyp-guide-open) #guide,html.uyp-hide-sidebar:not(.uyp-guide-open) ytd-mini-guide-renderer,html.uyp-hide-sidebar:not(.uyp-guide-open) tp-yt-app-drawer,html.uyp-hide-sidebar:not(.uyp-guide-open) ytd-guide-renderer {display:none!important;}
html.uyp-hide-sidebar:not(.uyp-guide-open) ytd-page-manager,html.uyp-hide-sidebar:not(.uyp-guide-open) #page-manager {margin-left:0!important;}
html.uyp-compact-sidebar ytd-guide-renderer {width:205px!important;}
html.uyp-hide-comments ytd-comments,html.uyp-hide-comments #comments {display:none!important;}
html.uyp-hide-related #secondary,html.uyp-hide-related #related {display:none!important;}
html.uyp-hide-related ytd-watch-flexy #primary {max-width:none!important;}
html.uyp-hide-livechat #chat,html.uyp-hide-livechat ytd-live-chat-frame,html.uyp-hide-livechat #chat-container {display:none!important;}
html.uyp-hide-home ytd-browse[page-subtype="home"] #contents,html.uyp-hide-home ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {display:none!important;}
html.uyp-hide-merch ytd-merch-shelf-renderer,html.uyp-hide-merch ytd-donation-shelf-renderer,html.uyp-hide-merch ytd-product-carousel-renderer,html.uyp-hide-merch #donation-shelf {display:none!important;}
html.uyp-hide-mixes ytd-rich-item-renderer:has(a[href*="start_radio="]),html.uyp-hide-mixes ytd-compact-radio-renderer,html.uyp-hide-mixes ytd-radio-renderer {display:none!important;}
html.uyp-hide-end .ytp-ce-element,html.uyp-hide-end .ytp-endscreen-content {display:none!important;}
html.uyp-hide-cards .ytp-cards-button,html.uyp-hide-cards .ytp-cards-teaser {display:none!important;}
html.uyp-compact ytd-rich-item-renderer {margin-bottom:3px!important;}
html.uyp-compact #contents.ytd-rich-grid-renderer {row-gap:7px!important;}
html.uyp-round ytd-thumbnail #thumbnail,html.uyp-round ytd-rich-grid-media #thumbnail,html.uyp-round ytd-video-renderer #thumbnail {border-radius:15px!important;overflow:hidden!important;}
html.uyp-sharp ytd-thumbnail #thumbnail,html.uyp-sharp ytd-rich-grid-media #thumbnail {border-radius:2px!important;overflow:hidden!important;}
html.uyp-no-scrollbars ::-webkit-scrollbar {display:none!important;}
html.uyp-reduced-motion *,html.uyp-reduced-motion *::before,html.uyp-reduced-motion *::after {animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}
html.uyp-grid-3 ytd-rich-grid-renderer {--ytd-rich-grid-items-per-row:3!important;}
html.uyp-grid-4 ytd-rich-grid-renderer {--ytd-rich-grid-items-per-row:4!important;}
html.uyp-grid-5 ytd-rich-grid-renderer {--ytd-rich-grid-items-per-row:5!important;}
html.uyp-grid-6 ytd-rich-grid-renderer {--ytd-rich-grid-items-per-row:6!important;}
/* Optional theme overlays, reversible at any time */
html.uyp-theme-oled,html.uyp-theme-oled body,html.uyp-theme-oled ytd-app,html.uyp-theme-oled #background,html.uyp-theme-oled #container.ytd-masthead {background:#000!important;--yt-spec-base-background:#000!important;--yt-spec-raised-background:#080808!important;--yt-spec-menu-background:#101010!important;}
html.uyp-theme-dark,html.uyp-theme-dark body,html.uyp-theme-dark ytd-app {background:#0f1015!important;--yt-spec-base-background:#0f1015!important;--yt-spec-raised-background:#1a1c23!important;--yt-spec-menu-background:#20222b!important;}
html.uyp-theme-light,html.uyp-theme-light body,html.uyp-theme-light ytd-app {background:#fbf9ff!important;--yt-spec-base-background:#fbf9ff!important;--yt-spec-raised-background:#fff!important;--yt-spec-menu-background:#fff!important;--yt-spec-text-primary:#221c2e!important;--yt-spec-text-secondary:#635e71!important;color:#221c2e!important;}


/* Toast */
#uyp-toast {
  position: fixed; left: 50%; bottom: 72px; transform: translateX(-50%);
  background: rgba(20,20,24,.92); color: #fff; font: 500 13px/1.3 Roboto, Arial, sans-serif;
  padding: 10px 16px; border-radius: 999px; z-index: 2147483647; max-width: 80vw;
  opacity: 0; transition: opacity .2s; pointer-events: none; text-align: center;
}
#uyp-toast.show { opacity: 1; }

/* Download button */
/* Only one fixed dock for the video download and sign-in help shortcuts.
   Nothing may place another download shortcut on the left. */
#tubeium-right-actions{position:fixed;right:18px;bottom:74px;
  display:flex;align-items:flex-end;justify-content:flex-end;gap:9px;
  z-index:2147483646;font:500 13px "Segoe UI",Roboto,Arial,sans-serif;
  max-width:calc(100vw - 36px);}
#tubeium-right-actions[hidden],#tubeium-right-actions [hidden]{display:none!important}
html.uyp-mini #tubeium-right-actions,html.uyp-fs #tubeium-right-actions{display:none!important}
#uyp-dl{display:none;position:relative;flex-direction:column;
  align-items:flex-end;gap:8px;font:500 13px Roboto,Arial,sans-serif}
html.uyp-watch:not(.uyp-mini):not(.uyp-fs) #uyp-dl:not([hidden]){display:flex}
#tubeium-signin-help{display:inline-flex;align-items:center;justify-content:center;
  min-height:44px;max-width:220px;padding:11px 14px;flex:0 1 auto;
  background:linear-gradient(135deg,#30253f,#1b1b2a);color:#f2e7ff;
  border:1px solid #7d62ab;border-radius:14px;
  box-shadow:0 6px 22px #0008;white-space:normal;text-align:center;
  font:700 12px/1.25 "Segoe UI",Arial,sans-serif;cursor:pointer}
#tubeium-signin-help:hover{background:#413053;border-color:#ba96f2}
#tubeium-signin-help:focus-visible{outline:2px solid #e3caff;outline-offset:3px}
@media(max-width:600px){#tubeium-right-actions{right:9px;bottom:64px;gap:6px}
  #tubeium-signin-help{font-size:11px;padding:8px 9px;max-width:150px}}

#uyp-dl button { cursor: pointer; border: 0; color: #fff; font: inherit; }
#uyp-dl .uyp-main { background: var(--uyp-accent, #aa7dff); padding: 10px 16px; border-radius: 999px;
  box-shadow: 0 2px 10px rgba(0,0,0,.4); }
#uyp-dl .uyp-main:hover { filter: brightness(1.13); }
#uyp-dl .uyp-menu { display: none; flex-direction: column; background: #1f1f23; border-radius: 12px;
  overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.5); }
#uyp-dl.open .uyp-menu { display: flex; }
#uyp-dl .uyp-menu button { background: transparent; padding: 10px 18px; text-align: left; }
#uyp-dl .uyp-menu button:hover { background: #2e2e34; }
/* One-click download split control. The main action queues the video;
   the smaller chevron reveals format/playlist options without extra clicks. */
#uyp-dl .uyp-download-actions{display:flex;align-items:stretch;gap:2px;
  overflow:hidden;border-radius:14px;background:var(--uyp-accent,#9d85ff);
  border:1px solid #ffffff28;box-shadow:0 8px 30px #0009;}
#uyp-dl .uyp-download-actions .uyp-main{border-radius:0;min-height:44px;
  font-weight:750;font-size:13px;padding:12px 18px;background:transparent;box-shadow:none;}
#uyp-dl .uyp-download-actions .uyp-options{min-width:40px;padding:9px;
  background:#00000022;border-left:1px solid #ffffff35;
  color:white;font-size:21px;font-weight:700;}
#uyp-dl .uyp-download-actions button:hover,#uyp-dl .uyp-download-actions button:focus-visible{
  background:#ffffff25;outline:2px solid #fff;outline-offset:-2px;}
#uyp-dl .uyp-menu{min-width:240px;border:1px solid #6c6485;
  background:#1c1c26;border-radius:13px;padding:6px;box-shadow:0 16px 45px #000a;}
#uyp-dl .uyp-menu button{font-size:13px;border-radius:8px;padding:11px 12px;}

#uyp-dl .uyp-menu{position:absolute;bottom:calc(100% + 8px);right:0;
  z-index:2;max-height:55vh;overflow-y:auto}
/* Position above the native 42px tab strip instead of underneath it. */
#uyp-prefs-btn{
  position:fixed;bottom:68px;left:18px;z-index:2147483645;
  display:inline-flex;align-items:center;gap:9px;min-height:44px;
  padding:7px 15px 7px 9px;border-radius:14px;
  border:1px solid var(--uyp-accent,#aa7dff);
  background:linear-gradient(135deg,#342842,#1b1726);
  color:#fff;box-shadow:0 6px 24px #0009;
  font:700 13px/1.2 "Segoe UI",Roboto,Arial,sans-serif;
  letter-spacing:.01em;cursor:pointer;opacity:.98;
  transition:background .16s,box-shadow .16s,transform .16s;
}
#uyp-prefs-btn .uyp-prefs-icon{
  display:grid;place-items:center;width:28px;height:28px;flex-shrink:0;
  border-radius:9px;background:var(--uyp-accent,#aa7dff);color:#15101d;font-size:19px;
}
#uyp-prefs-btn:hover{background:#453353;box-shadow:0 8px 28px #000b;transform:translateY(-1px);}
#uyp-prefs-btn:focus-visible{outline:3px solid #e3caff;outline-offset:3px;}
html.uyp-mini #uyp-prefs-btn,html.uyp-fs #uyp-prefs-btn,html.uyp-hide-settings #uyp-prefs-btn{display:none!important;}
/* The Settings shortcut stays on the left; Download + sign-in help live on the right. */
@media(prefers-reduced-motion:reduce){#uyp-prefs-btn{transition:none;}#uyp-prefs-btn:hover{transform:none;}}

html.uyp-opt-hideChannelAvatars ytd-channel-name #avatar,
html.uyp-opt-hideChannelAvatars ytd-video-owner-renderer #avatar,
html.uyp-opt-hideChannelAvatars ytd-rich-grid-media #avatar,
html.uyp-opt-hideChannelAvatars ytd-compact-video-renderer #avatar,
html.uyp-opt-hideChannelAvatars ytd-channel-avatar-editor,
html.uyp-opt-hideChannelAvatars ytd-channel-avatar-view-model{display:none!important;}
html.uyp-opt-hideVerifiedBadges ytd-badge-supported-renderer[aria-label*="Verified"],
html.uyp-opt-hideVerifiedBadges yt-icon[icon="check-circle"],
html.uyp-opt-hideVerifiedBadges .badge-style-type-verified{display:none!important;}
html.uyp-opt-hideVideoBadges ytd-badge-supported-renderer.badge-style-type-simple,
html.uyp-opt-hideVideoBadges ytd-video-meta-block ytd-badge-supported-renderer,
html.uyp-opt-hideVideoBadges ytd-rich-grid-media #badges{display:none!important;}
html.uyp-opt-hideHoverPreviews ytd-moving-thumbnail-renderer,
html.uyp-opt-hideHoverPreviews ytd-thumbnail-overlay-loading-preview-renderer{display:none!important;}
html.uyp-opt-hideMasthead ytd-masthead,
html.uyp-opt-hideMasthead #masthead-container{display:none!important;}
html.uyp-opt-hideTopicChips ytd-feed-filter-chip-bar-renderer,
html.uyp-opt-hideTopicChips yt-chip-cloud-renderer,
html.uyp-opt-hideTopicChips #chips-wrapper{display:none!important;}
html.uyp-opt-hideCommunityPosts ytd-backstage-post-thread-renderer,
html.uyp-opt-hideCommunityPosts ytd-post-renderer,
html.uyp-opt-hideCommunityPosts ytd-rich-item-renderer:has(ytd-post-renderer){display:none!important;}
html.uyp-opt-hideLiveStreams ytd-rich-item-renderer:has(ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"]),
html.uyp-opt-hideLiveStreams ytd-video-renderer:has([overlay-style="LIVE"]){display:none!important;}
html.uyp-opt-hideUpcoming ytd-rich-item-renderer:has(ytd-upcoming-event-renderer),
html.uyp-opt-hideUpcoming ytd-video-renderer:has(ytd-upcoming-event-renderer){display:none!important;}
html.uyp-opt-hidePremiumUpsells ytd-premium-signup-dialog-renderer,
html.uyp-opt-hidePremiumUpsells ytd-mealbar-promo-renderer,
html.uyp-opt-hidePremiumUpsells ytd-popup-container tp-yt-paper-dialog:has(ytd-premium-signup-dialog-renderer){display:none!important;}
html.uyp-opt-hidePaidPromotions .ytp-paid-content-overlay,
html.uyp-opt-hidePaidPromotions .ytp-paid-content-overlay-link{display:none!important;}
html.uyp-opt-hideJoinButton ytd-membership-button-renderer,
html.uyp-opt-hideJoinButton #sponsor-button,
html.uyp-opt-hideJoinButton ytd-sponsorships-offer-renderer{display:none!important;}
html.uyp-opt-hideThanksButton ytd-button-renderer:has(button[aria-label*="Thanks"]),
html.uyp-opt-hideThanksButton ytd-menu-service-item-renderer:has([aria-label*="Thanks"]){display:none!important;}
html.uyp-opt-hideClipButton ytd-button-renderer:has(button[aria-label*="Clip"]),
html.uyp-opt-hideClipButton ytd-menu-service-item-renderer:has([aria-label*="Clip"]){display:none!important;}
html.uyp-opt-hideShareButton ytd-button-renderer:has(button[aria-label^="Share"]),
html.uyp-opt-hideShareButton ytd-menu-service-item-renderer:has([aria-label^="Share"]){display:none!important;}
html.uyp-opt-hideSaveButton ytd-button-renderer:has(button[aria-label^="Save"]),
html.uyp-opt-hideSaveButton ytd-menu-service-item-renderer:has([aria-label^="Save"]){display:none!important;}
html.uyp-opt-hideDownloadNative ytd-download-button-renderer,
html.uyp-opt-hideDownloadNative yt-download-button-view-model{display:none!important;}
html.uyp-opt-hideChannelWatermark .ytp-watermark,
html.uyp-opt-hideChannelWatermark .ytp-chrome-top .ytp-watermark{display:none!important;}
html.uyp-opt-hideRelatedSearches ytd-search-refinement-card-renderer,
html.uyp-opt-hideRelatedSearches ytd-horizontal-card-list-renderer{display:none!important;}
html.uyp-opt-hideDescription #description ytd-text-inline-expander,
html.uyp-opt-hideDescription #description-inner,
html.uyp-opt-hideDescription #description ytd-expandable-video-description-body-renderer{display:none!important;}
html.uyp-opt-hideVideoMetadata ytd-video-meta-block #metadata-line,
html.uyp-opt-hideVideoMetadata ytd-rich-grid-media #metadata-line,
html.uyp-opt-hideVideoMetadata ytd-compact-video-renderer #metadata-line{display:none!important;}
html.uyp-opt-hideSearchSuggestions ytd-searchbox-spt,
html.uyp-opt-hideSearchSuggestions #suggestions,
html.uyp-opt-hideSearchSuggestions yt-searchbox-suggest{display:none!important;}
html.uyp-opt-hidePlaylists ytd-playlist-renderer,
html.uyp-opt-hidePlaylists ytd-compact-playlist-renderer,
html.uyp-opt-hidePlaylists ytd-rich-item-renderer:has(ytd-playlist-renderer){display:none!important;}
html.uyp-opt-hideExplore ytd-guide-entry-renderer:has(a[href^="/feed/explore"]),
html.uyp-opt-hideExplore ytd-guide-entry-renderer:has(a[href^="/feed/trending"]),
html.uyp-opt-hideExplore ytd-mini-guide-entry-renderer:has(a[href^="/feed/explore"]){display:none!important;}
html.uyp-opt-hideSubscriptionsNav ytd-guide-entry-renderer:has(a[href="/feed/subscriptions"]),
html.uyp-opt-hideSubscriptionsNav ytd-mini-guide-entry-renderer:has(a[href="/feed/subscriptions"]){display:none!important;}
html.uyp-opt-hideHistoryNav ytd-guide-entry-renderer:has(a[href="/feed/history"]),
html.uyp-opt-hideHistoryNav ytd-mini-guide-entry-renderer:has(a[href="/feed/history"]){display:none!important;}
html.uyp-opt-shortsHideTitle ytd-reel-video-renderer #overlay #title,
html.uyp-opt-shortsHideTitle ytd-reel-player-overlay-renderer #title,
html.uyp-opt-shortsHideTitle ytd-shorts #shorts-title{display:none!important;}
html.uyp-opt-shortsHideChannel ytd-reel-player-header-renderer,
html.uyp-opt-shortsHideChannel ytd-reel-player-overlay-renderer #channel-info{display:none!important;}
html.uyp-opt-shortsHideLike ytd-reel-video-renderer #like-button,
html.uyp-opt-shortsHideLike ytd-reel-player-overlay-renderer #like-button{display:none!important;}
html.uyp-opt-shortsHideDislike ytd-reel-video-renderer #dislike-button,
html.uyp-opt-shortsHideDislike ytd-reel-player-overlay-renderer #dislike-button{display:none!important;}
html.uyp-opt-shortsHideComments ytd-reel-video-renderer #comments-button,
html.uyp-opt-shortsHideComments ytd-reel-player-overlay-renderer #comments-button{display:none!important;}
html.uyp-opt-shortsHideShare ytd-reel-video-renderer #share-button,
html.uyp-opt-shortsHideShare ytd-reel-player-overlay-renderer #share-button{display:none!important;}
html.uyp-opt-shortsHideRemix ytd-reel-video-renderer #remix-button,
html.uyp-opt-shortsHideRemix ytd-reel-player-overlay-renderer #remix-button{display:none!important;}
html.uyp-opt-shortsHideSubscribe ytd-reel-video-renderer #subscribe-button,
html.uyp-opt-shortsHideSubscribe ytd-reel-player-overlay-renderer #subscribe-button{display:none!important;}
html.uyp-opt-shortsHideAudio ytd-reel-player-overlay-renderer #sound-metadata,
html.uyp-opt-shortsHideAudio ytd-reel-video-renderer #music-button{display:none!important;}
html.uyp-opt-shortsHideNav ytd-reel-video-renderer #navigation-button-up,
html.uyp-opt-shortsHideNav ytd-reel-video-renderer #navigation-button-down{display:none!important;}
html.uyp-opt-hidePlayerNext .ytp-next-button,
html.uyp-opt-hidePlayerNext .ytp-prev-button{display:none!important;}
html.uyp-opt-hidePlayerAutoplay .ytp-autonav-toggle-button{display:none!important;}
html.uyp-opt-hidePlayerCaptions .ytp-subtitles-button{display:none!important;}
html.uyp-opt-hidePlayerSettings .ytp-settings-button{display:none!important;}
html.uyp-opt-hidePlayerMiniplayer .ytp-miniplayer-button{display:none!important;}
html.uyp-opt-hidePlayerCast .ytp-remote-button,
html.uyp-opt-hidePlayerCast .ytp-cast-button{display:none!important;}
html.uyp-opt-hidePlayerFullscreen .ytp-fullscreen-button{display:none!important;}
html.uyp-opt-hideVideoAnnotations .annotation,
html.uyp-opt-hideVideoAnnotations .ytp-iv-player-content,
html.uyp-opt-hideVideoAnnotations .ytp-annotations-container{display:none!important;}
html.uyp-opt-hidePlayerGradient .ytp-gradient-top,
html.uyp-opt-hidePlayerGradient .ytp-gradient-bottom{display:none!important;}
html.uyp-opt-hideWatchedProgress ytd-thumbnail-overlay-resume-playback-renderer,
html.uyp-opt-hideWatchedProgress #progress.ytd-thumbnail-overlay-resume-playback-renderer{display:none!important;}
html.uyp-opt-hideSuggestedSearches ytd-search-refinement-card-renderer,
html.uyp-opt-hideSuggestedSearches ytd-search-suggestion-renderer{display:none!important;}
html.uyp-opt-dimPageBackground ytd-watch-flexy #below,html.uyp-opt-dimPageBackground ytd-watch-flexy #secondary{opacity:.5;transition:opacity .15s;}html.uyp-opt-dimPageBackground ytd-watch-flexy #below:hover,html.uyp-opt-dimPageBackground ytd-watch-flexy #secondary:hover{opacity:1;}
html.uyp-opt-highContrastText #video-title,html.uyp-opt-highContrastText ytd-video-meta-block,html.uyp-opt-highContrastText ytd-watch-metadata h1{text-shadow:0 1px 1px #0005;filter:contrast(1.2);}
html.uyp-round ytd-thumbnail #thumbnail,html.uyp-round ytd-rich-grid-media #thumbnail{border-radius:var(--uyp-thumbnail-radius,15px)!important;}
html.uyp-opt-hideMasthead #page-manager{margin-top:0!important;}html.uyp-opt-hideMasthead ytd-app{--ytd-masthead-height:0px!important;}
#uyp-toolbox[hidden],#uyp-toolbox button[hidden],#uyp-dislikes[hidden],#uyp-thumb-btn[hidden]{display:none!important;}
#uyp-toolbox{position:fixed;z-index:2147483642;right:22px;top:78px;display:flex;align-items:center;gap:5px;padding:7px;background:#181922e8;border:1px solid #ffffff36;border-radius:13px;box-shadow:0 6px 24px #0008;font:500 13px Arial,sans-serif;color:white;max-width:calc(100vw - 40px);}
#uyp-toolbox button{background:#ffffff17;border:1px solid transparent;color:white;font:inherit;padding:8px 9px;border-radius:8px;cursor:pointer;white-space:nowrap;}
#uyp-toolbox button:hover,#uyp-toolbox button:focus-visible{background:#ffffff36;outline:1px solid var(--uyp-accent,#aa7dff);}
#uyp-toolbox button[data-tool="quality"]{font-weight:750;font-size:12px;letter-spacing:.02em;min-width:39px;}
#uyp-playback-diagnostics[hidden]{display:none!important;}
#uyp-playback-diagnostics{
  position:fixed;right:20px;top:137px;z-index:2147483644;
  width:min(370px,calc(100vw - 40px));max-height:calc(100vh - 150px);
  overflow-y:auto;padding:13px;border:1px solid #64527c;
  border-radius:14px;box-shadow:0 14px 42px #000c;
  background:#17151f;color:#f6f4ff;font:13px/1.5 "Segoe UI",Arial,sans-serif;
}
#uyp-playback-diagnostics header,#uyp-playback-diagnostics footer{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
}
#uyp-playback-diagnostics strong{font-size:15px}
#uyp-playback-diagnostics button{padding:7px 11px;border-radius:8px;
  border:1px solid #5a4b70;background:#272334;color:#fff;cursor:pointer;}
#uyp-playback-diagnostics button:focus-visible{outline:2px solid #c8aaff;outline-offset:2px}
#uyp-playback-diagnostics .uyp-diag-row{
  padding:7px 2px;border-bottom:1px solid #ffffff18;
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
}
#uyp-playback-diagnostics .uyp-diag-label{flex:0 0 44%;color:#bab4cc}
#uyp-playback-diagnostics .uyp-diag-value{
  flex:1;min-width:0;overflow-wrap:anywhere;text-align:right;
}
#uyp-playback-diagnostics footer{margin-top:12px;justify-content:flex-end}
html.uyp-fs #uyp-playback-diagnostics,html.uyp-mini #uyp-playback-diagnostics{display:none!important;}
#uyp-toolbox button.tubeium-quality-4k{
  background:color-mix(in srgb,var(--uyp-accent,#aa7dff) 26%,#191b24);
  border-color:var(--uyp-accent,#aa7dff);
  color:#fff;
}
#uyp-dislikes{position:fixed;z-index:2147483642;right:22px;top:132px;border-radius:9px;background:#191b23ee;color:#fff;padding:7px 11px;font:12px Arial,sans-serif;box-shadow:0 5px 19px #0008;}
#uyp-shorts-seek{position:fixed;z-index:2147483643;left:50%;transform:translateX(-50%);bottom:26px;width:min(470px,66vw);background:#181922e8;border:1px solid #ffffff50;color:#fff;border-radius:13px;display:flex;align-items:center;gap:12px;padding:10px 14px;font:600 13px Arial,sans-serif;box-shadow:0 5px 20px #0008}
#uyp-shorts-seek[hidden]{display:none!important}#uyp-shorts-seek input{flex:1;accent-color:var(--uyp-accent,#aa7dff);min-width:70px}#uyp-shorts-seek output{min-width:73px;text-align:right}
#uyp-quick-nav{position:fixed;top:140px;left:14px;z-index:2147483630;display:flex;flex-direction:column;gap:5px;background:#1c1a29f0;border:1px solid #ffffff36;border-radius:14px;padding:8px;box-shadow:0 6px 20px #0007;font:600 14px Arial,sans-serif}
#uyp-quick-nav[data-position=right]{left:auto;right:14px}#uyp-quick-nav[hidden]{display:none!important}#uyp-quick-nav a{padding:8px 12px;color:#e8dfff;text-decoration:none;border-radius:9px}#uyp-quick-nav a:hover{background:#ffffff25}
html:not(.uyp-watch) #uyp-toolbox,html:not(.uyp-watch) #uyp-dislikes,html.uyp-mini #uyp-toolbox,html.uyp-mini #uyp-dislikes,html.uyp-fs #uyp-toolbox,html.uyp-fs #uyp-dislikes{display:none!important;}

`;

function injectStyle() {
  if (document.getElementById('uyp-style')) return;
  const el = document.createElement('style');
  el.id = 'uyp-style';
  el.textContent = CSS;
  (document.head || document.documentElement).appendChild(el);
}

const getVideo = () => document.querySelector('video.html5-main-video') || document.querySelector('video');
const getPlayer = () => document.querySelector('.html5-video-player');
const adShowing = () => { const p = getPlayer(); return !!p && (p.classList.contains('ad-showing') || p.classList.contains('ad-interrupting')); };

function currentVideoId() {
  if (location.pathname === '/watch') return new URLSearchParams(location.search).get('v');
  const m = location.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/);
  return m ? m[1] : null;
}

const FLAGS = {
  'uyp-noshorts': 'hideShorts', 'uyp-noads': 'blockAds',
  'uyp-hide-sidebar': 'hideSidebar', 'uyp-compact-sidebar': 'compactSidebar',
  'uyp-hide-comments': 'hideComments', 'uyp-hide-related': 'hideRelated',
  'uyp-hide-livechat': 'hideLiveChat', 'uyp-hide-home': 'hideHomeFeed',
  'uyp-hide-merch': 'hideMerch', 'uyp-hide-mixes': 'hideMixes',
  'uyp-hide-end': 'hideEndScreens', 'uyp-hide-cards': 'hideCards',
  'uyp-compact': 'compactDensity', 'uyp-no-scrollbars': 'hideScrollbars',
  'uyp-reduced-motion': 'reduceAnimations',
};
const EXTRA_CSS_KEYS = ['hideChannelAvatars', 'hideVerifiedBadges', 'hideVideoBadges', 'hideHoverPreviews', 'hideMasthead', 'hideTopicChips', 'hideCommunityPosts', 'hideLiveStreams', 'hideUpcoming', 'hidePremiumUpsells', 'hidePaidPromotions', 'hideJoinButton', 'hideThanksButton', 'hideClipButton', 'hideShareButton', 'hideSaveButton', 'hideDownloadNative', 'hideChannelWatermark', 'hideRelatedSearches', 'hideDescription', 'hideVideoMetadata', 'hideSearchSuggestions', 'hidePlaylists', 'hideExplore', 'hideSubscriptionsNav', 'hideHistoryNav', 'shortsHideTitle', 'shortsHideChannel', 'shortsHideLike', 'shortsHideDislike', 'shortsHideComments', 'shortsHideShare', 'shortsHideRemix', 'shortsHideSubscribe', 'shortsHideAudio', 'shortsHideNav', 'hidePlayerNext', 'hidePlayerAutoplay', 'hidePlayerCaptions', 'hidePlayerSettings', 'hidePlayerMiniplayer', 'hidePlayerCast', 'hidePlayerFullscreen', 'hideVideoAnnotations', 'hidePlayerGradient', 'hideWatchedProgress', 'hideSuggestedSearches', 'dimPageBackground', 'highContrastText'];
let youtubeNativeDark = null;
function applyState() {
  // Keep the early player-response filter in sync with the existing setting.
  try {
    void webFrame.executeJavaScript(
      'window.__tubeiumAdFilter?.setEnabled(' + (state.blockAds === true) + ')', false
    ).catch(() => {});
  } catch {}
  const root = document.documentElement;
  if(youtubeNativeDark === null) youtubeNativeDark = root.hasAttribute('dark');
  if(state.pageTheme && state.pageTheme !== 'native') root.toggleAttribute('dark', state.pageTheme !== 'light');
  else root.toggleAttribute('dark', youtubeNativeDark);
  for (const [cls, key] of Object.entries(FLAGS)) root.classList.toggle(cls, !!state[key]);
  if (!state.hideSidebar) root.classList.remove('uyp-guide-open');
  for (const key of EXTRA_CSS_KEYS) root.classList.toggle('uyp-opt-' + key, !!state[key]);
  root.style.setProperty('--uyp-thumbnail-radius', (Number(state.thumbnailRadius) || 0) + 'px');
  root.classList.toggle('uyp-round', !!state.roundedThumbnails);
  root.classList.toggle('uyp-sharp', state.roundedThumbnails === false);
  root.classList.toggle('uyp-hide-settings', !state.showSettingsButton);
  root.classList.toggle('uyp-mini', !!state.mini);
  root.classList.toggle('uyp-watch', !!currentVideoId());
  for(const val of ['3','4','5','6']) root.classList.toggle('uyp-grid-'+val, state.gridColumns === val);
  for(const val of ['oled','dark','light']) root.classList.toggle('uyp-theme-'+val, state.pageTheme === val);
  root.style.setProperty('--uyp-accent', /^#[a-f0-9]{6}$/i.test(state.accentColor || '') ? state.accentColor : '#aa7dff');
  const ytFontPercent=Math.max(100,Math.min(160,Number(state.youtubeFontSize)||110));
  root.style.setProperty('--uyp-yt-font-scale',String(ytFontPercent/100));
  root.classList.toggle('uyp-yt-font',ytFontPercent!==100);
  let custom = document.getElementById('uyp-custom-css');
  if (!custom) { custom = document.createElement('style'); custom.id = 'uyp-custom-css'; (document.head || root).appendChild(custom); }
  if (custom.textContent !== (state.customCSS || '')) custom.textContent = state.customCSS || '';
  const btn = document.getElementById('uyp-dl');
  if(btn)btn.hidden=state.showDownloadButton===false;
  const signinHelp=document.getElementById('tubeium-signin-help');
  if(signinHelp)signinHelp.hidden=state.showSigninHelpButton===false;
  const managerEntry=document.getElementById('uyp-dl-manager');
  if(managerEntry)managerEntry.hidden=state.toolDownloads===false;
  const rightActions=document.getElementById('tubeium-right-actions');
  if(rightActions)rightActions.hidden=state.showDownloadButton===false&&state.showSigninHelpButton===false;
  const audioButton = document.getElementById('uyp-audio-btn');
  if (audioButton) audioButton.textContent = 'Audio (' + ((state.audioFormat || 'mp3') === 'best' ? 'original' : String(state.audioFormat).toUpperCase()) + ')';
  const videoButton = document.getElementById('uyp-video-btn');
  if (videoButton) videoButton.textContent = 'Video ('+String(state.videoContainer || 'mp4').toUpperCase()+')';
  const thumbButton = document.getElementById('uyp-thumb-btn');
  if (thumbButton) thumbButton.hidden = !state.downloadThumbnailOnly;
  updateTools();
  updateDislikeIndicator();
  updateQuickNav();
}

let toastTimer;
function toast(text, ms = 1600) {
  if (state.hideToastMessages) return;
  let el = document.getElementById('uyp-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'uyp-toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---- Custom keyboard shortcuts (captured before YouTube uses them) ----
function eventKey(e) {
  const key = e.code === 'Space' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  return [e.ctrlKey && 'Ctrl',e.altKey && 'Alt',e.shiftKey && 'Shift',e.metaKey && 'Meta',key].filter(Boolean).join('+');
}
function initSpeedKeys() {
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const v = getVideo();
    if (!v || adShowing()) return;
    const key = eventKey(e);
    let handled = false;
    if (state.enableSpeedKeys) {
      const step = Number(state.speedStep) || .25;
      let rate = null;
      if (key === state.speedUpKey) rate = Math.min(4, v.playbackRate + step);
      else if (key === state.speedDownKey) rate = Math.max(.25, v.playbackRate - step);
      else if (key === state.speedResetKey) rate = 1;
      if (rate !== null) { v.playbackRate = Math.round(rate * 100)/100; toast(`Speed ${v.playbackRate}×`); handled = true; }
    }
    if (state.enableSeekKeys && (key === state.seekForwardKey || key === state.seekBackKey)) {
      const sec = Number(state.seekSeconds) || 10;
      const delta = key === state.seekForwardKey ? sec : -sec;
      v.currentTime = Math.max(0,Math.min(Number.isFinite(v.duration) ? v.duration : Number.MAX_SAFE_INTEGER,v.currentTime+delta));
      toast((delta>0?'+':'')+delta+' seconds');handled = true;
    }
    if (state.enableLoopKey && key === state.toggleLoopKey) { v.loop=!v.loop;toast(v.loop?'Loop on':'Loop off');handled=true; }
    if (handled) {e.preventDefault();e.stopImmediatePropagation();}
  }, true);
}

function saveMemorySoon(v) {
  if (adShowing()) return;
  playbackMemory = { speed: Math.max(.25,Math.min(4,v.playbackRate)), volume: Math.round(v.volume*100), muted: !!v.muted };
  clearTimeout(memorySaveTimer);
  memorySaveTimer = setTimeout(() => ipcRenderer.invoke('save-player-memory', playbackMemory).catch(()=>{}), 700);
}
function applyNewVideoPreferences(v) {
  if (adShowing()) return;
  v.playbackRate = state.rememberSpeed ? Number(playbackMemory.speed || 1) : Number(state.defaultSpeed || 1);
  v.volume = (state.rememberVolume ? Number(playbackMemory.volume ?? 100) : Number(state.defaultVolume ?? 100))/100;
  v.loop = !!state.loopVideo;
  v.preservesPitch = !!state.preservePitch;
  v.controls = !!state.showNativeControls;
  if (state.rememberMute) v.muted = !!playbackMemory.muted;
  else v.muted = !!state.startMuted;
  const skip = Number(state.skipVideoIntro) || 0;
  if (skip && Number.isFinite(v.duration) && v.duration > skip + 1 && v.currentTime < 1) v.currentTime = skip;
  if (state.preferredAudioLanguage && state.preferredAudioLanguage !== 'auto') {
    // YouTube's audio-track API is undocumented, so this is best-effort and may do nothing.
    try {
      const player=document.getElementById('movie_player');
      const tracks=typeof player?.getAvailableAudioTracks==='function' ? player.getAvailableAudioTracks() : [];
      const match=Array.isArray(tracks) && tracks.find(t=>{
        const lang=String(t.id||t.languageCode||t.language||'').toLowerCase();
        return lang===state.preferredAudioLanguage||lang.startsWith(state.preferredAudioLanguage+'-');
      });
      if(match && typeof player.setAudioTrack==='function')player.setAudioTrack(match);
    } catch {}
  }
  if(state.preferredQuality && state.preferredQuality !== 'auto') {
    try {
      const p=document.getElementById('movie_player');
      if(p && typeof p.setPlaybackQualityRange==='function')p.setPlaybackQualityRange(state.preferredQuality);
    } catch {}
  }
}
function updateTheaterAndCaptions() {
  if(!currentVideoId()) return;
  if(state.autoFullscreen && !document.fullscreenElement) document.querySelector('.ytp-fullscreen-button')?.click();
  if(state.forceCaptionsOff) { document.querySelector('.ytp-subtitles-button[aria-pressed="true"]')?.click(); }
  if(state.autoTheater && !document.querySelector('ytd-watch-flexy[theater]')) document.querySelector('.ytp-size-button')?.click();
  if(state.autoCaptions && !state.forceCaptionsOff) {
    const cc=document.querySelector('.ytp-subtitles-button[aria-pressed="false"]');
    if(cc)cc.click();
  }
}
function updateAutoplayToggle() {
  const toggle = document.querySelector('.ytp-autonav-toggle-button[aria-checked]');
  if (toggle && ((toggle.getAttribute('aria-checked') === 'true') !== !!(state.autoplayNext && !state.stopAfterVideo))) toggle.click();
}
function initPlayback() {
  let current = null;
  let lastVideo = null;
  const visited = new WeakSet();
  setInterval(() => {
    const v = getVideo(); const id = currentVideoId();
    if(!v || !id) {current=null;lastVideo=null;return;}
    const config=[state.defaultSpeed,state.rememberSpeed,state.defaultVolume,state.rememberVolume,state.loopVideo,state.preferredQuality,state.startMuted,state.rememberMute,state.preservePitch,state.skipVideoIntro,state.showNativeControls,state.preferredAudioLanguage,state.autoCaptions,state.autoTheater].join('|');
    if(lastVideo!==v || current!==id || playerPreferenceSignature!==config){
      current=id; lastVideo=v; playerPreferenceSignature=config;
      if (v.readyState >= 1) applyNewVideoPreferences(v);
      else v.addEventListener('loadedmetadata',()=>applyNewVideoPreferences(v),{once:true});
      setTimeout(updateTheaterAndCaptions,850);
    }
    if(!visited.has(v)){
      visited.add(v);
      v.addEventListener('loadedmetadata',()=>{ if(currentVideoId() && !adShowing())applyNewVideoPreferences(v); });
      v.addEventListener('ratechange',()=>{if(state.rememberSpeed && !adShowing())saveMemorySoon(v);});
      v.addEventListener('volumechange',()=>{if((state.rememberVolume || state.rememberMute) && !adShowing() && !sponsorMuting)saveMemorySoon(v);});
      v.addEventListener('ended',()=>{if(state.stopAfterVideo) v.pause();});
    }
    updateAutoplayToggle();
  },700);
}

function initSettingsButton() {
  if(document.getElementById('uyp-prefs-btn'))return;
  const b=document.createElement('button');
  b.id='uyp-prefs-btn';b.type='button';
  b.title='Open Tubeium settings (Ctrl+,)';
  b.setAttribute('aria-label','Open Tubeium settings');
  const icon=document.createElement('span');icon.className='uyp-prefs-icon';
  icon.textContent='⚙';icon.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='uyp-prefs-label';
  label.textContent='Settings';
  b.append(icon,label);
  b.addEventListener('click',()=>ipcRenderer.send('open-settings'));
  document.body.append(b);
}

// ---- Video ad fallback (after the early player-response filter) ----
// Never seek to an ad's duration: doing so can trigger a black/frozen player
// and can inadvertently jump the real video's timeline after an ad transition.
function initAdBlock() {
  let wasAd = false;
  let didAttemptSkip = false;
  let lastSkipAttempt = 0;

  setInterval(() => {
    if (!state.blockAds) {
      wasAd = false;
      didAttemptSkip = false;
      return;
    }
    // If YouTube displays an enforcement overlay, dismiss the transient layer
    // without touching video time, volume or playback state.
    const enforcement = document.querySelector('ytd-enforcement-message-view-model');
    if (enforcement) {
      (enforcement.closest('tp-yt-paper-dialog') || enforcement).remove();
      document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach((n) => n.remove());
      document.body.style.overflow = 'auto';
      const v0 = getVideo();
      if (v0 && v0.paused) v0.play().catch(() => {});
    }
    const v = getVideo();
    if (!v) return;
    if (adShowing()) {
      if (!wasAd) {
        wasAd = true;
        didAttemptSkip = false;
      }
      const now = Date.now();
      if (now - lastSkipAttempt > 300) {
        lastSkipAttempt = now;
        const player = getPlayer();
        // Prefer the player's skip operation / actual YouTube skip button.
        // Do not fake seeks, touch ad media sources or remove player controls.
        try {
          if (typeof player?.skipAd === 'function') {
            player.skipAd();
            didAttemptSkip = true;
          }
        } catch {}
        const skip = document.querySelector(
          '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button'
        );
        if (skip && !skip.disabled && skip.getAttribute('aria-disabled') !== 'true'
                 && skip.getClientRects().length) {
          skip.click();
          didAttemptSkip = true;
        }
      }
      return;
    }
    if (wasAd) {
      wasAd = false;
      if (didAttemptSkip && state.adSkipToast) toast('Ad skipped');
      didAttemptSkip = false;
    }
    const close = document.querySelector('.ytp-ad-overlay-close-button');
    if (close && close.getClientRects().length) close.click();
  }, 150);
}

// ---- SponsorBlock ----
let sponsorMuting = false;
function initSponsorBlock() {
  let loadedFor = null;
  let segments = [];
  let originalMuted = false;
  function unmuteIfNeeded() {
    if (!sponsorMuting) return;
    sponsorMuting = false;
    const v=getVideo(); if(v) v.muted = originalMuted;
  }
  setInterval(async () => {
    const id = currentVideoId();
    if (!state.sponsorBlock || (location.pathname.startsWith('/shorts/') && !state.sponsorInShorts)) {
      loadedFor = null; segments = []; unmuteIfNeeded(); return;
    }
    const key = id+'|'+JSON.stringify(state.sbCategories || []);
    if (key !== loadedFor) {
      loadedFor = key; segments = []; unmuteIfNeeded();
      if (id) {
        const result = await ipcRenderer.invoke('sb-segments', id).catch(()=>[]);
        if (loadedFor === key) segments = result;
      }
    }
    const v = getVideo();
    if (!v || adShowing() || !segments.length) { unmuteIfNeeded(); return; }
    const t = v.currentTime;
    const segment = segments.find(s => t>=s.start && t<s.end-0.3);
    const muteThis = segment && state.sbAllowMute && (state.sbMutedCategories||[]).includes(segment.category);
    if (muteThis) {
      if(!sponsorMuting){ originalMuted = !!v.muted; sponsorMuting = true; }
      v.muted = true;
      return;
    }
    unmuteIfNeeded();
    if(!segment || v.paused) return;
    v.currentTime = segment.end;
    if(state.sponsorToast) toast(`Skipped ${LABELS[segment.category] || segment.category}`);
  }, 300);
}

// ---- Download button ----
function initDownloadButton() {
  // Retire any legacy left-side download widget from older app versions.
  document.getElementById('uyp-dl-left')?.remove();
  if(document.getElementById('tubeium-right-actions'))return;
  const dock=document.createElement('div');dock.id='tubeium-right-actions';
  const signinHelp=document.createElement('button');
  signinHelp.type='button';signinHelp.id='tubeium-signin-help';
  signinHelp.textContent='Have a problem signing in?';
  signinHelp.title='Open Tubeium sign-in help';
  signinHelp.setAttribute('aria-label','Have a problem signing in? Open Tubeium sign-in help');
  signinHelp.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    ipcRenderer.send('tubeium-open-signin-help');
  });
  const box = document.createElement('div');
  box.id = 'uyp-dl';

  const menu = document.createElement('div');
  menu.className = 'uyp-menu';menu.id='tubeium-download-options';menu.setAttribute('role','group');menu.setAttribute('aria-label','More download options');
  const main = document.createElement('button');
  main.className = 'uyp-main';main.type='button';
  main.textContent = '↓ Download video';
  main.title='One click: add this video to Tubeium’s download queue';
  main.setAttribute('aria-label','Download this video');
  const options=document.createElement('button');
  options.type='button';options.className='uyp-options';options.textContent='⌄';
  options.title='Choose video, audio, thumbnail or playlist download';
  options.setAttribute('aria-label','More download options');
  options.setAttribute('aria-expanded','false');options.setAttribute('aria-controls','tubeium-download-options');

  let busy = false;
  const setLabel = (t) => { main.textContent = t; };

  async function start(mode) {
    const id = currentVideoId();
    if (!id || busy) return;
    busy = true;
    box.classList.remove('open');options.setAttribute('aria-expanded','false');
    setLabel('Starting…');
    try {
      const res = await ipcRenderer.invoke('download', { id, mode });
      if (res.ok) {toast('Added to download queue · Ctrl+Shift+D to manage', 3500);setLabel('✓ Queued');}
      else toast('Download failed: ' + String(res.error || 'Unknown error').slice(0, 140), 5000);
    } catch (err) { toast('Download failed: ' + String(err.message || err).slice(0, 140), 5000); }
    finally { busy = false; setTimeout(()=>{if(!busy)setLabel('↓ Download video');},1250); }
  }

  [['Video', 'video'], ['Audio', 'audio'], ['Thumbnail', 'thumbnail']].forEach(([label, mode]) => {
    const b = document.createElement('button');
    b.id = mode === 'audio' ? 'uyp-audio-btn' : mode === 'thumbnail' ? 'uyp-thumb-btn' : 'uyp-video-btn';
    if (mode === 'thumbnail') b.hidden = !state.downloadThumbnailOnly;
    b.textContent = mode === 'thumbnail' ? 'Thumbnail image' : mode === 'audio' ? 'Audio (' + ((state.audioFormat || 'mp3') === 'best' ? 'original' : String(state.audioFormat).toUpperCase()) + ')' : label+' ('+String(state.videoContainer || 'mp4').toUpperCase()+')';
    b.addEventListener('click', () => start(mode));
    menu.appendChild(b);
  });

  const playlistButton=document.createElement('button');playlistButton.type='button';playlistButton.textContent='Download full playlist';
  playlistButton.addEventListener('click',async()=>{
    const list=new URLSearchParams(location.search).get('list');
    if(!list){toast('Open a YouTube playlist first');return;}
    box.classList.remove('open');
    try{const response=await ipcRenderer.invoke('download',{scope:'playlist',url:location.href,mode:'video'});
      if(!response.ok)throw new Error(response.error);toast('Playlist added to queue',3000);
    }catch(e){toast('Playlist: '+String(e.message||e).slice(0,140),4000);}
  });menu.appendChild(playlistButton);
  const managerButton=document.createElement('button');managerButton.type='button';managerButton.id='uyp-dl-manager';managerButton.textContent='Open download manager ↗';
  managerButton.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    box.classList.remove('open');options.setAttribute('aria-expanded','false');
    ipcRenderer.send('open-download-manager');
  });menu.appendChild(managerButton);
  // Distinct actions: Download VIDEO only queues; chevron ONLY opens the menu;
  // only the explicit manager entry may open the manager.
  main.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    // Never toggle the menu and never send open-download-manager here.
    void start('video');
  });
  options.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(busy)return;
    playlistButton.hidden=!new URLSearchParams(location.search).has('list');
    const open=box.classList.toggle('open');
    options.setAttribute('aria-expanded',String(open));
  });
  box.addEventListener('click',event=>event.stopPropagation());
  box.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      box.classList.remove('open');options.setAttribute('aria-expanded','false');options.focus();
    }
  });
  box.appendChild(menu);
  const actions=document.createElement('div');actions.className='uyp-download-actions';
  actions.append(main,options);box.appendChild(actions);
  dock.append(signinHelp,box);document.body.appendChild(dock);
  applyState();

  document.addEventListener('pointerdown',event=>{
    if(box.classList.contains('open')&&!box.contains(event.target)){
      box.classList.remove('open');options.setAttribute('aria-expanded','false');
    }
  },true);
  ipcRenderer.on('dl-progress', (_e, p) => {
    if (p.status) setLabel(p.status);
    else if (typeof p.pct === 'number') setLabel(`⬇ ${Math.round(p.pct)}%`);
  });
}


// Floating tools and gestures: desktop equivalents of uYou's overlay controls.
let toolbar;
function updateTools() {
  if (!toolbar) return;
  toolbar.hidden = !state.showOverlayToolbar || !currentVideoId();
  for (const [id,key] of [['mute','toolMute'],['speed','toolSpeed'],['pip','toolPiP'],['link','toolCopyLink'],['title','toolCopyTitle'],['full','toolFullscreen'],['theater','toolTheater'],['quality','toolQuality'],['bookmark','showBookmarkButton'],['library','localLibraryEnabled'],['screenshot','showScreenshotButton'],['seekBack','toolSeekButtons'],['seekForward','toolSeekButtons']]) {
    const button = toolbar.querySelector(`[data-tool="${id}"]`);
    if (button) button.hidden = !state[key] || (id==='bookmark'&&!state.localLibraryEnabled);
  }
  const diagnosticsButton=toolbar.querySelector('[data-tool="diagnostics"]');
  if(diagnosticsButton)diagnosticsButton.hidden=!state.toolQuality;
}
// The quality tool reports the *current decoded stream resolution*, not a
// promised or requested playback preference. HTMLVideoElement.videoHeight may
// change as adaptive streaming switches between YouTube resolutions.
function streamQualityLabel(video) {
  const width=Number(video?.videoWidth);
  const height=Number(video?.videoHeight);
  if (!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0) return null;
  const w=Math.round(width), h=Math.round(height);
  const is4K=h>=2100 && h<=2350 && w>=3200 && w<=4400; // Conservative UHD/DCI 4K, not 8K, 5K or portrait.
  const badge=is4K?'4K':h+'p';
  return { badge, resolution:w+'×'+h+(is4K?' (4K)':'') };
}
function refreshStreamQualityButton(){
  const qualityButton=toolbar?.querySelector('[data-tool="quality"]');
  if(!qualityButton)return;
  const info=currentVideoId()&&!adShowing()?streamQualityLabel(getVideo()):null;
  const badge=info?.badge||'HD';
  if(qualityButton.textContent!==badge)qualityButton.textContent=badge;
  const title=info
    ? 'Playing '+info.resolution+'. Open YouTube quality choices.'
    : 'Stream resolution not available yet. Open YouTube quality choices.';
  qualityButton.title=title;
  qualityButton.setAttribute('aria-label',title);
  qualityButton.classList.toggle('tubeium-quality-4k',badge==='4K');
}
// Local-only, observational player diagnostics. Never reads cookies or
// attempts to change the active stream. FPS is estimated from decoded frames.
function computePlaybackDiagnostics(video, previous, nowMs) {
  if(!video)return null;
  const width=Number(video.videoWidth)||0,height=Number(video.videoHeight)||0;
  const position=Number(video.currentTime)||0,paused=!!video.paused;
  let buffered=0;
  try{
    const ranges=video.buffered;
    for(let i=0;i<ranges.length;i++){
      if(ranges.start(i)<=position&&ranges.end(i)>=position){
        buffered=Math.max(0,ranges.end(i)-position);break;
      }
    }
  }catch{}
  let total=null,dropped=null,fps=null;
  try{
    const q=video.getVideoPlaybackQuality?.();
    if(q&&Number.isFinite(q.totalVideoFrames)&&Number.isFinite(q.droppedVideoFrames)){
      total=Math.max(0,Math.round(q.totalVideoFrames));
      dropped=Math.max(0,Math.min(total,Math.round(q.droppedVideoFrames)));
      const seconds=previous?.video===video?(nowMs-previous.at)/1000:0;
      if(!paused&&seconds>=0.5&&seconds<=10&&previous.frames!==null&&total>=previous.frames)
        fps=Math.round((total-previous.frames)/seconds*10)/10;
    }
  }catch{}
  const droppedPercent=total>0?Math.round(dropped/total*1000)/10:null;
  return {width,height,position,paused,readyState:Number(video.readyState)||0,
    bufferedSeconds:Math.round(buffered*10)/10,
    totalFrames:total,droppedFrames:dropped,droppedPercent,
    renderedFps:fps,sample:{video,frames:total,at:nowMs}};
}
let diagnosticsPanel=null,diagnosticsPrevious=null,diagnosticsText='';
function refreshPlaybackDiagnostics(){
  if(!diagnosticsPanel||diagnosticsPanel.hidden)return;
  const content=diagnosticsPanel.querySelector('[data-diagnostics-content]');
  const video=currentVideoId()&&!adShowing()?getVideo():null;
  const stats=computePlaybackDiagnostics(video,diagnosticsPrevious,Date.now());
  diagnosticsPrevious=stats?.sample||null;
  const rows=[];
  if(!stats)rows.push(['Status','Open a regular YouTube video to see playback statistics']);
  else{
    const quality=streamQualityLabel(video);
    rows.push(['Current resolution',quality?.resolution||'Not reported yet']);
    rows.push(['Preferred quality',state.preferredQuality==='hd2160'?'Up to 4K':String(state.preferredQuality||'Automatic')]);
    rows.push(['Rendered FPS (estimated)',stats.renderedFps===null?'Unavailable':stats.renderedFps.toFixed(1)]);
    rows.push(['Dropped frames',stats.droppedFrames===null?'Unavailable':stats.droppedFrames+' / '+stats.totalFrames+' ('+stats.droppedPercent.toFixed(1)+'%)']);
    rows.push(['Buffered ahead',stats.bufferedSeconds.toFixed(1)+' seconds']);
    rows.push(['Playback state',stats.paused?'Paused':stats.readyState<2?'Loading / waiting':'Playing']);
    let note='YouTube chooses the stream; 4K depends on the uploaded video, codec support and connection.';
    if(stats.droppedPercent!==null&&stats.droppedPercent>=5)
      note='Frame drops observed. Rendering or decoding performance may contribute.';
    else if(!stats.paused&&stats.bufferedSeconds<3)
      note='Low buffered media. Connection or streaming performance may contribute.';
    rows.push(['Interpretation',note]);
  }
  content.replaceChildren();
  for(const [label,value] of rows){
    const row=document.createElement('div');row.className='uyp-diag-row';
    const key=document.createElement('span');key.className='uyp-diag-label';key.textContent=label;
    const val=document.createElement('span');val.className='uyp-diag-value';val.textContent=value;
    row.append(key,val);content.append(row);
  }
  diagnosticsText='Tubeium playback diagnostics\n'+rows.map(([a,b])=>a+': '+b).join('\n')+'\nNo account information included.';
}
function togglePlaybackDiagnostics(){
  if(!diagnosticsPanel)return;
  diagnosticsPanel.hidden=!diagnosticsPanel.hidden;
  diagnosticsPrevious=null;
  if(!diagnosticsPanel.hidden){
    refreshPlaybackDiagnostics();
    diagnosticsPanel.querySelector('[data-diag-close]')?.focus();
  }
}
function initPlaybackDiagnostics(){
  if(diagnosticsPanel)return;
  const panel=document.createElement('section');panel.id='uyp-playback-diagnostics';
  panel.hidden=true;panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Tubeium playback diagnostics');
  panel.setAttribute('aria-modal','false');
  const header=document.createElement('header');
  const title=document.createElement('strong');title.textContent='Playback diagnostics';
  const close=document.createElement('button');close.type='button';close.textContent='×';
  close.dataset.diagClose='';close.title='Close diagnostics';
  close.setAttribute('aria-label','Close playback diagnostics');
  close.addEventListener('click',togglePlaybackDiagnostics);
  header.append(title,close);
  const content=document.createElement('div');content.dataset.diagnosticsContent='';
  const footer=document.createElement('footer');
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copy diagnostics';
  copy.addEventListener('click',async()=>{
    refreshPlaybackDiagnostics();
    try{await ipcRenderer.invoke('copy-video-text',diagnosticsText);toast('Playback diagnostics copied');}
    catch{toast('Copy unavailable');}
  });
  footer.append(copy);panel.append(header,content,footer);
  document.body.append(panel);diagnosticsPanel=panel;
  setInterval(refreshPlaybackDiagnostics,1800);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&diagnosticsPanel&&!diagnosticsPanel.hidden){
      event.preventDefault();togglePlaybackDiagnostics();
    }
  });
  ipcRenderer.on('tubeium-toggle-diagnostics',togglePlaybackDiagnostics);
}
// YouTube's supported quality API is deprecated; open the actual UI instead.
function openNativeQualityMenu(){
  const gear=document.querySelector('.ytp-settings-button');
  if(!gear){toast('Quality menu is unavailable on this video');return;}
  const menu=document.querySelector('.ytp-settings-menu');
  if(!menu || !menu.offsetParent)gear.click();
  const entries=[...document.querySelectorAll('.ytp-settings-menu .ytp-menuitem')];
  const quality=entries.find(el=>/quality|resolution|calidad|qualit[eé]|qualität|جودة/i.test(el.textContent||''));
  if(quality){quality.click();toast('Choose an available resolution in YouTube’s menu',2500);}
  else toast('Open the Quality item in YouTube settings',2800);
}
function initToolbar() {
  toolbar = document.createElement('div');toolbar.id='uyp-toolbox';
  const entries=[['mute','Mute / unmute','♪'],['speed','Change speed','1×'],['pip','Picture in Picture','▣'],['link','Copy video link','↗'],['title','Copy title','T'],['full','Fullscreen','⛶'],['theater','Theater mode','◫'],['quality','Open YouTube quality selector','HD'],['diagnostics','Show playback diagnostics','Stats'],['bookmark','Bookmark or unbookmark video','★'],['library','Open local video library','▣'],['screenshot','Save screenshot','▤'],['seekBack','Seek backward','−10'],['seekForward','Seek forward','+10']];
  for (const [id,label,symbol] of entries){
    const b=document.createElement('button');b.type='button';b.dataset.tool=id;b.textContent=symbol;b.title=label;b.setAttribute('aria-label',label);
    b.addEventListener('click',async()=>{
      const v=getVideo();if(!v && !['library','diagnostics'].includes(id)) return;
      try{
        if(id==='mute') {v.muted=!v.muted;toast(v.muted?'Muted':'Unmuted');}
        else if(id==='speed') {const speeds=[0.5,0.75,1,1.25,1.5,1.75,2,2.5,3,4];const next=speeds.find(x=>x>v.playbackRate+0.01);v.playbackRate=next||speeds[0];toast('Speed '+v.playbackRate+'×');}
        else if(id==='pip') {if(document.pictureInPictureElement) await document.exitPictureInPicture();else if(document.pictureInPictureEnabled && v.requestPictureInPicture) await v.requestPictureInPicture();else toast('PiP is unavailable on this video');}
        else if(id==='link'||id==='title') {const value=id==='link'?`https://www.youtube.com/watch?v=${currentVideoId()}`:(document.querySelector('ytd-watch-metadata h1')?.textContent||document.title.replace(/ - YouTube$/,'')).trim(); await ipcRenderer.invoke('copy-video-text',value);toast(id==='link'?'Link copied':'Title copied');}
        else if(id==='full') document.querySelector('.ytp-fullscreen-button')?.click();
        else if(id==='theater') document.querySelector('.ytp-size-button')?.click();
        else if(id==='quality') openNativeQualityMenu();
        else if(id==='diagnostics') togglePlaybackDiagnostics();
        else if(id==='library') ipcRenderer.send('open-local-library');
        else if(id==='bookmark'){const result=await ipcRenderer.invoke('library-bookmark',makeVideoRecord());toast(result?(result.bookmarked?'Video bookmarked':'Bookmark removed'):'Local library disabled');}
        else if(id==='screenshot'){const done=await ipcRenderer.invoke('player-screenshot');toast(done?'Screenshot saved':'Screenshot canceled');}
        else if(id==='seekBack'||id==='seekForward'){const delta=(id==='seekBack'?-1:1)*Number(state.seekSeconds||10);v.currentTime=Math.max(0,Math.min(Number.isFinite(v.duration)?v.duration:Infinity,v.currentTime+delta));toast((delta>0?'+':'')+delta+' seconds');}
      }catch(e){toast('Not available: '+String(e.message||e).slice(0,90));}
    }); toolbar.appendChild(b);
  }
  document.body.appendChild(toolbar);
  updateTools();
  refreshStreamQualityButton();
  // Periodic updates also handle YouTube SPA navigation and adaptive quality
  // changes without writing to or overriding the YouTube video player.
  setInterval(refreshStreamQualityButton,1500);
}
function initCastConfirmation(){
  document.addEventListener('click',e=>{
    if(!state.confirmCast)return;
    const cast=e.target.closest('.ytp-cast-button,.ytp-remote-button,[aria-label="Cast"]');
    if(!cast)return;
    if(!window.confirm('Connect Tubeium to a casting device?')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
}
function initGestures(){
  document.addEventListener('wheel',e=>{
    if(!e.target.closest('.html5-video-player')) return;
    const v=getVideo();if(!v || adShowing())return;
    if(state.wheelVolume && e.ctrlKey && !e.shiftKey){
      e.preventDefault();e.stopImmediatePropagation();v.volume=Math.max(0,Math.min(1,v.volume+(e.deltaY<0?1:-1)*state.wheelVolumeStep/100));
      if(v.muted && v.volume>0)v.muted=false;toast('Volume '+Math.round(v.volume*100)+'%');
    }else if(state.wheelSeek && e.shiftKey && !e.ctrlKey){
      e.preventDefault();e.stopImmediatePropagation();v.currentTime=Math.max(0,Math.min(Number.isFinite(v.duration)?v.duration:Infinity,v.currentTime+(e.deltaY<0?1:-1)*Number(state.seekSeconds||10)));toast('Seek '+Math.round(v.currentTime)+'s');
    }
  },{passive:false,capture:true});
  document.addEventListener('auxclick',e=>{
    if(e.button!==1 || !state.middleClickPause || !e.target.closest('.html5-video-player'))return;
    e.preventDefault();e.stopImmediatePropagation();const v=getVideo();if(v){if(v.paused)v.play().catch(()=>{});else v.pause();}
  },true);
  document.addEventListener('dblclick',e=>{
    if(!e.target.closest('.html5-video-player'))return;
    if(state.disableDoubleTapSkip && !e.altKey){e.preventDefault();e.stopImmediatePropagation();return;}
    if(!state.doubleClickSeek || !e.altKey)return;
    const v=getVideo();if(!v)return;e.preventDefault();e.stopImmediatePropagation();
    const rect=getPlayer().getBoundingClientRect();const delta=e.clientX<rect.left+rect.width/2?-Number(state.seekSeconds||10):Number(state.seekSeconds||10);
    v.currentTime=Math.max(0,Math.min(Number.isFinite(v.duration)?v.duration:Infinity,v.currentTime+delta));toast((delta>0?'+':'')+delta+' seconds');
  },true);
}
// Seekable progress in Shorts. Duration may not be available for live/streaming media.
let shortsSeekUI=null,shortsTracked=null;
function initShortsSeek(){
  const bar=document.createElement('div');bar.id='uyp-shorts-seek';bar.hidden=true;
  const title=document.createElement('span');title.textContent='Shorts';
  const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1000';slider.step='1';slider.value='0';slider.setAttribute('aria-label','Seek within Short');
  const time=document.createElement('output');time.textContent='0:00 / 0:00';
  slider.addEventListener('input',()=>{const v=getVideo();if(v&&Number.isFinite(v.duration)&&v.duration>0){v.currentTime=Number(slider.value)/1000*v.duration;}});
  bar.append(title,slider,time);document.body.appendChild(bar);shortsSeekUI={bar,slider,time};
  const fmt=secs=>{secs=Math.max(0,Math.floor(secs));return Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');};
  setInterval(()=>{
    const visible=!!state.shortsSeekBar && location.pathname.startsWith('/shorts/') && !state.hideShorts;
    const v=visible?getVideo():null;
    bar.hidden=!v||!Number.isFinite(v.duration)||v.duration<=0;
    if(bar.hidden){shortsTracked=null;return;}
    if(shortsTracked!==currentVideoId()){shortsTracked=currentVideoId();if(state.shortsPauseOnOpen)v.pause();}
    if(document.activeElement!==slider)slider.value=String(Math.round(1000*v.currentTime/v.duration));
    time.textContent=fmt(v.currentTime)+' / '+fmt(v.duration);
  },350);
}
let quickNav=null;
function updateQuickNav(){
  if(!quickNav)return;
  quickNav.hidden=!state.quickNavEnabled||!!state.mini;
  quickNav.dataset.position=state.quickNavPosition==='right'?'right':'left';
  const entries={home:['Home','/'],subscriptions:['Subscriptions','/feed/subscriptions'],history:['History','/feed/history'],shorts:['Shorts','/shorts']};
  const orders={ 'home-first':['home','subscriptions','history','shorts'], 'subs-first':['subscriptions','home','shorts','history'], 'history-first':['history','subscriptions','home','shorts'], 'shorts-first':['shorts','home','subscriptions','history']};
  const order=orders[state.quickNavOrder]||orders['home-first'];quickNav.replaceChildren();
  for(const key of order){
    if(key==='shorts' && (state.hideShorts||!state.quickNavShowShorts))continue;
    if(key==='history'&&!state.quickNavShowHistory)continue;
    const a=document.createElement('a');a.textContent=entries[key][0];a.href='https://www.youtube.com'+entries[key][1];quickNav.append(a);
  }
}
function initQuickNav(){quickNav=document.createElement('nav');quickNav.id='uyp-quick-nav';quickNav.setAttribute('aria-label','Tubeium quick navigation');document.body.appendChild(quickNav);updateQuickNav();}
let dislikeBadge=null, dislikeFor=null, dislikeLoading=false;
function updateDislikeIndicator(){
  if(!dislikeBadge)return;
  dislikeBadge.hidden=!state.showDislikes||!currentVideoId();
}
function initDislikeIndicator(){
  dislikeBadge=document.createElement('div');dislikeBadge.id='uyp-dislikes';dislikeBadge.title='Estimated dislikes · Return YouTube Dislike · returnyoutubedislike.com';
  document.body.appendChild(dislikeBadge);
  setInterval(async()=>{
    if(!state.showDislikes||!currentVideoId()){dislikeFor=null;updateDislikeIndicator();return;}
    const id=currentVideoId();
    if(id===dislikeFor || dislikeLoading)return;
    dislikeFor=id;dislikeLoading=true;dislikeBadge.textContent='Dislikes: …';updateDislikeIndicator();
    const votes=await ipcRenderer.invoke('ryd-votes',id).catch(()=>null);
    if(dislikeFor===id){dislikeBadge.textContent=votes ? '👎 '+Intl.NumberFormat().format(votes.dislikes)+' estimated' : 'Dislikes unavailable';}
    dislikeLoading=false;
  },1200);
}
function initHoverPreviewControl(){
  setInterval(()=>{
    if(!state.disableAutoplayPreviews)return;
    document.querySelectorAll('ytd-moving-thumbnail-renderer video, ytd-rich-grid-media #hover-overlays video').forEach(v=>{if(v!==getVideo()&&!v.paused)v.pause();});
  },1400);
}

// Privacy-respecting local viewing library. Watch positions are saved only in Tubeium's appData.
function makeVideoRecord(){
 const v=getVideo();return {id:currentVideoId(),title:(document.querySelector('ytd-watch-metadata h1')?.textContent||document.title.replace(/ - YouTube$/,'')).trim().slice(0,220),channel:(document.querySelector('ytd-watch-metadata ytd-channel-name a')?.textContent||'').trim().slice(0,100),position:v?.currentTime||0,duration:Number.isFinite(v?.duration)?v.duration:0};
}
function initLocalLibrary(){
 let lastId=null,lastPersist=0,lastResumeCheck=null;
 setInterval(async()=>{
   if(!state.localLibraryEnabled||adShowing()||location.pathname.startsWith('/shorts/'))return;
   const v=getVideo(),id=currentVideoId();if(!v||!id||!Number.isFinite(v.duration)||v.duration<30)return;
   if(id!==lastId){lastId=id;lastPersist=0;lastResumeCheck=null;}
   if(state.resumeWatchedVideos&&lastResumeCheck!==id&&v.readyState>0){
     lastResumeCheck=id;
     try{const previous=await ipcRenderer.invoke('library-position',id);
       if(currentVideoId()===id&&previous&&previous.position>15&&previous.position<v.duration-25&&v.currentTime<5){
         const resume=window.confirm('Resume this video at '+Math.floor(previous.position/60)+'m '+Math.floor(previous.position%60)+'s?');
         if(resume&&currentVideoId()===id&&v.currentTime<8){v.currentTime=previous.position;toast('Resumed from your local library');}
       }
     }catch{}
   }
   if(state.recordWatchProgress&&!v.paused&&v.currentTime>2&&Date.now()-lastPersist>20000){lastPersist=Date.now();ipcRenderer.invoke('library-record',makeVideoRecord()).catch(()=>{});}
 },1800);
}
// Community-based clickbait reduction. Capped lookups; never modify original YouTube data.
function initDeArrow(){
 const resolved=new Map();let lastRun=0;
 setInterval(async()=>{
  if(!state.dearrowTitles){for(const el of document.querySelectorAll('[data-tubeium-original-title]')){el.textContent=el.dataset.tubeiumOriginalTitle;delete el.dataset.tubeiumOriginalTitle;delete el.dataset.tubeiumDeArrowId;el.removeAttribute('title');}return;}
  if(Date.now()-lastRun<4500)return;lastRun=Date.now();
  const links=[...document.querySelectorAll('a#video-title[href],a#video-title-link[href]')].slice(0,20);
  let requested=0;
  for(const link of links){
   let id;try{id=new URL(link.href).searchParams.get('v');}catch{}if(!id||!/^[\w-]{11}$/.test(id))continue;
   if(link.dataset.tubeiumDeArrowId===id)continue;
   if(!resolved.has(id)&&requested>=5)continue;
   if(!resolved.has(id)){
     requested++;
     const replacement=await ipcRenderer.invoke('dearrow-title',id).catch(()=>null);
     resolved.set(id,replacement||'');
     if(resolved.size>200)resolved.delete(resolved.keys().next().value);
   }
   if(!state.dearrowTitles||!link.isConnected)continue;
   const title=resolved.get(id);
   if(title){
     if(!link.hasAttribute('data-tubeium-original-title'))link.dataset.tubeiumOriginalTitle=link.textContent||'';
     link.textContent=title;link.title='DeArrow community title (original: '+link.dataset.tubeiumOriginalTitle+')';
   }
   link.dataset.tubeiumDeArrowId=id;
  }
 },1500);
}
// Optional Windows controller controls. A=play/pause, LB/RB=seek,
// D-pad up/down=volume; press-edge detection prevents repeated actions.
let tubeiumGamepadPrevious=[];
function initTubeiumGamepad(){
 setInterval(()=>{
  if(!state.gamepadEnabled || document.hidden || !document.hasFocus() || typeof navigator.getGamepads!=='function'){
    tubeiumGamepadPrevious=[];return;
  }
  const pad=[...(navigator.getGamepads()||[])].find(p=>p&&p.connected);
  if(!pad){tubeiumGamepadPrevious=[];return;}
  const current=pad.buttons.map(b=>!!b?.pressed);
  const textField=document.activeElement?.closest?.('input,textarea,select,[contenteditable="true"]');
  if(!textField){
    const v=document.querySelector('video');
    if(v){
      const action=index=>current[index]&&!tubeiumGamepadPrevious[index];
      const delta=Number(state.gamepadSeekSeconds)||10;
      if(action(Number(state.gamepadPlayButton??0))) {if(v.paused)v.play().catch(()=>{});else v.pause();}
      if(action(Number(state.gamepadSeekBackward??4)))v.currentTime=Math.max(0,v.currentTime-delta);
      if(action(Number(state.gamepadSeekForward??5)))v.currentTime=Math.min(Number.isFinite(v.duration)?v.duration:1e9,v.currentTime+delta);
      if(action(12))v.volume=Math.min(1,v.volume+.05);
      if(action(13))v.volume=Math.max(0,v.volume-.05);
    }
  }
  tubeiumGamepadPrevious=current;
 },160);
}

// Smart profiles adjust only the current watch page; saved settings are never overwritten.
const TUBEIUM_PROFILES={
  cinema:{autoTheater:true,hideComments:true,hideRelated:true,dimPageBackground:true},
  music:{hideShorts:true,hideComments:true,autoTheater:false},
  study:{hideComments:true,hideRelated:true,hideEndScreens:true,hideCards:true,autoCaptions:true},
  gaming:{autoTheater:true,hideComments:true,hideLiveChat:false},
  focus:{hideComments:true,hideRelated:true,hideSidebar:true,hideShorts:true,hideEndScreens:true}
};
function profileFromPage(){
 const mode=persistedState.smartProfileMode||'off';
 if(Object.prototype.hasOwnProperty.call(TUBEIUM_PROFILES,mode))return mode;
 if(mode!=='auto'||!currentVideoId())return null;
 const title=(document.querySelector('h1.ytd-watch-metadata')?.textContent||document.title||'').toLowerCase();
 if(/\b(study|lecture|tutorial|lesson|course|explained|exam|class)\b/.test(title))return 'study';
 if(/\b(music|official audio|lyrics|album|instrumental|soundtrack|ost)\b/.test(title))return 'music';
 if(/\b(gameplay|walkthrough|speedrun|gaming|boss fight)\b/.test(title))return 'gaming';
 if(/\b(movie|cinematic|trailer|documentary|film)\b/.test(title))return 'cinema';
 return null;
}
function refreshSmartProfile(){
 const next=profileFromPage();if(next===activeViewingProfile)return;
 activeViewingProfile=next;
 state={...persistedState,...(next?TUBEIUM_PROFILES[next]:{})};
 applyState();
}
// Optional audio effects; not activated at all until user selects a non-Off preset.
const TUBEIUM_EQ={balanced:[0,0,0],bass:[5,1,-1],voice:[-3,3,2],cinema:[3,0,2],music:[2,0,2]};
const eqGraphs=new WeakMap();
function initTubeiumAudioEQ(){
 setInterval(()=>{
  const choice=state.audioPreset||'off';
  const v=getVideo();if(!v||adShowing()||!choice)return;
  const existing=eqGraphs.get(v);
  if(choice==='off'&&!existing)return;
  if(!existing){
   try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)return;
    // MediaElementAudioSource can fail for protected streams; this experimental control is off by default.
    const context=new AudioCtx();
    const source=context.createMediaElementSource(v);
    const nodes=[120,1000,8000].map((frequency,index)=>{
      const f=context.createBiquadFilter();f.type=index===0?'lowshelf':index===2?'highshelf':'peaking';f.frequency.value=frequency;if(index===1)f.Q.value=0.8;return f;
    });
    source.connect(nodes[0]);nodes[0].connect(nodes[1]);nodes[1].connect(nodes[2]);nodes[2].connect(context.destination);
    eqGraphs.set(v,{context,nodes});
   }catch{return;}
  }
  const graph=eqGraphs.get(v);if(!graph)return;
  const bands=TUBEIUM_EQ[choice]||[0,0,0];const intensity=Math.max(0,Math.min(100,Number(state.audioIntensity)||0))/100;
  graph.nodes.forEach((node,index)=>{node.gain.value=bands[index]*intensity;});
  if(!v.paused && graph.context.state==='suspended')graph.context.resume().catch(()=>{});
 },1500);
}


// Fast action palette; never handles credentials, scripts, or arbitrary URLs.
function initTubeiumCommandPalette(){
 const commands=[
  ['Settings','settings'],['Local Library','library'],['Download Studio','downloads'],
  ['Mini Player','mini'],['Screenshot','screenshot'],['Home','home'],['Subscriptions','subscriptions'],
  ['Watch History','history'],['Check for Updates','updates'],['System Diagnostics','diagnostics']
 ];
 let overlay=null;
 function close(){if(overlay){overlay.remove();overlay=null;}}
 function open(){
  if(overlay){close();return;}
  overlay=document.createElement('div');overlay.id='tubeium-command-palette';
  Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'rgba(0,0,0,.65)',display:'flex',justifyContent:'center',alignItems:'flex-start',paddingTop:'min(16vh,120px)'});
  const shell=document.createElement('div');Object.assign(shell.style,{width:'min(580px,92vw)',border:'1px solid #524465',borderRadius:'15px',background:'#171422',boxShadow:'0 24px 70px #000c',padding:'12px',font:'15px Segoe UI,sans-serif',color:'white'});
  const input=document.createElement('input');input.placeholder='Find a Tubeium action…';input.setAttribute('aria-label','Search Tubeium actions');
  Object.assign(input.style,{width:'100%',padding:'13px',border:'1px solid #504364',borderRadius:'9px',background:'#211b30',color:'white',font:'inherit'});
  const list=document.createElement('div');list.setAttribute('role','listbox');Object.assign(list.style,{maxHeight:'45vh',overflowY:'auto',marginTop:'8px'});
  function show(){const q=input.value.trim().toLowerCase();list.replaceChildren();for(const [name,action] of commands.filter(([name])=>name.toLowerCase().includes(q))){
   const b=document.createElement('button');b.textContent=name;b.setAttribute('role','option');Object.assign(b.style,{display:'block',width:'100%',padding:'11px 12px',border:'0',borderRadius:'8px',textAlign:'left',cursor:'pointer',background:'transparent',color:'#f7f4ff',font:'inherit'});
   b.addEventListener('mouseenter',()=>b.style.background='#3d3056');b.addEventListener('mouseleave',()=>b.style.background='transparent');
   b.onclick=()=>{close();ipcRenderer.send('tubeium-command',action);};list.appendChild(b);
  }}
  input.oninput=show;input.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Enter'){e.preventDefault();list.querySelector('button')?.click();}};
  overlay.onclick=e=>{if(e.target===overlay)close();};shell.append(input,list);overlay.append(shell);document.body.append(overlay);show();input.focus();
 }
 document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}
  if(e.key==='Escape'&&overlay)close();
 },true);
}

// ---- Boot ----
window.addEventListener('DOMContentLoaded', async () => {
  injectStyle();
  // Let YouTube handle its menu normally; temporarily suspend Tubeium's
  // hide-sidebar CSS when the user explicitly presses YouTube's hamburger.
  document.addEventListener('click', event => handleGuideButtonClick(event, document.documentElement), true);
  try { persistedState = { ...state, ...(await ipcRenderer.invoke('get-state')) }; state={...persistedState}; } catch { /* use defaults */ }
  try { playbackMemory = { ...playbackMemory, ...(await ipcRenderer.invoke('get-player-memory')) }; } catch {}
  applyState();
  initDownloadButton();
  initSettingsButton();
  initSpeedKeys();
  initPlayback();
  initAdBlock();
  initSponsorBlock();
  initToolbar();
  initPlaybackDiagnostics();
  initQuickNav();
  initShortsSeek();
  initGestures();
  initCastConfirmation();
  initDislikeIndicator();
  initHoverPreviewControl();
  initLocalLibrary();
  initDeArrow();
  initTubeiumGamepad();
  initTubeiumAudioEQ();
  initTubeiumCommandPalette();
  setInterval(refreshSmartProfile,1500);
  refreshSmartProfile();
  // YouTube is a single-page app and can replace DOM nodes during navigation.
  // Recreate Tubeium's quick Settings control and style if either is removed.
  function restoreTubeiumControls() {
    if (!document.body) return;
    injectStyle();
    initSettingsButton();
  }
  document.addEventListener('yt-navigate-finish',()=>{
    activeViewingProfile='refresh';
    refreshSmartProfile();
    restoreTubeiumControls();
  });
  setInterval(restoreTubeiumControls, 2500);
  document.addEventListener('fullscreenchange', () => {
    document.documentElement.classList.toggle('uyp-fs', !!document.fullscreenElement);
  });
});

ipcRenderer.on('state', (_e, s) => {
  persistedState = { ...persistedState, ...s };
  activeViewingProfile='refresh';
  if (document.documentElement) refreshSmartProfile();
});
// Only shown for recognized sign-in failures. This does not run on Google pages.
function showSignInRecoveryNotice(data) {
  if (!document.body) {
    window.addEventListener('DOMContentLoaded', () => showSignInRecoveryNotice(data), {once:true});
    return;
  }
  let notice = document.getElementById('tubeium-signin-recovery');
  if (notice) notice.remove();
  notice = document.createElement('aside');
  notice.id = 'tubeium-signin-recovery';
  notice.setAttribute('role', 'alert');
  notice.setAttribute('aria-label', 'Tubeium sign-in help');
  Object.assign(notice.style, {
    position:'fixed', top:'82px', right:'20px', width:'min(380px,calc(100vw - 40px))',
    zIndex:'2147483647', borderRadius:'14px', padding:'17px', boxSizing:'border-box',
    border:'1px solid #7055a0', background:'#211b2f', color:'#fff',
    boxShadow:'0 16px 50px #0009', font:'14px/1.5 system-ui,Segoe UI,sans-serif'
  });
  const title = document.createElement('strong');
  title.textContent = 'Having trouble signing in?';
  title.style.fontSize = '16px';
  const body = document.createElement('p');
  const explanations = {
    'browser-rejected':'Google blocked sign-in in the built-in browser.',
    'network-error':'The sign-in window could not connect.',
    'import-empty':'The browser session transfer did not import any usable cookies.',
    'session-unconfirmed':'Tubeium could not verify the imported account session.'
  };
  body.textContent = explanations[data?.reason] || 'Tubeium could not complete sign-in.';
  Object.assign(body.style,{margin:'8px 0 14px',color:'#d7cbe9',fontSize:'13px'});
  const action = document.createElement('button');
  action.type = 'button';
  action.textContent = 'Sign in using your browser';
  Object.assign(action.style,{cursor:'pointer',border:'0',borderRadius:'9px',padding:'10px 13px',background:'#a078e8',color:'#fff',font:'600 13px system-ui,Segoe UI,sans-serif'});
  action.addEventListener('click', () => {
    ipcRenderer.send('tubeium-open-browser-signin'); notice.remove();
  });
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = 'Dismiss';
  Object.assign(dismiss.style,{cursor:'pointer',border:'0',padding:'10px 8px',marginLeft:'7px',background:'transparent',color:'#d7cbe9',font:'13px system-ui,Segoe UI,sans-serif'});
  dismiss.addEventListener('click', () => {
    ipcRenderer.send('tubeium-dismiss-signin-notice'); notice.remove();
  });
  const footnote = document.createElement('div');
  footnote.textContent = 'One-time browser helper. Sign-in is not guaranteed; do not share cookies or pairing codes.';
  Object.assign(footnote.style,{fontSize:'11px',color:'#ad9ec1',marginTop:'12px'});
  notice.append(title,body,action,dismiss,footnote);
  document.body.appendChild(notice);
}
ipcRenderer.on('tubeium-signin-recovery', (_e, data) => showSignInRecoveryNotice(data));
ipcRenderer.on('tubeium-signin-recovery-clear', () => {
  document.getElementById('tubeium-signin-recovery')?.remove();
});

ipcRenderer.on('toast', (_e, text) => toast(text, 2500));
ipcRenderer.on('tubeium-open-palette',()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));});

}
