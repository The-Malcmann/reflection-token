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
    gasPrice: hre.ethers.parseUnits('20', 'gwei'),
    gas: 5526215
  };

  const FDIC = await deploy(
    "FDIC",
    FdicConfig
  );
  console.log("fdic address:", FDIC.address)
  const fdic = await hre.ethers.getContractAt(require('../../../artifacts/contracts/FDIC.sol/FDIC.json').abi, FDIC.address)
  const pair = await fdic.uniswapV2Pair()
  const signer = await hre.ethers.provider.getSigner(
    deployer
);
  await fdic.connect(signer).transfer('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', hre.ethers.parseEther('6942013378008.135'))
  await fdic.connect(signer).transfer('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', hre.ethers.parseEther('6942013378008.135'))

  hre.addys = {
    ...hre.addys,
    fdic: FDIC.address,
    pair: pair
  }
};

func.tags = ["token-test"];
module.exports = func