import CrosswordCell from '@scripts/h5p-crossword-cell';
import Util from '@services/util';
import { CELL_FONT_SIZE_DIVIDER } from '@scripts/h5p-crossword-table.js';

/** Class representing the content */
export default class CrosswordSolutionWord {
  /**
   * @class
   * @param {object} params Parameters.
   */
  constructor(params = {}) {
    this.solutionWord = Util.toUpperCase(params.solutionWord.replace(/\s/g, ''), Util.UPPERCASE_EXCEPTIONS);
    this.scaleWidth = Math.max(params.tableWidth, this.solutionWord.length); // TODO factor based on actual length/margin

    this.cells = this.createCells(this.solutionWord);
    this.content = this.createSolution(this.cells);
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Create solution.
   * @param {CrosswordCell[]} cells Cells.
   * @returns {HTMLElement} Wrapper.
   */
  createSolution(cells) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-crossword-solution-word-wrapper');

    const table = document.createElement('table');
    table.classList.add('h5p-crossword-solution-word');
    table.setAttribute('aria-hidden', true);
    wrapper.appendChild(table);

    const row = document.createElement('tr');
    cells.forEach((cell) => {
      row.appendChild(cell.getDOM());
    });
    table.appendChild(row);

    return wrapper;
  }

  /**
   * Create cells.
   * @param {string} solutionWord Solution word.
   * @returns {CrosswordCell[]} Cells.
   */
  createCells(solutionWord) {
    const cells = Util.createArray(solutionWord.length);
    solutionWord
      .split('')
      .forEach((character, index) => {
        cells[index] = new CrosswordCell({
          width: 100 / solutionWord.length, // eslint-disable-line no-magic-numbers
          solution: solutionWord[index],
          clueIdMarker: index + 1 // Technically, it's a solution marker ...
        });
        cells[index].disable();
      });

    return cells;
  }

  /**
   * Set cell content.
   * @param {number} id Index.
   * @param {string} character Character.
   */
  setCell(id, character) {
    this.cells[id].setAnswer(character || '');
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.cells.forEach((cell) => {
      cell.showSolutions();
    });
  }

  /**
   * Reset.
   * @param {object} params Parameters.
   * @param {boolean} [params.keepCorrectAnswers] If true, correct answers are not reset.
   */
  reset(params = {}) {
    this.cells.forEach((cell) => {
      if (params.keepCorrectAnswers && cell.getSolutionState() === 'correct') {
        return;
      }

      cell.reset();
    });
  }

  /**
   * Resize.
   */
  resize() {
    const cellWidth = this.content.clientWidth / this.scaleWidth;

    // Using table border would yield 1 pixel gaps sometimes, hmm

    // Magic number found by testing
    this.content.style.fontSize = `${cellWidth / CELL_FONT_SIZE_DIVIDER}px`;
    this.cells.forEach((cell) => {
      cell.setWidth(cellWidth);
    });
  }
}
