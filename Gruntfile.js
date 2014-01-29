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

  // Project configuration.
  grunt.initConfig({

    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' +
            ' * Mollify v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
            ' * Copyright 2008-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n' +
            ' */\n',

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
          'js/init.js',
          'js/ui.js',
          'js/loginview.js',
          'js/mainview.js',
          'js/plugins.js',
          'js/configview.js',
          'js/uploader.js'
        ],
        dest: 'dist/js/<%= pkg.name %>.js'
      },
      full: {
        src: [
          'js/lib/jquery.min.js',
          'js/lib/json.js',
          'js/lib/jquery.tmpl.min.js',
          'js/lib/jquery-ui.js',
          'js/lib/bootstrap.js',
          'js/lib/bootstrap-datetimepicker.js',
          'js/lib/bootstrap-lightbox.js',
          'js/lib/modernizr.js',
          'js/lib/date.js',
          'js/lib/jquery-file-uploader.js',
          'js/lib/jquery-singledoubleclick.js',
          'js/lib/ZeroClipboard.js',
          
          'dist/js/<%= pkg.name %>.js',
        ],
        dest: 'dist/js/<%= pkg.name %>.full.js'
      }
    },

    uglify: {
      mollify: {
        options: {
          banner: '<%= banner %>',
          report: 'min'
        },
        files: [
        	{ src: 'dist/js/mollify.js', dest: 'dist/js/mollify.min.js'},
        	{ src: 'dist/js/mollify.full.js', dest: 'dist/js/mollify.full.min.js'}
        ]
      }
    },
    
    cssmin: {
	  combine: {
        options: {
          keepSpecialComments: '*',
          noAdvanced: true, // turn advanced optimizations off until the issue is fixed in clean-css
          report: 'min',
          selectorsMergeMode: 'ie8'
        },
	    files: {
	      'dist/css/<%= pkg.name %>.min.css': ['css/style.css']
	    }
	  }/*,
      compress: {
        options: {
          keepSpecialComments: '*',
          noAdvanced: true, // turn advanced optimizations off until the issue is fixed in clean-css
          report: 'min',
          selectorsMergeMode: 'ie8'
        },
        src: [
          'dist/css/<%= pkg.name %>.css'
        ],
        dest: 'dist/css/<%= pkg.name %>.min.css'
      }*/
    },

    usebanner: {
      dist: {
        options: {
          position: 'top',
          banner: '<%= banner %>'
        },
        files: {
          src: [
            'dist/css/<%= pkg.name %>.css',
            'dist/css/<%= pkg.name %>.min.css'
          ]
        }
      }
    },
    
    copy: {
      css: {
        expand: true,
        src: ['css/font/**','css/images/**'],
        dest: 'dist/'
      },
      js: {
        expand: true,
        src: ['js/lib/*','templates/**','localization/**'],
        dest: 'dist/'
      },
      backend: {
        expand: true,
        src: ['backend/**', '!backend/dav/**', '!backend/configuration.php', '!backend/*.db'],
        dest: 'dist/'
      },
      dist: {
      	files: [
        	{ src: 'backend/example/example_index.html', dest: 'dist/index.html' }
        ]
      }
    },
    
	compress: {
	  dist: {
	    options: {
	      archive: 'dist/<%= pkg.name %>_<%= pkg.version %>.zip'
	    },
	    files: [
	      {expand: true, cwd: 'dist/', src: ['**', '!<%= pkg.name %>_<%= pkg.version %>.zip'], dest: 'mollify/'}
	    ]
	  }
	}

  });


  // These plugins provide necessary tasks.
  require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});

  // JS distribution task.
  grunt.registerTask('dist-js', ['concat', 'uglify', 'copy:js']);

  // CSS distribution task.
  grunt.registerTask('dist-css', ['cssmin', 'usebanner', 'copy:css']);

  // JS distribution task.
  grunt.registerTask('dist-backend', ['copy:backend']);

  // Full distribution task.
  grunt.registerTask('dist', ['clean', 'dist-js', 'dist-css', 'dist-backend', 'copy:dist', 'compress']);

  // Default task.
  grunt.registerTask('default', ['dist']);

  // Version numbering task.
  // grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
  // This can be overzealous, so its changes should always be manually reviewed!
  //grunt.registerTask('change-version-number', 'sed');
};
