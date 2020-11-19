/** Class for utility functions */
class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @param {object} arguments Objects to be merged.
   * @return {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          if (typeof arguments[0][key] === 'object' && typeof arguments[i][key] === 'object') {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Retrieve true string from HTML encoded string.
   * @param {string} input Input string.
   * @return {string} Output string.
   */
  static htmlDecode(input) {
    var dparser = new DOMParser().parseFromString(input, 'text/html');
    return dparser.documentElement.textContent;
  }

  /**
   * Retrieve string without HTML tags.
   * @param {string} input Input string.
   * @return {string} Output string.
   */
  static stripHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * Create empty array of arbitrary dimension.
   * @param {length} Array length.
   * @return {}
   */
  static createArray(length) {
    const arr = new Array(length || 0);
    let i = length;

    if (arguments.length > 1) {
      const args = Array.prototype.slice.call(arguments, 1);
      while (i--) {
        arr[length - 1 - i] = Util.createArray.apply(this, args);
      }
    }

    return arr;
  }

  /**
   * Shuffle array.
   * @param {object[]} array Array.
   * @return {object[]} Shuffled array.
   */
  static shuffleArray(array) {
    let j, x, i;
    for (i = array.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = array[i];
      array[i] = array[j];
      array[j] = x;
    }

    return array;
  }

  /**
   * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
   * Cmp. https://tools.ietf.org/html/rfc5646
   * @param {string} languageTag Language tag.
   * @return {string} Formatted language tag.
   */
  static formatLanguageCode(languageCode) {
    if (typeof languageCode !== 'string') {
      return languageCode;
    }

    /*
     * RFC 5646 states that language tags are case insensitive, but
     * recommendations may be followed to improve human interpretation
     */
    const segments = languageCode.split('-');
    segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
    if (segments.length > 1) {
      segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
    }
    languageCode = segments.join('-');

    return languageCode;
  }

  /**
   * Wait for DOM element to be attached to DOM.
   * @param {string} selector CSS selector for DOM element.
   * @param {function} success Function to call once element is attached.
   * @param {function} [error] Function to call if element wasn't found (in time).
   * @param {number} [tries=50] Number of maximum tries, negative for infinite.
   * @param {number} [interval=100] Time interval in ms to check for element.
   */
  static waitForDOM(selector, success, error = (() => {}), tries = 50, interval = 100) {
    if (tries === 0 || !selector || typeof success !== 'function' || typeof error !== 'function') {
      error();
      return;
    }

    // Try to keep sensible
    interval = Math.max(interval, 50);

    const content = document.querySelector(selector);
    if (!content) {
      setTimeout(() => {
        this.waitForDOM(selector, success, error, (tries < 0) ? -1 : tries - 1, interval);
      }, interval);
      return;
    }

    success();
  }
}

/** @constant {number[]} KeyEventListener key codes of control symbols */
Util.CONTROL_KEY_CODES = [
  8, 9, 13, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 45, 46, 91,
  92, 93, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 144, 145
];

export default Util;
