// Import required classes
import CrosswordContent from '@scripts/components/h5p-crossword-content.js';
import Util from '@services/util.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import '@styles/h5p-crossword.scss';

/** @constant {number} DOM_REGISTER_DELAY_MS Delay before resizing after DOM registered. */
const DOM_REGISTER_DELAY_MS = 100;

/** @constant {string} DEFAULT_DESCRIPTION Default description. */
export const DEFAULT_DESCRIPTION = 'Crossword';

/** @constant {object} view states */
export const VIEW_STATES = { task: 0, results: 1, solutions: 2 };

/**
 * Class for H5P Crossword.
 */
export default class Crossword extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('crossword'); // CSS class selector for content's iframe: h5p-crossword

    Util.addMixins(Crossword, [QuestionTypeContract, XAPI]);

    this.params = params;
    this.contentId = contentId;
    this.extras = extras;

    /*
     * this.params.behaviour.enableSolutionsButton and this.params.behaviour.enableRetry
     * are used by H5P's question type contract.
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */

    // Make sure all variables are set
    this.params = Util.extend({
      solutionWord: '',
      theme: {
        backgroundColor: '#173354',
      },
      behaviour: {
        enableSolutionsButton: true,
        enableRetry: true,
        enableInstantFeedback: false,
        scoreWords: true,
        applyPenalties: false,
        keepCorrectAnswers: false,
      },
      l10n: {
        across: 'across',
        down: 'down',
        checkAnswer: 'Check answer',
        // eslint-disable-next-line @stylistic/js/max-len
        couldNotGenerateCrossword: 'Could not generate a crossword with the given words. Please try again with fewer words or words that have more characters in common.',
        couldNotGenerateCrosswordTooFewWords: 'Could not generate a crossword. You need at least two words.',
        couldNotGenerateCrosswordTooManyWords: 'Could not generate a crossword. You have too many words.',
        // eslint-disable-next-line @stylistic/js/max-len
        problematicWords: 'Some words could not be placed. If you are using fixed words, please make sure that their position doesn\'t prevent other words from being placed. Words with the same alignment may not be placed touching each other. Problematic word(s): @words',
        showSolution: 'Show solution',
        tryAgain: 'Retry',
        extraClue: 'Extra clue',
        closeWindow: 'Close window',
        submitAnswer: 'Submit',
      },
      a11y: {
        // eslint-disable-next-line @stylistic/js/max-len
        crosswordGrid: 'Crossword grid. Use arrow keys to navigate and the keyboard to enter characters. Alternatively, use Tab to navigate to type the answers in Fill in the Blanks style fields instead of the grid.',
        column: 'column',
        row: 'row',
        across: 'across',
        down: 'down',
        empty: 'Empty',
        resultFor: 'Result for: @clue',
        correct: 'Correct',
        wrong: 'Wrong',
        point: 'Point',
        solutionFor: 'The solution for @clue is: @solution',
        extraClueFor: 'Open extra clue for @clue',
        letterSevenOfNine: 'Letter @position of @length',
        lettersWord: '@length letter word',
        check: 'Check the characters. The responses will be marked as correct, incorrect, or unanswered.',
        showSolution: 'Show the solution. The crossword will be filled with its correct solution.',
        retry: 'Retry the task. Reset all responses and start the task over again.',
        yourResult: 'You got @score out of @total points',
      },
    }, this.params);

    // Ensure to consider enableRetry for keepCorrectAnswers
    this.params.keepCorrectAnswers =
      this.params.behaviour.enableRetry &&
      this.params.behaviour.keepCorrectAnswers;

    /*
     * Remove values that match the default, so the regular stylesheet values
     * will be used to still allow CSS overrides via H5P's hook.
     */
    this.params.theme = this.getDifference(
      this.params.theme,
      {
        gridColor: '#000000',
        cellBackgroundColor: '#ffffff',
        cellColor: '#000000',
        clueIdColor: '#606060',
        cellBackgroundColorHighlight: '#3e8de8',
        cellColorHighlight: '#ffffff',
        clueIdColorHighlight: '#e0e0e0',
      },
    );

    // Set buttons
    this.initialButtons = {
      check: !this.params.behaviour.enableInstantFeedback,
      showSolution: this.params.behaviour.enableSolutionsButton,
      retry: this.params.behaviour.enableRetry,
    };

    const defaultLanguage = (extras.metadata) ? extras.metadata.defaultLanguage || 'en' : 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    // Sanitize for use as text
    for (let word in this.params.l10n) {
      this.params.l10n[word] = Util.stripHTML(Util.htmlDecode(this.params.l10n[word]));
    }

    // H5P.Question will add a . after yourResult for readspeaker
    this.params.a11y.yourResult = this.params.a11y.yourResult.replace(/\.$/, '');

    // this.previousState now holds the saved content state of the previous session
    this.previousState = this.extras.previousState || {};
    if (!this.previousState.crosswordLayout || !this.previousState.cells) {
      this.previousState = {};
    }

    this.content = new CrosswordContent(
      {
        scoreWords: this.params.behaviour.scoreWords,
        applyPenalties: this.params.behaviour.applyPenalties,
        theme: this.params.theme,
        contentId: this.contentId,
        instantFeedback: this.params.behaviour.enableInstantFeedback,
        l10n: {
          couldNotGenerateCrossword: this.params.l10n.couldNotGenerateCrossword,
          couldNotGenerateCrosswordTooFewWords: this.params.l10n.couldNotGenerateCrosswordTooFewWords,
          problematicWords: this.params.l10n.problematicWords,
          across: this.params.l10n.across,
          down: this.params.l10n.down,
          extraClue: this.params.l10n.extraClue,
          closeWindow: this.params.l10n.closeWindow,
        },
        a11y: this.params.a11y,
        poolSize: this.params.behaviour.poolSize,
        solutionWord: Util.toUpperCase(this.params.solutionWord, Util.UPPERCASE_EXCEPTIONS),
        words: this.params.words,
        previousState: this.previousState,
      },
      {
        onTableFilled: () => {
          this.handleContentFilled();
        },
        onInitialized: (result) => {
          this.handleContentInitialized(result);
        },
        onRead: (text) => {
          this.handleRead(text);
        },
      },
    );
  }

  /**
   * Register the DOM elements with H5P.Question
   */
  registerDomElements() {
    this.setViewState('task');

    // Register task introduction text
    if (this.params.taskDescription && this.params.taskDescription !== '') {
      this.introduction = document.createElement('div');
      this.introduction.innerHTML = this.params.taskDescription;
      this.setIntroduction(this.introduction);
    }

    // Register content with H5P.Question
    this.setContent(this.content.getDOM());

    // Previous state might have been a filled table
    if (this.params.behaviour.enableInstantFeedback && this.content.isTableFilled()) {
      this.checkAnswer();
    }

    // Content may need a resize once it's displayed (media queries or pseudo elements)
    Util.waitForDOM('.h5p-crossword-input-container', () => {
      setTimeout(() => {
        this.trigger('resize');
      }, DOM_REGISTER_DELAY_MS);
    });
  }

  /**
   * Handle content initialized.
   * @param {boolean} result initialization success.
   */
  handleContentInitialized(result) {
    if (result) {
      // Register Buttons
      this.addButtons();
    }

    this.on('resize', () => {
      this.content.resize();
    });
  }

  /**
   * Add all the buttons that shall be passed to H5P.Question.
   */
  addButtons() {
    // Check answer button
    this.addButton('check-answer', this.params.l10n.checkAnswer, () => {
      this.checkAnswer();
      this.trigger(this.getXAPIAnswerEvent());
    }, this.initialButtons.check, {
      'aria-label': this.params.a11y.check,
    }, {
      contentData: this.extras,
      textIfSubmitting: this.params.l10n.submitAnswer,
    });

    // Show solution button
    this.addButton('show-solution', this.params.l10n.showSolution, () => {
      this.showSolutions();
    }, this.initialButtons.showSolution, {
      'aria-label': this.params.a11y.showSolution,
    }, {});

    // Retry button
    this.addButton('try-again', this.params.l10n.tryAgain, () => {
      this.resetTask(
        { keepCorrectAnswers: this.params.behaviour.keepCorrectAnswers },
      );
    }, this.initialButtons.retry, {
      'aria-label': this.params.a11y.retry,
    }, {});
  }

  /**
   * Check answer.
   */
  checkAnswer() {
    if (this.getViewState().id !== VIEW_STATES.task) {
      return; // Prevent double checking
    }

    if (!this.content) {
      return; // Call by previous state, not ready yet
    }

    this.setViewState('results');

    this.content.checkAnswer();

    this.hideButton('check-answer');

    const score = this.getScore();
    const maxScore = this.getMaxScore();

    const textScore = H5P.Question.determineOverallFeedback(
      this.params.overallFeedback, score / maxScore);

    // H5P.Question expects ':num' and ':total'
    const ariaMessage = this.params.a11y.yourResult
      .replace('@score', ':num')
      .replace('@total', ':total');

    this.setFeedback(
      textScore,
      score,
      maxScore,
      ariaMessage,
    );

    if (this.params.behaviour.enableSolutionsButton) {
      this.showButton('show-solution');
    }

    if (this.params.behaviour.enableRetry) {
      this.showButton('try-again');
    }
  }

  /**
   * Let H5P.Question read some text.
   * @param {string} text Text to read.
   */
  handleRead(text) {
    this.read(text);
  }

  /**
   * Handle content is filled.
   */
  handleContentFilled() {
    if (this.getMaxScore() > 0 && this.getScore() === this.getMaxScore()) {
      this.checkAnswer();
      this.trigger(this.getXAPIAnswerEvent());
    }
    else {
      this.showButton('check-answer');
    }
  }

  /**
   * Determine whether the task has been passed by the user.
   * @returns {boolean} True if user passed or task is not scored.
   */
  isPassed() {
    return this.getScore() >= this.getMaxScore() || !this.getMaxScore() || this.getMaxScore() === 0;
  }

  /**
   * Get tasks title.
   * @returns {string} Title.
   */
  getTitle() {
    let raw;
    if (this.extras.metadata) {
      raw = this.extras.metadata.title;
    }
    raw = raw || DEFAULT_DESCRIPTION;

    // H5P Core function: createTitle
    return H5P.createTitle(raw);
  }

  /**
   * Compute shallow difference of two objects.
   * @param {object} minuend Object to subtract from.
   * @param {object} subtrahend Object to subtract from minuend.
   * @returns {object} Object diff.
   */
  getDifference(minuend, subtrahend) {
    for (let property in subtrahend) {
      if (minuend[property] === subtrahend[property]) {
        delete minuend[property];
      }
    }

    return minuend; // Yes, technically that was changed in-place already ...
  }

  /**
   * Get view state.
   * @returns {object} Current view state, stateName and id.
   */
  getViewState() {
    let state = 'undefined';

    for (const key in VIEW_STATES) {
      if (VIEW_STATES[key] === this.viewState) {
        state = key;
        break;
      }
    }

    return {
      stateName: state,
      id: this.viewState,
    };
  }

  /**
   * Set view state.
   * @param {string|number} state State to be set.
   */
  setViewState(state) {
    if (
      typeof state === 'string' &&
      VIEW_STATES[state] !== undefined
    ) {
      this.viewState = VIEW_STATES[state];
    }
    else if (
      typeof state === 'number' &&
      Object.values(VIEW_STATES).includes(state)
    ) {
      this.viewState = state;
    }
  }
}
