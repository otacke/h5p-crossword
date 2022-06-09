import charRegex from 'char-regex';

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
      .match(charRegex())
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
      .match(charRegex()).length;
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
      .match(charRegex());

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

export default Util;
