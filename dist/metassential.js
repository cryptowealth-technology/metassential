'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var contracts = require('@ethersproject/contracts');
var ethSigUtil = require('@metamask/eth-sig-util');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var ethSigUtil__default = /*#__PURE__*/_interopDefaultLegacy(ethSigUtil);

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
    return ethSigUtil__default["default"].signTypedData({
      privateKey,
      data,
      version: ethSigUtil__default["default"].SignTypedDataVersion.V4
    });
  }
  const isHardhat = data.domain.chainId == 31337;
  const [method, argData] = isHardhat ? ["eth_signTypedData", data] : ["eth_signTypedData_v4", JSON.stringify(data)];
  return await signer.send(method, [from, argData]);
}
async function attachNonce(forwarder, input) {
  const nonce = await forwarder.getNonce(input.from).then((nonce2) => nonce2.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}
async function signMetaTxRequest(signer, chainId, readProvider, input, { abi, address, name }) {
  const forwarder = new contracts.Contract(address, abi, readProvider);
  const request = await attachNonce(forwarder, input);
  const toSign = getMetaTxTypeData(forwarder.address, request, chainId, name);
  const signature = await signTypedData(signer, input.from, toSign);
  return { signature, request };
}

async function sendMetaTx(data, to, walletProvider, network, readProvider, from, forwardingContract, creds, onSigned) {
  const url = process.env.AUTOTASK_URL;
  const request = await signMetaTxRequest(walletProvider, network, readProvider, {
    to,
    from,
    data,
    creds
  }, { ...forwardingContract });
  if (!url)
    throw new Error(`Missing relayer url ${JSON.stringify(request)}`);
  onSigned && onSigned();
  return fetch(url, {
    method: "POST",
    body: JSON.stringify(request),
    headers: { "Content-Type": "application/json" }
  });
}

exports.sendMetaTx = sendMetaTx;
exports.signMetaTxRequest = signMetaTxRequest;
//# sourceMappingURL=metassential.js.map
