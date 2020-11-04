import {Event} from '../Event';
import {World} from '../World';
import {snktrollerImpl} from '../Contract/snktrollerImpl';
import {
  getAddressV
} from '../CoreValue';
import {
  AddressV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getsnktrollerImpl} from '../ContractLookup';

export async function getsnktrollerImplAddress(world: World, snktrollerImpl: snktrollerImpl): Promise<AddressV> {
  return new AddressV(snktrollerImpl._address);
}

export function snktrollerImplFetchers() {
  return [
    new Fetcher<{snktrollerImpl: snktrollerImpl}, AddressV>(`
        #### Address

        * "snktrollerImpl Address" - Returns address of snktroller implementation
      `,
      "Address",
      [new Arg("snktrollerImpl", getsnktrollerImpl)],
      (world, {snktrollerImpl}) => getsnktrollerImplAddress(world, snktrollerImpl),
      {namePos: 1}
    )
  ];
}

export async function getsnktrollerImplValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("snktrollerImpl", snktrollerImplFetchers(), world, event);
}
