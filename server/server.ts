import 'dotenv/config';
import rpc from 'json-rpc2';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, utils, Wallet } from 'ethers';

const OWNER_ABI = [
  'function ownerOf(uint256 tokenId) public view returns (address)',
];

const server = rpc.Server.$create({
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
});

function decodeCalldata(calldata: string): Record<string, any> {
  const abi = new utils.AbiCoder();
  const [from, nonce, nftContract, tokenId] = abi.decode(
    ['address', 'uint256', 'address', 'uint256'],
    calldata,
  );

  return { from, nonce, nftContract, tokenId };
}

async function fetchCurrentOwner(
  nftContract: string,
  tokenId: BigNumber,
): Promise<string> {
  const mainnetProvider = new JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const Erc721 = new Contract(nftContract, OWNER_ABI, mainnetProvider);
  return Erc721.ownerOf(tokenId);
}

async function generateProof({
  from,
  nonce,
  nftContract,
  tokenId,
  to,
  abi,
}): Promise<string> {
  // This EOA won't have any assets, and can be easily changed on the Forwarding
  // contract, so the risk profile is pretty low. We use this on the L2 to fetch
  // the message to sign. This step may be unnecessary? Must we call the contract
  // per spec, or can we just make the L1 call with the calldata provided?

  const altnetProvider = new JsonRpcProvider(process.env.ALTNET_RPC_URL);
  const ownershipSigner = new Wallet(
    process.env.OWNERSHIP_SIGNER_PRIVATE_KEY,
    altnetProvider,
  );

  const forwarder = new Contract(to, abi, ownershipSigner);
  const message = await forwarder.createMessage(
    from,
    nonce,
    nftContract,
    tokenId,
  );

  return ownershipSigner.signMessage(utils.arrayify(message));
}

async function durinCall({ callData, to, abi }, _opt, callback) {
  // decode the callData
  const { from, nonce, nftContract, tokenId } = decodeCalldata(callData);

  // lookup current owner on mainnet
  const owner = await fetchCurrentOwner(nftContract, tokenId);

  // return an error if the current owner does not match the from address
  if (utils.getAddress(owner) !== utils.getAddress(from)) {
    return callback(new rpc.Error.InternalError());
  }

  const proof = await generateProof({
    from,
    nonce,
    nftContract,
    tokenId,
    to,
    abi,
  });

  callback(null, proof);
}

server.expose('durin_call', durinCall);
server.listen(8000, 'localhost');
