<?php
	// DON'T MODIFY THIS FILE
	set_include_path('lib/'.PATH_SEPARATOR.$MOLLIFY_BACKEND_ROOT.PATH_SEPARATOR.get_include_path());
	
	require_once("configuration.php");
	require_once("include/Logging.class.php");
	require_once("include/Util.class.php");
		
	global $CONFIGURATION;
	Logging::initialize($CONFIGURATION);

	require_once("include/MollifyBackend.class.php");
	require_once("include/configuration/ConfigurationDao.class.php");
	require_once("include/Settings.class.php");
	require_once("include/Request.class.php");
	require_once("Sabre.includes.php");
	
	class VoidResponseHandler {
		public function addListener($l) {}
	}
	
	class TemporarySession extends Session {
		public function __construct() {
			parent::__construct(FALSE);	// don't use cookies
		}
		
		protected function getDao() {
			return $this;
		}
		
		// override session DAO persistence functions ->

		public function getSession($id, $lastValid = NULL) {
			return NULL;
		}
		
		public function getSessionData($id) {
			return array();
		}
		
		public function addSession($id, $userId, $ip, $time) {}

		public function addSessionData($id, $data) {}

		public function addOrSetSessionData($id, $name, $value) {}
		
		public function removeSession($id) {}
		
		public function updateSessionTime($id, $time) {}
		
		public function removeAllSessionBefore($time) {}
	}
	
	class Mollify_DAV_Request {
		public function ip() { return $_SERVER['REMOTE_ADDR']; }
		
		public function getSessionId() { return NULL; }
		
		public function hasData($k) { return FALSE; }
		
		public function log() {}
	}
	
	function checkUploadSize() {
		global $MAX_FILE_SIZE;
		if (!isset($_SERVER['CONTENT_LENGTH']) or !isset($MAX_FILE_SIZE)) return;
		
		$size = $_SERVER['CONTENT_LENGTH'];
		if ($size > Util::inBytes($MAX_FILE_SIZE))
			throw new Sabre_DAV_Exception_Forbidden();
	}
	
	class Mollify_DAV_Root extends Sabre_DAV_Directory {
		private $controller;
		private $roots;
		
		function __construct($controller) {
			$this->controller = $controller;
			$this->roots = $this->controller->getRootFolders();
 		}
 		
		function getChildren() {
			$children = array();
			foreach($this->roots as $root)
				$children[] = new Mollify_DAV_Folder($this->controller, $root);
			return $children;
		}
		
		function getName() {
			return "Mollify";
		}
	}
	
	class Mollify_DAV_Folder extends Sabre_DAV_Directory {
		private $controller;
		private $folder;

		function __construct($controller, $folder) {
			$this->controller = $controller;
			$this->folder = $folder;
 		}
 		
		public function getChildren() {
			$children = array();
			foreach($this->controller->items($this->folder) as $i)
				$children[] = $this->createItem($i);
			return $children;
		}
		
		private function createItem($item) {
			if ($item->isFile()) return new Mollify_DAV_File($this->controller, $item);
			return new Mollify_DAV_Folder($this->controller, $item);
		}

		public function createFile($name, $data = null) {
			$file = $this->folder->createFile($name);
			if ($data != NULL) {
				checkUploadSize();
				$this->controller->updateFileContents($file, $data);
			}
			return $file;
		}

		public function createDirectory($name) {
			return $this->controller->createFolder($this->folder, $name);
		}

		public function delete() {
			$this->controller->delete($this->folder);
		}

		public function getName() {
			return $this->folder->name();
		}
		
		public function setName($name) {
			$this->controller->rename($this->folder, $name);
		}
		
		public function getLastModified() {
			return $this->folder->lastModified();
		}
	}

	class Mollify_DAV_File extends Sabre_DAV_File {
		private $controller;
		private $file;

		function __construct($controller, $file) {
			$this->controller = $controller;
			$this->file = $file;
		}

		public function getName() {
			return $this->file->name();
		}
		
		public function setName($name) {
			$this->controller->rename($this->file, $name);
		}

		public function get() {
			return $this->controller->read($this->file);
		}
		
		public function put($data) {
			if ($data != NULL) checkUploadSize();
			$this->controller->updateFileContents($this->file, $data);
		}
		
		public function delete() {
			$this->controller->delete($this->file);
		}

		public function getSize() {
			return $this->file->size();
		}
		
		public function getLastModified() {
			return $this->file->lastModified();
		}
		
		public function getETag() {
			return null;
		}
	}
	
	try {
		$settings = new Settings($CONFIGURATION);
		$db = getDB($settings);
		$conf = new ConfigurationDao($db);
		
		$env = new ServiceEnvironment($db, new TemporarySession(), new VoidResponseHandler(), $conf, $settings);
		$env->plugins()->setup();
		
		$env->initialize(new Mollify_DAV_Request());
		
		if (isset($BASIC_AUTH) and $BASIC_AUTH == TRUE) {
			$auth = new Sabre_HTTP_BasicAuth();
			$result = $auth->getUserPass();
		
			if (!$result) {
				Logging::logDebug("DAV authentication missing");
				$auth->requireLogin();
				echo "Authentication required\n";
				die();
			}
			
			$user = $env->configuration()->getUserByNameOrEmail($result[0]);
			if (!$user) {
				Logging::logDebug("DAV authentication failure");
				$auth->requireLogin();
				echo "Authentication required\n";
				die();
			}
			
			$userAuth = $env->configuration()->getUserAuth($user["id"]);
			if (!$env->passwordHash()->isEqual($result[1], $userAuth["hash"], $userAuth["salt"])) {
				Logging::logDebug("DAV authentication failure");
				$auth->requireLogin();
				echo "Authentication required\n";
				die();
			}
			$env->authentication()->setAuth($user, "pw");
		} else {
			$auth = new Sabre_HTTP_DigestAuth();
			$auth->setRealm($env->authentication()->realm());
			$auth->init();
			$username = $auth->getUserName();
			
			if (!$username) {
				Logging::logDebug("DAV digest authentication missing");
				$auth->requireLogin();
				echo "Authentication required\n";
				die();
			}
			
			$user = $env->configuration()->getUserByNameOrEmail($username);
			if (!$user) {
				Logging::logDebug("DAV digest authentication failure");
				$auth->requireLogin();
				echo "Authentication required\n";
				die();
			}
			
			$userAuth = $env->configuration()->getUserAuth($user["id"]);			
			if (!$auth->validateA1($userAuth["a1hash"])) {
				Logging::logDebug("DAV digest authentication failure");
				$auth->requireLogin();
				echo "Authentication required\n";
				die();
			}
			$env->authentication()->setAuth($user, "pw");
		}

		$dav = new Sabre_DAV_Server(new Mollify_DAV_Root($env->filesystem()));
		$dav->setBaseUri($BASE_URI);
		if ($ENABLE_LOCKING) $dav->addPlugin(new Sabre_DAV_Locks_Plugin(new Sabre_DAV_Locks_Backend_FS('data')));
		if ($ENABLE_BROWSER) $dav->addPlugin(new Sabre_DAV_Browser_Plugin());
		if ($ENABLE_TEMPORARY_FILE_FILTER) $dav->addPlugin(new Sabre_DAV_TemporaryFileFilterPlugin('temp'));
		$dav->addPlugin(new Sabre_DAV_Mount_Plugin());
		$dav->exec();
	} catch (Exception $e) {
		Logging::logException($e);
		throw new Sabre_DAV_Exception_BadRequest();
	}
	
	function getDB($settings) {
		require_once("db/DBConnectionFactory.class.php");
		$f = new DBConnectionFactory();
		return $f->createConnection($settings);
	}
?>