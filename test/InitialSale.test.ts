import chai from 'chai';

import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  RandomBox,
  RandomBox__factory,
  TestAvatar,
  TestAvatar__factory,
  TestAsset,
  TestAsset__factory,
  AssetHouse,
  AssetHouse__factory,
  InitialSale,
  InitialSale__factory,
} from '../types';
import { solidity } from 'ethereum-waffle';

chai.use(solidity);
const { expect } = chai;

const assetAmount = 10;

describe('InitialSale', () => {
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  let randomBoxContract: RandomBox;
  let avatarContract: TestAvatar;
  let assetContractList: Array<TestAsset> = [];
  let assetHouseContract: AssetHouse;
  let initialSaleContract: InitialSale;

  beforeEach(async () => {
    [deployer, ...accounts] = await ethers.getSigners();

    const RandomBox = new RandomBox__factory(deployer);
    randomBoxContract = await RandomBox.deploy();

    const AssetHouseContract = new AssetHouse__factory(deployer);
    assetHouseContract = await AssetHouseContract.deploy();

    const AvatarContract = new TestAvatar__factory(deployer);
    avatarContract = await AvatarContract.deploy(
      100,
      ethers.Wallet.createRandom().address,
      assetHouseContract.address
    );

    const InitialSaleContract = new InitialSale__factory(deployer);
    initialSaleContract = await InitialSaleContract.deploy(
      avatarContract.address,
      randomBoxContract.address
    );
    avatarContract.addOperator(initialSaleContract.address);
    randomBoxContract.addOperator(initialSaleContract.address);

    assetContractList = [];
    for (let i = 0; i < assetAmount; i += 1) {
      const AssetContract = new TestAsset__factory(deployer);
      const assetContract = await AssetContract.deploy(
        'name',
        'symbol',
        'trait',
        ethers.Wallet.createRandom().address,
        randomBoxContract.address,
        assetHouseContract.address,
        avatarContract.address
      );

      assetContractList.push(assetContract);
      await avatarContract.registerAssetContract(assetContract.address);

      const assetId = await assetHouseContract.totalAssetData();
      await assetHouseContract.createAssetData(
        'SVG',
        'NAME',
        ethers.Wallet.createRandom().address,
        []
      );

      await assetContract.registerAsset(assetId, 10);
      await assetContract.addOperator(initialSaleContract.address);

      await randomBoxContract.addOperator(assetContract.address);
    }
  });

  describe('registerAssetList', async () => {
    it('should set assetList', async () => {
      await initialSaleContract.registerAssetList(
        assetContractList.map((d) => d.address)
      );

      for (let i = 0; i < assetAmount; i += 1) {
        expect(await initialSaleContract.assetList(i)).to.equal(
          assetContractList[i].address
        );
      }
    });

    it("should emit 'RegisterAssetList' event", async () => {
      const assetAddressList = assetContractList.map((d) => d.address);
      await expect(initialSaleContract.registerAssetList(assetAddressList))
        .to.emit(initialSaleContract, 'RegisterAssetList')
        .withArgs(assetAddressList);
    });
  });

  describe('mintAvatarWithAssets', async () => {
    beforeEach(async () => {
      await initialSaleContract.registerAssetList(
        assetContractList.map((d) => d.address)
      );
    });

    it('should mint avatar', async () => {
      const receiver = ethers.Wallet.createRandom().address;
      const avatarId = await avatarContract.totalSupply();
      await expect(avatarContract.ownerOf(avatarId)).to.be.reverted;

      await initialSaleContract.mintAvatarWithAssets(receiver);

      const owner = await avatarContract.ownerOf(avatarId);
      expect(owner).to.equal(receiver);
    });

    it("should emit 'MintAvatarWithAssets' event", async () => {
      const receiver = ethers.Wallet.createRandom().address;
      await expect(initialSaleContract.mintAvatarWithAssets(receiver)).to.emit(
        initialSaleContract,
        'MintAvatarWithAssets'
      );
    });
  });
});
