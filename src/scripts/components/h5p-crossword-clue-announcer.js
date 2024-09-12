import './h5p-crossword-clue-announcer.scss';

/** Class representing the content */
export default class CrosswordClueAnnouncer {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks) {

    this.params = params;
    this.callbacks = callbacks || {};

    this.content = document.createElement('div');
    this.content.classList.add('h5p-crossword-clue-announcer');

    this.clueId = document.createElement('span');
    this.clueId.classList.add('h5p-crossword-clue-announcer-clue-id');
    this.content.appendChild(this.clueId);

    this.clue = document.createElement('span');
    this.clue.classList.add('h5p-crossword-clue-announcer-clue');
    this.content.appendChild(this.clue);

    this.answerLength = document.createElement('span');
    this.answerLength.classList.add('h5p-crossword-clue-announcer-answer-length');
    this.content.appendChild(this.answerLength);
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Set the clue.
   * @param {object} params Parameters.
   * @param {string} params.orientation Across or down.
   * @param {number} params.clueId Number.
   * @param {string} params.clue Clue.
   * @param {number} params.answerLength Answer length.
   */
  setClue(params) {
    if (!params.orientation || !params.clueId || !params.clue || !params.answerLength) {
      return;
    }

    this.clueId.innerText = `${params.clueId} ${params.orientation}`;
    this.clue.innerText = params.clue;
    this.answerLength.innerText = `(${params.answerLength})`;
  }

  /**
   * Show.
   */
  show() {
    this.content.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.content.classList.add('display-none');
  }

  /**
   * Reset.
   */
  reset() {
    this.clueId.innerText = '';
    this.clue.innerText = '';
    this.answerLength.innerText = '';
  }
}
