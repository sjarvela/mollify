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
		name: 'main/files',
		template: 'files',
		modelParam : true,
		model: function(p) {
			return {
				id: p,
				foo: "baz"
			};	
		},
		requiresAuthentication: true,
		controller: function() {
			return Ember.ObjectController.extend({});
		}
	});
}(window.jQuery, window.mollify);