! function(mollify) {
    'use strict';

    mollify.plugins.files = {
        init: function(h, app) {
            h.registerView('files', {
                parent: "main",
                url: "^/files",
                template: "files.html",
                controller: "FilesCtrl"
            });

            core.controller('FilesCtrl', ['$scope',
                function($scope) {
                	console.log("files");
                }
            ]);
        }
    };
}(window.mollify);
