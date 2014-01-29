/*!
 * Mollify Gruntfile
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

module.exports = function (grunt) {
  'use strict';

  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  RegExp.quote = function (string) {
    return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
  };

  var fs = require('fs');
  var path = require('path');
  /*var generateGlyphiconsData = require('./docs/grunt/bs-glyphicons-data-generator.js');
  var BsLessdocParser = require('./docs/grunt/bs-lessdoc-parser.js');
  var generateRawFilesJs = require('./docs/grunt/bs-raw-files-generator.js');
  var updateShrinkwrap = require('./test-infra/shrinkwrap.js');*/

  // Project configuration.
  grunt.initConfig({

    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' +
            ' * Mollify v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
            ' * Copyright 2008-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n' +
            ' */\n'

    // Task configuration.
    clean: {
      dist: 'dist'
    },

    jshint: {
      options: {
        jshintrc: 'js/.jshintrc'
      },
      grunt: {
        src: ['Gruntfile.js']
      },
      src: {
        src: 'js/*.js'
      },
      test: {
        src: 'js/tests/unit/*.js'
      },
      assets: {
        src: []
      }
    },

    jscs: {
      options: {
        config: 'js/.jscs.json',
      },
      grunt: {
        src: ['Gruntfile.js']
      },
      src: {
        src: 'js/*.js'
      },
      test: {
        src: 'js/tests/unit/*.js'
      },
      assets: {
        src: []
      }
    },

    concat: {
      options: {
        banner: '<%= banner %>\n',
        stripBanners: false
      },
      mollify: {
        src: [
          'js/configview.js',
          'js/init.js',
          'js/loginview.js',
          'js/mainview.js',
          'js/plugins.js',
          'js/ui.js',
          'js/uploader.js'
        ],
        dest: 'dist/js/<%= pkg.name %>.js'
      }
    },

    uglify: {
      bootstrap: {
        options: {
          banner: '<%= banner %>',
          report: 'min'
        },
        src: '<%= concat.mollify.dest %>',
        dest: 'dist/js/<%= pkg.name %>.min.js'
      }
    }
  });


  // These plugins provide necessary tasks.
  require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});

  // JS distribution task.
  grunt.registerTask('dist-js', ['concat', 'uglify']);

  // CSS distribution task.
  //grunt.registerTask('dist-css', ['less', 'cssmin', 'csscomb', 'usebanner']);

  // Full distribution task.
  grunt.registerTask('dist', ['clean', 'dist-js']);

  // Default task.
  grunt.registerTask('default', ['dist']);

  // Version numbering task.
  // grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
  // This can be overzealous, so its changes should always be manually reviewed!
  //grunt.registerTask('change-version-number', 'sed');
};
