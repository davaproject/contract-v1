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
import { fixtures } from "../../scripts/utils/fixtures";
import { parseEther } from "@ethersproject/units";

chai.use(solidity);
const { expect } = chai;

describe("Avatar", () => {
  let snapshot: string;
  let dava: Dava;
  let mintedAvatar: AvatarV1;
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const contracts = await fixtures();
    dava = contracts.dava;
    await dava.connect(deployer).mint(accounts[0].address, 0);
    mintedAvatar = AvatarV1__factory.connect(
      await dava.getAvatar(0),
      accounts[0]
    );
  });
  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });
  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });
  describe("receive()", () => {
    const tokenId = 0;
    beforeEach(async () => {});
    it("should allow receiving ETH", async () => {
      await accounts[0].sendTransaction({
        to: mintedAvatar.address,
        value: parseEther("1"),
      });
      expect(await ethers.provider.getBalance(mintedAvatar.address)).to.equal(
        parseEther("1")
      );
    });
    it("should be able to withdraw ETH", async () => {
      await accounts[0].sendTransaction({
        to: mintedAvatar.address,
        value: parseEther("1"),
      });
      expect(await ethers.provider.getBalance(mintedAvatar.address)).to.equal(
        parseEther("1")
      );
      const bal0 = await ethers.provider.getBalance(accounts[1].address);
      await mintedAvatar.connect(accounts[0]).execute({
        to: accounts[1].address,
        value: parseEther("1"),
        data: "0x",
      });
      expect(await ethers.provider.getBalance(accounts[1].address)).to.equal(
        bal0.add(parseEther("1"))
      );
      expect(await ethers.provider.getBalance(mintedAvatar.address)).to.equal(
        0
      );
    });
  });
});
