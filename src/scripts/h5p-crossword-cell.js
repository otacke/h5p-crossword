import Util from './h5p-crossword-util';

/** Class representing a cell */
export default class CrosswordCell {
  /**
   * @constructor
   *
   * @param {object} params Parameters.
   */
  constructor(params = {}, callbacks = {}) {

    // Sanitization
    this.params = Util.extend({
      instantFeedback: false,
      clueIdMarker: null,
      solution: null,
      backgroundColor: '#173354'
    }, params);

    // Callbacks
    this.callbacks = callbacks || {};
    this.callbacks.onClick = callbacks.onClick || (() => {});
    this.callbacks.onFocus = callbacks.onFocus || (() => {});
    this.callbacks.onKeyup = callbacks.onKeyup || (() => {});
    this.callbacks.onRead = callbacks.onRead || (() => {});

    // Enabled state
    this.enabled = true;

    // Keep track of TabIndex when disabling
    this.previousTabIndex = null;

    // Position
    this.position = {row: params.row, column: params.column};

    // ID of solution word character
    this.solutionWordId = null;

    this.cell = this.buildCell(params);

    // Wrapper for input and canvas
    const cellContentWrapper = this.buildCellContentWrapper();
    this.cell.appendChild(cellContentWrapper);

    if (this.params.solution) {
      this.cellInput = this.buildCellInput(params);

      cellContentWrapper.appendChild(this.cellInput);
      // Used just to hide the select markers on Android ...
      this.cellCanvas = this.buildCellCanvas();
      cellContentWrapper.appendChild(this.cellCanvas);

      // Click listener
      this.cell.addEventListener('click', () => {
        if (!this.enabled) {
          return;
        }

        this.callbacks.onClick(this.position);
        this.focus();
      });
    }
    else {
      // Empty cell
      this.cell.classList.add('h5p-crossword-cell-empty');
      this.cell.setAttribute('aria-label', this.params.a11y.empty);

      if (!this.params.hasBackgroundImage) {
        this.cell.style.backgroundColor = this.params.backgroundColor;
      }
    }

    if (this.params.clueIdMarker) {
      const clueIdMarker = document.createElement('div');
      clueIdMarker.classList.add('h5p-crossword-cell-clue-id-marker');
      clueIdMarker.innerText = this.params.clueIdMarker;
      cellContentWrapper.appendChild(clueIdMarker);
    }
  }

  /**
   * Return the DOM for this class.
   * @return {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.cell;
  }

  /**
   * Build cell.
   * @param {object} params Parameters.
   * @return {HTMLElement} Cell element.
   */
  buildCell(params) {
    const cell = document.createElement('td');
    cell.classList.add('h5p-crossword-cell');
    cell.style.width = `${params.width}%`;
    cell.setAttribute('role', 'gridcell');

    // Allow parent to access position quickly without searching for cell
    cell.dataset.col = params.column;
    cell.dataset.row = params.row;

    return cell;
  }

  /**
   * Build cell content wrapper.
   * @return {HTMLElement} Cell content wrapper element.
   */
  buildCellContentWrapper() {
    const cellContentWrapper = document.createElement('div');
    cellContentWrapper.classList.add('h5p-crossword-cell-content-wrapper');
    return cellContentWrapper;
  }

  /**
   * Build cell canvas. Displays input. Used to hide select markers on Android.
   * @return {HTMLElement} Cell canvas element.
   */
  buildCellCanvas() {
    const cellCanvas = document.createElement('div');
    cellCanvas.classList.add('h5p-crossword-cell-canvas');
    return cellCanvas;
  }

  /**
   * Build cell input. Only takes input, but canvas displays it.
   * @return {HTMLElement} Cell input element.
   */
  buildCellInput() {
    const cellInput = document.createElement('input');
    cellInput.classList.add('h5p-crossword-cell-content');
    cellInput.setAttribute('type', 'text');
    cellInput.setAttribute('maxLength', 1);
    cellInput.setAttribute('autocomplete', 'new-password');
    cellInput.setAttribute('autocorrect', 'off');
    cellInput.setAttribute('spellcheck', 'false');
    cellInput.setAttribute('tabIndex', '-1');

    cellInput.addEventListener('input', (event) => {
      event.preventDefault();
    });

    cellInput.addEventListener('change', (event) => {
      event.preventDefault();
    });

    /*
     * Keydown listener. Required for delete/backspace that are not
     * handled by keypress via event.key
     */
    cellInput.addEventListener('keydown', (event) => {
      if (!this.enabled) {
        return;
      }

      if (!event.key || event.key === 'Unidentified') {
        return; // Use keyup listener as fallback for old browsers
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        this.setAnswer('');
        const cellInformation = this.getInformation();
        cellInformation.keepPosition = true;
        this.cellInput.value = '';
        this.callbacks.onKeyup(cellInformation);
      }
    });

    /*
     * Keypress listener. Required to get all quick keypresses for chars
     */
    cellInput.addEventListener('keypress', (event) => {
      event.preventDefault();

      if (!this.enabled || event.repeat) {
        return;
      }

      if (!event.key || event.key === 'Unidentified') {
        return; // Use keyup as fallback for old browsers
      }

      if (event.key.length > 1) {
        return; // Not a character
      }

      this.setAnswer(Util.toUpperCase(event.key, Util.UPPERCASE_EXCEPTIONS), true);

      this.cellInput.value = '';
      this.callbacks.onKeyup(this.getInformation());
    });

    /*
     * keyup listener, used particularly for Android that doesn't
     * provide event.key and doesn't check maxlength on input -
     * workaround by retrieving first character
     */
    cellInput.addEventListener('keyup', (event) => {
      if (!this.enabled) {
        return;
      }

      if (event.key && event.key !== 'Unidentified') {
        return; // Already handled by keydown/keypress
      }

      event.preventDefault();

      if (event.repeat) {
        return;
      }

      if (Util.CONTROL_KEY_CODES.indexOf(event.keyCode) !== -1) {
        // Delete and Backspace
        if (event.keyCode === 8 || event.keyCode === 46) {
          this.setAnswer('');
          const cellInformation = this.getInformation();
          cellInformation.keepPosition = true;
          this.cellInput.value = '';
          this.callbacks.onKeyup(cellInformation);
        }
      }
      else if ((event.keyCode === 187 || event.keyCode === 192) && event.key === 'Dead') {
        return; // Skip accent keys
      }
      else {
        // All printable symbols including numbers, Unicode, etc.
        if (
          this.cellInput.value.substr(0, 1) === '' &&
          event.keyCode !== 229 // Some weird Android keyCode
        ) {
          return; // Could be non-valid accent combination
        }

        this.setAnswer(this.cellInput.value, true);
        this.cellInput.value = '';
        const cellInformation = this.getInformation();

        this.callbacks.onKeyup(cellInformation);
      }
    });

    cellInput.addEventListener('focus', (event) => {
      this.callbacks.onFocus(this.position, event);
    });

    return cellInput;
  }

  /**
   * Return correct solution.
   * @return {string|null} Solution char or null.
   */
  getSolution() {
    return this.params.solution;
  }

  /**
   * Get current answer.
   * @return {string} Current answer.
   */
  getCurrentAnswer() {
    return this.cell.innerText.substr(0, 1);
  }

  /**
   * Get cell information.
   * @return {object} Cell information.
   */
  getInformation() {
    return {
      answer: (this.answer) ? Util.toUpperCase(this.answer, Util.UPPERCASE_EXCEPTIONS) : this.answer,
      clueIdAcross: this.params.clueIdAcross,
      clueIdDown: this.params.clueIdDown,
      position: this.position,
      score: this.getScore(),
      solution: this.params.solution,
      solutionWordId: this.solutionWordId || null
    };
  }

  /**
   * Get cell position.
   * @return {object} Cell position as {row: x, column: y}.
   */
  getPosition() {
    return this.position;
  }

  /**
   * Get clue id.
   * @param {string} [orientation=across] Orientation.
   * @return {number} Clue id.
   */
  getClueId(orientation = 'across') {
    if (orientation === 'down') {
      return this.params.clueIdDown;
    }
    else if (orientation === 'across') {
      return this.params.clueIdAcross;
    }
  }

  /**
   * Get current answer.
   * @return {string} Current answer.
   */
  getAnswer() {
    return this.answer;
  }

  /**
   * Get score.
   * @return {number} Wrong: -1; Missing: 0; Correct 1
   */
  getScore() {
    if (!this.params.solution) {
      return; // Empty
    }

    if (this.params.solution === ' ' && (!this.answer || this.answer.trim() === '')) {
      return; // Space not relevant for score
    }

    if (!this.answer || this.answer.trim() === '') {
      return 0; // missing or space
    }
    else if (this.answer !== this.params.solution) {
      return (this.params.applyPenalties) ? -1 : 0; // wrong
    }
    else {
      return 1; // correct
    }
  }

  /**
   * Check whether cell is filled.
   * @return {boolean|null} True if filled, null if not filled but not expected, else false.
   */
  isFilled() {
    if (!this.params.solution) {
      return null;
    }

    if (this.params.solution === ' ') {
      return null;
    }

    if (this.answer) {
      return true;
    }

    return false;
  }

  /**
   * Set tab index.
   * @param {string} index Tab index.
   */
  setTabIndex(index) {
    if (isNaN(parseInt(index, 10))) {
      return;
    }

    // Cell with character or empty cell
    if (this.cellInput) {
      this.cellInput.setAttribute('tabIndex', index);
    }
    else {
      this.cell.setAttribute('tabIndex', index);
    }
  }

  /**
   * Set aria label.
   * @param {string} label Label.
   */
  setAriaLabel(label) {
    this.cellInput.setAttribute('aria-label', label);
  }

  /**
   * Set solution state, either correct or wrong.
   * @param {string} state State, correct or wrong.
   */
  setSolutionState(state) {
    this.cell.classList.remove('h5p-crossword-solution-correct');
    this.cell.classList.remove('h5p-crossword-solution-wrong');
    this.cell.classList.remove('h5p-crossword-solution-neutral');

    if (state) {
      const className = 'h5p-crossword-solution' + ((state) ? `-${state}` : '');
      this.cell.classList.add(className);
    }
  }

  /**
   * Set answer.
   * @param {string} answer Answer character.
   * @param {boolean} [readFeedback=false] If true, read feedback in instant feedback mode.
   */
  setAnswer(answer, readFeedback = false) {
    if (!this.cellInput) {
      return; // empty field
    }

    if (answer === '') {
      this.cellCanvas.innerText = '';
      this.answer = undefined;
    }
    else {
      this.cellCanvas.innerText = Util.toUpperCase(answer, Util.UPPERCASE_EXCEPTIONS);
      this.answer = Util.toUpperCase(answer, Util.UPPERCASE_EXCEPTIONS);
    }

    if (this.params.instantFeedback) {
      this.checkAnswer(readFeedback);
    }
  }

  /**
   * Set cell width.
   * @param {number} width Width in pixels.
   */
  setWidth(width) {
    if (typeof width !== 'number' || width <= 0) {
      return;
    }
    this.cell.style.width = `${width}px`;
  }

  /**
   * Set focus on cell.
   */
  focus() {
    // Cell with character or empty cell
    setTimeout(() => {
      if (this.cellInput) {
        this.cellInput.focus();
      }
      else {
        this.cell.focus();
      }
    }, 0); // Prevent duplicate entries
  }

  /**
   * Highlight cell.
   * @param {string} type Highlight type.
   */
  highlight(type) {
    if (!this.getSolution() && type !== 'focus') {
      return;
    }

    const className = 'h5p-crossword-highlight' + ((type) ? `-${type}` : '');
    this.cell.classList.add(className);
  }

  /**
   * Remove highlights.
   * @param {string} type Type to unhighlight.
   */
  unhighlight(type) {
    if (!type) {
      this.cell.classList.remove('h5p-crossword-highlight-normal');
      this.cell.classList.remove('h5p-crossword-highlight-focus');
    }
    else {
      const className = 'h5p-crossword-highlight' + ((type) ? `-${type}` : '');
      this.cell.classList.remove(className);
    }
  }

  /**
   * Show solution.
   */
  showSolutions() {
    if (!this.params.solution) {
      return; // empty cell
    }

    this.setAnswer(this.params.solution);
    this.setSolutionState();
  }

  /**
   * Check answer.
   * @param {boolean} [read=false] If true, will read correct/wrong via readspeaker.
   */
  checkAnswer(read = false) {
    const answer = (this.answer || '').trim();

    if (answer === this.params.solution && answer !== '') {
      this.setSolutionState('correct');
      if (read) {
        this.callbacks.onRead(this.params.a11y.correct);
      }
    }
    else if (answer === '') {
      this.setSolutionState();
    }
    else {
      if (this.params.applyPenalties) {
        this.setSolutionState('wrong');
        if (read) {
          this.callbacks.onRead(this.params.a11y.wrong);
        }
      }
      else {
        this.setSolutionState('neutral');
        if (read) {
          this.callbacks.onRead(this.params.a11y.wrong);
        }
      }
    }
  }

  /**
   * Reset.
   */
  reset() {
    this.setAnswer('', false);
    this.unhighlight();
    this.setSolutionState();
  }

  /**
   * Enable cell.
   */
  enable() {
    if (this.cellInput) {
      if (this.previousTabIndex) {
        this.cell.setAttribute('tabIndex', this.previousTabIndex);
      }
      this.cellInput.removeAttribute('disabled');
    }

    this.enabled = true;
  }

  /**
   * Disable cell.
   */
  disable() {
    this.enabled = false;

    if (this.cellInput) {
      this.cellInput.setAttribute('disabled', 'disabled');
    }
    this.previousTabIndex = this.cell.getAttribute('tabIndex');
    this.cell.removeAttribute('tabIndex');
  }

  /**
   * Add solution word marker.
   * @param {number} id Id.
   */
  addSolutionWordIdMarker(id) {
    if (!id) {
      return;
    }

    // Id
    this.solutionWordMarker = document.createElement('div');
    this.solutionWordMarker.classList.add('h5p-crossword-cell-solution-word-marker');
    this.solutionWordMarker.innerText = id;
    this.cell.insertBefore(this.solutionWordMarker, this.cell.firstChild);

    // Circle
    this.solutionWordCircle = document.createElement('div');
    this.solutionWordCircle.classList.add('h5p-crossword-cell-solution-word-circle');
    this.cell.insertBefore(this.solutionWordCircle, this.cell.firstChild);

    this.solutionWordId = id;
  }
}
