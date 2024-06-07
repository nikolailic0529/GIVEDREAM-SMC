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

    function stake(uint128 amount) public virtual;
    function unstake(uint128 amount) public virtual;
}

abstract contract NomiswapRouterService {
    function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) public virtual;
}


abstract contract NomiswapPair {
    function balanceOf(address owner) public virtual view returns (uint);

    function getReserves() public virtual view returns (uint112, uint112, uint32);
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

contract Farming is Context, Ownable {
    WrappedTON private immutable _tonToken;
    IERC20 private immutable _stakingToken;
    NomiswapPair private immutable _lpToken;
    uint256 private immutable _max_stake_amount;
    uint256 private _current_stake_amount;
    address private immutable _nomiswapStakingServiceAddr;
    address private immutable _nomiswapRouterServiceAddr;
    address private immutable _royaltyAddr;
    TonAddress private _liquidityAddr;

    address private constant Uniswap_V2_Router = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
    address private constant WETH = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address private constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    address private constant NMX = 0xd32d01A43c869EdcD1117C640fBDcfCFD97d9d65;
    address private constant TON = 0x76A797A59Ba2C17726896976B7B3747BfD1d220f;

    receive() external payable {
    }
    
    constructor(uint256 max_stake_amount_, IERC20 stakingToken_, address lpTokenAddr_, address nomiswapStakingServiceAddr_, address nomiswapRouterServiceAddr_)
    {
        address royaltyAddr_;
        TonAddress memory liquidityAddr_;

        _tonToken = WrappedTON(TON);
        _current_stake_amount = 0;
        _max_stake_amount = max_stake_amount_;
        _stakingToken = stakingToken_;
        _lpToken = NomiswapPair(lpTokenAddr_);
        _nomiswapStakingServiceAddr = nomiswapStakingServiceAddr_;
        _nomiswapRouterServiceAddr = nomiswapRouterServiceAddr_;
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
        uint128 real_amount = uint128(amount);
        nomiswapStakingService.unstake(real_amount);

        _received_from_staking_service(real_amount);
    }

    function add_liquidity() public virtual
    {
        uint256 amount = _tonToken.balanceOf(address(this));
        _add_liquidity(amount);
    }

    function _add_liquidity(uint256 amount) internal
    {
        _current_stake_amount += amount;

        // swap to nmx and staking token
        uint nmxAmount = _getAmountOutMin(address(_tonToken), NMX, amount / 2);
        swap(address(_tonToken), NMX, amount / 2, nmxAmount, address(this));
        
        uint stakingTokenAmount = _getAmountOutMin(address(_tonToken), address(_stakingToken), amount / 2);
        swap(address(_tonToken), address(_stakingToken), amount / 2, stakingTokenAmount, address(this));

        // _deposit();
    }

    function get_amount_before_deposit() public view returns (uint256, uint256, uint256, uint256, uint, uint)
    {
        uint256 nmxAmount = IERC20(NMX).balanceOf(address(this));
        uint256 stakingTokenAmount = _stakingToken.balanceOf(address(this));

        (uint reserve0, uint reserve1,) = _lpToken.getReserves();
        (uint reserveA, uint reserveB) = NMX < address(_stakingToken) ? (reserve0, reserve1) : (reserve1, reserve0);

        if (nmxAmount * reserveB / reserveA < stakingTokenAmount)
            stakingTokenAmount = nmxAmount * reserveB / reserveA;
        else
            nmxAmount = stakingTokenAmount * reserveA / reserveB;

        return (IERC20(NMX).balanceOf(address(this)), _stakingToken.balanceOf(address(this)), nmxAmount, stakingTokenAmount, reserveA, reserveB);
    }

    function deposit() public virtual
    {
        _deposit();
    } 

    function _deposit() internal
    {
        uint256 nmxAmount = IERC20(NMX).balanceOf(address(this));
        uint256 stakingTokenAmount = _stakingToken.balanceOf(address(this));

        (uint reserve0, uint reserve1,) = _lpToken.getReserves();
        (uint reserveA, uint reserveB) = NMX < address(_stakingToken) ? (reserve0, reserve1) : (reserve1, reserve0);

        if (nmxAmount * reserveB / reserveA < stakingTokenAmount)
            stakingTokenAmount = nmxAmount * reserveB / reserveA;
        else
            nmxAmount = stakingTokenAmount * reserveA / reserveB;

        // add liquidity
        IERC20(NMX).approve(_nomiswapRouterServiceAddr, nmxAmount);
        _stakingToken.approve(_nomiswapRouterServiceAddr, stakingTokenAmount);
        NomiswapRouterService(_nomiswapRouterServiceAddr).addLiquidity(NMX, address(_stakingToken), nmxAmount, stakingTokenAmount, nmxAmount * 995 / 1000, stakingTokenAmount * 995 / 1000, address(this), block.timestamp);
    }

    function stake() public virtual
    {
        // stake lp token
        uint256 amount = _lpToken.balanceOf(address(this));
        WrappedTON(address(_lpToken)).approve(_nomiswapStakingServiceAddr, amount);
        NomiswapStakingService(_nomiswapStakingServiceAddr).stake(uint128(amount));
    }

    function _received_from_staking_service(uint256 amount) internal
    {
        // swamp 25% to staking token
        uint256 stakingTokenAmount = _getAmountOutMin(NMX, address(_stakingToken), amount / 4);
        swap(NMX, address(_stakingToken), amount / 4, stakingTokenAmount, address(this));
        _deposit();

        // swap 50% to ton 
        uint256 tonAmount = _getAmountOutMin(NMX, address(_tonToken), amount / 2);
        swap(NMX, address(_tonToken), amount / 2, tonAmount, address(this));

        if (_current_stake_amount + tonAmount <= _max_stake_amount) {
            _add_liquidity(tonAmount / 2);
            
            _tonToken.transfer(_royaltyAddr, tonAmount / 2);
        } else {
            _tonToken.burn(tonAmount, _liquidityAddr);
        }
    }

    function swap(address _tokenIn, address _tokenOut, uint256 _amountIn, uint256 _amountOutMin, address _to) internal
    {
        IERC20(_tokenIn).approve(Uniswap_V2_Router, _amountIn);
    
        // path is an array of addresses.
        // this path array will have 3 addresses [tokenIn, USDT, tokenOut]
        // the if statement below takes into account if token in or token out is WETH.  then the path is only 2 addresses
        address[] memory path;
        if (_tokenIn == WETH || _tokenOut == WETH) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = USDT;
            path[2] = _tokenOut;
        }
        
        // then we will call swapExactTokensForTokens
        // for the deadline we will pass in block.timestamp
        // the deadline is the latest time the trade is valid for
        IUniswapV2Router(Uniswap_V2_Router).swapExactTokensForTokens(_amountIn, _amountOutMin, path, _to, block.timestamp);
    }

    // this function will return the minimum amount from a swap
    // input the 3 parameters below and it will return the minimum amount out
    // this is needed for the swap function above
    function getAmountOutMin(address _tokenIn, address _tokenOut, uint256 _amountIn) external view returns (uint256)
    {
       return _getAmountOutMin(_tokenIn, _tokenOut, _amountIn);
    }

    function _getAmountOutMin(address _tokenIn, address _tokenOut, uint256 _amountIn) internal view returns (uint256)
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
            path[1] = USDT;
            path[2] = _tokenOut;
        }
        
        uint256[] memory amountOutMins = IUniswapV2Router(Uniswap_V2_Router).getAmountsOut(_amountIn, path);
        return amountOutMins[path.length -1];  
    }
}
