import {Event} from '../Event';
import {World} from '../World';
import {snktroller} from '../Contract/snktroller';
import {CToken} from '../Contract/CToken';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getsnktroller} from '../ContractLookup';
import {encodedNumber} from '../Encoding';
import {getCTokenV} from '../Value/CTokenValue';
import { encodeParameters, encodeABI } from '../Utils';

export async function getsnktrollerAddress(world: World, snktroller: snktroller): Promise<AddressV> {
  return new AddressV(snktroller._address);
}

export async function getLiquidity(world: World, snktroller: snktroller, user: string): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await snktroller.methods.getAccountLiquidity(user).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to snkute account liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

export async function getHypotheticalLiquidity(world: World, snktroller: snktroller, account: string, asset: string, redeemTokens: encodedNumber, borrowAmount: encodedNumber): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await snktroller.methods.getHypotheticalAccountLiquidity(account, asset, redeemTokens, borrowAmount).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to snkute account hypothetical liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

async function getPriceOracle(world: World, snktroller: snktroller): Promise<AddressV> {
  return new AddressV(await snktroller.methods.oracle().call());
}

async function getCloseFactor(world: World, snktroller: snktroller): Promise<NumberV> {
  return new NumberV(await snktroller.methods.closeFactorMantissa().call(), 1e18);
}

async function getMaxAssets(world: World, snktroller: snktroller): Promise<NumberV> {
  return new NumberV(await snktroller.methods.maxAssets().call());
}

async function getLiquidationIncentive(world: World, snktroller: snktroller): Promise<NumberV> {
  return new NumberV(await snktroller.methods.liquidationIncentiveMantissa().call(), 1e18);
}

async function getImplementation(world: World, snktroller: snktroller): Promise<AddressV> {
  return new AddressV(await snktroller.methods.snktrollerImplementation().call());
}

async function getBlockNumber(world: World, snktroller: snktroller): Promise<NumberV> {
  return new NumberV(await snktroller.methods.getBlockNumber().call());
}

async function getAdmin(world: World, snktroller: snktroller): Promise<AddressV> {
  return new AddressV(await snktroller.methods.admin().call());
}

async function getPendingAdmin(world: World, snktroller: snktroller): Promise<AddressV> {
  return new AddressV(await snktroller.methods.pendingAdmin().call());
}

async function getCollateralFactor(world: World, snktroller: snktroller, cToken: CToken): Promise<NumberV> {
  let {0: _isListed, 1: collateralFactorMantissa} = await snktroller.methods.markets(cToken._address).call();
  return new NumberV(collateralFactorMantissa, 1e18);
}

async function membershipLength(world: World, snktroller: snktroller, user: string): Promise<NumberV> {
  return new NumberV(await snktroller.methods.membershipLength(user).call());
}

async function checkMembership(world: World, snktroller: snktroller, user: string, cToken: CToken): Promise<BoolV> {
  return new BoolV(await snktroller.methods.checkMembership(user, cToken._address).call());
}

async function getAssetsIn(world: World, snktroller: snktroller, user: string): Promise<ListV> {
  let assetsList = await snktroller.methods.getAssetsIn(user).call();

  return new ListV(assetsList.map((a) => new AddressV(a)));
}

async function getsnkMarkets(world: World, snktroller: snktroller): Promise<ListV> {
  let mkts = await snktroller.methods.getsnkMarkets().call();

  return new ListV(mkts.map((a) => new AddressV(a)));
}

async function checkListed(world: World, snktroller: snktroller, cToken: CToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa} = await snktroller.methods.markets(cToken._address).call();

  return new BoolV(isListed);
}

async function checkIssnked(world: World, snktroller: snktroller, cToken: CToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa, 2: issnked} = await snktroller.methods.markets(cToken._address).call();
  return new BoolV(issnked);
}


export function snktrollerFetchers() {
  return [
    new Fetcher<{snktroller: snktroller}, AddressV>(`
        #### Address

        * "snktroller Address" - Returns address of snktroller
      `,
      "Address",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      (world, {snktroller}) => getsnktrollerAddress(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller, account: AddressV}, NumberV>(`
        #### Liquidity

        * "snktroller Liquidity <User>" - Returns a given user's trued up liquidity
          * E.g. "snktroller Liquidity Geoff"
      `,
      "Liquidity",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {snktroller, account}) => getLiquidity(world, snktroller, account.val)
    ),
    new Fetcher<{snktroller: snktroller, account: AddressV, action: StringV, amount: NumberV, cToken: CToken}, NumberV>(`
        #### Hypothetical

        * "snktroller Hypothetical <User> <Action> <Asset> <Number>" - Returns a given user's trued up liquidity given a hypothetical change in asset with redeeming a certain number of tokens and/or borrowing a given amount.
          * E.g. "snktroller Hypothetical Geoff Redeems 6.0 cZRX"
          * E.g. "snktroller Hypothetical Geoff Borrows 5.0 cZRX"
      `,
      "Hypothetical",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("action", getStringV),
        new Arg("amount", getNumberV),
        new Arg("cToken", getCTokenV)
      ],
      async (world, {snktroller, account, action, cToken, amount}) => {
        let redeemTokens: NumberV;
        let borrowAmount: NumberV;

        switch (action.val.toLowerCase()) {
          case "borrows":
            redeemTokens = new NumberV(0);
            borrowAmount = amount;
            break;
          case "redeems":
            redeemTokens = amount;
            borrowAmount = new NumberV(0);
            break;
          default:
            throw new Error(`Unknown hypothetical: ${action.val}`);
        }

        return await getHypotheticalLiquidity(world, snktroller, account.val, cToken._address, redeemTokens.encode(), borrowAmount.encode());
      }
    ),
    new Fetcher<{snktroller: snktroller}, AddressV>(`
        #### Admin

        * "snktroller Admin" - Returns the snktrollers's admin
          * E.g. "snktroller Admin"
      `,
      "Admin",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      (world, {snktroller}) => getAdmin(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller}, AddressV>(`
        #### PendingAdmin

        * "snktroller PendingAdmin" - Returns the pending admin of the snktroller
          * E.g. "snktroller PendingAdmin" - Returns snktroller's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
      ],
      (world, {snktroller}) => getPendingAdmin(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller}, AddressV>(`
        #### PriceOracle

        * "snktroller PriceOracle" - Returns the snktrollers's price oracle
          * E.g. "snktroller PriceOracle"
      `,
      "PriceOracle",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      (world, {snktroller}) => getPriceOracle(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller}, NumberV>(`
        #### CloseFactor

        * "snktroller CloseFactor" - Returns the snktrollers's price oracle
          * E.g. "snktroller CloseFactor"
      `,
      "CloseFactor",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      (world, {snktroller}) => getCloseFactor(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller}, NumberV>(`
        #### MaxAssets

        * "snktroller MaxAssets" - Returns the snktrollers's price oracle
          * E.g. "snktroller MaxAssets"
      `,
      "MaxAssets",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      (world, {snktroller}) => getMaxAssets(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller}, NumberV>(`
        #### LiquidationIncentive

        * "snktroller LiquidationIncentive" - Returns the snktrollers's liquidation incentive
          * E.g. "snktroller LiquidationIncentive"
      `,
      "LiquidationIncentive",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      (world, {snktroller}) => getLiquidationIncentive(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller}, AddressV>(`
        #### Implementation

        * "snktroller Implementation" - Returns the snktrollers's implementation
          * E.g. "snktroller Implementation"
      `,
      "Implementation",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      (world, {snktroller}) => getImplementation(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller}, NumberV>(`
        #### BlockNumber

        * "snktroller BlockNumber" - Returns the snktrollers's mocked block number (for scenario runner)
          * E.g. "snktroller BlockNumber"
      `,
      "BlockNumber",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      (world, {snktroller}) => getBlockNumber(world, snktroller)
    ),
    new Fetcher<{snktroller: snktroller, cToken: CToken}, NumberV>(`
        #### CollateralFactor

        * "snktroller CollateralFactor <CToken>" - Returns the collateralFactor associated with a given asset
          * E.g. "snktroller CollateralFactor cZRX"
      `,
      "CollateralFactor",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, {snktroller, cToken}) => getCollateralFactor(world, snktroller, cToken)
    ),
    new Fetcher<{snktroller: snktroller, account: AddressV}, NumberV>(`
        #### MembershipLength

        * "snktroller MembershipLength <User>" - Returns a given user's length of membership
          * E.g. "snktroller MembershipLength Geoff"
      `,
      "MembershipLength",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {snktroller, account}) => membershipLength(world, snktroller, account.val)
    ),
    new Fetcher<{snktroller: snktroller, account: AddressV, cToken: CToken}, BoolV>(`
        #### CheckMembership

        * "snktroller CheckMembership <User> <CToken>" - Returns one if user is in asset, zero otherwise.
          * E.g. "snktroller CheckMembership Geoff cZRX"
      `,
      "CheckMembership",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("cToken", getCTokenV)
      ],
      (world, {snktroller, account, cToken}) => checkMembership(world, snktroller, account.val, cToken)
    ),
    new Fetcher<{snktroller: snktroller, account: AddressV}, ListV>(`
        #### AssetsIn

        * "snktroller AssetsIn <User>" - Returns the assets a user is in
          * E.g. "snktroller AssetsIn Geoff"
      `,
      "AssetsIn",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {snktroller, account}) => getAssetsIn(world, snktroller, account.val)
    ),
    new Fetcher<{snktroller: snktroller, cToken: CToken}, BoolV>(`
        #### CheckListed

        * "snktroller CheckListed <CToken>" - Returns true if market is listed, false otherwise.
          * E.g. "snktroller CheckListed cZRX"
      `,
      "CheckListed",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, {snktroller, cToken}) => checkListed(world, snktroller, cToken)
    ),
    new Fetcher<{snktroller: snktroller, cToken: CToken}, BoolV>(`
        #### CheckIssnked

        * "snktroller CheckIssnked <CToken>" - Returns true if market is listed, false otherwise.
          * E.g. "snktroller CheckIssnked cZRX"
      `,
      "CheckIssnked",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, {snktroller, cToken}) => checkIssnked(world, snktroller, cToken)
    ),
    new Fetcher<{snktroller: snktroller}, AddressV>(`
        #### PauseGuardian

        * "PauseGuardian" - Returns the snktrollers's PauseGuardian
        * E.g. "snktroller PauseGuardian"
        `,
        "PauseGuardian",
        [
          new Arg("snktroller", getsnktroller, {implicit: true})
        ],
        async (world, {snktroller}) => new AddressV(await snktroller.methods.pauseGuardian().call())
    ),

    new Fetcher<{snktroller: snktroller}, BoolV>(`
        #### _MintGuardianPaused

        * "_MintGuardianPaused" - Returns the snktrollers's original global Mint paused status
        * E.g. "snktroller _MintGuardianPaused"
        `,
        "_MintGuardianPaused",
        [new Arg("snktroller", getsnktroller, {implicit: true})],
        async (world, {snktroller}) => new BoolV(await snktroller.methods._mintGuardianPaused().call())
    ),
    new Fetcher<{snktroller: snktroller}, BoolV>(`
        #### _BorrowGuardianPaused

        * "_BorrowGuardianPaused" - Returns the snktrollers's original global Borrow paused status
        * E.g. "snktroller _BorrowGuardianPaused"
        `,
        "_BorrowGuardianPaused",
        [new Arg("snktroller", getsnktroller, {implicit: true})],
        async (world, {snktroller}) => new BoolV(await snktroller.methods._borrowGuardianPaused().call())
    ),

    new Fetcher<{snktroller: snktroller}, BoolV>(`
        #### TransferGuardianPaused

        * "TransferGuardianPaused" - Returns the snktrollers's Transfer paused status
        * E.g. "snktroller TransferGuardianPaused"
        `,
        "TransferGuardianPaused",
        [new Arg("snktroller", getsnktroller, {implicit: true})],
        async (world, {snktroller}) => new BoolV(await snktroller.methods.transferGuardianPaused().call())
    ),
    new Fetcher<{snktroller: snktroller}, BoolV>(`
        #### SeizeGuardianPaused

        * "SeizeGuardianPaused" - Returns the snktrollers's Seize paused status
        * E.g. "snktroller SeizeGuardianPaused"
        `,
        "SeizeGuardianPaused",
        [new Arg("snktroller", getsnktroller, {implicit: true})],
        async (world, {snktroller}) => new BoolV(await snktroller.methods.seizeGuardianPaused().call())
    ),

    new Fetcher<{snktroller: snktroller, cToken: CToken}, BoolV>(`
        #### MintGuardianMarketPaused

        * "MintGuardianMarketPaused" - Returns the snktrollers's Mint paused status in market
        * E.g. "snktroller MintGuardianMarketPaused cREP"
        `,
        "MintGuardianMarketPaused",
        [
          new Arg("snktroller", getsnktroller, {implicit: true}),
          new Arg("cToken", getCTokenV)
        ],
        async (world, {snktroller, cToken}) => new BoolV(await snktroller.methods.mintGuardianPaused(cToken._address).call())
    ),
    new Fetcher<{snktroller: snktroller, cToken: CToken}, BoolV>(`
        #### BorrowGuardianMarketPaused

        * "BorrowGuardianMarketPaused" - Returns the snktrollers's Borrow paused status in market
        * E.g. "snktroller BorrowGuardianMarketPaused cREP"
        `,
        "BorrowGuardianMarketPaused",
        [
          new Arg("snktroller", getsnktroller, {implicit: true}),
          new Arg("cToken", getCTokenV)
        ],
        async (world, {snktroller, cToken}) => new BoolV(await snktroller.methods.borrowGuardianPaused(cToken._address).call())
    ),

    new Fetcher<{snktroller: snktroller}, ListV>(`
      #### GetsnkMarkets

      * "GetsnkMarkets" - Returns an array of the currently enabled snk markets. To use the auto-gen array getter snkMarkets(uint), use snkMarkets
      * E.g. "snktroller GetsnkMarkets"
      `,
      "GetsnkMarkets",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      async(world, {snktroller}) => await getsnkMarkets(world, snktroller)
     ),

    new Fetcher<{snktroller: snktroller}, NumberV>(`
      #### snkRate

      * "snkRate" - Returns the current snk rate.
      * E.g. "snktroller snkRate"
      `,
      "snkRate",
      [new Arg("snktroller", getsnktroller, {implicit: true})],
      async(world, {snktroller}) => new NumberV(await snktroller.methods.snkRate().call())
    ),

    new Fetcher<{snktroller: snktroller, signature: StringV, callArgs: StringV[]}, NumberV>(`
        #### CallNum

        * "CallNum signature:<String> ...callArgs<CoreValue>" - Simple direct call method
          * E.g. "snktroller CallNum \"snkSpeeds(address)\" (Address Coburn)"
      `,
      "CallNum",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      async (world, {snktroller, signature, callArgs}) => {
        const fnData = encodeABI(world, signature.val, callArgs.map(a => a.val));
        const res = await world.web3.eth.call({
            to: snktroller._address,
            data: fnData
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
    ),
    new Fetcher<{snktroller: snktroller, CToken: CToken, key: StringV}, NumberV>(`
        #### snkSupplyState(address)

        * "snktroller snkBorrowState cZRX "index"
      `,
      "snkSupplyState",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("CToken", getCTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {snktroller, CToken, key}) => {
        const result = await snktroller.methods.snkSupplyState(CToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{snktroller: snktroller, CToken: CToken, key: StringV}, NumberV>(`
        #### snkBorrowState(address)

        * "snktroller snkBorrowState cZRX "index"
      `,
      "snkBorrowState",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("CToken", getCTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {snktroller, CToken, key}) => {
        const result = await snktroller.methods.snkBorrowState(CToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{snktroller: snktroller, account: AddressV, key: StringV}, NumberV>(`
        #### snkAccrued(address)

        * "snktroller snkAccrued Coburn
      `,
      "snkAccrued",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("account", getAddressV),
      ],
      async (world, {snktroller,account}) => {
        const result = await snktroller.methods.snkAccrued(account.val).call();
        return new NumberV(result);
      }
    ),
    new Fetcher<{snktroller: snktroller, CToken: CToken, account: AddressV}, NumberV>(`
        #### snkSupplierIndex

        * "snktroller snkSupplierIndex cZRX Coburn
      `,
      "snkSupplierIndex",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("CToken", getCTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {snktroller, CToken, account}) => {
        return new NumberV(await snktroller.methods.snkSupplierIndex(CToken._address, account.val).call());
      }
    ),
    new Fetcher<{snktroller: snktroller, CToken: CToken, account: AddressV}, NumberV>(`
        #### snkBorrowerIndex

        * "snktroller snkBorrowerIndex cZRX Coburn
      `,
      "snkBorrowerIndex",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("CToken", getCTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {snktroller, CToken, account}) => {
        return new NumberV(await snktroller.methods.snkBorrowerIndex(CToken._address, account.val).call());
      }
    ),
    new Fetcher<{snktroller: snktroller, CToken: CToken}, NumberV>(`
        #### snkSpeed

        * "snktroller snkSpeed cZRX
      `,
      "snkSpeed",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("CToken", getCTokenV),
      ],
      async (world, {snktroller, CToken}) => {
        return new NumberV(await snktroller.methods.snkSpeeds(CToken._address).call());
      }
    ),
    new Fetcher<{snktroller: snktroller}, AddressV>(`
        #### BorrowCapGuardian

        * "BorrowCapGuardian" - Returns the snktrollers's BorrowCapGuardian
        * E.g. "snktroller BorrowCapGuardian"
        `,
        "BorrowCapGuardian",
        [
          new Arg("snktroller", getsnktroller, {implicit: true})
        ],
        async (world, {snktroller}) => new AddressV(await snktroller.methods.borrowCapGuardian().call())
    ),
    new Fetcher<{snktroller: snktroller, CToken: CToken}, NumberV>(`
        #### BorrowCaps

        * "snktroller BorrowCaps cZRX
      `,
      "BorrowCaps",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("CToken", getCTokenV),
      ],
      async (world, {snktroller, CToken}) => {
        return new NumberV(await snktroller.methods.borrowCaps(CToken._address).call());
      }
    )
  ];
}

export async function getsnktrollerValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("snktroller", snktrollerFetchers(), world, event);
}
