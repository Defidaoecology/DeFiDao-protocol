pragma solidity ^0.5.16;

import "../../contracts/snktrollerG3.sol";

contract snktrollerScenarioG3 is snktrollerG3 {
    uint public blockNumber;
    address public snkAddress;

    constructor() snktrollerG3() public {}

    function setsnkAddress(address snkAddress_) public {
        snkAddress = snkAddress_;
    }

    function getsnkAddress() public view returns (address) {
        return snkAddress;
    }

    function membershipLength(CToken cToken) public view returns (uint) {
        return accountAssets[address(cToken)].length;
    }

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;

        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function getsnkMarkets() public view returns (address[] memory) {
        uint m = allMarkets.length;
        uint n = 0;
        for (uint i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].issnked) {
                n++;
            }
        }

        address[] memory snkMarkets = new address[](n);
        uint k = 0;
        for (uint i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].issnked) {
                snkMarkets[k++] = address(allMarkets[i]);
            }
        }
        return snkMarkets;
    }

    function unlist(CToken cToken) public {
        markets[address(cToken)].isListed = false;
    }
}
