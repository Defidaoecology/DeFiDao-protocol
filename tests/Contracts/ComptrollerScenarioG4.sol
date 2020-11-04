pragma solidity ^0.5.16;

import "../../contracts/snktrollerG4.sol";

contract snktrollerScenarioG4 is snktrollerG4 {
    uint public blockNumber;

    constructor() snktrollerG4() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function membershipLength(CToken cToken) public view returns (uint) {
        return accountAssets[address(cToken)].length;
    }

    function unlist(CToken cToken) public {
        markets[address(cToken)].isListed = false;
    }
}
