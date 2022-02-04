import ethSigUtil from '@metamask/eth-sig-util';
import { Contract, BigNumber, utils, providers } from 'ethers';

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
];
const ForwardRequest = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "gas", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "data", type: "bytes" }
];
function getMetaTxTypeData(verifyingContract, message, chainId, name) {
  return {
    types: {
      EIP712Domain,
      ForwardRequest
    },
    domain: {
      name,
      version: "0.0.1",
      verifyingContract,
      chainId
    },
    primaryType: "ForwardRequest",
    message
  };
}
async function signTypedData(signer, from, data) {
  if (typeof signer === "string") {
    const privateKey = Buffer.from(signer.replace(/^0x/, ""), "hex");
    return ethSigUtil.signTypedData({
      privateKey,
      data,
      version: ethSigUtil.SignTypedDataVersion.V4
    });
  }
  return await signer.send("eth_signTypedData_v4", [from, JSON.stringify(data)]);
}
async function attachNonce(forwarder, input) {
  const nonce = await forwarder.getNonce(input.from).then((nonce2) => nonce2.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}
async function signMetaTxRequest(signer, chainId, input, forwarder) {
  const request = await attachNonce(forwarder, input);
  const toSign = getMetaTxTypeData(forwarder.address, request, chainId, forwarder.name || "NFightGasStation");
  const signature = await signTypedData(signer, input.from, toSign);
  return { signature, request };
}

async function sendMetaTx(data, to, walletProvider, network, readProvider, from, forwardingContract, creds, onSigned) {
  const url = process.env.AUTOTASK_URL;
  const request = await signMetaTxRequest(walletProvider, network, {
    to,
    from,
    data,
    creds
  }, forwardingContract);
  if (!url)
    throw new Error(`Missing relayer url ${JSON.stringify(request)}`);
  onSigned && onSigned();
  return fetch(url, {
    method: "POST",
    body: JSON.stringify(request),
    headers: { "Content-Type": "application/json" }
  });
}

const ERC1155 = [
  "function balanceOf(address _owner, uint256 _id) external view returns (uint256)"
];
const ERC721 = [
  "function ownerOf(uint256 _id) external view returns (address)"
];
async function ownerOf1155(contractAddress, tokenId, address, mainnetProvider) {
  const nftContract = new Contract(contractAddress, ERC1155, mainnetProvider);
  const balance = await nftContract.balanceOf(address, BigNumber.from(tokenId));
  return balance.gt(0);
}
async function ownerOf721(contractAddress, tokenId, address, mainnetProvider) {
  const nftContract = new Contract(contractAddress, ERC721, mainnetProvider);
  const owner = await nftContract.ownerOf(BigNumber.from(tokenId));
  return utils.getAddress(owner) === utils.getAddress(address);
}
async function isOwner(contractAddress, tokenId, address, mainnetRpcUrl) {
  const mainnetProvider = new providers.JsonRpcProvider(mainnetRpcUrl);
  let _isOwner = false;
  try {
    _isOwner = await ownerOf721(contractAddress, tokenId, address, mainnetProvider);
  } catch (error) {
    _isOwner = await ownerOf1155(contractAddress, tokenId, address, mainnetProvider);
  }
  return _isOwner;
}

export { isOwner, ownerOf1155, ownerOf721, sendMetaTx, signMetaTxRequest };
//# sourceMappingURL=metassential.mjs.map
