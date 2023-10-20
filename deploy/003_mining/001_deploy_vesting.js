const func = async function (hre) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;


  // const chainId = await hre.getChainId();
  // const fdicAddress =
  // chainId == "31337"
  //   ? (await hre.deployments.get("FDIC")).address
  //   : addressForEachNetwork[chainId].damo;
  // const fdic = await ethers.getContract('FDIC')
  console.log('parseUnits()', hre.ethers.parseUnits("100", "gwei"))
  const gasPriceGwei = hre.ethers.parseUnits("100", "gwei")
  const deployer = await (await hre.ethers.getSigners())[0].getAddress()
  const deployerSigner = (await hre.ethers.getSigners())[0]
  console.log('VESTING', hre.addys, deployer)
  const TokenVestConfig = {
    log: true,
    from: deployer,
    gasLimit: 2000000,
    maxPriorityFeeGas: "100",
    gasPrice: gasPriceGwei,
    args: [hre.addys.fdic, deployer /*multisig*/],
  };
  const TokenVesting = await deploy(
    "TokenVestingBase",
    TokenVestConfig
  );
    
  hre.addys = {
    ...hre.addys,
    vesting: TokenVesting.address
  }

  const chainId = await hre.getChainId()
  if(chainId == '31337') {
    const fdic = await hre.ethers.getContractAt(require('../../artifacts/contracts/FDIC.sol/FDIC.json').abi, hre.addys.fdic)
    await fdic.connect(deployerSigner).transfer(TokenVesting.address, hre.ethers.parseUnits('10000000', 'ether'))
  }
  // transfer $FDIC to some wallet on deploy
    // if (chainId == "31337") {
    //   await hre.deployments.execute(
    //     "REFLECT",
    //     { log: true, from: deployer, gasLimit: 2000000 },
    //     "transfer",
    //     TokenVesting.address,
    //     ethers.parseEther("10000000")
    //   );
    // }
};

func.tags = ["vestingx"];
module.exports = func;