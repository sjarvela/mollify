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

                render: function(_m, c, m) {
					this.render('files');
					this.render('files-header-tools', {
                        into: 'main',
                        outlet: 'header-tools'
                    });
                },
                model: function() {
                    return {
                        viewType: 'list'
                    };
                },
                controller: function() {
                    return Ember.ObjectController.extend({});
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

                model: function(p) {
                    var df = $.Deferred();
                    this.filesystem.folderInfo(p.id, true, {}).done(function(r) {
                        var result = {
                            id: p.id,
                            items: r.folders.concat(r.files)
                        };
                        df.resolve(result);
                    }); //TODO data
                    return df;
                },
                controller: function() {
                    return Ember.ObjectController.extend({
                        needs: 'main'
                    });
                }
            }
        }
    });
}(window.jQuery, window.mollify);
