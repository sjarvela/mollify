! function(mollify) {
    'use strict';

    /* Platform */
    mollify.platform.push({
        setup: function(app, o) {
            app.config(function($provide) {
                $provide.factory('settings', function() {
                    return o.settings;
                });
            });

            app.config(function($provide) {
                $provide.factory('views', function() {
                    return {
                        all: o.views,
                        get: function(parent) {
                            var result = [];
                            $.each(o.views, function(i, v) {
                                if (v.parent == parent) result.push(v);
                            });
                            return result;
                        }
                    };
                });
            });

            app.config(function($provide) {
                $provide.factory('actions', function() {
                    return {
                        getType: function(type) {
                            return o.actions.byType[type];
                        }
                    };
                });
            });

            // views
            app.
            config(['$stateProvider', '$urlRouterProvider',
                function($stateProvider, $urlRouterProvider) {
                    // For any unmatched url, redirect to /files
                    //$urlRouterProvider.otherwise("/files");
                    //$urlRouterProvider.otherwise(function($injector, $location) {
                    //    console.log("NOT FOUND: "+$location.$$path);
                    //    return "login";
                    //});

                    var templateUrlFn = function(tpl) {
                        return function(stateParams) {
                            var tplName = angular.isFunction(tpl) ? tpl(stateParams) : tpl;
                            return 'templates/' + tplName; //TODO path from params
                        };
                    };

                    $.each(mollify.utils.getKeys(o.views), function(i, vk) {
                        var v = o.views[vk];
                        var vp = {};
                        var subviews = false;
                        if (v.abstract) vp.abstract = true;
                        if (v.url) vp.url = v.url;
                        if (v.parent) vp.parent = v.parent;
                        if (v.resolve) vp.resolve = v.resolve;

                        if (v.subviews) {
                            subviews = {};
                            $.each(mollify.utils.getKeys(v.subviews), function(i, svk) {
                                var sv = v.subviews[svk];
                                var svp = {
                                    templateUrl: templateUrlFn(sv.template)
                                };
                                if (sv.controller) {
                                    if (angular.isFunction(sv.controller)) svp.controllerProvider = sv.controller;
                                    else svp.controller = sv.controller;
                                }
                                if (svp.resolve) svp.resolve = sv.resolve;

                                subviews[svk] = svp;
                            });
                            subviews[''] = {
                                controller: v.controller,
                                templateUrl: templateUrlFn(v.template)
                            };
                            vp.views = subviews;
                        } else {
                            if (v.controller) {
                                if (angular.isFunction(v.controller)) vp.controllerProvider = v.controller;
                                else vp.controller = v.controller;
                            }
                            vp.templateUrl = templateUrlFn(v.template);
                        }

                        console.log("VIEW:" + vk);
                        console.log(vp);
                        $stateProvider
                            .state(vk, vp);

                        if (v.redirect) {
                            var fn = false;
                            if (typeof(v.redirect) == 'function') fn = v.redirect;
                            else if (window.isArray(v.redirect) && v.redirect.length > 0)
                                fn = v.redirect[v.redirect.length - 1];
                            if (fn)
                                $urlRouterProvider.rule(function($injector, $location) {
                                    var deps = [];
                                    var args = [$location];
                                    if (window.isArray(v.redirect) && v.redirect.length > 1)
                                        for (var i = 0; i <= v.redirect.length - 2; i++) args.push($injector.get(v.redirect[i]));
                                    fn.apply(null, args);
                                });
                        }
                    });
                }
            ]);

            app.directive('ngRightClick', function($parse) {
                return function(scope, element, attrs) {
                    var fn = $parse(attrs.ngRightClick);
                    element.bind('contextmenu', function(event) {
                        scope.$apply(function() {
                            event.preventDefault();
                            fn(scope, {
                                $event: event
                            });
                        });
                    });
                };
            });

            app.directive('menuList', function() {
                return {
                    template: '<ul class="dropdown-menu" role="menu"><menu-item ng-repeat="item in items"></menu-item></ul>',
                    replace: true,
                    transclude: true,
                    restrict: 'E',
                    scope: {
                        items: '=ngItems',
                        ctx: '=ngCtx'
                    }
                };
            });

            app.directive('menuItem', function($rootScope, $compile) {
                return {
                    restrict: 'E',
                    replace: true,
                    transclude: true,
                    template: '<li>' + '<a href="#" ng-click="onItem(item)">' + '<i class="fa {{item.icon}}"></i>&nbsp;' + '{{item.titleKey | translate}}' + '</a>' + '</li>',
                    link: function(scope, elm, attrs) {
                        scope.onItem = function(item) {
                            $rootScope.onAction(item, scope.ctx);
                        };
                        /*if (scope.item.children && scope.item.children.length > 0) {
                        var subItems = $compile('<menu-list ng-model="item.children"></menu-list>')(scope)
                        elm.append(subItems);
                    }*/
                    }
                };
            });

            var _dragObj = false;

            app.directive('draggable', ['$parse',
                function($parse) {
                    return {
                        restrict: 'A',
                        compile: function($element, attr) {
                            var onDragStart = $parse(attr['draggable']);

                            return function(scope, element, attr) {
                                var domElement = element[0];

                                domElement.draggable = true;
                                domElement.addEventListener('dragstart', function(e) {
                                    var dragObj = false;
                                    _dragObj = false;

                                    e.dataTransfer.effectAllowed = "none";
                                    if (!onDragStart) return false;

                                    scope.$apply(function() {
                                        dragObj = onDragStart(scope, {
                                            $event: e
                                        });
                                    });
                                    if (!dragObj) return false;

                                    var dragImageType = dragObj.type;

                                    if (dragObj.type == 'filesystemitem') {
                                        var pl = dragObj.payload;
                                        if (!window.isArray(pl) || pl.length == 1) {
                                            var item = window.isArray(pl) ? pl[0] : pl;

                                            if (!item.is_file) dragImageType = "filesystemitem-folder";
                                            else dragImageType = "filesystemitem-file";
                                        } else {
                                            dragImageType = "filesystemitem-many";
                                        }
                                        //TODO api.enableDragToDesktop(pl, e);
                                    }
                                    var $e = $(this);
                                    //t.dragListener = l;
                                    $e.addClass("dragged");
                                    e.dataTransfer.effectAllowed = "copyMove";

                                    console.log("DRAG START " + dragObj.type);
                                    _dragObj = {
                                        obj: dragObj,
                                        $e: $e
                                    };

                                    if (o.settings.dnd.dragimages[dragImageType]) {
                                        var img = document.createElement("img");
                                        img.src = o.settings.dnd.dragimages[dragImageType];
                                        e.dataTransfer.setDragImage(img, 0, 0);
                                    }
                                    return;
                                });
                            };
                        }
                    };
                }
            ]);

            app.directive('droppable', ['$parse',
                function($parse) {
                    return {
                        restrict: 'A',
                        compile: function($element, attr) {
                            var onDrop = $parse(attr['droppable']);
                            var canDrop = $parse(attr['candrop']);
                            var dropAcceptType = attr['dropaccepttype'];

                            return function(scope, element, attr) {
                                var domElement = element[0];

                                domElement.droppable = true;
                                domElement.addEventListener('drop', function(e) {
                                    if (e.stopPropagation) e.stopPropagation();
                                    if (!_dragObj || _dragObj.$e[0] === this) return;
                                    if (dropAcceptType && dropAcceptType != _dragObj.obj.type) return;
                                    console.log("DROP " + _dragObj.obj.type);
                                    //if (!l.canDrop || !l.onDrop || !t.dragObj) return;
                                    scope.$apply(function() {
                                        onDrop(scope, {
                                            dragObj: _dragObj.obj,
                                            $event: e
                                        });
                                    });
                                    $(this).removeClass("dragover");
                                    _dragObj = false;
                                    /*if (l.canDrop($t, e, t.dragObj)) {
                                        l.onDrop($t, e, t.dragObj);
                                        $t.removeClass("dragover");
                                    }
                                    endDrag(e);*/
                                });
                                domElement.addEventListener('dragenter', function(e) {
                                    //if (!l.canDrop || !t.dragObj) return false;
                                    if (!_dragObj || _dragObj.$e[0] === this) return false;
                                    if (dropAcceptType && dropAcceptType != _dragObj.obj.type) return;
                                    console.log("DRAG ENTER " + _dragObj.obj.type);

                                    var dropSpec = false;
                                    scope.$apply(function() {
                                        dropSpec = canDrop(scope, {
                                            dragObj: _dragObj.obj,
                                            $event: e
                                        });
                                    });
                                    if (!dropSpec) return false;
                                    $(this).addClass("dragover");
                                });
                                domElement.addEventListener('dragover', function(e) {
                                    if (!_dragObj || _dragObj.$e[0] === this) return false;
                                    if (dropAcceptType && dropAcceptType != _dragObj.obj.type) return;
                                    if (e.preventDefault) e.preventDefault();

                                    var fx = "none";
                                    var dropSpec = false;
                                    //console.log("DRAG OVER " + _dragObj.obj.type);

                                    scope.$apply(function() {
                                        dropSpec = canDrop(scope, {
                                            dragObj: _dragObj.obj,
                                            $event: e
                                        });
                                    });
                                    if (!dropSpec) return false;

                                    if (dropSpec.dropType) fx = dropSpec.dropType;
                                    /*var dragObj

                                    if (l.canDrop && l.dropType && t.dragObj) {
                                        var $t = $(this);
                                        if (l.canDrop($t, e, t.dragObj)) {
                                            var tp = l.dropType($t, e, t.dragObj);
                                            if (tp) fx = tp;
                                        }
                                    }*/

                                    e.dataTransfer.dropEffect = fx;
                                    return false;
                                });

                                domElement.addEventListener('dragleave', function(e) {
                                    $(this).removeClass("dragover");
                                    //t.dragTarget = false;
                                });
                            };
                        }
                    };
                }
            ]);
        }
    });
}(window.mollify);
