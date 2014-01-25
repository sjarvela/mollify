<?php

	/**
	 * ImagePreviewer.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class ImagePreviewer extends PreviewerBase {
		public function getPreviewHtml($item) {
			return
				'<div id="file-preview-container" style="overflow:auto; max-height:300px">'.
					'<img src="'.$this->getImageContentUrl($item).'" style="max-width:400px">'.
				'</div>';
		}
		
		private function getImageContentUrl($item) {
			return $this->env->getServiceUrl("filesystem", array($item->id(), "thumbnail"), TRUE);
		}
	}
?>