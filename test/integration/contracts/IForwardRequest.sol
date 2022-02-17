// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IForwardRequest {
    struct ForwardRequest {
        address from;       // Externally-owned account (EOA) making the request.
        address to;         // Destination address, normally a smart contract.
        address nftContract;
        uint256 tokenId;
        uint256 value;      // Amount of ether to transfer to the destination.
        uint256 gas;        // Amount of gas limit to set for the execution.
        uint256 nonce;      // On-chain tracked nonce of a transaction.
        bytes data;         // (Call)data to be sent to the destination.
    }
}