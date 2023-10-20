// const { ethers } = require('ethers')
const func = async function (hre) {
    console.log(hre.addys)
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const deployer = await (await hre.ethers.getSigners())[0].getAddress()
  
    const presaleConfig = {
      log: true,
      from: deployer,
      args: [hre.addys.fdic, 18, hre.addys.weth, false],
    };
  
    const Presale = await deploy("Presale", presaleConfig);
   
  };
  
  func.tags = ["presale"];
  module.exports = func