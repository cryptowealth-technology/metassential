import { Web3Provider, JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber } from 'ethers';

declare type OwnershipCreds = {
    contractAddress: string;
    tokenId: BigNumber;
};
declare function sendMetaTx(data: string, to: string, walletProvider: Web3Provider, network: number, readProvider: JsonRpcProvider, from: string, forwardingContract: {
    address: string;
    abi: any;
}, creds?: OwnershipCreds, onSigned?: () => void): Promise<any>;

declare function signMetaTxRequest(signer: Web3Provider, chainId: number, readProvider: JsonRpcProvider, input: Record<string, any>, { abi, address, name }: Record<string, any>): Promise<{
    signature: string;
    request: Record<string, any>;
}>;

export { sendMetaTx, signMetaTxRequest };
