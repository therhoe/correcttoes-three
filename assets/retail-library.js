import { Component } from '@theme/component';

const QUERY_PARAM = 'q';
const COUNTRY_PARAM = 'country';
const DEBOUNCE_MS = 200;

/**
 * Folds diacritics so "café" matches "cafe". NFD decomposes accented chars
 * into base + combining-mark codepoints, then we strip the marks.
 *
 * @param {string} value
 * @returns {string}
 */
function fold(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * <retail-library> — metaobject-backed grid of retail partners with a
 * text search input, a country chip filter (single-select), and a details
 * dialog opened from any card. Mirrors <video-library>'s architecture but
 * with two filter axes AND-combined.
 *
 * @extends {Component}
 */
class RetailLibrary extends Component {
  /** @type {AbortController} */
  #abortController = new AbortController();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #debounceTimer;

  connectedCallback() {
    super.connectedCallback();
    const { signal } = this.#abortController;

    this.addEventListener('click', this.#handleClick, { signal });
    window.addEventListener('popstate', this.#syncFromUrl, { signal });

    const input = this.#searchInput;
    if (input) {
      input.addEventListener('input', this.#handleInput, { signal });
    }

    const dialog = this.#dialog;
    if (dialog) {
      dialog.addEventListener('close', this.#onDialogClose, { signal });
      dialog.addEventListener('click', this.#onDialogBackdropClick, { signal });
    }

    signal.addEventListener('abort', () => {
      if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
    });

    this.#syncFromUrl();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
  }

  /** @returns {HTMLInputElement | null} */
  get #searchInput() {
    return this.querySelector('[data-search-input]');
  }

  /** @returns {HTMLDialogElement | null} */
  get #dialog() {
    return this.querySelector('[data-dialog]');
  }

  /** @returns {HTMLElement | null} */
  get #dialogContent() {
    return this.querySelector('[data-dialog-content]');
  }

  /**
   * Single click handler routes filter, card, and dialog-close interactions.
   *
   * @param {MouseEvent} event
   */
  #handleClick = (event) => {
    if (!(event.target instanceof Element)) return;

    const closeBtn = event.target.closest('[data-dialog-close]');
    if (closeBtn) {
      this.#closeDialog();
      return;
    }

    const filterBtn = event.target.closest('.retail-library__filter-btn');
    if (filterBtn instanceof HTMLElement) {
      this.#onFilterClick(filterBtn);
      return;
    }

    const trigger = event.target.closest('[data-card-trigger]');
    if (trigger instanceof HTMLElement) {
      const card = trigger.closest('.retail-card');
      if (card instanceof HTMLElement) this.#openDialog(card);
    }
  };

  /**
   * Debounced text-input handler. Uses replaceState so the back button
   * still leaves the page instead of undoing each keystroke.
   */
  #handleInput = () => {
    if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      if (this.#abortController.signal.aborted) return;
      const input = this.#searchInput;
      const query = input ? input.value.trim() : '';
      const url = new URL(window.location.href);
      if (query) {
        url.searchParams.set(QUERY_PARAM, query);
      } else {
        url.searchParams.delete(QUERY_PARAM);
      }
      history.replaceState({}, '', url.toString());
      this.#applyFilters();
    }, DEBOUNCE_MS);
  };

  /**
   * Single-select toggle for country chips. Clicking the active chip clears.
   * pushState here so one undo == one filter change.
   *
   * @param {HTMLElement} btn
   */
  #onFilterClick(btn) {
    const country = btn.dataset.country || '';
    const current = this.#getActiveCountry();
    const next = country === current ? '' : country;

    const url = new URL(window.location.href);
    if (next) {
      url.searchParams.set(COUNTRY_PARAM, next);
    } else {
      url.searchParams.delete(COUNTRY_PARAM);
    }
    history.pushState({}, '', url.toString());

    this.#applyFilters();
  }

  #syncFromUrl = () => {
    const url = new URL(window.location.href);
    const query = url.searchParams.get(QUERY_PARAM) || '';
    const input = this.#searchInput;
    if (input && input.value !== query) input.value = query;
    this.#applyFilters();
  };

  /** @returns {string} */
  #getActiveCountry() {
    return new URL(window.location.href).searchParams.get(COUNTRY_PARAM) || '';
  }

  /** @returns {string} */
  #getActiveQuery() {
    const input = this.#searchInput;
    if (input) return input.value.trim();
    return new URL(window.location.href).searchParams.get(QUERY_PARAM) || '';
  }

  /**
   * Applies both filters (AND) to the rendered cards, updates chip active
   * states, and toggles the no-matches message.
   */
  #applyFilters() {
    const activeCountry = this.#getActiveCountry();
    const foldedQuery = fold(this.#getActiveQuery());

    const buttons = this.querySelectorAll('.retail-library__filter-btn');
    for (const button of buttons) {
      if (!(button instanceof HTMLElement)) continue;
      const btnCountry = button.dataset.country || '';
      const isActive = btnCountry === activeCountry;
      button.classList.toggle('retail-library__filter-btn--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    const cards = this.querySelectorAll('.retail-card');
    let visibleCount = 0;
    for (const card of cards) {
      if (!(card instanceof HTMLElement)) continue;
      const cardCountry = card.dataset.country || '';
      const cardSearch = fold(card.dataset.search || '');
      const countryMatches = !activeCountry || cardCountry === activeCountry;
      const queryMatches = !foldedQuery || cardSearch.includes(foldedQuery);
      const visible = countryMatches && queryMatches;
      card.hidden = !visible;
      if (visible) visibleCount++;
    }

    const noMatches = this.querySelector('[data-no-matches]');
    if (noMatches instanceof HTMLElement) {
      const hasFilter = Boolean(activeCountry) || Boolean(foldedQuery);
      const hasAnyCards = cards.length > 0;
      noMatches.hidden = !(hasFilter && hasAnyCards && visibleCount === 0);
    }
  }

  /**
   * Clones the card's drawer payload template into the dialog and opens it.
   *
   * @param {HTMLElement} card
   */
  #openDialog(card) {
    const dialog = this.#dialog;
    const content = this.#dialogContent;
    if (!dialog || !content) return;

    const template = card.querySelector('template[data-payload]');
    if (!(template instanceof HTMLTemplateElement)) return;

    content.replaceChildren(template.content.cloneNode(true));
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  #closeDialog() {
    const dialog = this.#dialog;
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  #onDialogClose = () => {
    const content = this.#dialogContent;
    if (content) content.replaceChildren();
  };

  /**
   * Native <dialog> backdrop click registers on the dialog element itself
   * (the form-inner content sits inside an implicit child box). Close when
   * the raw click hits the dialog and not its content.
   *
   * @param {MouseEvent} event
   */
  #onDialogBackdropClick = (event) => {
    if (event.target === this.#dialog) this.#closeDialog();
  };
}

if (!customElements.get('retail-library')) {
  customElements.define('retail-library', RetailLibrary);
}
