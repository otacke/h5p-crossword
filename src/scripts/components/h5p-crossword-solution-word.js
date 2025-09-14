import CrosswordCell from '@components/h5p-crossword-cell.js';
import Util from '@services/util.js';
import { CELL_FONT_SIZE_DIVIDER } from '@components/h5p-crossword-table.js';
import './h5p-crossword-solution-word.scss';

/** Class representing the content */
export default class CrosswordSolutionWord {
  /**
   * @class
   * @param {object} params Parameters.
   */
  constructor(params = {}) {
    const paddedCellsWithMarkers = params.cellsWithMarkers.reduce((result, cell, index) => {
      const expectedPosition = index + 1;

      if (cell === undefined || cell.solutionWordId === expectedPosition) {
        result.push(cell);
      }
      else {
        const missingCellsCount = cell.solutionWordId - expectedPosition;
        result.push(...Array(missingCellsCount).fill(undefined), cell);
      }

      return result;
    }, []);

    this.solutionWord = paddedCellsWithMarkers.map((cell) => cell?.getSolution() || ' ');
    this.scaleWidth = Math.max(
      params.tableWidth, this.solutionWord.length,
    ); // TODO factor based on actual length/margin

    this.cells = this.createCells(paddedCellsWithMarkers);
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
   * @param {CrosswordCell[]} cellsWithMarkers Cells with markers.
   * @returns {CrosswordCell[]} Cells.
   */
  createCells(cellsWithMarkers) {
    const cellWidth = 100 / cellsWithMarkers.length;  

    return cellsWithMarkers.map((cell, index) => {
      const crosswordCell = new CrosswordCell({
        width: cellWidth,
        solution: cell?.getSolution() || ' ',
        clueIdMarker: cell ? index + 1 : ' ', // Technically, it's a solution marker ...
      });

      crosswordCell.disable();
      return crosswordCell;
    });
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
