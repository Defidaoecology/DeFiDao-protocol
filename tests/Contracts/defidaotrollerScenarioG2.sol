pragma solidity ^0.5.16;

import "../../contracts/snktrollerG2.sol";

contract snktrollerScenarioG2 is snktrollerG2 {
    uint public blockNumber;

    constructor() snktrollerG2() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }
}
