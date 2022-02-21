// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IForwardRequest {
    struct ForwardRequest {
        address from;         // Externally-owned account (EOA) signing the request.
        address authorizer;   // Externally-owned account (EOA) that authorized from account in PlaySession.
        address to;           // Destination address, normally a smart contract for an nFight game.
        address nftContract;  // The ETH Mainnet address of the NFT contract for the token being used.
        uint256 tokenId;      // The tokenId of the ETH Mainnet NFT being used
        uint256 value;        // Amount of ether to transfer to the destination.
        uint256 gas;          // Amount of gas limit to set for the execution.
        uint256 nonce;        // On-chain tracked nonce of a transaction.
        bytes data;           // (Call)data to be sent to the destination.
    }

    struct PlaySession {
        address authorized;   // Burner EOA that authorized by owner EOA.
        // address to;           // Destination address, normally a smart contract for an nFight game, for which the PlaySession is valid
        // address nftContract;  // The ETH Mainnet address of the NFT contract for which the PlaySession is valid
        // uint256 tokenId;      // The tokenId of the ETH Mainnet NFT for which the PlaySession is valid
        uint256 expiresAt;    // block timestamp when the session is invalidated.
        // uint256 nonce;        // On-chain tracked nonce of a transaction.
    }
}