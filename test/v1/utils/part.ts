import { ethers } from "ethers";

export const partType = (partTypeTitle: string) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(partTypeTitle));
