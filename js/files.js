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
                nameKey: 'files.view.title',
                requiresAuthentication: true,

                render: function(_m, c, m) {
                    this.render('files');
                    this.render('files-header-tools', {
                        into: 'main',
                        outlet: 'header-tools'
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
                },

                setup: function(App) {
                    App.FileListViewComponent = Ember.Component.extend({
                        tagName: 'table',
                        classNames: ['file-list-view table table-striped'],
                        actions: {
                            click: function(item) {
                                this.sendAction("click-item", item);
                            }
                        }
                    });

                    App.FileIconViewComponent = Ember.Component.extend({
                        classNames: ['file-icon-view'],
                        classNameBindings: ['large:large']
                    });
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
                        needs: ['main', 'files'],
                        actions: {
                            gotoFolder: function(item) {
                            	if (!item.is_file) this.transitionToRoute("item", item.id);
                                else alert(item.name);
                            }
                        }
                    });
                }
            }
        }
    });
}(window.jQuery, window.mollify);
