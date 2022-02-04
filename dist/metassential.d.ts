import { Web3Provider, JsonRpcProvider } from '@ethersproject/providers';
import { Provider } from '@ethersproject/abstract-provider';
import { Contract } from '@ethersproject/contracts';
import { BigNumber, providers } from 'ethers';

declare type OwnershipCreds = {
    contractAddress: string;
    tokenId: BigNumber;
};
declare function sendMetaTx(data: string, to: string, walletProvider: Web3Provider | Provider, network: number, readProvider: JsonRpcProvider, from: string, forwardingContract: Contract, creds?: OwnershipCreds, onSigned?: () => void): Promise<any>;

declare function signMetaTxRequest(signer: Web3Provider | Provider, chainId: number, input: Record<string, any>, forwarder: Contract): Promise<{
    signature: string;
    request: Record<string, any>;
}>;

declare function ownerOf1155(contractAddress: string, tokenId: string, address: string, mainnetProvider: providers.JsonRpcProvider): Promise<boolean>;
declare function ownerOf721(contractAddress: string, tokenId: string, address: string, mainnetProvider: providers.JsonRpcProvider): Promise<boolean>;
declare function isOwner(contractAddress: string, tokenId: string, address: string, mainnetRpcUrl: string): Promise<boolean>;

export { isOwner, ownerOf1155, ownerOf721, sendMetaTx, signMetaTxRequest };
