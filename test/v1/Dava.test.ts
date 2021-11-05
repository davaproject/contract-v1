import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AvatarV1,
  AvatarV1__factory,
  AvatarV2Draft__factory,
  Dava,
  DavaFrame,
  DavaFrame__factory,
  DavaOfficial,
  DavaOfficial__factory,
  TestAvatarV1,
  TestAvatarV1__factory,
} from "../../types";
import { solidity } from "ethereum-waffle";
import { constants } from "ethers";
import { Contracts, fixtures } from "../../scripts/utils/fixtures";
import { checkChange } from "./utils/compare";
import { partType } from "./utils/part";

chai.use(solidity);
const { expect } = chai;

describe("Dava", () => {
  let snapshot: string;
  let avatarV1: AvatarV1;
  let dava: Dava;
  let davaOfficial: DavaOfficial;
  let contracts: Contracts;
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    ({ contracts } = await fixtures());
    ({
      dava,
      avatarV1,
      parts: { davaOfficial },
    } = contracts);
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("registerCollection", () => {
    let newCollection: DavaOfficial;
    before(async () => {
      const Collection = new DavaOfficial__factory(deployer);
      newCollection = await Collection.deploy("", dava.address);
      await newCollection.deployed();
    });

    describe("should be reverted", () => {
      it("if msg.sender is not PART_MANAGER", async () => {
        const nonManager = accounts[1];
        const PART_MANAGER_ROLE = await dava.PART_MANAGER_ROLE();
        const isManager = await dava.hasRole(
          PART_MANAGER_ROLE,
          nonManager.address
        );
        expect(isManager).to.be.false;

        await expect(
          dava.connect(nonManager).registerCollection(newCollection.address)
        ).to.be.reverted;
      });

      it("if collection does not support IPartCollection interface", async () => {
        await expect(
          dava.registerCollection(contracts.parts.davaFrame.address)
        ).to.be.revertedWith(
          "Dava: Does not support IPartCollection interface"
        );
      });

      it("if collection is already registered", async () => {
        await expect(
          dava.registerCollection(davaOfficial.address)
        ).to.be.revertedWith("Dava: already registered collection");
      });
    });

    it("should add collection", async () => {
      await checkChange({
        status: () => dava.isRegisteredCollection(newCollection.address),
        process: () => dava.registerCollection(newCollection.address),
        expectedBefore: false,
        expectedAfter: true,
      });
    });

    it("should emit 'CollectionRegistered' event", async () => {
      await expect(dava.registerCollection(newCollection.address))
        .to.emit(dava, "CollectionRegistered")
        .withArgs(newCollection.address);
    });
  });

  describe("registerPartType", () => {
    const newPartType = partType("TEST");

    describe("should be reverted", () => {
      it("if msg.sender is not PART_MANAGER", async () => {
        const nonManager = accounts[1];
        const PART_MANAGER_ROLE = await dava.PART_MANAGER_ROLE();
        const isManager = await dava.hasRole(
          PART_MANAGER_ROLE,
          nonManager.address
        );
        expect(isManager).to.be.false;

        await expect(dava.connect(nonManager).registerPartType(newPartType)).to
          .be.reverted;
      });

      it("if partType is already registered", async () => {
        await dava.registerPartType(newPartType);
        await expect(dava.registerPartType(newPartType)).to.be.revertedWith(
          "Dava: partType is already registered"
        );
      });
    });

    it("should add partType", async () => {
      await checkChange({
        status: () => dava.isSupportedPartType(newPartType),
        process: () => dava.registerPartType(newPartType),
        expectedBefore: false,
        expectedAfter: true,
      });
    });

    it("should emit 'PartTypeRegistered' event", async () => {
      await expect(dava.registerPartType(newPartType))
        .to.emit(dava, "PartTypeRegistered")
        .withArgs(newPartType);
    });
  });

  describe("registerFrameCollection", () => {
    let newFrameCollection: DavaFrame;
    before(async () => {
      const FrameCollection = new DavaFrame__factory(deployer);
      newFrameCollection = await FrameCollection.deploy();
    });

    describe("should be reverted", () => {
      it("if msg.sender is not PART_MANAGER", async () => {
        const nonManager = accounts[1];
        const PART_MANAGER_ROLE = await dava.PART_MANAGER_ROLE();
        const isManager = await dava.hasRole(
          PART_MANAGER_ROLE,
          nonManager.address
        );
        expect(isManager).to.be.false;

        await expect(
          dava
            .connect(nonManager)
            .registerFrameCollection(newFrameCollection.address)
        ).to.be.reverted;
      });

      it("if collection does not support IFrameCollection interface", async () => {
        await expect(
          dava.registerFrameCollection(davaOfficial.address)
        ).to.be.revertedWith(
          "Dava: Does not support IFrameCollection interface"
        );
      });
    });

    it("should set frameCollection", async () => {
      await checkChange({
        status: () => dava.frameCollection(),
        process: () => dava.registerFrameCollection(newFrameCollection.address),
        expectedBefore: contracts.parts.davaFrame.address,
        expectedAfter: newFrameCollection.address,
      });
    });

    it("should emit 'DefaultCollectionRegistered' event", async () => {
      await expect(dava.registerFrameCollection(newFrameCollection.address))
        .to.emit(dava, "DefaultCollectionRegistered")
        .withArgs(newFrameCollection.address);
    });
  });

  describe("deregisterCollection", () => {
    describe("should be reverted", () => {
      it("if msg.sender is not PART_MANAGER", async () => {
        const nonManager = accounts[1];
        const PART_MANAGER_ROLE = await dava.PART_MANAGER_ROLE();
        const isManager = await dava.hasRole(
          PART_MANAGER_ROLE,
          nonManager.address
        );
        expect(isManager).to.be.false;

        await expect(
          dava.connect(nonManager).deregisterCollection(davaOfficial.address)
        ).to.be.reverted;
      });

      it("if collection is not registered", async () => {
        await expect(
          dava.deregisterCollection(ethers.Wallet.createRandom().address)
        ).to.be.revertedWith("Dava: Not registered collection");
      });
    });

    it("should remove collection", async () => {
      await checkChange({
        status: () => dava.isRegisteredCollection(davaOfficial.address),
        process: () => dava.deregisterCollection(davaOfficial.address),
        expectedBefore: true,
        expectedAfter: false,
      });
    });

    it("should emit 'CollectionDeregistered' event", async () => {
      await expect(dava.deregisterCollection(davaOfficial.address))
        .to.emit(dava, "CollectionDeregistered")
        .withArgs(davaOfficial.address);
    });
  });

  describe("deregisterPartType", () => {
    const newPartType = partType("TEST");
    before(async () => {
      await dava.registerPartType(newPartType);
    });

    describe("should be reverted", () => {
      it("if msg.sender is not PART_MANAGER", async () => {
        const nonManager = accounts[1];
        const PART_MANAGER_ROLE = await dava.PART_MANAGER_ROLE();
        const isManager = await dava.hasRole(
          PART_MANAGER_ROLE,
          nonManager.address
        );
        expect(isManager).to.be.false;

        await expect(dava.connect(nonManager).deregisterPartType(newPartType))
          .to.be.reverted;
      });

      it("if partType is not registered", async () => {
        await expect(
          dava.deregisterPartType(partType("TEST_NEW"))
        ).to.be.revertedWith("Dava: non registered partType");
      });
    });

    it("should remove partType", async () => {
      await checkChange({
        status: () => dava.isSupportedPartType(newPartType),
        process: () => dava.deregisterPartType(newPartType),
        expectedBefore: true,
        expectedAfter: false,
      });
    });

    it("should emit 'PartTypeDeregistered' event", async () => {
      await expect(dava.deregisterPartType(newPartType))
        .to.emit(dava, "PartTypeDeregistered")
        .withArgs(newPartType);
    });
  });

  describe("isRegisteredCollection", () => {
    it("should return true if collection is registered", async () => {
      const result = await dava.isRegisteredCollection(davaOfficial.address);
      expect(result).to.be.true;
    });

    it("should return false if collection is not registered", async () => {
      await dava.deregisterCollection(davaOfficial.address);
      const result = await dava.isRegisteredCollection(davaOfficial.address);
      expect(result).to.be.false;
    });
  });

  describe("isSupportedPartType", () => {
    const newPartType = partType("TEST X 10");

    it("should return false if partType is not registered", async () => {
      const result = await dava.isSupportedPartType(newPartType);
      expect(result).to.be.false;
    });

    it("should return true if partType is registered", async () => {
      await dava.registerPartType(newPartType);
      const result = await dava.isSupportedPartType(newPartType);
      expect(result).to.be.true;
    });
  });

  describe("isDavaPart", () => {
    const newPartType = partType("TEST X 10000");
    before(async () => {
      await dava.registerPartType(newPartType);
    });

    it("should return false if collection is not registered", async () => {
      const result = await dava.isDavaPart(
        ethers.Wallet.createRandom().address,
        newPartType
      );
      expect(result).to.be.false;
    });

    it("should return false if partType is not registered", async () => {
      const result = await dava.isDavaPart(
        ethers.Wallet.createRandom().address,
        partType(`${Date.now()}`)
      );
      expect(result).to.be.false;
    });

    it("should return true if partType and collection are registered", async () => {
      const result = await dava.isDavaPart(davaOfficial.address, newPartType);
      expect(result).to.be.true;
    });
  });

  describe("getAvatar", () => {
    it("should return proper avatar address", async () => {
      const owner = ethers.Wallet.createRandom().address;
      const tokenId = await dava.totalSupply();
      await dava.mint(owner, tokenId);
      const avatarAddress = await dava.getAvatar(tokenId);

      const Avatar = new AvatarV1__factory(deployer);
      const avatar = Avatar.attach(avatarAddress);

      expect(await avatar.owner()).to.equal(owner);
      expect(await dava.ownerOf(tokenId)).to.equal(owner);
    });
  });

  describe("getAllSupportedPartTypes", () => {
    it("should return all registered partTypes", async () => {
      await checkChange({
        status: () => dava.getAllSupportedPartTypes().then((v) => v.length),
        process: () => dava.registerPartType(partType(`${Date.now()}`)),
        expectedBefore: 2,
        expectedAfter: 3,
      });
    });
  });

  describe("getRegisteredCollections", () => {
    let newCollection: DavaOfficial;
    before(async () => {
      const Collection = new DavaOfficial__factory(deployer);
      newCollection = await Collection.deploy("", dava.address);
      await newCollection.deployed();
    });

    it("should return all registered collection addresses", async () => {
      await checkChange({
        status: () => dava.getRegisteredCollections().then((v) => v.length),
        process: () => dava.registerCollection(newCollection.address),
        expectedBefore: 1,
        expectedAfter: 2,
      });
    });
  });

  describe("tokenURI", () => {
    it("should be reverted for non-existent token", async () => {
      const nextTokenId = await dava.totalSupply();
      await expect(dava.tokenURI(nextTokenId)).to.be.revertedWith(
        "ERC721Metadata: URI query for nonexistent token"
      );
    });

    it("should return the same result from Avatar::getMetadata", async () => {
      const tokenId = await dava.totalSupply();
      await dava.mint(deployer.address, tokenId);

      const Avatar = new AvatarV1__factory(deployer);
      const avatar = Avatar.attach(await dava.getAvatar(tokenId));

      const avatarResult = await avatar.getMetadata();
      const davaResult = await dava.tokenURI(tokenId);

      expect(avatarResult).to.equal(davaResult);
    });
  });

  describe("getPFP", () => {
    it("should be reverted for non-existent token", async () => {
      const nextTokenId = await dava.totalSupply();
      await expect(dava.getPFP(nextTokenId)).to.be.revertedWith(
        "ERC721Metadata: URI query for nonexistent token"
      );
    });

    it("should return the same result from Avatar::getPFP", async () => {
      const tokenId = await dava.totalSupply();
      await dava.mint(deployer.address, tokenId);

      const Avatar = new AvatarV1__factory(deployer);
      const avatar = Avatar.attach(await dava.getAvatar(tokenId));

      const avatarResult = await avatar.getPFP();
      const davaResult = await dava.getPFP(tokenId);

      expect(avatarResult).to.equal(davaResult);
    });
  });

  describe("ERC721", () => {
    describe("mint", () => {
      it("should deploy a linked avatar contract", async () => {
        const tokenId = 0;
        const predicted = await dava.getAvatar(tokenId);
        await expect(dava.connect(deployer).mint(accounts[0].address, tokenId))
          .to.emit(dava, "Transfer")
          .withArgs(constants.AddressZero, accounts[0].address, tokenId);
        const ownerOfAvatar = await AvatarV1__factory.connect(
          predicted,
          accounts[0]
        ).owner();
        expect(ownerOfAvatar).to.equal(accounts[0].address);
      });
    });
  });

  describe("UpgradeableBeacon", () => {
    describe("upgradeTo", () => {
      it("should update the controller", async () => {
        const tokenId = 0;
        await dava.connect(deployer).mint(accounts[0].address, tokenId);
        const avatarAddr = await dava.getAvatar(tokenId);
        const avatar = AvatarV1__factory.connect(avatarAddr, accounts[0]);
        expect(await avatar.version()).to.equal("V1");
        // prepare AvatarV2Draft
        const AvatarV2Contract = new AvatarV2Draft__factory(deployer);
        const avatarV2Impl = await AvatarV2Contract.deploy();
        // run upgradeTo()
        expect(await dava.implementation()).to.equal(avatarV1.address);
        await dava.connect(deployer).upgradeTo(avatarV2Impl.address);
        expect(await dava.implementation()).to.equal(avatarV2Impl.address);
        expect(await avatar.version()).to.equal("V2");
      });
    });
  });

  describe("zap", () => {
    let testAvatar: TestAvatarV1;
    let avatarOwner: SignerWithAddress;
    let partId: number;

    beforeEach(async () => {
      const TestAvatarV1 = new TestAvatarV1__factory(deployer);
      const testAvatarV1 = await TestAvatarV1.deploy();
      await dava.connect(deployer).upgradeTo(testAvatarV1.address);

      avatarOwner = accounts[1];
      const davaId = 0;
      await dava.connect(deployer).mint(avatarOwner.address, davaId);
      testAvatar = TestAvatarV1__factory.connect(
        await dava.getAvatar(davaId),
        deployer
      );

      const collectionName = "test";
      const defaultPartType = await davaOfficial.DEFAULT_PART_TYPE();
      await davaOfficial.createPart(defaultPartType, "test", "", "", [], 0);
      await davaOfficial.createPartType(collectionName, 0, 0, 0);
      partId = (await davaOfficial.numberOfParts()).toNumber();
      await davaOfficial.createPart(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(collectionName)),
        "TEST",
        "",
        "",
        [],
        1
      );
      await davaOfficial.mint(avatarOwner.address, partId, 1, "0x");
    });

    describe("should be reverted", () => {
      it("if non-avatar try to use this function", async () => {
        await expect(
          dava["zap(uint256,(address,uint256,uint256))"](1, {
            collection: davaOfficial.address,
            partId: 0,
            amount: 1,
          })
        ).to.be.revertedWith("Dava: avatar and tokenId does not match");
      });

      it("if part is not ITransferablePart format", async () => {
        await expect(
          testAvatar.receivePart(testAvatar.address, 99)
        ).to.be.revertedWith("Dava: part is not transferable");
      });

      it("if avatar owner does not hold enough part", async () => {
        const nonExistentPartId = partId + 1;
        const balance = await davaOfficial.balanceOf(
          deployer.address,
          nonExistentPartId
        );
        expect(balance.toNumber()).to.equal(0);

        await expect(
          testAvatar.receivePart(davaOfficial.address, nonExistentPartId)
        ).to.be.revertedWith("Dava: owner does not hold part");
      });
    });

    it("transfer part to avatar", async () => {
      const balanceBefore = await davaOfficial.balanceOf(
        avatarOwner.address,
        partId
      );
      expect(balanceBefore.toNumber()).to.gt(0);
      const balanceOfAvatarBefore = await davaOfficial.balanceOf(
        testAvatar.address,
        partId
      );
      expect(balanceOfAvatarBefore.toNumber()).to.equal(0);

      await testAvatar.receivePart(davaOfficial.address, partId);

      const balanceAfter = await davaOfficial.balanceOf(
        avatarOwner.address,
        partId
      );
      expect(balanceAfter).to.equal(balanceBefore.sub(1));
      const balanceOfAvatarAfter = await davaOfficial.balanceOf(
        testAvatar.address,
        partId
      );
      expect(balanceOfAvatarAfter.toNumber()).to.equal(1);
    });
  });
});
