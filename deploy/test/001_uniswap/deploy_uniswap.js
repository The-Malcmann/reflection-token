// const ethers = require("ethers");


const func = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    // const { deployer, multisig } = await getNamedAccounts();
    const deployer = await (await hre.ethers.getSigners())[0].getAddress()
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
};

func.tags = ["uniswap-test"];
module.exports = func