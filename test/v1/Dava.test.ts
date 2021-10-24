import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AvatarV1,
  AvatarV1__factory,
  AvatarV2Draft__factory,
  BeaconProxy,
  BeaconProxy__factory,
  Dava,
  Dava__factory,
  MinimalProxy__factory,
} from "../../types";
import { solidity } from "ethereum-waffle";
import { constants } from "ethers";

chai.use(solidity);
const { expect } = chai;

describe("Dava", () => {
  let snapshot: string;
  let minimalProxy: BeaconProxy;
  let avatarV1: AvatarV1;
  let dava: Dava;
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const MinimalProxyContract = new MinimalProxy__factory(deployer);
    const AvatarV1Contract = new AvatarV1__factory(deployer);
    const DavaContract = new Dava__factory(deployer);
    minimalProxy = await MinimalProxyContract.deploy();
    dava = await DavaContract.deploy(minimalProxy.address);
    // set avatar implementation
    avatarV1 = await AvatarV1Contract.deploy();
    await dava.connect(deployer).upgradeTo(avatarV1.address);
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
});
