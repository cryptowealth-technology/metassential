import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from 'defender-relay-client/lib/ethers';
import { Contract, utils } from 'ethers';

import Forwarder from './abis/EssentialForwarder.json';

async function preflight(forwarder: Contract, request: any, signature: string) {
  // Validate request on the forwarder contract

  try {
    await forwarder.preflight(request, signature, {
      gasLimit: utils.hexlify(2100000),
      gasPrice: utils.parseUnits('50', 'gwei'),
    });
  } catch (e) {
    console.warn('CAUGHT', e);
    if (e.code === utils.Logger.errors.CALL_EXCEPTION) {
      if (e.errorName === 'OffchainLookup') {
        const args = {
          sender: e.args.sender,
          url: e.args.urls[0],
          callData: e.args.callData,
          callbackFunction: e.args.callbackFunction,
          extraData: e.args.extraData,
        };

        return args;
      }
    }
  }
  throw new Error(`Preflight did not revert`);
}

async function retrieveProof({ url, callData, sender }): Promise<string> {
  const result = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ callData, to: sender, abi: '' }),
  });

  const body = await result.json();
  return body?.response;
}

// Entrypoint for the Autotask
export async function handler(event: any) {
  // Parse webhook payload
  if (!event.request || !event.request.body) throw new Error(`Missing payload`);
  const { request, signature } = event.request.body;

  // Initialize Relayer provider, signer and forwarder contract
  const credentials = { ...event };
  const provider = new DefenderRelayProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider, {});

  const forwarder = new Contract(Forwarder.address, Forwarder.abi, signer);

  // Preflight transaction
  const { sender, url, callData, callbackFunction, extraData } =
    await preflight(forwarder, request, signature);

  // Fetch proof from error params
  const proof = await retrieveProof({ url, callData, sender });

  const abi = new utils.AbiCoder();

  const tx = await signer.sendTransaction({
    to: forwarder.address,
    data: utils.hexConcat([
      callbackFunction,
      abi.encode(['bytes', 'bytes'], [proof, extraData]),
    ]),
  });

  console.log(`Sent meta-tx: ${tx.hash}`);
  return { txHash: tx.hash };
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
  const { API_KEY: apiKey, API_SECRET: apiSecret } = process.env as EnvInfo;
  handler({ apiKey, apiSecret })
    .then(() => process.exit(0))
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });
}
