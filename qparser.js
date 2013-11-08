(function() {
	"use strict";

	function QParser(opts) {
		if (!opts) { opts = {}; }
		this.options = opts;
		if (opts.quotes) {
			if (opts.quotes.constructor === RegExp) {
				this.QUOTES = opts.quotes;
			} else if (opts.quotes.constructor === String) {
				this.QUOTES = new RegExp("[" + opts.quotes + "]");
			}
		}
		if (opts.spaces) {
			if (opts.spaces.constructor === RegExp) {
				this.SPACES = opts.spaces;
			} else if (opts.spaces.constructor === String) {
				this.SPACES = new RegExp("[" + opts.spaces + "]");
			}
		}
		if (opts.flags) {
			if (opts.flags.constructor === RegExp) {
				this.FLAGS = opts.flags;
			} else if (opts.flags.constructor === String) {
				this.FLAGS = new RegExp("[" + opts.flags + "]");
			}
		}
		// a trick so that we can use a 'new QParser' result as a parsing function
		// option 'instance' overrides this behaviour so that 'new' returns a class instance
		if (!opts.instance) {
			return this.parse.bind(this);
		}
	}
	QParser.prototype.QUOTES = /['"`]/; // '
	QParser.prototype.SPACES = /[ \t\r\n]/;
	QParser.prototype.FLAGS = /[~\+#!\*\/]/;
	QParser.prototype.SCREEN = /[\\]/;
	QParser.prototype.STATES = {
		DATA: 0,
		APPEND: 1,
		QUOTE: 2,
	};
	QParser.prototype.parse = function(input, opt, stopChar) {
		var c, i, parts = [], part = {}, buf = "", p1, p2, nopt,
			quote, skip = false, hasdata = false, hasarg = false, or_at_next_arg = 0,
			screen = false,
			st = this.STATES.DATA,
			appendPart = function() {
				if (hasarg) {
					if (["range", "prange"].indexOf(part.type) >= 0) {
						part.to = buf;
					} else if (buf && buf.length) {
						part.query = buf;
					}
					if (!part.type) {
						if (part.prefix) { part.type = "prefix"; }
						else { part.type = "string"; }
					}
					parts.push(part);
					if (or_at_next_arg && (or_at_next_arg + 1 === parts.length)) {
						// console.log('ORing at', or_at_next_arg, parts.length);
						// console.log('before', parts);
						// console.log('part', part);
						p2 = parts.pop();
						p1 = parts.pop();
						// console.log('after', parts);
						parts.push({
							type: "or",
							queries: [ p1, p2 ]
						});
						or_at_next_arg = 0;
					}
				}
				if (hasarg || !part.flags) {
					part = {};
					buf = "";
					hasdata = false;
					hasarg = false;
				}
			};
		if (!input || !input.length || (typeof input !== "string")) { return parts; }
		if (opt && (opt.pos >= 0)) { i = opt.pos; } else { i = 0; }
		while (i < input.length) {
			if (!skip) {
				c = input.charAt(i++);
			}
			skip = false;
			// console.log('  :', i, 'c =',c, 'screen =', screen, 'buf =', buf, 'st =', st, 'hasdata =', hasdata, 'hasarg =', hasarg, 'or_next =', or_at_next_arg, 'flags.length =', part.flags ? part.flags.length : '-1', 'parts.length =', parts.length);

			if (st === this.STATES.DATA) {
				if (screen) {
					buf += c;
					hasdata = true;
					hasarg = true;
					screen = false;
				} else if (this.SCREEN.test(c)) {
					screen = true;
				} else if (c === "(") {
					if (hasarg) {
						buf += c;
					} else {
						part.type = "and";
						nopt = { pos: i };
						// console.log('calling self');
						part.queries = this.parse(input, nopt, ")");
						i = nopt.pos; // move index
						if (part.queries && part.queries.length) {
							hasarg = true;
							st = this.STATES.APPEND;
							skip = true;
						}
					}
				} else if (c === stopChar) {
					if (opt) { opt.pos = i; }
					break;
				} else if (c === "|") {
					or_at_next_arg = parts.length;
					if (hasarg) {
						st = this.STATES.APPEND;
						skip = true;
						or_at_next_arg += 1;
					}
				} else if (c === ":") {
					part.prefix = buf;
					part.type = "prefix";
					buf = "";
					hasdata = false;
					hasarg = true;
				} else if (c === "-") {
					if (part.type && (part.type === "prefix")) {
						part.type = "prange";
					} else {
						part.type = "range";
					}
					part.from = buf;
					buf = "";
					hasdata = false;
					hasarg = true;
				} else if (this.SPACES.test(c)) {
					st = this.STATES.APPEND;
					skip = true;
				} else if (this.QUOTES.test(c)) {
					if (buf.length) {
						buf += c;
						hasdata = true;
						hasarg = true;
					} else {
						st = this.STATES.QUOTE;
						quote = c;
					}
				} else if (this.FLAGS.test(c)) {
					if (!buf.length) {
						if (!part.flags) { part.flags = []; }
						part.flags.push(c);
					} else {
						buf += c;
					}
				} else {
					buf += c;
					hasdata = true;
					hasarg = true;
				}
			} else if (st === this.STATES.QUOTE) {
				if (c === quote) {
					quote = undefined;
					st = this.STATES.APPEND;
					skip = true;
				} else {
					buf += c;
					hasdata = true;
					hasarg = true;
				}
			} else if (st === this.STATES.APPEND) {
				appendPart();
				st = this.STATES.DATA;
			}
		}
		appendPart();
		// console.log('return', parts);
		return parts;
	}; // parse

	try {
		// NodeJS case
		module.exports = QParser;
	} catch(e) {
		// browser case
		window.QParser = QParser;
	}

})();
