import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  Randomizer,
  Randomizer__factory,
  TestDrops,
  TestDrops__factory,
  TestERC1155,
  TestERC1155__factory,
} from "../../types";
import { solidity } from "ethereum-waffle";
import { checkChange } from "./utils/compare";
import { genDropsClaimSig } from "./utils/signature";
import { numbersToBytes } from "./utils/bit";

chai.use(solidity);
const { expect } = chai;

const contractInfo = {
  name: "DavaDrops",
  version: "V1",
};

describe("Drops", () => {
  let snapshot: string;
  let drops: TestDrops;
  let erc1155: TestERC1155;
  let randomizer: Randomizer;
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();

    const ERC1155 = new TestERC1155__factory(deployer);
    erc1155 = await ERC1155.deploy("");
    await erc1155.deployed();

    const Randomizer = new Randomizer__factory(deployer);
    randomizer = await Randomizer.deploy();
    await randomizer.deployed();

    const Drops = new TestDrops__factory(deployer);
    drops = await Drops.deploy(erc1155.address, randomizer.address);
    await drops.deployed;

    await drops.setSchedule(0, 999999999999);
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("claim", () => {
    let claimSig: { rSig: string; sSig: string; vSig: number };
    let beneficiary: SignerWithAddress;
    let amount = 3;

    beforeEach(async () => {
      beneficiary = accounts[1];
      claimSig = await genDropsClaimSig({
        signer: deployer,
        domain: {
          ...contractInfo,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: drops.address,
        },
        msg: {
          amount,
          beneficiary: beneficiary.address,
        },
      });

      const tokenIds = [0, 1, 2, 3];
      await erc1155.mintBatch(
        drops.address,
        tokenIds,
        tokenIds.map(() => amount),
        "0x"
      );

      await randomizer.setData(numbersToBytes(tokenIds));
    });

    describe("should be reverted", () => {
      it("if msg.sender is not a beneficiary", async () => {
        const nonBeneficiary = accounts[2];
        expect(nonBeneficiary.address).not.to.equal(beneficiary.address);

        await expect(
          drops.connect(nonBeneficiary).claim(
            {
              ...claimSig,
              snapshot: { amount, beneficiary: beneficiary.address },
            },
            amount
          )
        ).to.be.revertedWith("Drops: not authorized");
      });

      it("if claimedAmount exceeds assigned amount", async () => {
        await expect(
          drops.connect(beneficiary).claim(
            {
              ...claimSig,
              snapshot: { amount, beneficiary: beneficiary.address },
            },
            amount + 1
          )
        ).to.be.revertedWith("Drops: exceeds assigned amount");
      });

      it("if claimedAmount is zero", async () => {
        await expect(
          drops.connect(beneficiary).claim(
            {
              ...claimSig,
              snapshot: { amount, beneficiary: beneficiary.address },
            },
            0
          )
        ).to.be.revertedWith("Drops: can not claim 0");
      });
    });

    describe("should update", () => {
      it("claimedAmountOf", async () => {
        await checkChange({
          status: () =>
            drops
              .claimedAmountOf(beneficiary.address)
              .then((i) => i.toNumber()),
          process: () =>
            drops.connect(beneficiary).claim(
              {
                ...claimSig,
                snapshot: { amount, beneficiary: beneficiary.address },
              },
              amount
            ),
          expectedBefore: 0,
          expectedAfter: amount,
        });
      });

      it("totalClaimedAmount", async () => {
        await checkChange({
          status: () => drops.totalClaimedAmount(),
          process: () =>
            drops.connect(beneficiary).claim(
              {
                ...claimSig,
                snapshot: { amount, beneficiary: beneficiary.address },
              },
              amount
            ),
          expectedBefore: 0,
          expectedAfter: amount,
        });
      });
    });

    describe("should transfer appropriate tokens", () => {
      it("for tokenIds [0, 0, 0]", async () => {
        const tokenId = 0;
        const tokenIds = [tokenId, tokenId, tokenId];
        await randomizer.setData(numbersToBytes(tokenIds));

        await checkChange({
          status: () =>
            erc1155.balanceOf(beneficiary.address, 0).then((v) => v.toNumber()),
          process: () =>
            drops.connect(beneficiary).claim(
              {
                ...claimSig,
                snapshot: { amount, beneficiary: beneficiary.address },
              },
              amount
            ),
          expectedBefore: 0,
          expectedAfter: amount,
        });
      });

      it("for tokenIds [0, 0, 1]", async () => {
        const tokenIds = [0, 0, 1];
        await randomizer.setData(numbersToBytes(tokenIds));

        await checkChange({
          status: () =>
            erc1155
              .balanceOfBatch(
                [beneficiary.address, beneficiary.address],
                [0, 1]
              )
              .then((v) => v.map((i) => i.toNumber())),
          process: () =>
            drops.connect(beneficiary).claim(
              {
                ...claimSig,
                snapshot: { amount, beneficiary: beneficiary.address },
              },
              amount
            ),
          expectedBefore: [0, 0],
          expectedAfter: [2, 1],
        });
      });

      it("for tokenIds [0, 1, 2]", async () => {
        const tokenIds = [0, 1, 2];
        await randomizer.setData(numbersToBytes(tokenIds));

        await checkChange({
          status: () =>
            erc1155
              .balanceOfBatch(
                [beneficiary.address, beneficiary.address, beneficiary.address],
                [0, 1, 2]
              )
              .then((v) => v.map((i) => i.toNumber())),
          process: () =>
            drops.connect(beneficiary).claim(
              {
                ...claimSig,
                snapshot: { amount, beneficiary: beneficiary.address },
              },
              amount
            ),
          expectedBefore: [0, 0, 0],
          expectedAfter: [1, 1, 1],
        });
      });
    });
  });

  describe("onERC1155Received", () => {
    const tokens = [
      { id: 0, amount: 1 },
      { id: 1, amount: 2 },
      { id: 2, amount: 3 },
    ];

    it("updates _partsIds", async () => {
      await checkChange({
        status: async () => {
          const total = await drops.totalPartsIds();
          return total.toNumber();
        },
        process: () =>
          erc1155.mint(drops.address, tokens[0].id, tokens[0].amount, "0x"),
        expectedBefore: 0,
        expectedAfter: 1,
      });
    });
  });

  describe("onERC1155BatchReceived", () => {
    const tokens = [
      { id: 0, amount: 1 },
      { id: 1, amount: 2 },
      { id: 2, amount: 3 },
    ];

    it("updates _partsIds", async () => {
      await checkChange({
        status: async () => {
          const total = await drops.totalPartsIds();
          return total.toNumber();
        },
        process: () =>
          erc1155.mintBatch(
            drops.address,
            tokens.map(({ id }) => id),
            tokens.map(({ amount }) => amount),
            "0x"
          ),
        expectedBefore: 0,
        expectedAfter: tokens.length,
      });
    });
  });

  describe("retrieveAll", () => {
    const tokens = [
      { id: 0, amount: 1 },
      { id: 1, amount: 2 },
      { id: 2, amount: 3 },
    ];

    beforeEach(async () => {
      await erc1155.mintBatch(
        drops.address,
        tokens.map(({ id }) => id),
        tokens.map(({ amount }) => amount),
        "0x"
      );
    });

    describe("should be reverted", () => {
      it("for non-owner's trial", async () => {
        const OWNER_ROLE = await drops.DEFAULT_ADMIN_ROLE();
        const nonOwner = accounts[1];
        const isOwner = await drops.hasRole(OWNER_ROLE, nonOwner.address);
        expect(isOwner).to.be.false;

        await expect(drops.connect(nonOwner).retrieveAll(nonOwner.address)).to
          .be.reverted;
      });
    });

    it("should transfer all tokens to the receiver", async () => {
      const receiver = accounts[1];

      await checkChange({
        status: async () => {
          const dropsBalance = await erc1155.balanceOfBatch(
            tokens.map(() => drops.address),
            tokens.map(({ id }) => id)
          );
          const receiverBalance = await erc1155.balanceOfBatch(
            tokens.map(() => receiver.address),
            tokens.map(({ id }) => id)
          );

          return {
            drops: dropsBalance.map((i) => i.toNumber()),
            receiver: receiverBalance.map((i) => i.toNumber()),
          };
        },
        process: () => drops.retrieveAll(receiver.address),
        expectedBefore: {
          drops: tokens.map(({ amount }) => amount),
          receiver: [0, 0, 0],
        },
        expectedAfter: {
          drops: [0, 0, 0],
          receiver: tokens.map(({ amount }) => amount),
        },
      });
    });
  });
});
