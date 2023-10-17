const { expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { days } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration");

describe("Token contract", function () {
    // it("Deployment should assign the total supply of tokens to the owner", async function () {
    //     const [owner] = await ethers.getSigners();
    //     const ReflectToken = await ethers.getContractFactory("REFLECT");
    //     const reflectToken = await ReflectToken.deploy(owner);
    //     const ownerBalance = await reflectToken.balanceOf(owner.address);
    //     expect(await reflectToken.totalSupply()).to.equal(ownerBalance);
    // });
 
    // it("Should reflect to all token holders", async function () {
    //     const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    //     const ReflectToken = await ethers.getContractFactory("REFLECT");
    //     const reflectToken = await ReflectToken.deploy(owner);

    //     await reflectToken.connect(owner).enableLiquidation();


    //     await reflectToken.connect(owner).transfer(tokenHolderOne.address, ethers.parseUnits("1.0", 9))
    //     expect(await reflectToken.balanceOf(tokenHolderOne)).to.eq(ethers.parseUnits("0.980000001", 9))
    //     await reflectToken.connect(owner).transfer(tokenHolderTwo.address, ethers.parseUnits("1000.0", 9))

    //     expect(await reflectToken.balanceOf(tokenHolderOne)).to.eq(ethers.parseUnits(".980001961", 9))

    // });

    // it("Should liquidate if over 1% of total supply upon transfer", async function () {
    //     const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    //     const ReflectToken = await ethers.getContractFactory("REFLECT");
    //     const reflectToken = await ReflectToken.deploy(owner);
    //     await reflectToken.connect(owner).enableLiquidation();

    //     await reflectToken.connect(owner).transfer(tokenHolderOne.address, ethers.parseUnits("100", 9))

    //     await reflectToken.connect(owner).transfer(tokenHolderOne.address, ethers.parseUnits("1000001", 9))
    //     expect(await reflectToken.balanceOf(tokenHolderOne.address)).to.eq(0)
    // });

    // it("should be able to liquidiate if wallet is inactive (14 days since last transaction)", async function () {
    //     const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    //     const ReflectToken = await ethers.getContractFactory("REFLECT");
    //     const reflectToken = await ReflectToken.deploy(owner);
    //     await reflectToken.connect(owner).enableLiquidation();
        
    //     await reflectToken.connect(owner).transfer(tokenHolderOne.address, ethers.parseUnits("10000", 9))
    //     await reflectToken.connect(owner).transfer(tokenHolderTwo.address, ethers.parseUnits("20000", 9))
    //     await expect(reflectToken.connect(tokenHolderOne).liquidateInactiveWallet(owner)).to.be.revertedWith('Account is not inactive')
    //     await helpers.time.increase(days(14));

    //     await reflectToken.connect(tokenHolderOne).liquidateInactiveWallet(owner)
    //     expect(await reflectToken.balanceOf(owner)).to.be.lessThan(ethers.parseUnits(".000001000"));
    // });

    it("should add to liquidity on transfer", async function () {
        const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
  
        const {reflectToken, tokenPair} = await addInitialLiquidity(owner);
        console.log("pair balance of owner:", await tokenPair.balanceOf(owner.getAddress()))
        const [reserve0, reserve1, timestamp] = await tokenPair.getReserves();
        console.log("reserve0, reserve1", reserve0, reserve1)
        await reflectToken.connect(owner).transfer(tokenHolderOne, ethers.parseUnits("10000", 9))
        await reflectToken.connect(tokenHolderOne).transfer(tokenHolderTwo, ethers.parseUnits("9999", 9))
        await reflectToken.connect(tokenHolderOne).transfer(tokenHolderTwo, ethers.parseUnits("1", 9))
        console.log("pair balance of owner:", await tokenPair.balanceOf(owner.getAddress()))
        const [reserve0After, reserve1After, timestampAfter] = await tokenPair.getReserves();
        console.log("reserve0, reserve1", reserve0After, reserve1After)


    });

    

});

describe("Liquidation", function () {
  it("should liquidate recipient upon transfer if transfer would increase recipient balance over threshold", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    const {reflectToken, tokenPair} = await addInitialLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation()
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 9))
    expect(await reflectToken.balanceOf(tokenHolderOne)).to.eq(ethers.parseUnits("69420133780081.3", 9))
    //this transaction puts it at exactly 1% of total supply
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits(".05", 9))
    expect(await reflectToken.balanceOf(tokenHolderOne)).to.eq(ethers.parseUnits("0.0", 9))
  });
  it("should liquidate sender upon transfer if sender's balance is over threshold at time of transfer", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo, tokenHolderThree, tokenHolderFour] = await ethers.getSigners();
    const {reflectToken, tokenPair} = await addInitialLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation()
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 9))
    console.log("tokenHolderOne balance before large reflection:", await reflectToken.balanceOf(tokenHolderOne.getAddress()))
    //After this transaction, this whole amount will reflect to all tokenholders and reflect tokenHolderOne's balance above 1%
    await reflectToken.connect(owner).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("69420133780081.35", 9))
    console.log("tokenHolderOne balance after large reflection:", await reflectToken.balanceOf(tokenHolderOne.getAddress()))
    console.log("tokenHolderOne's % of supply after transaction", await reflectToken.getIntegerPercentOfSupply(tokenHolderOne.getAddress()))

    await reflectToken.connect(tokenHolderOne).transfer(tokenHolderThree, ethers.parseUnits("1", 9));
    console.log("tokenHolderOne balance after transfer", await reflectToken.balanceOf(tokenHolderOne.getAddress()))
  });
  it("should liquidate recipient upon transfer from LP if transfer would increase recipient balance over threshold", async function () {

  });
  it("should liquidate sender upon transfer to LP if sender's balance is over threshold at time of transfer", async function () {

  });
  it("account should not be able to call reflect if their balance is over threshold", async function () {

  });
  it("should follow above logic if an account is reflected over threshold", async function () {

  });
  it("should never liquidiate LP", async function () {

  })


})
async function getPair(address) {
    const pair = await ethers.getContractAt(
      require("../artifacts/contracts/uniswap/UniswapV2Pair.sol/UniswapV2Pair.json")
        .abi,
      address
    );
    return pair;
  }
async function addInitialLiquidity(owner) {
  const Factory = await ethers.getContractFactory("UniswapV2Factory", owner);
  const Router = await ethers.getContractFactory("UniswapV2Router02", owner);
  const WETH = await ethers.getContractFactory("WETH9", owner);
  const weth = await WETH.deploy();
  const factory = await Factory.deploy(owner.address);
  console.log('addresses: ', await weth.getAddress(), factory.address)
  const router = await Router.deploy(await factory.getAddress(),await weth.getAddress());

  const routerAddress = await router.getAddress();
  const wethAddress = await weth.getAddress();
  
  const ReflectToken = await ethers.getContractFactory("REFLECT");
  const reflectToken = await ReflectToken.deploy(owner, routerAddress);
  const reflectTokenAddress = await reflectToken.getAddress();

  await weth.connect(owner).deposit({value: ethers.parseUnits("10.0", 18)})
  
  await weth.connect(owner).approve(routerAddress, ethers.parseUnits("10000000000000", 18))
  await reflectToken.connect(owner).approve(routerAddress, ethers.parseUnits("10000000000000", 18))
  await router
  .connect(owner)
  .addLiquidity(
    reflectTokenAddress,
    wethAddress,
    ethers.parseUnits("100000", 9),
    ethers.parseUnits("10", 18),
    1,
    1,
    await owner.getAddress(),
    Date.now() + 100000000,
    { gasLimit: 20000000 }
  );

  const tokenPair = await getPair(await factory.getPair(reflectTokenAddress, wethAddress))
  return {reflectToken, tokenPair}
}