// const { ethers } = require('ethers')
const func = async function (hre) {
  console.log(hre.addys)
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  console.log(ethers.getContract)
  // console.log(ethers.ContractFactory.getContractAddress('UniswapV2Router02'))
  const deployer = await (await hre.ethers.getSigners())[0].getAddress()

  const FdicConfig = {
    log: true,
    from: deployer,
    args: [deployer, hre.addys.router],
  };

  const FDIC = await deploy(
    "REFLECT",
    FdicConfig
  );
  console.log("fdic address:", FDIC.address)
  const fdic = await hre.ethers.getContractAt(require('../../artifacts/contracts/REFLECT.sol/REFLECT.json').abi, FDIC.address)
  const pair = await fdic.uniswapV2Pair()
  hre.addys = {
    ...hre.addys,
    fdic: FDIC.address,
    pair: pair
  }
};

func.tags = ["token"];
module.exports = func