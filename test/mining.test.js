const { expect } = require("chai");
const { ethers } = require("hardhat");
// const helpers = require("@nomicfoundation/hardhat-network-helpers");
// const { days } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration");

describe("Token contract", (hre) => {
    let router, factory, weth, fdic, mining, vesting;
    let owner;
    beforeEach('deploy', async function () {
        owner = (await ethers.getSigners())[0]
        console.log('brooooooo', hre)
        // await deployments.fixture(["uniswap", "token", "vesting", "oracle", "mining"]);
        const Factory = await ethers.getContractFactory("UniswapV2Factory", owner);
        const Router = await ethers.getContractFactory("UniswapV2Router02", owner);
        const WETH = await ethers.getContractFactory("WETH", owner);
        weth = await WETH.deploy();

        factory = await Factory.deploy(owner.getAddress());
        router = await Router.deploy(factory.address, weth.address);
        console.log(router.address)

        const FDIC = await ethers.getContractFactory('REFLECT', owner)
        fdic = await FDIC.deploy(owner.address, router.address)


        const { tokenPair } = await addInitialLiquidity(owner, router, factory, weth, fdic)

        const Vesting = await ethers.getContractFactory('TokenVestingBase', owner)
        vesting = await Vesting.deploy(fdic.address, owner.address)

        const Mining = await ethers.getContractFactory('Mining', owner)
        mining = await Mining.deploy(fdic.address, weth.address, owner.address, vesting.address, owner.address, tokenPair.address)

    })

    it("should add liquidity", async function () {
        const [owner] = await ethers.getSigners()

        console.log(owner)

        const { reflectToken, factory, router } = await addInitialLiquidity(owner)
        const reserves = await tokenPair.getReserves()

        expect(Number(ethers.utils.formatEther(reserves[0].toString()))).to.be.greaterThan(0)
        expect(Number(ethers.utils.formatEther(reserves[1].toString()))).to.be.greaterThan(0)
    })

    it("should create vesting schedule", async function () {
        const amountLPIn = ethers.utils.parseEther("1");
        const calcPayout = await lpCap
            .connect(deployer)
            .calculatePayout(amountLPIn);

        await lpCap.connect(deployer).deposit(amountLPIn);
        // expect the vesting schedule created for the depositor to have the correct value of tokens (the payout value)
        const vestedTotal = (
            await vestingContract
                .connect(deployer)
                .getLastVestingScheduleForHolder(deployer.address, {
                    gasLimit: 2000000,
                })
        ).amountTotal;
        expect(vestedTotal).eq(calcPayout);
    })



});

async function addInitialLiquidity(owner, router, factory, weth, fdic) {
    // const Factory = await ethers.getContractFactory("UniswapV2Factory", owner);
    // const Router = await ethers.getContractFactory("UniswapV2Router02", owner);
    // const WETH = await ethers.getContractFactory("WETH", owner);
    // const weth = await WETH.deploy();
    // const factory = await Factory.deploy(owner.getAddress());
    // console.log('addresses: ', await weth.address, factory.address)
    // const router = await Router.deploy(await factory.address, await weth.address);
    console.log(router.address)
    const routerAddress = router.address;
    const wethAddress = weth.address;

    // const ReflectToken = await ethers.getContractFactory("REFLECT");
    // const reflectToken = await ReflectToken.deploy(owner.getAddress(), routerAddress);
    // const reflectTokenAddress = await fdic.address;

    await weth.connect(owner).deposit({ value: ethers.utils.parseUnits("10.0", 18) })

    await weth.connect(owner).approve(routerAddress, ethers.utils.parseUnits("10000000000000", 18))
    await fdic.connect(owner).approve(routerAddress, ethers.utils.parseUnits("10000000000000", 18))
    await router
        .connect(owner)
        .addLiquidity(
            fdic.address,
            wethAddress,
            ethers.utils.parseUnits("100000", 9),
            ethers.utils.parseUnits("10", 18),
            1,
            1,
            await owner.getAddress(),
            Date.now() + 100000000,
            { gasLimit: 20000000 }
        );

    const tokenPair = await getPair(await factory.getPair(fdic.address, wethAddress))
    return { tokenPair, factory, router }
}

async function getPair(address) {
    const pair = await ethers.getContractAt(
        require("../artifacts/contracts/uniswap/UniswapV2Pair.sol/UniswapV2Pair.json")
            .abi,
        address
    );
    return pair;
}