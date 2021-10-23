import chai from 'chai';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BaseContract } from 'ethers';
import { solidity } from 'ethereum-waffle';
import { AssetHouse, TestAsset, TestAvatar } from '../../../types';

chai.use(solidity);
const { expect } = chai;

export const addOperatorIfNotExist = async ({
  contract,
  owner,
  operator,
}: {
  contract: BaseContract;
  owner: SignerWithAddress;
  operator: string;
}) => {
  const exists = await contract.connect(owner).isOperable(operator);

  if (!exists) {
    await addOperator({
      contract,
      owner,
      operator,
    });
  }
};

export const addOperator = async ({
  contract,
  owner,
  operator,
}: {
  contract: BaseContract;
  owner: SignerWithAddress;
  operator: string;
}) => {
  await expect(contract.connect(owner).addOperator(operator)).not.to.be
    .reverted;
};

export const mintAvatar = async ({
  contract,
  receiver,
  owner,
  operator,
}: {
  contract: TestAvatar;
  receiver: string;
  owner: SignerWithAddress;
  operator: SignerWithAddress;
}): Promise<number> => {
  await addOperatorIfNotExist({ contract, owner, operator: operator.address });

  const tokenId = (await contract.totalSupply()).toNumber();
  await contract.connect(operator).mint(receiver);

  const tokenOwner = await contract.ownerOf(tokenId);
  expect(tokenOwner).to.equal(receiver);

  return tokenId;
};

export const mintAssetToken = async ({
  contract,
  assetHouseContract,
  receiver,
  owner,
  operator,
}: {
  contract: TestAsset;
  assetHouseContract: AssetHouse;
  receiver: string;
  owner: SignerWithAddress;
  operator: SignerWithAddress;
}): Promise<number> => {
  await addOperatorIfNotExist({ contract, owner, operator: operator.address });
  const assetDataId = await createAssetData({
    contract: assetHouseContract,
    owner,
    operator,
    assetHttpLink: 'TEST',
    name: 'TEST',
    creator: operator.address,
  });

  await registerAsset({
    contract,
    assetId: assetDataId,
    maxSupply: 999,
    owner,
    operator,
  });

  const tokenId = (await contract.totalSupply()).toNumber();

  await contract.connect(operator).randomMint(receiver);

  const tokenOwner = await contract.ownerOf(tokenId);
  expect(tokenOwner).to.equal(receiver);

  return tokenId;
};

export const registerAssetContract = async ({
  contract,
  owner,
  assetContract,
}: {
  contract: TestAvatar;
  owner: SignerWithAddress;
  assetContract: string;
}) => {
  const registered = await contract.isRegisteredContract(assetContract);

  if (!registered) {
    await contract.connect(owner).registerAssetContract(assetContract);
  }
};

export const createAssetData = async ({
  contract,
  owner,
  operator,
  assetHttpLink,
  name,
  creator,
}: {
  contract: AssetHouse;
  owner: SignerWithAddress;
  operator: SignerWithAddress;
  assetHttpLink: string;
  name: string;
  creator: string;
}): Promise<number> => {
  await addOperatorIfNotExist({ contract, owner, operator: operator.address });

  const assetDataId = (await contract.totalAssetData()).toNumber();
  await contract
    .connect(operator)
    .createAssetData(assetHttpLink, name, creator, []);

  const exists = await contract.exists(assetDataId);
  expect(exists).to.be.true;

  return assetDataId;
};

export const registerAsset = async ({
  contract,
  assetId,
  maxSupply,
  owner,
  operator,
}: {
  contract: TestAsset;
  assetId: number;
  maxSupply: number;
  owner: SignerWithAddress;
  operator: SignerWithAddress;
}): Promise<void> => {
  await addOperatorIfNotExist({ contract, owner, operator: operator.address });

  await contract.connect(operator).registerAsset(assetId, maxSupply);
  return;
};

export const getChild = async ({
  contract,
  avatarId,
  owner,
  childTokenOwner,
  childTokenId,
  childContract,
  childContractOwner,
}: {
  contract: TestAvatar;
  avatarId: number;
  owner: SignerWithAddress;
  childTokenOwner: SignerWithAddress;
  childTokenId: number;
  childContract: TestAsset;
  childContractOwner: SignerWithAddress;
}) => {
  await registerAssetContract({
    contract,
    owner,
    assetContract: childContract.address,
  });

  const isOperable = await childContract.isOperable(contract.address);
  if (!isOperable) {
    await childContract
      .connect(childContractOwner)
      .addOperator(contract.address);
  }

  await contract
    .connect(childTokenOwner)
    .getChild(
      childTokenOwner.address,
      avatarId,
      childContract.address,
      childTokenId
    );
};
