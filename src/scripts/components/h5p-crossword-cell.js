import Util from '@services/util.js';
import './h5p-crossword-cell.scss';

/** Class representing a cell */
export default class CrosswordCell {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {

    // Sanitization
    this.params = Util.extend({
      instantFeedback: false,
      clueIdMarker: null,
      solution: null,
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
    this.position = { row: params.row, column: params.column };

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
        this.cell.style.backgroundColor = this.params.theme.backgroundColor;
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
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.cell;
  }

  /**
   * Build cell.
   * @param {object} params Parameters.
   * @returns {HTMLElement} Cell element.
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
   * @returns {HTMLElement} Cell content wrapper element.
   */
  buildCellContentWrapper() {
    const cellContentWrapper = document.createElement('div');
    cellContentWrapper.classList.add('h5p-crossword-cell-content-wrapper');
    return cellContentWrapper;
  }

  /**
   * Build cell canvas. Displays input. Used to hide select markers on Android.
   * @returns {HTMLElement} Cell canvas element.
   */
  buildCellCanvas() {
    const cellCanvas = document.createElement('div');
    cellCanvas.classList.add('h5p-crossword-cell-canvas');
    return cellCanvas;
  }

  /**
   * Build cell input. Only takes input, but canvas displays it.
   * @returns {HTMLElement} Cell input element.
   */
  buildCellInput() {
    const cellInput = document.createElement('input');
    cellInput.classList.add('h5p-crossword-cell-content');
    cellInput.setAttribute('type', 'text');
    cellInput.setAttribute('maxLength', 1);
    cellInput.setAttribute('autocomplete', 'new-password'); // 'off' doesn't suffice for all browsers
    cellInput.setAttribute('autocorrect', 'off');
    cellInput.setAttribute('spellcheck', 'false');
    cellInput.setAttribute('tabindex', '-1');

    cellInput.addEventListener('input', (event) => {
      if (!this.enabled) {
        return;
      }

      this.setAnswer(Util.toUpperCase(event.data, Util.UPPERCASE_EXCEPTIONS), true);
      this.cellInput.value = '';
      const cellInformation = this.getInformation();

      this.callbacks.onKeyup(cellInformation);

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

      if (event.repeat) {
        event.preventDefault(); // Skip InputEvent that would repeat
        return;
      }

      if (!event.key || event.key === 'Unidentified') {
        return; // Use keyup listener as fallback for old browsers
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const nextPositionOffset = this.getAnswer() ? 0 : -1;

        this.setAnswer('');
        const cellInformation = this.getInformation();
        cellInformation.keepPosition = true;
        cellInformation.nextPositionOffset = nextPositionOffset;
        this.cellInput.value = '';
        this.callbacks.onKeyup(cellInformation);
      }
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

      if (event.repeat) {
        event.preventDefault(); // Skip InputEvent that would repeat
        return;
      }

      // Delete and Backspace
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const nextPositionOffset = this.getAnswer() ? 0 : -1;

        this.setAnswer('');
        const cellInformation = this.getInformation();
        cellInformation.keepPosition = true;
        cellInformation.nextPositionOffset = nextPositionOffset;
        this.cellInput.value = '';
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
   * @returns {string|null} Solution char or null.
   */
  getSolution() {
    return this.params.solution;
  }

  /**
   * Get current answer.
   * @returns {string} Current answer.
   */
  getCurrentAnswer() {
    return this.cell.innerText.substring(0, 1);
  }

  /**
   * Get cell information.
   * @returns {object} Cell information.
   */
  getInformation() {
    return {
      answer: (this.answer) ? Util.toUpperCase(this.answer, Util.UPPERCASE_EXCEPTIONS) : this.answer,
      clueIdAcross: this.params.clueIdAcross,
      clueIdDown: this.params.clueIdDown,
      position: this.position,
      score: this.getScore(),
      solution: this.params.solution,
      solutionWordId: this.solutionWordId || null,
    };
  }

  /**
   * Get cell position.
   * @returns {object} Cell position as {row: x, column: y}.
   */
  getPosition() {
    return this.position;
  }

  /**
   * Get clue id.
   * @param {string} [orientation] Orientation.
   * @returns {number|null} Clue id.
   */
  getClueId(orientation = 'across') {
    if (orientation === 'down') {
      return this.params.clueIdDown;
    }
    else if (orientation === 'across') {
      return this.params.clueIdAcross;
    }

    return null;
  }

  /**
   * Get current answer.
   * @returns {string} Current answer.
   */
  getAnswer() {
    return this.answer;
  }

  /**
   * Get score.
   * @returns {number|undefined} Wrong: -1; Missing: 0; Correct 1
   */
  getScore() {
    if (!this.params.solution) {
      return; // Empty
    }

    if (
      this.params.solution === ' ' &&
        (!this.answer || this.answer.trim() === '' || this.answer === Util.CHARACTER_PLACEHOLDER)
    ) {
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
   * @returns {boolean|null} True if filled, null if not filled but not expected, else false.
   */
  isFilled() {
    if (!this.params.solution) {
      return null;
    }

    if (this.params.solution === ' ') {
      return null;
    }

    if (this.answer && this.answer !== ' ') {
      return true;
    }

    return false;
  }

  /**
   * Set tab index.
   * @param {string} index Tab index.
   */
  setTabIndex(index) {
    if (isNaN(parseInt(index))) {
      return;
    }

    // Cell with character or empty cell
    if (this.cellInput) {
      this.cellInput.setAttribute('tabindex', index);
    }
    else {
      this.cell.setAttribute('tabindex', index);
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
      const className = `h5p-crossword-solution${  (state) ? `-${state}` : ''}`;
      this.cell.classList.add(className);
    }
  }

  /**
   * Set answer.
   * @param {string} answer Answer character.
   * @param {boolean} [readFeedback] If true, read feedback in instant feedback mode.
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
      this.cellCanvas.innerText = Util.toUpperCase(
        answer.replace(new RegExp(Util.CHARACTER_PLACEHOLDER, 'g'), ' '),
        Util.UPPERCASE_EXCEPTIONS,
      );
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

    const className = `h5p-crossword-highlight${  (type) ? `-${type}` : ''}`;
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
      const className = `h5p-crossword-highlight${  (type) ? `-${type}` : ''}`;
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
   * Get solution state.
   * @returns {string} Solution state: 'correct'|'wrong'|'undefined'|'neutral'.
   */
  getSolutionState() {
    const answer = (this.answer || '').trim();

    if (answer === this.params.solution && answer !== '') {
      return 'correct';
    }
    else if (answer === '' || answer === Util.CHARACTER_PLACEHOLDER) {
      return 'undefined';
    }
    else {
      if (this.params.applyPenalties) {
        return 'wrong';
      }
      else {
        return 'neutral';
      }
    }
  }

  /**
   * Check answer.
   * @param {boolean} [read] If true, will read correct/wrong via readspeaker.
   */
  checkAnswer(read = false) {
    let solutionState = this.getSolutionState();
    solutionState = (solutionState === 'undefined') ? undefined : solutionState;

    this.setSolutionState(solutionState);

    if (!read) {
      return;
    }

    if (solutionState === 'correct') {
      this.callbacks.onRead(this.params.a11y.correct);
    }
    else if (solutionState === 'wrong') {
      this.callbacks.onRead(this.params.a11y.wrong);
    }
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.keepCorrectAnswers] If true, correct answers are kept.
   * @returns {boolean} True if answer was kept.
   */
  reset(params = {}) {
    const keepAnswer =
      params.keepCorrectAnswers && this.getSolutionState() === 'correct';

    this.unhighlight();
    this.setSolutionState();

    if (!keepAnswer) {
      this.setAnswer('', false);
    }

    const cellInformation = this.getInformation();
    this.callbacks.onKeyup(cellInformation, true);

    return keepAnswer;
  }

  /**
   * Enable cell.
   */
  enable() {
    if (this.cellInput) {
      if (this.previousTabIndex) {
        this.cell.setAttribute('tabindex', this.previousTabIndex);
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
    this.previousTabIndex = this.cell.getAttribute('tabindex');
    this.cell.removeAttribute('tabindex');
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
