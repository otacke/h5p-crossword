var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.Crossword'] = (function () {
  return {
    0: {
      /**
       * Asynchronous content upgrade hook.
       *
       * Add new background parameter, was black by default.
       * Add new scoreWords parameter, was false by default.
       * @param {object} parameters Content parameters.
       * @param {function} finished Callback when finished.
       * @param {object} extras Extra parameters such as metadata, etc.
       */
      2: function (parameters, finished, extras) {
        parameters.behaviour.backgroundColor = '#000000';
        parameters.behaviour.scoreWords = false;

        finished(null, parameters, extras);
      },
      /**
       * Asynchronous content upgrade hook.
       *
       * Add new applyPenalties parameter, was true by default.
       * @param {object} parameters Content parameters.
       * @param {function} finished Callback when finished.
       * @param {object} extras Extra parameters such as metadata, etc.
       */
      3: function (parameters, finished, extras) {
        parameters.behaviour.applyPenalties = true;

        finished(null, parameters, extras);
      },
      /**
       * Asynchronous content upgrade hook.
       *
       * Move options to new theme group.
       * @param {object} parameters Content parameters.
       * @param {function} finished Callback when finished.
       * @param {object} extras Extra parameters such as metadata, etc.
       */
      4: function (parameters, finished, extras) {
        if (parameters && parameters.behaviour) {
          parameters.theme = {
            backgroundColor: '#173354',
            gridColor: '#000000',
            cellBackgroundColor: '#ffffff',
            cellColor: '#000000',
            clueIdColor: '#606060',
            cellBackgroundColorHighlight: '#3e8de8',
            cellColorHighlight: '#ffffff',
            clueIdColorHighlight: '#e0e0e0',
          };

          if (parameters.behaviour.backgroundImage) {
            parameters.theme.backgroundImage = parameters.behaviour.backgroundImage;
          }
          delete parameters.behaviour.backgroundImage;

          if (parameters.behaviour.backgroundColor) {
            parameters.theme.backgroundColor = parameters.behaviour.backgroundColor;
          }
          delete parameters.behaviour.backgroundColor;
        }

        finished(null, parameters, extras);
      },
      7: function (parameters, finished, extras) {
        if (parameters?.theme) {
          delete parameters.theme.gridColor;
          delete parameters.theme.cellBackgroundColor;
          delete parameters.theme.cellColor;
          delete parameters.theme.clueIdColor;
          delete parameters.theme.cellBackgroundColorHighlight;
          delete parameters.theme.cellColorHighlight;
          delete parameters.theme.clueIdColorHighlight;

          if (parameters.theme.backgroundColor === '#173354') {
            parameters.theme.backgroundColor = 'color-mix(in srgb, var(--h5p-theme-main-cta-base), #000000 50%)';
          }
        }

        finished(null, parameters, extras);
      },
    },
  };
})();
