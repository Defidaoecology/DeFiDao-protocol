import { Event } from '../Event';
import { World, addAction } from '../World';
import { snk, snkScenario } from '../Contract/snk';
import { Invokation } from '../Invokation';
import { getAddressV } from '../CoreValue';
import { StringV, AddressV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract } from '../Contract';

const snkContract = getContract('snk');
const snkScenarioContract = getContract('snkScenario');

export interface TokenData {
  invokation: Invokation<snk>;
  contract: string;
  address?: string;
  symbol: string;
  name: string;
  decimals?: number;
}

export async function buildsnk(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; snk: snk; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Scenario

      * "snk Deploy Scenario account:<Address>" - Deploys Scenario snk Token
        * E.g. "snk Deploy Scenario Geoff"
    `,
      'Scenario',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        return {
          invokation: await snkScenarioContract.deploy<snkScenario>(world, from, [account.val]),
          contract: 'snkScenario',
          symbol: 'snk',
          name: 'DeFiDao Governance Token',
          decimals: 18
        };
      }
    ),

    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### snk

      * "snk Deploy account:<Address>" - Deploys snk Token
        * E.g. "snk Deploy Geoff"
    `,
      'snk',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        if (world.isLocalNetwork()) {
          return {
            invokation: await snkScenarioContract.deploy<snkScenario>(world, from, [account.val]),
            contract: 'snkScenario',
            symbol: 'snk',
            name: 'DeFiDao Governance Token',
            decimals: 18
          };
        } else {
          return {
            invokation: await snkContract.deploy<snk>(world, from, [account.val]),
            contract: 'snk',
            symbol: 'snk',
            name: 'DeFiDao Governance Token',
            decimals: 18
          };
        }
      },
      { catchall: true }
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("Deploysnk", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const snk = invokation.value!;
  tokenData.address = snk._address;

  world = await storeAndSaveContract(
    world,
    snk,
    'snk',
    invokation,
    [
      { index: ['snk'], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  tokenData.invokation = invokation;

  return { world, snk, tokenData };
}
