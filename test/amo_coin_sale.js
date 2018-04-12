
const AMOCoin = artifacts.require("AMOCoin.sol");
const AMOCoinSale = artifacts.require("AMOCoinSale.sol");

contract("AMO Coin Sale deploy test", (accounts) => {
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

  it("AMO Coin owner should be same with owner", async () => {
    const tokenOwner = await token.owner();
    assert.equal(tokenOwner, owner);
  });

  it("AMO Coin Sale owner should be same with owner", async () => {
    const saleOwner = await sale.owner();
    assert.equal(saleOwner, owner);
  });
});

contract("AMO Coin Sale stage & round test", (accounts) => {
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

  it("only owner can change stage and round", async () => {
    try {
      await sale.setUpSale(0, 0, 0, 0, 0, { from: user });
      assert(false);
    } catch(err) {
      assert(err);
    }

    try {
      await sale.setUpSale(0, 0, 0, 0, 0, { from: admin });
      assert(false);
    } catch(err) {
      assert(err);
    }

    try {
      //Call setUpSale from owner
      await sale.setUpSale(0, 0, 0, 0, 0, { from: owner });
      //Call startSale from user(invalid)
      await sale.startSale(20000, { from: user });
      assert(false);
    } catch(err) {
      assert(err);
    }

    try {
      //Call startSale from owner
      await sale.startSale(20000, { from: owner });
      //Call endSale form user(invalid)
      await sale.endSale({ from: user });
      assert(false);
    } catch(err) {
      assert(err);
    }
  });


  it("stage and round should be changed correctly", async () => {
    let round = null;
    let stage = null;

    //Initial stage and round
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 0, "initial round should be Early Investment");
    assert.equal(stage, 2, "initial stage should be Ended");

    // Stage and round on EarlyInvestment
    await sale.setUpSale(0, 0, 0, 0, 0, { from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 0, "round should be Early Investment");
    assert.equal(stage, 0, "stage should be SetUp");

    await sale.startSale(20000, { from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 0, "round should be Early Investment");
    assert.equal(stage, 1, "stage should be Started");

    await sale.endSale({ from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 0, "round should be Early Investment");
    assert.equal(stage, 2, "stage should be Ended");

    // Stage and round on PreSale
    await sale.setUpSale(1, 0, 0, 0, 0, { from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 1, "round should be PreSale");
    assert.equal(stage, 0, "stage should be SetUp");

    await sale.startSale(20000, { from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 1, "round should be PreSale");
    assert.equal(stage, 1, "stage should be Started");

    await sale.endSale({ from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 1, "round should be PreSale");
    assert.equal(stage, 2, "stage should be Ended");

    // Stage and round on CrowdSale
    await sale.setUpSale(2, 0, 0, 0, 0, { from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 2, "round should be CrowdSale");
    assert.equal(stage, 0, "stage should be SetUp");

    await sale.startSale(20000, { from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 2, "round should be CrowdSale");
    assert.equal(stage, 1, "stage should be Started");

    await sale.endSale({ from: owner });
    round = await sale.round();
    stage = await sale.stage();
    assert.equal(round, 2, "round should be CorwdSale");
    assert.equal(stage, 2, "stage should be Ended");

  });
});



contract("AMO Coin Sale Whielist Test", async (accounts) => {
  const owner = accounts[0];
  const admin = accounts[1];
  const fund = accounts[2];
  const user1 = accounts[3];
  const user2 = accounts[4];
  const user3 = accounts[5];

  let token = null;
  let sale = null

  beforeEach("setup contract for each test", async () => {
    token = await AMOCoin.new(admin, { from: owner });
    sale = await AMOCoinSale.new(
      fund, token.address, { from: owner }
    );
    await token.setTokenSaleAmount(sale.address, 0);
  });

  it("only owner can add whitelist", async() => {
    try {
      await sale.addToWhitelist(user1, { from: admin });
      assert(false);
    } catch(err) {
      assert(err);
    }

    try {
      await sale.addToWhitelist(user1, { from: user1 });
      assert(false);
    } catch(err) {
      assert(err);
    }

    await sale.addToWhitelist(user1, { from: owner });
  });

  it("adding users to whitelist should work fine", async () => {
    let isAllowed = null;

    await sale.addToWhitelist(user1, { from: owner });
    isAllowed = await sale.whitelist(user1);

    assert.equal(isAllowed, true);

    const users = [user1, user2, user3];
    await sale.addManyToWhitelist(users, { from: owner });

    isAllowed = await sale.whitelist(user1);
    assert.equal(isAllowed, true);

    isAllowed = await sale.whitelist(user2);
    assert.equal(isAllowed, true);

    isAllowed = await sale.whitelist(user3);
    assert.equal(isAllowed, true);
  });

  it("only whitelisted user can buy tokens", async () => {
    let isAllowed = null;

    await sale.addToWhitelist(user1, { from: owner });
    await sale.setUpSale(0, 0, 0, 0, 0, { from: owner });

    await sale.startSale(20000);

    try {
      await sale.sendTransaction({ value: web3.toWei(0.2, 'ether'), from: user2 });
      assert(false);
    } catch(err) {
      assert(err);
    }

    await sale.sendTransaction({ value: web3.toWei(0.2, 'ether'), from: user1});
  });
});

contract("AMO Coin Sale Main Test", async (accounts) => {
  const owner = accounts[0];
  const admin = accounts[1];
  const fund = accounts[2];
  const user1 = accounts[3];
  const user2 = accounts[4];
  const user3 = accounts[5];

  let token = null;
  let sale = null

  beforeEach("setup contract for each test", async () => {
    token = await AMOCoin.new(admin, { from: owner });
    sale = await AMOCoinSale.new(
      fund, token.address, { from: owner }
    );
    await token.setTokenSaleAmount(sale.address, 0);
  });

  it("user should be offered correct amount of tokens", async () => {
    let isAllowed = null;
    let tokenAmount = null;
    let rate = null;
    let contribution = null;

    await sale.addManyToWhitelist([user1, user2], { from: owner });

    rate = 2000;
    await sale.setUpSale(0, 0, 0, 0, rate, { from: owner });
    await sale.startSale(20000, { from: owner });

    contribution = web3.toWei(0.2, 'ether')
    await sale.sendTransaction({ value: contribution, from: user1});
    tokenAmount = (await token.balanceOf(user1)).toNumber();
    assert.equal(rate * contribution, tokenAmount);

    contribution = web3.toWei(0.5123, 'ether')
    await sale.sendTransaction({ value: contribution, from: user2});
    tokenAmount = (await token.balanceOf(user2)).toNumber();
    assert.equal(rate * contribution, tokenAmount);
  });

  it("", async () => {

  });
});
/*
  it("users enrolled to allocation lists can be allocated token ", async () => {
    await sale.addAllocationList(accounts[3], 100, { from: owner });
    await sale.addAllocationList(accounts[4], 200, { from: owner });

    await sale.allocateTokensBeforeSale(
      accounts[3], 100, { from: owner }
    );

    await sale.allocateTokensBeforeSale(
      accounts[4], 200, { from: owner }
    );

    await token.enableTransfer({ from: owner });

    const balanceOf3 = await token.balanceOf(accounts[3]);
    const balanceOf4 = await token.balanceOf(accounts[4]);

    assert.equal(100, balanceOf3);
    assert.equal(200, balanceOf4);
  });
*/
