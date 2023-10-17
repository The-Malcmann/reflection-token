// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20("MockWETH", "MockWETH") {
    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
