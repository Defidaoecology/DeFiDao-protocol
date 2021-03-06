const {
  makeCToken,
} = require('../Utils/DeFiDao');


describe('CsnkLikeDelegate', function () {
  describe("_delegatesnkLikeTo", () => {
    it("does not delegate if not the admin", async () => {
      const [root, a1] = saddle.accounts;
      const cToken = await makeCToken({kind: 'csnk'});
      await expect(send(cToken, '_delegatesnkLikeTo', [a1], {from: a1})).rejects.toRevert('revert only the admin may set the snk-like delegate');
    });

    it("delegates successfully if the admin", async () => {
      const [root, a1] = saddle.accounts, amount = 1;
      const csnk = await makeCToken({kind: 'csnk'}), snk = csnk.underlying;
      const tx1 = await send(csnk, '_delegatesnkLikeTo', [a1]);
      const tx2 = await send(snk, 'transfer', [csnk._address, amount]);
      await expect(await call(snk, 'getCurrentVotes', [a1])).toEqualNumber(amount);
    });
  });
});