! function(mollify) {
    'use strict';

    mollify.modules.push({
        id: 'mollify.main.files',

        setup: function(h, mod) {
            var viewData = {
                type: 1
            };

            h.registerView('files', {
                title: "main.files.title",
                icon: "fa-folder",
                parent: "main",
                url: "^/files/{id}",
                template: "files.html",
                controller: "FilesCtrl",
                resolve: {
                    data: function($stateParams, $location, filesystem) {
                        // if no folder id, redirect to default folder

                        var roots = filesystem.roots();
                        if (!$stateParams.id) {
                            if (roots) {
                                $location.path("/files/" + roots[0].id);
                                return false;
                            }
                            // empty view
                            return { folders: [] };
                        }
                        return filesystem.folderInfo($stateParams.id);
                    }
                },
                subviews: {
                    'header-nav': {
                        template: 'files-header-nav.html'
                    },
                    'sidebar': {
                        template: 'files-sidebar.html'
                    },
                    'filelist@files': {
                        template: function() {
                            if (viewData.type == 1)
                                return 'files-list-table.html';
                            else if (viewData.type == 2)
                                return 'files-list-icon.html';
                        },
                        controller: function() {
                            if (viewData.type == 1)
                                return 'FilesListTableCtrl';
                            else if (viewData.type == 2)
                                return 'FilesListIconCtrl';
                        }
                    }
                }
            });

            mod.controller('FilesCtrl', ['$scope', '$state', '$stateParams', 'data',
                function($scope, $state, $stateParams, data) {
                    var reload = function() {
                        $state.transitionTo($state.current, $stateParams, {
                            reload: true,
                            inherit: false,
                            notify: true
                        });
                    };

                    $scope.view = viewData;
                    $scope.data = data;
                    $scope.setViewType = function(t) {
                        viewData.type = t;
                        reload();
                    }
                    console.log("files");
                }
            ]);

            mod.controller('FilesListTableCtrl', ['$scope',
                function($scope) {
                    console.log("table ctrl");
                }
            ]);

            mod.controller('FilesListIconCtrl', ['$scope',
                function($scope) {
                    console.log("icon ctrl");
                }
            ]);
        }
    });
}(window.mollify);
