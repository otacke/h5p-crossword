// Import required classes
import './../styles/h5p-crossword-titlebar.scss';
import TitlebarButton from './h5p-crossword-titlebar-button';
import Util from './h5p-crossword-util';

/** Class representing the content */
export default class Titlebar {
  /**
   * @constructor
   *
   * @param {object} params Parameter from editor.
   * @param {boolean} params.canHasFullScreen If true, will have fullscreen button.
   * @param {boolean} params.buttonQuit If true, will have quit button.
   * @param {string} params.title Title.
   * @param {object} params.a11y Accessibility strings.
   * @param {string} params.a11y.buttonEditActive Text for inactive button.
   * @param {string} params.a11y.buttonEditInactive Text for inactive button.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onbuttonEdit] Handles click.
   */
  constructor(params, callbacks) {
    // Set missing params
    this.params = Util.extend({
      baseClass: 'h5p-titlebar',
      title: '',
      a11y: {
      }
    }, params || {});

    // Sanitize callbacks
    this.callbacks = Util.extend(
      {
        onClickButtonInputMode: (() => {})
      }, callbacks
    );

    this.titleBar = document.createElement('div');
    this.titleBar.classList.add(`${this.params.baseClass}-title-bar`);

    this.buttons = {};

    // Button for switching views
    this.buttons['inputMode'] = new TitlebarButton(
      {
        l10n: {
          inactive: this.params.l10n.buttonInputModeNoAutoMove,
          active: this.params.l10n.buttonInputModeRegular
        },
        a11y: {
          inactive: this.params.a11y.buttonInputModeNoAutoMove,
          active: this.params.a11y.buttonInputModeRegular
        },
        classes: [
          'h5p-titlebar-button',
          'h5p-titlebar-button-input-mode'
        ],
        type: 'toggle',
        active: this.params.inputMode === 'regular'
      },
      {
        onClick: this.callbacks.onClickButtonInputMode
      }
    );
    this.titleBar.appendChild(this.buttons['inputMode'].getDOM());

    // Title
    const titleDOM = document.createElement('div');
    titleDOM.classList.add(`${this.params.baseClass}-title`);
    titleDOM.innerHTML = this.params.title;

    this.titleBar.appendChild(titleDOM);
  }

  /**
   * Return the DOM for this class.
   * @return {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.titleBar;
  }

  /**
   * Show button.
   * @param {string} buttonId Button id.
   */
  showButton(buttonId) {
    if (!this.buttons[buttonId]) {
      return;
    }

    this.buttons[buttonId].show();
  }

  /**
   * Hide button.
   * @param {string} buttonId Button id.
   */
  hideButton(buttonId) {
    if (!this.buttons[buttonId]) {
      return;
    }

    this.buttons[buttonId].hide();
  }

  /**
   * Focus button.
   * @param {string} buttonId Button id.
   */
  focusButton(buttonId) {
    if (!this.buttons[buttonId]) {
      return;
    }

    this.buttons[buttonId].focus();
  }

  /**
   * Toggle button active state.
   * @param {string} buttonId Button id.
   * @param {boolean} state Desired state.
   */
  toggleButtonActive(buttonId, state) {
    if (!this.buttons[buttonId]) {
      return;
    }

    // Toggle current state
    if (typeof state !== 'boolean') {
      state = !this.buttons[buttonId].isActive();
    }

    if (state === true) {
      this.buttons[buttonId].activate();
    }
    else {
      this.buttons[buttonId].deactivate();
    }
  }

  /**
   * Toggle button disabled state.
   * @param {string} buttonId Button id.
   * @param {boolean} state Desired state.
   */
  toggleButtonDisabled(buttonId, state) {
    if (!this.buttons[buttonId]) {
      return;
    }

    // Toggle current state
    if (typeof state !== 'boolean') {
      state = !this.buttons[buttonId].isDisabled();
    }

    if (state === true) {
      this.buttons[buttonId].disable();
    }
    else {
      this.buttons[buttonId].enable();
    }
  }

  /**
   * Determine whether a button is active.
   * @param {string} buttonId Button id.
   * @return {boolean|null} Button active state or null if buttonId not found.
   */
  isButtonActive(buttonId) {
    if (!this.buttons[buttonId]) {
      return null;
    }
    else {
      return this.buttons[buttonId].isActive();
    }
  }

  /**
   * Determine whether a button is disabled.
   * @param {string} buttonId Button id.
   * @return {boolean|null} Button disabled state or null if buttonId not found.
   */
  isButtonDisabled(buttonId) {
    if (!this.buttons[buttonId]) {
      return null;
    }
    else {
      return this.buttons[buttonId].isDisabled();
    }
  }
}
