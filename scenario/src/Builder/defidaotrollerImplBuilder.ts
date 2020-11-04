import { Event } from '../Event';
import { addAction, World } from '../World';
import { snktrollerImpl } from '../Contract/snktrollerImpl';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const snktrollerG1Contract = getContract('snktrollerG1');
const snktrollerScenarioG1Contract = getTestContract('snktrollerScenarioG1');

const snktrollerG2Contract = getContract('snktrollerG2');
const snktrollerScenarioG2Contract = getContract('snktrollerScenarioG2');

const snktrollerG3Contract = getContract('snktrollerG3');
const snktrollerScenarioG3Contract = getContract('snktrollerScenarioG3');

const snktrollerG4Contract = getContract('snktrollerG4');
const snktrollerScenarioG4Contract = getContract('snktrollerScenarioG4');

const snktrollerScenarioContract = getTestContract('snktrollerScenario');
const snktrollerContract = getContract('snktroller');

const snktrollerBorkedContract = getTestContract('snktrollerBorked');

export interface snktrollerImplData {
  invokation: Invokation<snktrollerImpl>;
  name: string;
  contract: string;
  description: string;
}

export async function buildsnktrollerImpl(
  world: World,
  from: string,
  event: Event
): Promise<{ world: World; snktrollerImpl: snktrollerImpl; snktrollerImplData: snktrollerImplData }> {
  const fetchers = [
    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### ScenarioG1

        * "ScenarioG1 name:<String>" - The snktroller Scenario for local testing (G1)
          * E.g. "snktrollerImpl Deploy ScenarioG1 MyScen"
      `,
      'ScenarioG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await snktrollerScenarioG1Contract.deploy<snktrollerImpl>(world, from, []),
        name: name.val,
        contract: 'snktrollerScenarioG1',
        description: 'ScenarioG1 snktroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### ScenarioG2

        * "ScenarioG2 name:<String>" - The snktroller Scenario for local testing (G2)
          * E.g. "snktrollerImpl Deploy ScenarioG2 MyScen"
      `,
      'ScenarioG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await snktrollerScenarioG2Contract.deploy<snktrollerImpl>(world, from, []),
        name: name.val,
        contract: 'snktrollerScenarioG2Contract',
        description: 'ScenarioG2 snktroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### ScenarioG3

        * "ScenarioG3 name:<String>" - The snktroller Scenario for local testing (G3)
          * E.g. "snktrollerImpl Deploy ScenarioG3 MyScen"
      `,
      'ScenarioG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await snktrollerScenarioG3Contract.deploy<snktrollerImpl>(world, from, []),
        name: name.val,
        contract: 'snktrollerScenarioG3Contract',
        description: 'ScenarioG3 snktroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### Scenario

        * "Scenario name:<String>" - The snktroller Scenario for local testing
          * E.g. "snktrollerImpl Deploy Scenario MyScen"
      `,
      'Scenario',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await snktrollerScenarioContract.deploy<snktrollerImpl>(world, from, []),
        name: name.val,
        contract: 'snktrollerScenario',
        description: 'Scenario snktroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### StandardG1

        * "StandardG1 name:<String>" - The standard generation 1 snktroller contract
          * E.g. "snktroller Deploy StandardG1 MyStandard"
      `,
      'StandardG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await snktrollerG1Contract.deploy<snktrollerImpl>(world, from, []),
          name: name.val,
          contract: 'snktrollerG1',
          description: 'StandardG1 snktroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### StandardG2

        * "StandardG2 name:<String>" - The standard generation 2 snktroller contract
          * E.g. "snktroller Deploy StandardG2 MyStandard"
      `,
      'StandardG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await snktrollerG2Contract.deploy<snktrollerImpl>(world, from, []),
          name: name.val,
          contract: 'snktrollerG2',
          description: 'StandardG2 snktroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### StandardG3

        * "StandardG3 name:<String>" - The standard generation 3 snktroller contract
          * E.g. "snktroller Deploy StandardG3 MyStandard"
      `,
      'StandardG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await snktrollerG3Contract.deploy<snktrollerImpl>(world, from, []),
          name: name.val,
          contract: 'snktrollerG3',
          description: 'StandardG3 snktroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### StandardG4

        * "StandardG4 name:<String>" - The standard generation 4 snktroller contract
          * E.g. "snktroller Deploy StandardG4 MyStandard"
      `,
      'StandardG4',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await snktrollerG4Contract.deploy<snktrollerImpl>(world, from, []),
          name: name.val,
          contract: 'snktrollerG4',
          description: 'StandardG4 snktroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### Standard

        * "Standard name:<String>" - The standard snktroller contract
          * E.g. "snktroller Deploy Standard MyStandard"
      `,
      'Standard',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await snktrollerContract.deploy<snktrollerImpl>(world, from, []),
          name: name.val,
          contract: 'snktroller',
          description: 'Standard snktroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### Borked

        * "Borked name:<String>" - A Borked snktroller for testing
          * E.g. "snktrollerImpl Deploy Borked MyBork"
      `,
      'Borked',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await snktrollerBorkedContract.deploy<snktrollerImpl>(world, from, []),
        name: name.val,
        contract: 'snktrollerBorked',
        description: 'Borked snktroller Impl'
      })
    ),
    new Fetcher<{ name: StringV }, snktrollerImplData>(
      `
        #### Default

        * "name:<String>" - The standard snktroller contract
          * E.g. "snktrollerImpl Deploy MyDefault"
      `,
      'Default',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        if (world.isLocalNetwork()) {
          // Note: we're going to use the scenario contract as the standard deployment on local networks
          return {
            invokation: await snktrollerScenarioContract.deploy<snktrollerImpl>(world, from, []),
            name: name.val,
            contract: 'snktrollerScenario',
            description: 'Scenario snktroller Impl'
          };
        } else {
          return {
            invokation: await snktrollerContract.deploy<snktrollerImpl>(world, from, []),
            name: name.val,
            contract: 'snktroller',
            description: 'Standard snktroller Impl'
          };
        }
      },
      { catchall: true }
    )
  ];

  let snktrollerImplData = await getFetcherValue<any, snktrollerImplData>(
    'DeploysnktrollerImpl',
    fetchers,
    world,
    event
  );
  let invokation = snktrollerImplData.invokation;
  delete snktrollerImplData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const snktrollerImpl = invokation.value!;

  world = await storeAndSaveContract(world, snktrollerImpl, snktrollerImplData.name, invokation, [
    {
      index: ['snktroller', snktrollerImplData.name],
      data: {
        address: snktrollerImpl._address,
        contract: snktrollerImplData.contract,
        description: snktrollerImplData.description
      }
    }
  ]);

  return { world, snktrollerImpl, snktrollerImplData };
}
