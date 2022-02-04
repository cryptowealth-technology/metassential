import { JsonRpcProvider, Web3Provider } from '@ethersproject/providers';
import { Provider } from '@ethersproject/abstract-provider';
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from 'ethers';
import { signMetaTxRequest } from './signer';

type OwnershipCreds = {
  contractAddress: string;
  tokenId: BigNumber;
};

export async function sendMetaTx(
  data: string,
  to: string,
  walletProvider: Web3Provider | Provider,
  network: number,
  readProvider: JsonRpcProvider,
  from: string,
  forwardingContract: Contract,
  creds?: OwnershipCreds,
  onSigned?: () => void,
): Promise<any> {
  const url = process.env.AUTOTASK_URL;

  const request = await signMetaTxRequest(
    walletProvider,
    network,
    {
      to,
      from,
      data,
      creds,
    },
    forwardingContract,
  );

  if (!url) throw new Error(`Missing relayer url ${JSON.stringify(request)}`);

  onSigned && onSigned();

  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { 'Content-Type': 'application/json' },
  });
}
