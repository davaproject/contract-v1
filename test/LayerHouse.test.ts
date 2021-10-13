import chai from 'chai';

import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  AssetHouse,
  AssetHouse__factory,
  LayerHouse,
  LayerHouse__factory,
} from '../types';
import { solidity } from 'ethereum-waffle';
import { checkBigNumberChange, checkChange } from './module/compare';
import { BigNumber } from '@ethersproject/bignumber';
import { OperableError, OwnableError, LayerHouseError } from './module/errors';

chai.use(solidity);
const { expect } = chai;

describe('LayerHouse', async () => {
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  let assetHouseContract: AssetHouse;
  let layerHouseContract: LayerHouse;

  beforeEach(async () => {
    [deployer, ...accounts] = await ethers.getSigners();

    const AssetHouseContract = new AssetHouse__factory(deployer);
    assetHouseContract = await AssetHouseContract.deploy();

    const LayerHouseContract = new LayerHouse__factory(deployer);
    layerHouseContract = await LayerHouseContract.deploy(
      assetHouseContract.address
    );
  });

  describe('setAssetHouse', async () => {
    it("should be reverted for non-owner's trial", async () => {
      const nonOwner = accounts[1];
      const owner = await layerHouseContract.owner();
      expect(owner).not.to.equal(nonOwner.address);

      await expect(
        layerHouseContract.connect(nonOwner).setAssetHouse(nonOwner.address)
      ).to.be.revertedWith(OwnableError.NON_OWNER);
    });

    it('should be reverted for zero address', async () => {
      await expect(
        layerHouseContract.setAssetHouse(ethers.constants.AddressZero)
      ).to.be.revertedWith(LayerHouseError.NON_EMPTY_ADDRESS);
    });

    it('should set AssetHouse contract', async () => {
      const newAssetHouse = ethers.Wallet.createRandom().address;
      await checkChange({
        status: () => layerHouseContract.assetHouse(),
        process: layerHouseContract.setAssetHouse(newAssetHouse),
        expectedBefore: assetHouseContract.address,
        expectedAfter: newAssetHouse,
      });
    });

    it("should emit 'SetAssetHouse' event", async () => {
      const newAssetHouse = ethers.Wallet.createRandom().address;

      await expect(layerHouseContract.setAssetHouse(newAssetHouse))
        .to.emit(layerHouseContract, 'SetAssetHouse')
        .withArgs(newAssetHouse);
    });
  });

  describe('registerLayers', async () => {
    it('should be reverted for empty asset address which does not have default', async () => {
      await expect(
        layerHouseContract.registerLayers([
          {
            asset: ethers.constants.AddressZero,
            hasDefault: false,
            assetId: 0,
          },
        ])
      ).to.be.revertedWith(LayerHouseError.NON_EMPTY_ADDRESS);
    });

    it('should not be reverted for empty asset address which does have default', async () => {
      await assetHouseContract.createAssetData(
        'SVG',
        'NAME',
        ethers.Wallet.createRandom().address,
        []
      );

      await expect(
        layerHouseContract.registerLayers([
          {
            asset: ethers.constants.AddressZero,
            hasDefault: true,
            assetId: 0,
          },
        ])
      ).not.to.be.reverted;
    });

    it('should be reverted if hasDefault is true but provided assetId does not exist', async () => {
      const notRegisteredAssetId = (
        await assetHouseContract.totalAssetData()
      ).toNumber();
      const exists = await assetHouseContract.exists(notRegisteredAssetId);
      expect(exists).to.be.false;

      await expect(
        layerHouseContract.registerLayers([
          {
            asset: ethers.Wallet.createRandom().address,
            hasDefault: true,
            assetId: notRegisteredAssetId,
          },
        ])
      ).to.be.revertedWith(LayerHouseError.NON_EXISTENT_ASSET);
    });

    it("should emit 'RegisterLayer' event", async () => {
      const expectedLayerIndex =
        (await layerHouseContract.totalLayers()).toNumber() + 1;

      const newAddress = ethers.Wallet.createRandom().address;
      await expect(
        layerHouseContract.registerLayers([
          {
            asset: newAddress,
            hasDefault: false,
            assetId: 0,
          },
        ])
      )
        .to.emit(layerHouseContract, 'RegisterLayer')
        .withArgs(newAddress, false, 0, expectedLayerIndex);
    });

    describe('should successfully register layer', async () => {
      it('with exists assetId', async () => {
        const assetId = await assetHouseContract.totalAssetData();
        await assetHouseContract.createAssetData(
          'SVG',
          'NAME',
          ethers.Wallet.createRandom().address,
          []
        );

        const exists = await assetHouseContract.exists(assetId);
        expect(exists).to.be.true;

        const expectedIndex =
          (await layerHouseContract.totalLayers()).toNumber() + 1;
        const newAddress = ethers.Wallet.createRandom().address;
        await checkChange({
          status: () => layerHouseContract.layerByIndex(expectedIndex),
          process: layerHouseContract.registerLayers([
            {
              asset: newAddress,
              hasDefault: true,
              assetId,
            },
          ]),
          expectedBefore: [
            ethers.constants.AddressZero,
            false,
            BigNumber.from(0),
          ],
          expectedAfter: [newAddress, true, assetId],
        });
      });

      it("increasing 'totalLayers'", async () => {
        await checkBigNumberChange({
          status: () => layerHouseContract.totalLayers(),
          process: layerHouseContract.registerLayers([
            {
              asset: ethers.Wallet.createRandom().address,
              hasDefault: false,
              assetId: 0,
            },
            {
              asset: ethers.Wallet.createRandom().address,
              hasDefault: false,
              assetId: 0,
            },
          ]),
          change: 2,
        });
      });
    });
  });

  describe('registerLayersToAddress', async () => {
    let layerIndexList: Array<number> = [];
    beforeEach(async () => {
      layerIndexList = [];
      for (let i = 0; i < 3; i += 1) {
        await layerHouseContract.registerLayers([
          {
            asset: ethers.Wallet.createRandom().address,
            hasDefault: false,
            assetId: 0,
          },
        ]);
        const layerIndex = (await layerHouseContract.totalLayers()).toNumber();
        layerIndexList.push(layerIndex);
      }
    });

    it("should be reverted for non-operator's request", async () => {
      const nonOperator = accounts[4];
      const isOperable = await layerHouseContract.isOperable(
        nonOperator.address
      );
      expect(isOperable).to.be.false;

      await expect(
        layerHouseContract
          .connect(nonOperator)
          .registerLayersToAddress(ethers.Wallet.createRandom().address, [0])
      ).to.be.revertedWith(OperableError.NON_OPERATOR);
    });

    it('should be reverted for non-existent layer', async () => {
      const nonExistentLayerIndex =
        (await layerHouseContract.totalLayers()).toNumber() + 1;
      const nonExistentLayer = await layerHouseContract.layerByIndex(
        nonExistentLayerIndex
      );
      expect(nonExistentLayer.asset).to.equal(ethers.constants.AddressZero);

      await expect(
        layerHouseContract.registerLayersToAddress(
          ethers.Wallet.createRandom().address,
          [0, nonExistentLayerIndex]
        )
      ).to.be.revertedWith(LayerHouseError.NON_EXISTENT_LAYER);
    });

    it("should emit 'RegisterLayersToAddress' event", async () => {
      const targetAddress = ethers.Wallet.createRandom().address;
      await expect(
        layerHouseContract.registerLayersToAddress(
          targetAddress,
          layerIndexList
        )
      )
        .to.emit(layerHouseContract, 'RegisterLayersToAddress')
        .withArgs(targetAddress, layerIndexList);
    });

    it('should be reverted if any layer is registered', async () => {
      const targetAddress = ethers.Wallet.createRandom().address;

      await expect(
        layerHouseContract.registerLayersToAddress(
          targetAddress,
          layerIndexList
        )
      ).not.to.be.reverted;

      await expect(
        layerHouseContract.registerLayersToAddress(
          targetAddress,
          layerIndexList
        )
      ).to.be.revertedWith(LayerHouseError.LAYER_ALREADY_REGISTERED);
    });

    describe('should register layers to address', async () => {
      it('updating layerIndexByAddressAndZIndex', async () => {
        const targetAddress = ethers.Wallet.createRandom().address;
        await layerHouseContract.registerLayersToAddress(
          targetAddress,
          layerIndexList
        );

        await Promise.all(
          layerIndexList.map(async (layerIndex, zIndex) => {
            const layerIndexResult =
              await layerHouseContract.layerIndexByAddressAndZIndex(
                targetAddress,
                zIndex
              );
            expect(layerIndexResult).to.equal(layerIndex);
          })
        );
      });

      it('updating layerAmountOf', async () => {
        const targetAddress = ethers.Wallet.createRandom().address;
        await checkBigNumberChange({
          status: () => layerHouseContract.layerAmountOf(targetAddress),
          process: layerHouseContract.registerLayersToAddress(
            targetAddress,
            layerIndexList
          ),
          change: layerIndexList.length,
        });
      });
    });
  });

  describe('resetLayersFromAddress', async () => {
    let layerIndexList: Array<number> = [];
    let layerZIndexList: Array<number> = [];
    let targetAddress: string;
    beforeEach(async () => {
      layerIndexList = [];
      for (let i = 0; i < 3; i += 1) {
        await layerHouseContract.registerLayers([
          {
            asset: ethers.Wallet.createRandom().address,
            hasDefault: false,
            assetId: 0,
          },
        ]);
        const layerIndex = (await layerHouseContract.totalLayers()).toNumber();
        layerIndexList.push(layerIndex);
      }

      targetAddress = ethers.Wallet.createRandom().address;
      await layerHouseContract.registerLayersToAddress(
        targetAddress,
        layerIndexList
      );
      layerZIndexList = layerIndexList.map((_, zIndex) => zIndex);
    });

    it("should be reverted for non-operator's request", async () => {
      const nonOperator = accounts[4];
      const isOperable = await layerHouseContract.isOperable(
        nonOperator.address
      );
      expect(isOperable).to.be.false;

      await expect(
        layerHouseContract
          .connect(nonOperator)
          .resetLayersFromAddress(targetAddress)
      ).to.be.revertedWith(OperableError.NON_OPERATOR);
    });

    it("should emit 'ResetLayersFromAddress' event", async () => {
      await expect(layerHouseContract.resetLayersFromAddress(targetAddress))
        .to.emit(layerHouseContract, 'ResetLayersFromAddress')
        .withArgs(targetAddress);
    });

    describe('should reset layers from address', async () => {
      it('updating layerIndexByAddressAndZIndex', async () => {
        await layerHouseContract.resetLayersFromAddress(targetAddress);

        await Promise.all(
          layerZIndexList.map(async (zIndex, i) => {
            const layerIndexResult =
              await layerHouseContract.layerIndexByAddressAndZIndex(
                targetAddress,
                zIndex
              );
            expect(layerIndexResult).to.equal(0);
          })
        );
      });

      it('updating layerAmountOf', async () => {
        await checkBigNumberChange({
          status: () => layerHouseContract.layerAmountOf(targetAddress),
          process: layerHouseContract.resetLayersFromAddress(targetAddress),
          change: -layerZIndexList.length,
        });
      });
    });
  });

  describe('layersOf', async () => {
    let assetList: Array<string> = [];
    let layerIndexList: Array<number> = [];
    let layerZIndexList: Array<number> = [];
    let targetAddress: string;
    beforeEach(async () => {
      assetList = [];
      layerIndexList = [];
      for (let i = 0; i < 3; i += 1) {
        const asset = ethers.Wallet.createRandom().address;
        assetList.push(asset);
        await layerHouseContract.registerLayers([
          {
            asset: asset,
            hasDefault: false,
            assetId: 0,
          },
        ]);
        const layerIndex = (await layerHouseContract.totalLayers()).toNumber();
        layerIndexList.push(layerIndex);
      }

      targetAddress = ethers.Wallet.createRandom().address;
      await layerHouseContract.registerLayersToAddress(
        targetAddress,
        layerIndexList
      );
      layerZIndexList = layerIndexList.map((_, zIndex) => zIndex);
    });

    it('should return empty array if layer is not registered', async () => {
      const newAddress = ethers.Wallet.createRandom().address;
      const registeredLayers = (
        await layerHouseContract.layerAmountOf(newAddress)
      ).toNumber();
      expect(registeredLayers).to.equal(0);

      const layers = await layerHouseContract.layersOf(newAddress);
      expect(layers).to.be.an('array').which.is.empty;
    });

    it('should return empty array if layer is reset', async () => {
      await layerHouseContract.resetLayersFromAddress(targetAddress);

      const layers = await layerHouseContract.layersOf(targetAddress);
      expect(layers).to.be.an('array').which.is.empty;
    });

    it('should return all layers', async () => {
      const layers = await layerHouseContract.layersOf(targetAddress);

      expect(layers.length).to.equal(layerIndexList.length);
      await Promise.all(
        layers.map(async (layer, i) => {
          expect(layer.asset).to.equal(assetList[i]);
          expect(layer.hasDefault).to.be.false;
          expect(layer.assetId).to.equal(BigNumber.from(0));
        })
      );
    });
  });
});
