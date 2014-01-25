<?php

	/**
	 * Formatter.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class Formatter {
		private $settings;
		 
		public function __construct($settings) {
			$this->settings = $settings;
		}
		
		public function formatDateTime($t) {
			return date($this->settings->setting("datetime_format"), $t);
		}
	}
?>