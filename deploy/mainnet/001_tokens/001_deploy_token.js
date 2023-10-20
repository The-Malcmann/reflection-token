// const { ethers } = require('ethers')
const func = async function (hre) {
  console.log(hre.addys)
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  console.log(ethers.getContract)
  // console.log(ethers.ContractFactory.getContractAddress('UniswapV2Router02'))
  const deployer = await (await hre.ethers.getSigners())[0].getAddress()

  //mainnet addresses
  const uniswapV2RouterAddy = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
  const wethAddy = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  const FdicConfig = {
    log: true,
    from: deployer,
    args: [deployer, uniswapV2RouterAddy],
  };

  const FDIC = await deploy(
    "REFLECT",
    FdicConfig
  );
  console.log("fdic address:", FDIC.address)
  const fdic = await hre.ethers.getContractAt(require('../../../artifacts/contracts/REFLECT.sol/REFLECT.json').abi, FDIC.address)
  const pair = await fdic.uniswapV2Pair()
  hre.addys = {
    fdic: FDIC.address,
    pair: pair,
    router: uniswapV2RouterAddy,
    weth: wethAddy
  }
};

func.tags = ["token"];
module.exports = func