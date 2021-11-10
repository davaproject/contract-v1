import { ethers } from "hardhat";
import { PartCollection } from "../../types";

interface Attribute {
  trait_type: string;
  value: string;
}

interface PartData {
  partType: string;
  title: string;
  description: string;
  uri: string;
  attributes: Array<Attribute>;
  maxSupply: number;
}

export const registerPart = async ({
  collection,
  partData,
}: {
  collection: PartCollection;
  partData: PartData;
}): Promise<void> => {
  console.log(
    `Start register part <${partData.title}> to <${collection.address}>`
  );
  const tx = await collection.createPart(
    partData.partType,
    partData.title,
    partData.description,
    partData.uri,
    partData.attributes,
    partData.maxSupply
  );
  tx.wait(1);
  console.log(
    `part <${partData.title}> is registered in <${collection.address}>`
  );
};
