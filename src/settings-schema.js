'use strict';
// Single source of truth for settings metadata, validation, and defaults.
const groups = [
  { id: 'general', title: 'General', icon: '⌂', subtitle: 'Startup, window behaviour and quick access', settings: [
    ['closeToTray', 'Close to tray', 'Keep audio playing when the window is closed.', 'toggle', true],
    ['startMinimized', 'Start minimized', 'Open Tubeium in the system tray.', 'toggle', false],
    ['launchAtLogin', 'Launch at login', 'Start a packaged app with Windows/macOS; may require OS approval.', 'toggle', false],
    ['showSettingsButton', 'Show Tubeium launcher', 'Show one compact Tubeium menu for Settings, Downloads and Help. Ctrl+, always opens Settings.', 'toggle', true],
    ['rememberWindow', 'Restore window size', 'Remember position and size between sessions.', 'toggle', true],
    ['startPage', 'Startup page', 'Page shown when launching Tubeium.', 'select', 'home', { options: [['home','YouTube Home'], ['subscriptions','Subscriptions'], ['history','History'], ['explore','Explore']] }],
    ['miniWidth', 'Mini player width', 'Width of the floating video window, in pixels.', 'range', 480, { min: 320, max: 720, step: 20, unit: 'px' }],
    ['autoPauseOnHide', 'Pause when hidden', 'Pause playback when you minimize or hide Tubeium.', 'toggle', false],
  ]},
  { id: 'appearance', title: 'Appearance', icon: '◐', subtitle: 'Personalize the theme and visual details', settings: [
    ['settingsTheme', 'Settings theme', 'Light, dark or match your operating system.', 'select', 'dark', { options: [['dark','Dark'], ['light','Light'], ['system','Follow system']] }],
    ['accentColor', 'Accent color', 'Used for the dashboard, download button and quick settings.', 'color', '#aa7dff'],
    ['pageTheme', 'YouTube page theme', 'Override page surfaces in YouTube. Native respects its own theme.', 'select', 'native', { options: [['native','YouTube default'], ['dark','Dark'], ['light','Light'], ['oled','AMOLED black']] }],
    ['dashboardFontSize', 'Settings font size', 'Make text throughout the settings dashboard larger or smaller. Default: 125%.', 'range', 125, { min: 100, max: 170, step: 5, unit: '%' }],
    ['youtubeFontSize', 'YouTube text size', 'Increase video titles, descriptions, metadata and navigation text without scaling the video itself.', 'range', 110, { min: 100, max: 160, step: 5, unit: '%' }],
    ['pageZoom', 'Page scale', 'Scale YouTube content without changing your screen resolution.', 'range', 100, { min: 70, max: 150, step: 5, unit: '%' }],
    ['compactDensity', 'Compact spacing', 'Reduce excessive spacing between feed items.', 'toggle', false],
    ['roundedThumbnails', 'Rounded thumbnails', 'Round thumbnail and video card corners.', 'toggle', true],
    ['hideScrollbars', 'Hide scrollbars', 'Keep scrolling functional, but hide visual scrollbar tracks.', 'toggle', false],
    ['reduceAnimations', 'Reduce animations', 'Disable most transitions and motion in YouTube.', 'toggle', false],
  ]},
  { id: 'layout', title: 'Layout & Focus', icon: '▦', subtitle: 'Choose what appears across YouTube', settings: [
    ['hideShorts', 'Hide Shorts', 'Hide Shorts shelves, links and suggested videos.', 'toggle', true],
    ['hideSidebar', 'Hide navigation sidebar', 'Hide YouTube’s left navigation rail.', 'toggle', false],
    ['compactSidebar', 'Compact sidebar', 'Narrow the expanded sidebar when supported.', 'toggle', false],
    ['hideComments', 'Hide comments', 'Remove comments on watch pages.', 'toggle', false],
    ['hideRelated', 'Hide suggested videos', 'Hide the watch page recommendations sidebar.', 'toggle', false],
    ['hideLiveChat', 'Hide live chat', 'Hide the chat panel on streams and premieres.', 'toggle', false],
    ['hideHomeFeed', 'Hide homepage feed', 'Give YouTube Home a distraction-free look.', 'toggle', false],
    ['hideMerch', 'Hide merchandise / fundraising', 'Hide storefront shelves and crowdfunding panels.', 'toggle', false],
    ['hideMixes', 'Hide mixes', 'Remove algorithmic mix shelves and cards.', 'toggle', false],
    ['hideEndScreens', 'Hide end screens', 'Remove end-of-video thumbnail overlays.', 'toggle', false],
    ['hideCards', 'Hide video cards', 'Hide in-video information cards and their teasers.', 'toggle', false],
    ['gridColumns', 'Feed grid columns', 'Choose how many cards display per row. Auto follows YouTube.', 'select', 'auto', { options: [['auto','Automatic'], ['3','3 columns'], ['4','4 columns'], ['5','5 columns'], ['6','6 columns']] }],
  ]},
  { id: 'playback', title: 'Playback', icon: '▶', subtitle: 'Video, volume, theater mode and speed', settings: [
    ['defaultSpeed', 'Default playback speed', 'Applied on new videos unless Remember speed is enabled.', 'select', '1', { options: [['0.5','0.5×'], ['0.75','0.75×'], ['1','1×'], ['1.25','1.25×'], ['1.5','1.5×'], ['1.75','1.75×'], ['2','2×']] }],
    ['rememberSpeed', 'Remember playback speed', 'Reuse the last speed across videos and sessions.', 'toggle', false],
    ['speedStep', 'Speed shortcut increment', 'Change in playback rate per shortcut press.', 'select', '0.25', { options: [['0.1','0.1×'], ['0.25','0.25×'], ['0.5','0.5×'], ['1','1×']] }],
    ['defaultVolume', 'Default volume', 'Starting volume for a new video when not remembering volume.', 'range', 100, { min: 0, max: 100, step: 5, unit: '%' }],
    ['rememberVolume', 'Remember volume', 'Restore your last volume between videos and sessions.', 'toggle', true],
    ['loopVideo', 'Automatically loop videos', 'Repeat videos when playback reaches the end.', 'toggle', false],
    ['autoTheater', 'Automatically use theater mode', 'Expand the video player when entering a watch page.', 'toggle', false],
    ['autoplayNext', 'Autoplay next video', 'Control YouTube’s automatic next-video toggle where available.', 'toggle', true],
    ['autoCaptions', 'Enable captions', 'Turn on subtitles when available on a new video.', 'toggle', false],
    ['preferredQuality', 'Preferred video quality', 'Up to 4K when the video, codecs and network allow it. YouTube may ignore this preference; use the player Quality menu to select a resolution.', 'select', 'auto', { options: [['auto','Automatic'],['hd2160','Up to 4K (2160p when available)'],['hd1440','1440p'],['hd1080','1080p'],['hd720','720p'],['large','480p'],['medium','360p']] }],
  ]},
  { id: 'blocking', title: 'Ads & SponsorBlock', icon: '◈', subtitle: 'Choose what to block or skip', settings: [
    ['blockAds', 'Skip YouTube ads (best effort)', 'Enabled by default. Attempts to hide known ad placements and skip ads when possible. YouTube changes may bypass it; disable if playback misbehaves.', 'toggle', true],
    ['adSkipToast', 'Ad skip notification', 'Show a small notification when an ad was skipped.', 'toggle', true],
    ['sponsorBlock', 'Enable SponsorBlock', 'Retrieve community-submitted timestamps to skip segments.', 'toggle', true],
    ['sbCategories', 'SponsorBlock categories', 'Choose exactly which types of segments to skip.', 'multiselect', ['sponsor','selfpromo','interaction'], { options: [['sponsor','Sponsor'], ['selfpromo','Unpaid self-promotion'], ['interaction','Like / subscribe reminders'], ['intro','Intro / intermission'], ['outro','Endcards / credits'], ['preview','Preview / recap'], ['filler','Filler / tangents']] }],
    ['sponsorToast', 'Sponsor skip notification', 'Show a short notification after SponsorBlock skips a segment.', 'toggle', true],
  ]},
  { id: 'downloads', title: 'Downloads', icon: '↓', subtitle: 'Formats, quality, location and metadata', settings: [
    ['showDownloadButton', 'Show floating Download button', 'Show the one-click video download button in the bottom-right corner. The adjacent arrow opens extra download options.', 'toggle', true],
    ['showSigninHelpButton', 'Sign-in Help in Tubeium menu', 'Show one Sign-in Help entry in the Tubeium launcher. No extra login prompt covers the video.', 'toggle', true],
    ['videoQuality', 'Maximum video resolution', 'Select the highest video resolution to download.', 'select', '1080', { options: [['480','480p'],['720','720p'],['1080','1080p'],['1440','1440p'],['2160','2160p / 4K'],['best','Best available']] }],
    ['videoContainer', 'Video container', 'Merge audio and video into this container when FFmpeg exists.', 'select', 'mp4', { options: [['mp4','MP4'], ['mkv','MKV']] }],
    ['audioFormat', 'Audio format', 'Audio extraction or conversion requires FFmpeg except original.', 'select', 'mp3', { options: [['mp3','MP3'], ['m4a','M4A'], ['opus','Opus'], ['best','Original audio']] }],
    ['audioQuality', 'Audio conversion quality', 'FFmpeg/VBR setting: 0 is best; 9 is smallest.', 'select', '0', { options: [['0','Best (0)'], ['2','High (2)'], ['5','Balanced (5)'], ['9','Smallest (9)']] }],
    ['filenameTemplate', 'File naming', 'Choose a safe filename format for saved media.', 'select', 'title-id', { options: [['title-id','Video title [ID]'], ['title','Video title'], ['channel-title','Channel - Video title'], ['date-title','Upload date - Video title']] }],
    ['downloadBaseFolder', 'Download base folder', 'By default uses your system Downloads folder.', 'folder', ''],
    ['downloadSubfolder', 'Downloads subfolder', 'By default videos go to Downloads\\Tubeium. Older uYouPlus folders are renamed only when safe; custom folders stay untouched.', 'text', 'Tubeium', { maxLength: 40, placeholder: 'Tubeium' }],
    ['openAfterDownload', 'Show finished download', 'Reveal the saved file in your file explorer.', 'toggle', true],
    ['downloadThumbnail', 'Save thumbnail', 'Save the video thumbnail alongside the media.', 'toggle', false],
    ['downloadSubtitles', 'Save subtitles', 'Download available subtitles as separate files.', 'toggle', false],
    ['embedMetadata', 'Embed metadata', 'Add title, artist and other metadata when supported.', 'toggle', false],
  ]},
  { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: '⌘', subtitle: 'Adjust Tubeium shortcuts without editing files', settings: [
    ['enableSpeedKeys', 'Enable speed shortcuts', 'Keyboard shortcuts for playback speed.', 'toggle', true],
    ['speedUpKey', 'Increase speed', 'Press this key while watching a video.', 'hotkey', ']'],
    ['speedDownKey', 'Decrease speed', 'Press this key while watching a video.', 'hotkey', '['],
    ['speedResetKey', 'Reset speed', 'Return playback to normal speed.', 'hotkey', '\\'],
    ['enableSeekKeys', 'Enable extra seeking shortcuts', 'Enable independent custom seek shortcuts.', 'toggle', false],
    ['seekForwardKey', 'Seek forward', 'Jump ahead by the configured seek interval.', 'hotkey', 'Shift+ArrowRight'],
    ['seekBackKey', 'Seek backward', 'Jump back by the configured seek interval.', 'hotkey', 'Shift+ArrowLeft'],
    ['seekSeconds', 'Seek interval', 'Number of seconds for custom seek shortcuts.', 'select', '10', { options: [['5','5 seconds'], ['10','10 seconds'], ['15','15 seconds'], ['30','30 seconds'], ['60','60 seconds']] }],
    ['toggleLoopKey', 'Toggle loop', 'Enable or disable repeating the current video.', 'hotkey', 'Shift+L'],
    ['enableLoopKey', 'Enable loop shortcut', 'Make the loop toggle key active.', 'toggle', true],
  ]},
  { id: 'advanced', title: 'Advanced', icon: '⚙', subtitle: 'Extra styling and privacy controls', settings: [
    ['customCSS', 'Custom YouTube CSS', 'Advanced: add your own CSS rules. Incorrect CSS can hide or break YouTube elements.', 'textarea', '', { maxLength: 12000, placeholder: '/* Example: ytd-masthead { box-shadow: none !important; } */' }],
    ['showDeveloperTools', 'Show developer tools in menu', 'Enable a browser inspection shortcut in the View menu.', 'toggle', false],
  ]},
];


// uYouPlus-inspired desktop equivalents. Each setting is implemented in main.js/preload.js.
// The native iOS-specific tweak hooks (notch, Control Center, A/B flags) cannot be ported to Electron.
const appendTo = (id, options) => groups.find(g => g.id === id).settings.push(...options);
appendTo('general', [
  ['startFullscreen','Start in fullscreen','Open the main window in fullscreen mode.','toggle',false],
  ['startAlwaysOnTop','Start always on top','Keep the main Tubeium window above other windows when opened.','toggle',false],
  ['autoClearCache','Clear cache at startup','Remove temporary browser cache at startup; login cookies are preserved.','toggle',false],
  ['externalLinks','Open non-YouTube links in browser','Open external links in your default browser instead of blocking them.','toggle',true],
]);
appendTo('appearance', [
  ['thumbnailRadius','Thumbnail corner radius','Adjust how rounded the feed thumbnails appear.','range',15,{min:0,max:30,step:1,unit:'px'}],
  ['hideChannelAvatars','Hide channel avatars','Hide profile pictures on video cards and watch pages.','toggle',false],
  ['hideVerifiedBadges','Hide verification badges','Hide channel verification check marks.','toggle',false],
  ['hideVideoBadges','Hide video badges','Hide badges such as NEW and 4K in video listings.','toggle',false],
  ['dimPageBackground','Dim non-video content','Darken surrounding page content while watching; best with dark theme.','toggle',false],
  ['hideHoverPreviews','Disable thumbnail hover previews','Hide autoplay thumbnail previews on desktop.','toggle',false],
]);
appendTo('layout', [
  ['hideMasthead','Hide top navigation bar','Hide YouTube header, logo and search field.','toggle',false],
  ['hideTopicChips','Hide topic filters','Hide topic chips above the home and search feeds.','toggle',false],
  ['hideCommunityPosts','Hide community posts','Hide community and text posts in the feed.','toggle',false],
  ['hideLiveStreams','Hide livestream cards','Hide livestream suggestions in feeds where marked LIVE.','toggle',false],
  ['hideUpcoming','Hide upcoming premieres','Hide upcoming scheduled videos marked by YouTube.','toggle',false],
  ['hidePremiumUpsells','Hide Premium promotion panels','Hide visible Premium upsell panels; does not grant Premium.','toggle',true],
  ['hidePaidPromotions','Hide paid promotion labels','Hide paid-promotion badges on video playback.','toggle',false],
  ['hideJoinButton','Hide Join buttons','Hide channel membership Join buttons.','toggle',false],
  ['hideThanksButton','Hide Thanks buttons','Hide Super Thanks action buttons.','toggle',false],
  ['hideClipButton','Hide Clip buttons','Hide Clip action buttons.','toggle',false],
  ['hideShareButton','Hide Share buttons','Hide Share action buttons beneath videos.','toggle',false],
  ['hideSaveButton','Hide Save buttons','Hide Save/playlist buttons beneath videos.','toggle',false],
  ['hideDownloadNative','Hide native Download buttons','Hide YouTube’s own Download button without affecting Tubeium downloads.','toggle',false],
  ['hideChannelWatermark','Hide channel watermark','Hide channel watermarks in the video player.','toggle',false],
  ['hideRelatedSearches','Hide related search suggestions','Hide related search shelves where available.','toggle',false],
  ['hideDescription','Hide video description','Hide the description panel below videos.','toggle',false],
  ['hideVideoMetadata','Hide video statistics','Hide view count, date and metadata on video cards.','toggle',false],
  ['hideSearchSuggestions','Hide search autocomplete','Hide the autocomplete suggestion dropdown in search.','toggle',false],
  ['hidePlaylists','Hide playlist shelves','Hide playlist/radio cards in feeds.','toggle',false],
  ['hideExplore','Hide Explore navigation','Hide Explore and Trending entries from the guide.','toggle',false],
  ['hideSubscriptionsNav','Hide Subscriptions navigation','Hide subscription links from left navigation.','toggle',false],
  ['hideHistoryNav','Hide History navigation','Hide History navigation links; history remains on your account.','toggle',false],
]);
appendTo('playback', [
  ['autoFullscreen','Automatically enter fullscreen','Enter fullscreen when a new watch video starts (user gesture may be required).','toggle',false],
  ['startMuted','Start videos muted','Mute new videos on first load.','toggle',false],
  ['rememberMute','Remember mute state','Remember whether the player was last muted.','toggle',false],
  ['forceCaptionsOff','Turn captions off','Disable captions on new videos (overrides Enable captions).','toggle',false],
  ['pauseOnBlur','Pause when Tubeium loses focus','Pause when you switch away from the Tubeium window.','toggle',false],
  ['stopAfterVideo','Pause after current video','Disable autoplay-next and pause instead of proceeding to another video.','toggle',false],
  ['preservePitch','Preserve voice pitch when changing speed','Keep audio pitch stable at nonstandard playback speeds.','toggle',true],
  ['skipVideoIntro','Skip first seconds','Automatically jump ahead at video start (independent of SponsorBlock).','range',0,{min:0,max:60,step:5,unit:'s'}],
  ['showNativeControls','Use browser video controls','Enable native browser video controls instead of YouTube controls when available.','toggle',false],
  ['preferredAudioLanguage','Preferred audio language','Best-effort YouTube audio track preference; automatic uses YouTube choice.','select','auto',{options:[['auto','YouTube default'],['en','English'],['ar','Arabic'],['ja','Japanese'],['es','Spanish'],['fr','French'],['de','German']]}],
]);
appendTo('blocking', [
  ['sbAllowMute','Mute selected SponsorBlock categories','Mute instead of skip categories selected below when matched.','toggle',false],
  ['sbMutedCategories','Segments to mute instead of skip','Select the categories to mute. Must also be enabled above and in SponsorBlock categories.','multiselect',[],{options:[['sponsor','Sponsor'],['selfpromo','Self-promotion'],['interaction','Engagement prompts'],['intro','Intro'],['outro','Outro'],['preview','Preview'],['filler','Filler']]}],
  ['showDislikes','Return YouTube Dislike','Display estimated public dislike counts using Return YouTube Dislike; third-party estimates.','toggle',false],
  ['sponsorInShorts','SponsorBlock in Shorts','Attempt to skip segments inside YouTube Shorts too.','toggle',true],
]);
appendTo('downloads', [
  ['downloadThumbnailOnly','Show thumbnail-only download','Add a Save thumbnail entry to Tubeium download menu.','toggle',true],
  ['downloadSubLanguage','Subtitle languages','Comma-separated BCP47 language codes supported by yt-dlp (e.g. en,ar).','text','en,ar',{maxLength:70,placeholder:'en,ar'}],
  ['convertSubtitles','Convert subtitles to SRT','Convert supported downloaded subtitle tracks to SRT with FFmpeg.','toggle',false],
  ['embedSubtitles','Embed subtitles in video','Embed downloaded subtitles if the container supports it.','toggle',false],
  ['embedThumbnail','Embed thumbnail in audio','Embed a thumbnail into supported audio formats via FFmpeg.','toggle',false],
  ['downloadDescription','Save video description','Save video description to a text file.','toggle',false],
  ['downloadInfoJson','Save metadata JSON','Save a detailed yt-dlp metadata file beside the download.','toggle',false],
  ['downloadRateLimit','Download speed limit','0 is unlimited. Limits download to specified KiB/s.','select','0',{options:[['0','Unlimited'],['512','512 KiB/s'],['1024','1 MiB/s'],['2048','2 MiB/s'],['5120','5 MiB/s'],['10240','10 MiB/s']]}],
  ['downloadRetries','Network retries','Number of failed download retries before stopping.','select','5',{options:[['0','Never'],['3','3 retries'],['5','5 retries'],['10','10 retries'],['20','20 retries']]}],
]);
groups.splice(groups.findIndex(g=>g.id==='advanced'),0,
  {id:'shorts',title:'Shorts',icon:'▯',subtitle:'Fine-tune YouTube Shorts without disabling them entirely',settings:[
    ['shortsHideTitle','Hide Shorts titles','Hide titles and captions in the Shorts viewer.','toggle',false],
    ['shortsHideChannel','Hide Shorts channel','Hide channel name and profile in Shorts.','toggle',false],
    ['shortsHideLike','Hide Shorts Like button','Hide Shorts thumbs-up action.','toggle',false],
    ['shortsHideDislike','Hide Shorts Dislike button','Hide Shorts thumbs-down action.','toggle',false],
    ['shortsHideComments','Hide Shorts comments button','Hide the Shorts comment action.','toggle',false],
    ['shortsHideShare','Hide Shorts Share button','Hide the Shorts sharing action.','toggle',false],
    ['shortsHideRemix','Hide Shorts Remix button','Hide remix action buttons.','toggle',false],
    ['shortsHideSubscribe','Hide Shorts Subscribe button','Hide subscribe action in the Shorts viewer.','toggle',false],
    ['shortsHideAudio','Hide Shorts sound attribution','Hide the original sound attribution strip.','toggle',false],
    ['shortsHideNav','Hide Shorts navigation arrows','Hide next/previous navigation arrows.','toggle',false],
  ]},
  {id:'controls',title:'Player Controls & Gestures',icon:'◉',subtitle:'uYou-style overlay buttons, mouse gestures and keyboard controls',settings:[
    ['showOverlayToolbar','Show floating player tools','Show compact quick controls while watching a video.','toggle',true],
    ['toolMute','Toolbar: Mute','Show mute/unmute tool.','toggle',true],
    ['toolSpeed','Toolbar: Playback speed','Show speed tool.','toggle',true],
    ['toolPiP','Toolbar: Picture-in-picture','Use supported Chromium Picture-in-Picture.','toggle',true],
    ['toolCopyLink','Toolbar: Copy link','Copy current video URL to clipboard.','toggle',true],
    ['toolCopyTitle','Toolbar: Copy title','Copy current video title to clipboard.','toggle',false],
    ['toolFullscreen','Toolbar: Fullscreen','Toggle Chromium fullscreen on the player.','toggle',true],
    ['toolTheater','Toolbar: Theater','Switch YouTube theater view when available.','toggle',false],
    ['wheelVolume','Mouse wheel adjusts volume','Scroll over the video player with Ctrl held to change volume.','toggle',false],
    ['wheelVolumeStep','Mouse volume step','Percentage volume per wheel step.','range',5,{min:1,max:20,step:1,unit:'%'}],
    ['wheelSeek','Shift + wheel seeks video','Scrub forward/back while hovering the player with Shift held.','toggle',false],
    ['doubleClickSeek','Alt + double-click seeks video','Double-click left or right half while holding Alt to seek.','toggle',false],
    ['middleClickPause','Middle-click pauses video','Middle-click player to toggle play/pause.','toggle',false],
    ['hidePlayerNext','Hide Next/Previous buttons','Hide built-in next/previous player buttons.','toggle',false],
    ['hidePlayerAutoplay','Hide autoplay switch','Hide YouTube autoplay toggle in player.','toggle',false],
    ['hidePlayerCaptions','Hide captions button','Hide CC button in the player.','toggle',false],
    ['hidePlayerSettings','Hide player settings gear','Hide YouTube settings button in the player.','toggle',false],
    ['hidePlayerMiniplayer','Hide mini-player button','Hide the default YouTube mini-player toggle.','toggle',false],
    ['hidePlayerCast','Hide cast button','Hide built-in Cast button.','toggle',false],
    ['hidePlayerFullscreen','Hide fullscreen button','Hide player fullscreen button.','toggle',false],
  ]},
  {id:'privacy',title:'Privacy & Accessibility',icon:'◇',subtitle:'Viewing comfort, reduced distractions and local data controls',settings:[
    ['disableAutoplayPreviews','Disable feed auto-preview','Prevent muted hover previews from playing when possible.','toggle',false],
    ['disableDoubleTapSkip','Disable YouTube double-tap seek','Intercept player double clicks (also disables native double-click fullscreen).','toggle',false],
    ['hideVideoAnnotations','Hide annotations and paid callouts','Hide YouTube annotations and some overlay callouts.','toggle',false],
    ['hidePlayerGradient','Hide player dark gradients','Remove shadow gradients over video controls.','toggle',false],
    ['hideWatchedProgress','Hide watched progress bars','Hide red progress bars on previously watched thumbnails.','toggle',false],
    ['highContrastText','Improve video text contrast','Boost color contrast for titles and metadata on dark backgrounds.','toggle',false],
    ['hideToastMessages','Hide Tubeium notifications','Suppress in-page toast messages. Download errors still appear in the button.','toggle',false],
    ['hideSuggestedSearches','Hide trending suggestions','Hide suggested/trending searches where exposed by YouTube.','toggle',false],
  ]}
);

appendTo('downloads', [
  ['parallelDownloads','Simultaneous downloads','Limit the number of videos/playlists downloading at once.','select','1',{options:[['1','1 (recommended)'],['2','2'],['3','3']]}],
  ['maxPlaylistItems','Maximum items per playlist/channel','Safety limit per playlist or channel run. Large playlists can consume significant storage.','select','50',{options:[['10','10 videos'],['25','25 videos'],['50','50 videos'],['100','100 videos'],['250','250 videos']]}],
]);
appendTo('controls', [
  ['toolQuality','Toolbar: Current video quality','Display the currently playing resolution (4K when verified) and open YouTube’s native Quality menu.','toggle',true],
  ['toolDownloads','Show manager in download menu','Adds an optional Download Manager entry inside the right-hand Download options menu. The main video button never opens the manager.','toggle',true],
  ['toolSeekButtons','Toolbar: Seek back/forward','Replace navigation buttons with customizable time-skip controls on the floating toolbar.','toggle',false],
  ['confirmCast','Confirm before casting','Ask for confirmation before using YouTube Cast controls (where detectable).','toggle',false],
]);
appendTo('shorts', [
  ['shortsSeekBar','Seekable Shorts progress bar','Show a slider for seeking inside the currently playing Short.','toggle',true],
  ['shortsPauseOnOpen','Pause Shorts by default','Pause new Shorts when you open them, until you press Play.','toggle',false],
]);
appendTo('layout', [
  ['quickNavEnabled','Custom quick navigation dock','Show a customizable link dock for Home, Subscriptions, History and Shorts.','toggle',false],
  ['quickNavPosition','Quick navigation location','Choose the side of the screen for the custom navigation dock.','select','left',{options:[['left','Top left'],['right','Top right']]}],
  ['quickNavOrder','Quick navigation order','Reorder the custom navigation items independently of YouTube’s native sidebar.','select','home-first',{options:[['home-first','Home · Subscriptions · History · Shorts'],['subs-first','Subscriptions · Home · Shorts · History'],['history-first','History · Subscriptions · Home · Shorts'],['shorts-first','Shorts · Home · Subscriptions · History']]}],
  ['quickNavShowHistory','Include History shortcut','Show the History shortcut in the quick dock.','toggle',true],
  ['quickNavShowShorts','Include Shorts shortcut','Show the Shorts shortcut if Shorts are not hidden.','toggle',true],
]);

// Settings taxonomy v4.1.2: display-only reorganization.
// Build groups from the original definitions so setting keys, values, and validation never change.
// Changing a category does not modify a user's saved preferences.
const originalEntries = new Map(groups.flatMap(g => g.settings.map(entry => [entry[0], entry])));
const sectionByKey = new Map();
const reorganizedGroups = [];
const taxonomy = [
  {
    "id": "general",
    "title": "General & Windows",
    "icon": "⌂",
    "subtitle": "Starting Tubeium, Windows integration, windows and notifications",
    "sections": [
      {
        "title": "Startup",
        "keys": [
          "launchAtLogin",
          "startPage",
          "startMinimized",
          "startFullscreen",
          "startAlwaysOnTop"
        ]
      },
      {
        "title": "Window behavior",
        "keys": [
          "rememberWindow",
          "closeToTray",
          "autoPauseOnHide"
        ]
      },
      {
        "title": "Notifications & links",
        "keys": [
          "hideToastMessages",
          "externalLinks"
        ]
      }
    ]
  },
  {
    "id": "appearance",
    "title": "Appearance & Themes",
    "icon": "◐",
    "subtitle": "Themes, colors, thumbnails and visual details",
    "sections": [
      {
        "title": "Themes & colors",
        "keys": [
          "settingsTheme",
          "accentColor",
          "pageTheme",
          "dimPageBackground"
        ]
      },
      {
        "title": "Spacing & shapes",
        "keys": [
          "compactDensity",
          "roundedThumbnails",
          "thumbnailRadius",
          "hideScrollbars"
        ]
      },
      {
        "title": "Visual details",
        "keys": [
          "hideChannelAvatars",
          "hideVerifiedBadges",
          "hideVideoBadges",
          "hideWatchedProgress",
          "hidePlayerGradient"
        ]
      }
    ]
  },
  {
    "id": "accessibility",
    "title": "Text & Accessibility",
    "icon": "◑",
    "subtitle": "Text size, scale, contrast and reduced motion",
    "sections": [
      {
        "title": "Text size & readability",
        "keys": [
          "dashboardFontSize",
          "youtubeFontSize",
          "pageZoom",
          "highContrastText"
        ]
      },
      {
        "title": "Motion & comfort",
        "keys": [
          "reduceAnimations"
        ]
      }
    ]
  },
  {
    "id": "home",
    "title": "Home, Feed & Search",
    "icon": "▦",
    "subtitle": "Customize the homepage, thumbnails and search suggestions",
    "sections": [
      {
        "title": "Home feed",
        "keys": [
          "hideHomeFeed",
          "gridColumns",
          "hideMixes",
          "hidePlaylists",
          "hideCommunityPosts",
          "hideLiveStreams",
          "hideUpcoming"
        ]
      },
      {
        "title": "Thumbnails & previews",
        "keys": [
          "hideHoverPreviews",
          "disableAutoplayPreviews"
        ]
      },
      {
        "title": "Search & recommendations",
        "keys": [
          "hideTopicChips",
          "hideSearchSuggestions",
          "hideSuggestedSearches",
          "hideRelatedSearches"
        ]
      }
    ]
  },
  {
    "id": "navigation",
    "title": "Navigation",
    "icon": "≡",
    "subtitle": "Sidebar, menu links and custom quick navigation",
    "sections": [
      {
        "title": "YouTube navigation",
        "keys": [
          "hideSidebar",
          "compactSidebar",
          "hideMasthead",
          "hideExplore",
          "hideSubscriptionsNav",
          "hideHistoryNav"
        ]
      },
      {
        "title": "Custom quick navigation",
        "keys": [
          "quickNavEnabled",
          "quickNavPosition",
          "quickNavOrder",
          "quickNavShowHistory",
          "quickNavShowShorts"
        ]
      }
    ]
  },
  {
    "id": "watch",
    "title": "Watch Page",
    "icon": "▣",
    "subtitle": "Recommendations, comments, page details and engagement buttons",
    "sections": [
      {
        "title": "Watch-page sections",
        "keys": [
          "hideComments",
          "hideRelated",
          "hideLiveChat",
          "hideDescription",
          "hideVideoMetadata",
          "hideEndScreens",
          "hideCards",
          "hideChannelWatermark"
        ]
      },
      {
        "title": "Promotions & actions",
        "keys": [
          "hideMerch",
          "hidePremiumUpsells",
          "hidePaidPromotions",
          "hideJoinButton",
          "hideThanksButton",
          "hideClipButton",
          "hideShareButton",
          "hideSaveButton",
          "hideDownloadNative",
          "hideVideoAnnotations"
        ]
      },
      {
        "title": "Ratings",
        "keys": [
          "showDislikes"
        ]
      }
    ]
  },
  {
    "id": "playback",
    "title": "Playback & Audio",
    "icon": "▶",
    "subtitle": "Video speed, sound, quality, subtitles and autoplay",
    "sections": [
      {
        "title": "Speed & quality",
        "keys": [
          "defaultSpeed",
          "rememberSpeed",
          "preferredQuality",
          "preservePitch",
          "skipVideoIntro"
        ]
      },
      {
        "title": "Sound",
        "keys": [
          "defaultVolume",
          "rememberVolume",
          "startMuted",
          "rememberMute",
          "preferredAudioLanguage"
        ]
      },
      {
        "title": "Playback behavior",
        "keys": [
          "loopVideo",
          "autoplayNext",
          "stopAfterVideo",
          "pauseOnBlur",
          "autoTheater",
          "autoFullscreen",
          "showNativeControls"
        ]
      },
      {
        "title": "Subtitles",
        "keys": [
          "autoCaptions",
          "forceCaptionsOff"
        ]
      }
    ]
  },
  {
    "id": "controls",
    "title": "Player Controls & Gestures",
    "icon": "◉",
    "subtitle": "Player toolbar, built-in buttons and mouse gestures",
    "sections": [
      {
        "title": "Floating controls",
        "keys": [
          "showOverlayToolbar",
          "showSettingsButton",
          "miniWidth",
          "toolMute",
          "toolSpeed",
          "toolPiP",
          "toolCopyLink",
          "toolCopyTitle",
          "toolFullscreen",
          "toolTheater",
          "toolQuality",
          "toolDownloads",
          "toolSeekButtons"
        ]
      },
      {
        "title": "YouTube player buttons",
        "keys": [
          "hidePlayerNext",
          "hidePlayerAutoplay",
          "hidePlayerCaptions",
          "hidePlayerSettings",
          "hidePlayerMiniplayer",
          "hidePlayerCast",
          "hidePlayerFullscreen",
          "confirmCast"
        ]
      },
      {
        "title": "Mouse & double-click gestures",
        "keys": [
          "wheelVolume",
          "wheelVolumeStep",
          "wheelSeek",
          "doubleClickSeek",
          "disableDoubleTapSkip",
          "middleClickPause"
        ]
      }
    ]
  },
  {
    "id": "shorts",
    "title": "Shorts",
    "icon": "▯",
    "subtitle": "Shorts visibility, controls and seeking",
    "sections": [
      {
        "title": "Shorts browsing",
        "keys": [
          "hideShorts",
          "shortsHideTitle",
          "shortsHideChannel",
          "shortsHideLike",
          "shortsHideDislike",
          "shortsHideComments",
          "shortsHideShare",
          "shortsHideRemix",
          "shortsHideSubscribe",
          "shortsHideAudio",
          "shortsHideNav"
        ]
      },
      {
        "title": "Shorts playback",
        "keys": [
          "shortsSeekBar",
          "shortsPauseOnOpen"
        ]
      }
    ]
  },
  {
    "id": "blocking",
    "title": "Ads & SponsorBlock",
    "icon": "◈",
    "subtitle": "Ad placement hiding and community segment skipping",
    "sections": [
      {
        "title": "Ads",
        "keys": [
          "blockAds",
          "adSkipToast"
        ]
      },
      {
        "title": "SponsorBlock",
        "keys": [
          "sponsorBlock",
          "sbCategories",
          "sbAllowMute",
          "sbMutedCategories",
          "sponsorToast",
          "sponsorInShorts"
        ]
      }
    ]
  },
  {
    "id": "downloads",
    "title": "Downloads",
    "icon": "↓",
    "subtitle": "Download quality, saving, subtitles and queue behavior",
    "sections": [
      {
        "title": "Bottom-right shortcuts",
        "keys": [
          "showDownloadButton",
          "showSigninHelpButton",
          "downloadThumbnailOnly"
        ]
      },
      {
        "title": "Quality & formats",
        "keys": [
          "videoQuality",
          "videoContainer",
          "audioFormat",
          "audioQuality"
        ]
      },
      {
        "title": "Saving files",
        "keys": [
          "downloadBaseFolder",
          "downloadSubfolder",
          "filenameTemplate",
          "openAfterDownload"
        ]
      },
      {
        "title": "Subtitles & extra files",
        "keys": [
          "downloadThumbnail",
          "downloadSubtitles",
          "downloadSubLanguage",
          "convertSubtitles",
          "embedSubtitles",
          "embedThumbnail",
          "embedMetadata",
          "downloadDescription",
          "downloadInfoJson"
        ]
      },
      {
        "title": "Queue & reliability",
        "keys": [
          "downloadRateLimit",
          "downloadRetries",
          "parallelDownloads",
          "maxPlaylistItems"
        ]
      }
    ]
  },
  {
    "id": "shortcuts",
    "title": "Keyboard Shortcuts",
    "icon": "⌘",
    "subtitle": "Set keyboard controls for speed, seeking and looping",
    "sections": [
      {
        "title": "Speed shortcuts",
        "keys": [
          "enableSpeedKeys",
          "speedUpKey",
          "speedDownKey",
          "speedResetKey",
          "speedStep"
        ]
      },
      {
        "title": "Seek shortcuts",
        "keys": [
          "enableSeekKeys",
          "seekForwardKey",
          "seekBackKey",
          "seekSeconds"
        ]
      },
      {
        "title": "Loop shortcuts",
        "keys": [
          "enableLoopKey",
          "toggleLoopKey"
        ]
      }
    ]
  },
  {
    "id": "privacy",
    "title": "Privacy & Local Data",
    "icon": "◇",
    "subtitle": "Manage local cache and login cookies; visual hiding does not stop tracking",
    "sections": [
      {
        "title": "Local storage",
        "keys": [
          "autoClearCache"
        ]
      }
    ]
  },
  {
    "id": "advanced",
    "title": "Advanced",
    "icon": "⚙",
    "subtitle": "Developer tools and custom styles",
    "sections": [
      {
        "title": "Advanced customization",
        "keys": [
          "customCSS",
          "showDeveloperTools"
        ]
      }
    ]
  }
];
for (const group of taxonomy) {
  const settings = [];
  for (const section of group.sections) {
    for (const key of section.keys) {
      if (sectionByKey.has(key)) throw new Error('Duplicate setting category: ' + key);
      const entry = originalEntries.get(key);
      if (!entry) throw new Error('Unknown setting key in taxonomy: ' + key);
      sectionByKey.set(key, section.title);
      settings.push(entry);
    }
  }
  reorganizedGroups.push({ id: group.id, title: group.title, icon: group.icon, subtitle: group.subtitle, settings });
}
if (sectionByKey.size !== originalEntries.size) {
  const missing = [...originalEntries.keys()].filter(key => !sectionByKey.has(key));
  throw new Error('Settings omitted by taxonomy: ' + missing.join(', '));
}
groups.splice(0, groups.length, ...reorganizedGroups);

// Additive v4.2 controls: existing 176 keys, defaults, and category placement are untouched.
const NEW_SETTINGS = [
 ['localLibraryEnabled','Local video library','Save watch progress and bookmarks on this PC only. No Google login required.','toggle',true,'library','Tracking & bookmarks'],
 ['recordWatchProgress','Save watch progress','Remember your position in videos locally. Turn off to stop recording new viewing progress.','toggle',true,'library','Tracking & bookmarks'],
 ['resumeWatchedVideos','Resume partially watched videos','Offer to continue at the last saved position when returning to a video.','toggle',true,'library','Tracking & bookmarks'],
 ['showBookmarkButton','Bookmark button on player','Add a bookmark control to the floating video toolbar.','toggle',true,'library','Tracking & bookmarks'],
 ['dearrowTitles','Community alternative titles (DeArrow)','Use highly rated DeArrow titles on video cards when available. Makes third-party requests for video IDs.','toggle',false,'watch','Video titles'],
 ['confirmExternalLinks','Confirm external websites','Ask before opening non-YouTube links in your default browser.','toggle',true,'privacy','External links'],
 ['allowLocation','Allow website location','Allow YouTube and Google pages to request geolocation. Off blocks requests.','toggle',false,'privacy','Device permissions'],
 ['allowMedia','Allow camera and microphone','Allow YouTube and Google pages to request camera or microphone access. Off blocks requests.','toggle',false,'privacy','Device permissions'],
 ['allowNotifications','Allow website notifications','Allow YouTube and Google pages to request desktop notifications. Off blocks requests.','toggle',false,'privacy','Device permissions'],
 ['showScreenshotButton','Video screenshot button','Show a screenshot action on the floating player toolbar. Captures the visible player window.','toggle',true,'controls','Player toolbar'],
];
NEW_SETTINGS.push(
 ['gamepadEnabled','Gamepad media controls','Use a connected controller for play/pause, seeking and volume (A, LB/RB, D-pad).','toggle',false,'controls','Gamepad'],
 ['gamepadSeekSeconds','Controller seek amount','Seconds to jump backward or forward using controller shoulder buttons.','select','10','controls','Gamepad'],
 ['autoCheckUpdates','Check for app updates','Checks the latest official Tubeium GitHub Release on startup; does not install automatically.','toggle',true,'general','Updates'],
 ['autoDownloadUpdates','Download approved updates automatically','Only applies to builds with a configured signed update feed. Unsigned GitHub releases must be downloaded manually.','toggle',false,'general','Updates'],
 ['autoPlayOffline','Autoplay offline media','Start downloaded videos automatically when opened in the offline player.','toggle',false,'downloads','Offline playback']
);
const groupById = new Map(groups.map(g=>[g.id,g]));
const groupLabels = new Map([['library',{title:'Local Library',icon:'▣',subtitle:'Bookmarks and watch progress stored on this computer'}]]);
for(const [key,label,description,type,def,groupId,section] of NEW_SETTINGS){
 let group = groupById.get(groupId);
 if(!group){const extra=groupLabels.get(groupId);group={id:groupId,...extra,settings:[]};groups.splice(groups.findIndex(g=>g.id==='privacy'),0,group);groupById.set(groupId,group);}
 group.settings.push(type==='select'&&key==='gamepadSeekSeconds' ? [key,label,description,type,def,{options:[['5','5 seconds'],['10','10 seconds'],['15','15 seconds'],['30','30 seconds']]}] : [key,label,description,type,def]);sectionByKey.set(key,section);
}

// v4.5: all options are additive, preserving existing values and the native player.
const EXTENDED_CONTROLS=[
 ['smartProfileMode','Smart viewing profile','Temporarily tailor the watch page without overwriting your saved preferences. Automatic mode uses title keywords only.','select','off','playback','Context profiles',{options:[['off','Off'],['auto','Auto (experimental)'],['cinema','Cinema'],['music','Music'],['study','Study'],['gaming','Gaming'],['focus','Focus']]}],
 ['audioPreset','Audio equalizer preset','Optional three-band Web Audio equalizer. May be unavailable for protected/cross-origin streams.','select','off','playback','Audio enhancements',{options:[['off','Off (unchanged audio)'],['balanced','Balanced'],['bass','Bass boost'],['voice','Voice clarity'],['cinema','Cinema'],['music','Music']]}],
 ['audioIntensity','Audio EQ intensity','Strength of the selected audio profile. Off has no effect.','range',100,'playback','Audio enhancements',{min:0,max:100,step:10,unit:'%'}],
 ['miniOpacity','Mini player opacity','Set the native floating window transparency (Windows only).','range',100,'general','Mini player',{min:60,max:100,step:5,unit:'%'}],
 ['miniCorner','Mini player starting position','Where the floating player appears when mini mode starts.','select','bottom-right','general','Mini player',{options:[['bottom-right','Bottom right'],['bottom-left','Bottom left'],['top-right','Top right'],['top-left','Top left']]}],
 ['gamepadPlayButton','Controller play/pause button','Choose the standard gamepad button used to play or pause.','select','0','controls','Gamepad',{options:[['0','A / Cross'],['1','B / Circle'],['2','X / Square'],['3','Y / Triangle']]}],
 ['gamepadSeekBackward','Controller seek back button','Controller button for seeking backward.','select','4','controls','Gamepad',{options:[['4','Left bumper'],['6','Left trigger'],['14','D-pad left']]}],
 ['gamepadSeekForward','Controller seek forward button','Controller button for seeking forward.','select','5','controls','Gamepad',{options:[['5','Right bumper'],['7','Right trigger'],['15','D-pad right']]}],
 ['librarySort','Local library sorting','Default order in the local library; can also be changed there.','select','recent','library','Organization',{options:[['recent','Recently watched'],['title','Video title'],['channel','Channel'],['duration','Video length']]}],
 ['autoRestoreDownloads','Resume queued downloads at startup','Continue queued jobs after reopening Tubeium (existing successful downloads are skipped where supported).','toggle',true,'downloads','Reliability'],
];
for(const [key,label,description,type,def,groupId,section,extra] of EXTENDED_CONTROLS){
 const group=groupById.get(groupId);
 if(!group)throw new Error('Missing settings group '+groupId);
 group.settings.push([key,label,description,type,def,extra||{}]);sectionByKey.set(key,section);
}

const metadata = Object.freeze(Object.fromEntries(groups.flatMap(g => g.settings.map(
  ([key, label, description, type, defaultValue, extra = {}]) => [key, { key, label, description, type, defaultValue, ...extra, group: g.id, section: sectionByKey.get(key) }]
))));
const DEFAULTS = Object.freeze(Object.fromEntries(Object.values(metadata).map(m => [m.key, Array.isArray(m.defaultValue) ? [...m.defaultValue] : m.defaultValue])));
const hotkeyPattern = /^(?:(?:Ctrl|Alt|Shift|Meta)\+){0,3}(?:[A-Z]|[0-9]|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|\[|\]|\\|,|\.|\/|;|'|=|-|Space|F(?:[1-9]|1[0-2]))$/;

function validValue(m, value) {
  if (m.type === 'toggle') return typeof value === 'boolean' ? value : undefined;
  if (m.type === 'color') return typeof value === 'string' && /^#[\da-fA-F]{6}$/.test(value) ? value.toLowerCase() : undefined;
  if (m.type === 'range') return typeof value === 'number' && Number.isFinite(value) && value >= m.min && value <= m.max && (Math.abs((value - m.min) / m.step - Math.round((value - m.min) / m.step)) < 1e-7) ? value : undefined;
  if (m.type === 'select') {
    // Preserve settings from the original v1 (speedStep used a number).
    const v = String(value);
    return m.options.some(([key]) => key === v) ? v : undefined;
  }
  if (m.type === 'multiselect') return Array.isArray(value) && value.length <= m.options.length && value.every(x => typeof x === 'string') ? [...new Set(value.filter(x => m.options.some(([key]) => key === x)))] : undefined;
  if (m.type === 'text' || m.type === 'textarea') {
    if (typeof value !== 'string' || value.length > m.maxLength) return undefined;
    if (m.key === 'downloadSubLanguage' && !/^[a-zA-Z0-9,.\- ]{0,70}$/.test(value)) return undefined;
    if (m.key === 'downloadSubfolder' && (/[\\/:*?"<>|\x00-\x1f]/.test(value) || value === '.' || value === '..' || value.endsWith('.'))) return undefined;
    return value;
  }
  if (m.type === 'folder') return typeof value === 'string' && value.length <= 600 && (!value || require('path').isAbsolute(value)) ? value : undefined;
  if (m.type === 'hotkey') return typeof value === 'string' && hotkeyPattern.test(value) ? value : undefined;
  return undefined;
}
function normalize(input = {}, base = DEFAULTS) {
  const out = Object.fromEntries(Object.entries(DEFAULTS).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
  if (base && typeof base === 'object') {
    for (const [key, value] of Object.entries(base)) {
      const m = metadata[key];
      if (!m) continue;
      const parsed = validValue(m, value);
      if (parsed !== undefined) out[key] = parsed;
    }
  }
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const [key, value] of Object.entries(input)) {
      const m = metadata[key];
      if (!m) continue;
      const parsed = validValue(m, value);
      if (parsed !== undefined) out[key] = parsed;
    }
  }
  return out;
}
const publicGroups = () => groups.map(g => ({ id: g.id, title: g.title, icon: g.icon, subtitle: g.subtitle, settings: g.settings.map(([key]) => metadata[key]) }));
module.exports = { DEFAULTS, normalize, publicGroups, metadata };
