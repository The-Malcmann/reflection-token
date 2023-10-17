// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.2;

interface IPriceOracle {
    function update() external;

    function consult(address token, uint256 amountIn)
        external
        view
        returns (uint256);
}