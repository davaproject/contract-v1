import { ethers } from "hardhat";
import { AssetBase } from "../../types";

interface Attribute {
  traitType: string;
  value: string;
}

interface AssetData {
  title: string;
  creator: string;
  description: string;
  uri: string;
  attributes: Array<Attribute>;
  maxSupply: number;
}

export const registerAsset = async ({
  asset,
  assetData,
}: {
  asset: AssetBase;
  assetData: AssetData;
}): Promise<void> => {
  console.log(
    `Start register asset <${assetData.title}> to <${asset.address}>`
  );
  const creator = assetData.creator || ethers.constants.AddressZero;
  const tx = await asset.create(
    assetData.title,
    creator,
    assetData.description,
    assetData.uri,
    assetData.attributes,
    assetData.maxSupply
  );
  tx.wait(1);
  console.log(
    `asset <${assetData.title}> contract is registered in <${asset.address}>`
  );
};
