pragma solidity ^0.5.16;

import "./CErc20Delegate.sol";

interface snkLike {
  function delegate(address delegatee) external;
}

/**
 * @title DeFiDao's CsnkLikeDelegate Contract
 * @notice CTokens which can 'delegate votes' of their underlying ERC-20
 * @author DeFiDao
 */
contract CsnkLikeDelegate is CErc20Delegate {
  /**
   * @notice Construct an empty delegate
   */
  constructor() public CErc20Delegate() {}

  /**
   * @notice Admin call to delegate the votes of the snk-like underlying
   * @param snkLikeDelegatee The address to delegate votes to
   */
  function _delegatesnkLikeTo(address snkLikeDelegatee) external {
    require(msg.sender == admin, "only the admin may set the snk-like delegate");
    snkLike(underlying).delegate(snkLikeDelegatee);
  }
}
