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
    params.words = params.words.sort((word1, word2) => word1.orientation < word2.orientation);

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

      const clueId = document.createElement('span');
      clueId.classList.add('h5p-crossword-input-fields-group-clue-id');
      clueId.innerText = word.clueId;
      wrapperClue.appendChild(clueId);

      const clue = document.createElement('span');
      clue.classList.add('h5p-crossword-input-fields-group-clue');
      clue.innerText = word.clue;
      wrapperClue.appendChild(clue);

      const answerLength = document.createElement('span');
      answerLength.classList.add('h5p-crossword-input-fields-group-answer-length');
      answerLength.innerText = `(${word.answer.length})`;
      wrapperClue.appendChild(answerLength);

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
          wrapperClue.appendChild(extraClue);

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
        length: word.answer.length
      };
      inputField.setAttribute('aria-label', this.buildAriaLabel(ariaLabelParams));
      inputField.setAttribute('autocomplete', 'off');
      inputField.setAttribute('autocorrect', 'off');
      inputField.setAttribute('maxLength', word.answer.length);
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
            cursorPosition: Math.min(inputField.selectionStart, word.answer.length - 1),
            text: inputField.value,
            readOffset: -1 // don't read
          });
        }, 0); // selectionStart will be 0 before DOM rendered
      });

      inputField.addEventListener('click', () => {
        if (this.disabled) {
          return;
        }

        inputField.select();

        setTimeout(() => {
          this.callbacks.onFieldInput({
            clueId: word.clueId,
            orientation: word.orientation,
            cursorPosition: Math.min(inputField.selectionStart, word.answer.length - 1),
            text: inputField.value,
            readOffset: -1 // don't read
          });
        }, 0); // selectionStart will be 0 before DOM rendered
      });

      // Only update table if input is valid or using arrow keys
      inputField.addEventListener('keyup', (event) => {
        if (this.disabled) {
          return;
        }

        if (Util.CONTROL_KEY_CODES.indexOf(event.keyCode) !== -1) {
          if ([8, 37, 38, 39, 40, 46].indexOf(event.keyCode) === -1) {
            // None of backspace, left, right, up, down, delete
            return;
          }
        }

        this.setInputFieldValue(inputField, inputField.value);

        this.callbacks.onFieldInput({
          clueId: word.clueId,
          orientation: word.orientation,
          cursorPosition: inputField.selectionStart,
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

        const text = event.clipboardData.getData('text');
        this.setInputFieldValue(inputField, text.substr(0, inputField.getAttribute('maxLength')));
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
        solution: solution
      });

      inputFieldsGroup.appendChild(wrapper);
    });

    return inputFieldsGroup;
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
      for (let char of value.split('')) {
        if (char === ' ') {
          break;
        }
        newValue = `${newValue}${char}`;
      }
    }
    else {
      newValue = value;
    }

    field.value = Util.toUpperCase(newValue, Util.UPPERCASE_EXCEPTIONS);
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
        char: field.inputField.value,
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
        const char = (inputChars.length > index) ? inputChars[index] : ' ';

        let result;
        let scoreExplanation;
        if (!cellInfo.answer || cellInfo.answer.trim() === '') {
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
          char: char || '&nbsp;',
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
