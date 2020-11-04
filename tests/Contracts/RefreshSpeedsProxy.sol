pragma solidity ^0.5.16;

interface Isnktroller {
	function refreshsnkSpeeds() external;
}

contract RefreshSpeedsProxy {
	constructor(address snktroller) public {
		Isnktroller(snktroller).refreshsnkSpeeds();
	}
}
