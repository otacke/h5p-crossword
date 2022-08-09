// Import required classes
import CrosswordContent from './h5p-crossword-content';
import Titlebar from './h5p-crossword-titlebar';
import Util from './h5p-crossword-util';

import './../styles/h5p-crossword-titlebar.scss';
import './../styles/h5p-crossword-titlebar-button.scss';

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
      theme: {
        backgroundColor: '#173354'
      },
      behaviour: {
        enableSolutionsButton: true,
        enableRetry: true,
        enableInstantFeedback: false,
        scoreWords: true,
        applyPenalties: false
      },
      l10n: {
        across: 'across',
        down: 'down',
        checkAnswer: 'Check answer',
        couldNotGenerateCrossword: 'Could not generate a crossword with the given words. Please try again with fewer words or words that have more characters in common.',
        couldNotGenerateCrosswordTooFewWords: 'Could not generate a crossword. You need at least two words.',
        problematicWords: 'Problematic word(s): @words',
        showSolution: 'Show solution',
        tryAgain: 'Retry',
        extraClue: 'Extra clue',
        closeWindow: 'Close window',
        submitAnswer: 'Submit',
        confirmGraphemeHeader: 'Note about input mode',
        confirmGraphemeDialog: 'The language used in this crossword may require multiple key strokes per symbol. If you encounter problems on the grid, switch to the "No automatic movement" mode.',
        inputModeRegular: 'Input mode: automatic movement',
        inputModeNoAutoMove: 'Input mode: no automatic movement',
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
        yourResult: 'You got @score out of @total points',
        buttonInputModeRegular: 'Toggle input mode. Currently moving to next cell automatically.',
        buttonInputModeNoAutoMove: 'Toggle input mode. Currently not moving to next cell automatically.',
        switchedToInputModeRegular: 'Turned on moving to next cell automatically.',
        switchedToInputModeNoAutoMove: 'Turned off moving to next cell automatically.',
      }
    }, this.params);

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
        clueIdColorHighlight: '#e0e0e0'
      }
    );

    // Set buttons
    this.initialButtons = {
      check: !this.params.behaviour.enableInstantFeedback,
      showSolution: this.params.behaviour.enableSolutionsButton,
      retry: this.params.behaviour.enableRetry
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

    // Only support uppercase
    this.params.words = (this.params.words || [])
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

    this.needsGraphemeSupport = Util.needsGraphemeSupport(
      this.params.words.map(word => word.answer)
    );

    H5P.externalDispatcher.on('initialized', () => {
      if (!this.needsGraphemeSupport || !this.wasCrosswordGenerated) {
        return;
      }

      this.handleGraphemeInputDialog();

      const h5pContainer = this.content.getDOM().closest('.h5p-container.h5p-crossword');
      if (!h5pContainer) {
        return; // 'initialized' probably was not meant for us
      }

      const inputMode = Util.getLocalStorage(this.localStorageKeyname)
        ?.inputMode || 'regular';
      this.content.setInputMode(inputMode);

      const titlebar = new Titlebar(
        {
          l10n: {
            buttonInputModeRegular: this.params.l10n.inputModeRegular,
            buttonInputModeNoAutoMove: this.params.l10n.inputModeNoAutoMove
          },
          a11y: {
            buttonInputModeRegular: this.params.a11y.buttonInputModeRegular,
            buttonInputModeNoAutoMove: this.params.a11y.buttonInputModeNoAutoMove
          },
          inputMode: inputMode
        },
        {
          onClickButtonInputMode: () => {
            const active = titlebar.isButtonActive('inputMode');

            const storage = Util.getLocalStorage(this.localStorageKeyname) || {};
            storage.inputMode = active ? 'regular' : 'noAutoMove';
            Util.setLocalStorage(this.localStorageKeyname, storage);
            this.content.setInputMode(storage.inputMode);

            const message = (active) ?
              this.params.a11y.switchedToInputModeRegular :
              this.params.a11y.switchedToInputModeNoAutoMove;
            this.read(message);
          }
        }
      );
      h5pContainer.prepend(titlebar.getDOM());
    });
  }

  /**
   * Handle grapheme input dialog to confirm
   */
  handleGraphemeInputDialog() {
    // Build keyname for local storage
    const base = H5PIntegration?.baseUrl ?
      `${H5PIntegration?.baseUrl}-` :
      '';
    const id = this.isRoot() ? this.contentId : this.subContentId;
    this.localStorageKeyname = `${base}H5P-${Crossword.DEFAULT_DESCRIPTION}-${id}-settings`;

    if (!this.needsGraphemeSupport) {
      // Remove potential previous value in local storage
      Util.setLocalStorage(this.localStorageKeyname);
      return;
    }

    // If dialog was already confirmed, don't bother user again
    const hasConfirmedDialog = Util.getLocalStorage(this.localStorageKeyname);
    if (hasConfirmedDialog) {
      return;
    }

    // Handle closing the dialog
    const handleDialogClosed = () => {
      Util.setLocalStorage(this.localStorageKeyname, { inputMode: 'regular' });
    };

    // Show dialog
    const dialog = new H5P.ConfirmationDialog({
      headerText: this.params.l10n.confirmGraphemeHeader,
      dialogText: this.params.l10n.confirmGraphemeDialog,
      cancelText: null,
      confirmText: this.params.l10n.confirmGraphemeConfirm,
      classes: ['h5p-crossword-confirm-grapheme']
    });
    dialog.on('canceled', handleDialogClosed);
    dialog.on('confirmed', handleDialogClosed);
    dialog.appendTo(document.body);
    dialog.show();
  }

  /**
   * Register the DOM elements with H5P.Question
   */
  registerDomElements() {
    // Register task introduction text
    if (this.params.taskDescription && this.params.taskDescription !== '') {
      this.introduction = document.createElement('div');
      this.introduction.innerHTML = this.params.taskDescription;
      this.setIntroduction(this.introduction);
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('h5p-crossword-content-wrapper');

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
          closeWindow: this.params.l10n.closeWindow
        },
        a11y: this.params.a11y,
        poolSize: this.params.behaviour.poolSize,
        solutionWord: Util.toUpperCase(this.params.solutionWord.replace(/'\s'/g, ''), Util.UPPERCASE_EXCEPTIONS),
        words: this.params.words,
        previousState: this.previousState
      },
      {
        onTableFilled: () => {
          this.handleContentFilled();
        },
        onInitialized: (result) => {
          this.handleContentInitialized(result);
        },
        onRead: text => {
          this.handleRead(text);
        }
      }
    );

    contentWrapper.appendChild(this.content.getDOM());

    // Register content with H5P.Question
    this.setContent(contentWrapper);

    // Previous state might have been a filled table
    if (this.params.behaviour.enableInstantFeedback && this.content.isTableFilled()) {
      this.checkAnswer();
    }

    // Content may need a resize once it's displayed (media queries or pseudo elements)
    Util.waitForDOM('.h5p-crossword-input-container', () => {
      setTimeout(() => {
        this.trigger('resize');
      }, 100);
    });
  }

  /**
   * Handle content initialized.
   * @param {boolean} result initialization success.
   */
  handleContentInitialized(result) {
    this.wasCrosswordGenerated = result;

    if (result) {
      // Register Buttons
      this.addButtons();
    }

    this.on('resize', () => {
      if (this.content) {
        this.content.resize();
      }
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
      'aria-label': this.params.a11y.check
    }, {
      contentData: this.extras,
      textIfSubmitting: this.params.l10n.submitAnswer,
    });

    // Show solution button
    this.addButton('show-solution', this.params.l10n.showSolution, () => {
      this.showSolutions();
    }, this.initialButtons.showSolution, {
      'aria-label': this.params.a11y.showSolution
    }, {});

    // Retry button
    this.addButton('try-again', this.params.l10n.tryAgain, () => {
      this.resetTask();
    }, this.initialButtons.retry, {
      'aria-label': this.params.a11y.retry
    }, {});
  }

  /**
   * Check answer.
   */
  checkAnswer() {
    if (!this.content) {
      return; // Call by previous state, not ready yet
    }

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
      ariaMessage
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
   * Check if result has been submitted or input has been given.
   * @return {boolean} True, if answer was given.
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
   * @return {number} latest score.
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
   * @return {number} Score necessary for mastering.
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

    this.hideButton('check-answer');
    this.hideButton('show-solution');

    this.content.showSolutions();

    this.trigger('resize');
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    if (!this.content) {
      return;
    }

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

    this.trigger('resize');

    this.removeFeedback();

    this.content.reset();
    this.content.enable();
  }

  /**
   * Get xAPI data.
   * @return {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    return {
      statement: this.getXAPIAnswerEvent().data.statement
    };
  }

  /**
   * Build xAPI answer event.
   * @return {H5P.XAPIEvent} XAPI answer event.
   */
  getXAPIAnswerEvent() {
    const xAPIEvent = this.createXAPIEvent('answered');
    xAPIEvent.setScoredResult(this.getScore(), this.getMaxScore(), this,
      true, this.isPassed());
    xAPIEvent.data.statement.result.response = this.content.getXAPIResponse();

    return xAPIEvent;
  }

  /**
   * Create an xAPI event for Dictation.
   *
   * @param {string} verb Short id of the verb we want to trigger.
   * @return {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);
    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getxAPIDefinition());
    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   *
   * @return {object} XAPI definition.
   */
  getxAPIDefinition() {
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
  }

  /**
   * Determine whether the task has been passed by the user.
   *
   * @return {boolean} True if user passed or task is not scored.
   */
  isPassed() {
    return this.getScore() >= this.getMaxScore() || !this.getMaxScore() || this.getMaxScore() === 0;
  }

  /**
   * Get tasks title.
   *
   * @return {string} Title.
   */
  getTitle() {
    let raw;
    if (this.extras.metadata) {
      raw = this.extras.metadata.title;
    }
    raw = raw || Crossword.DEFAULT_DESCRIPTION;

    // H5P Core function: createTitle
    return H5P.createTitle(raw);
  }

  /**
   * Get tasks description.
   * @return {string} Description.
   */
  getDescription() {
    const introduction = this.params.taskDescription || Crossword.DEFAULT_DESCRIPTION;
    const fields = this.content.getXAPIDescription();
    return `${introduction}${fields}`;
  }

  /**
   * Answer call to return the current state.
   * @return {object} Current state.
   */
  getCurrentState() {
    return this.content.getCurrentState();
  }

  /**
   * Compute shallow difference of two objects.
   * @param {object} minuend Object to subtract from.
   * @param {object} subtrahend Object to subtract from minuend.
   */
  getDifference(minuend, subtrahend) {
    for (let property in subtrahend) {
      if (minuend[property] === subtrahend[property]) {
        delete minuend[property];
      }
    }

    return minuend; // Yes, technically that was changed in-place already ...
  }
}

/** @constant {string} */
Crossword.DEFAULT_DESCRIPTION = 'Crossword';
