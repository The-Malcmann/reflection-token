//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../Uniswap/interfaces/IUniswapV2Pair.sol";
import "../Uniswap/libraries/UniswapV2Library.sol";
import "./TokenVestingBase.sol";
import "./interfaces/IPriceOracle.sol";
import "hardhat/console.sol";

contract Mining is Ownable {
    using UniswapV2Library for IUniswapV2Pair;

    // address of the vesting contract which will create vesting schedules for the depositor
    address vestingContractAddress;

    address wethAddress;

    address fdicAddress;

    // discount (in percentage, from 0 < discount < 10000. Denominator of 10000 in
    // applyDiscount() allows us 2 decimal points of granularity.
    // i.e. discount - 2350 => 23.50% discount
    uint256 public discount;

    // tracks current LP token total
    uint256 public totalLPTokens;

    // UniswapV2ERC20 pair token
    IUniswapV2Pair public pair;

    // TWAP price oracle
    IPriceOracle public oracle;

    // Max LP tokens accepted in a capitalization instance
    uint256 public MAX_LP;

    // tracks how many times a user has capitalized
    mapping(address => uint256) totalCaps;

    address multisig;

    event Capitalization(
        address indexed depositor,
        uint256 amount,
        uint256 fdicPayout
    );

    constructor(
        address _fdicAddr,
        address _wethAddr,
        address _multisig,
        address _vestingContractAddress,
        address _oracle,
        address _pairAddr
    ) Ownable(msg.sender) {
        fdicAddress = _fdicAddr;
        wethAddress = _wethAddr;
        vestingContractAddress = _vestingContractAddress;
        discount = 3000; // 30% discount
        MAX_LP = ~uint256(0);
        multisig = _multisig;
        oracle = IPriceOracle(_oracle);
        pair = IUniswapV2Pair(_pairAddr);
    }

    function setTokenPair(address _pair) external onlyOwner {
        pair = IUniswapV2Pair(_pair);
    }

    /**
     * @dev Calculates fdicPayout amount for depositor.
     *
     * Logic: Find the value in DAMO that the LP provider would be entilted to if they withdrew from
     * the pool and swapped their DAI for DAMO in the pool. Then, simply give them that much DAMO plus
     * a discount.
     * @param _lpTokenAmount amount of lp tokens to be deposited.
     */
    function calculatePayout(
        uint256 _lpTokenAmount
    ) public view returns (uint256 fdicPayout) {
        // In production, DAI will be the first reserve, as it is always deployed before DAMO
        // (Uniswap uses the timestamps as a part of the compared hash value when ordering two tokens in a pair)
        // reference: UniswapV2Library, 20
        uint112 wethReserves;
        uint112 fdicReserves;
        uint32 blockTimestampLast;
        wethAddress == pair.token0()
            ? (wethReserves, fdicReserves, blockTimestampLast) = pair
                .getReserves()
            : (fdicReserves, wethReserves, blockTimestampLast) = pair
            .getReserves();
        // Amount of DAI the LP represents
        uint256 wethLp = (_lpTokenAmount * wethReserves) / pair.totalSupply();

        // Amount of DAMO the LP represents
        uint256 fdicLp = (_lpTokenAmount * fdicReserves) / pair.totalSupply();

        // uint256 daiValueInDAMO = oracle.consult(wethAddress, wethLp);
        uint256 wethValueNoTwap = UniswapV2Library.quote(
            wethLp,
            wethReserves,
            fdicReserves
        );

        // Theoretical representation of LP in DAMO, after the trade of DAI for DAMO
        uint256 lpValueInFDIC = wethValueNoTwap + fdicLp;
        // uint256 lpValueInFDIC = daiValueInDAMO + fdicLp;

        // Now that we have the DAMO value of the LP, we simply give the depositor more DAMO than their LP is worth, thus a discounted price
        return lpValueInFDIC + _applyDiscount(lpValueInFDIC);
    }

    /**
     * @dev Main capitalization function
     *
     * User deposits LP Token (token is transfered to multisig wallet immediately on approval by user).
     * DAMO payout is calculated using calculatePayout, and a vesting schedule (3 day linear vest) is
     * made with the payout amount and the depositor's address
     *  @param _lpTokenAmount amount of lp tokens to be deposited.
     */
    function deposit(uint256 _lpTokenAmount) external {
        require(
            totalLPTokens + _lpTokenAmount < MAX_LP,
            "reached LP threshold, no longer accepting capitalizations"
        );
        require(
            pair.balanceOf(msg.sender) >= _lpTokenAmount,
            "Insufficient funds"
        );
        require(_lpTokenAmount > 0, "Invalid amount");

        // Transfer DAMO/DAI LP to multisig
        bool success = pair.transferFrom(msg.sender, multisig, _lpTokenAmount);
        require(success, "LP token transfer failed");

        // calculate fdicPayout to depositor
        uint256 fdicPayout = this.calculatePayout(_lpTokenAmount);
        console.log('PAYOUT', fdicPayout);
        // update total lp Tokens
        _updateLiquidity(_lpTokenAmount);
        // Emit a deposit event with the address of the depositor, the amount of LP Tokens deposited,
        // and the amount of DAMO received as fdicPayout
        emit Capitalization(msg.sender, _lpTokenAmount, fdicPayout);

        // vest tokens to depositor (3 day linear vest)
        ITokenVestingBase(vestingContractAddress).createVestingSchedule(
            msg.sender,
            block.timestamp,
            0,
            3 days,
            1 seconds, // linear vest
            false,
            fdicPayout
        );
        // update the total capitalization instances for the depositor
        totalCaps[msg.sender] += 1;
    }

    function _updateLiquidity(uint256 _lpTokenAmount) internal {
        totalLPTokens += _lpTokenAmount;
    }

    function updateDiscount(uint256 _newDiscount) external onlyOwner {
        discount = _newDiscount;
    }

    /**
     * @dev Returns discounted amount of DAMO to add to total payout
     *
     *  @param _lpTokenAmount amount of lp tokens to be deposited.
     */
    function _applyDiscount(
        uint256 _lpTokenAmount
    ) internal view returns (uint256) {
        return (discount * _lpTokenAmount) / 10000;
    }
}
