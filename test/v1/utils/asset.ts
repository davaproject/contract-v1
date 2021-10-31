import { ethers } from "ethers";

export const collectionType = (collectionTitle: string) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(collectionTitle));
