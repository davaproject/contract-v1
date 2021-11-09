import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AvatarV1__factory,
  Dava,
  DavaOfficial,
  RandomBox,
  TestSale,
  TestSale__factory,
} from "../../types";
import { solidity } from "ethereum-waffle";
import { fixtures } from "../../scripts/utils/fixtures";
import { checkChange } from "./utils/compare";
import { genWhitelistSig } from "./utils/signature";
import { partType } from "./utils/part";
import { BigNumberish } from "@ethersproject/bignumber";

chai.use(solidity);
const { expect } = chai;

const contractInfo = {
  name: "AvatarSale",
  version: "V1",
};

describe("Sale", () => {
  let snapshot: string;
  let sale: TestSale;
  let dava: Dava;
  let davaOfficial: DavaOfficial;
  let randomBox: RandomBox;
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  const partIds: { [partTypeIndex: number]: Array<number> } = {};
  const partInfo: { [partTypeIndex: number]: Array<string> } = {};

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts } = await fixtures();
    ({
      dava,
      randomBox,
      parts: { davaOfficial },
    } = contracts);

    const Sale = new TestSale__factory(deployer);
    sale = await Sale.deploy(
      dava.address,
      davaOfficial.address,
      randomBox.address,
      0,
      Date.now() + 10000000,
      0
    );
    const minterRoleFromCollection = await davaOfficial.MINTER_ROLE();
    await davaOfficial.grantRole(minterRoleFromCollection, sale.address);
    const minterRoleFromDava = await dava.MINTER_ROLE();
    await dava.grantRole(minterRoleFromDava, sale.address);
    const operatorRoleFromRandomBox = await randomBox.OPERATOR_ROLE();
    await randomBox.grantRole(operatorRoleFromRandomBox, sale.address);

    for (let i = 0; i < 3; i += 1) {
      const collectionName = `${Date.now()}`;
      const frameTokenId = 0;
      const zIndex = i;

      await davaOfficial.createPartType(
        collectionName,
        frameTokenId,
        frameTokenId,
        zIndex
      );
      await dava.registerPartType(partType(collectionName));

      const partId = (await davaOfficial.numberOfParts()).toNumber();
      await davaOfficial.createPart(
        partType(collectionName),
        "test",
        "test",
        "test",
        [],
        1
      );

      await sale.setPartIds(`0x0${i}`, [partId]);
      partIds[i] = [partId];
      partInfo[i] = [partType(collectionName)];
    }
    await sale.setPartGroups(["0x000102"], [1]);
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("setPartGroups", () => {
    it("should be reverted if partGroups and amounts length are unmatched", async () => {
      await expect(
        sale.setPartGroups(["0x000001", "0x000002"], [1, 1, 1])
      ).to.be.revertedWith("Sale: invalid arguments");
    });

    it("should set amountOfGroups and groups correctly", async () => {
      const registeredGroups = await sale.groups();
      const partGroups = ["0x000001", "0x000002"];
      const amounts = [100, 200];
      await checkChange({
        process: () => sale.setPartGroups(partGroups, amounts),
        status: async () => {
          const groups = await sale.groups();
          const amountOfGroups = [
            await sale.amountOfGroups(partGroups[0]),
            await sale.amountOfGroups(partGroups[1]),
          ];
          return { groups, amountOfGroups };
        },
        expectedBefore: {
          groups: [...registeredGroups],
          amountOfGroups: [ethers.BigNumber.from(0), ethers.BigNumber.from(0)],
        },
        expectedAfter: {
          groups: [...registeredGroups, ...partGroups],
          amountOfGroups: [
            ethers.BigNumber.from(amounts[0]),
            ethers.BigNumber.from(amounts[1]),
          ],
        },
      });
    });
  });

  describe("setPartIds", () => {
    it("should set partIds", async () => {
      const partTypeIndex = "0x0a";
      const partIds = [0, 1, 11, 21];

      await checkChange({
        process: () => sale.setPartIds(partTypeIndex, partIds),
        status: () =>
          sale.partIds(partTypeIndex).then((v) => v.map((v) => v.toNumber())),
        expectedBefore: [],
        expectedAfter: partIds,
      });
    });
  });

  describe("_retrievePartIds", () => {
    let newSale: TestSale;
    let partIds: Array<number> = [];
    let supplies = [1, 1, 2];
    let groups = ["0a", "0b", "0c"];

    before(async () => {
      const NewSale = new TestSale__factory(deployer);
      newSale = await NewSale.deploy(
        dava.address,
        davaOfficial.address,
        randomBox.address,
        0,
        99999999999,
        0
      );
      await newSale.deployed();
      await randomBox.grantRole(
        await randomBox.OPERATOR_ROLE(),
        newSale.address
      );

      const collectionName = `${Date.now()}`;
      await davaOfficial.createPartType(collectionName, 0, 0, 99999);
      await dava.registerPartType(partType(collectionName));

      for (let i = 0; i < supplies.length; i += 1) {
        const partId = await davaOfficial.numberOfParts();
        partIds.push(partId.toNumber());
        await davaOfficial.createPart(
          partType(collectionName),
          "TEST",
          "TEST",
          "TEST",
          [],
          supplies[i]
        );
        await newSale.setPartIds("0x" + groups[i], [partId]);
      }
      await newSale.setPartGroups(["0x" + groups.join("")], [1]);
    });

    it("should remove groups if amountOfGroups goes to zero", async () => {
      await checkChange({
        process: () => newSale.retrievePartIds(),
        status: () =>
          newSale
            .amountOfGroups("0x" + groups.join(""))
            .then((v) => v.toNumber()),
        expectedBefore: 1,
        expectedAfter: 0,
      });
    });

    it("should remove partId from partIds if davaOfficial supply goes to zero", async () => {
      await checkChange({
        process: () => newSale.retrievePartIds(),
        status: async () => {
          const result = [];
          for (let i = 0; i < partIds.length; i += 1) {
            const partIds = await newSale.partIds("0x" + groups[i]);
            result.push(partIds.map((v) => v.toNumber()));
          }
          return result;
        },
        expectedBefore: [[partIds[0]], [partIds[1]], [partIds[2]]],
        expectedAfter: [[], [], [partIds[2]]],
      });
    });
  });

  describe("_verifyWhitelistSig", () => {
    beforeEach(async () => {
      const owner = await sale.owner();
      expect(owner).to.equal(deployer.address);
    });

    it("should be reverted for invalid owner", async () => {
      const nonOwner = accounts[1];
      expect(deployer.address).not.to.equal(nonOwner.address);

      const msg = {
        ticketAmount: 1,
        beneficiary: nonOwner.address,
      };
      const sig = await genWhitelistSig({
        signer: nonOwner,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg,
      });

      await expect(
        sale.verifyWhitelistSig({
          ...sig,
          whitelist: msg,
        })
      ).to.be.revertedWith("Sale: invalid signature");
    });

    it("should be reverted for invalid ticketAmount", async () => {
      const beneficiary = deployer;
      const msg = {
        ticketAmount: 1,
        beneficiary: beneficiary.address,
      };
      const sig = await genWhitelistSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg,
      });

      await expect(
        sale.verifyWhitelistSig({
          ...sig,
          whitelist: { ...msg, ticketAmount: msg.ticketAmount + 1 },
        })
      ).to.be.revertedWith("Sale: invalid signature");
    });

    it("should be reverted for invalid chainId", async () => {
      const beneficiary = deployer;
      const msg = {
        ticketAmount: 1,
        beneficiary: beneficiary.address,
      };
      const sig = await genWhitelistSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId + 1,
          verifyingContract: sale.address,
        },
        msg,
      });

      await expect(
        sale.verifyWhitelistSig({
          ...sig,
          whitelist: msg,
        })
      ).to.be.revertedWith("Sale: invalid signature");
    });

    it("should be reverted for invalid contractAddress", async () => {
      const beneficiary = deployer;
      const msg = {
        ticketAmount: 1,
        beneficiary: beneficiary.address,
      };
      const sig = await genWhitelistSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId + 1,
          verifyingContract: ethers.Wallet.createRandom().address,
        },
        msg,
      });

      await expect(
        sale.verifyWhitelistSig({
          ...sig,
          whitelist: msg,
        })
      ).to.be.revertedWith("Sale: invalid signature");
    });

    it("should pass for valid signature", async () => {
      const beneficiary = accounts[1];
      const msg = {
        ticketAmount: 1,
        beneficiary: beneficiary.address,
      };
      const sig = await genWhitelistSig({
        signer: deployer,
        domain: {
          name: contractInfo.name,
          version: contractInfo.version,
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: sale.address,
        },
        msg,
      });

      await expect(
        sale.connect(beneficiary).verifyWhitelistSig({
          ...sig,
          whitelist: msg,
        })
      ).not.to.be.reverted;
    });
  });

  describe("claim", () => {
    describe("should be reverted", () => {
      it("if exceeds pre allocated amount", async () => {
        const PRE_ALLOCATED_AMOUNT = (
          await sale.PRE_ALLOCATED_AMOUNT()
        ).toNumber();

        const recipients = new Array(PRE_ALLOCATED_AMOUNT + 1)
          .fill(null)
          .map(() => ethers.Wallet.createRandom().address);
        const partData = new Array(PRE_ALLOCATED_AMOUNT + 1).fill(
          ethers.utils.randomBytes(32)
        );
        await expect(sale.claim(recipients)).to.be.revertedWith(
          "Sale: exceeds pre allocated mint amount"
        );
      });

      it("if part is out of stock", async () => {
        await expect(
          sale.claim([deployer.address, deployer.address])
        ).to.be.revertedWith("RandomBox: maxNumber should be greater than 0");
      });
    });

    it("should mint expected amount of avatar and parts", async () => {
      await checkChange({
        process: () => sale.claim([deployer.address]),
        status: async () => {
          const avatarSupply = (await dava.totalSupply()).toNumber();
          const partsSupply = (await davaOfficial.totalPartSupply()).toNumber();
          return { avatarSupply, partsSupply };
        },
        expectedBefore: { avatarSupply: 0, partsSupply: 0 },
        expectedAfter: { avatarSupply: 1, partsSupply: 3 },
      });
    });
  });

  describe("_mintAvatarWithParts", () => {
    it("should remove outofstock partId from _partIds", async () => {
      const partTypeIndex = "0x00";
      await checkChange({
        process: () => sale.mintAvatarWithParts(0),
        status: () => sale.partIds(partTypeIndex).then((v) => v.length),
        expectedBefore: 1,
        expectedAfter: 0,
      });
    });

    it("should mint part successfully", async () => {
      await checkChange({
        process: () => sale.mintAvatarWithParts(0),
        status: async () => {
          try {
            const avatar = await dava.getAvatar(0);
            const balances = (
              await davaOfficial.balanceOfBatch(
                [avatar, avatar, avatar],
                [partIds[0][0], partIds[1][0], partIds[2][0]]
              )
            ).map((v) => v.toNumber());
            return balances;
          } catch (e) {
            return [0, 0, 0];
          }
        },
        expectedBefore: [0, 0, 0],
        expectedAfter: [1, 1, 1],
      });
    });

    it("should mint parts", async () => {
      const avatarId = await dava.totalSupply();
      await checkChange({
        process: () => sale.mintAvatarWithParts(avatarId),
        status: async () => {
          const supplyOf0 = (
            await davaOfficial.totalSupply(partIds[0][0])
          ).toNumber();
          const supplyOf1 = (
            await davaOfficial.totalSupply(partIds[1][0])
          ).toNumber();
          const supplyOf2 = (
            await davaOfficial.totalSupply(partIds[2][0])
          ).toNumber();
          return [supplyOf0, supplyOf1, supplyOf2];
        },
        expectedBefore: [0, 0, 0],
        expectedAfter: [1, 1, 1],
      });
    });

    it("should set the owner properly", async () => {
      const avatarId = (await dava.totalSupply()).toNumber();
      await checkChange({
        process: () => sale.mintAvatarWithParts(avatarId),
        status: async () => {
          let avatarOwner = ethers.constants.AddressZero;
          try {
            avatarOwner = await dava.ownerOf(avatarId);
          } catch (e) {}

          const avatar = await dava.getAvatar(avatarId);
          const balances = (
            await davaOfficial.balanceOfBatch(
              [avatar, avatar, avatar],
              [partIds[0][0], partIds[1][0], partIds[2][0]]
            )
          ).map((v) => v.toNumber());

          return { avatarOwner, balances };
        },
        expectedBefore: {
          avatarOwner: ethers.constants.AddressZero,
          balances: [0, 0, 0],
        },
        expectedAfter: { avatarOwner: deployer.address, balances: [1, 1, 1] },
      });
    });

    it("should equip parts to the avatar", async () => {
      const avatarId = (await dava.totalSupply()).toNumber();
      await checkChange({
        process: () => sale.mintAvatarWithParts(avatarId),
        status: async () => {
          try {
            const avatarAddress = await dava.getAvatar(avatarId);
            const avatarContract = new AvatarV1__factory(deployer);
            const avatar = avatarContract.attach(avatarAddress);

            const [, idFor0] = await avatar.part(partInfo[0][0]);
            const [, idFor1] = await avatar.part(partInfo[1][0]);
            const [_, idFor2] = await avatar.part(partInfo[2][0]);
            return [idFor0.toNumber(), idFor1.toNumber(), idFor2.toNumber()];
          } catch (e) {
            return [0, 0, 0];
          }
        },

        expectedBefore: [0, 0, 0],
        expectedAfter: [partIds[0][0], partIds[1][0], partIds[2][0]],
      });
    });
  });

  describe("mintWithWhitelist", () => {
    let beneficiary: SignerWithAddress;
    let whitelistReq: {
      vSig: number;
      rSig: string;
      sSig: string;
      whitelist: { ticketAmount: number; beneficiary: string };
    };

    before(async () => {
      beneficiary = accounts[1];
      const msg = {
        ticketAmount: 1,
        beneficiary: beneficiary.address,
      };
      const domain = {
        name: contractInfo.name,
        version: contractInfo.version,
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: sale.address,
      };
      const whitelistSignature = await genWhitelistSig({
        signer: deployer,
        domain,
        msg,
      });
      whitelistReq = { ...whitelistSignature, whitelist: msg };
    });

    describe("should be reverted", () => {
      it("if msg.sender is not a beneficiary", async () => {
        await expect(
          sale.connect(accounts[2]).mintWithWhitelist(whitelistReq, 1)
        ).to.be.revertedWith("Sale: msg.sender is not whitelisted");
      });

      it("if exceeds signed ticket amount", async () => {
        await expect(
          sale.connect(beneficiary).mintWithWhitelist(whitelistReq, 4)
        ).to.be.revertedWith("Sale: exceeds assigned amount");
      });

      it("if msg.value is not enough", async () => {
        await expect(
          sale.connect(beneficiary).mintWithWhitelist(whitelistReq, 1, {
            value: ethers.utils.parseEther("0.01"),
          })
        ).to.be.revertedWith("Sale: not enough eth");
      });

      it("if whitelist signature is invalid", async () => {
        await expect(
          sale
            .connect(beneficiary)
            .mintWithWhitelist({ ...whitelistReq, vSig: 9 }, 1, {
              value: ethers.utils.parseEther("1"),
            })
        ).to.be.revertedWith("Sale: invalid signature");
      });
    });

    it("should mint proper amount of avatars", async () => {
      await checkChange({
        process: () =>
          sale.connect(beneficiary).mintWithWhitelist(whitelistReq, 1, {
            value: ethers.utils.parseEther("1"),
          }),
        status: () => dava.totalSupply().then((v) => v.toNumber()),
        expectedBefore: 0,
        expectedAfter: 1,
      });
    });
  });

  describe("mint", () => {
    let price: BigNumberish;
    let buyer: SignerWithAddress;

    before(async () => {
      price = await sale.PRICE();
      buyer = accounts[0];
    });

    describe("should be reverted", () => {
      it("if user try to mint more than MAX_MINT_PER_ACCOUNT", async () => {
        const MAX_MINT_PER_ACCOUNT = (
          await sale.MAX_MINT_PER_ACCOUNT()
        ).toNumber();

        await expect(
          sale.mint(MAX_MINT_PER_ACCOUNT + 1, {
            value: ethers.utils.parseEther(
              `${(MAX_MINT_PER_ACCOUNT + 1) * 0.05}`
            ),
          })
        ).to.be.revertedWith(
          "Sale: can not purchase more than MAX_MINT_PER_ACCOUNT"
        );
      });

      it("if not enough eth is sent", async () => {
        const price = await sale.PRICE();
        await expect(sale.mint(1, { value: price.sub(1) })).to.be.revertedWith(
          "Sale: not enough eth"
        );
      });
    });

    it("should transfer eth", async () => {
      await checkChange({
        process: () => sale.mint(1, { value: price }),
        status: () =>
          ethers.provider.getBalance(sale.address).then((v) => v.toString()),
        expectedBefore: "0",
        expectedAfter: price.toString(),
      });
    });

    it("should mint a new avatar and parts", async () => {
      const davaId = await sale.PRE_ALLOCATED_AMOUNT();
      const receiver = accounts[5];

      await checkChange({
        process: () => sale.connect(receiver).mint(1, { value: price }),
        status: async () => {
          const davaBalance = (
            await dava.balanceOf(receiver.address)
          ).toNumber();
          try {
            const davaAddress = await dava.getAvatar(davaId);

            const partsBalance = [
              (
                await davaOfficial.balanceOf(davaAddress, partIds[0][0])
              ).toNumber(),
              (
                await davaOfficial.balanceOf(davaAddress, partIds[1][0])
              ).toNumber(),
              (
                await davaOfficial.balanceOf(davaAddress, partIds[2][0])
              ).toNumber(),
            ];
            return { davaBalance, partsBalance };
          } catch (e) {}
          return { davaBalance, partsBalance: [0, 0, 0] };
        },
        expectedBefore: { davaBalance: 0, partsBalance: [0, 0, 0] },
        expectedAfter: { davaBalance: 1, partsBalance: [1, 1, 1] },
      });
    });
  });

  describe("withdrawFund", () => {
    const amount = ethers.utils.parseEther("100");

    beforeEach(async () => {
      await deployer.sendTransaction({
        to: sale.address,
        value: amount,
      });
    });

    it("should allow the deployer to withdraw ETH", async () => {
      expect(await ethers.provider.getBalance(sale.address)).to.eq(amount);

      const recipient = accounts[1].address;
      const bal0 = await ethers.provider.getBalance(recipient);

      await sale.connect(deployer).withdrawFunds(recipient);

      const bal1 = await ethers.provider.getBalance(recipient);
      expect(bal1.sub(bal0)).to.eq(amount);
    });
  });
});
