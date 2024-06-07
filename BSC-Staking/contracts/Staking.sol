// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract NomiswapStakingService {
    struct Staker {
        uint256 amount;
        uint128 initialRewardRate;
        uint128 reward;
        uint256 claimedReward;
    }

    mapping(address => Staker) public stakers;
    mapping(address => string) public strings;

    function stake(uint256 amount) public virtual;
    function unstake(uint256 amount) public virtual;
}

struct TonAddress {
    int8 workchain;
    bytes32 address_hash;
}

abstract contract WrappedTON is IERC20 {
    function burn(uint256 amount, TonAddress memory addr) public virtual;
    function burnFrom(address account, uint256 amount, TonAddress memory addr) public virtual;
}

// import the uniswap router
// the contract needs to use swapExactTokensForTokens
// this will allow us to import swapExactTokensForTokens into our contract
interface IUniswapV2Router {
    function getAmountsOut(uint256 amountIn, address[] memory path) external view returns (uint256[] memory amounts);
    function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data ) external;
}

interface IUniswapV2Factory {
  function getPair(address token0, address token1) external returns (address);
}

contract Staking is Context, Ownable {
    WrappedTON private immutable _tonToken;
    uint256 private immutable _max_stake_amount;
    uint256 private _current_stake_amount;
    address private immutable _nomiswapStakingServiceAddr;
    address private immutable _royaltyAddr;
    TonAddress private _liquidityAddr;

    // address of the uniswap v2 router
    address private constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    // address of WETH token.  This is needed because some times it is better to trade through WETH.  
    // you might get a better price using WETH.  
    // example trading from token A to WETH then WETH to token B might result in a better price
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address private constant NMX = 0xd32d01A43c869EdcD1117C640fBDcfCFD97d9d65;

    receive() external payable {
    }
    
    constructor(WrappedTON tonToken_, uint256 max_stake_amount_, address nomiswapStakingServiceAddr_, address royaltyAddr_, TonAddress memory liquidityAddr_)
    {
        require(address(tonToken_) != address(0), "Token address cannot be the zero address");
        require(nomiswapStakingServiceAddr_ != address(0), "Token address cannot be the zero address");
        
        _tonToken = tonToken_;
        _max_stake_amount = max_stake_amount_;
        _nomiswapStakingServiceAddr = nomiswapStakingServiceAddr_;
        _royaltyAddr = royaltyAddr_;
        _liquidityAddr = liquidityAddr_;
    }

    function maxStake() public view virtual returns (uint256)
    {
        return _max_stake_amount;
    }

    function nomiswapStakingServiceAddress() public view virtual returns (address)
    {
        return _nomiswapStakingServiceAddr;
    }

    function royaltyAddress() public view virtual returns (address)
    {
        return _royaltyAddr;
    }

    function liquidityAddress() public view virtual returns (TonAddress memory)
    {
        return _liquidityAddr;
    }

    function timer_init() public virtual
    {
        NomiswapStakingService nomiswapStakingService = NomiswapStakingService(_nomiswapStakingServiceAddr);
        
        (, , uint128 reward,) = nomiswapStakingService.stakers(address(this));
        nomiswapStakingService.unstake(reward);
        
        _received_from_staking_service(reward);
    }

    function stop_staking() public virtual
    {
        NomiswapStakingService nomiswapStakingService = NomiswapStakingService(_nomiswapStakingServiceAddr);
        
        (uint256 amount, , ,) = nomiswapStakingService.stakers(address(this));
        nomiswapStakingService.unstake(amount);

        _received_from_staking_service(amount);
    }

    function add_liquidity() public virtual
    {
        uint256 amount = _tonToken.balanceOf(address(this));
        _add_liquidity(amount);
    }

    function _add_liquidity(uint256 amount) internal
    {
        _current_stake_amount += amount;
        _deposit(amount);
    }

    function _deposit(uint256 amount) internal
    {
        // swap ton to nmx
        swap(address(_tonToken), NMX, _tonToken.balanceOf(address(this)), getAmountOutMin(address(_tonToken), NMX, _tonToken.balanceOf(address(this))), address(this));

        IERC20(NMX).approve(_nomiswapStakingServiceAddr, IERC20(NMX).balanceOf(address(this)));
        
        NomiswapStakingService nomiswapStakingService = NomiswapStakingService(_nomiswapStakingServiceAddr);
        nomiswapStakingService.stake(amount);
    }

    function _received_from_staking_service(uint256 amount) internal
    {
        // swap from staking token to ton 
        uint256 tonAmount = getAmountOutMin(NMX, address(_tonToken), amount);
        swap(NMX, address(_tonToken), amount, tonAmount, address(this));
        _deposit(tonAmount / 2);

        if (_current_stake_amount + tonAmount / 2 <= _max_stake_amount) {
            _add_liquidity(tonAmount / 4);
            
            _tonToken.transfer(_royaltyAddr, tonAmount / 4);
        } else {
            _tonToken.burn(tonAmount / 2, _liquidityAddr);
        }
    }

    function swap(address _tokenIn, address _tokenOut, uint256 _amountIn, uint256 _amountOutMin, address _to) internal
    {
        // first we need to transfer the amount in tokens from the msg.sender to this contract
        // this contract will have the amount of in tokens
        IERC20(_tokenIn).transferFrom(msg.sender, address(this), _amountIn);
    
        // next we need to allow the uniswapv2 router to spend the token we just sent to this contract 
        // by calling IERC20 approve you allow the uniswap contract to spend the tokens in this contract 
        IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, _amountIn);

        // path is an array of addresses.
        // this path array will have 3 addresses [tokenIn, WETH, tokenOut]
        // the if statement below takes into account if token in or token out is WETH.  then the path is only 2 addresses
        address[] memory path;
        if (_tokenIn == WETH || _tokenOut == WETH) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WETH;
            path[2] = _tokenOut;
        }
        
        // then we will call swapExactTokensForTokens
        // for the deadline we will pass in block.timestamp
        // the deadline is the latest time the trade is valid for
        IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(_amountIn, _amountOutMin, path, _to, block.timestamp);
    }

    // this function will return the minimum amount from a swap
    // input the 3 parameters below and it will return the minimum amount out
    // this is needed for the swap function above
    function getAmountOutMin(address _tokenIn, address _tokenOut, uint256 _amountIn) internal view returns (uint256)
    {
       // path is an array of addresses.
       // this path array will have 3 addresses [tokenIn, WETH, tokenOut]
       // the if statement below takes into account if token in or token out is WETH.  then the path is only 2 addresses
        address[] memory path;
        if (_tokenIn == WETH || _tokenOut == WETH) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = WETH;
            path[2] = _tokenOut;
        }
        
        uint256[] memory amountOutMins = IUniswapV2Router(UNISWAP_V2_ROUTER).getAmountsOut(_amountIn, path);
        return amountOutMins[path.length -1];  
    }
}
