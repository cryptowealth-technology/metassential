import { Provider } from '@ethersproject/abstract-provider';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { signMetaTxRequest } from './signer';

const wrapContract = (
  signer: Provider | Web3Provider | string,
  from: string,
  implementationContract: Contract,
  forwarder: Contract,
) => {
  return Object.values(implementationContract.interface.functions).reduce(
    (funcs, _func) => {
      return {
        ...funcs,
        [_func.name]: async (...args: (string | number)[]) => {
          if (_func.stateMutability === 'nonpayable') {
            const [nftContract, tokenId, authorizer] = args.splice(
              args.length - 3,
              3,
            );

            const data = implementationContract.interface.encodeFunctionData(
              _func.name,
              args,
            );

            return signMetaTxRequest(
              signer,
              (await implementationContract.provider.getNetwork()).chainId,
              {
                to: implementationContract.address,
                from,
                data,
                nftContract,
                tokenId,
                authorizer,
              },
              forwarder,
            );
          } else {
            return implementationContract[_func.name](...args);
          }
        },
      };
    },
    {},
  );
};

export { wrapContract };
