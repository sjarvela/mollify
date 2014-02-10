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
		name: 'main/files:item',
		template: 'files',
		modelParam : true,
		model: function(p) {
			if (!p || !p.id) return { parent: null, children: this.filesystem.roots };
			//if (this.filesystem.rootsById[p.id]) return this.filesystem.rootsById[p.id];
			return { parent: { id: p.id}, children: [
				{ id: p.id+"_1", name: "foo", extension: "bar", size: 12 },
				{ id: p.id+"_2", name: "foo", extension: "baz", size: 14 }
			]};
		},
		defaultModel: function() {
			return this.filesystem.roots[0];
		},
		requiresAuthentication: true,
		controller: function(details) {
			return Ember.ObjectController.extend({});
		},
		detailsModel: function(p) {
			return [
				{ id: p.id+"_1", name: "foo"+p.id, extension: "bar", size: 12 },
				{ id: p.id+"_2", name: "foo"+p.id, extension: "baz", size: 14 }
			];
		},
		detailsController: function() {
			return Ember.ArrayController.extend({
				needs: 'main'
			});			
		}
	});
}(window.jQuery, window.mollify);