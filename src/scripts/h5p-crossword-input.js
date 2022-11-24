import Overlay from './h5p-crossword-overlay';
import Util from './h5p-crossword-util';
import CrosswordCharList from './h5p-crossword-char-list';

/** Class representing the content */
export default class CrosswordInput {
  /**
   * @constructor
   * @param {object} params Parameters.
   */
  constructor(params = {}, callbacks) {
    this.params = Util.extend({
      l10n: {
        extraClue: 'Extra clue',
        closeWindow: 'Close Window'
      }
    }, params);

    this.callbacks = callbacks || {};
    this.callbacks.onFieldInput = this.callbacks.onFieldInput || (() => {});
    this.callbacks.onRead = callbacks.onRead || (() => {});

    // Input fields
    this.inputFields = [];
    this.extraClues = [];

    this.content = document.createElement('div');
    this.content.classList.add('h5p-crossword-input-container');

    const fieldsAcross = this.buildInputFieldsGroup({
      words: this.params.words.filter(word => word.orientation === 'across'),
      title: params.l10n.across
    });
    this.content.appendChild(fieldsAcross);

    const fieldsDown = this.buildInputFieldsGroup({
      words: this.params.words.filter(word => word.orientation === 'down'),
      title: params.l10n.down
    });
    this.content.appendChild(fieldsDown);

    this.overlay = new Overlay(
      {
        l10n: {
          closeWindow: this.params.l10n.closeWindow
        }
      },
      {
        onClose: () => {
          this.handleOverlayClosed();
        },
        onRead: (text => {
          this.callbacks.onRead(text);
        })
      }
    );
    params.overlayContainer.appendChild(this.overlay.getDOM());
  }

  /**
   * Return the DOM for this class.
   * @return {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Build group of input fields.
   * @param {object} params Parameters.
   */
  buildInputFieldsGroup(params) {
    params.words = params.words.sort((word1, word2) => word1.clueId - word2.clueId);

    const inputFieldsGroup = document.createElement('div');
    inputFieldsGroup.classList.add('h5p-crossword-input-fields-group');

    const title = document.createElement('div');
    title.classList.add('h5p-crossword-input-fields-group-title');
    title.innerText = params.title;
    inputFieldsGroup.appendChild(title);

    params.words.forEach(word => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('h5p-crossword-input-fields-group-wrapper');

      const wrapperClue = document.createElement('div');
      wrapperClue.classList.add('h5p-crossword-input-fields-group-wrapper-clue');
      wrapper.appendChild(wrapperClue);

      const clueId = document.createElement('div');
      clueId.classList.add('h5p-crossword-input-fields-group-clue-id');
      clueId.innerText = word.clueId;
      wrapperClue.appendChild(clueId);

      const clueContent = document.createElement('div');
      clueContent.classList.add('h5p-crossword-input-fields-group-clue-content');
      wrapperClue.appendChild(clueContent);

      const clue = document.createElement('span');
      clue.classList.add('h5p-crossword-input-fields-group-clue');
      clue.innerText = word.clue;
      clueContent.appendChild(clue);

      const answerLength = document.createElement('span');
      answerLength.classList.add('h5p-crossword-input-fields-group-answer-length');

      answerLength.innerText = `(${word.answer.split(' ').map(part => Util.unicodeLength(part)).join(',')})`;
      clueContent.appendChild(answerLength);

      // Optional extra clue info symbol for opening popup
      if (word.extraClue) {
        const machineName = (word.extraClue.library) ? word.extraClue.library.split(' ')[0] : null;
        if (machineName) {

          const instanceWrapper = document.createElement('div');
          instanceWrapper.classList.add('h5p-crossword-extra-clue-instance-wrapper');

          const extraClue = document.createElement('button');
          extraClue.classList.add('h5p-crossword-input-fields-group-extra-clue');
          const ariaLabelParams = {
            clueId: word.clueId,
            orientation: word.orientation,
            clue: word.clue
          };
          extraClue.setAttribute('aria-label', this.params.a11y.extraClueFor.replace('@clue', this.buildAriaLabel(ariaLabelParams)));
          extraClue.setAttribute('title', this.params.l10n.extraClue);
          clueContent.appendChild(extraClue);

          extraClue.addEventListener('click', () => {
            if (this.disabled) {
              return;
            }

            this.disable();

            if (machineName === 'H5P.Video') {
              word.extraClue.params.fit = false;
            }
            else if (machineName === 'H5P.Audio') {
              word.extraClue.params.playerMode = 'full';
              word.extraClue.params.fitToWrapper = true;
            }

            this.overlay.setContent(instanceWrapper);
            this.previousFocus = extraClue;
            this.overlay.show();

            this.extraClueInstance = H5P.newRunnable(
              word.extraClue,
              this.params.contentId,
              H5P.jQuery(instanceWrapper)
            );
          });

          this.extraClues.push(extraClue);
        }
      }

      const inputField = document.createElement('input');
      inputField.classList.add('h5p-crossword-input-fields-group-input');
      const ariaLabelParams = {
        clueId: word.clueId,
        orientation: word.orientation,
        clue: word.clue,
        length: Util.unicodeLength(word.answer)
      };
      inputField.setAttribute('aria-label', this.buildAriaLabel(ariaLabelParams));
      inputField.setAttribute('autocomplete', 'off');
      inputField.setAttribute('autocorrect', 'off');
      inputField.setAttribute('spellcheck', 'false');

      wrapper.appendChild(inputField);

      // Highlight cells in grid and set focus to entry cell
      inputField.addEventListener('focus', () => {
        if (this.disabled) {
          return;
        }

        setTimeout(() => {
          this.callbacks.onFieldInput({
            clueId: word.clueId,
            orientation: word.orientation,
            cursorPosition: Math.min(
              this.getInputFieldSelectionStart(inputField),
              Util.unicodeLength(word.answer) - 1
            ),
            text: inputField.value,
            readOffset: -1 // don't read
          });
        }, 0); // selectionStart will be 0 before DOM rendered
      });

      // Make the input field "overwrite" instead "add" characters
      inputField.addEventListener('keydown', (event) => {
        if (Util.CONTROL_KEY_CODES.indexOf(event.keyCode) !== -1) {
          return;
        }

        // Take care of key input tools that may send event without key
        if (
          event.code === undefined &&
          event.key === undefined &&
          event.keyCode === undefined
        ) {
          return;
        }

        const start = inputField.selectionStart;
        inputField.selectionEnd = start + 1;

        /*
         * Samsung's virtual keyboard of Android devices may add redundant
         * characters that lead to wrong input. The workaround enforces to
         * only add one character by comparing the inputField.value before and
         * after the glitch happens and computing the true difference.
         */
        const before = Util.toUpperCase(inputField.value, Util.UPPERCASE_EXCEPTIONS);

        clearTimeout(this.tableUpdateTimeout);
        this.tableUpdateTimeout = setTimeout(() => {
          const after = this.applySamsungWorkaround(
            before,
            Util.toUpperCase(inputField.value, Util.UPPERCASE_EXCEPTIONS)
          );

          // Take care of text input tools that buffer key strokes
          if (before.replace(/＿/g, '') === after) {
            return; // No need to do anything
          }

          this.setInputFieldValue(inputField, after);
          inputField.setSelectionRange(start + 1, start + 1);

          this.callbacks.onFieldInput({
            clueId: word.clueId,
            orientation: word.orientation,
            cursorPosition: Math.min(this.getInputFieldSelectionStart(inputField), Util.unicodeLength(word.answer) - 1),
            text: inputField.value,
            readOffset: -1 // don't read
          });
        }, 0); // selectionStart will be 0 before DOM rendered
      }, false);

      // Only update table if input is valid or using arrow keys
      inputField.addEventListener('keyup', (event) => {
        if (event.keyCode === 229) {
          return; // workaround for Android specific code
        }

        if (Util.CONTROL_KEY_CODES.indexOf(event.keyCode) !== -1) {
          if ([8, 35, 36, 37, 38, 39, 40, 46].indexOf(event.keyCode) === -1) {
            // None of backspace, home, end, left, right, up, down, delete
            return;
          }
        }

        // Take care of key input tools that may send event without key
        if (
          event.code === undefined &&
          event.key === undefined &&
          event.keyCode === undefined
        ) {
          return;
        }

        // Sync cursor position in table
        let cursorPosition = this.getInputFieldSelectionStart(inputField);
        if (event.code === 'Home' || event.code === 'ArrowUp') {
          cursorPosition = 0;
        }
        else if (event.code === 'End' || event.code === 'ArrowDown') {
          cursorPosition = Math.min(
            Util.unicodeLength(inputField.value),
            this.inputFields.find(inField => inField.inputField === inputField).maxLength - 1
          );
        }

        this.setInputFieldValue(inputField, inputField.value);
        inputField.setSelectionRange(
          Util.unicodeSubstring(inputField.value, 0, cursorPosition).length,
          Util.unicodeSubstring(inputField.value, 0, cursorPosition).length
        );

        this.callbacks.onFieldInput({
          clueId: word.clueId,
          orientation: word.orientation,
          cursorPosition: cursorPosition,
          text: inputField.value,
          readOffset: ([8, 37, 38, 39, 40, 46].indexOf(event.keyCode) === -1) ? 1 : 0
        });
      });

      // Clean text from clipboard when pasting
      inputField.addEventListener('paste', (event) => {
        if (this.disabled) {
          return;
        }

        event.preventDefault();

        let pasteText = event.clipboardData.getData('text');

        const start = this.getInputFieldSelectionStart(inputField);
        const maxLength = this.inputFields.find(inField => inField.inputField === inputField).maxLength;

        // text up to start position + pasted text
        let text = `${Util.unicodeSubstring(inputField.value, 0, start)}${pasteText}`;
        const cursorPosition = Math.min(Util.unicodeLength(text), maxLength);

        // attach text up to maxLength
        text = `${text}${Util.unicodeSubstring(inputField.value, Util.unicodeLength(text), maxLength)}`;
        this.setInputFieldValue(inputField, text);

        inputField.setSelectionRange(
          Util.unicodeSubstring(inputField.value, 0, cursorPosition).length,
          Util.unicodeSubstring(inputField.value, 0, cursorPosition).length
        );
      });

      const listLabel = this.params.a11y.resultFor
        .replace('@clue', `${word.clueId} ${this.params.a11y[word.orientation]}. ${word.clue} .`);

      const solution = new CrosswordCharList({
        a11y: {
          listLabel: listLabel
        }
      });
      wrapper.appendChild(solution.getDOM());

      this.inputFields.push({
        clue: wrapperClue,
        inputField: inputField,
        orientation: word.orientation,
        clueId: word.clueId,
        solution: solution,
        maxLength: Util.unicodeLength(word.answer)
      });

      this.setInputFieldValue(inputField, ''); // Initialize with placeholders

      inputFieldsGroup.appendChild(wrapper);
    });

    return inputFieldsGroup;
  }

  /**
   * Fix Samsung virtual keyboard glitch
   * @param {string} before Value of text before Samsung glitch.
   * @param {string} after Value of text after Samsung glitch.
   * @return {string} Value of text that should be rendered.
   */
  applySamsungWorkaround(before = '', after = '') {
    // Make strings have same length
    while (Util.unicodeLength(before) < Util.unicodeLength(after)) {
      before = `${before}${Util.CHARACTER_PLACEHOLDER}`;
    }
    while (Util.unicodeLength(after) < Util.unicodeLength(before)) {
      after = `${after}${Util.CHARACTER_PLACEHOLDER}`;
    }

    let beforeUnicode = [];
    let afterUnicode = [];

    for (let i = 0; i < Util.unicodeLength(before); i++) {
      beforeUnicode.push(Util.unicodeSubstring(before, i, i + 1));
      afterUnicode.push(Util.unicodeSubstring(after, i, i + 1));
    }

    // Compute expected diff between before and after
    const trueDiff = [];
    for (let i = beforeUnicode.length - 1; i >= 0; i--) {
      if (beforeUnicode[i] === afterUnicode[i]) {
        trueDiff[i] = Util.CHARACTER_PLACEHOLDER;
      }
      else if (i + 1 < beforeUnicode.length && trueDiff[i + 1] !== '＿') {
        trueDiff[i] = trueDiff[i + 1];
        trueDiff[i + 1] = Util.CHARACTER_PLACEHOLDER;
      }
      else {
        trueDiff[i] = afterUnicode[i];
      }
    }

    // Build expected value to be rendered
    let result = [];
    let placeholder = ' ';
    for (let i = beforeUnicode.length - 1; i >= 0; i--) {
      if (trueDiff[i] !== Util.CHARACTER_PLACEHOLDER) {
        placeholder = Util.CHARACTER_PLACEHOLDER;
      }

      let nextChar;
      if (trueDiff[i] !== Util.CHARACTER_PLACEHOLDER) {
        nextChar = trueDiff[i];
      }
      else if (before[i] !== Util.CHARACTER_PLACEHOLDER) {
        nextChar = beforeUnicode[i];
      }
      else {
        nextChar = placeholder;
      }

      result[i] = nextChar;
    }

    return result.join('').trimRight();
  }

  /**
   * Set input field value.
   *
   * @param {HTMLElement} field Input field.
   * @param {string} value Value.
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.forceValue=true] If true, that exact (uppercase) value will be used.
   */
  setInputFieldValue(field, value, params = {forceValue: true}) {
    value = Util.toUpperCase(value, Util.UPPERCASE_EXCEPTIONS);

    /*
     * If `forceValue` is set to true, we could keep the crossword cells and
     * the input fields in sync perfectly, but then editing the input fields
     * may become very awkward if there are blanks within. Let's wait ...
     */
    let newValue = '';
    if (!params.forceValue) {
      for (let char of Util.unicodeSplitChars(value)) {
        if (char === ' ') {
          break;
        }
        newValue = `${newValue}${char}`;
      }
    }
    else {
      newValue = value;

      // Set placeholders
      const placeholder = new Array(this.inputFields.find(inField => inField.inputField === field).maxLength + 1).join(Util.CHARACTER_PLACEHOLDER);
      newValue = placeholder
        .split('')
        .map((char, index) => {
          if (Util.unicodeLength(newValue) > index && Util.unicodeCharAt(newValue, index) !== ' ') {
            return Util.unicodeCharAt(newValue, index);
          }

          return char;
        })
        .join('');
    }

    field.value = Util.toUpperCase(newValue, Util.UPPERCASE_EXCEPTIONS);
  }

  /**
   * Get input field selection start considering unicode graphemes.
   * @param {HTMLElement} inputField Text input field.
   * @return {number} Selection start considering unicode graphemes.
   */
  getInputFieldSelectionStart(inputField) {
    return Util.unicodeLength(inputField.value.substring(0, inputField.selectionStart));
  }

  /**
   * Build aria label for cell.
   * @param {object} params Parameters.
   * @return {string} Aria label for cell.
   */
  buildAriaLabel(params) {
    const ariaLabels = [`${params.clueId} ${this.params.a11y[params.orientation]}. ${params.clue}`];
    if (params.length) {
      ariaLabels.push(this.params.a11y.lettersWord.replace('@length', params.length));
    }

    return ariaLabels.join(', ');
  }

  /**
   * Fill fields.
   * @param {object[]} params Parameters.
   * @param {number} params.clueId Clue id.
   * @param {string} params.orientation Orientation.
   * @param {string} params.text Text to update field with.
   */
  fillFields(params) {
    params.forEach(param => {
      const fields = this.inputFields.filter(field => field.orientation === param.orientation && field.clueId === param.clueId);
      if (fields.length > 0) {
        this.setInputFieldValue(fields[0].inputField, param.text);
      }
    });
  }

  /**
   * Focus clue.
   * @param {object} params Parameters.
   * @param {number} params.clueId Clue id.
   * @param {string} params.orientation Orientation.
   */
  focusClue(params) {
    this.inputFields.forEach(field => {
      field.clue.classList.remove('h5p-crossword-input-fields-group-clue-highlight-focus');
    });

    const fields = this.inputFields.filter(field => field.orientation === params.orientation && field.clueId === params.clueId);
    if (fields.length > 0) {
      fields[0].clue.classList.add('h5p-crossword-input-fields-group-clue-highlight-focus');
    }
  }

  /**
   * Check answer for words.
   * @param {object} params Parameters.
   */
  checkAnswerWords(params) {
    // ScorePoints
    this.scorePoints = this.scorePoints || new H5P.Question.ScorePoints();

    this.inputFields.forEach(field => {
      field.solution.show();

      const matchingResult = params
        .filter(param => param.clueId === field.clueId && param.orientation === field.orientation)
        .shift();

      let scoreExplanation, result;
      const ariaLabels = [];
      ariaLabels.push(matchingResult.answer);

      if (matchingResult.score === -1) {
        scoreExplanation = this.scorePoints.getElement(false);
        result = 'wrong';
        ariaLabels.push(this.params.a11y.wrong);
        ariaLabels.push(`-1 ${this.params.a11y.point}`);
      }
      else if (matchingResult.score === 1) {
        scoreExplanation = this.scorePoints.getElement(true);
        result = 'correct';
        ariaLabels.push(this.params.a11y.correct);
        ariaLabels.push(`1 ${this.params.a11y.point}`);
      }
      else {
        result = 'neutral';
      }

      field.solution.setChars([{
        ariaLabel: `${ariaLabels.join('. ')}.`,
        char: field.inputField.value.replace(Util.CHARACTER_PLACEHOLDER, ' '),
        result: result,
        scoreExplanation: scoreExplanation
      }]);
    });
  }

  /**
   * Check answers.
   * @param {object[]} params Parameters.
   */
  checkAnswer(params) {
    // ScorePoints
    this.scorePoints = this.scorePoints || new H5P.Question.ScorePoints();

    // Keep track of score for crossection characters, don't show score twice
    const scorePointsAwarded = [];

    this.inputFields.forEach(field => {
      field.solution.show();

      // Chars are sorted by position already
      const cellInfos = params.filter(cell => {
        if (field.orientation === 'across') {
          return cell.clueIdAcross === field.clueId;
        }
        else if (field.orientation === 'down') {
          return cell.clueIdDown === field.clueId;
        }
        return false;
      });

      // Prepare list item parameters
      let inputChars = (Util.toUpperCase(field.inputField.value, Util.UPPERCASE_EXCEPTIONS)).split('');

      let listItemParams = [];
      cellInfos.forEach((cellInfo, index) => {
        // Prevent crossection cells from being counted twice
        const cellAlreadyScored = scorePointsAwarded.some(positions => {
          return positions.row === cellInfo.position.row && positions.column === cellInfo.position.column;
        });
        scorePointsAwarded.push(cellInfo.position);

        // Fill up inputs with space
        const char = (Util.unicodeLength(inputChars) > index) ? Util.unicodeCharAt(inputChars, index) : ' ';

        let result;
        let scoreExplanation;
        if (!cellInfo.answer || cellInfo.answer.trim() === '' || cellInfo.answer === Util.CHARACTER_PLACEHOLDER) {
          result = 'neutral';
        }
        else if (cellInfo.answer === cellInfo.solution) {
          result = 'correct';
          if (!cellAlreadyScored) {
            scoreExplanation = this.scorePoints.getElement(true);
          }
        }
        else if (this.params.applyPenalties) {
          result = 'wrong';
          if (!cellAlreadyScored) {
            scoreExplanation = this.scorePoints.getElement(false);
          }
        }
        else {
          result = 'neutral';
        }

        const ariaLabels = [];
        ariaLabels.push(`${this.params.a11y.letterSevenOfNine.replace('@position', index + 1).replace('@length', cellInfos.length)}`);
        ariaLabels.push((!cellInfo.answer || cellInfo.answer.trim() === '') ? this.params.a11y.empty : cellInfo.answer);
        if (result === 'correct') {
          ariaLabels.push(this.params.a11y.correct);
          ariaLabels.push(`1 ${this.params.a11y.point}`);
        }
        else if (result === 'wrong') {
          ariaLabels.push(this.params.a11y.wrong);
          ariaLabels.push(`-1 ${this.params.a11y.point}`);
        }

        listItemParams.push({
          ariaLabel: `${ariaLabels.join('. ')}.`,
          char: char.replace(Util.CHARACTER_PLACEHOLDER, ' ') || '&nbsp;',
          result: result,
          scoreExplanation: scoreExplanation
        });
      });

      field.solution.setChars(listItemParams);
    });
  }

  /**
   * Show solutions.
   * @param {object[]} params Parameters.
   */
  showSolutions(params = []) {
    this.inputFields.forEach(field => {
      let param = params.filter(param => {
        return param.clueId === field.clueId && param.orientation === field.orientation;
      });

      if (!param || param.length === 0) {
        return;
      }
      param = param[0];

      this.setInputFieldValue(field.inputField, param.answer);

      field.inputField.readOnly = true;
      field.inputField.removeAttribute('disabled');

      const ariaLabel = this.params.a11y.solutionFor
        .replace('@clue', `${param.clueId} ${this.params.a11y[param.orientation]}. ${param.clue} .`)
        .replace('@solution', param.answer);
      field.inputField.setAttribute('aria-label', ariaLabel);

      field.solution.disable();
    });
  }

  /**
   * Reset.
   */
  reset() {
    this.inputFields.forEach(field => {
      this.setInputFieldValue(field.inputField, '');
      field.inputField.readOnly = false;

      field.clue.classList.remove('h5p-crossword-input-fields-group-clue-highlight-focus');
      field.solution.hide();
      field.solution.reset();
    });
  }

  /**
   * Resize.
   */
  resize() {
    if (this.extraClueInstance) {
      this.extraClueInstance.trigger('resize');
    }
    this.overlay.resize();
  }

  /**
   * Enable input fields.
   */
  enable() {
    this.inputFields.forEach(field => {
      field.inputField.removeAttribute('disabled');
    });

    this.extraClues.forEach(extraClue => {
      extraClue.removeAttribute('disabled');
    });
    this.content.classList.remove('h5p-crossword-disabled');

    this.disabled = false;
  }

  /**
   * Disable input fields.
   */
  disable() {
    this.disabled = true;

    this.extraClues.forEach(extraClue => {
      extraClue.setAttribute('disabled', true);
    });
    this.content.classList.add('h5p-crossword-disabled');

    this.inputFields.forEach(field => {
      field.inputField.setAttribute('disabled', true);
    });
  }

  /**
   * Unhighlight all fields.
   */
  unhighlight() {
    this.inputFields.forEach(field => {
      field.clue.classList.remove('h5p-crossword-input-fields-group-clue-highlight-focus');
    });
  }

  /**
   * Handle closing of overlay.
   */
  handleOverlayClosed() {
    if (this.extraClueInstance && typeof this.extraClueInstance.pause === 'function') {
      this.extraClueInstance.pause(); // Stop media from playing
    }

    this.overlay.hide();
    this.enable();

    if (this.previousFocus) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }
}
