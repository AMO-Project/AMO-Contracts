
const AMOCoin = artifacts.require("./AMOCoin.sol");
const AMOCoinSale = artifacts.require("./AMOCoinSale.sol");

module.exports = async (deployer, network, accounts) => {
  const owner = accounts[0];
  const admin = accounts[1];
  const fundAddr = accounts[2];

  await deployer.deploy(AMOCoin, admin, { from: owner });
  const amoCoin = await AMOCoin.deployed();

  await deployer.deploy(
    AMOCoinSale, fundAddr, amoCoin.address, { from: owner }
  );
  const amoCoinSale = await AMOCoinSale.deployed();
  await amoCoin.setTokenSaleAmount(amoCoinSale.address, 0);
};

/*
module.exports = function(deployer, network, accounts) {
  const owner = accounts[0];
  const admin = accounts[1];
  const fundAddr = accounts[2];
  const AMOToEtherRate = 5000;

  return deployer.deploy(
    AMOCoin, admin, { from: owner }
  ).then(() => {
    return AMOCoin.deployed().then(instance => {
      AMOCoin = instance;
    });
  }).then(() => {
    return deployer.deploy(
      AMOCoinSale, AMOToEtherRate, fundAddr, AMOCoin.address, { from: owner }
    ).then(() => {
      return AMOCoinSale.deployed().then(instance => {
        AMOCoinSale = instance;
        AMOCoin.setTokenSaleAmount(instance.address, 0);
      });
    });
  });
};
*/
