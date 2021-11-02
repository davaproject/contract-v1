import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AvatarV1,
  AvatarV1__factory,
  AvatarV2Draft__factory,
  Dava,
  DavaOfficial,
  TestAvatarV1,
  TestAvatarV1__factory,
} from "../../types";
import { solidity } from "ethereum-waffle";
import { constants } from "ethers";
import { Contracts, fixtures } from "../../scripts/utils/fixtures";

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
      assets: { davaOfficial },
    } = contracts);
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
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

  describe("IDava", () => {
    describe("registerDefaultCollection() & deregisterDefaultCollection()", () => {
      const tokenId = 0;
      beforeEach(async () => {
        await dava.connect(deployer).mint(accounts[0].address, tokenId);
      });
      it("should remove the default collection and recover correctly", async () => {
        //
      });
    });
  });

  describe("transferAssetToAvatar", () => {
    let testAvatar: TestAvatarV1;
    let avatarOwner: SignerWithAddress;
    let assetId: number;

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
      const defaultAssetType = await davaOfficial.DEFAULT_ASSET_TYPE();
      await davaOfficial.createAsset(
        defaultAssetType,
        "test",
        deployer.address,
        "",
        "",
        [],
        0
      );
      await davaOfficial.createAssetType(collectionName, 0, 0, 0);
      assetId = (await davaOfficial.numberOfAssets()).toNumber();
      await davaOfficial.createAsset(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(collectionName)),
        "TEST",
        deployer.address,
        "",
        "",
        [],
        1
      );
      await davaOfficial.mint(avatarOwner.address, assetId, 1, "0x");
    });

    describe("should be reverted", () => {
      it("if non-avatar try to use this function", async () => {
        await expect(
          dava["zap(uint256,(address,uint256,uint256))"](1, {
            collection: davaOfficial.address,
            assetId: 0,
            amount: 1,
          })
        ).to.be.revertedWith("Dava: avatar and tokenId does not match");
      });

      it("if asset is not ITransferableAsset format", async () => {
        await expect(
          testAvatar.receiveAsset(testAvatar.address, 99)
        ).to.be.revertedWith("Dava: asset is not transferable");
      });

      it("if avatar owner does not hold enough asset", async () => {
        const nonExistentAssetId = assetId + 1;
        const balance = await davaOfficial.balanceOf(
          deployer.address,
          nonExistentAssetId
        );
        expect(balance.toNumber()).to.equal(0);

        await expect(
          testAvatar.receiveAsset(davaOfficial.address, nonExistentAssetId)
        ).to.be.revertedWith("Dava: owner does not hold asset");
      });
    });

    it("transfer asset to avatar", async () => {
      const balanceBefore = await davaOfficial.balanceOf(
        avatarOwner.address,
        assetId
      );
      expect(balanceBefore.toNumber()).to.gt(0);
      const balanceOfAvatarBefore = await davaOfficial.balanceOf(
        testAvatar.address,
        assetId
      );
      expect(balanceOfAvatarBefore.toNumber()).to.equal(0);

      await testAvatar.receiveAsset(davaOfficial.address, assetId);

      const balanceAfter = await davaOfficial.balanceOf(
        avatarOwner.address,
        assetId
      );
      expect(balanceAfter).to.equal(balanceBefore.sub(1));
      const balanceOfAvatarAfter = await davaOfficial.balanceOf(
        testAvatar.address,
        assetId
      );
      expect(balanceOfAvatarAfter.toNumber()).to.equal(1);
    });
  });
});
