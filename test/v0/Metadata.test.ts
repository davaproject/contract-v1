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
} from '../../types';
import { solidity } from 'ethereum-waffle';
import { getChild, mintAvatar } from './module/unit';
import { AvatarError } from './module/errors';

chai.use(solidity);
const { expect } = chai;

const configs = {
  maxSupply: 5,
};

const amountOfAssets = 10;
const svg = (i: number) => `[SVG ${i}]`;
const name = (i: number) => `[NAME ${i}]`;
const trait = (i: number) => `[TRAIT_TYPE ${i}]`;

describe('Metadata', async () => {
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  let assetContracts: TestAsset[] = [];
  let randomBoxContract: TestRandomBoxFor0;
  let assetHouseContract: AssetHouse;
  let avatarContract: TestAvatar;
  let layerHouseContract: LayerHouse;

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
        svg(i),
        name(i),
        ethers.Wallet.createRandom().address,
        []
      );

      const AssetContract = new TestAsset__factory(deployer);
      const assetContract = await AssetContract.deploy(
        `NAME ${i}`,
        `SYMBOL ${i}`,
        trait(i),
        avatarContract.address,
        randomBoxContract.address,
        assetHouseContract.address,
        avatarContract.address
      );
      await assetContract.registerAsset(assetDataId, 10000);
      assetContracts.push(assetContract);

      await avatarContract.registerAssetContract(assetContract.address);

      await layerHouseContract.registerLayers([
        {
          asset: assetContract.address,
          hasDefault: false,
          assetId: 0,
        },
      ]);
    }
    await layerHouseContract.registerLayersToAddress(
      avatarContract.address,
      new Array(amountOfAssets).fill(0).map((_, i) => i + 1)
    );
  });

  describe('Avatar: metadata', async () => {
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
        avatarContract.tokenURI(nonExistentAvatarId)
      ).to.be.revertedWith(AvatarError.NON_EXISTENT_AVATAR);
    });

    it('should show default metadata if avatar does not equip anything', async () => {
      const metadata = await avatarContract.tokenURI(avatarId);

      expect((metadata.match(/trait_type/g) || []).length).to.equal(1);
    });

    it("should show proper 'avatarId' value", async () => {
      const metadata = await avatarContract.tokenURI(avatarId);

      const name = `"DAVA #${avatarId}"`;
      expect(metadata.includes(name)).to.be.true;
    });

    it('should show proper equipped metadata', async () => {
      const targetEquipAmount = Math.ceil(Math.random() * amountOfAssets);

      const traitsData: Array<string> = [];
      let selectedContractIndexList: Array<number> = [];
      for (let i = 0; i < targetEquipAmount; i += 1) {
        let targetIndex = Math.floor(Math.random() * amountOfAssets);
        while (selectedContractIndexList.includes(targetIndex)) {
          targetIndex = Math.floor(Math.random() * amountOfAssets);
        }
        selectedContractIndexList.push(targetIndex);

        const childContract = assetContracts[targetIndex];
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
        //@ts-ignore
        await avatarContract
          .connect(avatarOwner)
          ['equipAssets(uint256,(address,uint256)[])'](avatarId, [
            { assetContract: childContract.address, tokenId: childTokenId },
          ]);

        traitsData.push(
          `{"trait_type":"[TRAIT_TYPE ${targetIndex}]","value":"[NAME ${targetIndex}]"`
        );
      }

      const metadata = await avatarContract.tokenURI(avatarId);
      traitsData.forEach((trait) => {
        expect(metadata).to.include(trait);
      });
    });
  });
});
