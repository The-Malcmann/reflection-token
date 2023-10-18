const {ethers} = require('ethers')
const func = async function (hre) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  // console.log(ethers.ContractFactory.getContractAddress('UniswapV2Router02'))
  const deployer = await (await hre.ethers.getSigners())[0].getAddress()
  const router = await hre.ethers.getContractFactory('UniswapV2Router02')
//   const chainId = await hre.getChainId();
//   const fdicAddress =
//     chainId == "31337"
//       ? (await hre.deployments.get("FDIC")).address
//       : addressForEachNetwork[chainId].damo;
  console.log('ROUTER', router)
  const FdicConfig = {
    log: true,
    from: deployer,
    args: [deployer, router.address],
  };
  const FDIC = await deploy(
    "REFLECT",
    FdicConfig
  );
};

func.tags = ["token"];
module.exports = func