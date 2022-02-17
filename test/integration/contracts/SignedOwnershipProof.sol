//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import './IForwardRequest.sol';

/// @title SignedOwnershipProof
/// @author Sammy Bauch
/// @notice Based on SignedAllowance by Simon Fremaux (@dievardump)
/// see https://github.com/dievardump/signed-minting

contract SignedOwnershipProof {
    using ECDSA for bytes32;    

    // address used to sign proof of ownership
    address private _ownershipSigner;

    /// @notice Helper to know ownershipSigner address
    /// @return the ownership proof signer address
    function ownershipSigner() public view virtual returns (address) {
        return _ownershipSigner;
    }

    /// @notice Helper that creates the message that signer needs to sign to allow a mint
    ///         this is usually also used when creating the allowances, to ensure "message"
    ///         is the same
    /// @param account the account to allow
    /// @param nonce the nonce
    /// @return the message to sign
    function createMessage(address account, uint256 nonce, address nftContract, uint256 tokenId)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(account, nonce, nftContract, tokenId));
    }

    /// @notice Verifies proof of ownership through a signature from a trusted API
    /// @dev Ensures that _ownershipSigner signed a message containing 
    ///      (nftOwner, nonce, nftContract, tokenId). This function only checks 
    ///      whether the signature is valid - separately we must assert that req.from
    ///      matches the signer for the meta-transaction signature
    /// @param req ForwardRequest structured data signed by EOA making a meta-transaction request
    /// @param signature the signature proof created by the ownership signer wallet
    function validateOwnershipProof(
        IForwardRequest.ForwardRequest calldata req,
        bytes memory signature
    ) public view {
        bytes32 message = createMessage(req.from, req.nonce, req.nftContract, req.tokenId)
            .toEthSignedMessageHash();

        require(message.recover(signature) == _ownershipSigner, '!INVALID_SIGNATURE!');
    }

    /// @notice Allows to change the ownership signer
    /// @param newSigner the new signer address
    function _setOwnershipSigner(address newSigner) internal {
        _ownershipSigner = newSigner;
    }
}
