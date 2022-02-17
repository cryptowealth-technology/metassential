import { Provider } from '@ethersproject/abstract-provider';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { signMetaTxRequest } from './signer';

const wrapContract = (
  signer: Provider | Web3Provider,
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
            const [nftContract, tokenId] = args.splice(args.length - 2, 2);

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
