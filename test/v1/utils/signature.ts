import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";

export const genWhitelistSig = async ({
  signer,
  domain,
  msg,
}: {
  signer: SignerWithAddress;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  msg: {
    ticketAmount: number;
    beneficiary: string;
  };
}): Promise<{ vSig: number; rSig: string; sSig: string }> => {
  const types = {
    Whitelist: [
      {
        name: "ticketAmount",
        type: "uint256",
      },
      {
        name: "beneficiary",
        type: "address",
      },
    ],
  };

  const sig = await signer._signTypedData(domain, types, msg);
  const { v, r, s } = ethers.utils.splitSignature(sig);

  return { vSig: v, rSig: r, sSig: s };
};

export const genPartsReqSig = async ({
  signer,
  domain,
  msg,
}: {
  signer: SignerWithAddress;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  msg: {
    rawData: string | Array<number>;
  };
}): Promise<{ vSig: number; rSig: string; sSig: string }> => {
  const types = {
    PartDistInfo: [
      {
        name: "rawData",
        type: "bytes32",
      },
    ],
  };

  const sig = await signer._signTypedData(domain, types, msg);
  const { v, r, s } = ethers.utils.splitSignature(sig);

  return { vSig: v, rSig: r, sSig: s };
};
