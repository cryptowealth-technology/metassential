import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import { getAddress } from '@ethersproject/address';

const ERC1155 = [
  'function balanceOf(address _owner, uint256 _id) external view returns (uint256)',
];

const ERC721 = [
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

async function ownerOf1155(
  contractAddress: string,
  tokenId: string,
  address: string,
  mainnetProvider: JsonRpcProvider,
): Promise<boolean> {
  const nftContract = new Contract(contractAddress, ERC1155, mainnetProvider);
  const balance = await nftContract.balanceOf(address, BigNumber.from(tokenId));

  return balance.gt(0);
}

async function ownerOf721(
  contractAddress: string,
  tokenId: string,
  address: string,
  mainnetProvider: JsonRpcProvider,
): Promise<boolean> {
  const nftContract = new Contract(contractAddress, ERC721, mainnetProvider);
  const owner = await nftContract.ownerOf(BigNumber.from(tokenId));

  return getAddress(owner) === getAddress(address);
}

async function isOwner(
  contractAddress: string,
  tokenId: string,
  address: string,
  mainnetRpcUrl: string,
) {
  const mainnetProvider = new JsonRpcProvider(mainnetRpcUrl);

  let _isOwner = false;

  try {
    _isOwner = await ownerOf721(
      contractAddress,
      tokenId,
      address,
      mainnetProvider,
    );
  } catch (error) {
    _isOwner = await ownerOf1155(
      contractAddress,
      tokenId,
      address,
      mainnetProvider,
    );
  }

  return _isOwner;
}

export { isOwner, ownerOf1155, ownerOf721 };
