# metassential

## a meta-transaction Javascript SDK

metassential provides a fullstack solution for performing meta-transactions on EVM blockchains. The SDK includes both Javascript client function for generating ERC2771 signatures on behalf of a Transaction Signer and server-side functions for relaying the transaction through a compliant Forwarder contract. The server-side code also includes middleware for cross-chain token gating. metassential also offers opinionated spec-compliant Solidity contracts for handling meta-transactions in your smart contracts.

## why?

Meta-transactions are primarily used for paying the transaction fees on behalf of your users. metassential supports this use-case while also providing opinionated tools building cross-chain experiences - if you're willing to trade some decentralization for user experience, the middleware and contracts provided by metassential can be used to only submit meta-transactions if certain conditions are met.

For example, 0xEssential uses the NFT ownership middleware in our game [Wrasslers](https://wrasslers.com). When a user submits a signature to perform a game move, we only relay that transaction to the Polygon chain if the signer currently owns the Layer 1 NFT they are using to perform their move.

## Terminology

### Transaction Signer

The **transaction signer** is an externally owned account (EOA) that can sign structured data that you can use to submit a transaction on that signer's behalf. metassential supports any Ethereum wallet that supports `signTypedData_v4` as well as private-key based signing for use in scripts or tests.

### Relayer

A **relayer** is an externally owned account (EOA) managed by you. You can setup your a relayer wallet on your own back-end, or use a service like OpenZeppelin that manages relayer accounts for you, allowing you to fund the wallet.

### Forwarding Contract

A **forwarding contract** sits between a relayer and the contract that implements your business logic. This contract manages nonces for EOAs and verifies signatures. When you submit a meta-transaction, you're submitting a transaction to the forwarding contract, which verifies the signature, appends signer context and delegates a call to your implementation contract.

You can use a generic forwarding contract, or deploy your own version. OpenZeppelin provides a `MinimalForwarder` contract, and 0xEssential offers a more opinionated flavor that for providing a custom name to the forwarder for UX purposes and tighter access control for approved relayers.

### Implementation Contract

The implementation contract is the contract that includes your business logic. Meta-transactions are sent through the forwarding contract to the implementation contract. Your implementation contract **must support ERC2771 meta-transactions** by removing any reliance on `msg.sender`. You cannot add meta-transaction support to a contract that is already deployed.

OpenZeppelin provides a variant of their `Context` contract that includes ERC2771 support, and 0xEssential offers a more opinionated flavor that includes modifiers to **only** accept meta-transactions via your trusted forwarder. 0xEssential's version also adds functions for updating your trusted forwarder address.

## Getting Started

The best way to get started with metassential is to check out the test and example directories. Supporting meta-transactions is a bigger project than installing a package - your contracts, frontend and backend all need to work together.

Your contracts must support meta-transactions to use metassential, so we suggest starting with our contract examples. The `EssentialForwarder` contract is our opinionated Forwarding contract for handling meta-transaction requests. It's designed to work with the `EssentialERC2771Context` primitive - inherit this contract in your project and be sure to replace any `msg.sender` calls with `_msgSender()`.

Once you have a forwarding contract and ERC2771 compliant contract deployed on a dev or testnet you 