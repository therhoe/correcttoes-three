import { Component } from '@theme/component';
import { sectionRenderer } from '@theme/section-renderer';

/**
 * Custom element that powers the docs-style blog sidebar layout.
 *
 * - Intercepts plain-click navigation on sidebar post links and swaps
 *   the article body via Section Rendering API + DOM morph (hydration mode).
 * - Updates the URL with `history.pushState` so the back button works
 *   and reloads still hit a real page.
 * - Falls back to a normal navigation for modifier-clicks, middle-click,
 *   crawlers, or any error during the swap.
 *
 * Markup contract:
 * - The wrapping element has `data-section-id="{{ section.id }}"`.
 * - Sidebar links have `data-article-handle="<handle>"` and a real `href`.
 * - Two `data-hydration-key` subtrees:
 *     - `blog-sidebar-list` — updates the sidebar's active-item highlight.
 *     - `blog-sidebar-article` — receives the swapped article body.
 *
 * @extends {Component}
 */
class BlogSidebarComponent extends Component {
  /** @type {AbortController | null} */
  #popstateAbort = null;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.#onLinkClick);

    this.#popstateAbort = new AbortController();
    window.addEventListener('popstate', this.#onPopstate, { signal: this.#popstateAbort.signal });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.#onLinkClick);
    this.#popstateAbort?.abort();

    // If the drawer was open when this element was removed, clean up.
    if (this.dataset.drawerOpen === 'true') {
      document.removeEventListener('keydown', this.#onKeydown);
      document.body.style.overflow = '';
    }
  }

  /**
   * Toggles the mobile drawer. Wired via `on:click="/toggleDrawer"` on the
   * toggle button — see component.js declarative event listener.
   */
  toggleDrawer() {
    if (this.dataset.drawerOpen === 'true') {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  /**
   * Opens the mobile drawer.
   */
  openDrawer() {
    this.dataset.drawerOpen = 'true';
    const toggle = this.querySelector('.blog-sidebar__mobile-toggle');
    if (toggle instanceof HTMLElement) toggle.setAttribute('aria-expanded', 'true');

    // Listen for Escape to close.
    document.addEventListener('keydown', this.#onKeydown);
    // Lock page scroll while the drawer is open.
    document.body.style.overflow = 'hidden';
  }

  /**
   * Closes the mobile drawer.
   */
  closeDrawer() {
    if (this.dataset.drawerOpen !== 'true') return;
    delete this.dataset.drawerOpen;
    const toggle = this.querySelector('.blog-sidebar__mobile-toggle');
    if (toggle instanceof HTMLElement) toggle.setAttribute('aria-expanded', 'false');

    document.removeEventListener('keydown', this.#onKeydown);
    document.body.style.overflow = '';
  }

  #onKeydown = (event) => {
    if (event.key === 'Escape') {
      this.closeDrawer();
    }
  };

  /**
   * Intercept a click on a sidebar post link and swap the article body.
   * Lets modified clicks fall through to normal browser navigation.
   *
   * @param {MouseEvent} event
   */
  #onLinkClick = (event) => {
    if (event.defaultPrevented) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest('a[data-article-handle]');
    if (!(link instanceof HTMLAnchorElement)) return;

    // Honor modifier-clicks — let the browser navigate / open in new tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;

    event.preventDefault();
    this.closeDrawer();

    this.#swap(link.href, { pushState: true }).catch((error) => {
      // If anything goes wrong with the in-page swap, fall back to a real navigation.
      console.warn('[blog-sidebar] swap failed, falling back to navigation', error);
      window.location.href = link.href;
    });
  };

  /**
   * Re-swap when the user uses browser back/forward.
   */
  #onPopstate = () => {
    if (!document.contains(this)) return;
    this.#swap(window.location.href, { pushState: false }).catch(() => {
      window.location.reload();
    });
  };

  /**
   * Fetch the target URL via Section Rendering API and morph just the
   * `data-hydration-key` subtrees in this section.
   *
   * @param {string} href
   * @param {{ pushState: boolean }} options
   */
  async #swap(href, { pushState }) {
    const sectionId = this.dataset.sectionId;
    if (!sectionId) return;

    this.dataset.loading = 'true';
    try {
      const url = new URL(href, window.location.href);

      await sectionRenderer.renderSection(sectionId, {
        url,
        mode: 'hydration',
      });

      if (pushState && window.location.href !== url.href) {
        history.pushState({}, '', url.href);
      }

      const main = this.querySelector('[data-hydration-key="blog-sidebar-article"]');
      if (main instanceof HTMLElement) {
        // Move focus so screen readers announce the new content,
        // and bring the top of the article into view.
        main.focus({ preventScroll: true });
        main.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } finally {
      delete this.dataset.loading;
    }
  }
}

customElements.define('blog-sidebar-component', BlogSidebarComponent);
