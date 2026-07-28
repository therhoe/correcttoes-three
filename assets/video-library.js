import { Component } from '@theme/component';
import { DialogCloseEvent } from '@theme/dialog';

const TAG_PARAM = 'tag';

/**
 * Returns true when the URL points to a directly-playable video file —
 * Shopify CDN-hosted video or any URL ending in a common video extension.
 *
 * @param {string} url
 * @returns {boolean}
 */
function isDirectVideoUrl(url) {
  if (!url) return false;
  // Strip query string + hash before checking the extension.
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (/\.(mp4|mov|webm|ogg|m4v)$/.test(path)) return true;
  if (/cdn\.shopify\.com\/videos\//i.test(url)) return true;
  return false;
}

/**
 * Builds a `<video>` element for a Shopify-hosted (or otherwise direct) video
 * file with autoplay + native controls. Caller is responsible for inserting
 * and later removing it (removing stops playback and audio).
 *
 * @param {string} url
 * @param {string} title
 * @returns {HTMLVideoElement}
 */
function buildVideoElement(url, title) {
  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.className = 'video-library__video';
  if (title) video.setAttribute('aria-label', title);
  return video;
}

/**
 * <video-library> — metaobject-backed video grid with a single-select tag
 * filter and a modal player. Sister to <type-filter> visually, but
 * independent of the products/facets pipeline.
 *
 * @extends {Component}
 */
class VideoLibrary extends Component {
  /** @type {AbortController} */
  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();
    const { signal } = this.#abortController;

    this.addEventListener('click', this.#handleClick, { signal });
    window.addEventListener('popstate', this.#syncFromUrl, { signal });

    const dialogComponent = this.querySelector('dialog-component');
    if (dialogComponent) {
      dialogComponent.addEventListener(DialogCloseEvent.eventName, this.#clearPlayer, { signal });
    }

    this.#syncFromUrl();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
  }

  /**
   * Single click handler delegates to either filter or card behavior depending
   * on what was actually clicked.
   *
   * @param {MouseEvent} event
   */
  #handleClick = (event) => {
    if (!(event.target instanceof Element)) return;

    const filterBtn = event.target.closest('.video-library__filter-btn');
    if (filterBtn instanceof HTMLElement) {
      this.#onFilterClick(filterBtn);
      return;
    }

    const card = event.target.closest('.video-library__card');
    if (card instanceof HTMLElement) {
      this.#openVideo(card);
    }
  };

  /**
   * Single-select toggle: clicking the active tag (or "All") clears the
   * filter; clicking another tag swaps to it.
   *
   * @param {HTMLElement} btn
   */
  #onFilterClick(btn) {
    const tag = btn.dataset.tag || '';
    const currentTag = this.#getActiveTag();
    const nextTag = tag === currentTag ? '' : tag;

    const url = new URL(window.location.href);
    if (nextTag) {
      url.searchParams.set(TAG_PARAM, nextTag);
    } else {
      url.searchParams.delete(TAG_PARAM);
    }
    history.pushState({}, '', url.toString());

    this.#applyFilter(nextTag);
  }

  /**
   * Reflects the URL's `?tag=` into the DOM on load and on popstate.
   */
  #syncFromUrl = () => {
    this.#applyFilter(this.#getActiveTag());
  };

  #getActiveTag() {
    return new URL(window.location.href).searchParams.get(TAG_PARAM) || '';
  }

  /**
   * Applies a tag filter: marks the matching button active, hides cards
   * whose data-tags don't include the active tag, toggles the no-matches
   * message.
   *
   * @param {string} activeTag
   */
  #applyFilter(activeTag) {
    // Buttons
    const buttons = this.querySelectorAll('.video-library__filter-btn');
    for (const button of buttons) {
      if (!(button instanceof HTMLElement)) continue;
      const btnTag = button.dataset.tag || '';
      const isActive = btnTag === activeTag;
      button.classList.toggle('video-library__filter-btn--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    // Cards
    const cards = this.querySelectorAll('.video-library__card');
    let visibleCount = 0;
    for (const card of cards) {
      if (!(card instanceof HTMLElement)) continue;
      const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
      const matches = !activeTag || tags.includes(activeTag);
      card.hidden = !matches;
      if (matches) visibleCount++;
    }

    // No-matches message — only when a filter is active and zero cards match,
    // and only if there were cards to begin with (otherwise empty-state shows).
    const noMatches = this.querySelector('.video-library__no-matches');
    if (noMatches instanceof HTMLElement) {
      const hasFilter = Boolean(activeTag);
      const hasAnyCards = cards.length > 0;
      noMatches.hidden = !(hasFilter && hasAnyCards && visibleCount === 0);
    }
  }

  /**
   * Builds the `<video>` player for the clicked card and shows the modal.
   *
   * @param {HTMLElement} card
   */
  #openVideo(card) {
    const url = card.dataset.videoUrl || '';
    const title = card.dataset.videoTitle || '';

    if (!isDirectVideoUrl(url)) {
      console.warn(
        '[video-library] Unsupported video URL — expected a Shopify-hosted or direct video file (.mp4/.mov/.webm):',
        url
      );
      return;
    }

    const player = this.querySelector('[data-player]');
    const dialogComponent = this.querySelector('dialog-component');
    if (!(player instanceof HTMLElement) || !dialogComponent) return;

    // Clear any previous video before appending the new one.
    player.replaceChildren(buildVideoElement(url, title));

    /** @type {any} */ (dialogComponent).showDialog();
  }

  /**
   * Empties the player so the `<video>` element is destroyed (stops playback
   * and releases audio focus).
   */
  #clearPlayer = () => {
    const player = this.querySelector('[data-player]');
    if (player instanceof HTMLElement) player.replaceChildren();
  };
}

if (!customElements.get('video-library')) {
  customElements.define('video-library', VideoLibrary);
}
