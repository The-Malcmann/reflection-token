// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.2;

import "../Uniswap/interfaces/IUniswapV2Pair.sol";
import "../Uniswap/libraries/FixedPoint.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "../Uniswap/libraries/UniswapV2OracleLibrary.sol";
import "../Uniswap/libraries/UniswapV2Library.sol";
import "hardhat/console.sol";
import "./interfaces/IPriceOracle.sol";

//source: https://github.com/Uniswap/v2-periphery/blob/master/contracts/examples/ExampleOracleSimple.sol
// only modifications are solidity compiler version, filepaths to dependencies, and implementing our interface

// fixed window oracle that recomputes the average price for the entire period once every period
// note that the price average is only guaranteed to be over at least 1 period, but may be over a longer period
contract PriceOracle is IPriceOracle, KeeperCompatibleInterface {
    using FixedPoint for *;

    uint256 public constant PERIOD = 1 hours;

    IUniswapV2Pair public pair;
    address public immutable token0;
    address public immutable token1;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint32 public blockTimestampLast;
    FixedPoint.uq112x112 public price0Average;
    FixedPoint.uq112x112 public price1Average;

    constructor(
        address pairAddr,
        address tokenA,
        address tokenB
    ) public {
        pair = IUniswapV2Pair(pairAddr);
        token0 = pair.token0();
        token1 = pair.token1();
        price0CumulativeLast = pair.price0CumulativeLast(); // fetch the current accumulated price value (1 / 0)
        price1CumulativeLast = pair.price1CumulativeLast(); // fetch the current accumulated price value (0 / 1)
        uint112 reserve0;
        uint112 reserve1;
        (reserve0, reserve1, blockTimestampLast) = pair.getReserves();
        
        // COMBAK 17 Oct 2023 removed just for testing, ADD BACK IN FOR LAUNCH 
        // require(
        //     reserve0 != 0 && reserve1 != 0,
        //     "ExampleOracleSimple: NO_RESERVES"
        // ); // ensure that there's liquidity in the pair
    }

    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        return (block.timestamp - blockTimestampLast > PERIOD, checkData);
    }

    function performUpkeep(bytes calldata performData) external override {
        // highly recommended to revalidate the upkeep in the performUpkeep function
        if (block.timestamp - blockTimestampLast > PERIOD) {
            _update();
        }
    }

    function update() external {
        _update();
    }

    function _update() internal {
        (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        ) = UniswapV2OracleLibrary.currentCumulativePrices(address(pair));
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired

        // ensure that at least one full period has passed since the last update
        require(
            timeElapsed >= PERIOD,
            "ExampleOracleSimple: PERIOD_NOT_ELAPSED"
        );

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        price0Average = FixedPoint.uq112x112(
            uint224((price0Cumulative - price0CumulativeLast) / timeElapsed)
        );

        price1Average = FixedPoint.uq112x112(
            uint224((price1Cumulative - price1CumulativeLast) / timeElapsed)
        );

        price0CumulativeLast = price0Cumulative;
        price1CumulativeLast = price1Cumulative;
        blockTimestampLast = blockTimestamp;
    }

    // note this will always return 0 before update has been called successfully for the first time.
    function consult(address token, uint256 amountIn)
        external
        view
        returns (uint256 amountOut)
    {
        if (token == token0) {
            amountOut = price0Average.mul(amountIn).decode144();
        } else {
            require(token == token1, "ExampleOracleSimple: INVALID_TOKEN");
            amountOut = price1Average.mul(amountIn).decode144();
        }
    }
}