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
		model: function() {
			return {};
		},
		defaultChild: function() {
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