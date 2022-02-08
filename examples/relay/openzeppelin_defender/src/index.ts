import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from 'defender-relay-client/lib/ethers';
import {BigNumber, Contract, utils, providers} from 'ethers';

import IERC721 from '@openzeppelin/contracts/build/contracts/IERC721.json';

import Forwarder from '../../deployments/matic/WrasslersGasStation.json';
import WrasslersSaveState from '../../deployments/goerli/WrasslersSaveState.json';

const ERC1155 = [
  'function balanceOf(address _owner, uint256 _id) external view returns (uint256)',
];

function ipfs(url: string): string {
  return url.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
}

async function wrasslerAttributes(
  contractAddress: string,
  tokenId: string,
  mainnetProvider: providers.JsonRpcProvider
): Promise<Record<string, string>> {
  const SaveState = new Contract(
    WrasslersSaveState.address,
    WrasslersSaveState.abi,
    mainnetProvider
  );

  const attributesURI = await SaveState.attributesURI(
    contractAddress,
    BigNumber.from(tokenId)
  );
  // 29 = length of "data:application/json;base64,"
  const json = Buffer.from(attributesURI.substring(29), 'base64').toString();
  const result = JSON.parse(json);
  console.log(result);
  return result;
}

async function ownerOf1155(
  contractAddress: string,
  tokenId: string,
  address: string,
  mainnetProvider: providers.JsonRpcProvider
): Promise<boolean> {
  const nftContract = new Contract(contractAddress, ERC1155, mainnetProvider);
  const balance = await nftContract.balanceOf(address, BigNumber.from(tokenId));

  return balance.gt(0);
}

async function ownerOf721(
  contractAddress: string,
  tokenId: string,
  address: string,
  mainnetProvider: providers.JsonRpcProvider
): Promise<boolean> {
  const nftContract = new Contract(
    contractAddress,
    IERC721.abi,
    mainnetProvider
  );
  const owner = await nftContract.ownerOf(BigNumber.from(tokenId));

  return utils.getAddress(owner) === utils.getAddress(address);
}

async function isOwner(
  contractAddress: string,
  tokenId: string,
  address: string,
  mainnetRpcUrl: string
) {
  const mainnetProvider = new providers.JsonRpcProvider(mainnetRpcUrl);

  let _isOwner = false;

  try {
    _isOwner = await ownerOf721(
      contractAddress,
      tokenId,
      address,
      mainnetProvider
    );
  } catch (error) {
    _isOwner = await ownerOf1155(
      contractAddress,
      tokenId,
      address,
      mainnetProvider
    );
  }

  return _isOwner;
}

async function relay(
  forwarder: Contract,
  request: any,
  signature: string,
  mainnetRpcUrl: string
) {
  const {
    creds: {contractAddress, tokenId},
  } = request;

  const accepts = await isOwner(
    contractAddress,
    tokenId,
    request.from,
    mainnetRpcUrl
  );
  if (!accepts) throw new Error(`Rejected request to ${request.to}`);

  // Validate request on the forwarder contract
  const valid = await forwarder.verify(request, signature);
  if (!valid) throw new Error(`Invalid request`);

  // Send meta-tx through relayer to the forwarder contract
  const gasLimit = (parseInt(request.gas) * 1.4).toString();
  return await forwarder.execute(request, signature, {gasLimit});
}

// Entrypoint for the Autotask
export async function handler(event: any) {
  // Parse webhook payload
  if (!event.request || !event.request.body) throw new Error(`Missing payload`);
  const {request, signature} = event.request.body;

  const {mainnetRpcUrl} = event.secrets;

  // Initialize Relayer provider and signer, and forwarder contract
  const credentials = {...event};
  const provider = new DefenderRelayProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider, {
    speed: 'fastest',
  });
  const forwarder = new Contract(Forwarder.address, Forwarder.abi, signer);

  // Relay transaction!
  const tx = await relay(forwarder, request, signature, mainnetRpcUrl);
  console.log(`Sent meta-tx: ${tx.hash}`);
  return {txHash: tx.hash};
}
// Sample typescript type definitions
type EnvInfo = {
  API_KEY: string;
  API_SECRET: string;
};

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
  const {API_KEY: apiKey, API_SECRET: apiSecret} = process.env as EnvInfo;
  handler({apiKey, apiSecret})
    .then(() => process.exit(0))
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });
}
