<?php
/**
 * MetadataController.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

require_once "MetadataDao.class.php";

class Mollify_MetadataController {
	private $env;
	private $dao;

	public function __construct($env) {
		$this->env = $env;
		$this->dao = new Mollify_MetadataDao($this->env);
	}

	public function initialize() {
		$this->env->filesystem()->registerItemCleanupHandler($this);
		$this->env->filesystem()->registerDataRequestPlugin(array("item-metadata", "parent-metadata"), $this);
	}

	public function onEvent($e) {
		if (strcmp(FilesystemController::EVENT_TYPE_FILE, $e->type()) != 0) {
			return;
		}

		$type = $e->subType();

		if ($type === FileEvent::DELETE) {
			$this->dao->deleteMetadata($e->item());
		}
	}

	public function cleanupItemIds($ids) {
		$this->dao->cleanupItemIds($ids);
	}

	public function getRequestData($parent, $items, $key, $requestData) {
		$result = array();
		if (strcmp("item-metadata", $key) === 0) {
			if ($parent != NULL) {
				$result = array_merge($result, $this->groupDataByItem($this->dao()->getItemMetadataForChildren($parent->id())));
			} else {
				foreach ($items as $i) {
					$result[$i->id()] = $this->dao()->getItemMetadata($i->id());
				}
			}
		} else if (strcmp("parent-metadata", $key) === 0) {
			if ($parent != NULL) {
				$result = $this->dao()->getItemMetadata($parent->id());
			}
		}

		return $result;
	}

	private function groupDataByItem($data) {
		$result = array();
		foreach ($data as $row) {
			$id = $row["item_id"];
			if (!isset($result[$id])) {
				$result[$id] = array();
			}
			$result[$id][$row["key"]] = $row["value"];
		}
		return $result;
	}

	public function __toString() {
		return "MetadataController";
	}
}
?>