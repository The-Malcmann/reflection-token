// const { ethers } = require('ethers')
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { days, minutes } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration");

const func = async function (hre) {
    console.log(hre.addys)
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const deployer = await (await hre.ethers.getSigners())[0].getAddress()
    const signer = await hre.ethers.provider.getSigner(
      deployer
  );
  
    const presaleConfig = {
      log: true,
      from: deployer,
      args: [hre.addys.fdic, 18, hre.addys.weth, false],
    };
  
    const Presale = await deploy("Presale", presaleConfig);
    const presale = await hre.ethers.getContractAt(require('../../../artifacts/contracts/Presale/Presale.sol/Presale.json').abi, Presale.address)
    const fdic = await hre.ethers.getContractAt(require('../../../artifacts/contracts/FDIC.sol/FDIC.json').abi, hre.addys.fdic)

    await fdic.connect(signer).excludeAccount(Presale.address)
    await fdic.connect(signer).excludeFromFee(Presale.address)
    await fdic.connect(signer).approve(Presale.address, hre.ethers.parseUnits('694201337800813500000', 'ether'))

    const tokensSale = 694201337800813.5


    const saleRate = tokensSale/32
    console.log(await helpers.time.latest(), await helpers.time.latest() + minutes(10), hre.ethers.parseEther(saleRate.toString()), hre.ethers.parseEther('32'))
    await presale.connect(signer).initSale(await helpers.time.latest() + 1, await helpers.time.latest() + minutes(10), hre.ethers.parseEther(saleRate.toString()), hre.ethers.parseEther('32'))
    await presale.connect(signer).deposit()
  };
  
  func.tags = ["presale-test"];
  module.exports = func