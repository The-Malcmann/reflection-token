
const func = async function (hre) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const deployer = await (await hre.ethers.getSigners())[0].getAddress()
  const multisig = await (await hre.ethers.getSigners())[4].getAddress()

  // const multisig = (await hre.etheres.getAccounts())[4]
  // let damoAddress = addressForEachNetwork[chainId].damo;
  // let daiAddress = addressForEachNetwork[chainId].dai;


  // const oracle = await hre.deployments.get("PriceOracle");
  // console.log("ORACLE", oracle.address);
  // const TokenVestingBase = await hre.ethers.getContract("TokenVestingBase");
  const gasPriceGwei = hre.ethers.parseUnits("50", "gwei");
  const TokenVestingBase = await hre.ethers.getContractAt(require('../../../artifacts/contracts/LPMining/TokenVestingBase.sol/TokenVestingBase.json').abi, hre.addys.vesting)
  const config = {
    log: true,
    from: deployer,
    gasLimit: 2000000,
    gasPrice: gasPriceGwei,
    args: [
      hre.addys.fdic,
      hre.addys.weth,
      multisig,
      hre.addys.vesting,
      hre.addys.pair,
    ],
  };

  const lpCapitalization = await deploy(
    "Mining",
    config
  );

  const adminRole = await TokenVestingBase.ADMIN_ROLE();
  const capHasRole = await TokenVestingBase.hasRole(
    adminRole,
    lpCapitalization.address
  );
  if (!capHasRole) {
    console.log("Granting role to capitalization contract");
    await hre.deployments.execute(
      "TokenVestingBase",
      {
        log: true,
        from: deployer,
        gasLimit: 2000000,
        gasPrice: gasPriceGwei,
      },
      "grantRole",
      adminRole,
      lpCapitalization.address
    );
  }

  // renounce admin role for deployer to avoid potential future vulnerability if private key of deployer is comprimised
  if (await TokenVestingBase.hasRole(adminRole, deployer)) {
    await hre.deployments.execute(
      "TokenVestingBase",
      {
        log: true,
        from: deployer,
        gasLimit: 2000000,
        gasPrice: gasPriceGwei,
      },
      "renounceRole",
      adminRole,
      deployer
    );
  }
};
func.tags = ["mining-test"];
module.exports = func