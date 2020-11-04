pragma solidity ^0.5.16;

import "../../../contracts/CEther.sol";

contract CEtherCertora is CEther {
    constructor(snktrollerInterface snktroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_) public CEther(snktroller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_, admin_) {
    }
}
