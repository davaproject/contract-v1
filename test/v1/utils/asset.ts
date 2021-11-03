import { ethers } from "ethers";

export const assetType = (assetTypeTitle: string) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(assetTypeTitle));
