import { Event } from '../Event';
import { World } from '../World';
import { snk } from '../Contract/snk';
import {
  getAddressV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { getsnk } from '../ContractLookup';

export function snkFetchers() {
  return [
    new Fetcher<{ snk: snk }, AddressV>(`
        #### Address

        * "<snk> Address" - Returns the address of snk token
          * E.g. "snk Address"
      `,
      "Address",
      [
        new Arg("snk", getsnk, { implicit: true })
      ],
      async (world, { snk }) => new AddressV(snk._address)
    ),

    new Fetcher<{ snk: snk }, StringV>(`
        #### Name

        * "<snk> Name" - Returns the name of the snk token
          * E.g. "snk Name"
      `,
      "Name",
      [
        new Arg("snk", getsnk, { implicit: true })
      ],
      async (world, { snk }) => new StringV(await snk.methods.name().call())
    ),

    new Fetcher<{ snk: snk }, StringV>(`
        #### Symbol

        * "<snk> Symbol" - Returns the symbol of the snk token
          * E.g. "snk Symbol"
      `,
      "Symbol",
      [
        new Arg("snk", getsnk, { implicit: true })
      ],
      async (world, { snk }) => new StringV(await snk.methods.symbol().call())
    ),

    new Fetcher<{ snk: snk }, NumberV>(`
        #### Decimals

        * "<snk> Decimals" - Returns the number of decimals of the snk token
          * E.g. "snk Decimals"
      `,
      "Decimals",
      [
        new Arg("snk", getsnk, { implicit: true })
      ],
      async (world, { snk }) => new NumberV(await snk.methods.decimals().call())
    ),

    new Fetcher<{ snk: snk }, NumberV>(`
        #### TotalSupply

        * "snk TotalSupply" - Returns snk token's total supply
      `,
      "TotalSupply",
      [
        new Arg("snk", getsnk, { implicit: true })
      ],
      async (world, { snk }) => new NumberV(await snk.methods.totalSupply().call())
    ),

    new Fetcher<{ snk: snk, address: AddressV }, NumberV>(`
        #### TokenBalance

        * "snk TokenBalance <Address>" - Returns the snk token balance of a given address
          * E.g. "snk TokenBalance Geoff" - Returns Geoff's snk balance
      `,
      "TokenBalance",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      async (world, { snk, address }) => new NumberV(await snk.methods.balanceOf(address.val).call())
    ),

    new Fetcher<{ snk: snk, owner: AddressV, spender: AddressV }, NumberV>(`
        #### Allowance

        * "snk Allowance owner:<Address> spender:<Address>" - Returns the snk allowance from owner to spender
          * E.g. "snk Allowance Geoff Torrey" - Returns the snk allowance of Geoff to Torrey
      `,
      "Allowance",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV)
      ],
      async (world, { snk, owner, spender }) => new NumberV(await snk.methods.allowance(owner.val, spender.val).call())
    ),

    new Fetcher<{ snk: snk, account: AddressV }, NumberV>(`
        #### GetCurrentVotes

        * "snk GetCurrentVotes account:<Address>" - Returns the current snk votes balance for an account
          * E.g. "snk GetCurrentVotes Geoff" - Returns the current snk vote balance of Geoff
      `,
      "GetCurrentVotes",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { snk, account }) => new NumberV(await snk.methods.getCurrentVotes(account.val).call())
    ),

    new Fetcher<{ snk: snk, account: AddressV, blockNumber: NumberV }, NumberV>(`
        #### GetPriorVotes

        * "snk GetPriorVotes account:<Address> blockBumber:<Number>" - Returns the current snk votes balance at given block
          * E.g. "snk GetPriorVotes Geoff 5" - Returns the snk vote balance for Geoff at block 5
      `,
      "GetPriorVotes",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("blockNumber", getNumberV),
      ],
      async (world, { snk, account, blockNumber }) => new NumberV(await snk.methods.getPriorVotes(account.val, blockNumber.encode()).call())
    ),

    new Fetcher<{ snk: snk, account: AddressV }, NumberV>(`
        #### GetCurrentVotesBlock

        * "snk GetCurrentVotesBlock account:<Address>" - Returns the current snk votes checkpoint block for an account
          * E.g. "snk GetCurrentVotesBlock Geoff" - Returns the current snk votes checkpoint block for Geoff
      `,
      "GetCurrentVotesBlock",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { snk, account }) => {
        const numCheckpoints = Number(await snk.methods.numCheckpoints(account.val).call());
        const checkpoint = await snk.methods.checkpoints(account.val, numCheckpoints - 1).call();

        return new NumberV(checkpoint.fromBlock);
      }
    ),

    new Fetcher<{ snk: snk, account: AddressV }, NumberV>(`
        #### VotesLength

        * "snk VotesLength account:<Address>" - Returns the snk vote checkpoint array length
          * E.g. "snk VotesLength Geoff" - Returns the snk vote checkpoint array length of Geoff
      `,
      "VotesLength",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { snk, account }) => new NumberV(await snk.methods.numCheckpoints(account.val).call())
    ),

    new Fetcher<{ snk: snk, account: AddressV }, ListV>(`
        #### AllVotes

        * "snk AllVotes account:<Address>" - Returns information about all votes an account has had
          * E.g. "snk AllVotes Geoff" - Returns the snk vote checkpoint array
      `,
      "AllVotes",
      [
        new Arg("snk", getsnk, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { snk, account }) => {
        const numCheckpoints = Number(await snk.methods.numCheckpoints(account.val).call());
        const checkpoints = await Promise.all(new Array(numCheckpoints).fill(undefined).map(async (_, i) => {
          const {fromBlock, votes} = await snk.methods.checkpoints(account.val, i).call();

          return new StringV(`Block ${fromBlock}: ${votes} vote${votes !== 1 ? "s" : ""}`);
        }));

        return new ListV(checkpoints);
      }
    )
  ];
}

export async function getsnkValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("snk", snkFetchers(), world, event);
}
