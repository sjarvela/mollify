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
			if (!p || !p.id) return this.filesystem.roots;
			//if (this.filesystem.rootsById[p.id]) return this.filesystem.rootsById[p.id];
			return [
				{ id: p.id, foo: "baz" },
				{ id: p.id+"2", foo: "baz2" }
			];
		},
		defaultModel: function() {
			return this.filesystem.roots[0];
		},
		requiresAuthentication: true,
		controller: function(details) {
			return Ember.ArrayController.extend({});
		},
		detailsController: function() {
			return Ember.ObjectController.extend({
				needs: 'main'
			});			
		}
	});
}(window.jQuery, window.mollify);