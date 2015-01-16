<?php
/**
 * MetadataDao.class.php
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

class Mollify_MetadataDao {
	private $env;
	private $db;

	public function __construct($env) {
		$this->env = $env;
		$this->db = $env->db();
	}

	public function getItemMetadata($id) {
		return $this->db->query(sprintf("SELECT key, value FROM " . $this->db->table("metadata") . " WHERE item_id = %s", $this->db->string($id)))->rows();
	}

	public function getItemMetadataForChildren($parent) {
		return $this->db->query(sprintf("SELECT key, value FROM " . $this->db->table("metadata") . " WHERE item_id in (select id from " . $this->db->table("item_id") . " where path like '%s%%') order by item_id asc", str_replace("'", "\'", $this->db->string($parent->location()))))->rows();
	}

	public function deleteMetadata($item) {
		if ($item->isFile()) {
			return $this->db->update("DELETE FROM " . $db->table("metadata") . " WHERE item_id = " . $this->db->string($item->id(), TRUE));
		} else {
			return $this->db->update(sprintf("DELETE FROM " . $db->table("metadata") . " WHERE item_id in (select id from " . $this->db->table("item_id") . " where path like '%s%%')", str_replace("'", "\'", $this->db->string($item->location()))));
		}
	}

	public function cleanupItemIds($ids) {
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("metadata") . " WHERE item_id in (%s)", $this->db->arrayString($ids, TRUE)));
	}
}
?>