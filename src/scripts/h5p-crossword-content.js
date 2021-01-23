import CrosswordClueAnnouncer from './h5p-crossword-clue-announcer';
import CrosswordInput from './h5p-crossword-input';
import CrosswordTable from './h5p-crossword-table';
import CrosswordSolutionWord from './h5p-crossword-solution-word';
import CrosswordGenerator from './h5p-crossword-generator';

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
      const crosswordGenerator = new CrosswordGenerator({
        words: params.words,
        config: {
          poolSize: params.poolSize
        }
      });
      const grid = crosswordGenerator.getSquareGrid(20);

      if (!grid) {
        const message = document.createElement('div');
        message.classList.add('h5p-crossword-message');
        message.innerText = params.l10n.couldNotGenerateCrossword;
        this.content.appendChild(message);

        console.warn('H5P.Crossword: Could not generate a crossword. Bad words:', crosswordGenerator.getBadWords());
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
        backgroundImage: this.params.backgroundImage,
        backgroundColor: this.params.backgroundColor,
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
    if (this.params.solutionWord !== '' && canHaveSolutionWord) {
      this.solutionWord = new CrosswordSolutionWord({
        solutionWord: this.params.solutionWord,
        tableWidth: this.crosswordLayout.cols
      });
      tableWrapper.appendChild(this.solutionWord.getDOM());
    }

    // Input Area
    this.inputarea = new CrosswordInput(
      {
        words: this.crosswordLayout.result.filter(word => word.orientation !== 'none'),
        contentId: this.contentId,
        overlayContainer: this.content,
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
    return this.table.getScore();
  }

  /**
   * Get maximum score
   * @return {number} Maximum score.
   */
  getMaxScore() {
    return this.table.getMaxScore();
  }

  /**
   * Answer call to return the current state.
   * @return {object} Current state.
   */
  getCurrentState() {
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
    const results = this.table.checkAnswer();
    this.inputarea.checkAnswer(results);
  }

  /**
   * Show solution.
   */
  showSolutions() {
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

    if (this.table.isFilled()) {
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
        answerLength: wordData[0].answer.length
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
}
