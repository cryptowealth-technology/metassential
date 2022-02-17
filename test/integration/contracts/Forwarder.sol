// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./SignedOwnershipProof.sol";
import './IForwardRequest.sol';

contract EssentialForwarder is EIP712, AccessControl, SignedOwnershipProof {
    using ECDSA for bytes32;

    error OffchainLookup(address sender, string[1] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    bytes32 private constant _TYPEHASH =
        keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)");

    mapping(address => uint256) private _nonces;

    constructor(string memory name) EIP712(name, "0.0.1") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setOwnershipSigner(msg.sender);
    }

    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    function verify(IForwardRequest.ForwardRequest calldata req, bytes calldata signature)
        public
        view
        returns (bool)
    {
        address signer = _hashTypedDataV4(
            keccak256(abi.encode(_TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, keccak256(req.data)))
        ).recover(signature);
        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    function preflight(IForwardRequest.ForwardRequest calldata req, bytes calldata signature)
        public
        view
    {
        if (verify(req, signature)) {
            revert OffchainLookup(
                address(this),
                ["https://mid.nfight.xyz"],
                abi.encode(req.from, _nonces[req.from], req.nftContract, req.tokenId),
                this.executeWithProof.selector,
                signature
            );
        }
    }

    function execute(IForwardRequest.ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool, bytes memory)
    {
       return _execute(req, signature, false);
    }

    function executeWithProof(IForwardRequest.ForwardRequest calldata req, bytes calldata signature, bytes calldata proof)
        public
        payable
        onlyRole(ADMIN_ROLE)
        returns (bool, bytes memory)
    {
        validateOwnershipProof(req, proof);
        return _execute(req, signature, true);
    }

    function _execute(IForwardRequest.ForwardRequest calldata req, bytes calldata signature, bool trusted) internal returns (bool, bytes memory) {
        require(verify(req, signature), "TestForwarder: signature does not match request");
        _nonces[req.from] = req.nonce + 1;

        IForwardRequest.ForwardRequest memory _req = IForwardRequest.ForwardRequest({
          from: req.from,
          to: req.to,
          value: req.value,
          gas: req.gas,
          nonce: req.nonce,
          data: req.data,
          nftContract: req.nftContract, 
          tokenId: req.tokenId
        });

        (bool success, bytes memory returndata) = req.to.call{gas: _req.gas, value: _req.value}(
            abi.encodePacked(_req.data, uint256(trusted == true ? 1 : 0), _req.from)
        );

        // Validate that the relayer has sent enough gas for the call.
        // See https://ronan.eth.link/blog/ethereum-gas-dangers/
        assert(gasleft() > _req.gas / 63);

        return (success, returndata);
    }

}

