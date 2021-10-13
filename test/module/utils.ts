import { ethers } from 'hardhat';

export const bytes32FromNumber = (num: number) => {
  return ethers.utils.hexZeroPad(ethers.utils.hexValue(num), 32);
};

export const hexToAscii = (hex: string): string => {
  if (hex.startsWith('0x')) {
    hex = hex.substring(2);
  }

  let str = '';
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
};
