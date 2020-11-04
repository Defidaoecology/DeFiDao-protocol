const {
  etherMantissa,
  both
} = require('../Utils/Ethereum');

const {
  makesnktroller,
  makePriceOracle,
  makeCToken,
  makeToken
} = require('../Utils/DeFiDao');

describe('snktroller', () => {
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('constructor', () => {
    it("on success it sets admin to creator and pendingAdmin is unset", async () => {
      const snktroller = await makesnktroller();
      expect(await call(snktroller, 'admin')).toEqual(root);
      expect(await call(snktroller, 'pendingAdmin')).toEqualNumber(0);
    });

    it("on success it sets closeFactor and maxAssets as specified", async () => {
      const snktroller = await makesnktroller();
      expect(await call(snktroller, 'closeFactorMantissa')).toEqualNumber(0.051e18);
      expect(await call(snktroller, 'maxAssets')).toEqualNumber(10);
    });

    it("allows small and large maxAssets", async () => {
      const snktroller = await makesnktroller({maxAssets: 0});
      expect(await call(snktroller, 'maxAssets')).toEqualNumber(0);

      // 5000 is an arbitrary number larger than what we expect to ever actually use
      await send(snktroller, '_setMaxAssets', [5000]);
      expect(await call(snktroller, 'maxAssets')).toEqualNumber(5000);
    });
  });

  describe('_setLiquidationIncentive', () => {
    const initialIncentive = etherMantissa(1.0);
    const validIncentive = etherMantissa(1.1);
    const tooSmallIncentive = etherMantissa(0.99999);
    const tooLargeIncentive = etherMantissa(1.50000001);

    let snktroller;
    beforeEach(async () => {
      snktroller = await makesnktroller();
    });

    it("fails if called by non-admin", async () => {
      const {reply, receipt} = await both(snktroller, '_setLiquidationIncentive', [initialIncentive], {from: accounts[0]});
      expect(reply).toHaveTrollError('UNAUTHORIZED');
      expect(receipt).toHaveTrollFailure('UNAUTHORIZED', 'SET_LIQUIDATION_INCENTIVE_OWNER_CHECK');
      expect(await call(snktroller, 'liquidationIncentiveMantissa')).toEqualNumber(initialIncentive);
    });

    it("fails if incentive is less than min", async () => {
      const {reply, receipt} = await both(snktroller, '_setLiquidationIncentive', [tooSmallIncentive]);
      expect(reply).toHaveTrollError('INVALID_LIQUIDATION_INCENTIVE');
      expect(receipt).toHaveTrollFailure('INVALID_LIQUIDATION_INCENTIVE', 'SET_LIQUIDATION_INCENTIVE_VALIDATION');
      expect(await call(snktroller, 'liquidationIncentiveMantissa')).toEqualNumber(initialIncentive);
    });

    it("fails if incentive is greater than max", async () => {
      const {reply, receipt} = await both(snktroller, '_setLiquidationIncentive', [tooLargeIncentive]);
      expect(reply).toHaveTrollError('INVALID_LIQUIDATION_INCENTIVE');
      expect(receipt).toHaveTrollFailure('INVALID_LIQUIDATION_INCENTIVE', 'SET_LIQUIDATION_INCENTIVE_VALIDATION');
      expect(await call(snktroller, 'liquidationIncentiveMantissa')).toEqualNumber(initialIncentive);
    });

    it("accepts a valid incentive and emits a NewLiquidationIncentive event", async () => {
      const {reply, receipt} = await both(snktroller, '_setLiquidationIncentive', [validIncentive]);
      expect(reply).toHaveTrollError('NO_ERROR');
      expect(receipt).toHaveLog('NewLiquidationIncentive', {
        oldLiquidationIncentiveMantissa: initialIncentive.toString(),
        newLiquidationIncentiveMantissa: validIncentive.toString()
      });
      expect(await call(snktroller, 'liquidationIncentiveMantissa')).toEqualNumber(validIncentive);
    });
  });

  describe('_setPriceOracle', () => {
    let snktroller, oldOracle, newOracle;
    beforeEach(async () => {
      snktroller = await makesnktroller();
      oldOracle = snktroller.priceOracle;
      newOracle = await makePriceOracle();
    });

    it("fails if called by non-admin", async () => {
      expect(
        await send(snktroller, '_setPriceOracle', [newOracle._address], {from: accounts[0]})
      ).toHaveTrollFailure('UNAUTHORIZED', 'SET_PRICE_ORACLE_OWNER_CHECK');
      expect(await snktroller.methods.oracle().call()).toEqual(oldOracle._address);
    });

    it.skip("reverts if passed a contract that doesn't implement isPriceOracle", async () => {
      await expect(send(snktroller, '_setPriceOracle', [snktroller._address])).rejects.toRevert();
      expect(await call(snktroller, 'oracle')).toEqual(oldOracle._address);
    });

    it.skip("reverts if passed a contract that implements isPriceOracle as false", async () => {
      await send(newOracle, 'setIsPriceOracle', [false]); // Note: not yet implemented
      await expect(send(notOracle, '_setPriceOracle', [snktroller._address])).rejects.toRevert("revert oracle method isPriceOracle returned false");
      expect(await call(snktroller, 'oracle')).toEqual(oldOracle._address);
    });

    it("accepts a valid price oracle and emits a NewPriceOracle event", async () => {
      const result = await send(snktroller, '_setPriceOracle', [newOracle._address]);
      expect(result).toSucceed();
      expect(result).toHaveLog('NewPriceOracle', {
        oldPriceOracle: oldOracle._address,
        newPriceOracle: newOracle._address
      });
      expect(await call(snktroller, 'oracle')).toEqual(newOracle._address);
    });
  });

  describe('_setCloseFactor', () => {
    it("fails if not called by admin", async () => {
      const cToken = await makeCToken();
      expect(
        await send(cToken.snktroller, '_setCloseFactor', [1], {from: accounts[0]})
      ).toHaveTrollFailure('UNAUTHORIZED', 'SET_CLOSE_FACTOR_OWNER_CHECK');
    });

    it("fails if close factor too low", async () => {
      const cToken = await makeCToken();
      expect(await send(cToken.snktroller, '_setCloseFactor', [1])).toHaveTrollFailure('INVALID_CLOSE_FACTOR', 'SET_CLOSE_FACTOR_VALIDATION');
    });

    it("fails if close factor too low", async () => {
      const cToken = await makeCToken();
      expect(await send(cToken.snktroller, '_setCloseFactor', [etherMantissa(1e18)])).toHaveTrollFailure('INVALID_CLOSE_FACTOR', 'SET_CLOSE_FACTOR_VALIDATION');
    });
  });

  describe('_setCollateralFactor', () => {
    const half = etherMantissa(0.5);
    const one = etherMantissa(1);

    it("fails if not called by admin", async () => {
      const cToken = await makeCToken();
      expect(
        await send(cToken.snktroller, '_setCollateralFactor', [cToken._address, half], {from: accounts[0]})
      ).toHaveTrollFailure('UNAUTHORIZED', 'SET_COLLATERAL_FACTOR_OWNER_CHECK');
    });

    it("fails if asset is not listed", async () => {
      const cToken = await makeCToken();
      expect(
        await send(cToken.snktroller, '_setCollateralFactor', [cToken._address, half])
      ).toHaveTrollFailure('MARKET_NOT_LISTED', 'SET_COLLATERAL_FACTOR_NO_EXISTS');
    });

    it("fails if factor is too high", async () => {
      const cToken = await makeCToken({supportMarket: true});
      expect(
        await send(cToken.snktroller, '_setCollateralFactor', [cToken._address, one])
      ).toHaveTrollFailure('INVALID_COLLATERAL_FACTOR', 'SET_COLLATERAL_FACTOR_VALIDATION');
    });

    it("fails if factor is set without an underlying price", async () => {
      const cToken = await makeCToken({supportMarket: true});
      expect(
        await send(cToken.snktroller, '_setCollateralFactor', [cToken._address, half])
      ).toHaveTrollFailure('PRICE_ERROR', 'SET_COLLATERAL_FACTOR_WITHOUT_PRICE');
    });

    it("succeeds and sets market", async () => {
      const cToken = await makeCToken({supportMarket: true, underlyingPrice: 1});
      const result = await send(cToken.snktroller, '_setCollateralFactor', [cToken._address, half]);
      expect(result).toHaveLog('NewCollateralFactor', {
        cToken: cToken._address,
        oldCollateralFactorMantissa: '0',
        newCollateralFactorMantissa: half.toString()
      });
    });
  });

  describe('_supportMarket', () => {
    it("fails if not called by admin", async () => {
      const cToken = await makeCToken(root);
      expect(
        await send(cToken.snktroller, '_supportMarket', [cToken._address], {from: accounts[0]})
      ).toHaveTrollFailure('UNAUTHORIZED', 'SUPPORT_MARKET_OWNER_CHECK');
    });

    it("fails if asset is not a CToken", async () => {
      const snktroller = await makesnktroller()
      const asset = await makeToken(root);
      await expect(send(snktroller, '_supportMarket', [asset._address])).rejects.toRevert();
    });

    it("succeeds and sets market", async () => {
      const cToken = await makeCToken();
      const result = await send(cToken.snktroller, '_supportMarket', [cToken._address]);
      expect(result).toHaveLog('MarketListed', {cToken: cToken._address});
    });

    it("cannot list a market a second time", async () => {
      const cToken = await makeCToken();
      const result1 = await send(cToken.snktroller, '_supportMarket', [cToken._address]);
      const result2 = await send(cToken.snktroller, '_supportMarket', [cToken._address]);
      expect(result1).toHaveLog('MarketListed', {cToken: cToken._address});
      expect(result2).toHaveTrollFailure('MARKET_ALREADY_LISTED', 'SUPPORT_MARKET_EXISTS');
    });

    it("can list two different markets", async () => {
      const cToken1 = await makeCToken();
      const cToken2 = await makeCToken({snktroller: cToken1.snktroller});
      const result1 = await send(cToken1.snktroller, '_supportMarket', [cToken1._address]);
      const result2 = await send(cToken1.snktroller, '_supportMarket', [cToken2._address]);
      expect(result1).toHaveLog('MarketListed', {cToken: cToken1._address});
      expect(result2).toHaveLog('MarketListed', {cToken: cToken2._address});
    });
  });

  describe('redeemVerify', () => {
    it('should allow you to redeem 0 underlying for 0 tokens', async () => {
      const snktroller = await makesnktroller();
      const cToken = await makeCToken({snktroller: snktroller});
      await call(snktroller, 'redeemVerify', [cToken._address, accounts[0], 0, 0]);
    });

    it('should allow you to redeem 5 underlyig for 5 tokens', async () => {
      const snktroller = await makesnktroller();
      const cToken = await makeCToken({snktroller: snktroller});
      await call(snktroller, 'redeemVerify', [cToken._address, accounts[0], 5, 5]);
    });

    it('should not allow you to redeem 5 underlying for 0 tokens', async () => {
      const snktroller = await makesnktroller();
      const cToken = await makeCToken({snktroller: snktroller});
      await expect(call(snktroller, 'redeemVerify', [cToken._address, accounts[0], 5, 0])).rejects.toRevert("revert redeemTokens zero");
    });
  })
});
