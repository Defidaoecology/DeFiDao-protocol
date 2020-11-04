pragma solidity ^0.5.16;

import "../../../contracts/CErc20Immutable.sol";
import "../../../contracts/EIP20Interface.sol";

contract CTokenCollateral is CErc20Immutable {
    constructor(address underlying_,
                snktrollerInterface snktroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_) public CErc20Immutable(underlying_, snktroller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_, admin_) {
    }

    function getCashOf(address account) public view returns (uint) {
        return EIP20Interface(underlying).balanceOf(account);
    }
}
