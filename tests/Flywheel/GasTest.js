const {
  makesnktroller,
  makeCToken
} = require('../Utils/DeFiDao');
const {
  etherExp,
  etherDouble,
  etherUnsigned
} = require('../Utils/Ethereum');


// NB: coverage doesn't like this
describe.skip('Flywheel trace ops', () => {
  let root, a1, a2, a3, accounts;
  let snktroller, market;
  beforeEach(async () => {
    let interestRateModelOpts = {borrowRate: 0.000001};
    [root, a1, a2, a3, ...accounts] = saddle.accounts;
    snktroller = await makesnktroller();
    market = await makeCToken({snktroller, supportMarket: true, underlyingPrice: 3, interestRateModelOpts});
    await send(snktroller, '_addsnkMarkets', [[market].map(c => c._address)]);
  });

  it('update supply index SSTOREs', async () => {
    await send(snktroller, 'setBlockNumber', [100]);
    await send(market, 'harnessSetTotalBorrows', [etherUnsigned(11e18)]);
    await send(snktroller, 'setsnkSpeed', [market._address, etherExp(0.5)]);

    const tx = await send(snktroller, 'harnessUpdatesnkSupplyIndex', [market._address]);

    const ops = {};
    await saddle.trace(tx, {
      execLog: log => {
        if (log.lastLog != undefined) {
          ops[log.op] = (ops[log.op] || []).concat(log);
        }
      }
    });
    expect(ops.SSTORE.length).toEqual(1);
  });

  it('update borrow index SSTOREs', async () => {
    await send(snktroller, 'setBlockNumber', [100]);
    await send(market, 'harnessSetTotalBorrows', [etherUnsigned(11e18)]);
    await send(snktroller, 'setsnkSpeed', [market._address, etherExp(0.5)]);

    const tx = await send(snktroller, 'harnessUpdatesnkBorrowIndex', [market._address, etherExp(1.1)]);

    const ops = {};
    await saddle.trace(tx, {
      execLog: log => {
        if (log.lastLog != undefined) {
          ops[log.op] = (ops[log.op] || []).concat(log);
        }
      }
    });
    expect(ops.SSTORE.length).toEqual(1);
  });
});