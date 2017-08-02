/*
 * vim: ts=4:sw=4:expandtab
 */
(function () {
  'use strict';
  window.Whisper = window.Whisper || {};

  var State = {
    IMPORTING: 1,
    COMPLETE: 2
  };

  Whisper.ImportView = Whisper.View.extend({
    templateName: 'app-migration-screen',
    className: 'app-loading-screen',
    events: {
      'click .import': 'onImport',
      'click .restart': 'onRestart',
      'click .cancel': 'onCancel',
    },
    initialize: function() {
      this.render();
      this.pending = Promise.resolve();
    },
    render_attributes: function() {
      var message;
      var importButton;
      var hideProgress = true;
      var restartButton;
      var cancelButton;

      if (this.error) {
        return {
          message: i18n('importError'),
          hideProgress: true,
          importButton: i18n('tryAgain'),
        };
      }

      switch (this.state) {
        case State.COMPLETE:
          message = i18n('importComplete');
          restartButton = i18n('restartSignal');
          break;
        case State.IMPORTING:
          message = i18n('importing');
          hideProgress = false;
          break;
        default:
          message = i18n('importInstructions');
          importButton = i18n('import');
          cancelButton = i18n('cancel');
      }

      return {
        hideProgress: hideProgress,
        message: message,
        importButton: importButton,
        restartButton: restartButton,
        cancelButton: cancelButton,
      };
    },
    onRestart: function() {
      return window.restart();
    },
    onCancel: function() {
      this.trigger('cancel');
    },
    onImport: function() {
      this.error = null;

      this.state = State.IMPORTING;
      this.render();

      // Wait for prior database interaction to complete
      this.pending = this.pending.then(function() {
        // For resilience to interruptions, clear database both before import and after
        return Whisper.Backup.clearDatabase();
      }).then(function() {
        return Whisper.Backup.importFromDirectory();
      }).then(function() {
        // clearing any migration-related state inherited from the Chome App
        window.storage.remove('migrationState');
        window.storage.remove('migrationEverCompleted');

        this.state = State.COMPLETE;
        this.render();
      }.bind(this)).catch(function(error) {
        if (error.name !== 'ChooseError') {
          this.error = error.message;
        }

        this.state = null;
        this.render();

        if (this.error) {
          return Whisper.Backup.clearDatabase();
        }
      }.bind(this));
    }
  });
})();
