const { address, etherMantissa } = require('../Utils/Ethereum');

const { makesnktroller, makeCToken, makePriceOracle } = require('../Utils/DeFiDao');

describe('snktrollerV1', function() {
  let root, accounts;
  let unitroller;
  let brains;
  let oracle;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    oracle = await makePriceOracle();
    brains = await deploy('snktrollerG1');
    unitroller = await deploy('Unitroller');
  });

  let initializeBrains = async (priceOracle, closeFactor, maxAssets) => {
    await send(unitroller, '_setPendingImplementation', [brains._address]);
    await send(brains, '_become', [unitroller._address, priceOracle._address, closeFactor, maxAssets, false]);
    return await saddle.getContractAt('snktrollerG1', unitroller._address);
  };

  let reinitializeBrains = async () => {
    await send(unitroller, '_setPendingImplementation', [brains._address]);
    await send(brains, '_become', [unitroller._address, address(0), 0, 0, true]);
    return await saddle.getContractAt('snktrollerG1', unitroller._address);
  };

  describe('delegating to snktroller v1', () => {
    const closeFactor = etherMantissa(0.051);
    const maxAssets = 10;
    let unitrollerAssnktroller, cToken;

    beforeEach(async () => {
      unitrollerAssnktroller = await initializeBrains(oracle, etherMantissa(0.06), 30);
      cToken = await makeCToken({ snktroller: unitrollerAssnktroller });
    });

    describe('becoming brains sets initial state', () => {
      it('reverts if this is not the pending implementation', async () => {
        await expect(
          send(brains, '_become', [unitroller._address, oracle._address, 0, 10, false])
        ).rejects.toRevert('revert change not authorized');
      });

      it('on success it sets admin to caller of constructor', async () => {
        expect(await call(unitrollerAssnktroller, 'admin')).toEqual(root);
        expect(await call(unitrollerAssnktroller, 'pendingAdmin')).toBeAddressZero();
      });

      it('on success it sets closeFactor and maxAssets as specified', async () => {
        const snktroller = await initializeBrains(oracle, closeFactor, maxAssets);
        expect(await call(snktroller, 'closeFactorMantissa')).toEqualNumber(closeFactor);
        expect(await call(snktroller, 'maxAssets')).toEqualNumber(maxAssets);
      });

      it("on reinitialization success, it doesn't set closeFactor or maxAssets", async () => {
        let snktroller = await initializeBrains(oracle, closeFactor, maxAssets);
        expect(await call(unitroller, 'snktrollerImplementation')).toEqual(brains._address);
        expect(await call(snktroller, 'closeFactorMantissa')).toEqualNumber(closeFactor);
        expect(await call(snktroller, 'maxAssets')).toEqualNumber(maxAssets);

        // Create new brains
        brains = await deploy('snktrollerG1');
        snktroller = await reinitializeBrains();

        expect(await call(unitroller, 'snktrollerImplementation')).toEqual(brains._address);
        expect(await call(snktroller, 'closeFactorMantissa')).toEqualNumber(closeFactor);
        expect(await call(snktroller, 'maxAssets')).toEqualNumber(maxAssets);
      });

      it('reverts on invalid closeFactor', async () => {
        await send(unitroller, '_setPendingImplementation', [brains._address]);
        await expect(
          send(brains, '_become', [unitroller._address, oracle._address, 0, maxAssets, false])
        ).rejects.toRevert('revert set close factor error');
      });

      it('allows 0 maxAssets', async () => {
        const snktroller = await initializeBrains(oracle, closeFactor, 0);
        expect(await call(snktroller, 'maxAssets')).toEqualNumber(0);
      });

      it('allows 5000 maxAssets', async () => {
        // 5000 is an arbitrary number larger than what we expect to ever actually use
        const snktroller = await initializeBrains(oracle, closeFactor, 5000);
        expect(await call(snktroller, 'maxAssets')).toEqualNumber(5000);
      });
    });

    describe('_setCollateralFactor', () => {
      const half = etherMantissa(0.5),
        one = etherMantissa(1);

      it('fails if not called by admin', async () => {
        expect(
          await send(unitrollerAssnktroller, '_setCollateralFactor', [cToken._address, half], {
            from: accounts[1]
          })
        ).toHaveTrollFailure('UNAUTHORIZED', 'SET_COLLATERAL_FACTOR_OWNER_CHECK');
      });

      it('fails if asset is not listed', async () => {
        expect(
          await send(unitrollerAssnktroller, '_setCollateralFactor', [cToken._address, half])
        ).toHaveTrollFailure('MARKET_NOT_LISTED', 'SET_COLLATERAL_FACTOR_NO_EXISTS');
      });

      it('fails if factor is too high', async () => {
        const cToken = await makeCToken({ supportMarket: true, snktroller: unitrollerAssnktroller });
        expect(
          await send(unitrollerAssnktroller, '_setCollateralFactor', [cToken._address, one])
        ).toHaveTrollFailure('INVALID_COLLATERAL_FACTOR', 'SET_COLLATERAL_FACTOR_VALIDATION');
      });

      it('fails if factor is set without an underlying price', async () => {
        const cToken = await makeCToken({ supportMarket: true, snktroller: unitrollerAssnktroller });
        expect(
          await send(unitrollerAssnktroller, '_setCollateralFactor', [cToken._address, half])
        ).toHaveTrollFailure('PRICE_ERROR', 'SET_COLLATERAL_FACTOR_WITHOUT_PRICE');
      });

      it('succeeds and sets market', async () => {
        const cToken = await makeCToken({ supportMarket: true, snktroller: unitrollerAssnktroller });
        await send(oracle, 'setUnderlyingPrice', [cToken._address, 1]);
        expect(
          await send(unitrollerAssnktroller, '_setCollateralFactor', [cToken._address, half])
        ).toHaveLog('NewCollateralFactor', {
          cToken: cToken._address,
          oldCollateralFactorMantissa: '0',
          newCollateralFactorMantissa: half.toString()
        });
      });
    });

    describe('_supportMarket', () => {
      it('fails if not called by admin', async () => {
        expect(
          await send(unitrollerAssnktroller, '_supportMarket', [cToken._address], { from: accounts[1] })
        ).toHaveTrollFailure('UNAUTHORIZED', 'SUPPORT_MARKET_OWNER_CHECK');
      });

      it('fails if asset is not a CToken', async () => {
        const notACToken = await makePriceOracle();
        await expect(send(unitrollerAssnktroller, '_supportMarket', [notACToken._address])).rejects.toRevert();
      });

      it('succeeds and sets market', async () => {
        const result = await send(unitrollerAssnktroller, '_supportMarket', [cToken._address]);
        expect(result).toHaveLog('MarketListed', { cToken: cToken._address });
      });

      it('cannot list a market a second time', async () => {
        const result1 = await send(unitrollerAssnktroller, '_supportMarket', [cToken._address]);
        const result2 = await send(unitrollerAssnktroller, '_supportMarket', [cToken._address]);
        expect(result1).toHaveLog('MarketListed', { cToken: cToken._address });
        expect(result2).toHaveTrollFailure('MARKET_ALREADY_LISTED', 'SUPPORT_MARKET_EXISTS');
      });

      it('can list two different markets', async () => {
        const cToken1 = await makeCToken({ snktroller: unitroller });
        const cToken2 = await makeCToken({ snktroller: unitroller });
        const result1 = await send(unitrollerAssnktroller, '_supportMarket', [cToken1._address]);
        const result2 = await send(unitrollerAssnktroller, '_supportMarket', [cToken2._address]);
        expect(result1).toHaveLog('MarketListed', { cToken: cToken1._address });
        expect(result2).toHaveLog('MarketListed', { cToken: cToken2._address });
      });
    });
  });
});
