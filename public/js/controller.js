

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

var MSG_ID = 0;
function Message(from, msg, timestamp) {
  this.id = MSG_ID++;
  this.from = from;
  this.message = msg;
  this.timestamp = timestamp;
  this.displayMessage = msg;
  this.incorrectWords = ['Test', 'Temp'];
}

angular.module('chatApp', [])

.filter('to_trusted', ['$sce', function($sce){
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}])

.factory('CorrectionCoordinator', [function() {
  var factory = {
    Coordinator: function(options) {
       var opts = {
        //Number of previous messages that are correctable
        previousMessageCount: 3,
        //start sequence of a correction
        correctionSequence: '*',

        /**
         * Remove highlights in the last n messages.
         */
        clearAllHighlights: function(n) {

        },

        /**
         * Add highlights to every instance of match in the last n messages.
         */
        highlightAllInstancesInMessages: function(match, n) {

        },

        /**
         * Add highlights to specific message and word.
         */
        highlightSepecificMessageWord: function(messageId, word, startingAtPos) {

        },

        /**
         * Return, for each message, an array of misspelt words in the last n messages.
         */
        getLastMessagesWithMisspeltWords: function(n) {

        },

        /**
         * Show a flat list of misspelt words in messages.
         */
        showPotentialWordsToCorrect: function(misspeltWords) {

        },

        /**
         * Hide the list.
         */
        hidePotentialWordsToCorrect: function() {

        },

        /**
         * Show a flat list of suggestions for the potentially misspelt word.
         */
        showCorrectionSuggestions: function(suggestions) {

        },

        hideCorrectionSuggestions: function() {

        },

        /**
         * Cancelled event.
         */
        cancelled: function() {

        },

        /**
         * Corrected event.
         */
        corrected: function(correction) {

        }
      };
      angular.extend(opts, options);

      var STATE_STANDARD = 0;
      var STATE_SELECTING_CORRECTION = 1;
      var STATE_REPLACING_WORD = 3;

      var state = STATE_STANDARD;

      //private
      function setState(newState) {
        state = newState;
      }

      //Public 
      this.STATE_STANDARD = STATE_STANDARD;
      this.STATE_SELECTING_CORRECTION = STATE_SELECTING_CORRECTION;
      this.STATE_REPLACING_WORD = STATE_REPLACING_WORD;

      this.getState = function() {
        return state;
      }
      /**
       * Cancel any state of the correction.
       */
      this.cancel = function() {
        if(state === STATE_STANDARD) {

        } else if(state === STATE_SELECTING_CORRECTION) {

          opts.clearAllHighlights(opts.previousMessageCount);
          opts.hidePotentialWordsToCorrect();
          opts.cancelled();
        } else if(state === STATE_REPLACING_WORD) {
          opts.clearAllHighlights(opts.previousMessageCount);
          opts.hideCorrectionSuggestions();
          opts.cancelled();
        }
      }

      ///Finding a correction

      /**
       * Handle typing and catching a correction sequence
       */ 
      this.currentMessageChanged = function(typing) {
        if(typing.startsWith(opts.correctionSequence) && state !== STATE_REPLACING_WORD) {
          setState(STATE_SELECTING_CORRECTION);
        }

        if(state === STATE_STANDARD) {

        } else if(state === STATE_SELECTING_CORRECTION) {
          if(typing.length <= 0) {
            //Get rid of highlights
            opts.clearAllHighlights(opts.previousMessageCount);
            setState(STATE_STANDARD);
            return;
          }
          var matchString = typing.substring(opts.correctionSequence.length);
          //Highlight the background of the matching words in the recent messages I've sent
          opts.highlightAllInstancesInMessages(matchString, opts.previousMessageCount);

          //Get the incorrectly spelt words from recent messages
          var possibleIncorrectMessages = opts.getLastMessagesWithMisspeltWords(opts.previousMessageCount);//Returns [[{word, pos, suggestions}]] for each message

          //merge words
          var incorrectWords = [];
          for(var i = 0; i < possibleIncorrectMessages.length; i++) {
            for(key in possibleIncorrectMessages[i].incorrectWords) {
              var word = possibleIncorrectMessages[i].incorrectWords[key];
              incorrectWords.push({
                messageId: possibleIncorrectMessages[i].messageId,
                pos: word.pos,
                word: word.word,
                suggestions: word.suggestions
              });
            }
          }
          //Allow the popup to appear that shows all the incorrectly spelt words
          opts.showPotentialWordsToCorrect(incorrectWords);

        } else if(state === STATE_REPLACING_WORD) {

        }
      }

      /// Correcting

      /**
       * Begin correcting this word 
       */
      this.beginCorrecting = function(word) {
        setState(STATE_REPLACING_WORD);
        opts.hidePotentialWordsToCorrect();
        opts.clearAllHighlights();
        opts.highlightSepecificMessageWord(word.messageId, word.word, word.pos);
        if(word.suggestions)
          opts.showCorrectionSuggestions(word.suggestions);
      }

      /**
       * Complete the correction.
       */
      this.correctWord = function(correction) {
        opts.hideCorrectionSuggestions();
        opts.corrected(correction);
        setState(STATE_STANDARD);
      }

    }
  };
  return factory;
}])

.controller('ChatController', ['$scope', '$http', '$timeout', 'CorrectionCoordinator', function($scope, $http, $timeout, CorrectionCoordinator) {
  $scope.messages = [];
  $scope.currentMessage = '';
  $scope.correcting = null;//Current word instance that is being corrected
  $scope.inputPaddingCss = 'auto';

  $scope.misspeltWords = [];
  $scope.potentialCorrections = [];

  var MAX_MESSAGES_TO_SEARCH = 5;

  var correctionCoordinator = new CorrectionCoordinator.Coordinator({
    previousMessageCount: 3,
    correctionSequence: '*',

    /**
     * Remove highlights in the last n messages.
     */
    clearAllHighlights: function(n) {
      var count = 0;
      for(var i = $scope.messages.length - 1; i >= 0; i--) {
        var msg = $scope.messages[i];
        if(msg.from === 'Me') {
          msg.displayMessage = msg.message;
          if(count++ > n)
            break;
        }
      }
      //$scope.$apply();
    },

    /**
     * Add highlights to every instance of match in the last n messages.
     */
    highlightAllInstancesInMessages: function(match, n) {
      var count = 0;
      for(var i = $scope.messages.length - 1; i >= 0; i--) {
        var msg = $scope.messages[i];
        if(msg.from === 'Me') {
          var regex = new RegExp(match, 'g');
          str = msg.message.replace(regex, "<span class='highlight'>"+match+"</span>");
          msg.displayMessage = str;
          if(count++ > n)
            break;
        }
      }
      //$scope.$apply();
    },

    /**
     * Add highlights to specific message and word.
     */
    highlightSepecificMessageWord: function(messageId, word, startingAtPos) {
      //go to startingAtPos in messageId and highlight first occurrence of word
      var msg = messageFromMessageId(messageId);
      var part0 = msg.message.substring(0, startingAtPos);
      var part1 = msg.message.substring(startingAtPos);
      part1 = part1.replace(word, "<span class='highlight'>"+word+"</span>");
      msg.displayMessage = part0 + part1;
      //$scope.$apply();
    },

    /**
     * Return, for each message, an array of misspelt words in the last n messages.
     */
    getLastMessagesWithMisspeltWords: function(n) {
      var count = 0;
      var badMessages = [];
      for(var i = $scope.messages.length - 1; i >= 0; i--) {
        var msg = $scope.messages[i];
        if(msg.from === 'Me') {
          badMessages.push({
            messageId: msg.id,
            incorrectWords: msg.incorrectWords}
          );

          if(count++ > n)
            break;
        }
      }
      return badMessages;
    },

    /**
     * Show a flat list of misspelt words in messages.
     */
    showPotentialWordsToCorrect: function(misspeltWords) {
      $scope.misspeltWords = misspeltWords;
    },

    /**
     * Hide the list.
     */
    hidePotentialWordsToCorrect: function() {
      $scope.misspeltWords = [];
    },

    /**
     * Show a flat list of suggestions for the potentially misspelt word.
     */
    showCorrectionSuggestions: function(suggestions) {
      $scope.potentialCorrections = suggestions;
    },

    hideCorrectionSuggestions: function() {
      $scope.potentialCorrections = [];
    },

    /**
     * Cancelled event.
     */
    cancelled: function() {
      $scope.clearUserInput();
      $scope.correcting = null;
    },

    /**
     * Corrected event.
     */
    corrected: function(correction) {
      //Update the word instance $scope.correcting
      var msg = messageFromMessageId($scope.correcting.messageId);
      msg.displayMessage = msg.message = msg.message.substring(0, $scope.correcting.pos) + correction + msg.message.substring($scope.correcting.pos + $scope.correcting.word.length);
      //$scope.$apply();

      $scope.clearUserInput();
      $scope.correcting = null;

      //trigger spell check on new message
      $http.get('/check?s=' + encodeURI(msg.message))
           .then(function(result) {
                msg.incorrectWords = result.data;
            });
      }
  });

  $scope.currentMessageChanged = function() {
    var typing = $scope.currentMessage;
    correctionCoordinator.currentMessageChanged(typing);
  }

  $scope.send = function() {
    if($scope.currentMessage.length <= 0) {
      return;
    }

    //Determin if it should send the message, change from finding correction into correcting or commiting the correction.
    if(correctionCoordinator.getState() === correctionCoordinator.STATE_STANDARD) {
      var from = 'Me';
      var message = new Message(from, $scope.currentMessage, new Date());
      $scope.messages.push(message);
      $scope.clearUserInput();
      
      //trigger spell check
      $http.get('/check?s=' + encodeURI(message.message))
           .then(function(result) {
              message.incorrectWords = result.data;
            });
    } else if(correctionCoordinator.getState() === correctionCoordinator.STATE_SELECTING_CORRECTION) {
      //Start with the very last instance
      //var prevValue = $scope.correcting;
      var instance = getStringInstance($scope.currentMessage.substring(1), 0, MAX_MESSAGES_TO_SEARCH);
      
      if(instance=== null) 
        return;

      $http.get('/check?s=' + encodeURI(instance.word))
           .then(function(result) {
                if(result.data.length > 0)
                  instance.suggestions = result.data[0].suggestions;
                $scope.onIncorrectWordSelected(instance);
            });

    } else if(correctionCoordinator.getState() === correctionCoordinator.STATE_REPLACING_WORD) {
      var correctionText = $scope.currentMessage;
      correctionCoordinator.correctWord(correctionText);
    } 
  }

  $scope.cancel = function() {
    correctionCoordinator.cancel();
  }

  $scope.onIncorrectWordSelected = function($item) {
    //We have just selected the word instance & message pair we want to correct from the top list.
    correctionCoordinator.beginCorrecting($item);
    $scope.correcting = $item;
    $timeout(function() {
      //Block out the correction in the red bubble
      $scope.inputPaddingCss = $('.texteditor .correcting-box').outerWidth() + 5;//Bad code but meh!
      //Clear the rest of the text ready for correction text
      $scope.currentMessage = '';
    });
    
  };

  $scope.correctionSelected = function(correction) {
    correctionCoordinator.correctWord(correction);
  }

  //Get rid of anything typed
  $scope.clearUserInput = function() {
    $scope.currentMessage = '';
    $scope.inputPaddingCss = 'auto';
  }

  $scope.keypress = function(e) {
    if(e.keyCode == 27) {
      $scope.cancel();
    }
  }

  /**
   * Find a specific message starting with the most recent sent and work back at most max sent messages to find str. 
   * Index is used for multiple instances of str in sent messages
   */
  function getStringInstance(str, index, max) {
    var count = 0;
    for(var i = $scope.messages.length - 1; i >= 0; i--) {
      var msg = $scope.messages[i];
      if(msg.from === 'Me') {
        var strIndex = msg.message.indexOf(str);
        if(strIndex !== -1) {
          if(count++ === index) {
            return {
              messageId: msg.id,
              pos: strIndex,
              word: str
            };
          }
        }
        //Max regardless of whether it was found or not
        if(count > max) {
          return null;
        }
      }
    }

    return null;
  }

  function messageFromMessageId(messageId) {
    for(var i = 0; i < $scope.messages.length; i++){
      if($scope.messages[i].id == messageId) return $scope.messages[i];
    }
    return null;
  }

   $scope.filterCorrectionWord = function(criteria) {
    if($scope.state === STATE_STANDARD)
      return function(item) { return false; }
    if($scope.state === STATE_SELECTING_CORRECTION) {
      criteria = criteria.substring(1);
      return function(item) {
        return item.word.startsWith(criteria);
      };
    } else if($scope.state === STATE_REPLACING_WORD) {
      return function(item) {
        return item === criteria;
      }
    }
  }

}]);


