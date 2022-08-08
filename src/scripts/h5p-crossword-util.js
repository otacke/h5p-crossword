// import charRegex from 'char-regex';

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
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
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
   * Retrive from localStorage.
   * @param {string} keyname Content id to retrieve content for.
   * @return {object|null} Stored object, null if not possible.
   */
  static getLocalStorage(keyname) {
    let stored;

    if (!window.localStorage || typeof keyname !== 'string') {
      return null;
    }

    try {
      stored = window.localStorage.getItem(keyname);
      if ( stored ) {
        stored = JSON.parse(stored);
      }
      return stored;
    }
    catch (error) {
      return null;
    }
  }

  /**
   * Save to LocalStorage.
   * @param {string} keyname Key name.
   * @param {object|undefined} [data] Data to store or undefined to delete.
   */
  static setLocalStorage(keyname, data) {
    if ( !window.localStorage || typeof keyname !== 'string') {
      return;
    }

    if (typeof data === 'undefined') {
      try {
        window.localStorage.removeItem(keyname);
      }
      catch (error) {
        return;
      }

      return;
    }

    try {
      window.localStorage.setItem(keyname, JSON.stringify(data));
    }
    catch (error) {
      return;
    }
  }

  /**
   * Determine whether any word contains graphemes.
   * @param {string[]} words Words to check.
   * @return {boolean} True, if any word contains graphemes. Else false.
   */
  static needsGraphemeSupport(words = []) {
    return words.some(word => word.length > Util.unicodeLength(word));
  }

  /**
   * Get substring considering unicode graphemes.
   * @param {string} text Text to get substring from.
   * @param {number} start Start index.
   * @param {number} [end] End index.
   * @return {string} Substring considering unicode graphemes.
   */
  static unicodeSubstring(text, start, end) {
    if (typeof text !== 'string'
      || typeof start !== 'number'
      || (typeof end !== 'number' && end !== undefined)) {
      return '';
    }

    return text
      .replace(Util.ANSI_REGEXP, '')
      .match(Util.TMP_REGEXP) // charRegex()
      .slice(start, end)
      .join('');
  }

  /**
   * Get number of unicode graphemes.
   * @param {string} text Text to count graphemes in.
   * @return {number} Number of unicode graphemes.
   */
  static unicodeLength(text) {
    if (typeof text !== 'string' || text === '') {
      return 0;
    }

    return text
      .replace(Util.ANSI_REGEXP, '')
      .match(Util.TMP_REGEXP).length; // charRegex()
  }

  /**
   * Get unicode grapheme at specified position.
   * @param {string} text Text to get grapheme from.
   * @param {number} index Position.
   * @return {string} Grapheme at specified position.
   */
  static unicodeCharAt(text, index) {
    if (typeof text !== 'string') {
      return '';
    }

    text = text
      .replace(Util.ANSI_REGEXP, '')
      .match(Util.TMP_REGEXP); // charRegex()

    if (text.length < index + 1) {
      return '';
    }

    return text[index];
  }

  /**
   * Convert string to uppercase with optional exceptions.
   * @param {string} text Text to be converted to uppercase.
   * @param {string[]} [exceptions=[]] List of characters to keep in lowercase or replace by others.
   * @return {string|null} String in uppercase or null if text was no string.
   */
  static toUpperCase(text, exceptions = []) {
    // Sanitize arguments
    if (typeof text !== 'string') {
      return null;
    }

    if (typeof exceptions === 'string') {
      exceptions = exceptions
        .split('')
        .map(exception => ({lowerCase: exception, upperCase: exception}));
    }

    if (!Array.isArray(exceptions)) {
      exceptions = [];
    }

    // Remove exceptions not containing valid values
    exceptions = exceptions.filter(exception => {
      return (
        typeof exception.lowerCase === 'string' && exception.lowerCase.length === 1 &&
        typeof exception.upperCase === 'string' && exception.upperCase.length === 1
      );
    });

    // Replace lowerCase exception in text with placeholder
    exceptions.forEach((exception, index) => {
      while (text.indexOf(exception.lowerCase) !== -1) {
        text = text.replace(exception.lowerCase, `[CROSSWORDPLACEHOLDER${index}]`);
      }
    });

    text = text.toUpperCase();

    // Replace placeholder in text with upperCase exception
    exceptions.forEach((exception, index) => {
      while (text.indexOf(`[CROSSWORDPLACEHOLDER${index}]`) !== -1) {
        text = text.replace(`[CROSSWORDPLACEHOLDER${index}]`, exception.upperCase);
      }
    });

    return text;
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

/**
 * @constant {string[]} Exceptions for Util.toUpperCase
 * Using text-transform: uppercase in CSS causes ß to be replaced by 'SS', not \u1e9e
 */
Util.UPPERCASE_EXCEPTIONS = [
  {
    lowerCase: 'ß',
    upperCase: '\u1e9e' // LATIN CAPITAL LETTER SHARP S
  }
];

/**
 * @constant {RegExp} Regular expression for matching ANSI escape codes.
 * @see {@link https://github.com/chalk/ansi-regex}
 */
Util.ANSI_REGEXP = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
  ].join('|'),
  'g'
);

/** @constant {string} Placeholder in text input fields */
Util.CHARACTER_PLACEHOLDER = '\uff3f';

/** @constant {string} Temporary fix for bug in charRegex */
Util.TMP_REGEXP = new RegExp(
  [
    '\\ud83c[\\udffb-\\udfff](?=\\ud83c[\\udffb-\\udfff])',
    '(?:[\\u0c15-\\u0c28\\u0c2a-\\u0c39]\\u0c4d[\\u0c15-\\u0c28\\u0c2a-\\u0c39]|[\\u0c15-\\u0c28\\u0c2a-\\u0c39\\u0c58-\\u0c5a][\\u0c3e-\\u0c44\\u0c46-\\u0c48\\u0c4a-\\u0c4c\\u0c62-\\u0c63]|[\\u0c15-\\u0c28\\u0c2a-\\u0c39\\u0c58-\\u0c5a][\\u0c01-\\u0c03\\u0c4d\\u0c55\\u0c56]|[\\u0c05-\\u0c0c\\u0c0e-\\u0c10\\u0c12-\\u0c14\\u0c60-\\u0c61(?:\\u0c15-\\u0c28\\u0c2a-\\u0c39(?!\\u0c4d))\\u0c66-\\u0c6f\\u0c78-\\u0c7e\\u0c58-\\u0c5a])',
    '(?:(?:\\ud83c\\udff4\\udb40\\udc67\\udb40\\udc62\\udb40(?:\\udc65|\\udc73|\\udc77)\\udb40(?:\\udc6e|\\udc63|\\udc6c)\\udb40(?:\\udc67|\\udc74|\\udc73)\\udb40\\udc7f)|[^\\ud800-\\udfff][\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff\\u1ab0-\\u1aff\\u1dc0-\\u1dff]?|[\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff\\u1ab0-\\u1aff\\u1dc0-\\u1dff]|(?:\\ud83c[\\udde6-\\uddff]){2}|[\\ud800-\\udbff][\\udc00-\\udfff]|[\\ud800-\\udfff])[\\ufe0e\\ufe0f]?(?:[\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff\\u1ab0-\\u1aff\\u1dc0-\\u1dff]|\\ud83c[\\udffb-\\udfff])?(?:\\u200d(?:[^\\ud800-\\udfff]|(?:\\ud83c[\\udde6-\\uddff]){2}|[\\ud800-\\udbff][\\udc00-\\udfff])[\\ufe0e\\ufe0f]?(?:[\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff\\u1ab0-\\u1aff\\u1dc0-\\u1dff]|\\ud83c[\\udffb-\\udfff])?)*'
  ].join('|'),
  'g'
);

export default Util;
