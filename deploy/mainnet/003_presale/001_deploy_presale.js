// const { ethers } = require('ethers')
const func = async function (hre) {
    console.log(hre.addys)
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts()
  
    console.log(deployer)
    const signer = await hre.ethers.provider.getSigner(
      deployer
  );

    const FDIC = '0xE1EF0cBa666e4BAcbBB666E9aE7978CC22BD23F6'
    const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const presaleConfig = {
      log: true,
      from: deployer,
      args: [FDIC, 18, WETH, false],
      gasPrice: hre.ethers.parseUnits('9', 'gwei'),
      gas: 2100141
    };
  
    const Presale = await deploy("Presale", presaleConfig);
   console.log(Presale.address)
  };
  
  func.tags = ["presale"];
  module.exports = func