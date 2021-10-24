import chai from 'chai';

import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
    AvatarV1,
    AvatarV1__factory,
    Dava,
    Dava__factory,
} from '../../types';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from '@ethersproject/bignumber';
import { constants } from 'ethers';

chai.use(solidity);
const { expect } = chai;

describe('Dava', () => {
  let snapshot: string;
  let avatarV1: AvatarV1;
  let dava: Dava;
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const AvatarV1Contract = new AvatarV1__factory(deployer);
    const DavaContract = new Dava__factory(deployer);
    avatarV1 = await AvatarV1Contract.deploy();
    dava = await DavaContract.deploy(avatarV1.address);
  })
  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });
  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });
  describe("mint", () =>{
      it("should deploy a linked avatar contract", async () => {
        const tokenId = 0;
        console.log("dava", dava.address)
        const predicted = await dava.getAvatar(tokenId)
        await expect(dava.connect(deployer).mint(accounts[0].address, tokenId)).to.emit(dava, 'Transfer').withArgs(constants.AddressZero, accounts[0].address, tokenId);
        const ownerOfAvatar = await AvatarV1__factory.connect(predicted, accounts[0]).owner()
        expect(ownerOfAvatar).to.equal(accounts[0].address)
      })
  })
})
