const {
  makesnktroller,
  makeCToken,
  balanceOf,
  fastForward,
  pretendBorrow,
  quickMint
} = require('../Utils/DeFiDao');
const {
  etherExp,
  etherDouble,
  etherUnsigned,
  etherMantissa
} = require('../Utils/Ethereum');

const snkRate = etherUnsigned(1e18);

async function snkAccrued(snktroller, user) {
  return etherUnsigned(await call(snktroller, 'snkAccrued', [user]));
}

async function snkBalance(snktroller, user) {
  return etherUnsigned(await call(snktroller.snk, 'balanceOf', [user]))
}

async function totalsnkAccrued(snktroller, user) {
  return (await snkAccrued(snktroller, user)).plus(await snkBalance(snktroller, user));
}

describe('Flywheel upgrade', () => {
  describe('becomes the snktroller', () => {
    it('adds the snk markets', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makesnktroller({kind: 'unitroller-g2'});
      let snkMarkets = await Promise.all([1, 2, 3].map(async _ => {
        return makeCToken({snktroller: unitroller, supportMarket: true});
      }));
      snkMarkets = snkMarkets.map(c => c._address);
      unitroller = await makesnktroller({kind: 'unitroller-g3', unitroller, snkMarkets});
      expect(await call(unitroller, 'getsnkMarkets')).toEqual(snkMarkets);
    });

    it('adds the other markets', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makesnktroller({kind: 'unitroller-g2'});
      let allMarkets = await Promise.all([1, 2, 3].map(async _ => {
        return makeCToken({snktroller: unitroller, supportMarket: true});
      }));
      allMarkets = allMarkets.map(c => c._address);
      unitroller = await makesnktroller({
        kind: 'unitroller-g3',
        unitroller,
        snkMarkets: allMarkets.slice(0, 1),
        otherMarkets: allMarkets.slice(1)
      });
      expect(await call(unitroller, 'getAllMarkets')).toEqual(allMarkets);
      expect(await call(unitroller, 'getsnkMarkets')).toEqual(allMarkets.slice(0, 1));
    });

    it('_supportMarket() adds to all markets, and only once', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makesnktroller({kind: 'unitroller-g3'});
      let allMarkets = [];
      for (let _ of Array(10)) {
        allMarkets.push(await makeCToken({snktroller: unitroller, supportMarket: true}));
      }
      expect(await call(unitroller, 'getAllMarkets')).toEqual(allMarkets.map(c => c._address));
      expect(
        makesnktroller({
          kind: 'unitroller-g3',
          unitroller,
          otherMarkets: [allMarkets[0]._address]
        })
      ).rejects.toRevert('revert market already added');
    });
  });
});

describe('Flywheel', () => {
  let root, a1, a2, a3, accounts;
  let snktroller, cLOW, cREP, cZRX, cEVIL;
  beforeEach(async () => {
    let interestRateModelOpts = {borrowRate: 0.000001};
    [root, a1, a2, a3, ...accounts] = saddle.accounts;
    snktroller = await makesnktroller();
    cLOW = await makeCToken({snktroller, supportMarket: true, underlyingPrice: 1, interestRateModelOpts});
    cREP = await makeCToken({snktroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
    cZRX = await makeCToken({snktroller, supportMarket: true, underlyingPrice: 3, interestRateModelOpts});
    cEVIL = await makeCToken({snktroller, supportMarket: false, underlyingPrice: 3, interestRateModelOpts});
    await send(snktroller, '_addsnkMarkets', [[cLOW, cREP, cZRX].map(c => c._address)]);
  });

  describe('getsnkMarkets()', () => {
    it('should return the snk markets', async () => {
      expect(await call(snktroller, 'getsnkMarkets')).toEqual(
        [cLOW, cREP, cZRX].map((c) => c._address)
      );
    });
  });

  describe('updatesnkBorrowIndex()', () => {
    it('should calculate snk borrower index correctly', async () => {
      const mkt = cREP;
      await send(snktroller, 'setBlockNumber', [100]);
      await send(mkt, 'harnessSetTotalBorrows', [etherUnsigned(11e18)]);
      await send(snktroller, 'setsnkSpeed', [mkt._address, etherExp(0.5)]);
      await send(snktroller, 'harnessUpdatesnkBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);
      /*
        100 blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed

        borrowAmt   = totalBorrows * 1e18 / borrowIdx
                    = 11e18 * 1e18 / 1.1e18 = 10e18
        snkAccrued = deltaBlocks * borrowSpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += 1e36 + snkAccrued * 1e36 / borrowAmt
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
      */

      const {index, block} = await call(snktroller, 'snkBorrowState', [mkt._address]);
      expect(index).toEqualNumber(6e36);
      expect(block).toEqualNumber(100);
    });

    it('should not revert or update snkBorrowState index if cToken not in snk markets', async () => {
      const mkt = await makeCToken({
        snktroller: snktroller,
        supportMarket: true,
        addsnkMarket: false,
      });
      await send(snktroller, 'setBlockNumber', [100]);
      await send(snktroller, 'harnessUpdatesnkBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(snktroller, 'snkBorrowState', [mkt._address]);
      expect(index).toEqualNumber(0);
      expect(block).toEqualNumber(100);
      const speed = await call(snktroller, 'snkSpeeds', [mkt._address]);
      expect(speed).toEqualNumber(0);
    });

    it('should not update index if no blocks passed since last accrual', async () => {
      const mkt = cREP;
      await send(snktroller, 'setsnkSpeed', [mkt._address, etherExp(0.5)]);
      await send(snktroller, 'harnessUpdatesnkBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(snktroller, 'snkBorrowState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(0);
    });

    it('should not update index if snk speed is 0', async () => {
      const mkt = cREP;
      await send(snktroller, 'setsnkSpeed', [mkt._address, etherExp(0)]);
      await send(snktroller, 'setBlockNumber', [100]);
      await send(snktroller, 'harnessUpdatesnkBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(snktroller, 'snkBorrowState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(100);
    });
  });

  describe('updatesnkSupplyIndex()', () => {
    it('should calculate snk supplier index correctly', async () => {
      const mkt = cREP;
      await send(snktroller, 'setBlockNumber', [100]);
      await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);
      await send(snktroller, 'setsnkSpeed', [mkt._address, etherExp(0.5)]);
      await send(snktroller, 'harnessUpdatesnkSupplyIndex', [mkt._address]);
      /*
        suppyTokens = 10e18
        snkAccrued = deltaBlocks * supplySpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += snkAccrued * 1e36 / supplyTokens
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
      */
      const {index, block} = await call(snktroller, 'snkSupplyState', [mkt._address]);
      expect(index).toEqualNumber(6e36);
      expect(block).toEqualNumber(100);
    });

    it('should not update index on non-snk markets', async () => {
      const mkt = await makeCToken({
        snktroller: snktroller,
        supportMarket: true,
        addsnkMarket: false
      });
      await send(snktroller, 'setBlockNumber', [100]);
      await send(snktroller, 'harnessUpdatesnkSupplyIndex', [
        mkt._address
      ]);

      const {index, block} = await call(snktroller, 'snkSupplyState', [mkt._address]);
      expect(index).toEqualNumber(0);
      expect(block).toEqualNumber(100);
      const speed = await call(snktroller, 'snkSpeeds', [mkt._address]);
      expect(speed).toEqualNumber(0);
      // ctoken could have no snk speed or snk supplier state if not in snk markets
      // this logic could also possibly be implemented in the allowed hook
    });

    it('should not update index if no blocks passed since last accrual', async () => {
      const mkt = cREP;
      await send(snktroller, 'setBlockNumber', [0]);
      await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);
      await send(snktroller, 'setsnkSpeed', [mkt._address, etherExp(0.5)]);
      await send(snktroller, 'harnessUpdatesnkSupplyIndex', [mkt._address]);

      const {index, block} = await call(snktroller, 'snkSupplyState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(0);
    });

    it('should not matter if the index is updated multiple times', async () => {
      const snkRemaining = snkRate.multipliedBy(100)
      await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await send(snktroller, 'refreshsnkSpeeds');

      await quickMint(cLOW, a2, etherUnsigned(10e18));
      await quickMint(cLOW, a3, etherUnsigned(15e18));

      const a2Accrued0 = await totalsnkAccrued(snktroller, a2);
      const a3Accrued0 = await totalsnkAccrued(snktroller, a3);
      const a2Balance0 = await balanceOf(cLOW, a2);
      const a3Balance0 = await balanceOf(cLOW, a3);

      await fastForward(snktroller, 20);

      const txT1 = await send(cLOW, 'transfer', [a2, a3Balance0.minus(a2Balance0)], {from: a3});

      const a2Accrued1 = await totalsnkAccrued(snktroller, a2);
      const a3Accrued1 = await totalsnkAccrued(snktroller, a3);
      const a2Balance1 = await balanceOf(cLOW, a2);
      const a3Balance1 = await balanceOf(cLOW, a3);

      await fastForward(snktroller, 10);
      await send(snktroller, 'harnessUpdatesnkSupplyIndex', [cLOW._address]);
      await fastForward(snktroller, 10);

      const txT2 = await send(cLOW, 'transfer', [a3, a2Balance1.minus(a3Balance1)], {from: a2});

      const a2Accrued2 = await totalsnkAccrued(snktroller, a2);
      const a3Accrued2 = await totalsnkAccrued(snktroller, a3);

      expect(a2Accrued0).toEqualNumber(0);
      expect(a3Accrued0).toEqualNumber(0);
      expect(a2Accrued1).not.toEqualNumber(0);
      expect(a3Accrued1).not.toEqualNumber(0);
      expect(a2Accrued1).toEqualNumber(a3Accrued2.minus(a3Accrued1));
      expect(a3Accrued1).toEqualNumber(a2Accrued2.minus(a2Accrued1));

      expect(txT1.gasUsed).toBeLessThan(200000);
      expect(txT1.gasUsed).toBeGreaterThan(150000);
      expect(txT2.gasUsed).toBeLessThan(200000);
      expect(txT2.gasUsed).toBeGreaterThan(150000);
    });
  });

  describe('distributeBorrowersnk()', () => {

    it('should update borrow index checkpoint but not snkAccrued for first time user', async () => {
      const mkt = cREP;
      await send(snktroller, "setsnkBorrowState", [mkt._address, etherDouble(6), 10]);
      await send(snktroller, "setsnkBorrowerIndex", [mkt._address, root, etherUnsigned(0)]);

      await send(snktroller, "harnessDistributeBorrowersnk", [mkt._address, root, etherExp(1.1)]);
      expect(await call(snktroller, "snkAccrued", [root])).toEqualNumber(0);
      expect(await call(snktroller, "snkBorrowerIndex", [ mkt._address, root])).toEqualNumber(6e36);
    });

    it('should transfer snk and update borrow index checkpoint correctly for repeat time user', async () => {
      const mkt = cREP;
      await send(snktroller.snk, 'transfer', [snktroller._address, etherUnsigned(50e18)], {from: root});
      await send(mkt, "harnessSetAccountBorrows", [a1, etherUnsigned(5.5e18), etherExp(1)]);
      await send(snktroller, "setsnkBorrowState", [mkt._address, etherDouble(6), 10]);
      await send(snktroller, "setsnkBorrowerIndex", [mkt._address, a1, etherDouble(1)]);

      /*
      * 100 delta blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed => 6e18 snkBorrowIndex
      * this tests that an acct with half the total borrows over that time gets 25e18 snk
        borrowerAmount = borrowBalance * 1e18 / borrow idx
                       = 5.5e18 * 1e18 / 1.1e18 = 5e18
        deltaIndex     = marketStoredIndex - userStoredIndex
                       = 6e36 - 1e36 = 5e36
        borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                       = 5e18 * 5e36 / 1e36 = 25e18
      */
      const tx = await send(snktroller, "harnessDistributeBorrowersnk", [mkt._address, a1, etherUnsigned(1.1e18)]);
      expect(await snkAccrued(snktroller, a1)).toEqualNumber(0);
      expect(await snkBalance(snktroller, a1)).toEqualNumber(25e18);
      expect(tx).toHaveLog('DistributedBorrowersnk', {
        cToken: mkt._address,
        borrower: a1,
        snkDelta: etherUnsigned(25e18).toFixed(),
        snkBorrowIndex: etherDouble(6).toFixed()
      });
    });

    it('should not transfer if below snk claim threshold', async () => {
      const mkt = cREP;
      await send(snktroller.snk, 'transfer', [snktroller._address, etherUnsigned(50e18)], {from: root});
      await send(mkt, "harnessSetAccountBorrows", [a1, etherUnsigned(5.5e17), etherExp(1)]);
      await send(snktroller, "setsnkBorrowState", [mkt._address, etherDouble(1.0019), 10]);
      await send(snktroller, "setsnkBorrowerIndex", [mkt._address, a1, etherDouble(1)]);
      /*
        borrowerAmount = borrowBalance * 1e18 / borrow idx
                       = 5.5e17 * 1e18 / 1.1e18 = 5e17
        deltaIndex     = marketStoredIndex - userStoredIndex
                       = 1.0019e36 - 1e36 = 0.0019e36
        borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                       = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
        0.00095e18 < snkClaimThreshold of 0.001e18
      */
      await send(snktroller, "harnessDistributeBorrowersnk", [mkt._address, a1, etherExp(1.1)]);
      expect(await snkAccrued(snktroller, a1)).toEqualNumber(0.00095e18);
      expect(await snkBalance(snktroller, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-snk market', async () => {
      const mkt = await makeCToken({
        snktroller: snktroller,
        supportMarket: true,
        addsnkMarket: false,
      });

      await send(snktroller, "harnessDistributeBorrowersnk", [mkt._address, a1, etherExp(1.1)]);
      expect(await snkAccrued(snktroller, a1)).toEqualNumber(0);
      expect(await snkBalance(snktroller, a1)).toEqualNumber(0);
      expect(await call(snktroller, 'snkBorrowerIndex', [mkt._address, a1])).toEqualNumber(0);
    });
  });

  describe('distributeSuppliersnk()', () => {
    it('should transfer snk and update supply index correctly for first time user', async () => {
      const mkt = cREP;
      await send(snktroller.snk, 'transfer', [snktroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e18)]);
      await send(snktroller, "setsnkSupplyState", [mkt._address, etherDouble(6), 10]);
      /*
      * 100 delta blocks, 10e18 total supply, 0.5e18 supplySpeed => 6e18 snkSupplyIndex
      * confirming an acct with half the total supply over that time gets 25e18 snk:
        supplierAmount  = 5e18
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 6e36 - 1e36 = 5e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e18 * 5e36 / 1e36 = 25e18
      */

      const tx = await send(snktroller, "harnessDistributeSuppliersnk", [mkt._address, a1]);
      expect(await snkAccrued(snktroller, a1)).toEqualNumber(0);
      expect(await snkBalance(snktroller, a1)).toEqualNumber(25e18);
      expect(tx).toHaveLog('DistributedSuppliersnk', {
        cToken: mkt._address,
        supplier: a1,
        snkDelta: etherUnsigned(25e18).toFixed(),
        snkSupplyIndex: etherDouble(6).toFixed()
      });
    });

    it('should update snk accrued and supply index for repeat user', async () => {
      const mkt = cREP;
      await send(snktroller.snk, 'transfer', [snktroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e18)]);
      await send(snktroller, "setsnkSupplyState", [mkt._address, etherDouble(6), 10]);
      await send(snktroller, "setsnkSupplierIndex", [mkt._address, a1, etherDouble(2)])
      /*
        supplierAmount  = 5e18
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 6e36 - 2e36 = 4e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e18 * 4e36 / 1e36 = 20e18
      */

      await send(snktroller, "harnessDistributeSuppliersnk", [mkt._address, a1]);
      expect(await snkAccrued(snktroller, a1)).toEqualNumber(0);
      expect(await snkBalance(snktroller, a1)).toEqualNumber(20e18);
    });

    it('should not transfer when snkAccrued below threshold', async () => {
      const mkt = cREP;
      await send(snktroller.snk, 'transfer', [snktroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e17)]);
      await send(snktroller, "setsnkSupplyState", [mkt._address, etherDouble(1.0019), 10]);
      /*
        supplierAmount  = 5e17
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 1.0019e36 - 1e36 = 0.0019e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
      */

      await send(snktroller, "harnessDistributeSuppliersnk", [mkt._address, a1]);
      expect(await snkAccrued(snktroller, a1)).toEqualNumber(0.00095e18);
      expect(await snkBalance(snktroller, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-snk market', async () => {
      const mkt = await makeCToken({
        snktroller: snktroller,
        supportMarket: true,
        addsnkMarket: false,
      });

      await send(snktroller, "harnessDistributeSuppliersnk", [mkt._address, a1]);
      expect(await snkAccrued(snktroller, a1)).toEqualNumber(0);
      expect(await snkBalance(snktroller, a1)).toEqualNumber(0);
      expect(await call(snktroller, 'snkBorrowerIndex', [mkt._address, a1])).toEqualNumber(0);
    });

  });

  describe('transfersnk', () => {
    it('should transfer snk accrued when amount is above threshold', async () => {
      const snkRemaining = 1000, a1AccruedPre = 100, threshold = 1;
      const snkBalancePre = await snkBalance(snktroller, a1);
      const tx0 = await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      const tx1 = await send(snktroller, 'setsnkAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(snktroller, 'harnessTransfersnk', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await snkAccrued(snktroller, a1);
      const snkBalancePost = await snkBalance(snktroller, a1);
      expect(snkBalancePre).toEqualNumber(0);
      expect(snkBalancePost).toEqualNumber(a1AccruedPre);
    });

    it('should not transfer when snk accrued is below threshold', async () => {
      const snkRemaining = 1000, a1AccruedPre = 100, threshold = 101;
      const snkBalancePre = await call(snktroller.snk, 'balanceOf', [a1]);
      const tx0 = await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      const tx1 = await send(snktroller, 'setsnkAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(snktroller, 'harnessTransfersnk', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await snkAccrued(snktroller, a1);
      const snkBalancePost = await snkBalance(snktroller, a1);
      expect(snkBalancePre).toEqualNumber(0);
      expect(snkBalancePost).toEqualNumber(0);
    });

    it('should not transfer snk if snk accrued is greater than snk remaining', async () => {
      const snkRemaining = 99, a1AccruedPre = 100, threshold = 1;
      const snkBalancePre = await snkBalance(snktroller, a1);
      const tx0 = await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      const tx1 = await send(snktroller, 'setsnkAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(snktroller, 'harnessTransfersnk', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await snkAccrued(snktroller, a1);
      const snkBalancePost = await snkBalance(snktroller, a1);
      expect(snkBalancePre).toEqualNumber(0);
      expect(snkBalancePost).toEqualNumber(0);
    });
  });

  describe('claimsnk', () => {
    it('should accrue snk and then transfer snk accrued', async () => {
      const snkRemaining = snkRate.multipliedBy(100), mintAmount = etherUnsigned(12e18), deltaBlocks = 10;
      await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await send(snktroller, 'refreshsnkSpeeds');
      const speed = await call(snktroller, 'snkSpeeds', [cLOW._address]);
      const a2AccruedPre = await snkAccrued(snktroller, a2);
      const snkBalancePre = await snkBalance(snktroller, a2);
      await quickMint(cLOW, a2, mintAmount);
      await fastForward(snktroller, deltaBlocks);
      const tx = await send(snktroller, 'claimsnk', [a2]);
      const a2AccruedPost = await snkAccrued(snktroller, a2);
      const snkBalancePost = await snkBalance(snktroller, a2);
      expect(tx.gasUsed).toBeLessThan(330000);
      expect(speed).toEqualNumber(snkRate);
      expect(a2AccruedPre).toEqualNumber(0);
      expect(a2AccruedPost).toEqualNumber(0);
      expect(snkBalancePre).toEqualNumber(0);
      expect(snkBalancePost).toEqualNumber(snkRate.multipliedBy(deltaBlocks).minus(1)); // index is 8333...
    });

    it('should accrue snk and then transfer snk accrued in a single market', async () => {
      const snkRemaining = snkRate.multipliedBy(100), mintAmount = etherUnsigned(12e18), deltaBlocks = 10;
      await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await send(snktroller, 'refreshsnkSpeeds');
      const speed = await call(snktroller, 'snkSpeeds', [cLOW._address]);
      const a2AccruedPre = await snkAccrued(snktroller, a2);
      const snkBalancePre = await snkBalance(snktroller, a2);
      await quickMint(cLOW, a2, mintAmount);
      await fastForward(snktroller, deltaBlocks);
      const tx = await send(snktroller, 'claimsnk', [a2, [cLOW._address]]);
      const a2AccruedPost = await snkAccrued(snktroller, a2);
      const snkBalancePost = await snkBalance(snktroller, a2);
      expect(tx.gasUsed).toBeLessThan(160000);
      expect(speed).toEqualNumber(snkRate);
      expect(a2AccruedPre).toEqualNumber(0);
      expect(a2AccruedPost).toEqualNumber(0);
      expect(snkBalancePre).toEqualNumber(0);
      expect(snkBalancePost).toEqualNumber(snkRate.multipliedBy(deltaBlocks).minus(1)); // index is 8333...
    });

    it('should claim when snk accrued is below threshold', async () => {
      const snkRemaining = etherExp(1), accruedAmt = etherUnsigned(0.0009e18)
      await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      await send(snktroller, 'setsnkAccrued', [a1, accruedAmt]);
      await send(snktroller, 'claimsnk', [a1, [cLOW._address]]);
      expect(await snkAccrued(snktroller, a1)).toEqualNumber(0);
      expect(await snkBalance(snktroller, a1)).toEqualNumber(accruedAmt);
    });

    it('should revert when a market is not listed', async () => {
      const cNOT = await makeCToken({snktroller});
      await expect(
        send(snktroller, 'claimsnk', [a1, [cNOT._address]])
      ).rejects.toRevert('revert market must be listed');
    });
  });

  describe('claimsnk batch', () => {
    it('should revert when claiming snk from non-listed market', async () => {
      const snkRemaining = snkRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;

      for(let from of claimAccts) {
        expect(await send(cLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(cLOW.underlying, 'approve', [cLOW._address, mintAmount], { from });
        send(cLOW, 'mint', [mintAmount], { from });
      }

      await pretendBorrow(cLOW, root, 1, 1, etherExp(10));
      await send(snktroller, 'refreshsnkSpeeds');

      await fastForward(snktroller, deltaBlocks);

      await expect(send(snktroller, 'claimsnk', [claimAccts, [cLOW._address, cEVIL._address], true, true])).rejects.toRevert('revert market must be listed');
    });


    it('should claim the expected amount when holders and ctokens arg is duplicated', async () => {
      const snkRemaining = snkRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;
      for(let from of claimAccts) {
        expect(await send(cLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(cLOW.underlying, 'approve', [cLOW._address, mintAmount], { from });
        send(cLOW, 'mint', [mintAmount], { from });
      }
      await pretendBorrow(cLOW, root, 1, 1, etherExp(10));
      await send(snktroller, 'refreshsnkSpeeds');

      await fastForward(snktroller, deltaBlocks);

      const tx = await send(snktroller, 'claimsnk', [[...claimAccts, ...claimAccts], [cLOW._address, cLOW._address], false, true]);
      // snk distributed => 10e18
      for(let acct of claimAccts) {
        expect(await call(snktroller, 'snkSupplierIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(1.125));
        expect(await snkBalance(snktroller, acct)).toEqualNumber(etherExp(1.25));
      }
    });

    it('claims snk for multiple suppliers only', async () => {
      const snkRemaining = snkRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;
      for(let from of claimAccts) {
        expect(await send(cLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(cLOW.underlying, 'approve', [cLOW._address, mintAmount], { from });
        send(cLOW, 'mint', [mintAmount], { from });
      }
      await pretendBorrow(cLOW, root, 1, 1, etherExp(10));
      await send(snktroller, 'refreshsnkSpeeds');

      await fastForward(snktroller, deltaBlocks);

      const tx = await send(snktroller, 'claimsnk', [claimAccts, [cLOW._address], false, true]);
      // snk distributed => 10e18
      for(let acct of claimAccts) {
        expect(await call(snktroller, 'snkSupplierIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(1.125));
        expect(await snkBalance(snktroller, acct)).toEqualNumber(etherExp(1.25));
      }
    });

    it('claims snk for multiple borrowers only, primes uninitiated', async () => {
      const snkRemaining = snkRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10), borrowAmt = etherExp(1), borrowIdx = etherExp(1)
      await send(snktroller.snk, 'transfer', [snktroller._address, snkRemaining], {from: root});
      let [_,__, ...claimAccts] = saddle.accounts;

      for(let acct of claimAccts) {
        await send(cLOW, 'harnessIncrementTotalBorrows', [borrowAmt]);
        await send(cLOW, 'harnessSetAccountBorrows', [acct, borrowAmt, borrowIdx]);
      }
      await send(snktroller, 'refreshsnkSpeeds');

      await send(snktroller, 'harnessFastForward', [10]);

      const tx = await send(snktroller, 'claimsnk', [claimAccts, [cLOW._address], true, false]);
      for(let acct of claimAccts) {
        expect(await call(snktroller, 'snkBorrowerIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(2.25));
        expect(await call(snktroller, 'snkSupplierIndex', [cLOW._address, acct])).toEqualNumber(0);
      }
    });

    it('should revert when a market is not listed', async () => {
      const cNOT = await makeCToken({snktroller});
      await expect(
        send(snktroller, 'claimsnk', [[a1, a2], [cNOT._address], true, true])
      ).rejects.toRevert('revert market must be listed');
    });
  });

  describe('refreshsnkSpeeds', () => {
    it('should start out 0', async () => {
      await send(snktroller, 'refreshsnkSpeeds');
      const speed = await call(snktroller, 'snkSpeeds', [cLOW._address]);
      expect(speed).toEqualNumber(0);
    });

    it('should get correct speeds with borrows', async () => {
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      const tx = await send(snktroller, 'refreshsnkSpeeds');
      const speed = await call(snktroller, 'snkSpeeds', [cLOW._address]);
      expect(speed).toEqualNumber(snkRate);
      expect(tx).toHaveLog(['snkSpeedUpdated', 0], {
        cToken: cLOW._address,
        newSpeed: speed
      });
      expect(tx).toHaveLog(['snkSpeedUpdated', 1], {
        cToken: cREP._address,
        newSpeed: 0
      });
      expect(tx).toHaveLog(['snkSpeedUpdated', 2], {
        cToken: cZRX._address,
        newSpeed: 0
      });
    });

    it('should get correct speeds for 2 assets', async () => {
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await pretendBorrow(cZRX, a1, 1, 1, 100);
      await send(snktroller, 'refreshsnkSpeeds');
      const speed1 = await call(snktroller, 'snkSpeeds', [cLOW._address]);
      const speed2 = await call(snktroller, 'snkSpeeds', [cREP._address]);
      const speed3 = await call(snktroller, 'snkSpeeds', [cZRX._address]);
      expect(speed1).toEqualNumber(snkRate.dividedBy(4));
      expect(speed2).toEqualNumber(0);
      expect(speed3).toEqualNumber(snkRate.dividedBy(4).multipliedBy(3));
    });

    it('should not be callable inside a contract', async () => {
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await pretendBorrow(cZRX, a1, 1, 1, 100);
      await expect(deploy('RefreshSpeedsProxy', [snktroller._address])).rejects.toRevert('revert only externally owned accounts may refresh speeds');
    });
  });

  describe('_addsnkMarkets', () => {
    it('should correctly add a snk market if called by admin', async () => {
      const cBAT = await makeCToken({snktroller, supportMarket: true});
      const tx = await send(snktroller, '_addsnkMarkets', [[cBAT._address]]);
      const markets = await call(snktroller, 'getsnkMarkets');
      expect(markets).toEqual([cLOW, cREP, cZRX, cBAT].map((c) => c._address));
      expect(tx).toHaveLog('Marketsnked', {
        cToken: cBAT._address,
        issnked: true
      });
    });

    it('should revert if not called by admin', async () => {
      const cBAT = await makeCToken({ snktroller, supportMarket: true });
      await expect(
        send(snktroller, '_addsnkMarkets', [[cBAT._address]], {from: a1})
      ).rejects.toRevert('revert only admin can add snk market');
    });

    it('should not add non-listed markets', async () => {
      const cBAT = await makeCToken({ snktroller, supportMarket: false });
      await expect(
        send(snktroller, '_addsnkMarkets', [[cBAT._address]])
      ).rejects.toRevert('revert snk market is not listed');

      const markets = await call(snktroller, 'getsnkMarkets');
      expect(markets).toEqual([cLOW, cREP, cZRX].map((c) => c._address));
    });

    it('should not add duplicate markets', async () => {
      const cBAT = await makeCToken({snktroller, supportMarket: true});
      await send(snktroller, '_addsnkMarkets', [[cBAT._address]]);

      await expect(
        send(snktroller, '_addsnkMarkets', [[cBAT._address]])
      ).rejects.toRevert('revert snk market already added');
    });

    it('should not write over a markets existing state', async () => {
      const mkt = cLOW._address;
      const bn0 = 10, bn1 = 20;
      const idx = etherUnsigned(1.5e36);

      await send(snktroller, "setsnkSupplyState", [mkt, idx, bn0]);
      await send(snktroller, "setsnkBorrowState", [mkt, idx, bn0]);
      await send(snktroller, "setBlockNumber", [bn1]);
      await send(snktroller, "_dropsnkMarket", [mkt]);
      await send(snktroller, "_addsnkMarkets", [[mkt]]);

      const supplyState = await call(snktroller, 'snkSupplyState', [mkt]);
      expect(supplyState.block).toEqual(bn1.toString());
      expect(supplyState.index).toEqual(idx.toFixed());

      const borrowState = await call(snktroller, 'snkBorrowState', [mkt]);
      expect(borrowState.block).toEqual(bn1.toString());
      expect(borrowState.index).toEqual(idx.toFixed());
    });
  });

  describe('_dropsnkMarket', () => {
    it('should correctly drop a snk market if called by admin', async () => {
      const tx = await send(snktroller, '_dropsnkMarket', [cLOW._address]);
      expect(await call(snktroller, 'getsnkMarkets')).toEqual(
        [cREP, cZRX].map((c) => c._address)
      );
      expect(tx).toHaveLog('Marketsnked', {
        cToken: cLOW._address,
        issnked: false
      });
    });

    it('should correctly drop a snk market from middle of array', async () => {
      await send(snktroller, '_dropsnkMarket', [cREP._address]);
      expect(await call(snktroller, 'getsnkMarkets')).toEqual(
        [cLOW, cZRX].map((c) => c._address)
      );
    });

    it('should not drop a snk market unless called by admin', async () => {
      await expect(
        send(snktroller, '_dropsnkMarket', [cLOW._address], {from: a1})
      ).rejects.toRevert('revert only admin can drop snk market');
    });

    it('should not drop a snk market already dropped', async () => {
      await send(snktroller, '_dropsnkMarket', [cLOW._address]);
      await expect(
        send(snktroller, '_dropsnkMarket', [cLOW._address])
      ).rejects.toRevert('revert market is not a snk market');
    });
  });

  describe('_setsnkRate', () => {
    it('should correctly change snk rate if called by admin', async () => {
      expect(await call(snktroller, 'snkRate')).toEqualNumber(etherUnsigned(1e18));
      const tx1 = await send(snktroller, '_setsnkRate', [etherUnsigned(3e18)]);
      expect(await call(snktroller, 'snkRate')).toEqualNumber(etherUnsigned(3e18));
      const tx2 = await send(snktroller, '_setsnkRate', [etherUnsigned(2e18)]);
      expect(await call(snktroller, 'snkRate')).toEqualNumber(etherUnsigned(2e18));
      expect(tx2).toHaveLog('NewsnkRate', {
        oldsnkRate: etherUnsigned(3e18),
        newsnkRate: etherUnsigned(2e18)
      });
    });

    it('should not change snk rate unless called by admin', async () => {
      await expect(
        send(snktroller, '_setsnkRate', [cLOW._address], {from: a1})
      ).rejects.toRevert('revert only admin can change snk rate');
    });
  });
});
