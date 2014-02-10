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
			if (!p.id) return this.filesystem.roots;
			if (this.filesystem.rootsById[p.id]) return this.filesystem.rootsById[p.id];
			return [{
				id: p.id,
				foo: "baz"
			}];
		},
		defaultModel: function() {
			return this.filesystem.roots[0];
		},
		requiresAuthentication: true,
		controller: function() {
			return Ember.Controller.extend({});
		}
	});
}(window.jQuery, window.mollify);