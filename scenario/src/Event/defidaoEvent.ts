import { Event } from '../Event';
import { addAction, World, describeUser } from '../World';
import { snk, snkScenario } from '../Contract/snk';
import { buildsnk } from '../Builder/snkBuilder';
import { invoke } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getNumberV,
  getStringV,
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, processCommandEvent, View } from '../Command';
import { getsnk } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';
import { verify } from '../Verify';
import { encodedNumber } from '../Encoding';

async function gensnk(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, snk, tokenData } = await buildsnk(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed snk (${snk.name}) to address ${snk._address}`,
    tokenData.invokation
  );

  return world;
}

async function verifysnk(world: World, snk: snk, apiKey: string, modelName: string, contractName: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, modelName, contractName, snk._address);
  }

  return world;
}

async function approve(world: World, from: string, snk: snk, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, snk.methods.approve(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Approved snk token for ${from} of ${amount.show()}`,
    invokation
  );

  return world;
}

async function transfer(world: World, from: string, snk: snk, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, snk.methods.transfer(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} snk tokens from ${from} to ${address}`,
    invokation
  );

  return world;
}

async function transferFrom(world: World, from: string, snk: snk, owner: string, spender: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, snk.methods.transferFrom(owner, spender, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `"Transferred from" ${amount.show()} snk tokens from ${owner} to ${spender}`,
    invokation
  );

  return world;
}

async function transferScenario(world: World, from: string, snk: snkScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, snk.methods.transferScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} snk tokens from ${from} to ${addresses}`,
    invokation
  );

  return world;
}

async function transferFromScenario(world: World, from: string, snk: snkScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, snk.methods.transferFromScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} snk tokens from ${addresses} to ${from}`,
    invokation
  );

  return world;
}

async function delegate(world: World, from: string, snk: snk, account: string): Promise<World> {
  let invokation = await invoke(world, snk.methods.delegate(account), from, NoErrorReporter);

  world = addAction(
    world,
    `"Delegated from" ${from} to ${account}`,
    invokation
  );

  return world;
}

async function setBlockNumber(
  world: World,
  from: string,
  snk: snk,
  blockNumber: NumberV
): Promise<World> {
  return addAction(
    world,
    `Set snk blockNumber to ${blockNumber.show()}`,
    await invoke(world, snk.methods.setBlockNumber(blockNumber.encode()), from)
  );
}

export function snkCommands() {
  return [
    new Command<{ params: EventV }>(`
        #### Deploy

        * "Deploy ...params" - Generates a new snk token
          * E.g. "snk Deploy"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => gensnk(world, from, params.val)
    ),

    new View<{ snk: snk, apiKey: StringV, contractName: StringV }>(`
        #### Verify

        * "<snk> Verify apiKey:<String> contractName:<String>=snk" - Verifies snk token in Etherscan
          * E.g. "snk Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("apiKey", getStringV),
        new Arg("contractName", getStringV, { default: new StringV("snk") })
      ],
      async (world, { snk, apiKey, contractName }) => {
        return await verifysnk(world, snk, apiKey.val, snk.name, contractName.val)
      }
    ),

    new Command<{ snk: snk, spender: AddressV, amount: NumberV }>(`
        #### Approve

        * "snk Approve spender:<Address> <Amount>" - Adds an allowance between user and address
          * E.g. "snk Approve Geoff 1.0e18"
      `,
      "Approve",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { snk, spender, amount }) => {
        return approve(world, from, snk, spender.val, amount)
      }
    ),

    new Command<{ snk: snk, recipient: AddressV, amount: NumberV }>(`
        #### Transfer

        * "snk Transfer recipient:<User> <Amount>" - Transfers a number of tokens via "transfer" as given user to recipient (this does not depend on allowance)
          * E.g. "snk Transfer Torrey 1.0e18"
      `,
      "Transfer",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { snk, recipient, amount }) => transfer(world, from, snk, recipient.val, amount)
    ),

    new Command<{ snk: snk, owner: AddressV, spender: AddressV, amount: NumberV }>(`
        #### TransferFrom

        * "snk TransferFrom owner:<User> spender:<User> <Amount>" - Transfers a number of tokens via "transfeFrom" to recipient (this depends on allowances)
          * E.g. "snk TransferFrom Geoff Torrey 1.0e18"
      `,
      "TransferFrom",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { snk, owner, spender, amount }) => transferFrom(world, from, snk, owner.val, spender.val, amount)
    ),

    new Command<{ snk: snkScenario, recipients: AddressV[], amount: NumberV }>(`
        #### TransferScenario

        * "snk TransferScenario recipients:<User[]> <Amount>" - Transfers a number of tokens via "transfer" to the given recipients (this does not depend on allowance)
          * E.g. "snk TransferScenario (Jared Torrey) 10"
      `,
      "TransferScenario",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("recipients", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { snk, recipients, amount }) => transferScenario(world, from, snk, recipients.map(recipient => recipient.val), amount)
    ),

    new Command<{ snk: snkScenario, froms: AddressV[], amount: NumberV }>(`
        #### TransferFromScenario

        * "snk TransferFromScenario froms:<User[]> <Amount>" - Transfers a number of tokens via "transferFrom" from the given users to msg.sender (this depends on allowance)
          * E.g. "snk TransferFromScenario (Jared Torrey) 10"
      `,
      "TransferFromScenario",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("froms", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { snk, froms, amount }) => transferFromScenario(world, from, snk, froms.map(_from => _from.val), amount)
    ),

    new Command<{ snk: snk, account: AddressV }>(`
        #### Delegate

        * "snk Delegate account:<Address>" - Delegates votes to a given account
          * E.g. "snk Delegate Torrey"
      `,
      "Delegate",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, from, { snk, account }) => delegate(world, from, snk, account.val)
    ),
    new Command<{ snk: snk, blockNumber: NumberV }>(`
      #### SetBlockNumber

      * "SetBlockNumber <Seconds>" - Sets the blockTimestamp of the snk Harness
      * E.g. "snk SetBlockNumber 500"
      `,
        'SetBlockNumber',
        [new Arg('snk', getsnk, { implicit: true }), new Arg('blockNumber', getNumberV)],
        (world, from, { snk, blockNumber }) => setBlockNumber(world, from, snk, blockNumber)
      )
  ];
}

export async function processsnkEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("snk", snkCommands(), world, event, from);
}
