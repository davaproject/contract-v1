import chai from 'chai';

import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  TestAsset,
  TestAsset__factory,
  TestRandomBoxFor0,
  TestRandomBoxFor0__factory,
  AssetHouse,
  AssetHouse__factory,
  LayerHouse__factory,
  LayerHouse,
} from '../types';
import { solidity } from 'ethereum-waffle';
import { checkBigNumberChange, checkChange } from './module/compare';
import { BigNumber } from '@ethersproject/bignumber';
import { OwnableError, OperableError, AssetError } from './module/errors';
import { wrapLinksWithSVG, wrapLinkWithImg } from './module/image';

chai.use(solidity);
const { expect } = chai;

const configs: {
  name: string;
  symbol: string;
  traitType: string;
} = {
  name: 'Asset',
  symbol: 'AST',
  traitType: 'TRAIT',
};

interface AssetData {
  assetHttpLink: string;
  name: string;
  creator: string;
}

const testData = (assetId: number): AssetData => ({
  assetHttpLink: 'https://www.fnordware.com/superpng/pnggradHDrgba.png',
  name: `TEST${assetId}`,
  creator: ethers.Wallet.createRandom().address,
});

describe('Asset', () => {
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  let assetContract: TestAsset;
  let randomBoxContract: TestRandomBoxFor0;
  let assetHouseContract: AssetHouse;
  let layerHouseContract: LayerHouse;
  let avatarContract: SignerWithAddress;

  beforeEach(async () => {
    [deployer, ...accounts] = await ethers.getSigners();

    const RandomBoxContract = new TestRandomBoxFor0__factory(deployer);
    randomBoxContract = await RandomBoxContract.deploy();

    const AssetHouseContract = new AssetHouse__factory(deployer);
    assetHouseContract = await AssetHouseContract.deploy();

    const LayerHouseContract = new LayerHouse__factory(deployer);
    layerHouseContract = await LayerHouseContract.deploy(
      assetHouseContract.address
    );

    avatarContract = accounts[7];
    const AssetContract = new TestAsset__factory(deployer);
    assetContract = await AssetContract.deploy(
      configs.name,
      configs.symbol,
      configs.traitType,
      layerHouseContract.address,
      randomBoxContract.address,
      assetHouseContract.address,
      avatarContract.address
    );
  });

  describe('constructor', async () => {
    it('should be initialized properly', async () => {
      expect(await assetContract.layerHouse()).to.equal(
        layerHouseContract.address
      );
      expect(await assetContract.randomBox()).to.equal(
        randomBoxContract.address
      );
      expect(await assetContract.assetHouse()).to.equal(
        assetHouseContract.address
      );
      expect(await assetContract.totalSupply()).to.equal(0);
      expect(await assetContract.maxTotalSupply()).to.equal(0);
      expect(await assetContract.totalAssets()).to.equal(0);
      expect(await assetContract.getAssets()).to.be.an('array').and.empty;
      expect(await assetContract.name()).to.equal(configs.name);
      expect(await assetContract.symbol()).to.equal(configs.symbol);
      expect(await assetContract.traitType()).to.equal(configs.traitType);
    });
  });

  describe('setLayerHouse', async () => {
    it('should be reverted for non-owners try', async () => {
      const nonOwner = accounts[1];
      const owner = await assetContract.owner();
      expect(owner).not.to.equal(nonOwner.address);

      await expect(
        assetContract
          .connect(nonOwner)
          .setLayerHouse(layerHouseContract.address)
      ).to.be.revertedWith(OwnableError.NON_OWNER);
    });

    it('should be reverted if layerHouse address is zero', async () => {
      await expect(
        assetContract.setLayerHouse(ethers.constants.AddressZero)
      ).to.be.revertedWith(AssetError.NO_EMPTY_ADDRESS);
    });

    it('should set layerHouse properly', async () => {
      const newLayerHouse = ethers.Wallet.createRandom().address;
      const layerHouseBefore = await assetContract.layerHouse();
      expect(layerHouseBefore).not.to.equal(newLayerHouse);

      await assetContract.setLayerHouse(newLayerHouse);
      const layerHouseAfter = await assetContract.layerHouse();
      expect(layerHouseAfter).to.equal(newLayerHouse);
    });

    it("should emit 'SetLayerHouse' event", async () => {
      const newLayerHouse = ethers.Wallet.createRandom().address;

      await expect(assetContract.setLayerHouse(newLayerHouse))
        .to.emit(assetContract, 'SetLayerHouse')
        .withArgs(newLayerHouse);
    });
  });

  describe('registerAsset', async () => {
    let assetId: number;
    const maxSupply = 500;
    beforeEach(async () => {
      assetId = (await assetHouseContract.totalAssetData()).toNumber();

      const data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
    });

    it('should be reverted with non-operators trial', async () => {
      const nonOperator = accounts[1];
      const isOperable = await assetContract.isOperable(nonOperator.address);
      expect(isOperable).to.be.false;

      await expect(
        assetContract.connect(nonOperator).registerAsset(assetId, maxSupply)
      ).to.be.revertedWith(OperableError.NON_OPERATOR);
    });

    it('should be reverted if maxSupply is zero', async () => {
      await expect(assetContract.registerAsset(assetId, 0)).to.be.revertedWith(
        AssetError.ONLY_POS_NUMBER
      );
    });

    it('should be reverted if new maxSupply exceeds maxAssetSupply', async () => {
      const maxAssetSupply = await assetContract.maxAssetSupply();

      await expect(
        assetContract.registerAsset(assetId, maxAssetSupply.add(1))
      ).to.be.revertedWith(AssetError.EXCEEDS_MAX_ASSET_SUPPLY_LIMIT);
    });

    it('should be reverted if asset is already registered', async () => {
      await assetContract.registerAsset(assetId, 1);
      await expect(assetContract.registerAsset(assetId, 1)).to.be.revertedWith(
        AssetError.ALREADY_REGISTERED_ASSET
      );
    });

    it('should be reverted if asset does not exist', async () => {
      const nonExistentAsset = assetId + 1;
      const exist = await assetHouseContract.exists(nonExistentAsset);
      expect(exist).to.be.false;

      await expect(
        assetContract.registerAsset(nonExistentAsset, 1)
      ).to.be.revertedWith(AssetError.NON_EXISTENT_ASSET);
    });

    describe('should update status successfully', async () => {
      it('of maxTotalSupply', async () => {
        await checkBigNumberChange({
          status: () => assetContract.maxTotalSupply(),
          process: assetContract.registerAsset(assetId, maxSupply),
          change: maxSupply,
        });
      });

      it('of maxSupplyByAssetId', async () => {
        await checkBigNumberChange({
          status: () => assetContract.maxSupplyByAssetId(assetId),
          process: assetContract.registerAsset(assetId, maxSupply),
          change: maxSupply,
        });
      });

      it('of assetIdByIndex', async () => {
        const index = await assetContract.totalAssets();
        await expect(assetContract.assetIdByIndex(index)).to.be.reverted;

        await assetContract.registerAsset(assetId, maxSupply);

        const assetIdAfter = (
          await assetContract.assetIdByIndex(index)
        ).toNumber();
        expect(assetIdAfter).to.equal(assetId);
      });

      it('of assets', async () => {
        await checkChange({
          status: () => assetContract.getAssets(),
          process: assetContract.registerAsset(assetId, maxSupply),
          expectedBefore: [],
          expectedAfter: [BigNumber.from(assetId)],
        });
      });

      it('of totalAssets', async () => {
        await checkBigNumberChange({
          status: () => assetContract.totalAssets(),
          process: assetContract.registerAsset(assetId, maxSupply),
          change: 1,
        });
      });
    });

    it("should emit 'RegisterAsset' event", async () => {
      const expectedIndex = await assetContract.totalAssets();

      await expect(assetContract.registerAsset(assetId, maxSupply))
        .to.emit(assetContract, 'RegisterAsset')
        .withArgs(expectedIndex, assetId, maxSupply);
    });
  });

  describe('mint', async () => {
    let assetId: number;
    const maxSupply = 3;
    beforeEach(async () => {
      assetId = (await assetHouseContract.totalAssetData()).toNumber();

      const data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, maxSupply);
    });

    it('should be reverted for non-operators request', async () => {
      const nonOperator = accounts[1];
      const isOperable = await assetContract.isOperable(nonOperator.address);
      expect(isOperable).to.be.false;

      await expect(
        assetContract.connect(nonOperator).randomMint(nonOperator.address)
      ).to.be.revertedWith(OperableError.NON_OPERATOR);
    });

    it('should be reverted if totalSupply reaches maxTotalSupply', async () => {
      const totalSupply = (await assetContract.totalSupply()).toNumber();
      const maxTotalSupply = (await assetContract.maxTotalSupply()).toNumber();

      for (let i = 0; i < maxTotalSupply - totalSupply; i += 1) {
        await assetContract.randomMint(deployer.address);
      }

      await expect(
        assetContract.randomMint(deployer.address)
      ).to.be.revertedWith(AssetError.EXCEEDS_TOKEN_MAX_SUPPLY);
    });

    it('should mint tokens with registered all assets', async () => {
      const anotherAssetId = (
        await assetHouseContract.totalAssetData()
      ).toNumber();

      const data = testData(anotherAssetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(anotherAssetId, maxSupply);

      const totalSupply = (await assetContract.totalSupply()).toNumber();
      const maxTotalSupply = (await assetContract.maxTotalSupply()).toNumber();

      await new Array(maxTotalSupply - totalSupply)
        .fill(0)
        .reduce(
          (acc) => acc.then(() => assetContract.randomMint(deployer.address)),
          Promise.resolve()
        );

      const assetTotalSupply = (
        await assetContract.totalSupplyByAssetId(assetId)
      ).toNumber();
      expect(assetTotalSupply).to.equal(maxSupply);

      const anotherAssetTotalSupply = (
        await assetContract.totalSupplyByAssetId(anotherAssetId)
      ).toNumber();
      expect(anotherAssetTotalSupply).to.equal(maxSupply);
    });

    it("should emit 'Mint' event", async () => {
      const receiver = ethers.Wallet.createRandom().address;
      const tokenId = await assetContract.totalSupply();
      await expect(assetContract.randomMint(receiver))
        .to.emit(assetContract, 'Mint')
        .withArgs(receiver, tokenId, assetId);
    });

    describe('should change status correctly', async () => {
      it('of tokenOwner', async () => {
        const tokenId = await assetContract.totalSupply();
        await expect(assetContract.ownerOf(tokenId)).to.be.reverted;

        const receiver = ethers.Wallet.createRandom().address;
        await assetContract.randomMint(receiver);

        const tokenOwner = await assetContract.ownerOf(tokenId);
        expect(tokenOwner).to.equal(receiver);
      });

      it('of totalSupplyByAssetId', async () => {
        await checkBigNumberChange({
          status: () => assetContract.totalSupplyByAssetId(assetId),
          process: assetContract.randomMint(
            ethers.Wallet.createRandom().address
          ),
          change: 1,
        });
      });

      it('of assetIdByTokenId', async () => {
        const tokenId = await assetContract.totalSupply();
        await expect(assetContract.assetIdByTokenId(tokenId)).to.be.reverted;

        const receiver = ethers.Wallet.createRandom().address;
        await assetContract.randomMint(receiver);

        const assetIdAfter = await assetContract.assetIdByTokenId(tokenId);
        expect(assetIdAfter).to.equal(assetId);
      });

      it('of totalSupply', async () => {
        await checkBigNumberChange({
          status: () => assetContract.totalSupply(),
          process: assetContract.randomMint(
            ethers.Wallet.createRandom().address
          ),
          change: 1,
        });
      });
    });
  });

  describe('mintWithAssetId', async () => {
    let assetId: number;
    const maxSupply = 3;
    beforeEach(async () => {
      assetId = (await assetHouseContract.totalAssetData()).toNumber();

      const data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, maxSupply);
    });

    it('should be reverted for non-operators request', async () => {
      const nonOperator = accounts[1];
      const isOperable = await assetContract.isOperable(nonOperator.address);
      expect(isOperable).to.be.false;

      await expect(
        assetContract
          .connect(nonOperator)
          .mintWithAssetId(nonOperator.address, assetId)
      ).to.be.revertedWith(OperableError.NON_OPERATOR);
    });

    it('should be reverted if totalSupply reaches maxTotalSupply', async () => {
      const totalSupply = (await assetContract.totalSupply()).toNumber();
      const maxTotalSupply = (await assetContract.maxTotalSupply()).toNumber();

      for (let i = 0; i < maxTotalSupply - totalSupply; i += 1) {
        await assetContract.mintWithAssetId(deployer.address, assetId);
      }

      await expect(
        assetContract.mintWithAssetId(deployer.address, assetId)
      ).to.be.revertedWith(AssetError.EXCEEDS_TOKEN_MAX_SUPPLY);
    });

    it('should be reverted if assetSupply is full', async () => {
      // To differentiate the test case from above (totalSupply)
      const anotherAssetId = (
        await assetHouseContract.totalAssetData()
      ).toNumber();

      const data = testData(anotherAssetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(anotherAssetId, maxSupply);

      const maxSupplyOfAsset = (
        await assetContract.maxSupplyByAssetId(assetId)
      ).toNumber();
      const totalSupplyOfAsset = (
        await assetContract.totalSupplyByAssetId(assetId)
      ).toNumber();

      for (let i = 0; i < maxSupplyOfAsset - totalSupplyOfAsset; i += 1) {
        await assetContract.mintWithAssetId(deployer.address, assetId);
      }

      await expect(
        assetContract.mintWithAssetId(deployer.address, assetId)
      ).to.be.revertedWith(AssetError.EXCEEDS_ASSET_MAX_SUPPLY);
    });

    describe('should change status properly', async () => {
      it('of totalSupplyByAssetId', async () => {
        await checkBigNumberChange({
          status: () => assetContract.totalSupplyByAssetId(assetId),
          process: assetContract.mintWithAssetId(deployer.address, assetId),
          change: 1,
        });
      });

      it('of assetIdByTokenId', async () => {
        const tokenId = await assetContract.totalSupply();
        await expect(assetContract.assetIdByTokenId(tokenId)).to.be.reverted;

        await assetContract.mintWithAssetId(deployer.address, assetId);

        const assetIdAfter = (
          await assetContract.assetIdByTokenId(tokenId)
        ).toNumber();
        expect(assetIdAfter).to.equal(assetId);
      });

      it('of owner of token', async () => {
        const tokenId = await assetContract.totalSupply();
        await expect(assetContract.ownerOf(tokenId)).to.be.reverted;

        const receiver = ethers.Wallet.createRandom().address;
        await assetContract.mintWithAssetId(receiver, assetId);

        const owner = await assetContract.ownerOf(tokenId);
        expect(owner).to.equal(receiver);
      });
    });

    it("should emit 'MintWithAssetId' event", async () => {
      const receiver = ethers.Wallet.createRandom().address;
      const tokenId = await assetContract.totalSupply();

      await expect(assetContract.mintWithAssetId(receiver, assetId))
        .to.emit(assetContract, 'MintWithAssetId')
        .withArgs(receiver, tokenId, assetId);
    });
  });

  describe('getImageForDisplay', async () => {
    let tokenId: number;
    let assetId: number;
    let data: AssetData;

    beforeEach(async () => {
      assetId = (await assetHouseContract.totalAssetData()).toNumber();

      data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, 1);

      tokenId = (await assetContract.totalSupply()).toNumber();
      await assetContract.randomMint(deployer.address);
    });

    it('should be reverted if token does not exist', async () => {
      const nonExistentTokenId = await assetContract.totalSupply();
      await expect(assetContract.ownerOf(nonExistentTokenId)).to.be.reverted;
      await expect(
        assetContract.getImageForDisplay(nonExistentTokenId)
      ).to.be.revertedWith(AssetError.NON_EXISTENT_TOKEN);
    });

    it('should return desired image with default layer', async () => {
      const defaultBottomLayerAssetId = (
        await assetHouseContract.totalAssetData()
      ).toNumber();
      const defaultBottomLayerIndex = (
        await layerHouseContract.totalLayers()
      ).add(1);

      const bottomData = testData(defaultBottomLayerAssetId);
      await assetHouseContract.createAssetData(
        bottomData.assetHttpLink,
        bottomData.name,
        bottomData.creator,
        []
      );
      await layerHouseContract.registerLayers([
        {
          asset: ethers.constants.AddressZero,
          hasDefault: true,
          assetId: defaultBottomLayerAssetId,
        },
      ]);

      const targetLayerIndex = (await layerHouseContract.totalLayers()).add(1);
      await layerHouseContract.registerLayers([
        {
          asset: assetContract.address,
          hasDefault: false,
          assetId: 0,
        },
      ]);

      const defaultUpperLayerAssetId = (
        await assetHouseContract.totalAssetData()
      ).toNumber();
      const defaultUpperLayerIndex = (
        await layerHouseContract.totalLayers()
      ).add(1);

      const upperData = testData(defaultUpperLayerAssetId);
      await assetHouseContract.createAssetData(
        upperData.assetHttpLink,
        upperData.name,
        upperData.creator,
        []
      );
      await layerHouseContract.registerLayers([
        {
          asset: ethers.constants.AddressZero,
          hasDefault: true,
          assetId: defaultUpperLayerAssetId,
        },
      ]);

      await layerHouseContract.registerLayersToAddress(assetContract.address, [
        defaultBottomLayerIndex,
        targetLayerIndex,
        defaultUpperLayerIndex,
      ]);

      const image = await assetContract.getImageForDisplay(tokenId);
      const expectedImage = wrapLinksWithSVG([
        bottomData.assetHttpLink,
        data.assetHttpLink,
        upperData.assetHttpLink,
      ]);
      expect(image).to.equal(expectedImage);
    });
  });

  describe('getRawImage', async () => {
    let tokenId: number;
    let assetId: number;
    let data: AssetData;
    beforeEach(async () => {
      assetId = (await assetHouseContract.totalAssetData()).toNumber();

      data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, 1);

      tokenId = (await assetContract.totalSupply()).toNumber();
      await assetContract.randomMint(deployer.address);
    });

    it('should be reverted if token does not exist', async () => {
      const nonExistentTokenId = await assetContract.totalSupply();
      await expect(assetContract.ownerOf(nonExistentTokenId)).to.be.reverted;
      await expect(
        assetContract.getRawImage(nonExistentTokenId)
      ).to.be.revertedWith(AssetError.NON_EXISTENT_TOKEN);
    });

    it('should return correct asset svg', async () => {
      const image = await assetContract.getRawImage(tokenId);

      expect(image).to.equal(wrapLinkWithImg(data.assetHttpLink));
    });
  });

  describe('assetHttpLink', async () => {
    let tokenId: number;
    let data: AssetData;

    beforeEach(async () => {
      const assetId = (await assetHouseContract.totalAssetData()).toNumber();

      data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, 1);

      tokenId = (await assetContract.totalSupply()).toNumber();
      await assetContract.randomMint(deployer.address);
    });

    it('should be reverted if token does not exist', async () => {
      const nonExistentTokenId = await assetContract.totalSupply();
      await expect(assetContract.ownerOf(nonExistentTokenId)).to.be.reverted;
      await expect(
        assetContract.assetTitle(nonExistentTokenId)
      ).to.be.revertedWith(AssetError.NON_EXISTENT_TOKEN);
    });

    it('should return correct asset http link', async () => {
      const assetHttpLink = await assetContract.assetHttpLink(tokenId);

      expect(assetHttpLink).to.equal(data.assetHttpLink);
    });
  });

  describe('assetTitle', async () => {
    let tokenId: number;
    let assetId: number;
    beforeEach(async () => {
      assetId = (await assetHouseContract.totalAssetData()).toNumber();

      const data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, 1);

      tokenId = (await assetContract.totalSupply()).toNumber();
      await assetContract.randomMint(deployer.address);
    });

    it('should be reverted if token does not exist', async () => {
      const nonExistentTokenId = await assetContract.totalSupply();
      await expect(assetContract.ownerOf(nonExistentTokenId)).to.be.reverted;
      await expect(
        assetContract.assetTitle(nonExistentTokenId)
      ).to.be.revertedWith(AssetError.NON_EXISTENT_TOKEN);
    });

    it('should return correct asset title', async () => {
      const title = await assetContract.assetTitle(tokenId);

      expect(title).to.equal(testData(assetId).name);
    });
  });

  describe('assetCreator', async () => {
    let tokenId: number;
    let creator: string;

    beforeEach(async () => {
      const assetId = (await assetHouseContract.totalAssetData()).toNumber();

      const data = testData(assetId);
      creator = data.creator;
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, 1);

      tokenId = (await assetContract.totalSupply()).toNumber();
      await assetContract.randomMint(deployer.address);
    });

    it('should be reverted for non-existent token', async () => {
      await expect(assetContract.assetCreator(tokenId + 1)).to.be.revertedWith(
        AssetError.NON_EXISTENT_TOKEN
      );
    });

    it('should return proper creator address', async () => {
      const registeredCreator = await assetContract.assetCreator(tokenId);

      expect(registeredCreator).to.equal(creator);
    });
  });

  describe('tokenURI', async () => {
    let assetId: number;
    let tokenId: number;
    let data: AssetData;
    beforeEach(async () => {
      assetId = (await assetHouseContract.totalAssetData()).toNumber();

      data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, 1);

      tokenId = (await assetContract.totalSupply()).toNumber();
      await assetContract.randomMint(deployer.address);
    });

    it('should be reverted if token does not exist', async () => {
      const nonExistentTokenId = await assetContract.totalSupply();
      await expect(assetContract.ownerOf(nonExistentTokenId)).to.be.reverted;
      await expect(
        assetContract.tokenURI(nonExistentTokenId)
      ).to.be.revertedWith(AssetError.NON_EXISTENT_TOKEN);
    });

    it('should return correct metadata', async () => {
      const metadata = await assetContract.tokenURI(tokenId);

      const expectedContents = [
        `"name":"${configs.name} #${tokenId}"`,
        `"trait_type":"${configs.traitType}","value":"${data.name}"`,
        `"creator":"${data.creator.toLowerCase()}"`,
      ];
      expectedContents.forEach((content) => {
        expect(metadata.includes(content)).to.be.true;
      });
    });
  });

  describe('assetIdByIndex', async () => {
    it('should be reverted for non-existent index', async () => {
      const totalAssets = await assetContract.totalAssets();
      await expect(
        assetContract.assetIdByIndex(totalAssets.add(1))
      ).to.be.revertedWith(AssetError.NON_EXISTENT_INDEX);
    });
  });

  describe('assetIdByTokenId', async () => {
    it('should be reverted for non-existent tokenId', async () => {
      const nonExistentTokenId = await assetContract.totalSupply();
      await expect(
        assetContract.assetIdByTokenId(nonExistentTokenId)
      ).to.be.revertedWith(AssetError.NON_EXISTENT_TOKEN);
    });
  });

  describe('_isApprovedOrOwner', async () => {
    it('returns true for registered avatar', async () => {
      const tokenId = await assetContract.totalSupply();
      const assetId = (await assetHouseContract.totalAssetData()).toNumber();

      const data = testData(assetId);
      await assetHouseContract.createAssetData(
        data.assetHttpLink,
        data.name,
        data.creator,
        []
      );
      await assetContract.registerAsset(assetId, 1);
      await assetContract.randomMint(deployer.address);

      const nonOwner = accounts[6];
      const isApprovedOrOwnerBefore = await assetContract
        .connect(avatarContract)
        .isApprovedOrOwner(nonOwner.address, tokenId);
      expect(isApprovedOrOwnerBefore).to.be.true;
    });
  });
});
