module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> // <%= grunt.template.today("dd.mm.yyyy") %> // <%= pkg.author %> // <%= pkg.homepage %> */\n'
			},
			build: {
				src: 'qparser.js',
				dest: 'qparser.min.js'
			}
		},
		simplemocha: {
			options: {
				globals: ['should'],
				timeout: 3000,
				ignoreLeaks: false,
				ui: 'bdd',
				reporter: 'tap'
			},
			all: {
				src: ["test.js"]
			}
		},
		markdown: {
			all: {
				expand: true,
				src: '*.md',
				dest: '.',
				ext: '.html'
			}
		},
		natural_docs: {
			options: {
				bin: '/usr/bin/naturaldocs',
				inputs: ['./'],
				excludes: ['node_modules/', 'assets/', 'junk/', 'ndoc/'],
				format: 'HTML',
				output: './doc/',
				project: './ndoc',

			},
			sortjs: {

			}
		},
		clean: {
			docs: ["./ndoc/"]
		},
		mkdir: {
			docs: {
				options: {
					create: ["./ndoc/"]
				}
			}
		},

	});
	// grunt.loadNpmTasks('grunt-mkdir');
	// grunt.loadNpmTasks('grunt-contrib-clean');
	// grunt.loadNpmTasks('grunt-natural-docs');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-simple-mocha');

	grunt.loadNpmTasks('grunt-markdown');

	grunt.registerTask('test', ['simplemocha']);
	// grunt.registerTask('docs', ['mkdir', 'natural_docs', 'clean']);
	grunt.registerTask('build', ['uglify', 'markdown']);
	grunt.registerTask('benchmark', ["execute"]);

	grunt.registerTask('default', ['test', 'build']);
}