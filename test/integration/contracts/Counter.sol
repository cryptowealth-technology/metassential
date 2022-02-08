//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./EssentialERC2771Context.sol";

contract Counter is EssentialERC2771Context {
    mapping(address => uint256) public count;
    
    modifier onlyForwarder() {
        require(isTrustedForwarder(msg.sender), "Counter:429");
        _;
    }

    modifier onlyTrusted() {
        require(isTrustedForwarder(msg.sender), "Counter:429");
        require(isTrustedExecution(), "Counter:429");
        _;
    }

    constructor(address trustedForwarder) EssentialERC2771Context(trustedForwarder) {}

    function increment() external {
        count[_msgSender()] += 1;
    }

    function incrementFromForwarderOnly() onlyTrusted external {
        count[_msgSender()] += 1;
    }
}
