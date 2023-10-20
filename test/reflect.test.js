const { expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { days, minutes } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration");

describe("Token contract", function () {
  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    const { reflectToken } = await deployWithoutAddingLiquidity(owner);
    const ownerBalance = await reflectToken.balanceOf(owner.getAddress());
    expect(await reflectToken.totalSupply()).to.equal(ownerBalance);
  });

  it("Should take fees and reflect", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo, tokenHolderThree] = await ethers.getSigners();
    const { reflectToken, tokenPair } = await addInitialLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation([]);
    await reflectToken.connect(owner).enableTrading();

    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("10000000.0", 18))
    await reflectToken.connect(tokenHolderOne).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("1.0", 18))

    expect(await reflectToken.balanceOf(tokenHolderTwo)).to.eq(ethers.parseUnits("0.970000000000000002", 18))
    //owner is exempt from fees so
    await reflectToken.connect(owner).transfer(tokenHolderThree.getAddress(), ethers.parseUnits("100000000.0", 18))
    // to reflect fees we transfer from tokenholderThree to tokenHolderTwo and
    await reflectToken.connect(tokenHolderThree).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("100000000.0", 18))
    console.log(await reflectToken.balanceOf(tokenHolderTwo));
    console.log("balance tokenHOlderOne after transfer:",await reflectToken.balanceOf(tokenHolderOne));
    // expect the token balance of tokenHolderOne to be increased by some reflections
    expect(await reflectToken.balanceOf(tokenHolderOne)).to.eq(ethers.parseUnits("9999999.002881008306483640", 18))

  });

  it("Should liquidate if over 1% of total supply upon transfer", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    const { reflectToken } = await deployWithoutAddingLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation([]);

    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("100", 18))

    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 18))
    expect(await reflectToken.balanceOf(tokenHolderOne.getAddress())).to.eq(0)
  });

  it("should be able to liquidiate if wallet is inactive (14 days since last transaction)", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    const { reflectToken } = await deployWithoutAddingLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation([]);

    // await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("10000", 18))
    await reflectToken.connect(owner).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("20000", 18))
    await expect(reflectToken.connect(tokenHolderOne).liquidateInactiveWallet(tokenHolderTwo)).to.be.revertedWith('Account is not inactive')
    await helpers.time.increase(days(14));

    await reflectToken.connect(tokenHolderOne).liquidateInactiveWallet(tokenHolderTwo)
    expect(await reflectToken.balanceOf(tokenHolderTwo)).to.be.lessThan(ethers.parseUnits(".000001000"));
    // liquidator should receive 5% bounty
    expect(await reflectToken.balanceOf(tokenHolderOne)).to.eq(ethers.parseUnits("1000.000000002736958136", 18))
  });

  it("contract should receive bounty on liquidation", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    const { reflectToken, tokenPair } = await addInitialLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation([])
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 18))
    expect(await reflectToken.balanceOf(tokenHolderOne.getAddress())).to.eq(ethers.parseUnits("69420133780081.3", 18))
    console.log("contract balance before", await reflectToken.balanceOf(reflectToken.getAddress()))
    
    //this transaction puts it at exactly 1% of total supply
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits(".05", 18))
    expect(await reflectToken.balanceOf(tokenHolderOne.getAddress())).to.eq(ethers.parseUnits("0.0", 18))
    console.log("contract balance after", await reflectToken.balanceOf(reflectToken.getAddress()))
  })

  it("should add to liquidity on transfer", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();

    const { reflectToken, tokenPair } = await addInitialLiquidity(owner);
    console.log("pair balance of owner:", await tokenPair.balanceOf(owner.getAddress()))
    const [reserve0, reserve1, timestamp] = await tokenPair.getReserves();
    console.log("reserve0, reserve1", reserve0, reserve1)
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("10000", 18))
    await reflectToken.connect(tokenHolderOne).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("9999", 18))
    await reflectToken.connect(tokenHolderOne).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("1", 18))
    console.log("pair balance of owner:", await tokenPair.balanceOf(owner.getAddress()))
    const [reserve0After, reserve1After, timestampAfter] = await tokenPair.getReserves();
    console.log("reserve0, reserve1", reserve0After, reserve1After)


  });

  it("should not be able to transfer until trading is enabled", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    const { reflectToken } = await deployWithoutAddingLiquidity(owner);

    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 18))
    expect(reflectToken.connect(tokenHolderOne).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("1", 18))).to.be.revertedWith("Trading is not yet enabled, once presale is finished it will open")


  })



});

describe("Liquidation", function () {
  it("should not be able to update liquidation time threshold to a lower value than it currently is", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    const { reflectToken, tokenPair } = await addInitialLiquidity(owner);
    // await expect(reflectToken.connect(owner).setLiquidationThresholdTime(86300)).to.be.revertedWith('Account is not inactive')

  })
  it("should liquidate recipient upon transfer if transfer would increase recipient balance over threshold", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo] = await ethers.getSigners();
    const { reflectToken, tokenPair } = await addInitialLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation([])
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 18))
    expect(await reflectToken.balanceOf(tokenHolderOne.getAddress())).to.eq(ethers.parseUnits("69420133780081.3", 18))
    //this transaction puts it at exactly 1% of total supply
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits(".05", 18))
    expect(await reflectToken.balanceOf(tokenHolderOne.getAddress())).to.eq(ethers.parseUnits("0.0", 18))
  });
  it("should liquidate sender upon transfer if sender's balance is over threshold at time of transfer", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo, tokenHolderThree, tokenHolderFour] = await ethers.getSigners();
    const { reflectToken, tokenPair } = await addInitialLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation([])
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 18))
    console.log("tokenHolderOne balance before large reflection:", await reflectToken.balanceOf(tokenHolderOne.getAddress()))
    //After this transaction, this whole amount will reflect to all tokenholders and reflect tokenHolderOne's balance above 1%
    console.log('contract token balance before auto-liquidation', await reflectToken.balanceOf(reflectToken.getAddress()))
    await reflectToken.connect(owner).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("69420133780081.35", 18))
    console.log('contract token balance after auto-liquidation', await reflectToken.balanceOf(reflectToken.getAddress()))
    console.log('RESERVES', await tokenPair.getReserves());
    await reflectToken.connect(tokenHolderOne).transfer(tokenHolderThree.getAddress(), ethers.parseUnits("1", 18));
    console.log("tokenHolderOne balance after transfer", await reflectToken.balanceOf(tokenHolderOne.getAddress()))
  });
  it("should liquidate recipient upon transfer from LP if transfer would increase recipient balance over threshold", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo, tokenHolderThree, tokenHolderFour] = await ethers.getSigners();
    const { reflectToken, tokenPair, router, routerAddress, wethAddress, reflectTokenAddress } = await addInitialLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation([]);
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 18))
    await router.connect(tokenHolderOne).swapExactETHForTokens(1, [wethAddress, reflectTokenAddress], tokenHolderOne.getAddress(), Date.now() + 500, { value: ethers.parseUnits("1", 18) })
    expect(await reflectToken.balanceOf(tokenHolderOne.getAddress())).to.eq(ethers.parseUnits("0.0", 18))

  });

  it("should liquidate sender upon transfer to LP if sender's balance is over threshold at time of transfer", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo, tokenHolderThree, tokenHolderFour] = await ethers.getSigners();
    const { reflectToken, tokenPair, router, routerAddress, wethAddress, reflectTokenAddress } = await addInitialLiquidity(owner);
    await reflectToken.connect(owner).enableLiquidation([])
    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.3", 18))
    console.log("tokenHolderOne balance before large reflection:", await reflectToken.balanceOf(tokenHolderOne.getAddress()))

    //After this transaction, this whole amount will reflect to all tokenholders and reflect tokenHolderOne's balance above 1%
    await reflectToken.connect(owner).transfer(tokenHolderTwo.getAddress(), ethers.parseUnits("69420133780081.35", 18))
    console.log("tokenHolderOne balance after large reflection:", await reflectToken.balanceOf(tokenHolderOne.getAddress()))
    console.log("tokenHolderOne's % of supply after transaction", await reflectToken.getIntegerPercentOfSupply(tokenHolderOne.getAddress()))

    await reflectToken.connect(tokenHolderOne).approve(routerAddress, ethers.parseUnits("6942013378008135", 18))

    // If they try to swap tokens for ETH (transfer tokens to LP)
    await router.connect(tokenHolderOne).swapExactTokensForETHSupportingFeeOnTransferTokens(ethers.parseUnits("100", 18), 1, [reflectTokenAddress, wethAddress], tokenHolderOne.getAddress(), Date.now() + 1000)
    expect(await reflectToken.balanceOf(tokenHolderOne.getAddress())).to.eq(ethers.parseUnits("0.0", 18))


  });
  it("account should not be able to call reflect if their balance is over threshold", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo, tokenHolderThree, tokenHolderFour] = await ethers.getSigners();
    const { reflectToken, tokenPair, router, routerAddress, wethAddress, reflectTokenAddress } = await addInitialLiquidity(owner);
    // await reflectToken.connect(owner).enableLiquidation([])

    await reflectToken.connect(owner).transfer(tokenHolderOne.getAddress(), ethers.parseUnits("69420133780081.35", 18))
    await expect(reflectToken.connect(tokenHolderOne).reflect(tokenHolderOne.getAddress())).to.be.revertedWith('Cannot reflect, account holds over 1% of supply')

  });

  it("trades properly", async function () {

  });
  it("can enable liquidity with array of addresses ", async function() {
    const [owner] = await ethers.getSigners();
    const ownerAddress = await owner.getAddress();
    const { reflectToken, factoryAddress, routerAddress, wethAddress } = await deployWithoutAddingLiquidity(owner);
    let addresses = []
    for(let i = 0; i < 321; i++) {
      addresses[i] = ownerAddress
    }
    await reflectToken.connect(owner).enableLiquidation(addresses)
  })
  it("should never liquidiate LP", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo, tokenHolderThree, tokenHolderFour] = await ethers.getSigners();
    const { reflectToken, tokenPair, weth, router, routerAddress, wethAddress, reflectTokenAddress } = await addInitialLiquidity(owner);
    console.log("owner balance:", await reflectToken.balanceOf(owner.getAddress()))
    await reflectToken.connect(owner).enableLiquidation([]);
    await reflectToken.connect(owner).approve(routerAddress, ethers.parseUnits("6942013378008135", 18))
    await weth.connect(owner).approve(routerAddress, ethers.parseUnits("10000000000000", 18))

    await router
      .connect(owner)
      .addLiquidity(
        reflectTokenAddress,
        wethAddress,
        ethers.parseUnits("69420133780081.35", 18),
        ethers.parseUnits("10", 18),
        1,
        1,
        await owner.getAddress(),
        Date.now() + 100000000,
        { gasLimit: 20000000 }
      );

    console.log(await tokenPair.getReserves());

  })


})

describe("Presale", function () {
  it("presales", async function () {
    const [owner, tokenHolderOne, tokenHolderTwo, teamWallet, presaleOne, presaleTwo, presaleThree, presaleFour, presaleFive, presaleSix, presaleSeven, presaleEight, presaleNine, presaleTen] = await ethers.getSigners();
    const { reflectToken, factoryAddress, routerAddress, wethAddress } = await deployWithoutAddingLiquidity(owner);
    const Presale = await ethers.getContractFactory("Presale");
    const presale = await Presale.deploy(await reflectToken.getAddress(), 18, wethAddress, false);
    await reflectToken.connect(owner).excludeAccount(await presale.getAddress());
    await reflectToken.connect(owner).excludeFromFee(await presale.getAddress());
    console.log("presale address", await presale.getAddress())
    console.log("owner address", await owner.getAddress())
    console.log("presale owner address", await presale.owner())

    //.01% of supply each
    await reflectToken.connect(owner).transfer(presaleOne, ethers.parseEther("694201337800.8135"))
    await reflectToken.connect(owner).transfer(presaleTwo, ethers.parseEther("694201337800.8135"))
    await reflectToken.connect(owner).transfer(presaleThree, ethers.parseEther("694201337800.8135"))
    await reflectToken.connect(owner).transfer(presaleFour, ethers.parseEther("694201337800.8135"))

    //cant transfer yet
    expect(reflectToken.connect(presaleOne).transfer(presaleTwo)).to.be.revertedWith("Trading is not yet enabled, once presale is finished it will open")

    // .1% of supply each
    await reflectToken.connect(owner).transfer(presaleFive, ethers.parseEther("6942013378008.135"))
    await reflectToken.connect(owner).transfer(presaleSix, ethers.parseEther("6942013378008.135"))
    await reflectToken.connect(owner).transfer(presaleSeven, ethers.parseEther("6942013378008.135"))
    await reflectToken.connect(owner).transfer(presaleEight, ethers.parseEther("6942013378008.135"))
    //.5% of supply each
    await reflectToken.connect(owner).transfer(presaleNine, ethers.parseEther("34710066890040.675"))
    await reflectToken.connect(owner).transfer(presaleTen, ethers.parseEther("34710066890040.675"))

    //10%
    const tokensSale = 694201337800813.5


    const saleRate = tokensSale/32

    await reflectToken.connect(owner).approve(await presale.getAddress(), ethers.parseEther(tokensSale.toString()));

    await presale.connect(owner).initSale(await helpers.time.latest() + 1, await helpers.time.latest() + days(1), ethers.parseEther(saleRate.toString()), ethers.parseEther("32"));
    await presale.connect(owner).deposit();

    const plebMaxBuy = await presale.getEthFromTokens(await reflectToken.balanceOf(presaleOne.getAddress()))
    const normieMaxBuy = await presale.getEthFromTokens(await reflectToken.balanceOf(presaleFive.getAddress()))
    const ogMaxBuy = await presale.getEthFromTokens(await reflectToken.balanceOf(presaleEight.getAddress()))
    console.log('get eth from tokens presaleOne', await presale.getEthFromTokens(await reflectToken.balanceOf(presaleOne.getAddress())))
    // await helpers.time.increase(minutes(1));

    await presale.connect(presaleOne).buyTokens(presaleOne.getAddress(), {value: plebMaxBuy})
    await presale.connect(presaleTwo).buyTokens(presaleTwo.getAddress(), {value: plebMaxBuy})
    await presale.connect(presaleThree).buyTokens(presaleThree.getAddress(), {value: plebMaxBuy})
    await presale.connect(presaleFour).buyTokens(presaleFour.getAddress(), {value: plebMaxBuy})
    //shouldn't be able to buy more after buying equivalent to balance
    await expect(presale.connect(presaleFour).buyTokens(presaleFour.getAddress(), {value: 1})).to.be.revertedWith("Can't buy more tokens than were airdropped to account")

    await presale.connect(presaleFive).buyTokens(presaleFive.getAddress(), {value: normieMaxBuy})
    await presale.connect(presaleSix).buyTokens(presaleSix.getAddress(), {value: normieMaxBuy})
    await presale.connect(presaleSeven).buyTokens(presaleSeven.getAddress(), {value: normieMaxBuy})
    await presale.connect(presaleEight).buyTokens(presaleEight.getAddress(), {value: normieMaxBuy})
    
    await presale.connect(presaleNine).buyTokens(presaleNine.getAddress(), {value: ogMaxBuy})
    await presale.connect(presaleTen).buyTokens(presaleTen.getAddress(), {value: ogMaxBuy})

    await helpers.time.increase(days(1) + 1)

    const ownerEthBalanceBefore = await ethers.provider.getBalance(owner.getAddress())
    console.log('eth balance of owner before finish sale', await ethers.provider.getBalance(owner.getAddress()))
    console.log('eth balance of presle before finish sale', await ethers.provider.getBalance(presale.getAddress()))
    console.log('token balance of presale before finish transfer', await reflectToken.balanceOf(presale.getAddress()))
    console.log('getTokenDeposit():', await presale._getTokenDeposit())
    await presale.connect(owner).finishSale()
    console.log('token balance of presale after finish transfer', await reflectToken.balanceOf(presale.getAddress()))
    console.log('eth balance of owner after finish sale', await ethers.provider.getBalance(owner.getAddress()))
    console.log('eth raised', await presale.ethRaised())
    
  
    // const expectedEth = await presale.getEthFromTokens(ethers.parseEther(((ethers.formatEther(plebMaxBuy) * 4) + (ethers.formatEther(normieMaxBuy) *4) + (ethers.formatEther(ogMaxBuy)*2))).toString())
    // const ownerEthBalanceAfter = await ethers.provider.getBalance(owner.getAddress())
    // expect(ethers.formatEther(ownerEthBalanceAfter)).to.eq(ethers.formatEther(ownerEthBalanceBefore) + ethers.formatEther(expectedEth))

    await presale.connect(presaleOne).claimTokens()
    await presale.connect(presaleTwo).claimTokens()
    await presale.connect(presaleThree).claimTokens()
    await presale.connect(presaleFour).claimTokens()
    
    await presale.connect(presaleFive).claimTokens()
    await presale.connect(presaleSix).claimTokens()
    await presale.connect(presaleSeven).claimTokens()
    await presale.connect(presaleEight).claimTokens()
    
    await presale.connect(presaleNine).claimTokens()
    await presale.connect(presaleTen).claimTokens()

    expect(await reflectToken.balanceOf(presale.getAddress())).to.eq(ethers.parseEther("0.000000000000000005"))
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
  const WETH = await ethers.getContractFactory("WETH", owner);
  const weth = await WETH.deploy();
  const factory = await Factory.deploy(owner.getAddress());
  const router = await Router.deploy(await factory.getAddress(), await weth.getAddress());

  const routerAddress = await router.getAddress();
  const wethAddress = await weth.getAddress();

  const ReflectToken = await ethers.getContractFactory("FDIC");
  const reflectToken = await ReflectToken.deploy(owner.getAddress(), routerAddress);
  const reflectTokenAddress = await reflectToken.getAddress();

  await weth.connect(owner).deposit({ value: ethers.parseUnits("100.0", 18) })

  await weth.connect(owner).approve(routerAddress, ethers.parseUnits("10000000000000", 18))
  await reflectToken.connect(owner).approve(routerAddress, ethers.parseUnits("6942013378008135", 18))
  await router
    .connect(owner)
    .addLiquidity(
      reflectTokenAddress,
      wethAddress,
      ethers.parseUnits("694201337800813.5", 18),
      ethers.parseUnits("10", 18),
      1,
      1,
      await owner.getAddress(),
      Date.now() + 100000000,
      { gasLimit: 20000000 }
    );
  await reflectToken.connect(owner).enableTrading();
  const tokenPair = await getPair(await factory.getPair(reflectTokenAddress, wethAddress))
  return { reflectToken, tokenPair, router, routerAddress, weth, wethAddress, reflectTokenAddress }
}

async function deployWithoutAddingLiquidity(owner) {
  const Factory = await ethers.getContractFactory("UniswapV2Factory", owner);
  const Router = await ethers.getContractFactory("UniswapV2Router02", owner);
  const WETH = await ethers.getContractFactory("WETH", owner);
  const weth = await WETH.deploy();
  const factory = await Factory.deploy(owner.getAddress());
  console.log('addresses: ', await weth.getAddress(), await factory.getAddress())
  const router = await Router.deploy(await factory.getAddress(), await weth.getAddress());

  const routerAddress = await router.getAddress();
  const factoryAddress = await factory.getAddress();
  const wethAddress = await weth.getAddress();

  const ReflectToken = await ethers.getContractFactory("FDIC");
  const reflectToken = await ReflectToken.deploy(owner.getAddress(), routerAddress);
  return { reflectToken, router, routerAddress, factoryAddress, weth, wethAddress }
}

async function addLiquidity() {

}