<?php

require_once "TestCase.php";

class MollifyTest extends Mollify_TestCase {
    public function testNoSession() {
        $this->assertEqualArrayValues(array("authenticated" => FALSE), $this->processRequest("GET", "session/info"));
    }
}

?>