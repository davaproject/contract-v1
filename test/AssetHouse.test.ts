import chai from 'chai';

import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { TestAssetHouse, TestAssetHouse__factory } from '../types';
import { solidity } from 'ethereum-waffle';
import { OperableError, AssetHouseError } from './module/errors';
import {
  wrapLinkWithImg,
  wrapLinksWithSVG,
  wrapSVGsWithSVG,
} from './module/image';

chai.use(solidity);
const { expect } = chai;

const testData = {
  assetHttpLink: 'https://www.fnordware.com/superpng/pnggradHDrgba.png',
  name: 'test',
};

describe('AssetHouse', () => {
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  let assetHouseContract: TestAssetHouse;

  beforeEach(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const AssetHouse = new TestAssetHouse__factory(deployer);
    assetHouseContract = await AssetHouse.deploy();
  });

  describe('constructor', async () => {
    it('should be initialized successfully', async () => {
      expect(await assetHouseContract.owner()).to.equal(deployer.address);
      expect(await assetHouseContract.totalAssetData()).to.equal(0);
    });
  });

  describe('createAssetData', async () => {
    it("should be reverted with non-operator's trial", async () => {
      const nonOperator = accounts[1];
      const isOperator = await assetHouseContract.isOperable(
        nonOperator.address
      );
      expect(isOperator).to.be.false;

      await expect(
        assetHouseContract
          .connect(nonOperator)
          .createAssetData(
            testData.assetHttpLink,
            testData.name,
            nonOperator.address,
            []
          )
      ).to.be.revertedWith(OperableError.NON_OPERATOR);
    });

    it('should be reverted if assetHttpLink is empty', async () => {
      await expect(
        assetHouseContract.createAssetData(
          '',
          testData.name,
          deployer.address,
          []
        )
      ).to.be.revertedWith(AssetHouseError.NON_EMPTY_ASSET_LINK);
    });

    it('should be reverted if name is empty', async () => {
      await expect(
        assetHouseContract.createAssetData(
          testData.assetHttpLink,
          '',
          deployer.address,
          []
        )
      ).to.be.revertedWith(AssetHouseError.NON_EMPTY_TITLE);
    });

    it('should be reverted if creator is zeroAddress', async () => {
      await expect(
        assetHouseContract.createAssetData(
          testData.assetHttpLink,
          testData.name,
          ethers.constants.AddressZero,
          []
        )
      ).to.be.revertedWith(AssetHouseError.NON_EMPTY_CREATOR);
    });

    it('should set data properly', async () => {
      const totalAssetDataBefore = await assetHouseContract.totalAssetData();
      const assetDataId = totalAssetDataBefore;
      const creator = ethers.Wallet.createRandom().address;

      await assetHouseContract.createAssetData(
        testData.assetHttpLink,
        testData.name,
        creator,
        []
      );

      const totalAssetDataAfter = await assetHouseContract.totalAssetData();
      expect(totalAssetDataAfter).to.equal(totalAssetDataBefore.add(1));

      const [assetHttpLink, name, registeredCreator] =
        await assetHouseContract.getAssetDataById(assetDataId);

      expect(assetHttpLink).to.equal(testData.assetHttpLink);
      expect(name).to.equal(testData.name);
      expect(registeredCreator).to.equal(creator);
    });

    it("should emit 'NewAssetData' event", async () => {
      const totalAssetDataBefore = await assetHouseContract.totalAssetData();
      const assetDataId = totalAssetDataBefore;
      const creator = ethers.Wallet.createRandom().address;

      await expect(
        assetHouseContract.createAssetData(
          testData.assetHttpLink,
          testData.name,
          creator,
          []
        )
      )
        .to.emit(assetHouseContract, 'NewAssetData')
        .withArgs(
          assetDataId,
          testData.assetHttpLink,
          testData.name,
          creator,
          []
        );
    });
  });

  describe('getAssetDataById', async () => {
    let id: number;
    const creator = ethers.Wallet.createRandom().address;
    beforeEach(async () => {
      id = (await assetHouseContract.totalAssetData()).toNumber();
      await assetHouseContract.createAssetData(
        testData.assetHttpLink,
        testData.name,
        creator,
        []
      );
    });

    it('should be reverted with non-existent data', async () => {
      await expect(
        assetHouseContract.getAssetDataById(id + 1)
      ).to.be.revertedWith(AssetHouseError.NON_EXISTENT_ASSET);
    });

    it('should return data properly', async () => {
      const [assetHttpLink, name, registeredCreator] =
        await assetHouseContract.getAssetDataById(id);

      expect(assetHttpLink).to.equal(testData.assetHttpLink);
      expect(name).to.equal(testData.name);
      expect(registeredCreator).to.equal(creator);
    });
  });

  describe('getImageFromLink', async () => {
    it('should return image', async () => {
      const img = await assetHouseContract.getImageFromLink(
        testData.assetHttpLink
      );

      expect(img).to.equal(wrapLinkWithImg(testData.assetHttpLink));
    });
  });

  describe('getSVGFromLinks', async () => {
    it('should return empty svg without assetLinks', async () => {
      const result = await assetHouseContract.getSVGFromLinks([]);

      expect(result).to.eq(wrapLinksWithSVG([]));
    });

    it('should return svg properly', async () => {
      const links = ['test1', 'test2', 'test3'];

      const result = await assetHouseContract.getSVGFromLinks(links);

      expect(result).to.equal(wrapLinksWithSVG(links));
    });
  });

  describe('getSVGWithChildSVGs', async () => {
    it('should return empty svg without assetLinks', async () => {
      const result = await assetHouseContract.getSVGWithChildSVGs([]);

      expect(result).to.eq(wrapSVGsWithSVG([]));
    });

    it('should return svg properly', async () => {
      const svgs = ['test1', 'test2', 'test3'];

      const result = await assetHouseContract.getSVGWithChildSVGs(svgs);

      expect(result).to.equal(wrapSVGsWithSVG(svgs));
    });
  });

  describe('exists', async () => {
    let id: number;
    beforeEach(async () => {
      id = (await assetHouseContract.totalAssetData()).toNumber();
      await assetHouseContract.createAssetData(
        testData.assetHttpLink,
        testData.name,
        ethers.Wallet.createRandom().address,
        []
      );
    });

    it('should return boolean value', async () => {
      let exists = await assetHouseContract.exists(id + 1);
      expect(exists).to.be.false;

      exists = await assetHouseContract.exists(id);
      expect(exists).to.be.true;
    });
  });
});
