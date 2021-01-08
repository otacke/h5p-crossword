// Import required classes
import CrosswordContent from './h5p-crossword-content';
import Util from './h5p-crossword-util';

/**
 * Class for H5P Crossword.
 */
export default class Crossword extends H5P.Question {
  /**
   * @constructor
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('crossword'); // CSS class selector for content's iframe: h5p-crossword

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
      behaviour: {
        enableSolutionsButton: true,
        enableRetry: true,
        enableInstantFeedback: false
      },
      l10n: {
        across: 'across',
        down: 'down',
        checkAnswer: 'Check answer',
        couldNotGenerateCrossword: 'Could not generate a crossword with the given words. Please try again.',
        showSolution: 'Show solution',
        tryAgain: 'Retry',
        extraClue: 'Extra clue',
        closeWindow: 'Close window'
      },
      a11y: {
        crosswordGrid: 'Crossword grid. Use arrow keys to navigate and keyboard to enter characters. Use tab to use input fields instead.',
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
        yourResult: 'You got @score out of @total points.'
      }
    }, this.params);

    const defaultLanguage = (extras.metadata) ? extras.metadata.defaultLanguage || 'en' : 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    // Sanitize for use as text
    for (let word in this.params.l10n) {
      this.params.l10n[word] = Util.stripHTML(Util.htmlDecode(this.params.l10n[word]));
    }

    // this.previousState now holds the saved content state of the previous session
    this.previousState = this.extras.previousState || {};
    if (!this.previousState.crosswordLayout || !this.previousState.cells) {
      this.previousState = {};
    }

    // Only support uppercase
    this.params.words = this.params.words
      .filter(word => {
        return (
          typeof word.answer !== 'undefined' &&
          typeof word.clue !== 'undefined'
        );
      })
      .map(word => {
        word.answer = Util.stripHTML(Util.htmlDecode(Util.toUpperCase(word.answer, Util.UPPERCASE_EXCEPTIONS)));
        word.clue = Util.stripHTML(Util.htmlDecode(word.clue));
        return word;
      });

    /**
     * Register the DOM elements with H5P.Question
     */
    this.registerDomElements = () => {
      // Register task introduction text
      if (this.params.taskDescription && this.params.taskDescription !== '') {
        this.introduction = document.createElement('div');
        this.introduction.innerHTML = this.params.taskDescription;
        this.setIntroduction(this.introduction);
      }

      this.content = new CrosswordContent(
        {
          backgroundImage: this.params.behaviour.backgroundImage,
          contentId: this.contentId,
          instantFeedback: this.params.behaviour.enableInstantFeedback,
          l10n: {
            couldNotGenerateCrossword: this.params.l10n.couldNotGenerateCrossword,
            across: this.params.l10n.across,
            down: this.params.l10n.down,
            extraClue: this.params.l10n.extraClue,
            closeWindow: this.params.l10n.closeWindow
          },
          a11y: this.params.a11y,
          poolSize: this.params.behaviour.poolSize,
          solutionWord: Util.toUpperCase(this.params.solutionWord.replace(/'\s'/g, ''), Util.UPPERCASE_EXCEPTIONS),
          words: this.params.words,
          previousState: this.previousState
        },
        {
          onInitialized: (result) => {
            this.handleContentInitialized(result);
          },
          onRead: text => {
            this.handleRead(text);
          }
        }
      );

      // Register content with H5P.Question
      this.setContent(this.content.getDOM());

      // Content may need a resize once it's displayed (media queries or pseudo elements)
      Util.waitForDOM('.h5p-crossword-input-container', () => {
        setTimeout(() => {
          this.trigger('resize');
        }, 100);
      });
    };

    /**
     * Handle content initialized.
     * @param {boolean} result initialization success.
     */
    this.handleContentInitialized = (result) => {
      if (result) {
        // Register Buttons
        this.addButtons();
      }

      this.on('resize', () => {
        this.content.resize();
      });
    };

    /**
     * Add all the buttons that shall be passed to H5P.Question.
     */
    this.addButtons = () => {
      // Check answer button
      this.addButton('check-answer', this.params.l10n.checkAnswer, () => {
        this.checkAnswer();
        this.trigger(this.getXAPIAnswerEvent());
      }, true, {
        'aria-label': this.params.a11y.check
      }, {});

      // Show solution button
      this.addButton('show-solution', this.params.l10n.showSolution, () => {
        this.showSolutions();
      }, false, {
        'aria-label': this.params.a11y.showSolution
      }, {});

      // Retry button
      this.addButton('try-again', this.params.l10n.tryAgain, () => {
        this.resetTask();
      }, false, {
        'aria-label': this.params.a11y.retry
      }, {});
    };

    /**
     * Check answer.
     */
    this.checkAnswer = () => {
      this.content.checkAnswer();

      this.hideButton('check-answer');

      const score = this.getScore();
      const maxScore = this.getMaxScore();

      const textScore = H5P.Question.determineOverallFeedback(
        this.params.overallFeedback, score / maxScore);

      const ariaMessage = this.params.a11y.yourResult
        .replace('@score', score)
        .replace('@total', maxScore);

      this.setFeedback(
        textScore,
        score,
        maxScore,
        ariaMessage
      );

      if (this.params.behaviour.enableSolutionsButton) {
        this.showButton('show-solution');
      }

      if (this.params.behaviour.enableRetry) {
        this.showButton('try-again');
      }
    };

    /**
     * Let H5P.Question read some text.
     * @param {string} text Text to read.
     */
    this.handleRead = (text) => {
      this.read(text);
    };

    /**
     * Check if result has been submitted or input has been given.
     * @return {boolean} True, if answer was given.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
     */
    this.getAnswerGiven = () => this.content.getAnswerGiven();

    /**
     * Get latest score.
     * @return {number} latest score.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
     */
    this.getScore = () => this.content.getScore();

    /**
     * Get maximum possible score.
     * @return {number} Score necessary for mastering.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
     */
    this.getMaxScore = () => this.content.getMaxScore();

    /**
     * Show solutions.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
     */
    this.showSolutions = () => {
      this.hideButton('show-solution');

      this.content.showSolutions();

      this.trigger('resize');
    };

    /**
     * Reset task.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
     */
    this.resetTask = () => {
      this.showButton('check-answer');
      this.hideButton('show-solution');
      this.hideButton('try-again');

      this.trigger('resize');

      this.removeFeedback();

      this.content.reset();
      this.content.enable();
    };

    /**
     * Get xAPI data.
     * @return {object} XAPI statement.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
     */
    this.getXAPIData = () => ({
      statement: this.getXAPIAnswerEvent().data.statement
    });

    /**
     * Build xAPI answer event.
     * @return {H5P.XAPIEvent} XAPI answer event.
     */
    this.getXAPIAnswerEvent = () => {
      const xAPIEvent = this.createXAPIEvent('answered');
      xAPIEvent.setScoredResult(this.getScore(), this.getMaxScore(), this,
        true, this.isPassed());
      xAPIEvent.data.statement.result.response = this.content.getXAPIResponse();

      return xAPIEvent;
    };

    /**
     * Create an xAPI event for Dictation.
     *
     * @param {string} verb Short id of the verb we want to trigger.
     * @return {H5P.XAPIEvent} Event template.
     */
    this.createXAPIEvent = (verb) => {
      const xAPIEvent = this.createXAPIEventTemplate(verb);
      Util.extend(
        xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
        this.getxAPIDefinition());
      return xAPIEvent;
    };

    /**
     * Get the xAPI definition for the xAPI object.
     *
     * @return {object} XAPI definition.
     */
    this.getxAPIDefinition = () => {
      const definition = {};
      definition.name = {};
      definition.name[this.languageTag] = this.getTitle();
      definition.name['en-US'] = definition.name[this.languageTag]; // Fallback
      definition.description = {};
      definition.description[this.languageTag] = `${this.getDescription()}`;
      definition.description['en-US'] = definition.description[this.languageTag]; // Fallback
      definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
      definition.interactionType = 'fill-in';
      definition.correctResponsesPattern = this.content.getXAPICorrectResponsesPattern();

      return definition;
    };

    /**
     * Determine whether the task has been passed by the user.
     *
     * @return {boolean} True if user passed or task is not scored.
     */
    this.isPassed = () => this.getScore() >= this.getMaxScore() || !this.getMaxScore() || this.getMaxScore() === 0;

    /**
     * Get tasks title.
     *
     * @return {string} Title.
     */
    this.getTitle = () => {
      let raw;
      if (this.extras.metadata) {
        raw = this.extras.metadata.title;
      }
      raw = raw || Crossword.DEFAULT_DESCRIPTION;

      // H5P Core function: createTitle
      return H5P.createTitle(raw);
    };

    /**
     * Get tasks description.
     * @return {string} Description.
     */
    this.getDescription = () => {
      const introduction = this.params.taskDescription || Crossword.DEFAULT_DESCRIPTION;
      const fields = this.content.getXAPIDescription();
      return `${introduction}${fields}`;
    };

    /**
     * Answer call to return the current state.
     * @return {object} Current state.
     */
    this.getCurrentState = () => {
      return this.content.getCurrentState();
    };
  }
}

/** @constant {string} */
Crossword.DEFAULT_DESCRIPTION = 'Crossword';
