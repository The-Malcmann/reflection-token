// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Presale is AccessControl {
    // max amounts in USDC
    bytes32 public constant WHALE_ROLE = keccak256("WHALE_ROLE");
    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");

    IERC20 public USDC;
    address public usdcAddress;
    address public fdicAddress;
    address public distributionPool;

    bool public claimOpen;

    struct Amounts {
        uint256 fdicOwed;
        uint256 usdcSpent;
        uint256 fdicTotal;
    }

    struct Pool {
        uint256 supply;
        mapping(address => Amounts) balances;
        mapping(address => bool) hasBought;
        address[] buyers;
        uint256 price_numerator;
    }

    enum PoolName {
        SUPER_EARLY 
    }

    mapping(PoolName => Pool) public pools;

    event Purchase(address indexed buyer, PoolName poolName, uint256 usdcAmount, uint256 fdicAmount);
    event Claim(address indexed buyer, uint256 fdicAmount);

    uint256 public constant PRICE_DENOMINATOR = 10_000;
    uint256 public constant MIN_USDC = 1 *(10**6);
    uint256 public constant MAX_USDC = 5_250 *(10**6);
    uint256 public constant WHALE_MAX_USDC = 50_000 *(10**6);
    uint256 public constant MAX_fdic_PER_WALLET = 2100 ether;
    uint256 public maxfdicAvailable = 100_000 ether;
    uint256 public totalfdicPurchased;

    address public treasury;

    constructor(
        address _treasury,
        address usdcAddr,
        address fdicAddr,
        address distributionPoolAddr,
        address[] memory whitelist,
        uint256 tTotal
    ) {
        treasury = _treasury;
        grantRole(DEFAULT_ADMIN_ROLE, msg.sender);


        // set up whitelist
        for (uint256 i = 0; i < whitelist.length; i++) {
          if(hasRole(WHITELIST_ROLE, whitelist[i])) {
          } else {
            grantRole(WHITELIST_ROLE, whitelist[i]);
          }
        }

        USDC = IERC20(usdcAddr);
        usdcAddress = usdcAddr;
        fdicAddress = fdicAddr;
        distributionPool = distributionPoolAddr;
        claimOpen = false;

        Pool storage superEarlyPool = pools[PoolName.SUPER_EARLY];
        superEarlyPool.supply = 420_000 ether;
        superEarlyPool.price_numerator = 25_000;
        totalfdicPurchased = 0;

        grantRole(DEFAULT_ADMIN_ROLE, treasury);
        grantRole(WHALE_ROLE, treasury);
        grantRole(WHITELIST_ROLE, treasury);
    }

    function getfdicAmount(uint256 usdcAmount) public view returns (uint256) {
        Pool storage pool = pools[PoolName.SUPER_EARLY];
        uint256 price = (PRICE_DENOMINATOR * usdcAmount) / pool.price_numerator;
        return price;
    }

    function getUSDCAmount(uint256 fdicAmount) public view returns (uint256) {
        Pool storage pool = pools[PoolName.SUPER_EARLY];
        //usdc is 6 decimals
        uint256 price = (pool.price_numerator * fdicAmount/(10**12)) / PRICE_DENOMINATOR;
        return price;
    }

    function getSupply() public view returns (uint256) {
        Pool storage pool = pools[PoolName.SUPER_EARLY];
        return pool.supply;
    }

    function getfdicOwed(address user) public view returns (uint256) {
        Pool storage pool = pools[PoolName.SUPER_EARLY];
        return pool.balances[user].fdicOwed;
    }

    function getUsdcSpent(address user) public view returns (uint256) {
        if (!pools[PoolName.SUPER_EARLY].hasBought[msg.sender]) {
            return 0;
        } else {
            Pool storage pool = pools[PoolName.SUPER_EARLY];
            return pool.balances[user].usdcSpent;
        }
    }

    function getMaxUSDC(address user) public view returns (uint256) {
        if (hasRole(WHALE_ROLE, user)) {
            return WHALE_MAX_USDC;
        }
        return MAX_USDC;
    }

    function updateClaimOpen(bool value) public onlyRole(DEFAULT_ADMIN_ROLE) {
        claimOpen = value;
    }

    function updateMaxfdicAvailable(uint256 value) public onlyRole(DEFAULT_ADMIN_ROLE) {
        maxfdicAvailable = value;
    }

    function addWhitelistMember(address member) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(WHITELIST_ROLE, member);
    }

    function addWhitelistMembers(address[] memory members) public onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < members.length; i++) {
            grantRole(WHITELIST_ROLE, members[i]);
        }
    }

    function addWhale(address member) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(WHALE_ROLE, member);
    }

    function updateDistributionPool(address _newPool) public onlyRole(DEFAULT_ADMIN_ROLE) {
      distributionPool = _newPool;
    }

    function purchasefdic(uint256 _fdicAmount) external {
        require(tx.origin == msg.sender, "Only the sender can purchase");
        require(hasRole(WHITELIST_ROLE, msg.sender), "Only whtielist and whales users can purchase from this pool");

        _buyfdic(msg.sender, _fdicAmount, PoolName.SUPER_EARLY);
    }

    function purchaseFromSuperEarlyPool(uint256 _usdcAmount) external {
        require(tx.origin == msg.sender, "Only the sender can purchase");
        require(hasRole(WHITELIST_ROLE, msg.sender), "Only whtielist and whales users can purchase from this pool");

        _buy(msg.sender, _usdcAmount, PoolName.SUPER_EARLY);
    }

    function _buy(
        address spender,
        uint256 _usdcAmount,
        PoolName name
    ) internal {
        Pool storage pool = pools[name];
        uint256 fdicAmount = getfdicAmount(_usdcAmount);
        require(fdicAmount <= pool.supply, "Not enough supply");
        require(_usdcAmount >= MIN_USDC, "Must be above minimum");
        require(_usdcAmount <= getMaxUSDC(msg.sender), "Must be below maximum");
        require(IERC20(usdcAddress).balanceOf(spender) >= _usdcAmount, "Not enough USDC");
        require(
            IERC20(fdicAddress).balanceOf(spender) + fdicAmount < MAX_fdic_PER_WALLET,
            "cannot purchase fdic, would put wallet balance above accepted maximum value"
        );
        require(totalfdicPurchased + fdicAmount < maxfdicAvailable, "buying would exceed avaiable fdic");
        IERC20(usdcAddress).transferFrom(spender, treasury, _usdcAmount);
        pool.supply -= fdicAmount;
        if (pool.balances[spender].fdicOwed == 0) {
            // new buyer add to list
            pool.buyers.push(spender);
        }
        pool.hasBought[spender] = true;
        pool.balances[spender].fdicOwed += fdicAmount;
        pool.balances[spender].usdcSpent += _usdcAmount;
        totalfdicPurchased += fdicAmount;
        emit Purchase(spender, name, _usdcAmount, fdicAmount);
    }

    function _buyfdic(
        address spender,
        uint256 _fdicAmount,
        PoolName name
    ) internal {
        Pool storage pool = pools[name];
        uint256 usdcAmount = getUSDCAmount(_fdicAmount);
        require(_fdicAmount <= pool.supply, "Not enough supply");
        require(usdcAmount >= MIN_USDC, "Must be above minimum");
        require(usdcAmount <= getMaxUSDC(msg.sender), "Must be below maximum");
        require(IERC20(usdcAddress).balanceOf(spender) >= usdcAmount, "Not enough USDC");
        require(
            IERC20(fdicAddress).balanceOf(spender) + _fdicAmount < MAX_fdic_PER_WALLET,
            "cannot purchase fdic, would put wallet balance above accepted maximum value"
        );
        require(totalfdicPurchased + _fdicAmount < maxfdicAvailable, "buying would exceed avaiable fdic");
        IERC20(usdcAddress).transferFrom(spender, treasury, usdcAmount);
        pool.supply -= _fdicAmount;
        if (pool.balances[spender].fdicOwed == 0) {
            // new buyer add to list
            pool.buyers.push(spender);
        }
        pool.hasBought[spender] = true;
        pool.balances[spender].fdicOwed += _fdicAmount;
        pool.balances[spender].usdcSpent += usdcAmount;
        pool.balances[spender].fdicTotal += _fdicAmount;
        totalfdicPurchased += _fdicAmount;
        emit Purchase(spender, name, usdcAmount, _fdicAmount);
    }

    function claim() external {
        require(tx.origin == msg.sender, "Only the sender can purchase");
        require(hasRole(WHITELIST_ROLE, msg.sender), "Only whtielist and whales users can purchase from this pool");
        require(claimOpen == true, "Claiming is not open yet");

        _claim(msg.sender, PoolName.SUPER_EARLY);
    }

    function _claim(address spender, PoolName name) internal {
        Pool storage pool = pools[name];
        require(
            pools[PoolName.SUPER_EARLY].hasBought[msg.sender] == true,
            "Can't claim if you've never bought $fdic!"
        );

        require(pools[PoolName.SUPER_EARLY].balances[msg.sender].fdicOwed > 0, "Must have fdic owed to claim!");

        uint256 fdicAmount = pool.balances[spender].fdicOwed;
        IERC20(fdicAddress).transferFrom(distributionPool, address(this), fdicAmount);
        IERC20(fdicAddress).transfer(msg.sender, fdicAmount);
        pool.balances[spender].fdicOwed = 0;
        emit Claim(spender, fdicAmount);
    }

    function _claimFromContract(address spender, PoolName name) internal { 

    }
}
