! function(mollify) {
    'use strict';

    mollify.modules.push({
    	id: 'mollify.main.files',

        setup: function(h, mod) {
            h.registerView('files', {
                parent: "main",
                url: "^/files",
                template: "files.html",
                controller: "FilesCtrl"
            });

            mod.controller('FilesCtrl', ['$scope',
                function($scope) {
                    console.log("files");
                }
            ]);
        }
    });
}(window.mollify);
