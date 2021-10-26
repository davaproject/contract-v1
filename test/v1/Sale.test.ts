import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Dava, Sale, Sale__factory } from "../../types";
import { solidity } from "ethereum-waffle";
import { BigNumberish, constants } from "ethers";
import { fixtures } from "../../scripts/utils/fixtures";
import { parseEther } from "@ethersproject/units";

chai.use(solidity);
const { expect } = chai;

describe("Sale", () => {
  let snapshot: string;
  let sale: Sale;
  let dava: Dava;
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const contracts = await fixtures();
    sale = contracts.sale;
    dava = contracts.dava;
  });
  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });
  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });
  describe("joinPublicSale", () => {
    let price: BigNumberish;
    let buyer: SignerWithAddress;
    before(async () => {
      price = await sale.PRICE();
      buyer = accounts[0];
    });
    describe("before the public sale period", () => {
      beforeEach(async () => {
        const timestamp = await sale.PUBLIC_SALE_OPENING_TIME();
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          timestamp.toNumber() - 10,
        ]);
        await ethers.provider.send("evm_mine", []);
      });
      it("should faile to join the sales", async () => {
        await expect(sale.connect(buyer).joinPublicSale(1, { value: price })).to
          .be.reverted;
      });
    });
    describe("during the public sale period", () => {
      beforeEach(async () => {
        const timestamp = await sale.PUBLIC_SALE_OPENING_TIME();
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          timestamp.toNumber(),
        ]);
        await ethers.provider.send("evm_mine", []);
        await sale.connect(buyer).joinPublicSale(1, { value: price });
      });
      it("should transfer ETH", async () => {
        expect(await ethers.provider.getBalance(sale.address)).to.eq(price);
      });
      it("should mint a new avatar for the user", async () => {
        expect(await dava.balanceOf(buyer.address)).to.eq(1);
        expect(await dava.balanceOf(accounts[1].address)).to.eq(0);
      });
    });
  });
});
