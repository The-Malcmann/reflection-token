
const func = async function (hre) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const multisig = (await hre.etheres.getAccounts())[4]
  const chainId = await hre.getChainId();
  // let damoAddress = addressForEachNetwork[chainId].damo;
  // let daiAddress = addressForEachNetwork[chainId].dai;
  const fdic = await hre.ethers.getContract('FDIC')
  const weth = await hre.ethers.getContract('WETH')
  const pair = await fdic.functions.uniswapV2Pair()

  console.log(fdic)

  const oracle = await hre.deployments.get("PriceOracle");
  console.log("ORACLE", oracle.address);
  const TokenVestingBase = await hre.ethers.getContract("TokenVestingBase");

  const config = {
    log: true,
    from: deployer,
    gasLimit: 2000000,
    gasPrice: hre.ethers.utils.parseUnits("50", "gwei"),
    args: [
      fdic.address,
      weth.address,
      multisig,
      TokenVestingBase.address,
      oracle.address,
      pair,
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
        gasPrice: hre.ethers.utils.parseUnits("50", "gwei"),
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
        gasPrice: hre.ethers.utils.parseUnits("50", "gwei"),
      },
      "renounceRole",
      adminRole,
      deployer
    );
  }
};
func.tags = ["mining"];
module.exports = func