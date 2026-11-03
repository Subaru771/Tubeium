'use strict';
const status = document.getElementById('status');
const saved = document.getElementById('saved');
const checkbox = document.getElementById('on-start');
const showTabs = document.getElementById('show-tabs');

// One live message line under the steps: says what just happened.
function say(text, kind) {
  status.textContent = text || '';
  status.className = 'status' + (kind ? ' ' + kind : '');
  status.hidden = !text;
}
for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('click', async () => {
    const action = button.dataset.action;
    button.disabled = true;
    try {
      // 'youtube' only switches Tubeium to its YouTube tab; everything else reports back.
      const result = (action === 'youtube' || action === 'open-browser')
        ? await window.tubeiumWelcome.navigate(action)
        : await window.tubeiumWelcome.action(action);
      if (result?.opened === false) {
        say(result.instructions || 'That did not work. Please try again.', 'warn');
      } else if (action === 'open-browser') {
        say(result?.instructions || `A separate, signed-out ${result?.browser || 'browser'} window opened. Keep it open and open its Extensions page as shown in step 2.`, /requires a Chromium browser/.test(result?.instructions || '') ? 'warn' : 'ok');
      } else if (action !== 'youtube') {
        say(result?.instructions || 'Done.', 'ok');
      }
    } catch {
      say('Something went wrong. Please try that step again.', 'warn');
    } finally { button.disabled = false; }
  });
}

window.tubeiumWelcome.getState().then(({showOnStartup, showHelpTabs, browserLabel, codeReady}) => {
  checkbox.checked = showOnStartup;
  showTabs.checked = showHelpTabs !== false;
  if (codeReady) say('Your one-time code is ready and copied. Continue with the steps below.', 'ok');
}).catch(() => {saved.textContent = 'Could not read startup preference';});

checkbox.addEventListener('change', async () => {
  checkbox.disabled = true;
  try {
    const state = await window.tubeiumWelcome.setShowOnStartup(checkbox.checked);
    checkbox.checked = state.showOnStartup;
    saved.textContent = 'Saved';
  } catch {
    checkbox.checked = !checkbox.checked;
    saved.textContent = 'Could not save preference';
  } finally { checkbox.disabled = false; }
});

showTabs.addEventListener('change', async () => {
  const next = showTabs.checked;
  showTabs.disabled = true;
  try {
    const state = await window.tubeiumWelcome.setShowTabs(next);
    showTabs.checked = state.showHelpTabs;
    saved.textContent = next ? 'Tabs visible' : 'Tabs collapsed — use the Show tabs button';
  } catch {
    showTabs.checked = !next;
    saved.textContent = 'Could not change tab visibility';
  } finally { showTabs.disabled = false; }
});

window.tubeiumWelcome.onSignInCompleted(({imported, rejected}) => {
  if (imported > 0) {
    say(`Sign-in received (${imported} cookies). Tubeium is restarting. When it reopens, check for your profile picture at the top right of YouTube.`, 'ok');
  } else {
    say(`No sign-in was imported (${rejected} rejected). Tubeium stays open; retry step 3.`, 'warn');
  }
});
