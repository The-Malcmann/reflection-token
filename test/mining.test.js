const { expect } = require("chai");
const { ethers } = require("hardhat");
// const helpers = require("@nomicfoundation/hardhat-network-helpers");
// const { days } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration");

describe("Token contract", (hre) => {
    let router, factory, weth, fdic, mining, vesting, pair;
    let owner, multisig;
    beforeEach('deploy', async function () {
        owner = (await ethers.getSigners())[0]
        multisig = (await ethers.getSigners())[4]

        const Factory = await ethers.getContractFactory("UniswapV2Factory", owner);
        const Router = await ethers.getContractFactory("UniswapV2Router02", owner);
        const WETH = await ethers.getContractFactory("WETH", owner);
        weth = await WETH.deploy();

        factory = await Factory.deploy(owner.getAddress());
        router = await Router.deploy(await factory.getAddress(), await weth.getAddress());
        console.log(owner.address)

        const FDIC = await ethers.getContractFactory('REFLECT', owner)
        fdic = await FDIC.deploy(owner.address, await router.getAddress())

        const { tokenPair } = await addInitialLiquidity(owner, router, factory, weth, fdic)
        pair = tokenPair
        console.log('PAIR', await pair.getAddress())
        const Vesting = await ethers.getContractFactory('TokenVestingBase', owner)
        vesting = await Vesting.deploy(await fdic.getAddress(), owner.address)

        await fdic.connect(owner).transfer(await vesting.getAddress(), ethers.parseUnits('100000'))

        const Mining = await ethers.getContractFactory('Mining', owner)
        mining = await Mining.deploy(await fdic.getAddress(), await weth.getAddress(), multisig.address, await vesting.getAddress(), owner.address, await pair.getAddress())

        // Grant admin access to vesting from mining
        await vesting.connect(owner).grantRole('0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775', await mining.getAddress());
    })

    it("should add liquidity", async function () {
        const reserves = await pair.getReserves()

        expect(Number(ethers.formatEther(reserves[0].toString()))).to.be.greaterThan(0)
        expect(Number(ethers.formatEther(reserves[1].toString()))).to.be.greaterThan(0)
    })

    it("should create vesting schedule", async function () {
        const amountLPIn = ethers.parseEther("1").toString();
        const calcPayout = await mining
            .connect(owner)
            .calculatePayout(amountLPIn);

            console.log('PAYOUT', calcPayout)
            await pair.connect(owner).approve(await mining.getAddress(), ethers.MaxUint256)
        await mining.connect(owner).deposit(amountLPIn);
        console.log('DEPOSITED')
        // expect the vesting schedule created for the depositor to have the correct value of tokens (the payout value)
        const vestedTotal = (
            await vesting
                .connect(owner)
                .getLastVestingScheduleForHolder(owner.address, {
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
    const routerAddress = await router.getAddress();
    const wethAddress = await weth.getAddress();

    // const ReflectToken = await ethers.getContractFactory("REFLECT");
    // const reflectToken = await ReflectToken.deploy(owner.getAddress(), routerAddress);
    // const reflectTokenAddress = await fdic.address;

    await weth.connect(owner).deposit({ value: ethers.parseUnits("100", 18) })
    console.log('made it here', routerAddress, wethAddress)

    await weth.connect(owner).approve(routerAddress, ethers.parseUnits("10000000000000", 18).toString())
    await fdic.connect(owner).approve(routerAddress, ethers.parseUnits("1000000000", 18).toString())
    console.log('approved')
    console.log(ethers.parseUnits("10000000000000", 18).toString())
    // console.log(await fdic.getAddress(),
    //     wethAddress.toString(),
    //     ethers.parseUnits("10000", 'ether').toString(),
    //     ethers.parseUnits("10", 'ether').toString(),
    //     1,
    //     1,
    //     owner.address.toString(),
    //     Date.now() + 100000000,
    //     { gasLimit: 2000000 })

    await router
        .connect(owner)
        .addLiquidity(
            await fdic.getAddress(),
            await weth.getAddress(),
            ethers.parseUnits("100000", 'ether').toString(),
            ethers.parseUnits("10", 'ether').toString(),
            1,
            1,
            owner.address.toString(),
            999999999999
        );
    console.log('bruhhh')
    const tokenPair = await getPair(await factory.getPair(await fdic.getAddress(), wethAddress))
    console.log('pair')
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