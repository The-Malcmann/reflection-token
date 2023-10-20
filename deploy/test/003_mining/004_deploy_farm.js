// import { oracleDeployConfigs, OracleConfigs } from "./constants/oracle";

const func = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
  
    const deployer = await (await hre.ethers.getSigners())[0].getAddress()
  
    const chainId = await hre.getChainId();
    //   const inputs = oracleDeployConfigs[chainId];
  
    //   console.log("inputs", inputs);
    // COMBAK inputs are undefined, get something setup so these are added automatically
    const gasPriceGwei = hre.ethers.parseUnits("50", "gwei")
  
    const config = {
      log: true,
      from: deployer,
      gasLimit: 1000000,
      gasPrice: gasPriceGwei,
      args: ['0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', hre.ethers.parseEther('69420'), 0, 100],
    };
    //   (await hre.deployments.get("FDIC")).address
    console.log('FARM')
    const oracle = await deploy("Farm", config);
    console.log('farm', oracle.address)
    hre.addys = {
      ...hre.addys,
      oracle: oracle.address
    }
  };
  func.tags = ["farm-test"];
  module.exports = func