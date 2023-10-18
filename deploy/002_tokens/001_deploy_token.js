const { ethers } = require('ethers')
const func = async function (hre) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  // console.log(ethers.ContractFactory.getContractAddress('UniswapV2Router02'))
  const deployer = await (await hre.ethers.getSigners())[0].getAddress()
  const namedAccounts = await getNamedAccounts()
console.log('DEPLOYER', namedAccounts)
  const FdicConfig = {
    log: true,
    from: deployer,
    args: [deployer, hre.addys.router],
  };

  const FDIC = await deploy(
    "REFLECT",
    FdicConfig
  );
  const fdic = await hre.ethers.getContractAt(require('../../artifacts/contracts/REFLECT.sol/REFLECT.json').abi, FDIC.address)
  const pair = await fdic.functions.uniswapV2Pair()
  hre.addys = {
    ...hre.addys,
    fdic: FDIC.address,
    pair: pair[0]
  }
};

func.tags = ["token"];
module.exports = func