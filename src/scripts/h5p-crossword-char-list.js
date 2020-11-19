import Util from './h5p-crossword-util';

/** Class representing the content */
export default class CrosswordCharList {
  /**
   * @constructor
   * @param {object} params Parameters.
   */
  constructor(params = {}) {
    this.params = Util.extend({
      a11y: {
        listLabel: ''
      }
    }, params);

    this.charMarked = null;

    this.content = this.buildListContainer({
      listLabel: this.params.a11y.listLabel
    });
  }

  /**
   * Get list DOM.
   * @return {HTMLElement} List DOM.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Build list container.
   * @param {object} params Parameters.
   * @return {HTMLElement} List container.
   */
  buildListContainer(params) {
    const content = document.createElement('div');
    content.classList.add('h5p-crossword-input-fields-group-solution-container');
    content.classList.add('h5p-crossword-display-none');

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
      switch (event.keyCode) {
        case 13: // Enter
        // intentional fallthrough
        case 32: // Space
          if (event.target !== event.currentTarget) {
            // Ignore children
            return;
          }

          // Expand/collapse group for ARIA
          if (currentExpandedState === 'false') {
            this.list.setAttribute('aria-expanded', 'true');
            if (char) {
              // Focus on previously tabbed element
              char.setAttribute('tabIndex', '0');
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
   * @param {HTMLElement} [params.scoreExplanation] Score explanation.
   * @param {string} [params.char] Character to display.
   * @return {HTMLElement} List item.
   */
  buildListItem(params) {
    const charWrapper = document.createElement('span');
    charWrapper.classList.add('h5p-crossword-input-fields-group-solution-char-wrapper');
    charWrapper.setAttribute('role', 'listitem');
    charWrapper.setAttribute('tabIndex', '-1');
    charWrapper.setAttribute('aria-label', params.ariaLabel);

    // Visual style
    if (params.result === 'neutral') {
      charWrapper.classList.add('h5p-crossword-solution-no-input');
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
    charWrapper.addEventListener('focus', event => {
      // Remember this char had focus
      this.charMarked = event.target;
    });

    // on keydown
    charWrapper.addEventListener('keydown', event => {
      const firstChild = event.target.parentNode.firstChild;
      const lastChild = event.target.parentNode.lastChild;

      switch (event.keyCode) {

        // Focus previous solution word
        case 37: // Left
        // intentional fallthrough
        case 38: // Top
          event.preventDefault();
          if (event.target.previousSibling) {
            event.target.setAttribute('tabindex', '-1');
            event.target.previousSibling.setAttribute('tabIndex', '0');
            event.target.previousSibling.focus();
          }
          break;

        // Focus next solution word
        case 39: // Right
        // intentional fallthrough
        case 40: // Down
          event.preventDefault();
          if (event.target.nextSibling) {
            event.target.setAttribute('tabindex', '-1');
            event.target.nextSibling.setAttribute('tabIndex', '0');
            event.target.nextSibling.focus();
          }
          break;

        // Focus first solution word
        case 36: // Home
          event.preventDefault();
          if (event.target !== firstChild) {
            event.target.setAttribute('tabindex', '-1');
            firstChild.setAttribute('tabIndex', '0');
            firstChild.focus();
          }
          break;

        // Focus last solution word
        case 35: // End
          event.preventDefault();
          if (event.target !== lastChild) {
            event.target.setAttribute('tabindex', '-1');
            lastChild.setAttribute('tabIndex', '0');
            lastChild.focus();
          }
          break;
      }
    });

    // Char field
    const char = document.createElement('span');
    char.classList.add('h5p-crossword-input-fields-group-solution-char');
    char.innerHTML = (!params.char || params.char.trim() === ' ') ? '&nbsp;' : params.char;
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

    params.forEach(param => {
      this.list.appendChild(this.buildListItem(param));
    });
  }

  /**
   * Show solution.
   */
  show() {
    this.content.classList.remove('h5p-crossword-display-none');
  }

  /**
   * Hide solution.
   */
  hide() {
    this.content.classList.add('h5p-crossword-display-none');
  }

  /**
   * Enable.
   */
  enable() {
    // Retrieve previous tabIndex states.
    if (this.tabIndexState && this.tabIndexState.list) {
      this.list.setAttribute('tabIndex', this.tabIndexState.list);
    }

    if (this.tabIndexState && this.tabIndexState.listItems) {
      const listChildren = this.list.children;
      for (let i = 0; i < listChildren.length; i++) {
        listChildren[i].setAttribute('tabIndex', this.tabIndexState.listItems[i]);
      }
    }
  }

  /**
   * Disable.
   */
  disable() {
    // Store current tabIndex states.
    const listItems = [];
    const listChildren = this.list.children;
    for (let i = 0; i < listChildren.length; i++) {
      listItems.push(listChildren[i].getAttribute('tabIndex'));
      listChildren[i].setAttribute('tabIndex', '-1');
    }

    this.tabIndexState = {
      list: this.list.getAttribute('tabIndex'),
      listItems: listItems
    };

    this.list.setAttribute('tabIndex', '-1');
  }

  /**
   * Reset.
   */
  reset() {
    this.list.innerHTML = '';
    this.list.setAttribute('aria-expanded', 'false');
    this.list.setAttribute('tabindex', '0');

    this.charMarked = null;
    this.tabIndexState = null;
  }
}
