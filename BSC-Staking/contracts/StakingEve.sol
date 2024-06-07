// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract Staking {
    function add_liquidity() public virtual;
}

contract StakingEve is Context, Ownable {
    IERC20 private immutable _tonToken;
    address private immutable _stakingAddr;

    modifier validAmount(uint256 amount) {
        require(amount >= 0, "Amount must be greater than 0");
        _;
    }

    receive() external payable {
    }
    
    constructor(IERC20 tonTokenAddr_, address stakingAddr_)
    {
        require(address(tonTokenAddr_) != address(0), "Token address cannot be the zero address");
        require(stakingAddr_ != address(0), "Token address cannot be the zero address");
        
        _tonToken = tonTokenAddr_;
        _stakingAddr = stakingAddr_;
    }

    function stakingAddress() public view virtual returns (address)
    {
        return _stakingAddr;
    }

    function received() public virtual
    {
        uint256 amount = _tonToken.balanceOf(address(this));
        
        _tonToken.transfer(_stakingAddr, amount);

        Staking staking = Staking(_stakingAddr);
        staking.add_liquidity();
    }
}