import chai from 'chai';

import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  TestAvatar,
  TestAvatar__factory,
  TestAsset,
  TestAsset__factory,
  TestRandomBoxFor0,
  TestRandomBoxFor0__factory,
  AssetHouse,
  AssetHouse__factory,
  LayerHouse,
  LayerHouse__factory,
} from '../types';
import { solidity } from 'ethereum-waffle';
import { getChild, mintAvatar } from './module/unit';
import { AvatarError } from './module/errors';
import { wrapLinksWithSVG } from './module/image';

chai.use(solidity);
const { expect } = chai;

const configs = {
  maxSupply: 5,
};

const amountOfAssets = 10;
const assetHttpLink = (i: number) => `[SVG ${i}]`;
const name = (i: number) => `[NAME ${i}]`;

describe('Image', async () => {
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  let assetContracts: {
    contract: TestAsset;
    assetDataId: number;
  }[] = [];
  let randomBoxContract: TestRandomBoxFor0;
  let assetHouseContract: AssetHouse;
  let avatarContract: TestAvatar;
  let layerHouseContract: LayerHouse;

  let registeredLayerIndexList: Array<number> = [];
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

    const AvatarContract = new TestAvatar__factory(deployer);
    avatarContract = await AvatarContract.deploy(
      configs.maxSupply,
      layerHouseContract.address,
      assetHouseContract.address
    );

    assetContracts = [];
    for (let i = 0; i < amountOfAssets; i += 1) {
      const assetDataId = await assetHouseContract.totalAssetData();
      await assetHouseContract.createAssetData(
        assetHttpLink(i),
        name(i),
        deployer.address,
        []
      );

      const AssetContract = new TestAsset__factory(deployer);
      const assetContract = await AssetContract.deploy(
        `NAME ${i}`,
        `SYMBOL ${i}`,
        `TEST ${i}`,
        avatarContract.address,
        randomBoxContract.address,
        assetHouseContract.address,
        avatarContract.address
      );
      await assetContract.registerAsset(assetDataId, 10000);
      assetContracts.push({
        contract: assetContract,
        assetDataId: assetDataId.toNumber(),
      });

      await avatarContract.registerAssetContract(assetContract.address);

      await layerHouseContract.registerLayers([
        {
          asset: assetContract.address,
          hasDefault: false,
          assetId: 0,
        },
      ]);
    }

    registeredLayerIndexList = new Array(amountOfAssets)
      .fill(0)
      .map((_, i) => i + 1);
    await layerHouseContract.registerLayersToAddress(
      avatarContract.address,
      registeredLayerIndexList
    );
  });

  describe('Avatar: getImage', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;

    beforeEach(async () => {
      const operator = deployer;
      avatarOwner = accounts[1];
      const mintedAvatarId = await mintAvatar({
        contract: avatarContract,
        operator,
        owner: deployer,
        receiver: avatarOwner.address,
      });
      expect(mintedAvatarId).to.equal(avatarId);
    });

    it('should be reverted for non-existent avatar', async () => {
      const nonExistentAvatarId = await avatarContract.totalSupply();
      await expect(
        avatarContract.getImage(nonExistentAvatarId)
      ).to.be.revertedWith(AvatarError.NON_EXISTENT_AVATAR);
    });

    describe('should stack equipped layers with default layers', async () => {
      it('should show nothing if no default layers are registered in layerHouse', async () => {
        const image = await avatarContract.getImage(avatarId);
        expect(image).to.equal(wrapLinksWithSVG([]));
      });

      it('should show only default layers if nothing equipped', async () => {
        const assetDataId = Math.floor(Math.random() * amountOfAssets);
        const layerIndex =
          (await layerHouseContract.totalLayers()).toNumber() + 1;
        await layerHouseContract.registerLayers([
          {
            asset: ethers.constants.AddressZero,
            hasDefault: true,
            assetId: assetDataId,
          },
        ]);
        await layerHouseContract.resetLayersFromAddress(avatarContract.address);
        await layerHouseContract.registerLayersToAddress(
          avatarContract.address,
          [layerIndex]
        );

        const image = await avatarContract.getImage(avatarId);
        expect(image).to.equal(wrapLinksWithSVG([assetHttpLink(assetDataId)]));
      });

      it('should show equipped layers with default layers', async () => {
        const targetDefaultLayerAmount = Math.ceil(
          Math.random() * amountOfAssets
        );

        const defaultAssetIdList = [];
        const defaultLayerIndexList = [];
        for (let i = 0; i < targetDefaultLayerAmount; i += 1) {
          const assetDataId = Math.floor(Math.random() * amountOfAssets);
          const assetContractIndexWhichHasAssetData = assetDataId;
          const layerIndex =
            (await layerHouseContract.totalLayers()).toNumber() + 1;
          defaultLayerIndexList.push(layerIndex);
          await layerHouseContract.registerLayers([
            {
              asset:
                assetContracts[assetContractIndexWhichHasAssetData].contract
                  .address,
              hasDefault: true,
              assetId: assetDataId,
            },
          ]);
          defaultAssetIdList.push(assetDataId);
        }

        await layerHouseContract.resetLayersFromAddress(avatarContract.address);
        await layerHouseContract.registerLayersToAddress(
          avatarContract.address,
          [...defaultLayerIndexList, ...registeredLayerIndexList]
        );

        const targetEquipAmount = Math.ceil(Math.random() * amountOfAssets);

        let selectedContractIndexList: Array<number> = [];
        const selectedAssetDataIdList: Array<number> = [];
        for (let i = 0; i < targetEquipAmount; i += 1) {
          let targetIndex = Math.floor(Math.random() * amountOfAssets);
          while (selectedContractIndexList.includes(targetIndex)) {
            targetIndex = Math.floor(Math.random() * amountOfAssets);
          }
          selectedContractIndexList.push(targetIndex);

          const childContract = assetContracts[targetIndex].contract;
          selectedAssetDataIdList.push(assetContracts[targetIndex].assetDataId);

          const childTokenId = (await childContract.totalSupply()).toNumber();
          await childContract.randomMint(avatarOwner.address);

          await getChild({
            contract: avatarContract,
            avatarId,
            owner: avatarOwner,
            childTokenOwner: avatarOwner,
            childTokenId,
            childContract,
            childContractOwner: deployer,
          });
          await avatarContract
            .connect(avatarOwner)
            .equipAssets(avatarId, [
              { assetContract: childContract.address, tokenId: childTokenId },
            ]);
        }

        const image = await avatarContract.getImage(avatarId);
        expect(image).to.equal(
          wrapLinksWithSVG(
            [
              ...defaultAssetIdList,
              ...selectedAssetDataIdList.sort((a, b) => a - b),
            ].map((index) => assetHttpLink(index))
          )
        );
      });
    });
  });
});
