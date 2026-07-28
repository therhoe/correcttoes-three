import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

/**
 * A horizontal row of product-type "circle" filters that drives the same
 * `filter.p.product_type` facet as the collection sidebar.
 *
 * Single-select: clicking an item replaces any existing product-type filter
 * with just the clicked type. Clicking the currently-selected type clears
 * the filter. The sidebar checkboxes remain multi-select.
 *
 * @extends {Component}
 */
class TypeFilter extends Component {
  /** @type {AbortController} */
  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#abortController;
    this.addEventListener('click', this.#handleClick, { signal });
    document.addEventListener(ThemeEvents.FilterUpdate, this.#syncActiveState, { signal });
    window.addEventListener('popstate', this.#syncActiveState, { signal });

    this.#syncActiveState();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController.abort();
  }

  /**
   * The facet parameter this section drives.
   * @returns {string}
   */
  get filterParam() {
    return this.dataset.filterParam || 'filter.p.product_type';
  }

  /**
   * Replaces the product-type filter with the clicked type, or clears it if
   * the clicked type was already the only active one. Re-renders via the
   * facets form so the product grid and sidebar stay in sync.
   * @param {MouseEvent} event
   */
  #handleClick = (event) => {
    if (!(event.target instanceof Element)) return;

    const item = event.target.closest('.type-filter__item');
    if (!(item instanceof HTMLElement)) return;

    const productType = item.dataset.productType;
    if (!productType) return;

    const facetsForm = document.querySelector('facets-form-component');

    // No facets form on the page (filtering disabled, or JS for it not loaded yet) —
    // let the anchor navigate normally so the filter still works.
    if (!facetsForm || typeof (/** @type {any} */ (facetsForm).updateFiltersByURL) !== 'function') {
      return;
    }

    event.preventDefault();

    const url = new URL(window.location.href);
    const { searchParams } = url;
    const current = searchParams.getAll(this.filterParam);
    const isOnlyActive = current.length === 1 && current[0] === productType;

    searchParams.delete(this.filterParam);
    if (!isOnlyActive) {
      searchParams.append(this.filterParam, productType);
    }

    searchParams.delete('page');

    /** @type {any} */ (facetsForm).updateFiltersByURL(url.toString());
  };

  /**
   * Reflects the active product types (from the current URL) onto the items.
   */
  #syncActiveState = () => {
    const active = new URL(window.location.href).searchParams.getAll(this.filterParam);

    for (const item of this.querySelectorAll('.type-filter__item')) {
      if (!(item instanceof HTMLElement)) continue;

      const productType = item.dataset.productType;
      const isActive = productType != null && active.includes(productType);

      item.classList.toggle('type-filter__item--active', isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'true');
      } else {
        item.removeAttribute('aria-current');
      }
    }
  };
}

if (!customElements.get('type-filter')) {
  customElements.define('type-filter', TypeFilter);
}
