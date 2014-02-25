/**
 * files.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {
    mollify.registerModule({
        views: {
            // files parent view
            files: {
                templateFile: 'files',
                template: 'files',
                parent: "main",
                path: "/files",
                requiresAuthentication: true,

                ui: {
                    titleKey: 'files-view.title',
                    fa: 'fa-folder'
                },

                render: function(_m, c, m) {
                    this.render('files');
                    this.render('files-header-tools', {
                        into: 'main',
                        outlet: 'header-tools'
                    });
                    this.render('files-sidebar-nav', {
                        into: 'main',
                        outlet: 'sidebar-nav'
                    });
                },
                model: function() {
                    return {
                        viewTypes: ['list', 'icon-small', 'icon-large'],
                        viewType: 'list',
                        roots: this.filesystem.roots
                    };
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        actions: {
                            changeViewtype: function(t) {
                                this.set('viewType', t);
                            },
                            gotoFolder: function(item) {
                                if (item.is_file) return;
                                this.transitionToRoute("item", item.id);
                            }
                        },

                        isListView: function() {
                            return this.get('viewType') == 'list';
                        }.property('viewType'),
                        isIconViewLarge: function() {
                            return this.get('viewType') == 'icon-large';
                        }.property('viewType')
                    });
                },
                index: {
                    before: function(_m, transition) {
                        if (_m.filesystem.roots.length === 0) return;
                        this.transitionTo("item", _m.filesystem.roots[0].id);
                    }
                }
            },

            // item view (folder listing)
            item: {
                parent: "files",
                template: 'item',
                path: "/:id",
                requiresAuthentication: true,

                render: function(_m, c, m) {
                    this.render('item');
                    this.render('files-header-nav-items', {
                        into: 'main',
                        outlet: 'header-nav'
                    });
                },
                model: function(p) {
                    var df = $.Deferred();
                    this.filesystem.folderInfo(p.id, true, {}).done(function(r) {
                        var result = {
                            id: p.id,
                            folder: r.folder,
                            items: r.folders.concat(r.files),
                            folders: r.folders,
                            files: r.files,
                            root: r.hierarchy[0],
                            hierarchy: r.hierarchy.slice(1),
                            data: r.data,
                            permissions: r.permissions
                        };
                        df.resolve(result);
                    }); //TODO data
                    return df;
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        needs: ['application', 'main', 'files'],
                        actions: {
                            clickItem: function(item, type, src) {
                                // TODO action spec in settings
                                var ia = this.getItemAction(item, type);
                                if (ia === true) return;

                                if (ia == 'open_menu')
                                    this.showPopupMenu(item, src[0]);
                                else if (ia == 'go_into_folder')
                                    this.gotoFolder(item);
                                else if (ia == 'open_info')
                                    this.showInfo(item);
                                else if (ia == 'download' && item.is_file)
                                    this.send("doAction", this._m.actions.all.download, item);
                            }
                        },

                        getItemAction: function(item, clickType) {
                            var handler = 'onClick';
                            var action = item.is_file ? 'open_info' : 'go_into_folder';

                            if (clickType == 'rightclick') {
                                handler = 'onRightClick';
                                action = 'open_menu';
                            } else if (clickType == 'doubleclick') {
                                handler = 'onDblClick';
                                action = item.is_file ? 'view' : 'go_into_folder';
                            }

                            if (this._m.settings['file-view'].actions[handler]) {
                                var ctx = {}; //TODO
                                var customAction = this._m.settings['file-view'].actions[handler](item, ctx);
                                if (customAction === true) return true;
                                if (customAction) action = customAction;
                            }
                            return action;
                        },
                        showPopupMenu: function(item, src) {
                            var that = this;
                            this._ctx.app.showPopupMenu(src.element, this._m.actions.filesystem(item), item, function(action) {
                                that.send("doAction", action, item);
                            });
                        },
                        showInfo: function(item) {
                            alert('info');
                        }
                    });
                },
                setupController: function(controller, model) {
                    controller._ctx = {
                        _m: this,
                        app: controller.get('controllers.application'),
                        formatters: {
                            byteSize: new mollify.formatters.ByteSize(this.ui.texts, new mollify.formatters.Number(2, false, this.ui.texts.get('decimalSeparator'))),
                            timestamp: new mollify.formatters.Timestamp(this.ui.texts.get('shortDateTimeFormat')),
                            uploadSpeed: new mollify.formatters.Number(1, this.ui.texts.get('dataRateKbps'), this.ui.texts.get('decimalSeparator'))
                        }
                    };
                }
            }
        },

        // module setup
        setup: function(App) {
            App.FileListViewComponent = Ember.Component.extend({
                needs: ['application'],
                tagName: 'table',
                classNames: ['file-list-view table table-striped'],
                actions: {
                    clickItem: function(item, type, src) {
                        var source = src || [];
                        source.push(this.getActionSource());
                        this.sendAction("clickItem", item, type, source);
                    },
                    colClick: function(col) {
                        var sortCol = this.get('sortCol');
                        if (sortCol.id == col.id) {
                            this.toggleProperty('sortAsc');
                        } else {
                            this.setProperties({
                                sortCol: col,
                                sortAsc: true
                            });
                        }
                    }
                },
                sorted: function() {
                    var sortCol = this.get('sortCol');
                    var asc = this.get('sortAsc');
                    var items = this.get('items');
                    var sorted = items.slice(0);
                    if (sortCol.sort) sorted.sort(function(i1, i2) {
                        return sortCol.sort(i1, i2, asc ? 1 : -1);
                    });
                    return sorted;
                }.property('sortCol', 'sortAsc', 'items'),

                getActionSource: function() {
                    return {
                        type: 'list',
                        element: this.$()
                    };
                },

                init: function() {
                    this._super();

                    var that = this;
                    this._ctx = this.get('targetObject._ctx');

                    var cols = [];
                    $.each(mollify.utils.getKeys(this._ctx._m.settings["file-view"]["list-view-columns"]), function(i, k) {
                        var spec = mollify.filelist.columnsById[k];
                        if (!spec) return;

                        spec = $.extend({}, spec);
                        spec.opts = $.extend({}, spec.opts, that._ctx._m.settings["file-view"]["list-view-columns"][k]);
                        cols.push(spec);
                    });
                    this.set('cols', cols);
                    this.set('sortCol', cols[0]);
                    this.set('sortAsc', true);
                }
            });

            App.FileListRowComponent = Ember.Component.extend({
                tagName: 'tr',
                init: function() {
                    this._super();
                    this._ctx = this.get('targetObject._ctx');
                },
                getActionSource: function() {
                    return {
                        type: 'row',
                        element: this.$()
                    };
                },
                actions: {
                    clickItem: function(item, type, src) {
                        this.sendAction("clickItem", item, type, src ? [src, this.getActionSource()] : this.getActionSource());
                    }
                }
            });

            App.FileListCellComponent = Ember.Component.extend({
                tagName: 'td',
                item: false,
                col: false,
                contentKey: '',
                init: function() {
                    this._super();
                    this._ctx = this.get('targetObject._ctx');

                    var item = this.get('item');
                    var col = this.get('col');
                    this.set('contentKey', item.id + '_' + col.id);
                },
                content: function() {
                    var item = this.get('item');
                    var col = this.get('col');

                    return col.content.apply(this._ctx, [item]);
                }.property('contentKey'), //TODO bind to actual property

                getActionSource: function() {
                    return {
                        type: 'col',
                        id: this.get('col').id,
                        element: this.$()
                    };
                },

                click: function(evt) {
                    if (this.clickAction) return;
                    var that = this;
                    this.clickAction = Ember.run.later({}, function() {
                        that.clickAction = false;
                        that.sendAction("clickItem", that.get('item'), 'click', that.getActionSource());
                    }, 200);
                },
                doubleClick: function(evt) {
                    if (this.clickAction) Ember.run.cancel(this.clickAction);
                    this.clickAction = false;
                    this.sendAction("clickItem", this.get('item'), 'doubleclick', this.getActionSource());
                },
                contextMenu: function(evt) {
                    this.sendAction("clickItem", this.get('item'), 'rightclick', this.getActionSource());
                    return false;
                }
            });

            App.FileIconViewComponent = Ember.Component.extend({
                classNames: ['file-icon-view'],
                classNameBindings: ['large:large']
            });
        }
    });

    // register file list columns
    mollify.filelist.registerColumn({
        id: "name",
        titleKey: "fileListColumnTitleName",
        sort: function(i1, i2, sort, data) {
            return i1.name.toLowerCase().localeCompare(i2.name.toLowerCase()) * sort;
        },
        content: function(item, data) {
            return item.name;
        }
    });
    mollify.filelist.registerColumn({
        id: "path",
        titleKey: "fileListColumnTitlePath",
        sort: function(i1, i2, sort, data) {
            var p1 = _m.filesystem.rootsById[i1.root_id].name + i1.path;
            var p2 = _m.filesystem.rootsById[i2.root_id].name + i2.path;
            return p1.toLowerCase().localeCompare(p2.toLowerCase()) * sort;
        },
        html: true,
        content: function(item, data) {
            return '<span class="item-path-root">' + this.filesystem.rootsById[item.root_id].name + '</span>: <span class="item-path-val">' + item.path + '</span>';
        }
    });
    mollify.filelist.registerColumn({
        id: "type",
        titleKey: "fileListColumnTitleType",
        sort: function(i1, i2, sort, data) {
            var e1 = i1.is_file ? (i1.extension || '') : '';
            var e2 = i2.is_file ? (i2.extension || '') : '';
            return e1.toLowerCase().localeCompare(e2.toLowerCase()) * sort;
        },
        content: function(item, data) {
            return item.is_file ? (item.extension || '') : '';
        }
    });
    mollify.filelist.registerColumn({
        id: "size",
        titleKey: "fileListColumnTitleSize",
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
}(window.jQuery, window.mollify);
