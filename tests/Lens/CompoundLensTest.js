const {
  address,
  encodeParameters,
} = require('../Utils/Ethereum');
const {
  makesnktroller,
  makeCToken,
} = require('../Utils/DeFiDao');

function cullTuple(tuple) {
  return Object.keys(tuple).reduce((acc, key) => {
    if (Number.isNaN(Number(key))) {
      return {
        ...acc,
        [key]: tuple[key]
      };
    } else {
      return acc;
    }
  }, {});
}

describe('DeFiDaoLens', () => {
  let DeFiDaoLens;
  let acct;

  beforeEach(async () => {
    DeFiDaoLens = await deploy('DeFiDaoLens');
    acct = accounts[0];
  });

  describe('cTokenMetadata', () => {
    it('is correct for a cErc20', async () => {
      let cErc20 = await makeCToken();
      expect(
        cullTuple(await call(DeFiDaoLens, 'cTokenMetadata', [cErc20._address]))
      ).toEqual(
        {
          cToken: cErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(cErc20, 'underlying', []),
          cTokenDecimals: "8",
          underlyingDecimals: "18"
        }
      );
    });

    it('is correct for cEth', async () => {
      let cEth = await makeCToken({kind: 'cether'});
      expect(
        cullTuple(await call(DeFiDaoLens, 'cTokenMetadata', [cEth._address]))
      ).toEqual({
        borrowRatePerBlock: "0",
        cToken: cEth._address,
        cTokenDecimals: "8",
        collateralFactorMantissa: "0",
        exchangeRateCurrent: "1000000000000000000",
        isListed: false,
        reserveFactorMantissa: "0",
        supplyRatePerBlock: "0",
        totalBorrows: "0",
        totalCash: "0",
        totalReserves: "0",
        totalSupply: "0",
        underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
        underlyingDecimals: "18",
      });
    });
  });

  describe('cTokenMetadataAll', () => {
    it('is correct for a cErc20 and cEther', async () => {
      let cErc20 = await makeCToken();
      let cEth = await makeCToken({kind: 'cether'});
      expect(
        (await call(DeFiDaoLens, 'cTokenMetadataAll', [[cErc20._address, cEth._address]])).map(cullTuple)
      ).toEqual([
        {
          cToken: cErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(cErc20, 'underlying', []),
          cTokenDecimals: "8",
          underlyingDecimals: "18"
        },
        {
          borrowRatePerBlock: "0",
          cToken: cEth._address,
          cTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: false,
          reserveFactorMantissa: "0",
          supplyRatePerBlock: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
          underlyingDecimals: "18",
        }
      ]);
    });
  });

  describe('cTokenBalances', () => {
    it('is correct for cERC20', async () => {
      let cErc20 = await makeCToken();
      expect(
        cullTuple(await call(DeFiDaoLens, 'cTokenBalances', [cErc20._address, acct]))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          cToken: cErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        }
      );
    });

    it('is correct for cETH', async () => {
      let cEth = await makeCToken({kind: 'cether'});
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(DeFiDaoLens, 'cTokenBalances', [cEth._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          cToken: cEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      );
    });
  });

  describe('cTokenBalancesAll', () => {
    it('is correct for cEth and cErc20', async () => {
      let cErc20 = await makeCToken();
      let cEth = await makeCToken({kind: 'cether'});
      let ethBalance = await web3.eth.getBalance(acct);
      
      expect(
        (await call(DeFiDaoLens, 'cTokenBalancesAll', [[cErc20._address, cEth._address], acct], {gasPrice: '0'})).map(cullTuple)
      ).toEqual([
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          cToken: cErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        },
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          cToken: cEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      ]);
    })
  });

  describe('cTokenUnderlyingPrice', () => {
    it('gets correct price for cErc20', async () => {
      let cErc20 = await makeCToken();
      expect(
        cullTuple(await call(DeFiDaoLens, 'cTokenUnderlyingPrice', [cErc20._address]))
      ).toEqual(
        {
          cToken: cErc20._address,
          underlyingPrice: "0",
        }
      );
    });

    it('gets correct price for cEth', async () => {
      let cEth = await makeCToken({kind: 'cether'});
      expect(
        cullTuple(await call(DeFiDaoLens, 'cTokenUnderlyingPrice', [cEth._address]))
      ).toEqual(
        {
          cToken: cEth._address,
          underlyingPrice: "1000000000000000000",
        }
      );
    });
  });

  describe('cTokenUnderlyingPriceAll', () => {
    it('gets correct price for both', async () => {
      let cErc20 = await makeCToken();
      let cEth = await makeCToken({kind: 'cether'});
      expect(
        (await call(DeFiDaoLens, 'cTokenUnderlyingPriceAll', [[cErc20._address, cEth._address]])).map(cullTuple)
      ).toEqual([
        {
          cToken: cErc20._address,
          underlyingPrice: "0",
        },
        {
          cToken: cEth._address,
          underlyingPrice: "1000000000000000000",
        }
      ]);
    });
  });

  describe('getAccountLimits', () => {
    it('gets correct values', async () => {
      let snktroller = await makesnktroller();

      expect(
        cullTuple(await call(DeFiDaoLens, 'getAccountLimits', [snktroller._address, acct]))
      ).toEqual({
        liquidity: "0",
        markets: [],
        shortfall: "0"
      });
    });
  });

  describe('governance', () => {
    let snk, gov;
    let targets, values, signatures, callDatas;
    let proposalBlock, proposalId;

    beforeEach(async () => {
      snk = await deploy('snk', [acct]);
      gov = await deploy('GovernorAlpha', [address(0), snk._address, address(0)]);
      targets = [acct];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [acct])];
      await send(snk, 'delegate', [acct]);
      await send(gov, 'propose', [targets, values, signatures, callDatas, "do nothing"]);
      proposalBlock = +(await web3.eth.getBlockNumber());
      proposalId = await call(gov, 'latestProposalIds', [acct]);
    });

    describe('getGovReceipts', () => {
      it('gets correct values', async () => {
        expect(
          (await call(DeFiDaoLens, 'getGovReceipts', [gov._address, acct, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            hasVoted: false,
            proposalId: proposalId,
            support: false,
            votes: "0",
          }
        ]);
      })
    });

    describe('getGovProposals', () => {
      it('gets correct values', async () => {
        expect(
          (await call(DeFiDaoLens, 'getGovProposals', [gov._address, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            againstVotes: "0",
            calldatas: callDatas,
            canceled: false,
            endBlock: (Number(proposalBlock) + 17281).toString(),
            eta: "0",
            executed: false,
            forVotes: "0",
            proposalId: proposalId,
            proposer: acct,
            signatures: signatures,
            startBlock: (Number(proposalBlock) + 1).toString(),
            targets: targets
          }
        ]);
      })
    });
  });

  describe('snk', () => {
    let snk, currentBlock;

    beforeEach(async () => {
      currentBlock = +(await web3.eth.getBlockNumber());
      snk = await deploy('snk', [acct]);
    });

    describe('getsnkBalanceMetadata', () => {
      it('gets correct values', async () => {
        expect(
          cullTuple(await call(DeFiDaoLens, 'getsnkBalanceMetadata', [snk._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
        });
      });
    });

    describe('getsnkBalanceMetadataExt', () => {
      it('gets correct values', async () => {
        let snktroller = await makesnktroller();
        await send(snktroller, 'setsnkAccrued', [acct, 5]); // harness only

        expect(
          cullTuple(await call(DeFiDaoLens, 'getsnkBalanceMetadataExt', [snk._address, snktroller._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
          allocated: "5"
        });
      });
    });

    describe('getsnkVotes', () => {
      it('gets correct values', async () => {
        expect(
          (await call(DeFiDaoLens, 'getsnkVotes', [snk._address, acct, [currentBlock, currentBlock - 1]])).map(cullTuple)
        ).toEqual([
          {
            blockNumber: currentBlock.toString(),
            votes: "0",
          },
          {
            blockNumber: (Number(currentBlock) - 1).toString(),
            votes: "0",
          }
        ]);
      });

      it('reverts on future value', async () => {
        await expect(
          call(DeFiDaoLens, 'getsnkVotes', [snk._address, acct, [currentBlock + 1]])
        ).rejects.toRevert('revert snk::getPriorVotes: not yet determined')
      });
    });
  });
});
