// import { oracleDeployConfigs, OracleConfigs } from "./constants/oracle";

const func = async function (hre) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, multisig } = await getNamedAccounts();

  const chainId = await hre.getChainId();
//   const inputs = oracleDeployConfigs[chainId];

//   console.log("inputs", inputs);
// COMBAK inputs are undefined, get something setup so these are added automatically
  const config = {
    log: true,
    from: deployer,
    gasLimit: 1000000,
    gasPrice: hre.ethers.utils.parseUnits("50", "gwei"),
    args: [inputs.pair, inputs.dai, inputs.damo],
  };
//   (await hre.deployments.get("FDIC")).address

  const oracleDeploy = await deploy("PriceOracle", config);
};
func.tags = ["oracle"];
module.exports = func