import Util from '@services/util.js';
import './h5p-crossword-char-list.scss';

/** Class representing the content */
export default class CrosswordCharList {
  /**
   * @class
   * @param {object} params Parameters.
   */
  constructor(params = {}) {
    this.params = Util.extend({
      a11y: {
        listLabel: '',
      },
    }, params);

    this.charMarked = null;

    this.content = this.buildListContainer({
      listLabel: this.params.a11y.listLabel,
    });
  }

  /**
   * Get list DOM.
   * @returns {HTMLElement} List DOM.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Build list container.
   * @param {object} params Parameters.
   * @returns {HTMLElement} List container.
   */
  buildListContainer(params) {
    const content = document.createElement('div');
    content.classList.add('h5p-crossword-input-fields-group-solution-container');
    content.classList.add('display-none');

    const listWrapper = document.createElement('div');
    listWrapper.classList.add('h5p-crossword-input-fields-group-solution-inner');
    content.appendChild(listWrapper);

    this.list = document.createElement('div');
    this.list.classList.add('h5p-crossword-input-fields-group-solution-word');
    this.list.setAttribute('role', 'list');
    this.list.setAttribute('aria-label', params.listLabel);
    this.list.setAttribute('aria-expanded', 'false');
    this.list.setAttribute('tabindex', '0');
    listWrapper.appendChild(this.list);

    this.list.addEventListener('keydown', (event) => {
      const char = this.charMarked || this.list.firstChild;

      const currentExpandedState = this.list.getAttribute('aria-expanded');
      switch (event.code) {
        case 'Enter': // Enter
        // intentional fallthrough
        case 'Space': // Space
          if (event.target !== event.currentTarget) {
            // Ignore children
            return;
          }

          // Expand/collapse group for ARIA
          if (currentExpandedState === 'false') {
            this.list.setAttribute('aria-expanded', 'true');
            if (char) {
              // Focus on previously tabbed element
              char.setAttribute('tabindex', '0');
              char.focus();
            }
          }
          else {
            this.list.setAttribute('aria-expanded', 'false');
            if (char) {
              char.setAttribute('tabindex', '-1');
            }
          }
          break;
      }
    });

    return content;
  }

  /**
   * Build single list item.
   * @param {object} params Parameters.
   * @param {string} params.result Result (neutral|correct|wrong).
   * @param {string} params.ariaLabel Aria label.
   * @param {HTMLElement} [params.scoreExplanation] Score explanation.
   * @param {string} [params.char] Character to display.
   * @returns {HTMLElement} List item.
   */
  buildListItem(params) {
    const charWrapper = document.createElement('span');
    charWrapper.classList.add('h5p-crossword-input-fields-group-solution-char-wrapper');
    charWrapper.setAttribute('role', 'listitem');
    charWrapper.setAttribute('tabindex', '-1');
    charWrapper.setAttribute('aria-label', params.ariaLabel);

    // Visual style
    if (params.result === 'neutral') {
      charWrapper.classList.add('h5p-crossword-solution-no-input');

      if (params.char === ' ' || params.char === Util.CHARACTER_PLACEHOLDER) {
        charWrapper.classList.add('h5p-crossword-solution-no-char');
      }
    }
    else if (params.result === 'correct') {
      charWrapper.classList.add('h5p-crossword-solution-correct');
    }
    else {
      charWrapper.classList.add('h5p-crossword-solution-wrong');
    }

    // Score explanation
    if (params.scoreExplanation) {
      charWrapper.appendChild(params.scoreExplanation);
    }

    // on focus
    charWrapper.addEventListener('focus', (event) => {
      // Remember this char had focus
      this.charMarked = event.target;
    });

    // on keydown
    charWrapper.addEventListener('keydown', (event) => {
      const firstChild = event.target.parentNode.firstChild;
      const lastChild = event.target.parentNode.lastChild;

      switch (event.key) {

        // Focus previous solution word
        case 'ArrowLeft':
        // intentional fallthrough
        case 'ArrowUp':
          event.preventDefault();
          if (event.target.previousSibling) {
            event.target.setAttribute('tabindex', '-1');
            event.target.previousSibling.setAttribute('tabindex', '0');
            event.target.previousSibling.focus();
          }
          break;

        // Focus next solution word
        case 'ArrowRight':
        // intentional fallthrough
        case 'ArrowDown':
          event.preventDefault();
          if (event.target.nextSibling) {
            event.target.setAttribute('tabindex', '-1');
            event.target.nextSibling.setAttribute('tabindex', '0');
            event.target.nextSibling.focus();
          }
          break;

        // Focus first solution word
        case 'Home':
          event.preventDefault();
          if (event.target !== firstChild) {
            event.target.setAttribute('tabindex', '-1');
            firstChild.setAttribute('tabindex', '0');
            firstChild.focus();
          }
          break;

        // Focus last solution word
        case 'End':
          event.preventDefault();
          if (event.target !== lastChild) {
            event.target.setAttribute('tabindex', '-1');
            lastChild.setAttribute('tabindex', '0');
            lastChild.focus();
          }
          break;
      }
    });

    // Char field
    const char = document.createElement('span');
    char.classList.add('h5p-crossword-input-fields-group-solution-char');
    char.innerHTML = (!params.char || params.char.trim() === ' ') ?
      '&nbsp;' :
      Util.toUpperCase(params.char, Util.UPPERCASE_EXCEPTIONS);
    charWrapper.appendChild(char);

    return charWrapper;
  }

  /**
   * Set characters in list.
   * @param {object[]} params Parameters for chars.
   */
  setChars(params) {
    // Erase previous solution
    this.reset();

    params.forEach((param) => {
      this.list.appendChild(this.buildListItem(param));
    });
  }

  /**
   * Show solution.
   */
  show() {
    this.content.classList.remove('display-none');
  }

  /**
   * Hide solution.
   */
  hide() {
    this.content.classList.add('display-none');
  }

  /**
   * Enable.
   */
  enable() {
    // Retrieve previous tabindex states.
    if (this.tabindexState && this.tabindexState.list) {
      this.list.setAttribute('tabindex', this.tabindexState.list);
    }

    if (this.tabindexState && this.tabindexState.listItems) {
      const listChildren = this.list.children;
      for (let i = 0; i < listChildren.length; i++) {
        listChildren[i].setAttribute('tabindex', this.tabindexState.listItems[i]);
      }
    }
  }

  /**
   * Disable.
   */
  disable() {
    // Store current tabindex states.
    const listItems = [];
    const listChildren = this.list.children;
    for (let i = 0; i < listChildren.length; i++) {
      listItems.push(listChildren[i].getAttribute('tabindex'));
      listChildren[i].setAttribute('tabindex', '-1');
    }

    this.tabindexState = {
      list: this.list.getAttribute('tabindex'),
      listItems: listItems,
    };

    this.list.setAttribute('tabindex', '-1');
  }

  /**
   * Reset.
   */
  reset() {
    this.list.innerHTML = '';
    this.list.setAttribute('aria-expanded', 'false');
    this.list.setAttribute('tabindex', '0');

    this.charMarked = null;
    this.tabindexState = null;
  }
}
