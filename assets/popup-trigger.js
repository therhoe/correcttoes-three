const DAY_MS = 86400000;

const storageKey = (component) => `popup-dismissed-${component.id}`;

const isSuppressed = (component) => {
  const frequency = component.dataset.frequency;
  const key = storageKey(component);

  if (frequency === 'always') return false;

  if (frequency === 'session' || frequency === 'session_plus_dismiss') {
    if (sessionStorage.getItem(key)) return true;
  }

  if (frequency === 'dismiss_days' || frequency === 'session_plus_dismiss') {
    const stored = localStorage.getItem(key);
    if (stored) {
      const days = parseInt(component.dataset.suppressDays, 10) || 7;
      const age = Date.now() - parseInt(stored, 10);
      if (age < days * DAY_MS) return true;
    }
  }

  return false;
};

const markShown = (component) => {
  sessionStorage.setItem(storageKey(component), '1');
};

const markDismissed = (component) => {
  localStorage.setItem(storageKey(component), String(Date.now()));
};

const openCornerPopup = (component) => {
  const dialog = component.querySelector('dialog');
  if (!dialog || dialog.open) return;

  const closeTriggers = component.querySelectorAll('[ref="closeButton"], .popup__success-close');

  function onKey(e) {
    if (e.key === 'Escape' && dialog.open) {
      e.preventDefault();
      close();
    }
  }

  function close() {
    if (!dialog.open) return;
    closeTriggers.forEach((btn) => btn.removeEventListener('click', close));
    document.removeEventListener('keydown', onKey);
    dialog.close();
    component.dispatchEvent(new CustomEvent('dialog:close'));
  }

  dialog.show();
  component.dispatchEvent(new CustomEvent('dialog:open'));
  closeTriggers.forEach((btn) => btn.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
};

const openPopup = (component) => {
  if (component.dataset.behavior === 'corner') {
    openCornerPopup(component);
  } else {
    if (typeof component.showDialog !== 'function') return;
    component.showDialog();
  }
  markShown(component);
};

const armDelay = (component) => {
  const seconds = parseFloat(component.dataset.delaySeconds) || 0;
  setTimeout(() => openPopup(component), seconds * 1000);
};

const armScroll = (component) => {
  const percent = parseFloat(component.dataset.scrollPercent) || 50;
  let fired = false;

  const check = () => {
    if (fired) return;
    const doc = document.documentElement;
    const total = doc.scrollHeight - doc.clientHeight;
    if (total <= 0) return;
    const progress = ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;
    if (progress >= percent) {
      fired = true;
      window.removeEventListener('scroll', check);
      openPopup(component);
    }
  };

  window.addEventListener('scroll', check, { passive: true });
  check();
};

const armExitIntent = (component) => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let fired = false;
  const handler = (event) => {
    if (fired) return;
    if (event.clientY <= 0) {
      fired = true;
      document.removeEventListener('mousemove', handler);
      openPopup(component);
    }
  };

  document.addEventListener('mousemove', handler);
};

const armImmediate = (component) => {
  requestAnimationFrame(() => openPopup(component));
};

const arm = (component) => {
  switch (component.dataset.trigger) {
    case 'delay':
      armDelay(component);
      break;
    case 'scroll':
      armScroll(component);
      break;
    case 'exit_intent':
      armExitIntent(component);
      break;
    case 'immediate':
      armImmediate(component);
      break;
  }
};

const init = () => {
  const components = document.querySelectorAll('dialog-component[data-popup-trigger]');

  components.forEach((component) => {
    const justSubmitted = component.querySelector('[data-popup-success]') !== null;

    component.addEventListener('dialog:close', () => markDismissed(component));

    if (justSubmitted) {
      markDismissed(component);
      requestAnimationFrame(() => openPopup(component));
      return;
    }

    if (isSuppressed(component)) return;

    arm(component);
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
