var assert = require('assert'),
	QParser = require('./qparser');

var qparser = new QParser();



describe('simple queries', function() {
	describe('one argument', function() {
		it('should parse empty argument', function() {
			assert.deepEqual([], qparser(""))
		});
		it('should parse undefined argument', function() {
			assert.deepEqual([], qparser(undefined))
		});
		it('should parse string as simple string argument', function() {
			assert.deepEqual([{
				type: "string",
				query: "abcdef"
			}], qparser('abcdef'))
		});
		it('should parse prefixed string as prefixed string argument', function() {
			assert.deepEqual([{
				type: "prefix",
				prefix: "abc",
				query: "def"
			}], qparser('abc:def'))
		});
		it('should parse several quoted words as single argument', function() {
			assert.deepEqual([{
				type: "string",
				query: "abc def qqq"
			}], qparser("'abc def qqq'"))
		});
		it('should correctly treat unclosed quote', function() {
			assert.deepEqual([{
				type: "string",
				query: "abc def qqq"
			}], qparser("'abc def qqq"))
		});
		it('should parse range arguments', function() {
			assert.deepEqual([{
				type: "range",
				from: 15,
				to: 25
			}], qparser("15-25"))
		});
		it('should parse left range arguments', function() {
			assert.deepEqual([{
				type: "range",
				from: 15,
				to: ""
			}], qparser("15-"))
		});
		it('should parse right range arguments', function() {
			assert.deepEqual([{
				type: "range",
				from: "",
				to: 25
			}], qparser("-25"))
		});
		it('should parse prefixed range arguments', function() {
			assert.deepEqual([{
				type: "prange",
				prefix: "pref",
				from: 15,
				to: 25
			}], qparser("pref:15-25"))
		});
		it('should parse string arguments with flags', function() {
			assert.deepEqual([{
				flags: ["+", "*", "/", "\\", "!", "#", "~"],
				type: "string",
				query: "abcdef"
			}], qparser("+*/\\!#~abcdef"))
		});
		it('should parse several prefixed quoted words with flags', function() {
			assert.deepEqual([{
				flags: ["+", "*", "/", "\\", "!", "#"],
				type: "prefix",
				prefix: "e",
				query: "abcdef qwerty"
			}], qparser("+*/\\!#e:'abcdef qwerty'"))
		});
	});
	describe('several arguments', function() {
		it('should parse two prefixed quoted arguments with flags', function() {
			assert.deepEqual([
				{
					flags: ["+", "*", "/", "\\", "!", "#"],
					type: "prefix",
					prefix: "e",
					query: "abcdef qwerty"
				},
				{
					flags: ["+", "#"],
					type: "prefix",
					prefix: "q",
					query: "beacon is tasty"
				}
			], qparser("+*/\\!#e:'abcdef qwerty' +#q:'beacon is tasty'"))
		});
	});
});

describe('complex queries', function() {
	describe('logical operators', function() {
		it('should group arguments in braces with AND', function() {
			assert.deepEqual([
				{
					type: "and",
					queries: [
						{
							type: "string",
							query: "abc"
						},
						{
							type: "string",
							query: "def"
						}
					]
				}
			], qparser("(abc def)"))
		});
		it('should OR arguments separated by |', function() {
			assert.deepEqual([
				{
					type: "or",
					queries: [
						{
							type: "string",
							query: "abc"
						},
						{
							type: "string",
							query: "def"
						}
					]
				}
			], qparser("abc|def"))
		});
		it('should OR arguments in braces separated by |', function() {
			assert.deepEqual([
				{
					type: "or",
					queries: [
						{
							type: "and",
							queries: [
								{
									type: "string",
									query: "abc"
								},
								{
									type: "string",
									query: "def"
								}
							]
						},
						{
							type: "string",
							query: "qwe"
						}
					]
				}
			], qparser("(abc def)|qwe"))
		});
		it('should OR and AND complex arguments', function() {
			assert.deepEqual([
				{
					type: "or",
					queries: [
						{
							type: "and",
							queries: [
								{
									flags: ["!"],
									type: "prefix",
									prefix: "e",
									query: "abc def"
								},
								{
									flags: ["#"],
									type: "range",
									from: 15,
									to: 25
								}
							]
						},
						{
							type: "and",
							queries: [
								{
									flags: ["+"],
									type: "prefix",
									prefix: "q",
									query: "qwe rty"
								},
								{
									type: "string",
									query: "simple"
								}
							]
						}
					]
				}
			], qparser("(!e:'abc def' #15-25)|(+q:'qwe rty' simple)"))
		});
		it('should do two-level AND grouping', function() {
			assert.deepEqual([
				{
					type: "and",
					queries: [
						{
							type: "string",
							query: "abc"
						},
						{
							type: "and",
							queries: [
								{
									type: "string",
									query: "def q"
								},
								{
									flags: ["+"],
									type: "string",
									query: "qwe"
								}
							]
						}
					]
				}
			], qparser("(abc ('def q' +qwe))"))

		});
		it('should do OR grouping in the middle', function() {
			assert.deepEqual([
				{
					type: "string",
					query: "abc",
				},
				{
					type: "or",
					queries: [
						{
							type: "string",
							query: "def"
						},
						{
							type: "string",
							query: "qwe"
						}
					]
				},
				{
					type: "string",
					query: "rty"
				}
			], qparser("abc def|qwe rty"))
		});
	});
});

describe('tuning', function() {
	describe('options', function() {
		it('should return class instance instead of a parsing function', function() {
			var p = new QParser({ instance: true });
			assert.equal(p.constructor, QParser);
			assert.equal(p.parse.constructor, Function);
		});
		it('should use only " as quote symbol', function() {
			var p = new QParser({ quotes: '"', instance: true });
			assert.equal(p.QUOTES.toString(), '/["]/');
		});
	});
})


