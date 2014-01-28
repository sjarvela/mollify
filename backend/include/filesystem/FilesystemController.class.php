<?php

	/**
	 * FilesystemController.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	 
	 require_once("include/event/EventHandler.class.php");
	 			
	 class FilesystemController {	 	
	 	const EVENT_TYPE_FILE = "filesystem";

	 	const PERMISSION_LEVEL_NONE = "n";
	 	const PERMISSION_LEVEL_READ = "r";
	 	const PERMISSION_LEVEL_READWRITE = "rw";
	 	const PERMISSION_LEVEL_READWRITEDELETE = "rwd";
		
		private $env;
		private $allowedUploadTypes;
		private $permissionCache = array();
		private $folderCache = array();
		private $contextPlugins = array();
		private $actionValidators = array();
		private $dataRequestPlugins = array();
		private $itemCleanupHandlers = array();
		private $searchers = array();
		private $filesystems = array();
		private $idProvider;
		
		public $allowFilesystems = FALSE;

		function __construct($env) {
			require_once("MollifyFilesystem.class.php");
			require_once("LocalFilesystem.class.php");
			require_once("FilesystemItem.class.php");
			require_once("BaseSearcher.class.php");
			require_once("FilesystemSearcher.class.php");
			require_once("CoreFileDataProvider.class.php");
			require_once("ItemIdProvider.class.php");
			
			$this->env = $env;
			$this->idProvider = new ItemIdProvider($env);
			
			$this->allowedUploadTypes = $env->settings()->setting('allowed_file_upload_types');
			$this->forbiddenUploadTypes = $env->settings()->setting('forbidden_file_upload_types');
		}
		
		public function initialize() {
			FileEvent::register($this->env->events());
			
			$this->registerSearcher(new FileSystemSearcher($this->env));
			
			$coreData = new CoreFileDataProvider($this->env);
			$coreData->init($this);
						
			$this->env->permissions()->registerFilesystemPermission("filesystem_item_access", array(
				self::PERMISSION_LEVEL_NONE,
				self::PERMISSION_LEVEL_READ,
				self::PERMISSION_LEVEL_READWRITE,
				self::PERMISSION_LEVEL_READWRITEDELETE
			));
			
			$this->env->permissions()->registerFilesystemPermission("edit_description");
		}
		
		public function itemIdProvider() {
			return $this->idProvider;
		}
		
		public function registerFilesystem($id, $factory) {
			Logging::logDebug("Filesystem registered: ".$id);
			$this->filesystems[$id] = $factory;
		}

		public function registerItemCleanupHandler($h) {
			$this->itemCleanupHandlers[] = $h;
		}

		public function registerItemContextPlugin($key, $plugin) {
			$this->contextPlugins[$key] = $plugin;
		}

		public function registerActionValidator($key, $validator) {
			$this->actionValidators[$key] = $validator;
		}
		
		public function registerDataRequestPlugin($keys, $plugin) {
			foreach($keys as $key)
				$this->dataRequestPlugins[$key] = $plugin;
		}
		
		public function getDataRequestPlugins() {
			return $this->dataRequestPlugins;
		}
		
		public function getRequestData($parent, $items, $data) {
			$requestDataResult = array();
			if (!$data or !$items or count($items) < 1) return $requestDataResult;
			
			foreach($this->getDataRequestPlugins() as $key => $plugin) {
				if (!array_key_exists($key, $data)) continue;
				
				$d = $plugin->getRequestData($parent, $items, $key, $data[$key]);
				if ($d !== NULL) $requestDataResult[$key] = $d;
			}
			return $requestDataResult;
		}
		
		public function registerSearcher($searcher) {
			$this->searchers[] = $searcher;
		}
		
		public function validateAction($action, $target) {
			$list = array();
			$acceptKeys = $this->env->request()->hasData("acceptKeys") ? $this->env->request()->data("acceptKeys") : array();
			if ($acceptKeys == NULL) $acceptKeys = array();
			
			foreach($this->actionValidators as $key => $v) {
				$ret = $v->validateAction($action, $target, $acceptKeys);
				if ($ret) $list[$key] = $ret;
			}
			if (count($list) > 0) throw new ServiceException("REQUEST_DENIED", "Action not allowed: ".$action, array(
				"action" => $action,
				"target" => $this->getItemData($target),
				"items" => $list
			));
		}

		private function getItemData($i) {
			$data = array();
			if (!is_array($i)) {
				$data[] = $i->data();
			} else {
				foreach($i as $item) $data[] = $item->data();
			}
			return $data;
		}
		
		public function getRootFolders($all = FALSE) {
			$list = array();
			
			foreach($this->getFolderDefs($all) as $folderDef) {
				$root = $this->filesystem($folderDef, !$all)->root();
				if (!$this->hasRights($root, self::PERMISSION_LEVEL_READ)) continue;
				$list[] = $root;
			}
			
			return $list;
		}

		public function getRootFoldersByKey($all = FALSE) {
			$list = array();			
			foreach($this->getRootFolders($all) as $r) {
				$list[$r->filesystem()->id()] = $r;
			}			
			return $list;
		}
		
		private function getFolderDefs($all = FALSE) {
			if (!$all)
				$folderDefs = $this->env->configuration()->getUserFolders($this->env->session()->userId(), TRUE);
			else
				$folderDefs = $this->env->configuration()->getFolders();

			$list = array();
			
			foreach($folderDefs as $folderDef) {
				if (array_key_exists($folderDef['id'], $list)) continue;
				if (!$this->isFolderValid($folderDef, !$all)) continue;
				
				if (!isset($folderDef["name"]) and !isset($folderDef["default_name"])) {
					$this->env->session()->end();
					throw new ServiceException("INVALID_CONFIGURATION", "Folder definition does not have a name (".$folderDef['id'].")");
				}
				if (!isset($folderDef["path"])) {
					$this->env->session()->end();
					throw new ServiceException("INVALID_CONFIGURATION", "Folder definition does not have a path (".$folderDef['id'].")");
				}
				
				$list[$folderDef['id']] = $folderDef;
			}
			
			return $list;
		}
		
		private function hasRights($item, $required) {
			if (is_array($item)) {
				foreach($item as $i)
					if (!$this->env->permissions()->hasFilesystemPermission("filesystem_item_access", $item, $required)) return FALSE;
				return TRUE;
			}

			return $this->env->permissions()->hasFilesystemPermission("filesystem_item_access", $item, $required);
		}
		
		public function assertRights($item, $required, $desc = "Unknown action") {
			if (!$this->hasRights($item, $required))
				throw new ServiceException("INSUFFICIENT_PERMISSIONS", $desc.", required: ".$required);
		}
		
		private function isFolderValid($folderDef, $mustExist = TRUE) {
			$root = $this->filesystem($folderDef, $mustExist)->root();
			if ($mustExist and !$root->exists()) throw new ServiceException("DIR_DOES_NOT_EXIST", 'root id:'.$folderDef['id']);
			if (!$this->allowFilesystems and !$this->hasRights($root, self::PERMISSION_LEVEL_READ)) return FALSE;
			return TRUE;
		}
		
		private function createFilesystem($folderDef) {
			if ($folderDef == NULL) throw new ServiceException("INVALID_CONFIGURATION", "Invalid root folder definition");

			$id = isset($folderDef['id']) ? $folderDef['id'] : '';
			
			//TODO this is hack, support real filesystem types
			if (array_key_exists("S3FS", $this->filesystems)) {
				$factory = $this->filesystems["S3FS"];
				return $factory->createFilesystem($id, $folderDef, $this);
			}
			
			switch ($this->filesystemType($folderDef)) {
				case MollifyFilesystem::TYPE_LOCAL:
					return new LocalFilesystem($id, $folderDef, $this);
				default:
					throw new ServiceException("INVALID_CONFIGURATION", "Invalid root folder definition (".$id."), type unknown");
			}
		}
		
		private function filesystemType($folderDef) {
			return MollifyFilesystem::TYPE_LOCAL;	// include type in definition when more types are supported
		}
		
		public function getSessionInfo() {
			$result = array();
			
			$result['filesystem'] = array(
				"max_upload_file_size" => Util::inBytes(ini_get("upload_max_filesize")),
				"max_upload_total_size" => Util::inBytes(ini_get("post_max_size")),
				"allowed_file_upload_types" => $this->allowedFileUploadTypes(),
				"forbidden_file_upload_types" => $this->forbiddenFileUploadTypes()
			);
			
			$this->itemIdProvider()->loadRoots();
			
			$result["folders"] = array();
			foreach($this->getRootFolders() as $id => $folder) {
				$nameParts = explode("/", str_replace("\\", "/",$folder->name()));
				$name = array_pop($nameParts);
				
				$result["folders"][] = array(
					"id" => $folder->id(),
					"name" => $name,
					"group" => implode("/", $nameParts),
					"parent_id" => NULL,
					"root_id" => $folder->id(),
					"path" => ""
				);
			}

			if ($this->env->authentication()->isAdmin()) {
				$result["roots"] = array();
				foreach($this->getRootFolders(TRUE) as $id => $folder) {
					$nameParts = explode("/", str_replace("\\", "/",$folder->name()));
					$name = array_pop($nameParts);
					
					$result["roots"][] = array(
						"id" => $folder->id(),
						"name" => $name,
						"group" => implode("/", $nameParts),
						"parent_id" => NULL,
						"root_id" => $folder->id(),
						"path" => ""
					);
				}
			}
			
			return $result;
		}

		public function filesystemFromId($id, $assert=TRUE) {
			return $this->filesystem($this->env->configuration()->getFolder($id), $assert);
		}
		
		public function filesystem($def, $assert=TRUE) {
			$fs = $this->createFilesystem($def);
			if ($assert) $fs->assert();
			return $fs;
		}
		
		public function item($id, $nonexisting = FALSE) {
			$location = $this->itemIdProvider()->getLocation($id);
			$parts = explode(":".DIRECTORY_SEPARATOR, $location);
			if (count($parts) != 2) throw new ServiceException("INVALID_CONFIGURATION", "Invalid item location: ".$location);
			
			$filesystemId = $parts[0];
			$path = $parts[1];
			if (strpos($path, "../") !== FALSE or strpos($path, "..\\") !== FALSE) new ServiceException("INVALID_CONFIGURATION", "Invalid item location: ".$location);
			
			if (array_key_exists($filesystemId, $this->folderCache)) {
				$folderDef = $this->folderCache[$filesystemId];
			} else {
				$folderDef = $this->env->configuration()->getFolder($filesystemId);
				if (!$folderDef) {
					Logging::logDebug("Root folder does not exist: ".$location." (".$id.")");
					throw new ServiceException("REQUEST_FAILED");
				}
				if (!$this->isFolderValid($folderDef)) {
					Logging::logDebug("No permissions for root folder: ".$location." (".$id.")");
					throw new ServiceException("INSUFFICIENT_PERMISSIONS");
				}
				
				$this->folderCache[$filesystemId] = $folderDef;
			}
			if (strlen($path) == 0) return $this->filesystem($folderDef)->root();
			
			return $this->filesystem($folderDef)->createItem($id, $path, $nonexisting);
		}
		
		public function cleanupItemIds($ids) {
			$this->env->db()->startTransaction();
			$this->idProvider->deleteIds($ids);
			$this->env->configuration()->cleanupItemIds($ids);
			
			foreach ($this->itemCleanupHandlers as $cleanupHandler)
				$cleanupHandler->cleanupItemIds($ids);
			$this->env->db()->commit();
		}
				
		public function assertFilesystem($folderDef) {
			$this->filesystem($folderDef, TRUE);
		}

		public function ignoredItems($filesystem, $path) {
			return array('mollify.dsc', 'mollify.uac');	//TODO get from settings and/or configuration etc
		}
		
		public function items($folder) {
			$this->env->permissions()->prefetchFilesystemChildrenPermissions("filesystem_item_access", $folder);
			$this->assertRights($folder, self::PERMISSION_LEVEL_READ, "items");
			$this->itemIdProvider()->load($folder);
			
			$list = array();
			foreach($folder->items() as $i) {
				if (!$this->hasRights($i, self::PERMISSION_LEVEL_READ)) continue;
				$list[] = $i;
			}
			return $list;
		}

		public function hierarchy($folder) {
			$this->assertRights($folder, self::PERMISSION_LEVEL_READ, "hierarchy");
			$h = $folder->hierarchy();
			return $h;
		}

		public function details($item, $data = NULL) {
			$this->assertRights($item, self::PERMISSION_LEVEL_READ, "details");
	
			$details = $item->details();
			$details["description"] = $this->description($item);
			$details["permissions"] = $this->env->permissions()->getAllFilesystemPermissions($item);
			$details["parent_permissions"] = $item->isRoot() ? NULL : $this->env->permissions()->getAllFilesystemPermissions($item->parent());
			$details["plugins"] = array();

			foreach($this->contextPlugins as $k=>$p) {
				$d = ($data != NULL and isset($data[$k])) ? $data[$k] : NULL;
				$l = $p->getItemContextData($item, $details, $k, $d);
				if (!$l) continue;
				$details["plugins"][$k] = $l;
			}
			return $details;
		}
		
		public function checkExisting($folder, $files) {
			$existing = array();
			
			foreach($files as $file) {
				$f = $folder->fileWithName($file);
				if ($f->exists()) $existing[] = $file;
			}
			return $existing;
		}
		
		public function env() {
			return $this->env;
		}

		public function description($item) {
			return $this->env->configuration()->getItemDescription($item);
		}

		public function setDescription($item, $desc) {
			if (!$this->env->permissions()->hasFilesystemPermission("edit_description", $item)) throw new ServiceException("INSUFFICIENT_PERMISSIONS");
			return $this->env->configuration()->setItemDescription($item, $desc);
		}

		public function removeDescription($item) {
			if (!$this->env->permissions()->hasFilesystemPermission("edit_description", $item)) throw new ServiceException("INSUFFICIENT_PERMISSIONS");
			return $this->env->configuration()->removeItemDescription($item);
		}
		
		private function allowedFileUploadTypes() {
			$types = array();
			foreach ($this->allowedUploadTypes as $type) {
				$pos = strrpos($type, ".");
				if ($pos === FALSE) $types[] = $type;
				else $types[] = substr($type, $pos+1);
			}
			return $types;
		}
		
		private function forbiddenFileUploadTypes() {
			$types = array();
			foreach ($this->forbiddenUploadTypes as $type) {
				$pos = strrpos($type, ".");
				if ($pos === FALSE) $types[] = $type;
				else $types[] = substr($type, $pos+1);
			}
			return $types;
		}
		
		public function rename($item, $name) {
			Logging::logDebug('rename from ['.$item->path().'] to ['.$name.']');
			$this->assertRights($item, self::PERMISSION_LEVEL_READWRITE, "rename");
			$to = $item->rename($name);
			
			$this->env->events()->onEvent(FileEvent::rename($item, $to));
			$this->idProvider->move($item, $to);
		}

		public function copy($item, $to) {
			Logging::logDebug('copying '.$item->id()."[".$item->internalPath().'] to '.$to->id()."[".$to->internalPath().']');
			
			if ($item->isFile() and !$to->isFile()) $to = $to->createFile($item->name());
			if (!$item->isFile() and $to->isFile()) throw new ServiceException("NOT_A_DIR", $to->path());
			
			$this->assertRights($item, self::PERMISSION_LEVEL_READ, "copy");
			$this->assertRights($to->parent(), self::PERMISSION_LEVEL_READWRITE, "copy");

			$to = $item->copy($to);
			$this->env->events()->onEvent(FileEvent::copy($item, $to));
		}
		
		public function copyItems($items, $folder) {
			Logging::logDebug('copying '.count($items).' items to ['.$folder->path().']');
			$this->assertRights($items, self::PERMISSION_LEVEL_READ, "copy");
			
			foreach($items as $item) {
				if ($item->isFile())
					$this->copy($item, $folder->createFile($item->name()));
				else
					$this->copy($item, $folder->folderWithName($item->name()));
			}
		}
		
		public function move($item, $to) {
			Logging::logDebug('moving '.$item->id()."[".$item->path().'] to ['.$to.']');
			if ($item->isRoot()) throw new ServiceException("INSUFFICIENT_PERMISSIONS", "Cannot move root folders");
			
			if ($to->isFile()) throw new ServiceException("NOT_A_DIR", $to->path());
			$this->assertRights($item, self::PERMISSION_LEVEL_READ, "move");
			$this->assertRights($to, self::PERMISSION_LEVEL_READWRITE, "move");

			$to = $item->move($to);
						
			$this->env->events()->onEvent(FileEvent::move($item, $to));
			$this->idProvider->move($item, $to);
		}
		
		public function moveItems($items, $to) {
			Logging::logDebug('moving '.count($items).' items');
			foreach($items as $item)
				if ($item->isRoot()) throw new ServiceException("INSUFFICIENT_PERMISSIONS", "Cannot move root folder:".$item->id());
				
			$this->assertRights($items, self::PERMISSION_LEVEL_READWRITE, "move");
			
			foreach($items as $item)
				$this->move($item, $to);
		}
		
		public function delete($item) {
			Logging::logDebug('deleting ['.$item->id().']');
			if ($item->isRoot()) throw new ServiceException("INSUFFICIENT_PERMISSIONS", "Cannot delete root folders");
			
			$this->assertRights($item, self::PERMISSION_LEVEL_READWRITEDELETE, "delete");
			$this->validateAction(FileEvent::DELETE, $item);
						
			$item->delete();
			
			if ($this->env->features()->isFeatureEnabled("descriptions"))
				$this->env->configuration()->removeItemDescription($item);
			
			$this->env->permissions()->removeFilesystemPermissions($item);
			
			$this->env->events()->onEvent(FileEvent::delete($item));
			$this->idProvider->delete($item);
		}
		
		public function deleteItems($items) {
			Logging::logDebug('deleting '.count($items).' items');
			foreach($items as $item)
				if ($item->isRoot()) throw new ServiceException("INSUFFICIENT_PERMISSIONS", "Cannot delete root folder:".$item->id());

			$this->validateAction(FileEvent::DELETE, $items);
			$this->assertRights($items, self::PERMISSION_LEVEL_READWRITEDELETE, "delete");
			
			foreach($items as $item)
				$this->delete($item);
		}
		
		public function createFolder($parent, $name) {
			Logging::logDebug('creating folder ['.$parent->id().'/'.$name.']');
			$this->assertRights($parent, self::PERMISSION_LEVEL_READWRITE, "create folder");

			$new = $parent->createFolder($name);
			$this->env->events()->onEvent(FileEvent::createFolder($new));			
		}

		public function download($file, $mobile, $range = NULL) {
			if (!$range)
				Logging::logDebug('download ['.$file->id().']');
			$this->assertRights($file, self::PERMISSION_LEVEL_READ, "download");
			if (!$file->filesystem()->isDirectDownload()) {
				$this->env->response()->redirect($file->filesystem()->getDownloadUrl($file));
				return;
			}
			
			$name = $file->name();
			$size = $file->size();
			
			if ($range != NULL) {
				list($unit, $range) = explode('=', $range, 2);
				
				if ($unit == 'bytes') {
					$pos = strpos(",", $range);
					if ($pos != false) {
						if ($pos === 0) $range = NULL;
						else if ($pos >= 0) $range = substr($range, 0, $pos);
					}
				} else {
					$range = NULL;
				}
			}
			
			if ($range != NULL) {
				list($start, $end) = explode('-', $range, 2);

				$end = (empty($end)) ? ($size - 1) : min(abs(intval($end)),($size - 1));
				$start = (empty($start) || $end < abs(intval($start))) ? 0 : max(abs(intval($start)),0);
				$range = array($start, $end, $size);
				Logging::logDebug("Download range ".$start."-".$end);
			}

			if (!$range)
				$this->env->events()->onEvent(FileEvent::download($file));

			$this->env->response()->download($name, $file->extension(), $mobile, $file->read($range), $size, $range);
		}

		public function view($file) {
			Logging::logDebug('view ['.$file->id().']');
			$this->assertRights($file, self::PERMISSION_LEVEL_READ, "view");
			$this->env->events()->onEvent(FileEvent::view($file));
			$this->env->response()->send($file->name(), $file->extension(), $file->read(), $file->size());
		}
		
		public function read($file) {
			Logging::logDebug('read ['.$file->id().']');
			$this->assertRights($file, self::PERMISSION_LEVEL_READ, "read");
			$this->env->events()->onEvent(FileEvent::view($file));
			return $file->read();
		}
		
		public function updateFileContents($item, $content) {
			if (!$item->isFile()) throw new ServiceException("NOT_A_FILE", $item->path());
			Logging::logDebug('update file contents ['.$item->id().']');
			$this->assertRights($item, self::PERMISSION_LEVEL_READWRITE, "update content");
			$this->env->events()->onEvent(FileEvent::upload($item));
			$item->put($content);
		}
		
		public function getUploadTempDir() {
			$dir = $this->env->settings()->setting("upload_temp_dir");
			if ($dir != NULL and strlen($dir) > 0) return $dir;
			return sys_get_temp_dir();
		}
		
		public function uploadTo($folder) {
			$this->assertRights($folder, self::PERMISSION_LEVEL_READWRITE, "upload");
			
			//if (Logging::isDebug()) Logging::logDebug("Upload to ".$folder->id().", FILES=".Util::array2str($_FILES));
			
			if (!isset($_FILES['uploader-http']) and !isset($_FILES['uploader-html5'])) {
				if (!isset($_SERVER['HTTP_CONTENT_DISPOSITION']))
					throw new ServiceException("NO_UPLOAD_DATA");
					
				// stream uploading
		        $name = isset($_SERVER['HTTP_CONTENT_DISPOSITION']) ? rawurldecode(preg_replace('/(^[^"]+")|("$)/', '', $_SERVER['HTTP_CONTENT_DISPOSITION'])) : null;
		        $type = isset($_SERVER['HTTP_CONTENT_DESCRIPTION']) ? $_SERVER['HTTP_CONTENT_DESCRIPTION'] : null;
		        $range = isset($_SERVER['HTTP_CONTENT_RANGE']) ? preg_split('/[^0-9]+/', $_SERVER['HTTP_CONTENT_RANGE']) : null;
		        $size =  $range ? $range[3] : null;
		        
				if (Logging::isDebug()) Logging::logDebug("Stream upload: ".$name. " ".Util::array2str($range));
				
                $info[] = $this->upload(
                	$folder,
                	$name,
                    FALSE,	// read from stream
                    $size,
                    $type,
                    $range
                );				
				return;
			}
			
			// html5 uploader
			if (isset($_FILES['uploader-html5'])) {
				//if (!isset($_FILES['uploader-html5']['tmp_name'])) throw new ServiceException("UPLOAD_FAILED");
				
		        $name = isset($_SERVER['HTTP_CONTENT_DISPOSITION']) ? rawurldecode(preg_replace('/(^[^"]+")|("$)/', '', $_SERVER['HTTP_CONTENT_DISPOSITION'])) : null;
		        $type = isset($_SERVER['HTTP_CONTENT_DESCRIPTION']) ? $_SERVER['HTTP_CONTENT_DESCRIPTION'] : null;
		        $range = isset($_SERVER['HTTP_CONTENT_RANGE']) ? preg_split('/[^0-9]+/', $_SERVER['HTTP_CONTENT_RANGE']) : null;
		        $size =  $range ? $range[3] : null;
		        $files = $_FILES['uploader-html5'];
		        
		        if (is_array($files['tmp_name'])) {
		        	foreach ($files['tmp_name'] as $index => $value) {
						if (isset($files['error'][$index]) && $files['error'][$index] != UPLOAD_ERR_OK)
							throw new ServiceException("UPLOAD_FAILED", $files['error'][$index]);
		        	}
		        	
		            foreach ($files['tmp_name'] as $index => $value) {
		                $info[] = $this->upload(
		                	$folder,
		                	$name ? $name : $files['name'][$index],
		                    $files['tmp_name'][$index],
		                    $size ? $size : $files['size'][$index],
		                    $type ? $type : $files['type'][$index],
		                    $range
		                );
		            }
		        } else {
					if (isset($files['error']) && $files['error'] != UPLOAD_ERR_OK)
						throw new ServiceException("UPLOAD_FAILED", $files['error']);
				
		            $info[] = $this->upload(
		            	$folder,
		            	$name ? $name : (isset($files['name']) ? $files['name'] : null),
		                isset($files['tmp_name']) ? $files['tmp_name'] : null,
		                $size ? $size : (isset($files['size']) ? $files['size'] : $_SERVER['CONTENT_LENGTH']),
		                $type ? $type : (isset($files['type']) ? $files['type'] : $_SERVER['CONTENT_TYPE']),
		                $range
		            );
		        }
				//$this->upload($folder, $_FILES['uploader-html5']['name'][0], $_FILES['uploader-html5']['tmp_name'][0]);
				return;
			}
	
			// http
			if (isset($_FILES["file"]) && isset($_FILES["file"]["error"]) && $_FILES["file"]["error"] != UPLOAD_ERR_OK)
				throw new ServiceException("UPLOAD_FAILED", $_FILES["file"]["error"]);
					
			foreach ($_FILES['uploader-http']['name'] as $key => $value) { 
				$name = $_FILES['uploader-http']['name'][$key];
				$origin = $_FILES['uploader-http']['tmp_name'][$key];
				$this->upload($folder, $name, $origin);
			}
		}
		
		private function upload($folder, $name, $origin, $size = NULL, $type = NULL, $range = NULL) {
			$this->assertUploadFileType($name);
			
			$append = ($range != NULL);
			//TODO check for max post size, range etc
			$target = $folder->fileWithName($name);
			if (!$append and $target->exists()) {
				$target = $this->findFreeFileWithIndex($folder, $name);
				$target = $folder->createFile($target->name());
			}
			
			//if ($target->exists()) throw new ServiceException("FILE_ALREADY_EXISTS");
			Logging::logDebug('uploading to ['.$target.'] file ['.$name.'],size='.$size.',type='.$type.',range='.Util::array2str($range));
			$fromFile = ($origin && is_uploaded_file($origin));
            
			if ($fromFile) {
				$src = @fopen($origin, "rb");
			} else {
				$src = @fopen('php://input', 'r');
			}
			if (!$src)
				throw new ServiceException("SAVING_FAILED", "Failed to read uploaded data");
			$target->write($src, $append);
			fclose($src);
			if ($fromFile) unlink($origin);
			
			// is finished?
			//if ($size != NULL && $target->size() == $size) {
			//}
			
			if (!$append)
				$this->env->events()->onEvent(FileEvent::upload($target));
		}
		
		private function findFreeFileWithIndex($folder, $name) {
			$index = 1;
			$base = $name;
			$ext = strrchr($name, ".");

			if ($ext != FALSE) {
				$base = substr($name, 0, 0-strlen($ext));
			} else {
				$ext = "";
			}
						
			while (TRUE) {
				$file = $folder->fileWithName($base."(".$index.")".$ext);
				if (!$file->exists()) return $file;
				$index = $index + 1;
				if ($index > 100) break;
			}
			throw new ServiceException("FILE_ALREADY_EXISTS");
		}
		
		public function assertUploadFileType($name) {
			$ext = ltrim(strrchr($name, "."), ".");
			if ($ext === FALSE) return;
			$ext = strtolower($ext);
			
			if (Logging::isDebug()) Logging::logDebug("FORBIDDEN ".$ext.": ".Util::array2str($this->forbiddenUploadTypes));
			if (count($this->forbiddenUploadTypes) > 0 and in_array($ext, $this->forbiddenUploadTypes)) throw new ServiceException("UPLOAD_FILE_NOT_ALLOWED");
			
			if (Logging::isDebug()) Logging::logDebug("ALLOWED ".$ext.": ".Util::array2str($this->allowedUploadTypes));
			if (count($this->allowedUploadTypes) > 0 and !in_array($ext, $this->allowedUploadTypes)) throw new ServiceException("UPLOAD_FILE_NOT_ALLOWED");
		}
		
		public function uploadFrom($folder, $name, $stream, $src = '[Unknown]') {
			$this->assertUploadFileType($name);
			//$this->env->features()->assertFeature("file_upload");
			$this->assertRights($folder, self::PERMISSION_LEVEL_READWRITE, "upload");

			$targetItem = $folder->createFile($name);
			if (Logging::isDebug()) Logging::logDebug("Upload from $src ($name) to ".$targetItem->id());
			$targetItem->write($stream, FALSE);
			
			$this->env->events()->onEvent(FileEvent::upload($targetItem));
		}
				
		public function search($parent, $text, $rqData) {
			if ($parent == NULL) {
				$m = array();
				foreach($this->getRootFolders() as $id => $root) {
					$data = array();
					foreach($this->searchers as $searcher)
						$data[$searcher->key()] = $searcher->preData($root, $text);
					$m = array_merge($m, $this->searchRecursive($data, $root, $text));
				}
			} else {
				$this->itemIdProvider()->load($parent, TRUE);
				$data = array();
				foreach($this->searchers as $searcher)
					$data[$searcher->key()] = $searcher->preData($parent, $text);
				$m = $this->searchRecursive($data, $parent, $text);
			}
			$result = array("count" => count($m), "matches" => $m);
			$items = array();
			foreach($m as $id => $r) {
				$items[] = $r["itm"];
			}
			$result["data"] = $this->env->filesystem()->getRequestData(NULL, $items, $rqData);
			return $result;
		}
		
		private function searchRecursive($data, $parent, $text) {
			$result = array();
			
			foreach($parent->items() as $item) {
				$id = $item->id();
				
				foreach($this->searchers as $searcher) {
					$match = $searcher->match($data[$searcher->key()], $item, $text);
					if (!$match) continue;
					
					if (in_array($id, $result)) {
						$result[$id]["matches"] = array_merge($match, $result[$id]["matches"]);
					} else {
						$result[$id] = array("itm" => $item, "item" => $item->data(), "matches" => $match);
					}
				}
				if (!$item->isFile()) $result = array_merge($result, $this->searchRecursive($data, $item, $text));
			}
			return $result;
		}
		
		public function setting($setting) {
			return $this->env->settings()->setting($setting);
		}

		public function log() {
			Logging::logDebug("FILESYSTEM: allowed_file_upload_types=".Util::array2str($this->allowedUploadTypes));
		}

		public function __toString() {
			return "FILESYSTEMCONTROLLER";
		}
	 }
	 
	 class FileEvent extends Event {
		const COPY = "copy";
		const RENAME = "rename";
		const MOVE = "move";
		const DELETE = "delete";
		const CREATE_FOLDER = "create_folder";
		const DOWNLOAD = "download";
		const UPLOAD = "upload";
		const VIEW = "view";
		
		private $item;
		private $info;
		
		static function register($eventHandler) {
			$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::COPY, "Copy file");
			$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::RENAME, "Rename file");
			$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::MOVE, "Move file");
			$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::DELETE, "Delete file");
			$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::CREATE_FOLDER, "Create folder");
			$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::DOWNLOAD, "Download file");
			$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::VIEW, "View file");
			$eventHandler->registerEventType(FilesystemController::EVENT_TYPE_FILE, self::UPLOAD, "Upload file");
		}
		
		static function rename($item, $to) {
			return new FileEvent($item, self::RENAME, $to);
		}

		static function copy($item, $to) {
			return new FileEvent($item, self::COPY, $to);
		}

		static function move($item, $to) {
			return new FileEvent($item, self::MOVE, $to);
		}

		static function delete($item) {
			return new FileEvent($item, self::DELETE);
		}

		static function createFolder($folder) {
			return new FileEvent($folder, self::CREATE_FOLDER);
		}

		static function download($item) {
			return new FileEvent($item, self::DOWNLOAD);
		}

		static function upload($item) {
			return new FileEvent($item, self::UPLOAD);
		}
		
		static function view($item) {
			return new FileEvent($item, self::VIEW);
		}
		
		function __construct($item, $type, $info = NULL) {
			parent::__construct(time(), FileSystemController::EVENT_TYPE_FILE, $type);
			$this->item = $item;
			$this->info = $info;
		}

		public function item() {
			return $this->item;
		}

		public function info() {
			return $this->info;
		}
		
		public function itemToStr() {
			return $this->item->internalPath();
		}
				
		public function details() {
			$f = $this->item->id()." (".$this->item->filesystem()->name().")";
			
			if ($this->subType() === self::RENAME or $this->subType() === self::COPY or $this->subType() === self::MOVE)
				return 'item id='.$f.';to='.$this->info->id()." (".$this->info->filesystem()->name().")";
			return 'item id='.$f;
		}
		
		public function values($formatter) {
			$values = parent::values($formatter);
			$values["item_id"] = $this->item->id();
			$values["item_name"] = $this->item->name();
			$values["item_path"] = $this->item->path();
			$values["item_internal_path"] = $this->item->internalPath();
			$values["root_name"] = $this->item->root()->name();

			if ($this->subType() === self::RENAME or $this->subType() === self::COPY or $this->subType() === self::MOVE) {
				$values["to_item_id"] = $this->info->id();
				$values["to_item_name"] = $this->info->name();
				$values["to_item_path"] = $this->info->path();
				$values["to_item_internal_path"] = $this->info->internalPath();
				$values["to_root_name"] = $this->info->root()->name();
			}

			return $values;
		}
		
		public function __toString() {
			return "FILESYSTEMEVENT ".get_class($this);
		}
	}
	
	 class MultiFileEvent extends Event {
		private $items;

		static function download($items) {
			return new MultiFileEvent($items, FileEvent::DOWNLOAD);
		}
		
		function __construct($items, $type) {
			parent::__construct(time(), FileSystemController::EVENT_TYPE_FILE, $type);
			$this->items = $items;
		}

		public function items() {
			return $this->items;
		}

		public function info() {
			return $this->info;
		}
		
		public function itemToStr() {
			$f = "";
			foreach($this->items as $i) {
				$f .= $i->internalPath().",";
			}
			return rtrim($f, ",");
		}
				
		public function details() {
			$f = "";
			foreach($this->items as $i) {
				$f .= $i->id().",";
			}
			return 'item id='.rtrim($f, ",");
		}
		
		public function values($formatter) {
			$values = parent::values($formatter);
			$values["item_id"] = "";
			$values["item_name"] = "";
			$values["item_path"] = "";
			$values["item_internal_path"] = "";
			$values["root_name"] = "";
			
			foreach($this->items as $i) {
				$values["item_id"] .= $i->id().",";
				$values["item_name"] .= $i->name().",";
				$values["item_path"] .= $i->path().",";
			}
			$values["item_id"] = rtrim($values["item_id"], ",");
			$values["item_name"] = rtrim($values["item_name"], ",");
			$values["item_path"] = rtrim($values["item_path"], ",");

			return $values;
		}
		
		public function __toString() {
			return "FILESYSTEMEVENT MULTI ".get_class($this);
		}
	}

?>
