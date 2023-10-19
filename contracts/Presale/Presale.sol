// solhint-disable not-rely-on-time
// solhint-disable-next-line
pragma solidity ^0.8.2;
// SPDX-License-Identifier: Unlicensed
// A+G = VNL
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Presale is Ownable {

    bool public isInit;
    bool public isDeposit;
    bool public isRefund;
    bool public isFinish;
    bool public burnTokens;
    address public creatorWallet;
    address public weth;
    uint8 public tokenDecimals;
    uint256 public presaleTokens;
    uint256 public ethRaised;

    struct Pool {
        uint64 startTime;
        uint64 endTime;
        uint256 saleRate;
        uint256 hardCap;
    }

    IERC20 public tokenInstance;
    Pool public pool;

    mapping(address => uint256) public ethContribution;

    modifier onlyActive {
        require(block.timestamp >= pool.startTime, "Sale must be active.");
        require(block.timestamp <= pool.endTime, "Sale must be active.");
        _;
    }

    modifier onlyInactive {
        require(
            block.timestamp < pool.startTime || 
            block.timestamp > pool.endTime || 
            ethRaised >= pool.hardCap, "Sale must be inactive."
            );
        _;
    }

    modifier onlyRefund {
        require(
            isRefund == true || 
            (block.timestamp > pool.endTime && ethRaised <= pool.hardCap), "Refund unavailable."
            );
        _;
    }

    constructor(
        address _tokenAddress, 
        uint8 _tokenDecimals, 
        address _weth,
        bool _burnTokens
        ) Ownable(msg.sender){

        require(_tokenDecimals >= 0, "Decimals not supported.");
        require(_tokenDecimals <= 18, "Decimals not supported.");

        isInit = false;
        isDeposit = false;
        isFinish = false;
        isRefund = false;
        ethRaised = 0;

        weth = _weth;
        burnTokens = _burnTokens;
        tokenInstance = IERC20(_tokenAddress);
        creatorWallet = address(payable(msg.sender));
        tokenDecimals =  _tokenDecimals;
    }

    event Canceled(
        address indexed _inititator, 
        address indexed _token, 
        address indexed _presale
        );

    event Bought(address indexed _buyer, uint256 _tokenAmount);

    event Refunded(address indexed _refunder, uint256 _tokenAmount);

    event Deposited(address indexed _initiator, uint256 _totalDeposit);

    event Claimed(address indexed _participent, uint256 _tokenAmount);

    event RefundedRemainder(address indexed _initiator, uint256 _amount);

    event BurntRemainder(address indexed _initiator, uint256 _amount);

    event Withdraw(address indexed _creator, uint256 _amount);

    /*
    * Reverts ethers sent to this address whenever requirements are not met
    */
    receive() external payable {
        if(block.timestamp >= pool.startTime && block.timestamp <= pool.endTime){
            buyTokens(_msgSender());
        } else {
            revert("Presale is closed");
        }
    }

    /*
    * Initiates the arguments of the sale
    @dev arguments must be passed in wei (amount*10**18)
    */
    function initSale(
        uint64 _startTime,
        uint64 _endTime,
        uint256 _saleRate, 
        uint256 _hardCap
        ) external onlyOwner onlyInactive {        

        require(isInit == false, "Sale no initialized");
        require(_startTime >= block.timestamp, "Invalid start time.");
        require(_endTime > block.timestamp, "Invalid end time.");

        require(_saleRate > 0, "Invalid sale rate.");

        Pool memory newPool = Pool(
            _startTime,
            _endTime, 
            _saleRate, 
            _hardCap
            );

        pool = newPool;
        
        isInit = true;
    }
    function getTokensFromEth(uint256 _amount) external view returns (uint256){
         return _amount * (pool.saleRate) / (10 ** 18) / (10**(18-tokenDecimals));
    }

    function getEthFromTokens(uint256 _tokenAmount) external view returns (uint256) {
        return _tokenAmount / pool.saleRate * (10 ** 18);
    }
    /*
    * Once called the owner deposits tokens into pool
    */
    function deposit() external onlyOwner {
        require(!isDeposit, "Tokens already deposited.");
        require(isInit, "Not initialized yet.");

        uint256 tokensForSale = pool.hardCap * (pool.saleRate) / (10**18) / (10**(18-tokenDecimals));
        presaleTokens = tokensForSale;
        uint256 totalDeposit = tokensForSale;
        isDeposit = true;
        console.log("totalDeposit", totalDeposit);
        require(tokenInstance.transferFrom(msg.sender, address(this), totalDeposit), "Deposit failed.");
        emit Deposited(msg.sender, totalDeposit);
    }

    /*
    * Finish the sale - Create Uniswap v2 pair, add liquidity, take fees, withrdawal funds, burn/refund unused tokens
    */
    function finishSale() external onlyOwner onlyInactive{
        require(block.timestamp > pool.startTime, "Can not finish before start");
        require(!isFinish, "Sale already launched.");
        require(!isRefund, "Refund process.");

        //get the used amount of tokens
        uint256 tokensForSale = ethRaised * (pool.saleRate) / (10**18) / (10**(18-tokenDecimals));
        
        //transfer Eth to owner wallet for initial LP
        payable(creatorWallet).transfer(ethRaised);

        //If HC is not reached, burn or refund the remainder
        if (ethRaised < pool.hardCap) {
            uint256 remainder = _getTokenDeposit() - (tokensForSale);
            if(burnTokens == true){
                require(tokenInstance.transfer(
                    0x000000000000000000000000000000000000dEaD, 
                    remainder), "Unable to burn."
                    );
                emit BurntRemainder(msg.sender, remainder);
            } else {
                require(tokenInstance.transfer(creatorWallet, remainder), "Refund failed.");
                emit RefundedRemainder(msg.sender, remainder);
            }
        }
    }

    /*
    * The owner can decide to close the sale if it is still active
    NOTE: Creator may call this function even if the Hard Cap is reached, to prevent it use:
     require(ethRaised < pool.hardCap)
    */
    function cancelSale() external onlyOwner onlyActive {
        require(!isFinish, "Sale finished.");
        pool.endTime = 0;
        isRefund = true;

        if (tokenInstance.balanceOf(address(this)) > 0) {
            uint256 tokenDeposit = _getTokenDeposit();
            tokenInstance.transfer(msg.sender, tokenDeposit);
            emit Withdraw(msg.sender, tokenDeposit);
        }
        emit Canceled(msg.sender, address(tokenInstance), address(this));
    }

    /*
    * Allows participents to claim the tokens they purchased 
    */
    function claimTokens() external onlyInactive {
        require(isFinish, "Sale is still active.");
        require(!isRefund, "Refund process.");

        uint256 tokensAmount = _getUserTokens(ethContribution[msg.sender]);
        ethContribution[msg.sender] = 0;
        require(tokenInstance.transfer(msg.sender, tokensAmount), "Claim failed.");
        emit Claimed(msg.sender, tokensAmount);
    }

    /*
    * Refunds the Eth to participents
    */
    function refund() external onlyInactive onlyRefund{
        uint256 refundAmount = ethContribution[msg.sender];

        if (address(this).balance >= refundAmount) {
            if (refundAmount > 0) {
                ethContribution[msg.sender] = 0;
                address payable refunder = payable(msg.sender);
                refunder.transfer(refundAmount);
                emit Refunded(refunder, refundAmount);
            }
        }
    }

    /*
    * Withdrawal tokens on refund
    */
    function withrawTokens() external onlyOwner onlyInactive onlyRefund {
        if (tokenInstance.balanceOf(address(this)) > 0) {
            uint256 tokenDeposit = _getTokenDeposit();
            require(tokenInstance.transfer(msg.sender, tokenDeposit), "Withdraw failed.");
            emit Withdraw(msg.sender, tokenDeposit);
        }
    }

    /*
    * If requirements are passed, updates user"s token balance based on their eth contribution
    */
    function buyTokens(address _contributor) public payable onlyActive {
        require(isDeposit, "Tokens not deposited.");

        uint256 weiAmount = msg.value;
        _checkSaleRequirements(_contributor, weiAmount);
        uint256 tokensAmount = _getUserTokens(ethContribution[msg.sender]);
        ethRaised += weiAmount;
        presaleTokens -= tokensAmount;
        ethContribution[msg.sender] += weiAmount;
        emit Bought(_msgSender(), tokensAmount);
    }

    /*
    * Checks whether a user passes token purchase requirements, called internally on buyTokens function
    */
    function _checkSaleRequirements(address _beneficiary, uint256 _amount) internal view { 
        require(tokenInstance.balanceOf(msg.sender) > 0, "Must hold token to participate in presale");
        require(_beneficiary != address(0), "Transfer to 0 address.");
        require(_amount != 0, "Wei Amount is 0");
        require(_getUserTokens(_amount + ethContribution[_beneficiary]) <= tokenInstance.balanceOf(msg.sender), "Can't buy more tokens than you were airdropped");
        require(ethRaised + _amount <= pool.hardCap, "HC Reached.");
        this;
    }

    /*
    * Internal functions, called when calculating balances
    */
    function _getUserTokens(uint256 _amount) internal view returns (uint256){
        return _amount * (pool.saleRate) / (10 ** 18) / (10**(18-tokenDecimals));
    }
    
    function _getTokenDeposit() internal view returns (uint256){
        uint256 tokensForSale = pool.hardCap * pool.saleRate / (10**18) / (10**(18-tokenDecimals));
        return(tokensForSale);
    }
}   