//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract Counter is ERC2771Context {
    mapping(address => uint256) public count;
    
    modifier onlyForwarder() {
        require(isTrustedForwarder(msg.sender), "Counter:429");
        _;
    }

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {}

    function increment() external {
        count[_msgSender()] += 1;
    }

    function incrementFromForwarderOnly() onlyForwarder external {
        count[_msgSender()] += 1;
    }

    function _msgSender()
        internal
        view
        virtual
        override
        returns (address sender)
    {
        return super._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override
        returns (bytes calldata)
    {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }
}
