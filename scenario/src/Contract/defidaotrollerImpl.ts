import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { encodedNumber } from '../Encoding';

interface snktrollerImplMethods {
  _become(
    snktroller: string,
    priceOracle?: string,
    maxAssets?: encodedNumber,
    closeFactor?: encodedNumber,
    reinitializing?: boolean
  ): Sendable<string>;

  _become(
    snktroller: string,
    snkRate: encodedNumber,
    snkMarkets: string[],
    otherMarkets: string[]
  ): Sendable<string>;
}

export interface snktrollerImpl extends Contract {
  methods: snktrollerImplMethods;
}
