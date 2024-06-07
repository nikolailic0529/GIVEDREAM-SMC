// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct TonAddress {
    int8 workchain;
    bytes32 address_hash;
}

abstract contract WrappedTON is IERC20 {
    function burn(uint256 amount, TonAddress memory addr) public virtual;
    function burnFrom(address account, uint256 amount, TonAddress memory addr) public virtual;
}


contract Royalty is Context, Ownable {
    WrappedTON private immutable _tonToken;
    address private immutable _specialAddr;
    TonAddress private _sendRoyaltyAddr;

    modifier validAmount(uint128 amount) {
        require(amount >= 0, "Amount must be greater than 0");
        _;
    }

    receive() external payable {
    }
    
    constructor(WrappedTON tonTokenAddr_, address specialAddr_, TonAddress memory sendRoyaltyAddr_)
    {
        require(address(tonTokenAddr_) != address(0), "Token address cannot be the zero address");
        require(specialAddr_ != address(0), "Token address cannot be the zero address");
        
        _tonToken = tonTokenAddr_;
        _specialAddr = specialAddr_;
        _sendRoyaltyAddr = sendRoyaltyAddr_;
    }

    function specialAddress() public view virtual returns (address)
    {
        return _specialAddr;
    }

    function sendRoyaltyAddress() public view virtual returns (TonAddress memory)
    {
        return _sendRoyaltyAddr;
    }

    function received() internal
    {
        uint256 amount = _tonToken.balanceOf(address(this));

        // To special fund
        _tonToken.transfer(_specialAddr, amount * 2 / 100);

        // To roralty clients
        _tonToken.burn(amount * 98 / 100, _sendRoyaltyAddr);
    }
}