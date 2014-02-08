/**
 * main.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

window.mollify.registerModule({
	name: 'main',
	template: 'main',
	model: function() {
		return {
			foo: "baz"
		};	
	},
	requiresAuthentication: true,
	controller: function() {
		
	}
});