import { ethers } from "hardhat";
import { AssetCollection } from "../../types";

interface Attribute {
  trait_type: string;
  value: string;
}

interface AssetData {
  collectionType: string;
  title: string;
  creator: string;
  description: string;
  uri: string;
  attributes: Array<Attribute>;
  maxSupply: number;
}

export const registerAsset = async ({
  collection,
  assetData,
}: {
  collection: AssetCollection;
  assetData: AssetData;
}): Promise<void> => {
  console.log(
    `Start register asset <${assetData.title}> to <${collection.address}>`
  );
  const creator = assetData.creator || ethers.constants.AddressZero;
  const tx = await collection.createAsset(
    assetData.collectionType,
    assetData.title,
    creator,
    assetData.description,
    assetData.uri,
    assetData.attributes,
    assetData.maxSupply
  );
  tx.wait(1);
  console.log(
    `asset <${assetData.title}> is registered in <${collection.address}>`
  );
};
