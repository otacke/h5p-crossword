import CrosswordCell from '@components/h5p-crossword-cell.js';
import Util from '@services/util.js';
import './h5p-crossword-table.scss';
import { XAPI_PLACEHOLDER  } from '@mixins/xapi.js';

/** @constant {number} CELL_FONT_SIZE_DIVIDER Divisor found by testing */
export const CELL_FONT_SIZE_DIVIDER = 2;

/** Class representing the content */
export default class CrosswordTable {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks) {
    this.params = Util.extend({
    }, params);

    this.params.theme.backgroundImage = this.params.theme.backgroundImage || null;

    // Callbacks
    this.callbacks = callbacks || {};
    this.callbacks.onInput = this.callbacks.onInput || (() => {});
    this.callbacks.onFocus = this.callbacks.onFocus || (() => {});
    this.callbacks.onRead = callbacks.onRead || (() => {});

    // Current position and orientation in table
    this.currentPosition = {};
    this.currentOrientation = 'across';

    // Max score
    this.maxScore = null;

    // Cells
    this.cells = this.buildCells(this.params.dimensions, this.params.words);

    // Create grid
    this.content = this.buildGrid(this.params);

    // Set tab index to first input element
    [].concat(...this.cells)
      .filter((cell) => cell.getSolution() !== null)[0]
      .setTabIndex('0');

    // Event listener
    this.content.addEventListener('keydown', (event) => {
      if (this.disabled) {
        return;
      }

      let i;
      let result;

      let target = event.target;

      if (event.target.classList.contains('h5p-crossword-cell-content')) {
        target = event.target.parentNode.parentNode;
      }

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();

          this.setcurrentOrientation('across', {
            row: parseInt(target.dataset.row),
            column: parseInt(target.dataset.col) + 1,
          });

          this.moveTo({
            row: parseInt(target.dataset.row),
            column: parseInt(target.dataset.col) + 1,
          });
          break;

        case 'ArrowLeft':
          event.preventDefault();

          this.setcurrentOrientation('across', {
            row: parseInt(target.dataset.row),
            column: parseInt(target.dataset.col) - 1,
          });

          this.moveTo({
            row: parseInt(target.dataset.row),
            column: parseInt(target.dataset.col) - 1,
          });
          break;

        case 'ArrowDown':
          event.preventDefault();

          this.setcurrentOrientation('across', {
            row: parseInt(target.dataset.row) + 1,
            column: parseInt(target.dataset.col),
          });

          this.moveTo({
            row: parseInt(target.dataset.row) + 1,
            column: parseInt(target.dataset.col),
          });
          break;

        case 'ArrowUp':
          event.preventDefault();

          this.setcurrentOrientation('across', {
            row: parseInt(target.dataset.row) - 1,
            column: parseInt(target.dataset.col),
          });

          this.moveTo({
            row: parseInt(target.dataset.row) - 1,
            column: parseInt(target.dataset.col),
          });
          break;

        case 'Home':
          event.preventDefault();
          if (event.ctrlKey) {
            this.moveTo({ row: 0, column: 0 });
          }
          else {
            this.moveTo({ row: parseInt(target.dataset.row), column: 0 });
          }
          break;

        case 'End':
          event.preventDefault();
          if (event.ctrlKey) {
            this.moveTo({
              row: this.params.dimensions.rows - 1,
              column: this.params.dimensions.columns - 1,
            });
          }
          else {
            this.moveTo({
              row: parseInt(target.dataset.row),
              column: document.querySelector(
                `[data-row="${target.dataset.row}"]:last-of-type`,
              ).dataset.col,
            });
          }
          break;

        case 'PageUp':
          event.preventDefault();
          i = 0;
          do {
            result = this.moveTo({ row: i, column: target.dataset.col });
            i++;
          } while (result === false);
          break;

        case 'PageDown':
          event.preventDefault();
          i = this.params.dimensions.rows - 1;
          do {
            result = this.moveTo({ row: i, column: target.dataset.col });
            i--;
          } while (result === false);
          break;

        case 'Enter':
          break;

        case 'Space':
          break;
      }
    });
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Build actual cells from parameters.
   * @param {object} dimensions Dimensions of grid.
   * @param {number} dimensions.rows Numvber of rows in grid.
   * @param {number} dimensions.columns Numvber of columns in grid.
   * @param {object[]} cellParams Cell parameters.
   * @returns {object[]} Cells.
   */
  buildCells(dimensions, cellParams = []) {
    // Initial data for all cells.
    const stemCells = Util.createArray(dimensions.rows, dimensions.columns);
    for (let row = 0; row < dimensions.rows; row++) {
      for (let column = 0; column < dimensions.columns; column++) {
        stemCells[row][column] = {
          row: row,
          column: column,
          solution: null,
          id: null,
        };
      }
    }

    // Inject more information into relevant stem cells
    cellParams.forEach((cell) => {
      let row = cell.starty - 1;
      let column = cell.startx - 1;

      for (let i = 0; i < cell.answer.length; i++) {
        if (cell.orientation === 'none') {
          continue;
        }

        stemCells[row][column] = {
          row: row,
          column: column,
          solution: cell.answer.substring(i, i + 1),
          solutionLength: cell.answer.length,
          solutionIndex: i + 1,
          clue: cell.clue,
          clueIdAcross: (cell.orientation === 'across') ? cell.clueId : stemCells[row][column].clueIdAcross,
          clueIdDown: (cell.orientation === 'down') ? cell.clueId : stemCells[row][column].clueIdDown,
          clueIdMarker: (i === 0) ? cell.clueId : stemCells[row][column].clueIdMarker,
        };

        if (cell.orientation === 'down') {
          row++;
        }
        else {
          column++;
        }
      }
    });

    // Create grid cells from stem cells
    const cells = Util.createArray(dimensions.rows, dimensions.columns);

    [].concat(...stemCells).forEach((param) => {
      cells[param.row][param.column] = new CrosswordCell({
        row: param.row,
        column: param.column,
        solution: param.solution,
        solutionIndex: param.solutionIndex,
        solutionLength: param.solutionLength,
        width: 100 / dimensions.columns,  
        clueIdMarker: param.clueIdMarker,
        clue: param.clue,
        clueIdAcross: param.clueIdAcross,
        clueIdDown: param.clueIdDown,
        instantFeedback: this.params.instantFeedback,
        applyPenalties: this.params.applyPenalties,
        hasBackgroundImage: !!this.params.theme.backgroundImage,
        theme: this.params.theme,
        a11y: {
          correct: this.params.a11y.correct,
          wrong: this.params.a11y.wrong,
          empty: this.params.a11y.empty,
        },
      },
      {
        onClick: ((position) => {
          this.handleCellClick(position);
        }),
        onFocus: ((cell, event) => {
          this.handleCellFocus(cell, event);
        }),
        onKeyup: ((params, quiet) => {
          this.handleCellKeyup(params, quiet ?? false);
        }),
        onRead: ((text) => {
          this.callbacks.onRead(text);
        }),
      });
    });

    return cells;
  }

  /**
   * Find cells that the solution word id marker and circle can be put into.
   * @param {string} solutionWord Solution word.
   * @returns {CrosswordCell[]} Cells that can be used or null if no space.
   */
  findSolutionWordCells(solutionWord) {
    if (!solutionWord || solutionWord === '') {
      return [];
    }

    const result = [];

    let canHaveSolutionWord = true;
    let cells = [].concat(...this.cells).filter((cell) => cell.getSolution() !== null);
    solutionWord
      .split('')
      .forEach((character) => {
        if (canHaveSolutionWord === false) {
          return;
        }

        // Try to find random cell that contains char looked for and has not been used
        const candidateCells = Util.shuffleArray(
          cells.filter((cell) => cell.getSolution() === character && result.indexOf(cell) === -1),
        );
        if (candidateCells.length === 0 && character !== ' ') {
          canHaveSolutionWord = false;
          return;
        }

        result.push(candidateCells[0]);
      });

    return (result.length === solutionWord.length) ? result : [];
  }

  /**
   * Mark cells with solution word ids and circles if possible.
   * @param {string} solutionWord Solution word.
   * @param {number[]} positions Positions of solution word.
   * @returns {object} Cells with markers or empty array if no solution word.
   */
  addSolutionWord(solutionWord, positions = []) {
    const cellsWithMarkers = [];

    if (!solutionWord || solutionWord === '') {
      return cellsWithMarkers;
    }

    if (positions.length) {
      positions.forEach((position) => {
        this.cells[position.row][position.column].addSolutionWordIdMarker(position.solutionWordId);
        cellsWithMarkers.push(this.cells[position.row][position.column]);
      });
      return cellsWithMarkers;
    }

    const solutionWordCells = this.findSolutionWordCells(solutionWord);
    solutionWordCells.forEach((cell, index) => {
      cell?.addSolutionWordIdMarker(index + 1);
      cellsWithMarkers.push(cell);
    });

    return cellsWithMarkers;
  }

  /**
   * Create grid table.
   * @param {object} params Parameters.
   * @param {object} params.dimensions Dimensions.
   * @param {number} params.dimensions.columns Number of columns.
   * @param {number} params.dimensions.dim.rows Number of rows.
   * @param {object} params.theme Theme.
   * @param {number} params.contentId Content id.
   * @returns {HTMLElement} Grid table.
   */
  buildGrid(params) {
    const table = document.createElement('table');
    table.classList.add('h5p-crossword-grid');
    table.style.backgroundColor = params.theme.backgroundColor;
    table.style.maxWidth = `calc(2 * ${params.dimensions.columns} * 32px)`;

    if (params.theme.backgroundImage) {
      table.classList.add('h5p-crossword-grid-background-image');
      const image = document.createElement('img');
      H5P.setSource(image, params.theme.backgroundImage, params.contentId);
      table.style.backgroundImage = `url('${image.src}')`;
    }

    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', this.params.a11y.crosswordGrid);

    const tableBody = document.createElement('tbody');
    tableBody.setAttribute('role', 'rowgroup');

    for (let rowId = 0; rowId < params.dimensions.rows; rowId ++) {
      const bodyRow = this.buildGridRow(params.dimensions, rowId);
      tableBody.appendChild(bodyRow);
    }

    table.appendChild(tableBody);

    return table;
  }

  /**
   * Create grid row element.
   * @param {object} dim Dimensions.
   * @param {number} dim.columns Number of columns.
   * @param {number} dim.rows Number of rows.
   * @param {number} rowId Rows index.
   * @returns {HTMLElement} Grid row element.
   */
  buildGridRow(dim, rowId) {
    const row = document.createElement('tr');
    row.setAttribute('role', 'row');

    for (let columnId = 0; columnId < dim.columns; columnId++) {
      row.appendChild(this.cells[rowId][columnId].getDOM());
    }

    return row;
  }

  /**
   * Move cursor to
   * @param {object} position Position.
   * @param {number} position.row Row to move to.
   * @param {number} position.column Columns to move to.
   * @param {boolean} [keepFocus] If true, don't focus cell (but keep current focus).
   * @returns {boolean} False if moving not possible, else true.
   */
  moveTo(position = {}, keepFocus = false) {
    // Check grid boundaries
    if (position.row < 0 || position.row > this.params.dimensions.rows - 1) {
      return false;
    }
    if (position.column < 0 || position.column > this.params.dimensions.columns - 1) {
      return false;
    }
    if (this.cells[position.row][position.column].getSolution() === null) {
      return false; // Target cell is empty
    }

    const targetCell = this.cells[position.row][position.column];
    if (!targetCell) {
      return false;
    }

    // Reset grid cells' tab index
    [].concat(...this.cells)
      .forEach((cell) => {
        cell.setTabIndex('-1');
      });

    targetCell.setTabIndex('0');

    this.currentPosition = position;
    this.focusCell(position, keepFocus);

    return true;
  }

  /**
   * Get information for other components.
   * @param {object} position Position.
   * @param {number} position.row Cell row.
   * @param {number} position.column Cell column.
   * @returns {object} Updates.
   */
  getUpdates(position) {
    const updates = [];

    const invertedOrientation = this.currentOrientation === 'across' ? 'down' : 'across';

    // If cell at position is a crossection, retrieve complete answer for corresponding word
    const invertedClueId = this.cells[position.row][position.column].getClueId(invertedOrientation);
    if (invertedClueId) {
      const invertedCells = [].concat(...this.cells)
        .filter((cell) => cell.getClueId(invertedOrientation) === invertedClueId);

      const invertedText = invertedCells
        .reduce((result, current) => {
          return result + (current.answer || ' ');
        }, '')
        .replace(/[\s\uFEFF\xA0]+$/g, ''); // trim right spaces

      updates.push({
        clueId: invertedClueId,
        orientation: invertedOrientation,
        text: invertedText,
      });
    }

    // Retrieve complete answer for word belonging to cell at position
    const clueId = this.cells[position.row][position.column].getClueId(this.currentOrientation);
    const cells = [].concat(...this.cells).filter((cell) => cell.getClueId(this.currentOrientation) === clueId);
    const text = cells
      .reduce((result, current) => {
        return result + (current.answer || ' ');
      }, '')
      .replace(/[\s\uFEFF\xA0]+$/g, ''); // trim right spaces

    updates.push({
      clueId: clueId,
      orientation: this.currentOrientation,
      text: text,
    });

    return updates;
  }

  /**
   * Get answers in cells.
   * @returns {string[]} Answers in cells.
   */
  getAnswers() {
    return [].concat(...this.cells).map((cell) => cell.getAnswer());
  }

  /**
   * Set answers (from previous state).
   * @param {string[]} answers Answers in cells.
   */
  setAnswers(answers) {
    [].concat(...this.cells).forEach((cell, index) => {
      cell.setAnswer(answers[index] || '');

      if (cell.getSolution()) {
        const information = cell.getInformation();

        // Update other components
        this.callbacks.onInput({
          answer: information.answer,
          inputFieldUpdates: this.getUpdates(information.position),
          clueId: information.clueId,
          solutionWordId: information.solutionWordId || null,
          checkFilled: true,
        });
      }
    });
  }

  /**
   * Get score.
   * @returns {number} Score.
   */
  getScore() {
    let score;

    if (this.params.scoreWords) {
      score = this.params.words.reduce((score, word) => {
        return score + this.getWordScore(word.clueId, word.orientation);
      }, 0);
    }
    else {
      score = [].concat(...this.cells)
        .reduce((score, cell) => score += cell.getScore() || 0, 0);
    }

    return Math.max(0, score);
  }

  /**
   * GetMaxScore.
   * @returns {number} Maximum score.
   */
  getMaxScore() {
    if (this.params.scoreWords) {
      this.maxScore = this.params.words.length;
    }
    else {
      this.maxScore = this.maxScore || [].concat(...this.cells)
        .reduce((score, cell) => score += (cell.getScore() !== undefined) ? 1 : 0, 0);
    }

    return this.maxScore;
  }

  /**
   * Get score for single word.
   * @param {number} clueId ClueId of word.
   * @param {string} orientation Requested orientation.
   * @returns {number} 1 if complete word is correct, -1 if something is wrong, 0 else;
   */
  getWordScore(clueId, orientation = 'across') {
    const wordInformation = this.getWordInformation(clueId, orientation);

    const wordScore = wordInformation.reduce((score, info) => {
      if (score === -1 || info.score === -1) {
        return -1; // Word is wrong
      }

      const currentScore = (info.score === 1 || info.score === undefined) ? 1 : 0;

      return score + currentScore;
    }, 0);

    if (wordScore === -1) {
      return -1;
    }

    return (wordScore === wordInformation.length) ? 1 : 0;
  }

  /**
   * Set current orientation. Will correct orientation if not possible for position.
   * @param {string} orientation Requested orientation.
   * @param {object} [position] Position.
   * @param {number} [position.row] Position row.
   * @param {number} [position.column] Position column.
   * @returns {string|undefined} New orientation.
   */
  setcurrentOrientation(orientation, position) {
    if (orientation !== 'across' && orientation !== 'down') {
      return;
    }

    // Require proper position object
    position = position || this.currentPosition;
    if (typeof position.row !== 'number' || typeof position.column !== 'number') {
      return;
    }
    if (position.row < 0 || position.row > this.params.dimensions.rows - 1) {
      return;
    }
    if (position.column < 0 || position.column > this.params.dimensions.columns - 1) {
      return;
    }

    const cell = this.cells[position.row][position.column];
    if (!cell.getSolution()) {
      return; // Empty cell, no change of orientation required
    }

    // Check for possible orientations
    const left = position.column > 0 &&
      this.cells[position.row][position.column - 1].getSolution();

    const right = position.column < this.params.dimensions.columns - 1 &&
      this.cells[position.row][position.column + 1].getSolution();

    const up = position.row > 0 &&
      this.cells[position.row - 1][position.column].getSolution();

    const down = position.row < this.params.dimensions.rows - 1 &&
      this.cells[position.row + 1][position.column].getSolution();

    if (orientation === 'across' && !left && !right) {
      orientation = 'down';
    }
    else if (orientation === 'down' && !up && !down) {
      orientation = 'across';
    }
    else if (!left && !right && !up && !down) {
      orientation = 'across'; // Default for 1 character cells
    }

    this.currentOrientation = orientation;
    return orientation;
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.keepCorrectAnswers] If true, correct answers are kept.
   * @returns {boolean} True, if answer was kept, else false.
   */
  reset(params = {}) {
    let answerWasKept = false;

    [].concat(...this.cells).forEach((cell) => {
      answerWasKept = cell.reset(
        { keepCorrectAnswers: params.keepCorrectAnswers },
      ) || answerWasKept;
    });

    this.currentPosition = {};
    this.currentOrientation = 'across';
    this.maxScore = null;

    return answerWasKept;
  }

  /**
   * Resize.
   * @returns {object} BoundingClientRect. Geometry of table.
   */
  resize() {
    // Didn't work well by just using CSS
    const cellWidth = this.content.clientWidth / this.params.dimensions.columns;

    this.content.style.fontSize = `${cellWidth / CELL_FONT_SIZE_DIVIDER}px`;

    return this.content.getBoundingClientRect();
  }

  /**
   * Handle click on cell.
   * @param {object} position Position.
   * @param {number} position.row Position row.
   * @param {number} position.column Position column.
   * @param {boolean} [keepOrientation] If true, don't toggle orientation on repeated focus.
   */
  handleCellClick(position, keepOrientation = false) {
    const cell = this.cells[position.row][position.column];
    if (!cell.getSolution()) {
      return;
    }

    if (!keepOrientation) {
      // Default orientation to 'across', but toggle on repeated click if possible
      if (!cell.getClueId('across')) {
        this.setcurrentOrientation('down', position);
      }
      else if (
        this.currentPosition.row === position.row &&
        this.currentPosition.column === position.column &&
        this.currentOrientation === 'across'
      ) {
        this.setcurrentOrientation('down', position);
      }
      else {
        this.setcurrentOrientation('across', position);
      }
    }

    if (
      this.currentPosition.row === position.row &&
      this.currentPosition.column === position.column
    ) {
      return; // No need to set the whole moveTo in motion again
    }

    this.currentPosition = position;
    this.moveTo(position, true);
  }

  /**
   * Handle receiving focus.
   * @param {object} position Position.
   * @param {number} position.row Position row.
   * @param {number} position.column Position column.
   * @param {Event} event FocusEvent.
   */
  handleCellFocus(position, event) {
    const cell = this.cells[position.row][position.column];
    if (!cell.getSolution()) {
      return;
    }

    if (
      event.relatedTarget &&
      (
        event.relatedTarget.classList.contains('h5p-crossword-cell') ||
        event.relatedTarget.classList.contains('h5p-crossword-cell-content')
      )
    ) {
      return; // Focus already handled by click/key listeners.
    }

    // Getting focus from outside the grid by tabbing into it
    this.setcurrentOrientation(this.currentOrientation, position);
    this.handleCellClick(position, true, false);
  }

  /**
   * Handle input from cell.
   * @param {object} params Position.
   * @param {object} params.position Position.
   * @param {number} params.position.row Position row.
   * @param {number} params.position.column Position column.
   * @param {boolean} [params.nextPositionOffset] Next position offset.
   * @param {boolean} quiet If true, only replicate input, don't focus, etc.
   */
  handleCellKeyup(params, quiet = false) {
    if (params.nextPositionOffset === undefined) {
      params.nextPositionOffset = 1;
    }

    if (!quiet) {
      if (
        (!this.currentOrientation || this.currentOrientation === 'across') &&
        params.position.column + params.nextPositionOffset >= 0 &&
        params.position.column + params.nextPositionOffset < this.params.dimensions.columns &&
        this.cells[params.position.row][params.position.column + params.nextPositionOffset].getSolution()
      ) {
        this.currentOrientation = 'across';
        this.focusCell({ row: params.position.row, column: params.position.column + params.nextPositionOffset });
      }
      else if (
        (!this.currentOrientation || this.currentOrientation === 'down') &&
        params.position.row + params.nextPositionOffset >= 0 &&
        params.position.row + params.nextPositionOffset < this.params.dimensions.rows &&
        this.cells[params.position.row + params.nextPositionOffset][params.position.column].getSolution()
      ) {
        this.currentOrientation = 'down';
        this.focusCell({ row: params.position.row + params.nextPositionOffset, column: params.position.column });
      }
    }

    this.callbacks.onInput({
      answer: params.answer,
      inputFieldUpdates: this.getUpdates(params.position),
      clueId: params.clueId,
      solutionWordId: params.solutionWordId || null,
      checkFilled: true,
    }, quiet);
  }

  /**
   * Show solution.
   */
  showSolutions() {
    [].concat(...this.cells).forEach((cell) => {
      cell.showSolutions();
    });
  }

  /**
   * Check answer.
   * @returns {object[]} Results of all words.
   */
  checkAnswerWords() {
    const results = this.params.words.map((word) => {
      return {
        clueId: word.clueId,
        orientation: word.orientation,
        answer: word.answer,
        score: this.getWordScore(word.clueId, word.orientation),
      };
    });

    // Mark cells on table
    [].concat(...this.cells).forEach((cell) => {
      cell.checkAnswer();
    });

    return results;
  }

  /**
   * Check answer.
   * @returns {object[]} Results of all cells with content.
   */
  checkAnswer() {
    const results = [];

    [].concat(...this.cells).forEach((cell) => {
      cell.checkAnswer();
      const information = cell.getInformation();
      if (information.solution) {
        results.push(information);
      }
    });

    return results;
  }

  /**
   * Highlight word cells belonging to a cell.
   * @param {object} position Position of cell.
   * @param {number} position.row Position row.
   * @param {number} position.column Position column.
   * @param {string} [orientation] Preferred orientation for crossings.
   */
  highlightWord(position, orientation = 'across') {
    const clueId = this.cells[position.row][position.column].getClueId(orientation);
    if (!clueId) {
      return;
    }

    const wordElement = this.params.words.filter(
      (word) => word.clueId === clueId && word.orientation === orientation,
    )[0];

    [].concat(...this.cells)
      .filter((cell) => cell.getClueId(orientation) === clueId)
      .forEach((cell, index) => {
        const cellPosition = cell.getPosition();

        const ariaLabelParams = {
          row: cellPosition.row,
          column: cellPosition.column,
          clueId: clueId,
          orientation: orientation,
          clue: wordElement.clue,
          position: index,
          length: wordElement.answer.length,
        };
        cell.setAriaLabel(this.buildAriaLabel(ariaLabelParams));

        cell.highlight('normal');
      });
  }

  /**
   * Build aria label for cell.
   * @param {object} params Parameters.
   * @returns {string} Aria label for cell.
   */
  buildAriaLabel(params) {
    const gridPosition = `${this.params.a11y.row} ${params.row + 1}, ${this.params.a11y.column} ${params.column + 1}`;
    const clue = `${params.clueId} ${this.params.a11y[params.orientation]}. ${params.clue}`;

    const wordPosition = this.params.a11y.letterSevenOfNine
      .replace('@position', params.position + 1)
      .replace('@length', params.length);

    return `${gridPosition}. ${clue}, ${wordPosition}.`;
  }

  /**
   * Get focus.
   * @returns {object} Focus and orientation.
   */
  getFocus() {
    return {
      position: this.currentPosition,
      orientation: this.currentOrientation,
    };
  }

  /**
   * Get cell information for a complete word.
   * @param {number} clueId Clue id.
   * @param {string} [orientation] Orientation.
   * @returns {object[]} Cell information.
   */
  getWordInformation(clueId, orientation = 'across') {
    if (!clueId) {
      return '';
    }

    return [].concat(...this.cells)
      .filter((cell) => cell.getClueId(orientation) === clueId)
      .map((cell) => cell.getInformation());
  }

  /**
   * Focus a cell including neighbors around it.
   * @param {object} position Position of cell.
   * @param {number} position.row Position row.
   * @param {number} position.column Position column.
   * @param {boolean} keepFocus If true, don't set focus.
   */
  focusCell(position, keepFocus = false) {
    this.clearCellHighlights();

    // Make sure there's no unfulfillable orientation
    this.setcurrentOrientation(this.currentOrientation, position);

    this.highlightWord(position, this.currentOrientation);

    this.cells[position.row][position.column].highlight('focus');

    // Report focus change
    this.callbacks.onFocus({
      clueId: this.cells[position.row][position.column].getClueId(this.currentOrientation),
      orientation: this.currentOrientation,
    });

    if (!keepFocus) {
      this.cells[position.row][position.column].focus();
    }
  }

  /**
   * Clear all cells' highlights.
   */
  clearCellHighlights() {
    [].concat(...this.cells).forEach((cell) => {
      cell.unhighlight();
    });
  }

  /**
   * Fill the grid.
   * @param {object} params Parameters.
   */
  fillGrid(params) {
    let hasSomeCellChanged = false;
    const cells = [].concat(...this.cells)
      .filter((cell) => cell.getClueId(params.orientation) === params.clueId);

    cells.forEach((cell, index) => {
      const answerBefore = cell.getAnswer();
      cell.setAnswer(
        params.text[index] || '',
        (params.readOffset === -1) ? false : index === params.cursorPosition - params.readOffset,
      );
      hasSomeCellChanged = hasSomeCellChanged ||
        answerBefore !== cell.getAnswer();

      // At crossection, other input fields needs to be updated
      if (cell.getClueId('down') && cell.getClueId('across')) {
        const crossedWordInfos = (params.orientation === 'across') ?
          this.getWordInformation(cell.getClueId('down'), 'down') :
          this.getWordInformation(cell.getClueId('across'), 'across');

        const inputFieldUpdates = [{
          clueId: (params.orientation === 'across') ? cell.getClueId('down') : cell.getClueId('across'),
          orientation: (params.orientation === 'across') ? 'down' : 'across',
          text: crossedWordInfos.reduce((result, info) => {
            return `${result}${info.answer || ' '}`;
          }, ''),
        }];

        this.callbacks.onInput({
          inputFieldUpdates: inputFieldUpdates,
        });
      }

      // Solution word needs an update
      const cellInformation = cell.getInformation();
      if (cellInformation.solutionWordId) {
        this.callbacks.onInput(cellInformation);
      }
    });

    if (params.cursorPosition < cells.length) {
      const position = cells[params.cursorPosition].position;
      this.setcurrentOrientation(params.orientation, position);
      this.moveTo(position, true);
    }

    // Check if table is filled
    this.callbacks.onInput({
      checkFilled: hasSomeCellChanged,
    });
  }

  /**
   * Enable grid.
   */
  enable() {
    [].concat(...this.cells).forEach((cell) => {
      cell.enable();
    });

    this.disabled = false;
  }

  /**
   * Disable grid.
   */
  disable() {
    this.disabled = true;
    [].concat(...this.cells).forEach((cell) => {
      cell.disable();
    });
  }

  /**
   * Check whether all relevant cells have been filled.
   * @returns {boolean} True, if all relevant cells have been filled, else false.
   */
  isFilled() {
    return ![].concat(...this.cells).some((cell) => cell.isFilled() === false);
  }

  /**
   * Unhighlight all cells.
   */
  unhighlight() {
    [].concat(...this.cells).forEach((cell) => {
      cell.unhighlight('focus');
      cell.unhighlight('normal');

      if (!this.params.instantFeedback) {
        cell.setSolutionState();
      }
    });
  }

  /**
   * Get correct responses pattern for xAPI.
   * @returns {string[]} Correct response for each cell.
   */
  getXAPICorrectResponsesPattern() {
    const caseMatters = '{case_matters=false}';
    const pattern = this.params.words
      .map((word) => {
        const characters = this.getWordInformation(word.clueId, word.orientation)
          .map((info) => info.solution);

        if (this.params.scoreWords) {
          return characters.join('');
        }
        else {
          return characters.join('[,]');
        }
      })
      .join('[,]');

    return [`${caseMatters}${pattern}`];
  }

  /**
   * Get current response for xAPI.
   * @returns {string} Responses for each cell joined by [,].
   */
  getXAPIResponse() {
    return this.params.words
      .map((word) => {
        const characters = this.getWordInformation(word.clueId, word.orientation);
        if (this.params.scoreWords) {
          return characters.map((info) => info.answer || ' ').join('');
        }
        else {
          return characters.map((info) => info.answer || '').join('[,]');
        }
      })
      .join('[,]');
  }

  /**
   * Get xAPI description suitable for H5P's reporting module.
   * @returns {string} HTML with placeholders for fields to be filled in.
   */
  getXAPIDescription() {
    return this.params.words
      .map((word) => {
        // The below replaceAll makes sure we don't get any unwanted XAPI_PLACEHOLDERs in the description:
        const clue =
          `${word.clueId} ${this.params.l10n[word.orientation]}: ${word.clue.replaceAll(/_{10,}/gi, '_________')}`;

        const placeholders = [];
        if (this.params.scoreWords) {
          placeholders.push(XAPI_PLACEHOLDER);
        }
        else {
          while (placeholders.length < word.answer.length) {
            placeholders.push(XAPI_PLACEHOLDER);
          }
        }

        return `<p>${clue}</ br>${placeholders.join(' ')}</p>`;
      })
      .join('');
  }

  /**
   * Get solution word cell positions.
   * @returns {object[]} Solution word cell positions.
   */
  getSolutionWordCellPositions() {
    return this.cells
      .flat()
      .filter(((cell) => cell.getInformation().solutionWordId !== null))
      .map((cell) => {
        return {
          row: cell.getPosition().row,
          column: cell.getPosition().column,
          solutionWordId: cell.getInformation().solutionWordId,
        };
      });
  }
}
