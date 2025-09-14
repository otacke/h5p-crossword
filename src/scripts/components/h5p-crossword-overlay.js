import Util from '@services/util.js';
import './h5p-crossword-overlay.scss';

/** Class representing the content */
export default class Overlay {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {HTMLElement} params.content Content to set.
   * @param {object} callbacks Callbacks.
   */
  constructor(params, callbacks = {}) {
    this.params = Util.extend({
      container: document.body,
      content: document.createElement('div'),
      styleBase: 'h5p-crossword-overlay',
      position: {
        offsetHorizontal : 0,
        offsetVertical : 0,
      },
      l10n: {
        closeWindow: 'Close',
      },
    }, params);

    this.callbacks = callbacks;
    this.callbacks.onClose = callbacks.onClose || (() => {});
    this.callbacks.onRead = callbacks.onRead || (() => {});

    this.isVisible = false;
    this.focusableElements = [];

    this.overlay = document.createElement('div');
    this.overlay.classList.add(`${this.params.styleBase}-outer-wrapper`);
    this.overlay.classList.add('h5p-crossword-invisible');
    this.overlay.setAttribute('role', 'dialog');
    if (this.params.l10n.title) {
      this.overlay.setAttribute('aria-label', this.params.l10n.title);
    }
    this.overlay.setAttribute('aria-modal', 'true');

    this.content = document.createElement('div');
    this.content.classList.add(`${this.params.styleBase}-content`);
    this.content.appendChild(this.params.content);

    this.buttonClose = document.createElement('button');
    this.buttonClose.classList.add(`${this.params.styleBase}-button-close`);
    this.buttonClose.setAttribute('title', this.params.l10n.closeWindow);
    this.buttonClose.setAttribute('disabled', 'disabled');
    this.buttonClose.addEventListener('click', () => {
      this.callbacks.onClose();
    });
    this.overlay.appendChild(this.buttonClose);

    this.overlay.appendChild(this.content);

    // Trap focus if overlay is visible
    document.addEventListener('focus', (event) => {
      if (!this.isVisible || this.focusableElements.length === 0) {
        return;
      }

      this.trapFocus(event);
    }, true);

    // Blocker
    this.blocker = document.createElement('div');
    this.blocker.classList.add('h5p-crossword-overlay-blocker');
    this.blocker.classList.add('display-none');
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.overlay;
  }

  /**
   * Set overlay content.
   * @param {HTMLElement} content Content to set.
   */
  setContent(content) {
    while (this.content.firstChild) {
      this.content.removeChild(this.content.firstChild);
    }
    this.content.appendChild(content);
    this.content.scrollTop = 0;
  }

  /**
   * Trap focus in overlay.
   * @param {Event} event Focus event.
   */
  trapFocus(event) {
    if (this.isChild(event.target)) {
      this.currentFocusElement = event.target;
      return; // Focus is inside overlay
    }

    // Focus was either on first or last overlay element
    if (this.currentFocusElement === this.focusableElements[0]) {
      this.currentFocusElement = this.focusableElements[this.focusableElements.length - 1];
    }
    else {
      this.currentFocusElement = this.focusableElements[0];
    }
    this.currentFocusElement.focus();
  }

  /**
   * Check whether an HTML element is a child of the overlay.
   * @param {HTMLElement} element Element to check.
   * @returns {boolean} True, if element is a child.
   */
  isChild(element) {
    const parent = element.parentNode;

    if (!parent) {
      return false;
    }

    if (parent === this.overlay) {
      return true;
    }

    return this.isChild(parent);
  }

  /**
   * Update list of focusable elements.
   */
  updateFocusableElements() {
    this.focusableElements = []
      .slice.call(
        this.overlay.querySelectorAll(
          'video, audio, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      )
      .filter((element) => element.getAttribute('disabled') !== 'true' && element.getAttribute('disabled') !== true);
  }

  /**
   * Show overlay.
   */
  show() {
    if (!this.blockerAppended) {
      this.container = document.body.querySelector('.h5p-container');
      this.container.appendChild(this.blocker);
    }
    this.blockerAppended = true;

    this.overlay.classList.remove('h5p-crossword-invisible');
    this.blocker.classList.remove('display-none');
    this.buttonClose.removeAttribute('disabled', 'disabled');

    setTimeout(() => {
      this.updateFocusableElements();
      if (this.focusableElements.length > 0) {
        this.focusableElements[0].focus();
      }

      // Read text content or image content
      const text = this.overlay.querySelector('.h5p-advanced-text');
      let image;

      if (text) {
        this.callbacks.onRead(text.innerText);
      }
      else {
        image = this.overlay.querySelector('.h5p-image > img');
      }

      if (image) {
        this.callbacks.onRead(image.getAttribute('alt') || '');
      }

      this.isVisible = true;

      this.resize();
    }, 0);
  }

  /**
   * Hide overlay.
   */
  hide() {
    this.isVisible = false;
    this.overlay.classList.add('h5p-crossword-invisible');
    this.blocker.classList.add('display-none');
    this.buttonClose.setAttribute('disabled', 'disabled');
  }

  /**
   * Resize.
   */
  resize() {
    if (this.container) {
      this.content.style.maxHeight = `calc(${this.container.offsetHeight}px - ${Overlay.CONTENT_MARGIN})`;
    }
  }
}

/** @constant {string} Content margin. */
Overlay.CONTENT_MARGIN = '7em';
