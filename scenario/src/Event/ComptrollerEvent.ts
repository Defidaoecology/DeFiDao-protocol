import {Event} from '../Event';
import {addAction, describeUser, World} from '../World';
import {decodeCall, getPastEvents} from '../Contract';
import {snktroller} from '../Contract/snktroller';
import {snktrollerImpl} from '../Contract/snktrollerImpl';
import {CToken} from '../Contract/CToken';
import {invoke} from '../Invokation';
import {
  getAddressV,
  getBoolV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getPercentV,
  getStringV,
  getCoreValue
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import {Arg, Command, View, processCommandEvent} from '../Command';
import {buildsnktrollerImpl} from '../Builder/snktrollerImplBuilder';
import {snktrollerErrorReporter} from '../ErrorReporter';
import {getsnktroller, getsnktrollerImpl} from '../ContractLookup';
import {getLiquidity} from '../Value/snktrollerValue';
import {getCTokenV} from '../Value/CTokenValue';
import {encodedNumber} from '../Encoding';
import {encodeABI, rawValues} from "../Utils";

async function gensnktroller(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, snktrollerImpl: snktroller, snktrollerImplData: snktrollerData} = await buildsnktrollerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added snktroller (${snktrollerData.description}) at address ${snktroller._address}`,
    snktrollerData.invokation
  );

  return world;
};

async function setPaused(world: World, from: string, snktroller: snktroller, actionName: string, isPaused: boolean): Promise<World> {
  const pauseMap = {
    "Mint": snktroller.methods._setMintPaused
  };

  if (!pauseMap[actionName]) {
    throw `Cannot find pause function for action "${actionName}"`;
  }

  let invokation = await invoke(world, snktroller[actionName]([isPaused]), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snktroller: set paused for ${actionName} to ${isPaused}`,
    invokation
  );

  return world;
}

async function setMaxAssets(world: World, from: string, snktroller: snktroller, numberOfAssets: NumberV): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setMaxAssets(numberOfAssets.encode()), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Set max assets to ${numberOfAssets.show()}`,
    invokation
  );

  return world;
}

async function setLiquidationIncentive(world: World, from: string, snktroller: snktroller, liquidationIncentive: NumberV): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setLiquidationIncentive(liquidationIncentive.encode()), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Set liquidation incentive to ${liquidationIncentive.show()}`,
    invokation
  );

  return world;
}

async function supportMarket(world: World, from: string, snktroller: snktroller, cToken: CToken): Promise<World> {
  if (world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world.printer.printLine(`Dry run: Supporting market  \`${cToken._address}\``);
    return world;
  }

  let invokation = await invoke(world, snktroller.methods._supportMarket(cToken._address), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Supported market ${cToken.name}`,
    invokation
  );

  return world;
}

async function unlistMarket(world: World, from: string, snktroller: snktroller, cToken: CToken): Promise<World> {
  let invokation = await invoke(world, snktroller.methods.unlist(cToken._address), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Unlisted market ${cToken.name}`,
    invokation
  );

  return world;
}

async function enterMarkets(world: World, from: string, snktroller: snktroller, assets: string[]): Promise<World> {
  let invokation = await invoke(world, snktroller.methods.enterMarkets(assets), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Called enter assets ${assets} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function exitMarket(world: World, from: string, snktroller: snktroller, asset: string): Promise<World> {
  let invokation = await invoke(world, snktroller.methods.exitMarket(asset), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Called exit market ${asset} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setPriceOracle(world: World, from: string, snktroller: snktroller, priceOracleAddr: string): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setPriceOracle(priceOracleAddr), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Set price oracle for to ${priceOracleAddr} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setCollateralFactor(world: World, from: string, snktroller: snktroller, cToken: CToken, collateralFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setCollateralFactor(cToken._address, collateralFactor.encode()), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Set collateral factor for ${cToken.name} to ${collateralFactor.show()}`,
    invokation
  );

  return world;
}

async function setCloseFactor(world: World, from: string, snktroller: snktroller, closeFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setCloseFactor(closeFactor.encode()), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Set close factor to ${closeFactor.show()}`,
    invokation
  );

  return world;
}

async function fastForward(world: World, from: string, snktroller: snktroller, blocks: NumberV): Promise<World> {
  let invokation = await invoke(world, snktroller.methods.fastForward(blocks.encode()), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Fast forward ${blocks.show()} blocks to #${invokation.value}`,
    invokation
  );

  return world;
}

async function sendAny(world: World, from:string, snktroller: snktroller, signature: string, callArgs: string[]): Promise<World> {
  const fnData = encodeABI(world, signature, callArgs);
  await world.web3.eth.sendTransaction({
      to: snktroller._address,
      data: fnData,
      from: from
    })
  return world;
}

async function addsnkMarkets(world: World, from: string, snktroller: snktroller, cTokens: CToken[]): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._addsnkMarkets(cTokens.map(c => c._address)), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Added snk markets ${cTokens.map(c => c.name)}`,
    invokation
  );

  return world;
}

async function dropsnkMarket(world: World, from: string, snktroller: snktroller, cToken: CToken): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._dropsnkMarket(cToken._address), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Drop snk market ${cToken.name}`,
    invokation
  );

  return world;
}

async function refreshsnkSpeeds(world: World, from: string, snktroller: snktroller): Promise<World> {
  let invokation = await invoke(world, snktroller.methods.refreshsnkSpeeds(), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Refreshed snk speeds`,
    invokation
  );

  return world;
}

async function claimsnk(world: World, from: string, snktroller: snktroller, holder: string): Promise<World> {
  let invokation = await invoke(world, snktroller.methods.claimsnk(holder), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snk claimed by ${holder}`,
    invokation
  );

  return world;
}

async function setsnkRate(world: World, from: string, snktroller: snktroller, rate: NumberV): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setsnkRate(rate.encode()), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snk rate set to ${rate.show()}`,
    invokation
  );

  return world;
}

async function printLiquidity(world: World, snktroller: snktroller): Promise<World> {
  let enterEvents = await getPastEvents(world, snktroller, 'Stdsnktroller', 'MarketEntered');
  let addresses = enterEvents.map((event) => event.returnValues['account']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Liquidity:")

  const liquidityMap = await Promise.all(uniq.map(async (address) => {
    let userLiquidity = await getLiquidity(world, snktroller, address);

    return [address, userLiquidity.val];
  }));

  liquidityMap.forEach(([address, liquidity]) => {
    world.printer.printLine(`\t${world.settings.lookupAlias(address)}: ${liquidity / 1e18}e18`)
  });

  return world;
}

async function setPendingAdmin(world: World, from: string, snktroller: snktroller, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setPendingAdmin(newPendingAdmin), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snktroller: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, snktroller: snktroller): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._acceptAdmin(), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snktroller: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function setPauseGuardian(world: World, from: string, snktroller: snktroller, newPauseGuardian: string): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setPauseGuardian(newPauseGuardian), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snktroller: ${describeUser(world, from)} sets pause guardian to ${newPauseGuardian}`,
    invokation
  );

  return world;
}

async function setGuardianPaused(world: World, from: string, snktroller: snktroller, action: string, state: boolean): Promise<World> {
  let fun;
  switch(action){
    case "Transfer":
      fun = snktroller.methods._setTransferPaused
      break;
    case "Seize":
      fun = snktroller.methods._setSeizePaused
      break;
  }
  let invokation = await invoke(world, fun(state), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snktroller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setGuardianMarketPaused(world: World, from: string, snktroller: snktroller, cToken: CToken, action: string, state: boolean): Promise<World> {
  let fun;
  switch(action){
    case "Mint":
      fun = snktroller.methods._setMintPaused
      break;
    case "Borrow":
      fun = snktroller.methods._setBorrowPaused
      break;
  }
  let invokation = await invoke(world, fun(cToken._address, state), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snktroller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setMarketBorrowCaps(world: World, from: string, snktroller: snktroller, cTokens: CToken[], borrowCaps: NumberV[]): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setMarketBorrowCaps(cTokens.map(c => c._address), borrowCaps.map(c => c.encode())), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `Borrow caps on ${cTokens} set to ${borrowCaps}`,
    invokation
  );

  return world;
}

async function setBorrowCapGuardian(world: World, from: string, snktroller: snktroller, newBorrowCapGuardian: string): Promise<World> {
  let invokation = await invoke(world, snktroller.methods._setBorrowCapGuardian(newBorrowCapGuardian), from, snktrollerErrorReporter);

  world = addAction(
    world,
    `snktroller: ${describeUser(world, from)} sets borrow cap guardian to ${newBorrowCapGuardian}`,
    invokation
  );

  return world;
}

export function snktrollerCommands() {
  return [
    new Command<{snktrollerParams: EventV}>(`
        #### Deploy

        * "snktroller Deploy ...snktrollerParams" - Generates a new snktroller (not as Impl)
          * E.g. "snktroller Deploy YesNo"
      `,
      "Deploy",
      [new Arg("snktrollerParams", getEventV, {variadic: true})],
      (world, from, {snktrollerParams}) => gensnktroller(world, from, snktrollerParams.val)
    ),
    new Command<{snktroller: snktroller, action: StringV, isPaused: BoolV}>(`
        #### SetPaused

        * "snktroller SetPaused <Action> <Bool>" - Pauses or unpaused given cToken function
          * E.g. "snktroller SetPaused "Mint" True"
      `,
      "SetPaused",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("action", getStringV),
        new Arg("isPaused", getBoolV)
      ],
      (world, from, {snktroller, action, isPaused}) => setPaused(world, from, snktroller, action.val, isPaused.val)
    ),
    new Command<{snktroller: snktroller, cToken: CToken}>(`
        #### SupportMarket

        * "snktroller SupportMarket <CToken>" - Adds support in the snktroller for the given cToken
          * E.g. "snktroller SupportMarket cZRX"
      `,
      "SupportMarket",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, from, {snktroller, cToken}) => supportMarket(world, from, snktroller, cToken)
    ),
    new Command<{snktroller: snktroller, cToken: CToken}>(`
        #### UnList

        * "snktroller UnList <CToken>" - Mock unlists a given market in tests
          * E.g. "snktroller UnList cZRX"
      `,
      "UnList",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, from, {snktroller, cToken}) => unlistMarket(world, from, snktroller, cToken)
    ),
    new Command<{snktroller: snktroller, cTokens: CToken[]}>(`
        #### EnterMarkets

        * "snktroller EnterMarkets (<CToken> ...)" - User enters the given markets
          * E.g. "snktroller EnterMarkets (cZRX cETH)"
      `,
      "EnterMarkets",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cTokens", getCTokenV, {mapped: true})
      ],
      (world, from, {snktroller, cTokens}) => enterMarkets(world, from, snktroller, cTokens.map((c) => c._address))
    ),
    new Command<{snktroller: snktroller, cToken: CToken}>(`
        #### ExitMarket

        * "snktroller ExitMarket <CToken>" - User exits the given markets
          * E.g. "snktroller ExitMarket cZRX"
      `,
      "ExitMarket",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, from, {snktroller, cToken}) => exitMarket(world, from, snktroller, cToken._address)
    ),
    new Command<{snktroller: snktroller, maxAssets: NumberV}>(`
        #### SetMaxAssets

        * "snktroller SetMaxAssets <Number>" - Sets (or resets) the max allowed asset count
          * E.g. "snktroller SetMaxAssets 4"
      `,
      "SetMaxAssets",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("maxAssets", getNumberV)
      ],
      (world, from, {snktroller, maxAssets}) => setMaxAssets(world, from, snktroller, maxAssets)
    ),
    new Command<{snktroller: snktroller, liquidationIncentive: NumberV}>(`
        #### LiquidationIncentive

        * "snktroller LiquidationIncentive <Number>" - Sets the liquidation incentive
          * E.g. "snktroller LiquidationIncentive 1.1"
      `,
      "LiquidationIncentive",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("liquidationIncentive", getExpNumberV)
      ],
      (world, from, {snktroller, liquidationIncentive}) => setLiquidationIncentive(world, from, snktroller, liquidationIncentive)
    ),
    new Command<{snktroller: snktroller, priceOracle: AddressV}>(`
        #### SetPriceOracle

        * "snktroller SetPriceOracle oracle:<Address>" - Sets the price oracle address
          * E.g. "snktroller SetPriceOracle 0x..."
      `,
      "SetPriceOracle",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("priceOracle", getAddressV)
      ],
      (world, from, {snktroller, priceOracle}) => setPriceOracle(world, from, snktroller, priceOracle.val)
    ),
    new Command<{snktroller: snktroller, cToken: CToken, collateralFactor: NumberV}>(`
        #### SetCollateralFactor

        * "snktroller SetCollateralFactor <CToken> <Number>" - Sets the collateral factor for given cToken to number
          * E.g. "snktroller SetCollateralFactor cZRX 0.1"
      `,
      "SetCollateralFactor",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cToken", getCTokenV),
        new Arg("collateralFactor", getExpNumberV)
      ],
      (world, from, {snktroller, cToken, collateralFactor}) => setCollateralFactor(world, from, snktroller, cToken, collateralFactor)
    ),
    new Command<{snktroller: snktroller, closeFactor: NumberV}>(`
        #### SetCloseFactor

        * "snktroller SetCloseFactor <Number>" - Sets the close factor to given percentage
          * E.g. "snktroller SetCloseFactor 0.2"
      `,
      "SetCloseFactor",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("closeFactor", getPercentV)
      ],
      (world, from, {snktroller, closeFactor}) => setCloseFactor(world, from, snktroller, closeFactor)
    ),
    new Command<{snktroller: snktroller, newPendingAdmin: AddressV}>(`
        #### SetPendingAdmin

        * "snktroller SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the snktroller
          * E.g. "snktroller SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, {snktroller, newPendingAdmin}) => setPendingAdmin(world, from, snktroller, newPendingAdmin.val)
    ),
    new Command<{snktroller: snktroller}>(`
        #### AcceptAdmin

        * "snktroller AcceptAdmin" - Accepts admin for the snktroller
          * E.g. "From Geoff (snktroller AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
      ],
      (world, from, {snktroller}) => acceptAdmin(world, from, snktroller)
    ),
    new Command<{snktroller: snktroller, newPauseGuardian: AddressV}>(`
        #### SetPauseGuardian

        * "snktroller SetPauseGuardian newPauseGuardian:<Address>" - Sets the PauseGuardian for the snktroller
          * E.g. "snktroller SetPauseGuardian Geoff"
      `,
      "SetPauseGuardian",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("newPauseGuardian", getAddressV)
      ],
      (world, from, {snktroller, newPauseGuardian}) => setPauseGuardian(world, from, snktroller, newPauseGuardian.val)
    ),

    new Command<{snktroller: snktroller, action: StringV, isPaused: BoolV}>(`
        #### SetGuardianPaused

        * "snktroller SetGuardianPaused <Action> <Bool>" - Pauses or unpaused given cToken function
        * E.g. "snktroller SetGuardianPaused "Transfer" True"
        `,
        "SetGuardianPaused",
        [
          new Arg("snktroller", getsnktroller, {implicit: true}),
          new Arg("action", getStringV),
          new Arg("isPaused", getBoolV)
        ],
        (world, from, {snktroller, action, isPaused}) => setGuardianPaused(world, from, snktroller, action.val, isPaused.val)
    ),

    new Command<{snktroller: snktroller, cToken: CToken, action: StringV, isPaused: BoolV}>(`
        #### SetGuardianMarketPaused

        * "snktroller SetGuardianMarketPaused <CToken> <Action> <Bool>" - Pauses or unpaused given cToken function
        * E.g. "snktroller SetGuardianMarketPaused cREP "Mint" True"
        `,
        "SetGuardianMarketPaused",
        [
          new Arg("snktroller", getsnktroller, {implicit: true}),
          new Arg("cToken", getCTokenV),
          new Arg("action", getStringV),
          new Arg("isPaused", getBoolV)
        ],
        (world, from, {snktroller, cToken, action, isPaused}) => setGuardianMarketPaused(world, from, snktroller, cToken, action.val, isPaused.val)
    ),

    new Command<{snktroller: snktroller, blocks: NumberV, _keyword: StringV}>(`
        #### FastForward

        * "FastForward n:<Number> Blocks" - Moves the block number forward "n" blocks. Note: in "CTokenScenario" and "snktrollerScenario" the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
          * E.g. "snktroller FastForward 5 Blocks" - Move block number forward 5 blocks.
      `,
      "FastForward",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("blocks", getNumberV),
        new Arg("_keyword", getStringV)
      ],
      (world, from, {snktroller, blocks}) => fastForward(world, from, snktroller, blocks)
    ),
    new View<{snktroller: snktroller}>(`
        #### Liquidity

        * "snktroller Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
      ],
      (world, {snktroller}) => printLiquidity(world, snktroller)
    ),
    new View<{snktroller: snktroller, input: StringV}>(`
        #### Decode

        * "Decode input:<String>" - Prints information about a call to a snktroller contract
      `,
      "Decode",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("input", getStringV)

      ],
      (world, {snktroller, input}) => decodeCall(world, snktroller, input.val)
    ),

    new Command<{snktroller: snktroller, signature: StringV, callArgs: StringV[]}>(`
      #### Send
      * snktroller Send functionSignature:<String> callArgs[] - Sends any transaction to snktroller
      * E.g: snktroller Send "setsnkAddress(address)" (Address snk)
      `,
      "Send",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      (world, from, {snktroller, signature, callArgs}) => sendAny(world, from, snktroller, signature.val, rawValues(callArgs))
    ),
    new Command<{snktroller: snktroller, cTokens: CToken[]}>(`
      #### AddsnkMarkets

      * "snktroller AddsnkMarkets (<Address> ...)" - Makes a market snk-enabled
      * E.g. "snktroller AddsnkMarkets (cZRX cBAT)
      `,
      "AddsnkMarkets",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cTokens", getCTokenV, {mapped: true})
      ],
      (world, from, {snktroller, cTokens}) => addsnkMarkets(world, from, snktroller, cTokens)
     ),
    new Command<{snktroller: snktroller, cToken: CToken}>(`
      #### DropsnkMarket

      * "snktroller DropsnkMarket <Address>" - Makes a market snk
      * E.g. "snktroller DropsnkMarket cZRX
      `,
      "DropsnkMarket",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, from, {snktroller, cToken}) => dropsnkMarket(world, from, snktroller, cToken)
     ),

    new Command<{snktroller: snktroller}>(`
      #### RefreshsnkSpeeds

      * "snktroller RefreshsnkSpeeds" - Recalculates all the snk market speeds
      * E.g. "snktroller RefreshsnkSpeeds
      `,
      "RefreshsnkSpeeds",
      [
        new Arg("snktroller", getsnktroller, {implicit: true})
      ],
      (world, from, {snktroller}) => refreshsnkSpeeds(world, from, snktroller)
    ),
    new Command<{snktroller: snktroller, holder: AddressV}>(`
      #### Claimsnk

      * "snktroller Claimsnk <holder>" - Claims snk
      * E.g. "snktroller Claimsnk Geoff
      `,
      "Claimsnk",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("holder", getAddressV)
      ],
      (world, from, {snktroller, holder}) => claimsnk(world, from, snktroller, holder.val)
    ),
    new Command<{snktroller: snktroller, rate: NumberV}>(`
      #### SetsnkRate

      * "snktroller SetsnkRate <rate>" - Sets snk rate
      * E.g. "snktroller SetsnkRate 1e18
      `,
      "SetsnkRate",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("rate", getNumberV)
      ],
      (world, from, {snktroller, rate}) => setsnkRate(world, from, snktroller, rate)
    ),
    new Command<{snktroller: snktroller, cTokens: CToken[], borrowCaps: NumberV[]}>(`
      #### SetMarketBorrowCaps

      * "snktroller SetMarketBorrowCaps (<CToken> ...) (<borrowCap> ...)" - Sets Market Borrow Caps
      * E.g "snktroller SetMarketBorrowCaps (cZRX cUSDC) (10000.0e18, 1000.0e6)
      `,
      "SetMarketBorrowCaps",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("cTokens", getCTokenV, {mapped: true}),
        new Arg("borrowCaps", getNumberV, {mapped: true})
      ],
      (world, from, {snktroller,cTokens,borrowCaps}) => setMarketBorrowCaps(world, from, snktroller, cTokens, borrowCaps)
    ),
    new Command<{snktroller: snktroller, newBorrowCapGuardian: AddressV}>(`
        #### SetBorrowCapGuardian

        * "snktroller SetBorrowCapGuardian newBorrowCapGuardian:<Address>" - Sets the Borrow Cap Guardian for the snktroller
          * E.g. "snktroller SetBorrowCapGuardian Geoff"
      `,
      "SetBorrowCapGuardian",
      [
        new Arg("snktroller", getsnktroller, {implicit: true}),
        new Arg("newBorrowCapGuardian", getAddressV)
      ],
      (world, from, {snktroller, newBorrowCapGuardian}) => setBorrowCapGuardian(world, from, snktroller, newBorrowCapGuardian.val)
    )
  ];
}

export async function processsnktrollerEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("snktroller", snktrollerCommands(), world, event, from);
}
