
const func = async function (hre) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, multisig } = await getNamedAccounts();

  const chainId = await hre.getChainId();
  // const fdicAddress =
  // chainId == "31337"
  //   ? (await hre.deployments.get("FDIC")).address
  //   : addressForEachNetwork[chainId].damo;
  const fdic = await hre.ethers.getContract('FDIC')
  const TokenVestConfig = {
    log: true,
    from: deployer,
    gasLimit: 2000000,
    maxPriorityFeeGas: "100",
    gasPrice: hre.ethers.utils.parseUnits("100", "gwei"),
    args: [fdic.address, fdic.address /*multisig*/],
  };
  const TokenVesting = await deploy(
    "TokenVestingBase",
    TokenVestConfig
  );

  // transfer $FDIC to some wallet on deploy
  //   if (chainId == "31337") {
  //     await hre.deployments.execute(
  //       "FDIC",
  //       { log: true, from: multisig, gasLimit: 2000000 },
  //       "transfer",
  //       TokenVesting.address,
  //       ethers.utils.parseEther("10000000")
  //     );
  //   }
};

func.tags = ["mining"];
module.exports = func;