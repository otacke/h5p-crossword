// Import utility functions
import Util from './h5p-crossword-util';

/*
 * Class for a Crossword Generator.
 * Based on https://github.com/satchamo/Crossword-Generator licensed under the
 * MIT License by Matt Johnson
 */
export default class CrosswordGenerator {
  constructor(params) {
    // Defaults
    this.params = Util.extend({
      words: [
        {
          answer: 'BAT',
          clue: 'BAT'
        },
        {
          answer: 'CAT',
          clue: 'CAT'
        }
      ],
      config: {
        poolSize: 0
      }
    }, params || {});

    // Sanitization
    this.params.words = this.params.words
      .filter(word => word.answer && word.clue) // word and clue are mandatory
      .map(word => {
        const newWord = {
          answer: Util.toUpperCase(word.answer, Util.UPPERCASE_EXCEPTIONS),
          clue: word.clue,
          extraClue: word.extraClue
        };

        // data item must have row and column and orientation or none of them
        if (word.fixWord && word.row !== undefined && word.column !== undefined && word.orientation !== undefined) {
          newWord.row = word.row - 1;
          newWord.column = word.column - 1;
          newWord.orientation = word.orientation;
        }

        return newWord;
      });

    // This is an index of the positions of the char in the crossword (so we know where we can potentially place words)
    // example {'a' : [{'row' : 10, 'column' : 5}, {'row' : 62, 'column' :17}], {'row' : 54, 'column' : 12}], 'b' : [{'row' : 3, 'column' : 13}]}
    // where the two item arrays are the row and column of where the letter occurs
    this.indexChar = {};

    // these words are the words that can't be placed on the crossword
    this.badWords;

    // build grid;
    this.cells = Util.createArray(CrosswordGenerator.GRID_ROWS, CrosswordGenerator.GRID_COLUMNS);

    // build element list (need to keep track of indexes in the originial input arrays)
    this.wordElements = this.createWordElements(this.params.words, this.params.config.poolSize);
  }

  /**
   * Get crossword grid that has ratio closest to 1 or null if can't be built.
   * @param {number} [triesMax=10] Maximum number of tries.
   * @return {object} Grid.
   */
  getSquareGrid(triesMax = 10) {
    let gridBest = null;
    let ratioBest = 0;

    for (let i = 0; i < triesMax; i++) {
      const gridCurrent = this.getGrid(10);
      if (gridCurrent === null) {
        continue; // Could not create grid
      }

      const ratio = Math.min(gridCurrent.length, gridCurrent[0].length) * 1.0 /
          Math.max(gridCurrent.length, gridCurrent[0].length);
      if (ratio > ratioBest) {
        gridBest = gridCurrent;
        ratioBest = ratio;
      }

      if (ratioBest === 1) {
        break;
      }
    }

    return gridBest;
  }

  /**
   * Get crossword grid or null if can't be built.
   * @param {number} [triesMax=10] Maximum number of tries.
   * @return {object} Grid.
   */
  getGrid(triesMax = 10) {
    let wordWasAdded;

    for (let tries = 0; tries < triesMax; tries++) {
      this.resetGrid();

      const presets = this.wordElements.filter(element => element.row !== undefined);
      if (presets.length > 0) {
        // Place all presets
        presets.forEach(preset => {
          if (this.canPlaceAnswerAt(preset.answer, {row: preset.row, column: preset.column, orientation: preset.orientation}) !== false) {
            this.placeAnswerAt(
              preset,
              {row: preset.row, column: preset.column, orientation: preset.orientation}
            );
          }
          else {
            this.badWords = [preset];
            return null;
          }
        });

        if (presets.length >= this.params.config.poolSize || presets.length === this.wordElements.length) {
          return this.minimizeGrid();
        }
      }
      else {
        // Place first answer in the middle of the grid
        let row = Math.floor(this.cells.length / 2);
        let column = Math.floor(this.cells[0].length / 2);
        const wordElement = this.wordElements[0];

        const startOrientation = this.getRandomOrientation();
        if (startOrientation === 'across') {
          column -= Math.floor(Util.unicodeLength(wordElement.answer) / 2);
        }
        else {
          row -= Math.floor(Util.unicodeLength(wordElement.answer) / 2);
        }

        if (this.canPlaceAnswerAt(wordElement.answer, {row: row, column: column, orientation: startOrientation}) !== false) {
          this.placeAnswerAt(
            wordElement,
            {row: row, column: column, orientation: startOrientation}
          );
        }
        else {
          this.badWords = [wordElement];
          return null;
        }
      }

      // start with a group containing all the words (except the first)
      // as we go, we try to place each answer in the group onto the grid
      // if the answer can't go on the grid, we add that answer to the next group
      this.groups = [];

      if (presets.length > 0) {
        this.groups.push(this.wordElements.slice(presets.length));
      }
      else {
        this.groups.push(this.wordElements.slice(1));
      }

      for (let groupId = 0; groupId < this.groups.length; groupId++) {
        wordWasAdded = false;
        // try to add all the answers in this group to the grid
        for (let i = 0; i < this.groups[groupId].length; i++) {
          const wordElement = this.groups[groupId][i];
          const positionBest = this.findPositionForWord(wordElement.answer);
          if (!positionBest) {
            // make the new group (if needed)
            if (this.groups.length - 1 === groupId) {
              this.groups.push([]);
            }
            // place the answer in the next group
            this.groups[groupId + 1].push(wordElement);
          }
          else {
            this.placeAnswerAt(wordElement, positionBest);
            wordWasAdded = true;
          }
        }
        // if we haven't made any progress, there is no point in going on to the next group
        if (!wordWasAdded) {
          break;
        }
      }
      // no need to try again
      if (wordWasAdded) {
        return this.minimizeGrid();
      }
    }

    this.badWords = this.groups[this.groups.length - 1];
    return null;
  }

  /**
   * Get words that could not be placed.
   * @return {object[]} Bad words.
   */
  getBadWords() {
    return this.badWords;
  }

  /**
   * Get random orientation, either across or down.
   * @return {string} Random orientation
   */
  getRandomOrientation() {
    return Math.floor(Math.random() * 2) ? 'across' : 'down';
  }

  /**
   * Minimize grid.
   * @return Minimized grid.
   */
  minimizeGrid() {
    // Find bounds
    let rowMin = CrosswordGenerator.GRID_ROWS - 1;
    let rowMax = 0;
    let columnMin = CrosswordGenerator.GRID_COLUMNS - 1;
    let columnMax = 0;

    for (let row = 0; row < CrosswordGenerator.GRID_ROWS; row++) {
      for (let column = 0; column < CrosswordGenerator.GRID_COLUMNS; column++) {
        const cell = this.cells[row][column];
        if (cell !== null) {
          if (row < rowMin) {
            rowMin = row;
          }
          if (row > rowMax) {
            rowMax = row;
          }
          if (column < columnMin) {
            columnMin = column;
          }
          if (column > columnMax) {
            columnMax = column;
          }
        }
      }
    }

    // Initialize new grid
    const rows = rowMax - rowMin + 1;
    const columns = columnMax - columnMin + 1;
    const newGrid = Util.createArray(rows, columns);

    // Copy grid onto smaller grid
    for (let row = rowMin, row2 = 0; row2 < rows; row++, row2++) {
      for (let column = columnMin, column2 = 0; column2 < columns; column++, column2++) {
        newGrid[row2][column2] = this.cells[row][column];
      }
    }

    return newGrid;
  }

  /**
   * Add cell to grid.
   * @param {object} wordElement Word element.
   * @param {string} wordElement.answer Word.
   * @param {number} wordElement.index Index of word in input list.
   * @param {object} position Position.
   * @param {number} position.row Row to place first character at.
   * @param {number} position.column Column to place firct character at.
   * @param {string} position.orientation Orientation.
   * @param {number} charIndex Index of character.
   */
  addCellToGrid(wordElement, position, charIndex) {

    const char = Util.unicodeCharAt(wordElement.answer, charIndex);
    if (this.cells[position.row][position.column] === null) {
      this.cells[position.row][position.column] = {char: char};

      // init the indexChar for that character if needed
      this.indexChar[char] = this.indexChar[char] || [];

      // add to index
      this.indexChar[char].push({'row' : position.row, 'column' : position.column});
    }

    this.cells[position.row][position.column][position.orientation] = {
      isStartOfWord: (charIndex === 0),
      index: wordElement.index
    };
  }

  /**
   * Place answer.
   * @param {object} wordElement Word element.
   * @param {string} wordElement.answer Word.
   * @param {number} wordElement.index Index of word in input list.
   * @param {object} position Position.
   * @param {number} position.row Row to place first character at.
   * @param {number} position.column Column to place firct character at.
   * @param {string} position.orientation Orientation.
   */
  placeAnswerAt(wordElement, position) {
    if (position.orientation === 'across') {
      for (let column = position.column, i = 0; column < position.column + Util.unicodeLength(wordElement.answer); column++, i++) {
        this.addCellToGrid(wordElement, {row: position.row, column: column, orientation: position.orientation}, i);
      }
    }
    else if (position.orientation === 'down') {
      for (let row = position.row, i = 0; row < position.row + Util.unicodeLength(wordElement.answer); row++, i++) {
        this.addCellToGrid(wordElement, {row: row, column: position.column, orientation: position.orientation}, i);
      }
    }
    else {
      throw 'Invalid orientation';
    }
  }

  /**
   * Check if character can be placed.
   * @param {string} char Character.
   * @param {object} position Position.
   * @param {number} position.row Row.
   * @param {number} position.column Column.
   * @return {number|false} False = not placable; 0 = in regular cell; 1 = in intersection.
   */
  canPlaceCharAt(char, position) {
    if (this.cells[position.row][position.column] === null) {
      return 0; // no intersection
    }
    if (this.cells[position.row][position.column]['char'] === char) {
      return 1; // intersection!
    }

    return false;
  }

  /**
   * Determine if word can be placed at position.
   * @param {string} answer Answer.
   * @param {object} position Position.
   * @param {number} position.row Row to place first character at.
   * @param {number} position.column Column to place firct character at.
   * @param {string} position.orientation Orientation.
   * @return {boolean} True, if word can be placed.
   */
  canPlaceAnswerAt(answer, position) {
    if (position.row < 0 || position.row >= this.cells.length || position.column < 0 || position.column >= this.cells[position.row].length) {
      return false; // out of bounds
    }

    if (position.orientation === 'across') {
      // Check if a duplicate word is trying to be put on a previous placed word
      for (let i = 0; i < Util.unicodeLength(answer); i++) {
        const cellValue = this.cells[position.row][position.column + i];

        if (!cellValue || cellValue.char !== answer[i]) {
          break;
        }
        else {
          if (i === Util.unicodeLength(answer) - 1) {
            return false;
          }
        }
      }

      if (position.column + Util.unicodeLength(answer) > this.cells[position.row].length) {
        return false; // out of bounds (word too long)
      }

      if (position.column - 1 >= 0 && this.cells[position.row][position.column - 1] !== null) {
        return false; // can't have a word directly to the left
      }

      if (position.column + Util.unicodeLength(answer) < this.cells[position.row].length && this.cells[position.row][position.column + Util.unicodeLength(answer)] !== null) {
        return false; // can't have word directly to the right
      }

      // check the row above to make sure there isn't another word
      // running parallel. It is ok if there is a character above, only if
      // the character below it intersects with the current word
      for (let row = position.row - 1, column = position.column, i = 0; row >= 0 && column < position.column + Util.unicodeLength(answer); column++, i++) {
        const isEmpty = (this.cells[row][column] === null);
        const isIntersection = this.cells[position.row][column] !== null && this.cells[position.row][column]['char'] === Util.unicodeCharAt(answer, i);
        if (!isEmpty && !isIntersection) {
          return false;
        }
      }

      // same deal as above, we just search in the row below the word
      for (let r = position.row + 1, c = position.column, i = 0; r < this.cells.length && c < position.column + Util.unicodeLength(answer); c++, i++) {
        const isEmpty = (this.cells[r][c] === null);
        const isIntersection = this.cells[position.row][c] !== null && this.cells[position.row][c]['char'] === Util.unicodeCharAt(answer, i);
        if (!isEmpty && !isIntersection) {
          return false;
        }
      }

      // check to make sure we aren't overlapping a char (that doesn't match)
      // and get the count of intersections
      for (let c = position.column, i = 0; c < position.column + Util.unicodeLength(answer); c++, i++) {
        const result = this.canPlaceCharAt(Util.unicodeCharAt(answer, i), {row: position.row, column: c});
        if (result === false) {
          return false;
        }
      }
    }
    else if (position.orientation === 'down') {
      // Check if a duplicate word is trying to be put on a previous placed word
      for (let i = 0; i < Util.unicodeLength(answer); i++) {
        const cellValue = this.cells[position.row + i][position.column];

        if (!cellValue || cellValue.char !== answer[i]) {
          break;
        }
        else {
          if (i === Util.unicodeLength(answer) - 1) {
            return false;
          }
        }
      }

      if (position.row + Util.unicodeLength(answer) > this.cells.length) {
        return false; // out of bounds
      }

      if (position.row - 1 >= 0 && this.cells[position.row - 1][position.column] !== null) {
        return false; // can't have a word directly above
      }

      if (position.row + Util.unicodeLength(answer) < this.cells.length && this.cells[position.row + Util.unicodeLength(answer)][position.column] !== null) {
        return false; // can't have a word directly below
      }

      // check the column to the left to make sure there isn't another
      // word running parallel. It is ok if there is a character to the
      // left, only if the character to the right intersects with the
      // current word
      for (let column = position.column - 1, row = position.row, i = 0; column >= 0 && row < position.row + Util.unicodeLength(answer); row++, i++) {
        const isEmpty = this.cells[row][column] === null;
        const isIntersection = this.cells[row][position.column] !== null && this.cells[row][position.column]['char'] === Util.unicodeCharAt(answer, i);
        const can_place_here = isEmpty || isIntersection;
        if (!can_place_here) {
          return false;
        }
      }

      // same deal, but look at the column to the right
      for (let column = position.column + 1, row = position.row, i = 0; row < position.row + Util.unicodeLength(answer) && column < this.cells[row].length; row++, i++) {
        const isEmpty = this.cells[row][column] === null;
        const isIntersection = this.cells[row][position.column] !== null && this.cells[row][position.column]['char'] === Util.unicodeCharAt(answer, i);
        const can_place_here = isEmpty || isIntersection;
        if (!can_place_here) {
          return false;
        }
      }

      // check to make sure we aren't overlapping a char (that doesn't match)
      // and get the count of intersections
      for (let row = position.row, i = 0; row < position.row + Util.unicodeLength(answer); row++, i++) {
        const result = this.canPlaceCharAt(Util.unicodeCharAt(answer, i), {row: row, column: position.column});
        if (result === false) {
          return false;
        }
      }
    }
    else {
      throw 'Invalid Orientation';
    }

    return true;
  }

  /**
   * Find position for word.
   * @param {string} answer Answer to be placed.
   * @return {object} Position.
   */
  findPositionForWord(answer) {
    // check the char_index for every letter, and see if we can put it there
    const bestPositions = [];

    for (let i = 0; i < Util.unicodeLength(answer); i++) {
      const possibleLocations = this.indexChar[Util.unicodeCharAt(answer, i)];
      if (!possibleLocations) {
        continue;
      }

      for (let j = 0; j < possibleLocations.length; j++) {
        const point = possibleLocations[j];
        const row = point['row'];
        const column = point['column'];
        // the c - i, and r - i here compensate for the offset of character in the answer
        const intersectionsAcross = this.canPlaceAnswerAt(answer, {row: row, column: column - i, orientation: 'across'});
        const intersectionsDown = this.canPlaceAnswerAt(answer, {row: row - i, column: column, orientation: 'down'});

        if (intersectionsAcross !== false) {
          bestPositions.push({
            intersections: intersectionsAcross,
            row: row,
            column: column - i,
            orientation: 'across'
          });
        }

        if (intersectionsDown !== false) {
          bestPositions.push(
            {
              intersections: intersectionsDown,
              row: row - i,
              column: column,
              orientation: 'down'
            }
          );
        }
      }
    }

    if (bestPositions.length === 0) {
      return false;
    }

    // find a good random position
    return bestPositions[Math.floor(Math.random() * bestPositions.length)];
  }

  /**
   * Reset grid.
   */
  resetGrid() {
    for (let row = 0; row < this.cells.length; row++) {
      for (let column = 0; column < this.cells[row].length; column++) {
        this.cells[row][column] = null;
      }
    }
    this.indexChar = {};
  }

  /**
   * Create word elements.
   * @param {object[]} Words.
   * @param {number} poolSize Number of words to choose randomly.
   */
  createWordElements(words, poolSize) {
    if (typeof poolSize !== 'number' || poolSize === 0) {
      poolSize = null;
    }
    else {
      poolSize = Math.max(2, poolSize);
    }

    // Add index to word element
    let wordElements = words.map((item, index) => {
      item.index = index;
      return item;
    });

    if (poolSize) {
      // Keep all fixed words + free words as long as they fit into pool size
      const wordsFixed = wordElements.filter(element => element.row !== undefined);
      const wordsFree = Util.shuffleArray(wordElements.filter(element => element.row === undefined));
      wordsFree.splice(Math.max(0, poolSize - wordsFixed.length), wordsFree.length);
      wordElements = wordsFixed.concat(wordsFree);
    }

    /*
     * Sort by fixed vs non-fixed words, then by length, in order to put fixed
     * answers onto grid first, then long words with potential intersections
     */
    return wordElements.sort((a, b) => {
      const valueA = (a.row !== undefined) ? 1 : 0;
      const valueB = (b.row !== undefined) ? 1 : 0;

      if (valueA < valueB) {
        return 1;
      }
      else if (valueA > valueB) {
        return -1;
      }
      else {
        return Util.unicodeLength(b.answer) - Util.unicodeLength(a.answer);
      }
    });
  }

  /**
   * Get word element (attribute).
   * @param {number} index Index of word Element to fetch.
   * @param {string} [attribute] Attribut to get from word element.
   * @return {object|string|number} Word object or specific attribute.
   */
  getWordElement(index, attribute) {
    if (typeof index !== 'number') {
      return null;
    }

    const elements = this.wordElements.filter(element => element.index === index);
    if (elements.length < 1) {
      return null;
    }

    if (typeof attribute !== 'string') {
      return elements[0];
    }

    return elements[0][attribute];
  }

  /**
   * Export cells to format of https://github.com/MichaelWehar/Crossword-Layout-Generator
   * That ons should replace this generator once the other one can create more compact layouts
   * @param {object[]} cells Cells.
   * @return {object[]} Cells in format of https://github.com/MichaelWehar/Crossword-Layout-Generator
   */
  export(cells) {
    const rows = cells.length;
    const cols = cells[0].length;
    const result = [];
    let nextClueId = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];

        if (cell === null) {
          continue;
        }

        if (cell.down && cell.down.isStartOfWord) {
          result.push({
            clue: this.getWordElement(cell.down.index, 'clue'),
            answer: this.getWordElement(cell.down.index, 'answer'),
            extraClue: this.getWordElement(cell.down.index, 'extraClue'),
            startx: c + 1,
            starty: r + 1,
            orientation: 'down',
            clueId: nextClueId
          });
        }

        if (cell.across && cell.across.isStartOfWord) {
          result.push({
            clue: this.getWordElement(cell.across.index, 'clue'),
            answer: this.getWordElement(cell.across.index, 'answer'),
            extraClue: this.getWordElement(cell.across.index, 'extraClue'),
            startx: c + 1,
            starty: r + 1,
            orientation: 'across',
            clueId: nextClueId
          });
        }

        if (cell.down && cell.down.isStartOfWord || cell.across && cell.across.isStartOfWord) {
          nextClueId++;
        }
      }
    }

    return {
      rows: rows,
      cols: cols,
      result: result
    };
  }
}

CrosswordGenerator.GRID_ROWS = 100;
CrosswordGenerator.GRID_COLUMNS = 100;
