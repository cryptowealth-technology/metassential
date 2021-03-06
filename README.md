# Token Gated Meta-Transactions

## a full-stack solution for gating L2 transactions with L1 NFT ownership

"Token Gating" in web3 often refers to restricting actions based on ownership of a token. Solutions exist for dapp token gating, and onchain token gating is simple to implement in a contract on the same chain as the token.

0xEssential offers a standards-based and permissionless approach to gating L2 transactions with L1 token ownership. Our solution uses EIP-2771 compliant meta-transactions through a Forwarding Contract combined with EIP-3668 CCIP Read for offchain (or cross-chain) lookup against a JSON RPC server.

Our approach also introduces a lightweight way to authorize alternative addresses to perform token-gated actions for NFTs owned by an EOA. This can be useful for improving UX - a hardware wallet user can authorize a "burner" EOA to use the NFTs owned by that vault address, without transferring the NFT or giving on-chain transfer approval, and without having to use the hardware wallet to constantly verify signed messages for a game. Your experience can even create throwaway burner wallets that sign meta-transactions without user intervention.

The high level flow works like this:

1. A user submits a transaction to specify an authorized address and duration for a gate session - it may be their own address or a burner or a friend's address
2. The authorized EOA signs EIP-2771 structured request data via your dapp to perform a transaction on their & the authorizing EOA's behalf
3. The signature and structured request data is submitted over https to a Relayer - either your own or a managed back end
4. The Relayer verifies the signature against the Forwarding Contract
5. If the meta-tx signature is valid, the Forwarding Contract **reverts** with an `OffchainLookup` error per EIP-3668
6. The Relayer catches this error, and uses the error params to submit a request to the JSON RPC server (not a chain gateway, just a standard RPC API)
7. The JSON RPC looks up the current L1 ownership for the requested NFT and on-chain gate authorizations, then returns a signed message proof encoding the address permitted to use the NFT
8. The Relayer receives the proof, and submits a transaction to the Forwarding Contract with the proof and additional data from the `OffchainLookup` error args
9. The Forwarding Contract executes the meta-tx only if the meta-tx signer owns or is authorized to use the NFT by its owner
10. Gate Sessions are invalidated when a new gate session is created byt the primary EOA or the current session expires - only one address is authorized to use an EOA's NFTs at a given time.

The SDK provides Javascript client function for generating ERC2771 signatures on behalf of a Transaction Signer and server side functions for your Relayer. The Solidity package includes a Forwarding contract and inheritable logic for your implementation contracts. An express-like JSON RPC server includes logic for providing the OffchainLookup proof.

## why?

Meta-transactions are primarily used for paying the transaction fees on behalf of your users. Token Gated Meta-Transactions support this use-case while also providing standards-based middleware for building gated cross-chain experiences - if you're willing to trade some decentralization for user experience, the middleware and contracts can be used to only submit meta-transactions if certain conditions are met. These transactions can be submitted by any client, but must retrieve a trusted proof from a centralized API.

0xEssential uses the NFT ownership middleware in our game [Wrasslers](https://wrasslers.com). When a user submits a signature to perform a game move, we only relay that transaction to the Polygon chain if the signer currently owns the Layer 1 NFT they are using to perform their move.

## Terminology

### Transaction Signer

The **transaction signer** is an externally owned account (EOA) that can sign structured data that you can use to submit a transaction on that signer's behalf. The SDK supports any Ethereum wallet that supports `signTypedData_v4` as well as private-key based signing for use in scripts or tests.

### Relayer

A **relayer** is a web service that has keys for an externally owned account (EOA) managed by you. You can setup a relayer and wallet on your own back-end, or use a service like OpenZeppelin Defender that manages relayer accounts for you, allowing you to fund the wallet and write your own handler functions.

### Forwarding Contract

A generic **forwarding contract** sits between a relayer and the contract that implements your business logic. This contract manages nonces for EOAs and verifies signatures. When you submit a meta-transaction, you're submitting a transaction to the forwarding contract, which verifies the signature, appends signer context and delegates a call to your implementation contract.

You can use a generic forwarding contract, or deploy your own version. OpenZeppelin provides a `MinimalForwarder` contract, and 0xEssential offers a more opinionated flavor that for providing a custom name to the forwarder for UX purposes and tighter access control for approved relayers.

### Implementation Contract

The implementation contract is the contract that includes your business logic. Meta-transactions are sent through the forwarding contract to the implementation contract. Your implementation contract **must support ERC2771 meta-transactions** by removing any reliance on `msg.sender`. You cannot add meta-transaction support to a contract that is already deployed.

OpenZeppelin provides a variant of their `Context` contract that includes ERC2771 support, and 0xEssential offers a more opinionated flavor that includes modifiers to **only** accept meta-transactions via your trusted forwarder. 0xEssential's version also adds functions for updating your trusted forwarder address.

### JSON RPC

A JSON RPC server is responsible for performing the L1 lookup and returning a signed proof. An EOA must be provided as the proof signer - the public address must be configured on the Forwarding Contract. This can be a different EOA than the account used for your relayer.

## Getting Started

The best way to get started is to check out the test and example directories. Supporting meta-transactions is a bigger project than installing a package - your contracts, frontend and backend all need to work together.

Your contracts must support meta-transactions, so we suggest starting with our contract examples. The `EssentialForwarder` contract is our opinionated Forwarding contract for handling meta-transaction requests. It's designed to work with the `EssentialERC2771Context` primitive - inherit this contract in your project and be sure to replace any `msg.sender` calls with `_msgSender()`.

Once you have a forwarding contract and ERC2771 compliant contract deployed on a dev or testnet you 