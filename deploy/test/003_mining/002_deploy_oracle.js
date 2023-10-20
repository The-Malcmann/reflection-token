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
    args: [ hre.addys.pair, hre.addys.weth, hre.addys.fdic],
  };
  //   (await hre.deployments.get("FDIC")).address
  console.log('ORACLE')
  const oracle = await deploy("PriceOracle", config);
  console.log('oracle', oracle.address)
  hre.addys = {
    ...hre.addys,
    oracle: oracle.address
  }
};
func.tags = ["oracle-test"];
module.exports = func