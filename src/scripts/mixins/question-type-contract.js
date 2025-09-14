import { VIEW_STATES } from '@scripts/h5p-crossword.js';

/**
 * Mixin containing methods for H5P Question Type contract.
 */
export default class QuestionTypeContract {
  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    if (!this.content) {
      return false;
    }

    return this.content.getAnswerGiven();
  }

  /**
   * Get latest score.
   * @returns {number} latest score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    if (!this.content) {
      return 0;
    }

    return this.content.getScore();
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    if (!this.content) {
      return 0;
    }

    return this.content.getMaxScore();
  }

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    if (!this.content) {
      return;
    }

    this.setViewState('solutions');

    this.hideButton('check-answer');
    this.hideButton('show-solution');

    this.content.showSolutions();

    this.trigger('resize');
  }

  /**
   * Reset task.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.keepCorrectAnswers] If true, correct answers should be kept.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask(params = {}) {
    if (!this.content) {
      return;
    }

    if (
      this.getViewState().id !== VIEW_STATES.results ||
      this.getScore() === this.getMaxScore()
    ) {
      params.keepCorrectAnswers = false;
    }

    this.contentWasReset = !params.keepCorrectAnswers;

    if (this.initialButtons.check) {
      this.showButton('check-answer');
    }
    else {
      this.hideButton('check-answer');
    }

    if (this.initialButtons.showSolution) {
      this.showButton('show-solution');
    }
    else {
      this.hideButton('show-solution');
    }

    if (this.initialButtons.retry) {
      this.showButton('try-again');
    }
    else {
      this.hideButton('try-again');
    }

    this.setViewState('task');

    this.trigger('resize');

    this.removeFeedback();

    this.content.reset({ keepCorrectAnswers: params.keepCorrectAnswers });
    this.content.enable();
  }

  /**
   * Get xAPI data.
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    return {
      statement: this.getXAPIAnswerEvent().data.statement,
    };
  }

  /**
   * Answer call to return the current state.
   * @returns {object} Current state.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-7}
   */
  getCurrentState() {
    if (!this.getAnswerGiven()) {
      // Nothing relevant to store, but previous state in DB must be cleared after reset
      return this.contentWasReset ? {} : undefined;
    }

    return this.content.getCurrentState();
  }

  /**
   * Set current state.
   * Candidate for question type contract in H5P core.
   * @param {object} state State to set, must match return value from getCurrentState.
   */
  setCurrentState(state = {}) {
    this.content.setCurrentState(state);
  }
}
