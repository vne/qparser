(function() {
	"use strict";

	function QParser(opts) {
		var i;
		if (!opts) { opts = {}; }
		this.options = opts;

		// process special symbols overrides
		for (i in opts) {
			if (["quotes", "spaces", "flags", "screen", "group_open", "group_close", "or", "prefix", "range", "or_open", "or_close"].indexOf(i) >= 0) {
				// console.log('override', i, opts[i], opts[i].constructor);
				if (opts[i].constructor === RegExp) {
					this[i.toUpperCase()] = opts[i];
				} else if (opts[i].constructor === String) {
					this[i.toUpperCase()] = new RegExp("[" + opts[i] + "]");
				}
			}
		}
		
		// a trick so that we can use a 'new QParser' result as a parsing function
		// option 'instance' overrides this behaviour so that 'new' returns a class instance
		if (!opts.instance) {
			return this.parse.bind(this);
		}
	}
	QParser.prototype.QUOTES = /['"`]/;       // '   symbols that are recognized as quotes
	QParser.prototype.SPACES = /[ \t\r\n]/;   //     symbols that are recognized as spaces
	QParser.prototype.FLAGS = /[~\+#!\*\/]/;  //     symbols that are recognized as flags
	QParser.prototype.SCREEN = /[\\]/;        //     symbols that are recognized as screen
	QParser.prototype.GROUP_OPEN = /\(/;      //     symbols that are recognized as group openers
	QParser.prototype.GROUP_CLOSE = /\)/;     //     symbols that are recognized as group endings
	QParser.prototype.OR = /\|/;              //     symbols that are recognized as logical OR
	QParser.prototype.PREFIX = /:/;           //     symbols that are recognized as divider between prefix and value
	QParser.prototype.RANGE = /-/;            //     symbols that are recognized as divider between first and second values in range
	QParser.prototype.OR_OPEN = /\[/;         //     symbols that are recognized as OR group openers
	QParser.prototype.OR_CLOSE = /]/;         //     symbols that are recognized as OR group endings
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
				} else if (this.GROUP_OPEN.test(c)) {
					// console.log('  GROUP_OPEN');
					if (hasarg) {
						buf += c;
					} else {
						part.type = "and";
						nopt = { pos: i };
						// console.log('calling self');
						part.queries = this.parse(input, nopt, this.GROUP_CLOSE);
						i = nopt.pos; // move index
						if (part.queries && part.queries.length) {
							hasarg = true;
							st = this.STATES.APPEND;
							skip = true;
						}
					}
				} else if (this.GROUP_CLOSE.test(c)) {
					// console.log('  GROUP_CLOSE');
					if (opt) { opt.pos = i; }
					break;
				} else if (this.OR.test(c)) {
					// console.log('  OR');
					or_at_next_arg = parts.length;
					if (hasarg) {
						st = this.STATES.APPEND;
						skip = true;
						or_at_next_arg += 1;
					}
				} else if (this.PREFIX.test(c)) {
					// console.log('  PREFIX');
					part.prefix = buf;
					part.type = "prefix";
					buf = "";
					hasdata = false;
					hasarg = true;
				} else if (this.RANGE.test(c)) {
					// console.log('  RANGE');
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
					// console.log('  SPACES');
					st = this.STATES.APPEND;
					skip = true;
				} else if (this.QUOTES.test(c)) {
					// console.log('  QUOTES');
					if (buf.length) {
						buf += c;
						hasdata = true;
						hasarg = true;
					} else {
						st = this.STATES.QUOTE;
						quote = c;
					}
				} else if (this.FLAGS.test(c)) {
					// console.log('  FLAGS');
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
