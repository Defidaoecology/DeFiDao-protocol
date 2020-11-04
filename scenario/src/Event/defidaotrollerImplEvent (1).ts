import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { snktrollerImpl } from '../Contract/snktrollerImpl';
import { Unitroller } from '../Contract/Unitroller';
import { invoke } from '../Invokation';
import { getAddressV, getArrayV, getEventV, getExpNumberV, getNumberV, getStringV, getCoreValue } from '../CoreValue';
import { ArrayV, AddressV, EventV, NumberV, StringV } from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { buildsnktrollerImpl } from '../Builder/snktrollerImplBuilder';
import { snktrollerErrorReporter } from '../ErrorReporter';
import { getsnktrollerImpl, getsnktrollerImplData, getUnitroller } from '../ContractLookup';
import { verify } from '../Verify';
import { mergeContractABI } from '../Networks';
import { encodedNumber } from '../Encoding';
import { encodeABI } from '../Utils';

async function gensnktrollerImpl(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, snktrollerImpl, snktrollerImplData } = await buildsnktrollerImpl(
    world,
    from,
    params
  );
  world = nextWorld;

  world = addAction(
    world,
    `Added snktroller Implementation (${snktrollerImplData.description}) at address ${snktrollerImpl._address}`,
    snktrollerImplData.invokation
  );

  return world;
}

async function mergeABI(
  world: World,
  from: string,
  snktrollerImpl: snktrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'snktroller', unitroller, unitroller.name, snktrollerImpl.name);
  }

  return world;
}

async function becomeG1(
  world: World,
  from: string,
  snktrollerImpl: snktrollerImpl,
  unitroller: Unitroller,
  priceOracleAddr: string,
  closeFactor: encodedNumber,
  maxAssets: encodedNumber
): Promise<World> {
  let invokation = await invoke(
    world,
    snktrollerImpl.methods._become(unitroller._address, priceOracleAddr, closeFactor, maxAssets, false),
    from,
    snktrollerErrorReporter
  );
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'snktroller', unitroller, unitroller.name, snktrollerImpl.name);
  }

  world = addAction(
    world,
    `Become ${unitroller._address}'s snktroller Impl with priceOracle=${priceOracleAddr},closeFactor=${closeFactor},maxAssets=${maxAssets}`,
    invokation
  );

  return world;
}

// Recome calls `become` on the G1 snktroller, but passes a flag to not modify any of the initialization variables.
async function recome(
  world: World,
  from: string,
  snktrollerImpl: snktrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    snktrollerImpl.methods._become(
      unitroller._address,
      '0x0000000000000000000000000000000000000000',
      0,
      0,
      true
    ),
    from,
    snktrollerErrorReporter
  );

  world = await mergeContractABI(world, 'snktroller', unitroller, unitroller.name, snktrollerImpl.name);

  world = addAction(world, `Recome ${unitroller._address}'s snktroller Impl`, invokation);

  return world;
}

async function becomeG2(
  world: World,
  from: string,
  snktrollerImpl: snktrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    snktrollerImpl.methods._become(unitroller._address),
    from,
    snktrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'snktroller', unitroller, unitroller.name, snktrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s snktroller Impl`, invokation);

  return world;
}

async function becomeG3(
  world: World,
  from: string,
  snktrollerImpl: snktrollerImpl,
  unitroller: Unitroller,
  snkRate: encodedNumber,
  snkMarkets: string[],
  otherMarkets: string[]
): Promise<World> {
  let invokation = await invoke(
    world,
    snktrollerImpl.methods._become(unitroller._address, snkRate, snkMarkets, otherMarkets),
    from,
    snktrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'snktroller', unitroller, unitroller.name, snktrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s snktroller Impl`, invokation);

  return world;
}

async function become(
  world: World,
  from: string,
  snktrollerImpl: snktrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    snktrollerImpl.methods._become(unitroller._address),
    from,
    snktrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'snktroller', unitroller, unitroller.name, snktrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s snktroller Impl`, invokation);

  return world;
}

async function verifysnktrollerImpl(
  world: World,
  snktrollerImpl: snktrollerImpl,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, snktrollerImpl._address);
  }

  return world;
}

export function snktrollerImplCommands() {
  return [
    new Command<{ snktrollerImplParams: EventV }>(
      `
        #### Deploy

        * "snktrollerImpl Deploy ...snktrollerImplParams" - Generates a new snktroller Implementation
          * E.g. "snktrollerImpl Deploy MyScen Scenario"
      `,
      'Deploy',
      [new Arg('snktrollerImplParams', getEventV, { variadic: true })],
      (world, from, { snktrollerImplParams }) => gensnktrollerImpl(world, from, snktrollerImplParams.val)
    ),
    new View<{ snktrollerImplArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "snktrollerImpl <Impl> Verify apiKey:<String>" - Verifies snktroller Implemetation in Etherscan
          * E.g. "snktrollerImpl Verify "myApiKey"
      `,
      'Verify',
      [new Arg('snktrollerImplArg', getStringV), new Arg('apiKey', getStringV)],
      async (world, { snktrollerImplArg, apiKey }) => {
        let [snktrollerImpl, name, data] = await getsnktrollerImplData(world, snktrollerImplArg.val);

        return await verifysnktrollerImpl(world, snktrollerImpl, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
    new Command<{
      unitroller: Unitroller;
      snktrollerImpl: snktrollerImpl;
      priceOracle: AddressV;
      closeFactor: NumberV;
      maxAssets: NumberV;
    }>(
      `
        #### BecomeG1

        * "snktrollerImpl <Impl> BecomeG1 priceOracle:<Number> closeFactor:<Exp> maxAssets:<Number>" - Become the snktroller, if possible.
          * E.g. "snktrollerImpl MyImpl BecomeG1
      `,
      'BecomeG1',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('snktrollerImpl', getsnktrollerImpl),
        new Arg('priceOracle', getAddressV),
        new Arg('closeFactor', getExpNumberV),
        new Arg('maxAssets', getNumberV)
      ],
      (world, from, { unitroller, snktrollerImpl, priceOracle, closeFactor, maxAssets }) =>
        becomeG1(
          world,
          from,
          snktrollerImpl,
          unitroller,
          priceOracle.val,
          closeFactor.encode(),
          maxAssets.encode()
        ),
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      snktrollerImpl: snktrollerImpl;
    }>(
      `
        #### BecomeG2

        * "snktrollerImpl <Impl> BecomeG2" - Become the snktroller, if possible.
          * E.g. "snktrollerImpl MyImpl BecomeG2
      `,
      'BecomeG2',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('snktrollerImpl', getsnktrollerImpl)
      ],
      (world, from, { unitroller, snktrollerImpl }) => becomeG2(world, from, snktrollerImpl, unitroller),
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      snktrollerImpl: snktrollerImpl;
      snkRate: NumberV;
      snkMarkets: ArrayV<AddressV>;
      otherMarkets: ArrayV<AddressV>;
    }>(
      `
        #### BecomeG3

        * "snktrollerImpl <Impl> BecomeG3 <Rate> <snkMarkets> <OtherMarkets>" - Become the snktroller, if possible.
          * E.g. "snktrollerImpl MyImpl BecomeG3 0.1e18 [cDAI, cETH, cUSDC]
      `,
      'BecomeG3',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('snktrollerImpl', getsnktrollerImpl),
        new Arg('snkRate', getNumberV, { default: new NumberV(1e18) }),
        new Arg('snkMarkets', getArrayV(getAddressV),  {default: new ArrayV([]) }),
        new Arg('otherMarkets', getArrayV(getAddressV), { default: new ArrayV([]) })
      ],
      (world, from, { unitroller, snktrollerImpl, snkRate, snkMarkets, otherMarkets }) => {
        return becomeG3(world, from, snktrollerImpl, unitroller, snkRate.encode(), snkMarkets.val.map(a => a.val), otherMarkets.val.map(a => a.val))
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      snktrollerImpl: snktrollerImpl;
    }>(
      `
        #### Become

        * "snktrollerImpl <Impl> Become <Rate> <snkMarkets> <OtherMarkets>" - Become the snktroller, if possible.
          * E.g. "snktrollerImpl MyImpl Become 0.1e18 [cDAI, cETH, cUSDC]
      `,
      'Become',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('snktrollerImpl', getsnktrollerImpl)
      ],
      (world, from, { unitroller, snktrollerImpl }) => {
        return become(world, from, snktrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      snktrollerImpl: snktrollerImpl;
    }>(
      `
        #### MergeABI

        * "snktrollerImpl <Impl> MergeABI" - Merges the ABI, as if it was a become.
          * E.g. "snktrollerImpl MyImpl MergeABI
      `,
      'MergeABI',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('snktrollerImpl', getsnktrollerImpl)
      ],
      (world, from, { unitroller, snktrollerImpl }) => mergeABI(world, from, snktrollerImpl, unitroller),
      { namePos: 1 }
    ),
    new Command<{ unitroller: Unitroller; snktrollerImpl: snktrollerImpl }>(
      `
        #### Recome

        * "snktrollerImpl <Impl> Recome" - Recome the snktroller
          * E.g. "snktrollerImpl MyImpl Recome
      `,
      'Recome',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('snktrollerImpl', getsnktrollerImpl)
      ],
      (world, from, { unitroller, snktrollerImpl }) => recome(world, from, snktrollerImpl, unitroller),
      { namePos: 1 }
    )
  ];
}

export async function processsnktrollerImplEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>('snktrollerImpl', snktrollerImplCommands(), world, event, from);
}
