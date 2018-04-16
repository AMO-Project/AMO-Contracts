const AMOCoin = artifacts.require("./AMOCoin.sol");
const AMOCoinSale = artifacts.require("./AMOCoinSale.sol");

contract("AMO Coin Basic Test", (accounts) => {
  const owner = accounts[0];
  const admin = accounts[1];
  const fund = accounts[2];
  const user = accounts[3];

  let token = null;
  let sale = null

  beforeEach("setup contract for each test", async () => {
    token = await AMOCoin.new(admin, { from: owner });
    sale = await AMOCoinSale.new(
      fund, token.address, { from: owner }
    );
    await token.setTokenSaleAmount(sale.address, 0);
  });

  it("contract admin address should be set corretly", async() => {
    let checkAddr = await token.adminAddr();
    assert.equal(checkAddr, admin);
  });

  it("transferEnabled should change after calling enableTransfer/disableTransfer",
    async () => {
    let transferFlag;
    transferFlag = await token.transferEnabled();
    assert.equal(transferFlag, false);

    await token.enableTransfer({ from: owner });
    transferFlag = await token.transferEnabled();
    assert.equal(transferFlag, true);

    await token.disableTransfer({ from: owner });
    transferFlag = await token.transferEnabled();
    assert.equal(transferFlag, false);
  });

  it("only owner can call enableTransfer", async () => {
    try {
      await token.enableTransfer({ from: user });
      assert(false);
    } catch(err) {
      assert(err);
    }

    try {
      await token.enableTransfer({ from: admin });
      assert(false);
    } catch(err) {
      assert(err);
    }
  });
});


contract("AMO Coin Transfer Test", (accounts) => {
  const owner = accounts[0];
  const admin = accounts[1];
  const fund = accounts[2];
  const user = accounts[3];

  let token = null;
  let sale = null

  beforeEach("setup contract for each test", async () => {
    token = await AMOCoin.new(admin, { from: owner });
    sale = await AMOCoinSale.new(
      fund, token.address, { from: owner }
    );
  });

  it("calling transfer is available only when transferEnabled is true",
    async () => {
    try {
      await token.transfer(user, 10, { from: user });
      assert(false);
    } catch(err) {
      assert(err);
    }
  });

  it("calling transfer is available only when destination is valid",
    async () => {
    try {
      await token.enableTransfer({ from: owner });
      await token.transfer(0x0, 10);
      assert(false);
    } catch(err) {
      assert(err);
    }
  });

  it("balance of destination should be same as transfered value", async () => {
    await token.enableTransfer({ from: owner });
    await token.transfer(user, 10, { from: owner });
    const userBalance = (await token.balanceOf(user)).toNumber();
    assert.equal(userBalance, 10);
  });

  it("accounts' balances after calling transferFrom should be correct",
    async () => {
    await token.enableTransfer({ from: owner });

    const initialBalance = (await token.balanceOf(owner)).toNumber();

    await token.transferFrom(owner, user, 100, {from: admin});

    const finalBalance = (await token.balanceOf(owner)).toNumber();
    const userBalance = (await token.balanceOf(user)).toNumber();

    assert.equal(initialBalance - 100, finalBalance);
    assert.equal(userBalance, 100);
  });

  it("user cannot tranfer token when transferEnabled is false", async () => {
    await token.transferFrom(owner, user, 100, {from: admin});

    try {
      await token.transfer(accounts[4], 100, {from: user});
      assert(false);
    } catch(err) {
      assert(err);
    }
  });

  it("user can tranfer token after transferEnabled is true", async () => {
    await token.transferFrom(owner, user, 100, {from: admin});

    await token.enableTransfer({ from: owner });

    await token.transfer(accounts[4], 100, {from: user});
    const balance = (await token.balanceOf(accounts[4])).toNumber();

    assert.equal(balance, 100);

  });


});
contract("AMO Coin Lock/Unlock Test", (accounts) => {
  const owner = accounts[0];
  const admin = accounts[1];
  const fund = accounts[2];
  const user1 = accounts[3];
  const user2 = accounts[4];
  const user3 = accounts[5];


  let token = null;
  let sale = null;

  beforeEach("setup contract for each test", async () => {
    token = await AMOCoin.new(admin, { from: owner });
    sale = await AMOCoinSale.new(
      fund, token.address, { from: owner }
    );
  });

  it("only onwer can lock accounts", async() => {
    try {
      await token.lockAccount(user1, 50, { from: user1 });
      assert(false);
    } catch(err) {
      assert(err);
    }

    await token.lockAccount(user1, 50, { from: owner });
  });

  it("only onwer can unlock accounts", async() => {
    await token.lockAccount(user1, 50, { from: owner });

    try {
      await token.unlockAccount(user1, { from: user1 });
      assert(false);
    } catch(err) {
      assert(err);
    }

    await token.unlockAccount(user1, { from: owner });
  });

  it("locked accounts can transfer tokens only less than allowed amount",
    async () => {
    await token.transferFrom(owner, user1, 100, {from: admin});
    await token.transferFrom(owner, user2, 200, {from: admin});

    await token.enableTransfer({ from: owner });

    await token.lockAccount(user1, 50, { from: owner });
    await token.lockAccount(user2, 100, { from: owner });

    try {
      await token.transfer(user3, 60, {from: user1});
      assert(false);
    } catch(err) {
      assert(err);
    }

    await token.transfer(user3, 50, {from: user1});

    try {
      await token.transfer(user3, 101, {from: user2});
      assert(false);
    } catch(err) {
      assert(err);
    }

    await token.transfer(user3, 100, {from: user2});
  });

  it("locked amount can be updated", async () => {
    await token.transferFrom(owner, user1, 100, {from: admin});

    await token.enableTransfer({ from: owner });
    await token.lockAccount(user1, 50, { from: owner });

    try {
      await token.transfer(user2, 60, {from: user1});
      assert(false);
    } catch(err) {
      assert(err);
    }

    await token.transfer(user2, 50, {from: user1});

    await token.lockAccount(user1, 20, { from: owner });

    try {
      await token.transfer(user2, 40, {from: user1});
      assert(false);
    } catch(err) {
      assert(err);
    }

    await token.transfer(user2, 30, {from: user1});
  });

  it("unlocked account can trasfer whole token", async() => {
    await token.transferFrom(owner, user1, 100, {from: admin});

    await token.enableTransfer({ from: owner });
    await token.lockAccount(user1, 50, { from: owner });

    try {
      await token.transfer(user2, 60, {from: user1});
      assert(false);
    } catch(err) {
      assert(err);
    }

    await token.unlockAccount(user1, { from: owner });
    await token.transfer(user2, 100, { from: user1 });
  });
});
