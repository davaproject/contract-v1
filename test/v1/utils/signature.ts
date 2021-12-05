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

export const genClaimSig = async ({
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
    amount: number;
    beneficiary: string;
  };
}): Promise<{ vSig: number; rSig: string; sSig: string }> => {
  const types = {
    Reserved: [
      {
        name: "amount",
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

export const genMintSig = async ({
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
    price: number;
    amount: number;
    beneficiary: string;
  };
}): Promise<{ vSig: number; rSig: string; sSig: string }> => {
  const types = {
    Ticket: [
      {
        name: "price",
        type: "uint256",
      },
      {
        name: "amount",
        type: "uint16",
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
