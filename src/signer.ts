import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import ethSigUtil, { TypedMessage } from '@metamask/eth-sig-util';
import { BigNumber } from 'ethers';
import { Provider } from '@ethersproject/abstract-provider';

/**
 * Field in a User Defined Types
 */
export interface EIP712StructField {
  name: string;
  type: string;
}

/**
 * User Defined Types are just an array of the fields they contain
 */
export type EIP712Struct = EIP712StructField[];
/**
 * Interface of the EIP712Domain structure
 */
export interface EIP712Domain {
  name: string;
  version: string;
  chainId?: number;
  verifyingContract: string;
}

/**
 * Interface of the complete payload required for signing
 */
export interface EIP712Payload {
  types: PayloadTypes;
  primaryType: string;
  message: Record<string, string | number>;
  domain: EIP712Domain;
}

export interface EIP712Signature {
  hex: string;
  v: number;
  s: string;
  r: string;
}

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const ForwardRequest = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
];

interface PayloadTypes {
  EIP712Domain: EIP712Struct;
  ForwardRequest: EIP712Struct;
}

function getMetaTxTypeData(
  verifyingContract: string,
  message: Record<string, string | number>,
  chainId: number,
  name: string,
): EIP712Payload {
  return {
    types: {
      EIP712Domain,
      ForwardRequest,
    },
    domain: {
      name,
      version: '0.0.1',
      verifyingContract,
      chainId,
    },
    primaryType: 'ForwardRequest',
    message,
  };
}

async function signTypedData(
  signer: Web3Provider | string | Provider,
  from: string,
  data: EIP712Payload,
) {
  // If signer is a private key, use it to sign
  if (typeof signer === 'string') {
    const privateKey = Buffer.from(signer.replace(/^0x/, ''), 'hex');
    return ethSigUtil.signTypedData({
      privateKey,
      data: data as TypedMessage<any>,
      version: ethSigUtil.SignTypedDataVersion.V4,
    });
  }

  return await (signer as Web3Provider).send('eth_signTypedData_v4', [
    from,
    JSON.stringify(data),
  ]);
}

async function attachNonce(
  forwarder: Contract,
  input: Record<string, any>,
): Promise<Record<string, any>> {
  const nonce = await forwarder
    .getNonce(input.from)
    .then((nonce: BigNumber) => nonce.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}

async function signMetaTxRequest(
  signer: Web3Provider | Provider,
  chainId: number,
  input: Record<string, any>,
  forwarder: Contract,
): Promise<{
  signature: string;
  request: Record<string, any>;
}> {
  const request = await attachNonce(forwarder, input);
  const toSign = getMetaTxTypeData(
    forwarder.address,
    request,
    chainId,
    forwarder.name || 'NFightGasStation',
  );
  const signature = await signTypedData(signer, input.from, toSign);

  return { signature, request };
}

export { signMetaTxRequest };
