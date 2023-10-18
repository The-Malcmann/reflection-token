// require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy")
// require("ethers")
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    compilers: [
      {
        version: "0.8.20"
      },
      {
        version: "0.8.9",
        settings: {}
      }
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
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      }
    }
  },
  allowUnlimitedContractSize: true,
};

