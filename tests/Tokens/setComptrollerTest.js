const {
  makesnktroller,
  makeCToken
} = require('../Utils/DeFiDao');

describe('CToken', function () {
  let root, accounts;
  let cToken, oldsnktroller, newsnktroller;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    cToken = await makeCToken();
    oldsnktroller = cToken.snktroller;
    newsnktroller = await makesnktroller();
    expect(newsnktroller._address).not.toEqual(oldsnktroller._address);
  });

  describe('_setsnktroller', () => {
    it("should fail if called by non-admin", async () => {
      expect(
        await send(cToken, '_setsnktroller', [newsnktroller._address], { from: accounts[0] })
      ).toHaveTokenFailure('UNAUTHORIZED', 'SET_snkTROLLER_OWNER_CHECK');
      expect(await call(cToken, 'snktroller')).toEqual(oldsnktroller._address);
    });

    it("reverts if passed a contract that doesn't implement issnktroller", async () => {
      await expect(send(cToken, '_setsnktroller', [cToken.underlying._address])).rejects.toRevert("revert");
      expect(await call(cToken, 'snktroller')).toEqual(oldsnktroller._address);
    });

    it("reverts if passed a contract that implements issnktroller as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badsnktroller = await makesnktroller({ kind: 'false-marker' });
      await expect(send(cToken, '_setsnktroller', [badsnktroller._address])).rejects.toRevert("revert marker method returned false");
      expect(await call(cToken, 'snktroller')).toEqual(oldsnktroller._address);
    });

    it("updates snktroller and emits log on success", async () => {
      const result = await send(cToken, '_setsnktroller', [newsnktroller._address]);
      expect(result).toSucceed();
      expect(result).toHaveLog('Newsnktroller', {
        oldsnktroller: oldsnktroller._address,
        newsnktroller: newsnktroller._address
      });
      expect(await call(cToken, 'snktroller')).toEqual(newsnktroller._address);
    });
  });
});
