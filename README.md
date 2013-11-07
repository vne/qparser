QParser
=======

A parsing library intended to parse complex user input with logical operators, grouping, prefixes and flags.

Written by Vladimir Neverov <sanguini@gmail.com> in 2013.

Wiki: https://github.com/vne/qparser/wiki

Usage
=====

The library is intended for parsing an arbitrary user text input into tokens that can be easily
converted to a query to a database. User text input is much like the thing you write
in Google to do a complex search, e.g. "animals -bears" or "bears OR monkeys". The parser
allows the logical expressions like OR and AND as well as grouping like in math equations.
It also allows prefixes, range queries, quoted strings and various flags.

QParser can be used both in NodeJS and in browser.

You feed the parser with the text string and it returns an array of objects, each object describing
one token. Tokens can be of the following types:
 -  range - a range query, e.g. "20-30" or "-50" or "45-"
 -  prefix - a string with a prefix separated by colon, e.g. "site:wikipedia.org"
 -  prange - prefixed range, e.g. "price:100-200"
 -  string - any other input, e.g. arbitrary strings and numbers
 -  or - a group of queries that should be logically ORed, e.g. "love|hate"
 -  and - a group of queries that should be logically ANDed, e.g. "(jim morrisson)"
 It's your choice how to process this array of objects. It can be converted to an SQL query,
 to a query to a NoSQL database, etc.

Simple cases of search input
----------------------------

	> bears monkeys
This will produce an array of two objects:
	> [
	>	{ type: "string", query: "bears" },
	>	{ type: "string", query: "monkeys" }
	> ]

	> bears !monkeys
will produce
	> [
	>	{ type: "string", query: "bears" },
	>	{ type: "string", query: "monkeys", flags: ["!"] }
	> ]

	> animal:bears
will produce
	> [
	>	{ type: "prefix", prefix: "animal", query: "bears" }
	> ]

	> bears 300-500
will produce
	> [
	>	{ type: "string", query: "bears" },
	>	{ type: "range", from: 300, to: 500 }
	> ]

	> bears price:20-30
will produce
	> [
	>	{ type: "string", query: "bears" },
	>	{ type: "prange", prefix: "price", from: 20, to: 30 }
	> ]

Grouping
--------

	> (sex drugs)|rocknroll
will produce
	> [
	> 	{
	> 		type: "or",
	> 		queries: [
	> 			{
	> 				type: "and",
	> 				queries: [
	> 					{
	> 						type: "string",
	> 						query: "sex"
	> 					},
	> 					{
	> 						type: "string",
	> 						query: "drugs"
	> 					}
	> 				]
	> 			},
	> 			{
	> 				type: "string",
	> 				query: "rocknroll"
	> 			}
	> 		]
	> 	}
	> ]

More on flags, strings and spaces
---------------------------------

Each token in an input string can be prefixed by an arbitrary number of flags. By default,
flags are symbols from the following list: ~, \, +, #, !, *, /, \
Default list can be altered, see API.
Example:
	> ~\+#!*\/animal:bear
will produce
	> [
	>	{ type: "prefix", prefix: "animal", query: "bear", flags: ["~", "\", "", "+", "#", "!", "*\", "/"] }
	> ]
Flags in the array will appear in the same order as in the input string. Flags are not interpreted in any
way, it is up to you to decide what does each flag mean.

Everywhere where a string can appear, a quoted string can be used. E.g.
	> "bears monkeys"
will produce
	> [
	>	{ type: "string", query: "bears monkeys" }
	> ]

	> animal:"white bears"
will produce
	> [
	>	{ type: "prefix", prefix: "animal", query: "white bears" }
	> ]

By default, the following symbols are recognized as quotes: ", ', `
This can be changed through API. If the quote is not closed, then
the string will take everything until the end of the input.

Spaces divide tokens, if not inside quotes. E.g.
	> bears monkeys
will produce two tokens. The same input in quotes will produce one token. By default,
the following symbols are recognized as spaces: \r, \n, \t and space itself. This can be
changed, ses API.


API
===

First you should require the library:
	> var qparser = require('qparser');
Next, you should instantiate the parser:
	> var parser = new qparser();
Finally, you can use it to parse strings:
	> var tokens = parser("arbitrary user input");

So, require returns a class, instantiating with 'new' returns a parser function. The latter is not common case,
usually 'new' returns a new instance. If you require an instance of the parser, you can pass an argument:
	> var parserInstance = new qparser({ instance: true });
This can be used as followes:
	> var tokens = parserInstance.parse("user input");

Constructor accepts the following options besides 'instance':
 -  quotes
 -  spaces
 -  flags

Each of these options can be either a regular expression or a string containing all symbols
that will be treated as quotes, spaces and flags respectively. If an option is a regular
expression, than it will be used to test if a symbol is something special. E.g.
	> var parser = new qparser({ quotes: '"', spaces: "\t" });
will produce a parsing function that will only recognize " as a quote and \t as token delimeter.


Tests and examples
==================

More examples of library usage can be found in **test.js** file. To run tests you will
need [Mocha](http://visionmedia.github.io/mocha/), the tests themselves use built-in
NodeJS [assert](http://nodejs.org/api/assert.html) module.
