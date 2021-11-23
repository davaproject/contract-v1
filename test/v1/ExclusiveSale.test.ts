import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AvatarV1__factory,
  Dava,
  DavaOfficial,
  RandomBox,
  TestExclusiveSale,
  TestExclusiveSale__factory,
} from "../../types";
import { solidity } from "ethereum-waffle";
import { fixtures } from "../../scripts/utils/fixtures";
import { checkChange } from "./utils/compare";
import { genMintSig } from "./utils/signature";
import { categoryId } from "./utils/part";
import { BigNumberish } from "@ethersproject/bignumber";
import BytesLikeArray from "./types/BytesLikeArray";
import { partIdsToHex } from "./utils/bit";

chai.use(solidity);
const { expect } = chai;

const contractInfo = {
  name: "ExclusiveSale",
  version: "V1",
};

describe("ExclusiveSale", () => {
  let snapshot: string;
  let sale: TestExclusiveSale;
  let dava: Dava;
  let davaOfficial: DavaOfficial;
  let randomBox: RandomBox;
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  const partIds: Array<number> = [];
  const partInfo: Array<string> = [];

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts } = await fixtures();
    ({
      dava,
      randomBox,
      parts: { davaOfficial },
    } = contracts);

    const Sale = new TestExclusiveSale__factory(deployer);
    sale = await Sale.deploy(
      dava.address,
      davaOfficial.address,
      randomBox.address
    );
    const minterRoleFromCollection = await davaOfficial.MINTER_ROLE();
    await davaOfficial.grantRole(minterRoleFromCollection, sale.address);
    const minterRoleFromDava = await dava.MINTER_ROLE();
    await dava.grantRole(minterRoleFromDava, sale.address);

    for (let i = 0; i < 3; i += 1) {
      const collectionName = `${Date.now()}`;
      const frameTokenId = 0;
      const zIndex = i;

      await davaOfficial.createCategory(
        collectionName,
        frameTokenId,
        frameTokenId,
        zIndex
      );
      await dava.registerCategory(categoryId(collectionName));

      const partId = (await davaOfficial.numberOfParts()).toNumber();
      await davaOfficial.unsafeCreatePart(
        categoryId(collectionName),
        "test",
        "test",
        "test",
        [],
        1,
        1
      );

      partIds.push(partId);
      partInfo.push(categoryId(collectionName));
    }

    await randomBox.setSeed();
    await randomBox.setA(
      new Array(358).fill(
        partIdsToHex(new Array(28).fill(partIds[0]))
      ) as BytesLikeArray
    );
    await randomBox.setB(
      new Array(358).fill(
        partIdsToHex(new Array(28).fill(partIds[1]))
      ) as BytesLikeArray
    );
    await randomBox.setC(
      new Array(358).fill(
        partIdsToHex(new Array(28).fill(partIds[2]))
      ) as BytesLikeArray
    );
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("verifySig", () => {
    it("should be reverted if signer is not a contract owner", async () => {
      const user = accounts[1];
      const ticket = {
        price: 1,
        amount: 1,
        beneficiary: user.address,
      };
      const signature = await genMintSig({
        signer: user,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg: ticket,
      });

      await expect(
        sale.connect(user).verifySig({ ...signature, ticket })
      ).to.be.revertedWith("Sale: invalid signature");
    });

    it("should be reverted if msg.sender is not a beneficiary", async () => {
      const beneficiary = accounts[1];
      const ticket = {
        price: 1,
        amount: 1,
        beneficiary: beneficiary.address,
      };
      const signature = await genMintSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg: ticket,
      });

      await expect(
        sale.connect(accounts[2]).verifySig({ ...signature, ticket })
      ).to.be.revertedWith("Sale: invalid signature");
    });

    it("should be reverted if ticket price is invalid", async () => {
      const beneficiary = accounts[1];
      const ticket = {
        price: 1,
        amount: 1,
        beneficiary: beneficiary.address,
      };
      const signature = await genMintSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg: ticket,
      });

      await expect(
        sale.connect(beneficiary).verifySig({
          ...signature,
          ticket: { ...ticket, price: ticket.price + 1 },
        })
      ).to.be.revertedWith("Sale: invalid signature");
    });

    it("should be reverted if ticket amount is invalid", async () => {
      const beneficiary = accounts[1];
      const ticket = {
        price: 1,
        amount: 1,
        beneficiary: beneficiary.address,
      };
      const signature = await genMintSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg: ticket,
      });

      await expect(
        sale.connect(beneficiary).verifySig({
          ...signature,
          ticket: { ...ticket, amount: ticket.amount + 1 },
        })
      ).to.be.revertedWith("Sale: invalid signature");
    });

    it("should return true for valid sig", async () => {
      const beneficiary = accounts[1];
      const ticket = {
        price: 1,
        amount: 1,
        beneficiary: beneficiary.address,
      };
      const signature = await genMintSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg: ticket,
      });

      await expect(
        sale.connect(beneficiary).verifySig({
          ...signature,
          ticket,
        })
      ).not.to.be.reverted;
    });
  });

  describe("mint", () => {
    let beneficiary: SignerWithAddress;
    let ticket: { price: number; amount: number; beneficiary: string };
    let sig: { vSig: number; rSig: string; sSig: string };
    beforeEach(async () => {
      beneficiary = accounts[1];
      ticket = {
        price: 10,
        amount: 20,
        beneficiary: beneficiary.address,
      };

      sig = await genMintSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg: ticket,
      });
    });

    describe("should be reverted", () => {
      it("if already participated", async () => {
        await sale
          .connect(beneficiary)
          .mint({ ...sig, ticket }, { value: ticket.price });
        await expect(
          sale
            .connect(beneficiary)
            .mint({ ...sig, ticket }, { value: ticket.price })
        ).to.be.revertedWith("ExclusiveSale: already participated");
      });

      it("if msg.sender is not the beneficiary", async () => {
        await expect(
          sale
            .connect(accounts[4])
            .mint({ ...sig, ticket }, { value: ticket.price })
        ).to.be.revertedWith("ExclusiveSale: not authorized");
      });

      it("if msg.value does not match with price", async () => {
        await expect(
          sale
            .connect(beneficiary)
            .mint({ ...sig, ticket }, { value: ticket.price - 1 })
        ).to.be.revertedWith("ExclusiveSale: unmatched price");
      });

      it("if signature is invalid", async () => {
        await expect(
          sale
            .connect(beneficiary)
            .mint(
              { ...sig, vSig: sig.vSig + 1, ticket },
              { value: ticket.price }
            )
        ).to.be.revertedWith("ExclusiveSale: invalid signature");
      });

      it("if sale is closed", async () => {
        await ethers.provider.send("evm_increaseTime", [14 * 24 * 3600]);
        await expect(
          sale
            .connect(beneficiary)
            .mint({ ...sig, vSig: sig.vSig, ticket }, { value: ticket.price })
        ).to.be.revertedWith("ExclusiveSale: sale closed");
      });
    });

    it("should set nextAvatarId properly", async () => {
      const initialId = await sale.nextAvatarId();
      await checkChange({
        status: () => sale.nextAvatarId(),
        process: () =>
          sale
            .connect(beneficiary)
            .mint({ ...sig, ticket }, { value: ticket.price }),
        expectedBefore: initialId,
        expectedAfter: initialId - ticket.amount,
      });
    });

    it("should mint items properly", async () => {
      await checkChange({
        status: () => dava.balanceOf(beneficiary.address),
        process: () =>
          sale
            .connect(beneficiary)
            .mint({ ...sig, ticket }, { value: ticket.price }),
        expectedBefore: ethers.BigNumber.from(0),
        expectedAfter: ethers.BigNumber.from(ticket.amount),
      });
    });
  });
});
