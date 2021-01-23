var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.Crossword'] = (function () {
  return {
    0: {
      /**
       * Asynchronous content upgrade hook.
       *
       * Add new background parameter, was black by default.
       * Add new scoreWords parameter, was false by default.
       *
       * @param {Object} parameters
       * @param {function} finished
       */
      2: function (parameters, finished, extras) {
        parameters.behaviour.backgroundColor = '#000000';
        parameters.behaviour.scoreWords = false;

        finished(null, parameters, extras);
      }
    }
  };
})();
