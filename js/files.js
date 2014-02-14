/**
 * files.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

!function($, mollify) {
	window.mollify.registerModule({
		views: {
			// files parent view
			files : {
				templateFile: 'files',
				template: 'files',
				parent: "main",
				path: "/files",
				model: function() {
					return {
						viewType: 'list'
					};
				},
				controller: function(details) {
					return Ember.ObjectController.extend({});
				},
				requiresAuthentication: true
			},

			// item view (folder listing)
			item: {
				parent: "files",
				template: 'item',
				path: "/:id",
				model: function(p) {
					var df = $.Deferred();
					this.filesystem.folderInfo(p.id, true, {}).done(function(r){
						var result = {
							id: p.id,
							items: r.folders.concat(r.files)
						};
						df.resolve(result);
					});	//TODO data
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

	/*window.mollify.registerModule({
		name: 'main/files:item',
		template: 'files',
		model: function() {
			return {
				viewType: 'list'
			};
		},
		render: function(c, m){

		},
		defaultChild: function() {
			return this.filesystem.roots[0];
		},
		requiresAuthentication: true,
		controller: function(details) {
			return Ember.ObjectController.extend({});
		},
		detailsModel: function(p) {
			var df = $.Deferred();
			this.filesystem.folderInfo(p.id, true, {}).done(function(r){
				var result = {
					id: p.id,
					items: r.folders.concat(r.files)
				};
				df.resolve(result);
			});	//TODO data
			return df;
		},
		detailsController: function() {
			return Ember.ObjectController.extend({
				needs: 'main'
			});			
		}
	});*/
}(window.jQuery, window.mollify);