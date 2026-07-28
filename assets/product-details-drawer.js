import { DialogComponent } from '@theme/dialog';

/**
 * Selectors for the buy-button / checkout UI that must be removed from the PDP
 * "Product Information" block before it is shown in the drawer. These products are
 * affiliate links, so the drawer mirrors the product info but never sells.
 * @type {string[]}
 */
const BUY_BUTTON_SELECTORS = [
  '.buy-buttons-block',
  'product-form-component',
  'accelerated-checkout',
  '.shopify-payment-button',
  'payment-terms',
  'sticky-add-to-cart',
];

/**
 * A single shared slide-out drawer that shows a product's PDP "Product Information"
 * block (media, title, price, description, variants) with the buy buttons removed.
 *
 * Opened by a delegated document click listener on:
 *  - any `.product-details-button` (the explicit "Details" card block), or
 *  - any `product-card` inside a `[data-details-drawer]` results list (whole-card click).
 *
 * @extends {DialogComponent}
 */
class ProductDetailsDrawer extends DialogComponent {
  /** @type {Map<string, Element>} Cleaned `.product-information` nodes, keyed by product URL. */
  #cache = new Map();

  /** @type {AbortController | null} In-flight page fetch. */
  #fetchController = null;

  /** @type {AbortController} Lifetime controller for document listeners. */
  #lifetimeController = new AbortController();

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.#handleClick, { signal: this.#lifetimeController.signal });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#lifetimeController.abort();
    this.#fetchController?.abort();
  }

  /**
   * Resolves the product URL to open (if any) from a document click.
   * @param {MouseEvent} event
   */
  #handleClick = (event) => {
    if (!(event.target instanceof Element)) return;

    // Ignore clicks that originate inside the drawer itself.
    if (event.target.closest('product-details-drawer')) return;

    // Modifier-click should keep the normal "open in new tab" behaviour of the card link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event instanceof MouseEvent && event.button !== 0) return;

    let productUrl = '';

    const detailsButton = event.target.closest('.product-details-button');
    if (detailsButton instanceof HTMLElement) {
      productUrl = detailsButton.dataset.productUrl || '';
    } else {
      const card = event.target.closest('[data-details-drawer] product-card');
      if (!card) return;

      // Let interactive children (variant swatches, quick add, etc.) behave normally.
      if (event.target.closest('button, input, label, select')) return;

      const link = card.querySelector('a.product-card__link[href]') || card.querySelector('a[href]');
      productUrl = link instanceof HTMLAnchorElement ? link.href : '';
    }

    if (!productUrl) return;

    event.preventDefault();
    this.open(productUrl);
  };

  /**
   * Opens the drawer for a product URL, fetching and rendering its info.
   * @param {string} url
   */
  async open(url) {
    this.showDialog();
    this.#showLoading();

    try {
      const content = await this.#getContent(url);
      if (!content) {
        this.#showError();
        return;
      }
      this.#render(/** @type {Element} */ (content.cloneNode(true)));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.#showError();
    }
  }

  /**
   * Returns a cleaned `.product-information` node for the URL, from cache or network.
   * @param {string} url
   * @returns {Promise<Element | null>}
   */
  async #getContent(url) {
    const cached = this.#cache.get(url);
    if (cached) return cached;

    this.#fetchController?.abort();
    this.#fetchController = new AbortController();

    const response = await fetch(url, { signal: this.#fetchController.signal });
    if (!response.ok) throw new Error(`Failed to fetch product page: ${response.status}`);

    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const productInformation = doc.querySelector('.product-information');
    if (!productInformation) return null;

    const clone = /** @type {Element} */ (productInformation.cloneNode(true));
    this.#stripBuyButtons(clone);
    this.#normalizeGallery(clone);
    this.#cache.set(url, clone);

    return clone;
  }

  /**
   * Normalizes the extracted media gallery so the drawer always presents a single
   * main image with a thumbnail strip below — on every viewport and regardless of
   * the source product's template (grid or carousel presentation).
   *
   * Grid templates render a stacked desktop `<ul.media-gallery__grid>` and, when
   * their desktop control style isn't "thumbnails", only render the thumbnail
   * strip as a `desktop:hidden` mobile control. Without this, the drawer shows the
   * stacked grid on wide screens instead of the carousel.
   * @param {Element} root
   */
  #normalizeGallery(root) {
    const gallery = root.querySelector('media-gallery');
    if (!gallery) return;

    // Drop the desktop "grid" layout entirely; the drawer only shows the carousel.
    gallery.querySelector('.media-gallery__grid')?.remove();

    // Force carousel presentation so the slideshow is shown at all breakpoints.
    gallery.classList.remove(
      'media-gallery--grid',
      'media-gallery--one-column',
      'media-gallery--two-column',
      'media-gallery--large-first-image',
    );
    gallery.classList.add('media-gallery--carousel');
    gallery.dataset.presentation = 'carousel';

    // Prefer the thumbnail controls: surface them at every breakpoint and drop any
    // counter/dots controls so the drawer consistently shows a thumbnail strip.
    const controls = Array.from(gallery.querySelectorAll('slideshow-controls'));
    const thumbnailControls = controls.find((el) => el.hasAttribute('thumbnails'));
    if (!thumbnailControls) return;

    for (const control of controls) {
      if (control === thumbnailControls) {
        control.classList.remove('desktop:hidden', 'mobile:hidden');
        control.setAttribute('pagination-position', 'center');
      } else {
        control.remove();
      }
    }
  }

  /**
   * Removes buy-button / checkout UI from an extracted product-information node.
   * @param {Element} root
   */
  #stripBuyButtons(root) {
    for (const selector of BUY_BUTTON_SELECTORS) {
      root.querySelectorAll(selector).forEach((element) => element.remove());
    }
  }

  /**
   * Renders the product information node into the drawer.
   * @param {Element} content
   */
  #render(content) {
    const { drawerContent, loading } = this.refs;
    if (!(drawerContent instanceof HTMLElement)) return;

    this.#clearInjected();
    if (loading instanceof HTMLElement) loading.hidden = true;

    content.classList.add('product-details-drawer__injected');
    drawerContent.appendChild(content);
    drawerContent.scrollTo({ top: 0, behavior: 'instant' });
  }

  #showLoading() {
    const { loading } = this.refs;
    this.#clearInjected();
    if (loading instanceof HTMLElement) loading.hidden = false;
  }

  #showError() {
    const { drawerContent, loading } = this.refs;
    if (loading instanceof HTMLElement) loading.hidden = true;
    if (!(drawerContent instanceof HTMLElement)) return;

    this.#clearInjected();
    const message = document.createElement('p');
    message.className = 'product-details-drawer__injected product-details-drawer__error';
    message.textContent = "Sorry, we couldn't load this product right now.";
    drawerContent.appendChild(message);
  }

  /**
   * Removes any previously injected content (keeps the loading element in place).
   */
  #clearInjected() {
    this.querySelectorAll('.product-details-drawer__injected').forEach((element) => element.remove());
  }
}

if (!customElements.get('product-details-drawer')) {
  customElements.define('product-details-drawer', ProductDetailsDrawer);
}
