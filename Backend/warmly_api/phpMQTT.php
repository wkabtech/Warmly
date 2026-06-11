<?php
/*
    phpMQTT
    A simple php class to connect/publish/subscribe to a MQTT broker

    Requires: PHP >= 5.3 with sockets support
*/

class phpMQTT {
    private $socket;
    private $msgid = 1;
    private $keepalive;
    private $username;
    private $password;
    private $clientid;
    private $will;
    private $host;
    private $port;
    private $cafile;
    private $debug = false;

    function __construct($host, $port, $clientid) {
        $this->host = $host;
        $this->port = $port;
        $this->clientid = $clientid;
        $this->keepalive = 60;
    }

    function connect($clean = true, $will = null, $username = null, $password = null) {
        $this->will = $will;
        $this->username = $username;
        $this->password = $password;

        $this->socket = fsockopen($this->host, $this->port, $errno, $errstr, 60);
        if (!$this->socket) {
            if ($this->debug) echo "Error: $errno - $errstr<br />\n";
            return false;
        }

        $i = 0;
        $buffer = "";

        $buffer .= chr(0); // Protocol Name Length MSB
        $buffer .= chr(4); // Protocol Name Length LSB
        $buffer .= "MQTT"; // Protocol Name
        $buffer .= chr(4); // Protocol Level

        $var = 0;
        $var += $clean ? 2 : 0;
        $var += ($this->will ? 4 + 8 : 0);
        $var += ($this->username ? 128 : 0);
        $var += ($this->password ? 64 : 0);

        $buffer .= chr($var);
        $buffer .= chr($this->keepalive >> 8);   // Keep Alive MSB
        $buffer .= chr($this->keepalive % 256); // Keep Alive LSB

        $buffer .= $this->strwritestring($this->clientid);

        if ($this->will) {
            $buffer .= $this->strwritestring($this->will['topic']);
            $buffer .= $this->strwritestring($this->will['content']);
        }

        if ($this->username) $buffer .= $this->strwritestring($this->username);
        if ($this->password) $buffer .= $this->strwritestring($this->password);

        $head = " ";
        $head[0] = chr(0x10);
        $head .= $this->setmsglength(strlen($buffer));

        fwrite($this->socket, $head . $buffer);

        $string = $this->read(4);
        if (ord($string[0]) >> 4 == 2 && ord($string[3]) == 0) {
            return true;
        }

        return false;
    }

    function publish($topic, $content, $qos = 0, $retain = 0) {
        $buffer = $this->strwritestring($topic);

        if ($qos) {
            $buffer .= chr($this->msgid >> 8);
            $buffer .= chr($this->msgid % 256);
            $this->msgid++;
        }

        $buffer .= $content;

        $cmd = 0x30;
        if ($qos) $cmd |= 0x02;
        if ($retain) $cmd |= 0x01;

        $head = chr($cmd) . $this->setmsglength(strlen($buffer));
        fwrite($this->socket, $head . $buffer);
    }

    function close() {
        $head = chr(0xe0) . chr(0x00);
        fwrite($this->socket, $head);
        fclose($this->socket);
    }

    private function setmsglength($len) {
        $string = "";

        do {
            $digit = $len % 128;
            $len = (int)($len / 128);
            if ($len > 0) $digit = $digit | 0x80;
            $string .= chr($digit);
        } while ($len > 0);

        return $string;
    }

    private function strwritestring($str) {
        $string = chr(strlen($str) >> 8);
        $string .= chr(strlen($str) % 256);
        $string .= $str;
        return $string;
    }

    private function read($int = 8192) {
        $string = fread($this->socket, $int);
        return $string;
    }
}
