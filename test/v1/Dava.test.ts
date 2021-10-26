import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AvatarV1,
  AvatarV1__factory,
  AvatarV2Draft__factory,
  Dava,
} from "../../types";
import { solidity } from "ethereum-waffle";
import { constants } from "ethers";
import { Fixture, fixtures } from "../../scripts/utils/fixtures";

chai.use(solidity);
const { expect } = chai;

describe("Dava", () => {
  let snapshot: string;
  let avatarV1: AvatarV1;
  let dava: Dava;
  let contracts: Fixture;
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    contracts = await fixtures();
    dava = contracts.dava;
    avatarV1 = contracts.avatarV1;
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
    describe("registerDefaultAsset() & deregisterDefaultAsset()", () => {
      const tokenId = 0;
      beforeEach(async () => {
        await dava.connect(deployer).mint(accounts[0].address, tokenId);
      });
      it("should remove the default asset and recover correctly", async () => {
        const uri0 = await dava.tokenURI(0);
        await dava
          .connect(deployer)
          .deregisterDefaultAsset(contracts.assets.davaSignature.address);
        const uri1 = await dava.tokenURI(0);
        await dava
          .connect(deployer)
          .registerDefaultAsset(contracts.assets.davaSignature.address);
        const uri2 = await dava.tokenURI(0);
        expect(uri0).to.eq(uri2);
        expect(uri1).not.to.eq(uri2);
      });
    });
  });
});
