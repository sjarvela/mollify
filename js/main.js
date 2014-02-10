/**
 * main.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

!function($, mollify) {
	window.mollify.registerModule({
		name: 'main',
		composite: true,
		model: function() {
			return {
				session: this.session()
			};
		},
		template: 'main'
	});
}(window.jQuery, window.mollify);