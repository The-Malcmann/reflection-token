// const ethers = require("ethers");


const func = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    // const { deployer, multisig } = await getNamedAccounts();
    const deployer = await (await hre.ethers.getSigners())[0].getAddress()
    const deployerSigner = (await hre.ethers.getSigners())[0]
    console.log(deployer)

    const signer = await hre.ethers.provider.getSigner(
        deployer
    );
    let factory;
    const factoryConfig = {
        log: true,
        from: deployer,
        // maxPriorityFeeGas: "10",
        // gasPrice: hre.ethers.utils.parseUnits("50", "gwei"),
        args: [deployer],
    };
    factory = await deploy("UniswapV2Factory", factoryConfig);

    let weth;
    const wethConfig = {
        log: true,
        from: deployer,
        args: []
    }
    weth = await deploy("WETH", wethConfig);

    let router;
    const routerConfig = {
        log: true,
        from: deployer,
        // maxPriorityFeeGas: "10",
        // gasPrice: hre.ethers.utils.parseUnits("50", "gwei"),
        args: [factory.address, weth.address]
    };
    router = await deploy("UniswapV2Router02", routerConfig);

    console.log('Factory deployed at: ', factory.address)
    console.log('Router deployed at: ', router.address)
    hre.addys = {
        factory: factory.address,
        router: router.address,
        weth: weth.address
    }

    const chainId = await hre.getChainId()
    if(chainId === '31337') {
        const wethContract = await hre.ethers.getContractAt(require('../../artifacts/contracts/WETH.sol/WETH.json').abi, hre.addys.weth)
        await wethContract.connect(deployerSigner).deposit({value: hre.ethers.parseUnits("1000.0", 18)})
    }
};

func.tags = ["uniswap"];
module.exports = func