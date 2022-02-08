import { ethers } from "ethers";

export const categoryId = (category: string) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(category));
