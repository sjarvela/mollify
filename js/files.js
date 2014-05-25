! function(mollify) {
    'use strict';

    mollify.modules.push({
        id: 'mollify.main.files',

        setup: function(h, mod, gettext) {
            var viewData = {
                type: 1
            };

            gettext("files_viewTitle");
            h.registerView('files', {
                titleKey: "files_viewTitle",
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

            mod.controller('FilesCtrl', ['$scope', '$state', '$stateParams', 'settings', 'actions', 'filesystem', 'data',
                function($scope, $state, $stateParams, settings, actions, filesystem, data) {
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

                    $scope.onItemAction = function(item, action, ctx) {
                        var itemAction = settings["file-view"].actions[action];
                        if (!itemAction) return;
                        if (typeof(itemAction) == "function") itemAction = itemAction(item);

                        console.log(item.name + " " + itemAction);
                        if (itemAction == "menu") {
                            $scope.showPopupmenu(ctx.e, item, actions.getType('filesystem', item));
                        } else if (itemAction = "quickactions") {
                            $scope.showQuickactions(ctx.e, item, actions.getType('quick', item));
                        } else {
                            $scope.onAction(itemAction, item);
                        }
                    };
                }
            ]);

            gettext('file_open');
            h.registerAction({
                id: 'file/open',
                type: 'file',
                quick: true,
                titleKey: 'file_open',
                handler: ["$state",
                    function(item, $state) {
                        if (!item.is_file)
                            $state.go("files", {
                                id: item.id
                            });
                        else
                            alert("open file " + item.name);
                    }
                ]
            });

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

                    var fmt = {
                        byteSize: new formatters.ByteSize(new formatters.Number(2))
                    };
                    $scope.cols = cols;
                    $scope.selected = [];
                    $scope._click = false;

                    $scope.content = function(item, col) {
                        return col.content.apply({
                            filesystem: filesystem,
                            formatters: fmt
                        }, [item]);
                    };
                    var getCtx = function(e, col) {
                        return {
                            e: e,
                            col: col
                        }
                    };

                    $scope.onClick = function(e, item, col) {
                        $scope._click = $timeout(function() {
                            if (!$scope._click) return;
                            $scope._click = false;
                            $scope.onItemAction(item, "click", getCtx(e, col));
                        }, 200);
                    };

                    $scope.onRightClick = function(e, item, col) {
                        $scope.onItemAction(item, "right-click", getCtx(e, col));
                    };

                    $scope.onDblClick = function(e, item, col) {
                        if ($scope._click) $timeout.cancel($scope._click);
                        $scope._click = false;
                        $scope.onItemAction(item, "dbl-click", getCtx(e, col));
                    };

                    $scope.onMouseOver = function(e, item) {
                        $scope.onItemAction(item, "mouse-over", getCtx(e));
                        //$scope.showQuickactions(e, item, [{}]);
                    };

                    $scope.onMouseOut = function(e, item) {
                        $scope.onItemAction(item, "mouse-out", getCtx(e));
                        //$scope.showQuickactions(e, item, false);
                    };
                }
            ]);

            mod.controller('FilesListIconCtrl', ['$scope',
                function($scope) {
                    console.log("icon ctrl");
                }
            ]);

            // register file list columns
            gettext("filesList_colName");
            mollify.filelist.columns.push({
                id: "name",
                titleKey: "filesList_colName",
                sort: function(i1, i2, sort, data) {
                    return i1.name.toLowerCase().localeCompare(i2.name.toLowerCase()) * sort;
                },
                content: function(item, data) {
                    return item.name;
                }
            });
            gettext("filesList_colPath");
            mollify.filelist.columns.push({
                id: "path",
                titleKey: "filesList_colPath",
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
            gettext("filesList_colType");
            mollify.filelist.columns.push({
                id: "type",
                titleKey: "filesList_colType",
                sort: function(i1, i2, sort, data) {
                    var e1 = i1.is_file ? (i1.extension || '') : '';
                    var e2 = i2.is_file ? (i2.extension || '') : '';
                    return e1.toLowerCase().localeCompare(e2.toLowerCase()) * sort;
                },
                content: function(item, data) {
                    return item.is_file ? (item.extension || '') : '';
                }
            });
            gettext("filesList_colSize");
            mollify.filelist.columns.push({
                id: "size",
                titleKey: "filesList_colSize",
                opts: {
                    "min-width": 75
                },
                sort: function(i1, i2, sort, data) {
                    var s1 = (i1.is_file ? parseInt(i1.size, 10) : 0);
                    var s2 = (i2.is_file ? parseInt(i2.size, 10) : 0);
                    return (s1 - s2) * sort;
                },
                content: function(item, data) {
                    return item.is_file ? this.formatters.byteSize.format(item.size) : '';
                }
            });
            gettext("filesList_colLastModified");
            mollify.filelist.columns.push({
                id: "file-modified",
                dataId: "core-file-modified",
                titleKey: "filesList_colLastModified",
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

            mod.directive('quickactionContainer', function($timeout) {
                var offset = {
                    top: 0,
                    left: 0
                };

                return function(scope, element, attributes) {
                    var $popup = element.find('.quickaction-container'); //TODO find by class under current element
                    var hidePopup = function() {
                        scope.quickactions = null;
                        $popup.css("display", "none");
                    };
                    element.bind("click", function() {
                        hidePopup();
                    });
                    var containerOffset = element.offset();

                    scope.showQuickactions = function($event, parent, actions) {
                        if (!$event || !parent || (scope.quickactions && parent === scope.quickactions.parent)) {
                            hidePopup();
                            return;
                        }
                        if (!actions) {
                            //console.log($event);
                            if ($event.toElement !== $popup[0])
                                hidePopup();
                            return;
                        }

                        var display;
                        var $parent = $($event.target).closest(".quickaction-parent");
                        if (!$parent || $parent.length === 0) {
                            hidePopup();
                        } else {
                            scope.quickactions = {
                                parent: parent,
                                items: actions
                            };
                            var parentOffset = $parent.offset();
                            $timeout(function() {
                                $popup.css({
                                    top: (parentOffset.top - containerOffset.top) + 'px',
                                    left: (parentOffset.left - containerOffset.left + $parent.outerWidth() - $popup.outerWidth()) + 'px',
                                    display: "block"
                                });
                            });
                        }
                    }
                }
            });
        }
    });
}(window.mollify);
