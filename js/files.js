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
                redirect: ['filesystem',
                    function($location, filesystem) {
                        if ($location.$$path == '/files') {
                            var roots = filesystem.roots();
                            if (!roots) return;

                            var rd = "/files/" + roots[0].id;
                            console.log("PATH:" + $location.$$path + " -> " + rd);
                            return rd;
                        }
                    }
                ],
                resolve: {
                    data: function($stateParams, filesystem) {
                        return filesystem.folderInfo($stateParams.id, true); //TODO request data
                    }
                },
                subviews: {
                    'header-nav': {
                        template: 'files-header-nav.html'
                    },
                    'header-tools': {
                        template: 'files-header-tools.html'
                    },
                    'sidebar': {
                        template: 'files-sidebar.html'
                    },
                    'files@files': {
                        template: function() {
                            if (viewData.type == 1)
                                return 'files-list-table.html';
                            else if (viewData.type == 2 || viewData.type == 3)
                                return 'files-list-icon.html';
                        },
                        controller: function() {
                            if (viewData.type == 1)
                                return 'FilesListTableCtrl';
                            else if (viewData.type == 2 || viewData.type == 3)
                                return 'FilesListIconCtrl';
                        }
                    }
                }
            });

            mod.controller('FilesCtrl', ['$scope', '$state', '$stateParams', 'filesystem', 'data',
                function($scope, $state, $stateParams, filesystem, data) {
                    var reload = function() {
                        $state.transitionTo($state.current, $stateParams, {
                            reload: true,
                            inherit: false,
                            notify: true
                        });
                    };

                    var sd = {
                        view: viewData,
                        roots: filesystem.roots(),
                        root: data.hierarchy ? data.hierarchy[0] : null,
                        data: data,
                        setViewType: function(t) {
                            viewData.type = t;
                            reload();
                        }
                    };

                    $scope.$parent.files = sd;
                    $.extend($scope, sd);
                }
            ]);

            /* File list */

            var cols = false;
            var setupCols = function(settings) {
                var colConfig = settings['file-view']['list-view-columns'];
                var colSpecs = mollify.utils.mapByKey(mollify.filelist.columns, 'id');
                cols = [];

                $.each(mollify.utils.getKeys(colConfig), function(i, ck) {
                    var s = colSpecs[ck];
                    if (!s) return;
                    cols.push($.extend({}, s, colConfig[ck]));
                });
            };

            mod.controller('FilesListTableCtrl', ['$scope', '$timeout', 'settings', 'filesystem', 'formatters',
                function($scope, $timeout, settings, filesystem, formatters) {
                    if (!cols) setupCols(settings);

                    $scope.cols = cols;
                    $scope.selected = [];
                    $scope._click = false;

                    $scope.content = function(item, col) {
                        return col.content.apply({
                            filesystem: filesystem,
                            formatters: formatters
                        }, [item]);
                    };
                    $scope.onClick = function(item, col) {
                        $scope._click = $timeout(function() {
                            if (!$scope._click) return;
                            $scope._click = false;
                            alert(item.name + " " + col.id);
                        }, 200);
                    };

                    $scope.onRightClick = function(item, col) {
                        alert("right " + item.name + " " + col.id);
                    };

                    $scope.onDblClick = function(item, col) {
                        if ($scope._click) $timeout.cancel($scope._click);
                        $scope._click = false;
                        alert("dbl " + item.name + " " + col.id);
                    };
                }
            ]);

            mod.controller('FilesListIconCtrl', ['$scope',
                function($scope) {
                    console.log("icon ctrl");
                }
            ]);
        }
    });

    // register file list columns
    mollify.filelist.columns.push({
        id: "name",
        titleKey: "files.list.col.name",
        sort: function(i1, i2, sort, data) {
            return i1.name.toLowerCase().localeCompare(i2.name.toLowerCase()) * sort;
        },
        content: function(item, data) {
            return item.name;
        }
    });
    mollify.filelist.columns.push({
        id: "path",
        titleKey: "files.list.col.path",
        sort: function(i1, i2, sort, data) {
            var p1 = _m.filesystem.rootsById[i1.root_id].name + i1.path;
            var p2 = _m.filesystem.rootsById[i2.root_id].name + i2.path;
            return p1.toLowerCase().localeCompare(p2.toLowerCase()) * sort;
        },
        html: true,
        content: function(item, data) {
            return '<span class="item-path-root">' + this.filesystem.root(item.root_id).name + '</span>: <span class="item-path-val">' + item.path + '</span>';
        }
    });
    mollify.filelist.columns.push({
        id: "type",
        titleKey: "files.list.col.type",
        sort: function(i1, i2, sort, data) {
            var e1 = i1.is_file ? (i1.extension || '') : '';
            var e2 = i2.is_file ? (i2.extension || '') : '';
            return e1.toLowerCase().localeCompare(e2.toLowerCase()) * sort;
        },
        content: function(item, data) {
            return item.is_file ? (item.extension || '') : '';
        }
    });
    mollify.filelist.columns.push({
        id: "size",
        titleKey: "files.list.col.size",
        opts: {
            "min-width": 75
        },
        sort: function(i1, i2, sort, data) {
            var s1 = (i1.is_file ? parseInt(i1.size, 10) : 0);
            var s2 = (i2.is_file ? parseInt(i2.size, 10) : 0);
            return (s1 - s2) * sort;
        },
        content: function(item, data) {
            return item.is_file ? item.size : ''; //TODOthis.formatters.byteSize.format(item.size) : '';
        }
    });
    mollify.filelist.columns.push({
        id: "file-modified",
        dataId: "core-file-modified",
        titleKey: "files.list.col.lastmodified",
        opts: {
            "width": 180
        },
        sort: function(i1, i2, sort, data) {
            if (!i1.is_file && !i2.is_file) return 0;
            if (!data || !data["core-file-modified"]) return 0;

            var ts1 = data["core-file-modified"][i1.id] ? data["core-file-modified"][i1.id] * 1 : 0;
            var ts2 = data["core-file-modified"][i2.id] ? data["core-file-modified"][i2.id] * 1 : 0;
            return ((ts1 > ts2) ? 1 : -1) * sort;
        },
        content: function(item, data) {
            if (!item.id || !item.is_file || !data || !data["core-file-modified"] || !data["core-file-modified"][item.id]) return "";
            return this.formatters.timestamp.format(mollify.utils.parseInternalTime(data["core-file-modified"][item.id]));
        }
    });
}(window.mollify);
