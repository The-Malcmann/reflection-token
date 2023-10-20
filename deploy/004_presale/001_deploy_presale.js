// const { ethers } = require('ethers')
const func = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    // console.log(ethers.ContractFactory.getContractAddress('UniswapV2Router02'))
    const deployer = await (await hre.ethers.getSigners())[0].getAddress()
    const deployerSigner = (await hre.ethers.getSigners())[0]
    const namedAccounts = await getNamedAccounts()
    console.log('DEPLOYER', namedAccounts)
    const PresaleConfig = {
        log: true,
        from: deployer,
        args: [hre.addys.fdic, 18, hre.addys.weth, false],
    };

    const Presale = await deploy(
        "REFLECT",
        PresaleConfig
    );
    console.log("presale address:", Presale.address)
    hre.addys = {
        ...hre.addys,
        presale: Presale.address
    }

    const chainId = await hre.getChainId()
    // Add LP for testing
    if (chainId === '31337') {
        const presale = await hre.ethers.getContractAt(require('../../artifacts/contracts/Presale.sol/Presale.json').abi, Presale.address)
        const fdic = await hre.ethers.getContractAt(require('../../artifacts/contracts/WETH.sol/WETH.json').abi, hre.addys.weth)

        await fdic.connect(deployerSigner).approve(hre.addys.router, '100000000000000000000000000000000000')
        await presale.connect(deployer).deposit()
        //   const weth = await hre.ethers.getContractAt(require('../../artifacts/contracts/WETH.sol/WETH.json').abi, hre.addys.weth)
        //   await weth.connect(deployerSigner).approve(hre.addys.router, '100000000000000000000000000000000000')
        //   console.log(await fdic.connect(deployerSigner).allowance(deployer, hre.addys.router))
        //   console.log(await weth.connect(deployerSigner).allowance(deployer, hre.addys.router))
        //   console.log(await weth.connect(deployerSigner).balanceOf(deployer))
        //   console.log(hre.ethers.parseUnits('10000', 'ether'))
        //   const router = await hre.ethers.getContractAt(require('../../artifacts/contracts/Uniswap/UniswapV2Router02.sol/UniswapV2Router02.json').abi, hre.addys.router)
        //   await router.connect(deployerSigner).addLiquidity(hre.addys.fdic, hre.addys.weth, '10000000000000000000000', '10000000000000000000', 1, 1, deployer, Date.now() + 1000000, { gasLimit: 20000000 })
        //   console.log('balance after LP', await fdic.connect(deployerSigner).balanceOf(deployer))
    }
    console.log(chainId)
};

func.tags = ["presale"];
module.exports = func