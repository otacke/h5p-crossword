import Util from '@services/util.js';
import { DEFAULT_DESCRIPTION } from '@scripts/h5p-crossword.js';

/** @constant {string} XAPI_PLACEHOLDER Placeholder for a gap. */
export const XAPI_PLACEHOLDER = '__________';

/**
 * Mixin containing methods for xapi stuff.
 */
export default class XAPI {
  /**
   * Build xAPI answer event.
   * @returns {H5P.XAPIEvent} XAPI answer event.
   */
  getXAPIAnswerEvent() {
    const xAPIEvent = this.createXAPIEvent('answered');
    xAPIEvent.setScoredResult(this.getScore(), this.getMaxScore(), this,
      true, this.isPassed());
    xAPIEvent.data.statement.result.response = this.content.getXAPIResponse();

    return xAPIEvent;
  }

  /**
   * Create an xAPI event for Dictation.
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);
    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition());
    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};
    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    definition.name['en-US'] = definition.name[this.languageTag]; // Fallback
    definition.description = {};
    definition.description[this.languageTag] = `${this.getXAPIDescription()}`;
    definition.description['en-US'] = definition.description[this.languageTag]; // Fallback
    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'fill-in';
    definition.correctResponsesPattern = this.content.getXAPICorrectResponsesPattern();

    return definition;
  }

  /**
   * Get tasks description.
   * @returns {string} Description.
   */
  getXAPIDescription() {
    // The below replaceAll makes sure we don't get any unwanted XAPI_PLACEHOLDERs in the description
    const introduction = this.params.taskDescription
      .replaceAll(/_{10,}/gi, '_________') || DEFAULT_DESCRIPTION;
    const fields = this.content.getXAPIDescription();
    return `${introduction}${fields}`;
  }
}
