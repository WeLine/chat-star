/*
 * ChatChecker
 * https://github.com/jordan-hamill/ChatChecker
 *
 * Copyright (c) 2014 Jordan Hamill
 * Licensed under the MIT license.
 */

'use strict';

var Q = require('Q'),
	natural = require('natural'),
	tokenizer = new natural.WordTokenizer(),
	SpellCheck = require('spellcheck');

function ChatChecker(aff, dic) {
	this.spell = new SpellCheck(aff, dic);
}

ChatChecker.prototype.checkSentence = function(s) {
	var d = Q.defer();
	var tokens = tokenizer.tokenize(s);
	console.log('tokens: ' + tokens);
	var self = this;

	var pos = 0;
	var incorrectWords = [];

	var len = tokens.length;

	tokens.forEach(function(token, index) {

		var realTokenPos = s.indexOf(token, pos);
		pos += token.length;

		self.spell.check(token, function(err, correct, suggestions) {
			if (err) throw err;
			if (correct)
				console.log(token + ' is spelled correctly!');
			else {
				incorrectWords.push({
					pos: realTokenPos,
					word: token,
					suggestions: suggestions
				});
			}

			if(--len === 0) {
				d.resolve(incorrectWords);
			}
		});

	});

	

	return d.promise;
}

module.exports = exports = ChatChecker;
