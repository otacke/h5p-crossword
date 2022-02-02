import CrosswordClueAnnouncer from './h5p-crossword-clue-announcer';
import CrosswordInput from './h5p-crossword-input';
import CrosswordTable from './h5p-crossword-table';
import CrosswordSolutionWord from './h5p-crossword-solution-word';
import CrosswordGenerator from './h5p-crossword-generator';
import Util from './h5p-crossword-util';

/** Class representing the content */
export default class CrosswordContent {
  /**
   * @constructor
   *
   * @param {object} params Parameters.
   */
  constructor(params = {}, callbacks) {
    this.params = params;

    this.contentId = params.contentId;

    this.content = document.createElement('div');
    this.content.classList.add('h5p-crossword-content');

    this.callbacks = callbacks || {};
    this.callbacks.onInitialized = callbacks.onInitialized || (() => {});
    this.callbacks.onRead = callbacks.onRead || (() => {});
    this.callbacks.onTableFilled = callbacks.onTableFilled || (() => {});

    this.answerGiven = false;

    // Restore previous cells or create crossword
    if (this.params.previousState && this.params.previousState.crosswordLayout) {
      this.crosswordLayout = this.params.previousState.crosswordLayout;
    }
    else {
      let errorMessage;
      let crosswordGenerator;
      let grid;

      if (params.words.length < 2) {
        errorMessage = params.l10n.couldNotGenerateCrosswordTooFewWords;
      }
      else {
        crosswordGenerator = new CrosswordGenerator({
          words: params.words,
          config: {
            poolSize: params.poolSize
          }
        });
        grid = crosswordGenerator.getSquareGrid(CrosswordContent.MAXIMUM_TRIES);

        if (!grid) {
          errorMessage = params.l10n.couldNotGenerateCrossword;
        }
      }

      if (errorMessage) {
        // Add list of problematic words to error message
        if (crosswordGenerator) {
          const badWords = crosswordGenerator
            .getBadWords()
            .map(badWord => `${badWord.answer}`)
            .join(', ');

          errorMessage = `${errorMessage} ${params.l10n.problematicWords.replace(/@words/g, badWords)}`;
        }

        const message = document.createElement('div');
        message.classList.add('h5p-crossword-message');
        message.innerText = errorMessage;
        this.content.appendChild(message);

        console.warn(`H5P.Crossword: ${errorMessage}`);

        this.couldNotGenerateCrossword = true;
        this.callbacks.onInitialized(false);
        return;
      }

      this.crosswordLayout = crosswordGenerator.export(grid);
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.classList.add('h5p-crossword-table-wrapper');

    // Clue announcer
    this.clueAnnouncer = new CrosswordClueAnnouncer();
    tableWrapper.appendChild(this.clueAnnouncer.getDOM());

    // Table
    this.table = new CrosswordTable(
      {
        scoreWords: this.params.scoreWords,
        applyPenalties: this.params.applyPenalties,
        theme: this.params.theme,
        contentId: this.contentId,
        dimensions: {
          rows: this.crosswordLayout.rows,
          columns: this.crosswordLayout.cols
        },
        instantFeedback: this.params.instantFeedback,
        solutionWord: this.params.solutionWord,
        words: this.crosswordLayout.result,
        a11y: this.params.a11y,
        l10n: {
          across: this.params.l10n.across,
          down: this.params.l10n.down
        }
      },
      {
        onInput: (params => {
          this.handleTableInput(params);
        }),
        onFocus: (params => {
          this.handleTableFocus(params);
        }),
        onRead: (text => {
          this.callbacks.onRead(text);
        })
      }
    );
    tableWrapper.appendChild(this.table.getDOM());
    this.content.appendChild(tableWrapper);

    const canHaveSolutionWord = this.table.addSolutionWord(this.params.solutionWord);
    if (this.params.solutionWord !== '') {
      if (canHaveSolutionWord) {
        this.solutionWord = new CrosswordSolutionWord({
          solutionWord: this.params.solutionWord,
          tableWidth: this.crosswordLayout.cols
        });
        tableWrapper.appendChild(this.solutionWord.getDOM());
      }
      else {
        console.warn('H5P.Crossword: There are not enough matching characters for the overall solution word in the crossword.');
      }
    }

    // Input Area
    this.inputarea = new CrosswordInput(
      {
        words: this.crosswordLayout.result.filter(word => word.orientation !== 'none'),
        contentId: this.contentId,
        overlayContainer: this.content,
        applyPenalties: this.params.applyPenalties,
        l10n: {
          across: this.params.l10n.across,
          down: this.params.l10n.down,
          extraClue: this.params.l10n.extraClue,
          closeWindow: this.params.l10n.closeWindow
        },
        a11y: this.params.a11y
      },
      {
        onFieldInput: (params => {
          this.handleFieldInput(params);
        }),
        onRead: (text => {
          this.callbacks.onRead(text);
        })
      }
    );
    this.content.appendChild(this.inputarea.getDOM());

    // Restore previous cells
    if (this.params.previousState.cells) {
      this.table.setAnswers(this.params.previousState.cells);
      this.answerGiven = true;
    }

    // Restore previous focus
    if (this.params.previousState.focus) {
      if (this.params.previousState.focus.position && this.params.previousState.focus.position.row) {
        this.table.setcurrentOrientation(this.params.previousState.focus.orientation, this.params.previousState.focus.position);
        this.table.focusCell(this.params.previousState.focus.position);
      }
    }

    this.overrideCSS(this.params.theme);

    this.callbacks.onInitialized(true);
  }

  /**
   * Return the DOM for this class.
   * @return {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.content;
  }

  resize() {
    if (!this.table) {
      return;
    }
    this.table.resize();
    this.inputarea.resize();

    if (this.solutionWord) {
      this.solutionWord.resize();
    }
  }

  /**
   * Get correct responses pattern for xAPI.
   * @return {string[]} Correct response for each cell.
   */
  getXAPICorrectResponsesPattern() {
    return this.table.getXAPICorrectResponsesPattern();
  }

  /**
   * Get current response for xAPI.
   * @return {string} Responses for each cell joined by [,].
   */
  getXAPIResponse() {
    return this.table.getXAPIResponse();
  }

  /**
   * Get xAPI description suitable for H5P's reporting module.
   * @return {string} HTML with placeholders for fields to be filled in.
   */
  getXAPIDescription() {
    return this.table.getXAPIDescription();
  }

  /**
   * Reset.
   */
  reset() {
    if (this.params.words.length < 2) {
      return;
    }

    this.table.reset();
    if (this.solutionWord) {
      this.solutionWord.reset();
    }
    this.inputarea.reset();
    this.answerGiven = false;
  }

  /**
   * Check if result has been submitted or input has been given.
   * @return {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.answerGiven;
  }

  /**
   * Get score.
   * @return {number} Score.
   */
  getScore() {
    if (this.params.words.length < 2) {
      return 0;
    }

    return this.table.getScore();
  }

  /**
   * Get maximum score
   * @return {number} Maximum score.
   */
  getMaxScore() {
    if (this.params.words.length < 2) {
      return 0;
    }

    return this.table.getMaxScore();
  }

  /**
   * Answer call to return the current state.
   * @return {object} Current state.
   */
  getCurrentState() {
    if (this.params.words.length < 2 || !this.table) {
      return;
    }

    return {
      crosswordLayout: this.crosswordLayout,
      cells: this.table.getAnswers(),
      focus: this.table.getFocus()
    };
  }

  /**
   * Check answer.
   */
  checkAnswer() {
    this.disable();

    if (this.params.scoreWords) {
      const results = this.table.checkAnswerWords();
      this.inputarea.checkAnswerWords(results);
    }
    else {
      const results = this.table.checkAnswer();
      this.inputarea.checkAnswer(results);
    }
  }

  /**
   * Check whether all relevant cells have been filled.
   * @return {boolean} True, if all relevant cells have been filled, else false.
   */
  isTableFilled() {
    return this.table && this.table.isFilled();
  }

  /**
   * Show solution.
   */
  showSolutions() {
    if (this.params.words.length < 2) {
      return;
    }

    this.disable();

    this.table.showSolutions();

    if (this.solutionWord) {
      this.solutionWord.showSolutions();
    }

    this.inputarea.showSolutions(this.crosswordLayout.result);
  }

  /**
   * Handle input from input fields.
   * @param {object} Parameters parameters.
   */
  handleFieldInput(params) {
    this.table.fillGrid(params);
    this.answerGiven = true;
  }

  /**
   * Handle input from table.
   * @param {object} Parameters parameters.
   */
  handleTableInput(params) {
    if (this.solutionWord && params.solutionWordId) {
      this.solutionWord.setCell(params.solutionWordId - 1, params.answer);
    }

    if (params.inputFieldUpdates) {
      this.inputarea.fillFields(params.inputFieldUpdates);
    }

    this.answerGiven = true;

    if (params.checkFilled && this.isTableFilled()) {
      this.callbacks.onTableFilled();
    }
  }

  /**
   * Handle table getting focus.
   * @param {object} Parameters parameters.
   */
  handleTableFocus(params) {
    const wordData = this.crosswordLayout.result
      .filter(word => word.orientation !== 'none')
      .filter(word => word.orientation === params.orientation && word.clueId === params.clueId);

    if (wordData.length > 0) {
      this.clueAnnouncer.setClue({
        clue: wordData[0].clue,
        orientation: this.params.l10n[wordData[0].orientation],
        clueId: wordData[0].clueId,
        answerLength: Util.unicodeLength(wordData[0].answer)
      });
    }

    this.inputarea.focusClue(params);
  }

  /**
   * Enable content.
   */
  enable() {
    this.table.enable();
    this.inputarea.enable();
  }

  /**
   * Disable content.
   */
  disable() {
    this.table.disable();
    this.table.unhighlight();
    this.inputarea.disable();
    this.inputarea.unhighlight();
    this.clueAnnouncer.reset();
  }

  /**
   * Override CSS with custom colors.
   * @param {object} theme Theme settings.
   */
  overrideCSS(theme = {}) {
    // Grid override
    if (theme.gridColor) {
      this.addStyle(`.h5p-crossword .h5p-crossword-grid th, .h5p-crossword .h5p-crossword-grid td,.h5p-crossword .h5p-crossword-grid{border-color:${theme.gridColor}};`);
    }

    // Normal cell overrides
    if (theme.cellBackgroundColor) {
      this.addStyle(`.h5p-crossword .h5p-crossword-cell{background-color:${theme.cellBackgroundColor}};`);
      this.addStyle(`.h5p-crossword .h5p-crossword-cell-clue-id-marker{background-color:${theme.cellBackgroundColor}};`);
    }

    if (theme.clueIdColor) {
      this.addStyle(`.h5p-crossword .h5p-crossword-cell-clue-id-marker{color:${theme.clueIdColor}};`);
    }

    if (theme.cellColor) {
      this.addStyle(`.h5p-crossword .h5p-crossword-cell-canvas{color:${theme.cellColor}};`);
    }

    // Highlighted cell overrides
    if (theme.cellBackgroundColorHighlight) {
      this.addStyle(`.h5p-crossword .h5p-crossword-cell:not(.h5p-crossword-solution-correct):not(.h5p-crossword-solution-wrong):not(.h5p-crossword-solution-neutral).h5p-crossword-highlight-normal{background-color:${theme.cellBackgroundColorHighlight}};`);
      this.addStyle(`.h5p-crossword .h5p-crossword-cell.h5p-crossword-highlight-normal .h5p-crossword-cell-clue-id-marker, .h5p-crossword .h5p-crossword-cell.h5p-crossword-highlight-normal .h5p-crossword-cell-solution-word-marker{background-color:${theme.cellBackgroundColorHighlight}}`);
      this.addStyle(`.h5p-crossword .h5p-crossword-input-fields-group-wrapper-clue.h5p-crossword-input-fields-group-clue-highlight-focus .h5p-crossword-input-fields-group-clue-id{background-color:${theme.cellBackgroundColorHighlight}}`);
    }

    if (theme.clueIdColorHighlight) {
      this.addStyle(`.h5p-crossword .h5p-crossword-cell.h5p-crossword-highlight-normal .h5p-crossword-cell-clue-id-marker, .h5p-crossword .h5p-crossword-cell.h5p-crossword-highlight-normal .h5p-crossword-cell-solution-word-marker{color:${theme.clueIdColorHighlight}}`);
    }

    if (theme.cellColorHighlight) {
      this.addStyle(`.h5p-crossword .h5p-crossword-cell.h5p-crossword-highlight-normal .h5p-crossword-cell-canvas{color:${theme.cellColorHighlight}};`);
      this.addStyle(`.h5p-crossword .h5p-crossword-input-fields-group-wrapper-clue.h5p-crossword-input-fields-group-clue-highlight-focus .h5p-crossword-input-fields-group-clue-id{color:${theme.cellColorHighlight}}`);
    }
  }

  /**
   * Add CSS style.
   * @param {string} css CSS style.
   */
  addStyle(css) {
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.querySelector('head').appendChild(style);
  }
}

/** @constant {number} Maximum number of tries to generate crossword grid */
CrosswordContent.MAXIMUM_TRIES = 20;
