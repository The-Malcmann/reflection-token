require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy")
require('hardhat-gas-reporter')
require('dotenv').config()
// require("ethers")
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  gasReporter: {
    currency: 'CHF',
    gasPrice: 21,
    enabled: true
  },
  solidity: {
    version: "0.8.20",
    compilers: [
      {
        version: "0.8.20"
      },
      {
        version: "0.8.9",
        settings: {}
      },
      {
        version: "0.6.2",
        settings: {}
      },
    ],
    overrides: {
      "contracts/LPMining/TokenVestingBase.sol": {
        version: "0.8.9",
        "settings": {}
      },
      "contracts/LPMining/lpmining.sol": {
        version: "0.8.9"
      },
      "contracts/LPMining/interfaces/ITokenVestingBase.sol": {
        version: "0.8.9"
      },
      "contracts/LPMining/PriceOracle.sol": {
        version: "0.8.9"
      },
      "contracts/LPMining/Farm.sol": {
        version: "0.6.2"
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      }
    }
  },
  networks: {
    eth: {
      url: `https://mainnet.infura.io/v3/190cbc2fb9374c81b8d22e259385cfea`,
      accounts: [process.env.DEPLOYER_KEY]
    }
  },
  allowUnlimitedContractSize: true,
  namedAccounts: {
    deployer: {
      default: 0,
      // goerli: "privatekey://8e2cca962aafd407caeaa4e2f03d98d253ffd6718607740e98fccf4077cfb617",
      // mainnet: `privatekey://${process.env.DEPLOYER_KEY}`
    }
  }
};

