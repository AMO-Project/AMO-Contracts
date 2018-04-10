module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 9545,
      network_id: "*"
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01
    }
  }
};
