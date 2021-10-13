import chai from 'chai';

import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  TestAvatar,
  TestAvatar__factory,
  TestAsset__factory,
  TestRandomBoxFor0,
  TestRandomBoxFor0__factory,
  AssetHouse,
  AssetHouse__factory,
  TestAsset,
} from '../types';
import { solidity } from 'ethereum-waffle';
import { testOnlyOwner, testOnlyOperator } from './module/only';
import {
  getChild,
  mintAssetToken,
  mintAvatar,
  registerAssetContract,
} from './module/unit';
import { checkBigNumberChange, checkChange } from './module/compare';
import { bytes32FromNumber } from './module/utils';
import { AvatarError, ERC721Error } from './module/errors';

chai.use(solidity);
const { expect } = chai;

const configs = {
  maxSupply: 5,
};

describe('Avatar', async () => {
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  let assetContracts: TestAsset[] = [];
  let randomBoxContract: TestRandomBoxFor0;
  let assetHouseContract: AssetHouse;
  let avatarContract: TestAvatar;

  beforeEach(async () => {
    [deployer, ...accounts] = await ethers.getSigners();

    const RandomBoxContract = new TestRandomBoxFor0__factory(deployer);
    randomBoxContract = await RandomBoxContract.deploy();

    const AssetHouseContract = new AssetHouse__factory(deployer);
    assetHouseContract = await AssetHouseContract.deploy();

    const AvatarContract = new TestAvatar__factory(deployer);
    avatarContract = await AvatarContract.deploy(
      configs.maxSupply,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    );

    assetContracts = [];
    const amountOfAssets = 10;
    for (let i = 0; i < amountOfAssets; i += 1) {
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
      assetContracts.push(assetContract);
    }
  });

  describe('isRegisteredContract', async () => {
    it('should return false if contract is not registered', async () => {
      const nonRegisteredAddress = ethers.Wallet.createRandom().address;
      const exists = await avatarContract.isRegisteredContract(
        nonRegisteredAddress
      );

      expect(exists).to.be.false;
    });

    it('should return true if contract is registered', async () => {
      const newAddress = ethers.Wallet.createRandom().address;
      await avatarContract.registerAssetContract(newAddress);

      const exists = await avatarContract.isRegisteredContract(newAddress);
      expect(exists).to.be.true;
    });
  });

  describe('registerAssetContract', async () => {
    it('should be reverted for non-owners try', async () => {
      await testOnlyOwner({
        contract: avatarContract,
        method: 'registerAssetContract',
        args: assetContracts[0].address,
        owner: deployer,
        nonOwner: accounts[0],
      });
    });

    it('should be reverted if already registered', async () => {
      const targetContract = assetContracts[0].address;
      await avatarContract.registerAssetContract(targetContract);
      await expect(
        avatarContract.registerAssetContract(targetContract)
      ).to.be.revertedWith(AvatarError.ALREADY_REGISTERED_CONTRACT);
    });

    it("should emit 'RegisterAssetContract' event", async () => {
      const targetContract = assetContracts[0].address;

      await expect(avatarContract.registerAssetContract(targetContract))
        .to.emit(avatarContract, 'RegisterAssetContract')
        .withArgs(targetContract);
    });
  });

  describe('registerAssetContracts', async () => {
    it('should be reverted for non-owners try', async () => {
      await testOnlyOwner({
        contract: avatarContract,
        method: 'registerAssetContracts',
        args: [assetContracts[0].address],
        owner: deployer,
        nonOwner: accounts[0],
      });
    });

    it('should be reverted if already registered', async () => {
      const targetContract = assetContracts[0].address;
      await avatarContract.registerAssetContracts([targetContract]);
      await expect(
        avatarContract.registerAssetContracts([targetContract])
      ).to.be.revertedWith(AvatarError.ALREADY_REGISTERED_CONTRACT);
    });

    it('should register multiple assetContracts', async () => {
      const targetContracts = assetContracts.map(({ address }) => address);

      await avatarContract.registerAssetContracts(targetContracts);

      for (let i = 0; i < targetContracts.length; i++) {
        const registeredContract = await avatarContract.isRegisteredContract(
          targetContracts[i]
        );
        expect(registeredContract).to.be.true;
      }
    });
  });

  describe('mint', async () => {
    let operator: SignerWithAddress;
    beforeEach(async () => {
      operator = accounts[4];
      expect(operator.address).not.to.equal(deployer.address);

      await avatarContract.addOperator(operator.address);
    });

    it('should be reverted for non-operators try', async () => {
      await testOnlyOperator({
        contract: avatarContract,
        method: 'mint',
        args: assetContracts[0].address,
        operator,
        nonOperator: deployer,
      });
    });

    it('should be reverted if exceeds max supply', async () => {
      const maxSupply = (await avatarContract.MAX_SUPPLY()).toNumber();

      await new Array(maxSupply).fill(0).reduce((acc) => {
        return acc.then(() =>
          avatarContract.connect(operator).mint(deployer.address)
        );
      }, Promise.resolve());

      await expect(
        avatarContract.connect(operator).mint(deployer.address)
      ).to.be.revertedWith(AvatarError.EXCEEDS_MAX_SUPPLY);
    });

    it('should update totalSupply', async () => {
      const totalSupplyBefore = await avatarContract.totalSupply();
      await avatarContract.connect(operator).mint(deployer.address);

      const totalSupplyAfter = await avatarContract.totalSupply();
      expect(totalSupplyAfter).to.equal(totalSupplyBefore.add(1));
    });

    it('should mint properly', async () => {
      const expectedTokenId = await avatarContract.totalSupply();
      await expect(avatarContract.ownerOf(expectedTokenId)).to.be.reverted;

      const receiver = accounts[3].address;
      await avatarContract.connect(operator).mint(receiver);

      const ownerOfToken = await avatarContract.ownerOf(expectedTokenId);
      expect(ownerOfToken).to.equal(receiver);
    });
  });

  describe('ownerOfChild', async () => {
    const avatarId0 = 0;
    const avatarId1 = 1;
    let avatarOwner: string;
    let childContract: TestAsset;
    let childTokenId: number;
    let childTokenOwner: SignerWithAddress;
    beforeEach(async () => {
      const operator = deployer;
      avatarOwner = accounts[1].address;
      const mintedAvatarId0 = await mintAvatar({
        contract: avatarContract,
        operator,
        owner: deployer,
        receiver: avatarOwner,
      });
      expect(mintedAvatarId0).to.equal(avatarId0);

      const mintedAvatarId1 = await mintAvatar({
        contract: avatarContract,
        operator,
        owner: deployer,
        receiver: avatarOwner,
      });
      expect(mintedAvatarId1).to.equal(avatarId1);

      childContract = assetContracts[0];
      childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await registerAssetContract({
        contract: avatarContract,
        owner: deployer,
        assetContract: childContract.address,
      });
    });

    it('should be reverted for non existent child', async () => {
      const nonExistentChildToken = childTokenId + 1;
      await expect(childContract.ownerOf(nonExistentChildToken)).to.be.reverted;

      await expect(
        avatarContract.ownerOfChild(
          childContract.address,
          nonExistentChildToken
        )
      ).to.be.revertedWith(AvatarError.CHILD_TOKEN_NOT_OWNED_BY_AVATAR);
    });

    it('should be reverted for non received child', async () => {
      await expect(
        avatarContract.ownerOfChild(childContract.address, childTokenId)
      ).to.be.revertedWith(AvatarError.CHILD_TOKEN_NOT_OWNED_BY_AVATAR);
    });

    it('should return avatar owner and id if avatarId is 0', async () => {
      await getChild({
        contract: avatarContract,
        avatarId: avatarId0,
        owner: deployer,
        childTokenOwner: childTokenOwner,
        childTokenId,
        childContract: childContract,
        childContractOwner: deployer,
      });

      const [ownerOfChild, avatarId] = await avatarContract.ownerOfChild(
        childContract.address,
        childTokenId
      );
      expect(ownerOfChild).to.equal(avatarOwner);
      expect(avatarId).to.equal(avatarId0);
    });

    it('should return avatar owner and id if avatarId is not 0', async () => {
      await getChild({
        contract: avatarContract,
        avatarId: avatarId1,
        owner: deployer,
        childTokenOwner: childTokenOwner,
        childTokenId,
        childContract: childContract,
        childContractOwner: deployer,
      });

      const [ownerOfChild, avatarId] = await avatarContract.ownerOfChild(
        childContract.address,
        childTokenId
      );
      expect(ownerOfChild).to.equal(avatarOwner);
      expect(avatarId).to.equal(avatarId1);
    });
  });

  describe('rootOwnerOfChild', async () => {
    const avatarId = 0;
    let avatarOwner: string;
    let childContract: TestAsset;
    let childTokenId: number;
    let childTokenOwner: SignerWithAddress;
    beforeEach(async () => {
      const operator = deployer;
      avatarOwner = accounts[1].address;
      const mintedAvatarId = await mintAvatar({
        contract: avatarContract,
        operator,
        owner: deployer,
        receiver: avatarOwner,
      });
      expect(mintedAvatarId).to.equal(avatarId);

      childContract = assetContracts[0];
      childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await getChild({
        contract: avatarContract,
        avatarId: avatarId,
        owner: deployer,
        childTokenOwner: childTokenOwner,
        childTokenId,
        childContract: childContract,
        childContractOwner: deployer,
      });
    });

    it('should return owner of avatar token for zero address child token', async () => {
      const rootOwner = await avatarContract.rootOwnerOfChild(
        ethers.constants.AddressZero,
        avatarId
      );
      expect(rootOwner).to.equal(avatarOwner);
    });

    it('should return root owner of baseAsset', async () => {
      const rootOwner = await avatarContract.rootOwnerOfChild(
        childContract.address,
        childTokenId
      );

      expect(rootOwner).to.equal(avatarOwner);
    });
  });

  describe('_removeChild', async () => {
    const avatarId = 0;
    let avatarOwner: string;
    let childContract: TestAsset;
    let childTokenId: number;
    let nonReceivedChildTokenId: number;
    let childTokenOwner: SignerWithAddress;
    beforeEach(async () => {
      const operator = deployer;
      avatarOwner = accounts[1].address;
      const mintedAvatarId = await mintAvatar({
        contract: avatarContract,
        operator,
        owner: deployer,
        receiver: avatarOwner,
      });
      expect(mintedAvatarId).to.equal(avatarId);

      childContract = assetContracts[0];
      childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      nonReceivedChildTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await getChild({
        contract: avatarContract,
        avatarId: avatarId,
        owner: deployer,
        childTokenOwner: childTokenOwner,
        childTokenId,
        childContract: childContract,
        childContractOwner: deployer,
      });
    });

    it('should be reverted if avatar does not exist', async () => {
      const nonExistentAvatar = await avatarContract.totalSupply();

      await expect(
        avatarContract.removeChild(
          nonExistentAvatar,
          childContract.address,
          childTokenId
        )
      ).to.be.revertedWith(AvatarError.CHILD_TOKEN_NOT_OWNED_BY_AVATAR);
    });

    it('should be reverted if childContract does not exist', async () => {
      const newAddress = ethers.Wallet.createRandom().address;

      await expect(
        avatarContract.removeChild(avatarId, newAddress, childTokenId)
      ).to.be.revertedWith(AvatarError.CHILD_TOKEN_NOT_OWNED_BY_AVATAR);
    });

    it('should be reverted if childToken does not exist', async () => {
      const nonExistentChildToken = await childContract.totalSupply();

      await expect(
        avatarContract.removeChild(
          avatarId,
          childContract.address,
          nonExistentChildToken
        )
      ).to.be.revertedWith(AvatarError.CHILD_TOKEN_NOT_OWNED_BY_AVATAR);
    });

    it('should be reverted if avatar does not hold the child token', async () => {
      await expect(
        avatarContract.removeChild(
          avatarId,
          childContract.address,
          nonReceivedChildTokenId
        )
      ).to.be.revertedWith(AvatarError.CHILD_TOKEN_NOT_OWNED_BY_AVATAR);
    });

    it('should change totalChildTokens', async () => {
      await checkBigNumberChange({
        status: () =>
          avatarContract.totalChildTokens(avatarId, childContract.address),
        process: avatarContract.removeChild(
          avatarId,
          childContract.address,
          childTokenId
        ),
        change: -1,
      });
    });

    it('should change totalChildContracts', async () => {
      await checkBigNumberChange({
        status: () => avatarContract.totalChildContracts(avatarId),
        process: avatarContract.removeChild(
          avatarId,
          childContract.address,
          childTokenId
        ),
        change: -1,
      });
    });

    it('should change ownerOfChild', async () => {
      await expect(
        avatarContract.ownerOfChild(childContract.address, childTokenId)
      ).not.to.be.reverted;

      await avatarContract.removeChild(
        avatarId,
        childContract.address,
        childTokenId
      );

      await expect(
        avatarContract.ownerOfChild(childContract.address, childTokenId)
      ).to.be.reverted;
    });
  });

  describe('_checkTransferChild', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;
    let childContract: TestAsset;
    let childTokenId: number;
    let childTokenOwner: SignerWithAddress;
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

      childContract = assetContracts[0];
      childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await getChild({
        contract: avatarContract,
        avatarId: avatarId,
        owner: deployer,
        childTokenOwner: childTokenOwner,
        childTokenId,
        childContract: childContract,
        childContractOwner: deployer,
      });
    });

    it('should be reverted if avatar does not hold the child token', async () => {
      await expect(
        avatarContract.checkTransferChild(
          avatarId + 1,
          ethers.Wallet.createRandom().address,
          childContract.address,
          childTokenId
        )
      ).to.be.revertedWith(AvatarError.CHILD_TOKEN_NOT_OWNED_BY_AVATAR);
    });

    it('should be reverted if receiver address is zero', async () => {
      await expect(
        avatarContract.checkTransferChild(
          avatarId,
          ethers.constants.AddressZero,
          childContract.address,
          childTokenId
        )
      ).to.be.revertedWith(AvatarError.NO_EMPTY_RECEIVER);
    });

    it('should be reverted if avatar does not exist', async () => {
      const totalSupply = await avatarContract.totalSupply();

      await expect(
        avatarContract.checkTransferChild(
          totalSupply,
          ethers.Wallet.createRandom().address,
          childContract.address,
          childTokenId
        )
      ).to.be.revertedWith(AvatarError.CHILD_TOKEN_NOT_OWNED_BY_AVATAR);
    });
  });

  describe('safeTransferChild', async () => {
    const avatarId = 0;
    let anotherAvatarId: number;
    let avatarOwner: SignerWithAddress;
    let childContract: TestAsset;
    let childTokenId: number;
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

      anotherAvatarId = await mintAvatar({
        contract: avatarContract,
        operator,
        owner: deployer,
        receiver: avatarOwner.address,
      });

      childContract = assetContracts[0];
      const childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await getChild({
        contract: avatarContract,
        avatarId: avatarId,
        owner: deployer,
        childTokenOwner: childTokenOwner,
        childTokenId,
        childContract: childContract,
        childContractOwner: deployer,
      });
    });

    it('should be reverted if msg.sender is neither owner not approved', async () => {
      const attacker = accounts[3];
      expect(attacker.address).not.equal(avatarOwner.address);

      const approvedAddress = await avatarContract.getApproved(avatarId);
      expect(approvedAddress).not.to.equal(attacker.address);

      const approvedForAll = await avatarContract.isApprovedForAll(
        avatarOwner.address,
        attacker.address
      );
      expect(approvedForAll).to.be.false;

      await expect(
        avatarContract
          .connect(attacker)
          ['safeTransferChild(uint256,address,address,uint256)'](
            avatarId,
            ethers.Wallet.createRandom().address,
            childContract.address,
            childTokenId
          )
      ).to.be.revertedWith(AvatarError.NOT_AUTHORIZED);
    });

    it('should pass with tokenOwners request', async () => {
      await expect(
        avatarContract
          .connect(avatarOwner)
          ['safeTransferChild(uint256,address,address,uint256)'](
            avatarId,
            ethers.Wallet.createRandom().address,
            childContract.address,
            childTokenId
          )
      ).not.to.be.reverted;
    });

    it("should pass with approved user's request", async () => {
      const approvedUser = accounts[4];
      expect(approvedUser.address).not.to.equal(avatarOwner.address);
      await avatarContract
        .connect(avatarOwner)
        .approve(approvedUser.address, avatarId);

      await expect(
        avatarContract
          .connect(approvedUser)
          ['safeTransferChild(uint256,address,address,uint256)'](
            avatarId,
            ethers.Wallet.createRandom().address,
            childContract.address,
            childTokenId
          )
      ).not.to.be.reverted;
    });

    it("should pass with approvedForAll user's request", async () => {
      const approvedUser = accounts[4];
      expect(approvedUser.address).not.to.equal(avatarOwner.address);
      await avatarContract
        .connect(avatarOwner)
        .setApprovalForAll(approvedUser.address, true);

      await expect(
        avatarContract
          .connect(approvedUser)
          ['safeTransferChild(uint256,address,address,uint256)'](
            avatarId,
            ethers.Wallet.createRandom().address,
            childContract.address,
            childTokenId
          )
      ).not.to.be.reverted;
    });

    it('should be reverted if receiver is avatarContract without avatarId data', async () => {
      await expect(
        avatarContract
          .connect(avatarOwner)
          ['safeTransferChild(uint256,address,address,uint256)'](
            avatarId,
            avatarContract.address,
            childContract.address,
            childTokenId
          )
      ).to.be.revertedWith(AvatarError.NO_EMPTY_DATA);
    });

    it('should send child token successfully', async () => {
      const receiver = accounts[5].address;

      await checkChange({
        status: () => childContract.ownerOf(childTokenId),
        process: avatarContract
          .connect(avatarOwner)
          ['safeTransferChild(uint256,address,address,uint256)'](
            avatarId,
            receiver,
            childContract.address,
            childTokenId
          ),
        expectedBefore: avatarContract.address,
        expectedAfter: receiver,
      });
    });

    it('should remove child token successfully', async () => {
      await checkBigNumberChange({
        status: () =>
          avatarContract.totalChildTokens(avatarId, childContract.address),
        process: avatarContract
          .connect(avatarOwner)
          ['safeTransferChild(uint256,address,address,uint256)'](
            avatarId,
            ethers.Wallet.createRandom().address,
            childContract.address,
            childTokenId
          ),
        change: -1,
      });
    });

    it("should emit 'TransferChild' event", async () => {
      const receiver = ethers.Wallet.createRandom().address;
      await expect(
        avatarContract
          .connect(avatarOwner)
          ['safeTransferChild(uint256,address,address,uint256)'](
            avatarId,
            receiver,
            childContract.address,
            childTokenId
          )
      )
        .to.emit(avatarContract, 'TransferChild')
        .withArgs(avatarId, receiver, childContract.address, childTokenId);
    });

    it('should make receiver get token as a child with data', async () => {
      const data = bytes32FromNumber(anotherAvatarId);

      await checkChange({
        status: () =>
          avatarContract.ownerOfChild(childContract.address, childTokenId),
        process: avatarContract
          .connect(avatarOwner)
          ['safeTransferChild(uint256,address,address,uint256,bytes)'](
            avatarId,
            avatarContract.address,
            childContract.address,
            childTokenId,
            data
          ),
        expectedBefore: [avatarOwner.address, ethers.BigNumber.from(avatarId)],
        expectedAfter: [
          avatarOwner.address,
          ethers.BigNumber.from(anotherAvatarId),
        ],
      });
    });

    it("should emit 'ReceiveChild' event if receiver is the avatar", async () => {
      const data = ethers.utils.hexZeroPad(
        ethers.utils.hexValue(anotherAvatarId),
        32
      );

      await expect(
        avatarContract
          .connect(avatarOwner)
          ['safeTransferChild(uint256,address,address,uint256,bytes)'](
            avatarId,
            avatarContract.address,
            childContract.address,
            childTokenId,
            data
          )
      )
        .to.emit(avatarContract, 'ReceiveChild')
        .withArgs(
          avatarContract.address,
          anotherAvatarId,
          childContract.address,
          childTokenId
        );
    });
  });

  describe('transferChild', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;
    let childContract: TestAsset;
    let childTokenId: number;
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

      childContract = assetContracts[0];
      const childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await getChild({
        contract: avatarContract,
        avatarId: avatarId,
        owner: deployer,
        childTokenOwner: childTokenOwner,
        childTokenId,
        childContract: childContract,
        childContractOwner: deployer,
      });
    });

    it('should send child token properly', async () => {
      await checkBigNumberChange({
        status: () =>
          avatarContract.totalChildTokens(avatarId, childContract.address),
        process: avatarContract
          .connect(avatarOwner)
          .transferChild(
            avatarId,
            ethers.Wallet.createRandom().address,
            childContract.address,
            childTokenId
          ),
        change: -1,
      });
    });
  });

  describe('_receiveChild', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;
    let childContract: TestAsset;
    let childTokenId: number;
    let childTokenOwner: SignerWithAddress;
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

      childContract = assetContracts[0];
      childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await avatarContract.registerAssetContract(childContract.address);
    });

    it('should be reverted for non-existent avatar', async () => {
      const nonExistentAvatar = await avatarContract.totalSupply();
      await expect(
        avatarContract.receiveChild(
          childTokenOwner.address,
          nonExistentAvatar,
          childContract.address,
          childTokenId
        )
      ).to.be.revertedWith(AvatarError.NON_EXISTENT_AVATAR);
    });

    it('should be reverted if avatar already hold the token', async () => {
      await getChild({
        contract: avatarContract,
        avatarId,
        owner: deployer,
        childTokenOwner,
        childTokenId,
        childContract,
        childContractOwner: deployer,
      });

      await expect(
        avatarContract.receiveChild(
          childTokenOwner.address,
          avatarId,
          childContract.address,
          childTokenId
        )
      ).to.be.revertedWith(AvatarError.ALREADY_RECEIVED_CHILD_TOKEN);
    });

    describe('should change status successfully', async () => {
      it('childContracts', async () => {
        await checkBigNumberChange({
          status: () => avatarContract.totalChildContracts(avatarId),
          process: avatarContract.receiveChild(
            childTokenOwner.address,
            avatarId,
            childContract.address,
            childTokenId
          ),
          change: 1,
        });
      });

      it('childTokens', async () => {
        await checkBigNumberChange({
          status: () =>
            avatarContract.totalChildTokens(avatarId, childContract.address),
          process: avatarContract.receiveChild(
            childTokenOwner.address,
            avatarId,
            childContract.address,
            childTokenId
          ),
          change: 1,
        });
      });

      it('childTokenOwner', async () => {
        await expect(
          avatarContract.ownerOfChild(childContract.address, childTokenId)
        ).to.be.reverted;

        await avatarContract.receiveChild(
          childTokenOwner.address,
          avatarId,
          childContract.address,
          childTokenId
        );

        await expect(
          avatarContract.ownerOfChild(childContract.address, childTokenId)
        ).not.to.be.reverted;
      });
    });

    it("should emit 'ReceiveChild' event", async () => {
      await expect(
        avatarContract.receiveChild(
          childTokenOwner.address,
          avatarId,
          childContract.address,
          childTokenId
        )
      )
        .to.emit(avatarContract, 'ReceiveChild')
        .withArgs(
          childTokenOwner.address,
          avatarId,
          childContract.address,
          childTokenId
        );
    });
  });

  describe('getChild', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;
    let childContract: TestAsset;
    let childTokenId: number;
    let childTokenOwner: SignerWithAddress;
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

      childContract = assetContracts[0];
      childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await avatarContract.registerAssetContract(childContract.address);
    });

    it('should be reverted if msg.sender is neither the transferring subject nor getting approved', async () => {
      const attacker = accounts[6];
      const isApprovedForAll = await childContract.isApprovedForAll(
        childTokenOwner.address,
        attacker.address
      );
      expect(isApprovedForAll).to.be.false;

      const approvedAccount = await childContract.getApproved(childTokenId);
      expect(approvedAccount).not.to.equal(attacker.address);

      await expect(
        avatarContract
          .connect(attacker)
          .getChild(
            childTokenOwner.address,
            avatarId,
            childContract.address,
            childTokenId
          )
      ).to.be.revertedWith(AvatarError.NEITHER_OWNER_NOR_OPERATOR);
    });

    describe('should not be reverted', async () => {
      it('if msg.sender is the transferring subject', async () => {
        await expect(
          avatarContract
            .connect(childTokenOwner)
            .getChild(
              childTokenOwner.address,
              avatarId,
              childContract.address,
              childTokenId
            )
        ).not.to.be.reverted;
      });

      it('if msg.sender is approvedForAll', async () => {
        const operator = accounts[6];
        await childContract
          .connect(childTokenOwner)
          .setApprovalForAll(operator.address, true);

        const isApprovedForAll = await childContract.isApprovedForAll(
          childTokenOwner.address,
          operator.address
        );
        expect(isApprovedForAll).to.be.true;

        await expect(
          avatarContract
            .connect(operator)
            .getChild(
              childTokenOwner.address,
              avatarId,
              childContract.address,
              childTokenId
            )
        ).not.to.be.reverted;
      });

      it('if msg.sender is approvedUser', async () => {
        const operator = accounts[6];
        await childContract
          .connect(childTokenOwner)
          .approve(operator.address, childTokenId);

        const approvedUser = await childContract.getApproved(childTokenId);
        expect(approvedUser).to.equal(operator.address);

        await expect(
          avatarContract
            .connect(operator)
            .getChild(
              childTokenOwner.address,
              avatarId,
              childContract.address,
              childTokenId
            )
        ).not.to.be.reverted;
      });
    });

    it('should transfer token successfully', async () => {
      await checkChange({
        status: () => childContract.ownerOf(childTokenId),
        process: avatarContract
          .connect(childTokenOwner)
          .getChild(
            childTokenOwner.address,
            avatarId,
            childContract.address,
            childTokenId
          ),
        expectedBefore: childTokenOwner.address,
        expectedAfter: avatarContract.address,
      });
    });

    it("should emit 'GetChild' event", async () => {
      await expect(
        avatarContract
          .connect(childTokenOwner)
          .getChild(
            childTokenOwner.address,
            avatarId,
            childContract.address,
            childTokenId
          )
      )
        .to.emit(avatarContract, 'GetChild')
        .withArgs(
          childTokenOwner.address,
          avatarId,
          childContract.address,
          childTokenId
        );
    });
  });

  describe('onERC721Received', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;
    let childContract: TestAsset;
    let childTokenId: number;
    let childTokenOwner: SignerWithAddress;
    let registeredAccount: SignerWithAddress;
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

      childContract = assetContracts[0];
      childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await avatarContract.registerAssetContract(childContract.address);

      registeredAccount = accounts[5];
      await avatarContract.registerAssetContract(registeredAccount.address);
    });

    it('should be reverted if data is empty', async () => {
      await expect(
        avatarContract
          .connect(registeredAccount)
          .onERC721Received(
            deployer.address,
            deployer.address,
            childTokenId,
            '0x'
          )
      ).to.be.revertedWith(AvatarError.NO_EMPTY_DATA);
    });
  });

  describe('setLayerHouse', async () => {
    it('should be reverted with non-owners try', async () => {
      testOnlyOwner({
        contract: avatarContract,
        method: 'setLayerHouse',
        args: ethers.Wallet.createRandom().address,
        owner: deployer,
        nonOwner: accounts[4],
      });
    });

    it('should set layerHouse', async () => {
      const newLayerHouse = ethers.Wallet.createRandom().address;
      await checkChange({
        status: () => avatarContract.layerHouse(),
        process: avatarContract.setLayerHouse(newLayerHouse),
        expectedBefore: ethers.constants.AddressZero,
        expectedAfter: newLayerHouse,
      });
    });

    it("should emit 'SetLayerHouse' event", async () => {
      const newLayerHouse = ethers.Wallet.createRandom().address;
      await expect(avatarContract.setLayerHouse(newLayerHouse))
        .to.emit(avatarContract, 'SetLayerHouse')
        .withArgs(newLayerHouse);
    });
  });

  describe('setAssetHouse', async () => {
    it('should be reverted with non-owners try', async () => {
      testOnlyOwner({
        contract: avatarContract,
        method: 'setAssetHouse',
        args: ethers.Wallet.createRandom().address,
        owner: deployer,
        nonOwner: accounts[4],
      });
    });

    it('should set setAssetHouse', async () => {
      const newAssetHouse = ethers.Wallet.createRandom().address;
      await checkChange({
        status: () => avatarContract.assetHouse(),
        process: avatarContract.setAssetHouse(newAssetHouse),
        expectedBefore: ethers.constants.AddressZero,
        expectedAfter: newAssetHouse,
      });
    });

    it("should emit 'SetAssetHouse' event", async () => {
      const newAssetHouse = ethers.Wallet.createRandom().address;
      await expect(avatarContract.setAssetHouse(newAssetHouse))
        .to.emit(avatarContract, 'SetAssetHouse')
        .withArgs(newAssetHouse);
    });
  });

  describe('equipAssets & unEquipAssets', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;
    let childContracts: TestAsset[] = [];
    let childTokenIds: number[] = [];
    let childTokenOwner: SignerWithAddress;
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

      childContracts = [assetContracts[0], assetContracts[1]];
      childTokenOwner = accounts[2];
      childTokenIds[0] = await mintAssetToken({
        contract: childContracts[0],
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });
      childTokenIds[1] = await mintAssetToken({
        contract: childContracts[1],
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await getChild({
        contract: avatarContract,
        avatarId,
        owner: deployer,
        childTokenOwner,
        childTokenId: childTokenIds[0],
        childContract: childContracts[0],
        childContractOwner: deployer,
      });
      await getChild({
        contract: avatarContract,
        avatarId,
        owner: deployer,
        childTokenOwner,
        childTokenId: childTokenIds[1],
        childContract: childContracts[1],
        childContractOwner: deployer,
      });
    });

    describe('equipAssets', async () => {
      it('should equip multiple assets at once', async () => {
        await checkChange({
          status: async () => {
            const equipped: boolean[] = [];
            equipped[0] = await avatarContract.equipped(
              avatarId,
              childContracts[0].address
            );
            equipped[1] = await avatarContract.equipped(
              avatarId,
              childContracts[1].address
            );

            return equipped;
          },
          process: avatarContract.connect(avatarOwner).equipAssets(avatarId, [
            {
              assetContract: childContracts[0].address,
              tokenId: childTokenIds[0],
            },
            {
              assetContract: childContracts[1].address,
              tokenId: childTokenIds[1],
            },
          ]),
          expectedBefore: [false, false],
          expectedAfter: [true, true],
        });
      });
    });

    describe('unEquipAssets', async () => {
      beforeEach(async () => {
        await avatarContract.connect(avatarOwner).equipAssets(avatarId, [
          {
            assetContract: childContracts[0].address,
            tokenId: childTokenIds[0],
          },
          {
            assetContract: childContracts[1].address,
            tokenId: childTokenIds[1],
          },
        ]);
      });

      it('should unEquip multiple assets at once', async () => {
        await checkChange({
          status: async () => {
            const equipped: boolean[] = [];
            equipped[0] = await avatarContract.equipped(
              avatarId,
              childContracts[0].address
            );
            equipped[1] = await avatarContract.equipped(
              avatarId,
              childContracts[1].address
            );

            return equipped;
          },
          process: avatarContract
            .connect(avatarOwner)
            ['unEquipAssets(uint256,address[])'](avatarId, [
              childContracts[0].address,
              childContracts[1].address,
            ]),
          expectedBefore: [true, true],
          expectedAfter: [false, false],
        });
      });
    });
  });

  describe('equipAsset', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;
    let childContract: TestAsset;
    let childTokenId: number;
    let childTokenOwner: SignerWithAddress;
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

      childContract = assetContracts[0];
      childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await getChild({
        contract: avatarContract,
        avatarId,
        owner: deployer,
        childTokenOwner,
        childTokenId,
        childContract,
        childContractOwner: deployer,
      });
    });

    it('should be reverted if msg.sender is not authorized', async () => {
      const notAuthorizedUser = accounts[6];
      expect(notAuthorizedUser.address).not.to.equal(avatarOwner.address);

      const isApprovedForAll = await avatarContract.isApprovedForAll(
        avatarOwner.address,
        notAuthorizedUser.address
      );
      expect(isApprovedForAll).to.be.false;

      const approvedUser = await avatarContract.getApproved(avatarId);
      expect(approvedUser).not.to.equal(notAuthorizedUser.address);

      await expect(
        avatarContract
          .connect(notAuthorizedUser)
          .equipAssets(avatarId, [
            { assetContract: childContract.address, tokenId: childTokenId },
          ])
      ).to.be.revertedWith(AvatarError.NOT_AUTHORIZED);
    });

    it('should be reverted if avatar does not hold the child token', async () => {
      const newToken = await childContract.totalSupply();

      await expect(
        avatarContract
          .connect(avatarOwner)
          .equipAssets(avatarId, [
            { assetContract: childContract.address, tokenId: newToken },
          ])
      ).to.be.revertedWith(ERC721Error.NON_EXISTENT_TOKEN);
    });

    describe('should equip asset successfully', async () => {
      it('and update equipped status', async () => {
        await checkChange({
          status: () =>
            avatarContract.equipped(avatarId, childContract.address),
          process: avatarContract
            .connect(avatarOwner)
            .equipAssets(avatarId, [
              { assetContract: childContract.address, tokenId: childTokenId },
            ]),
          expectedBefore: false,
          expectedAfter: true,
        });
      });

      it('and update equippedAsset status', async () => {
        await checkBigNumberChange({
          status: () =>
            avatarContract.equippedAsset(avatarId, childContract.address),
          process: avatarContract
            .connect(avatarOwner)
            .equipAssets(avatarId, [
              { assetContract: childContract.address, tokenId: childTokenId },
            ]),
          change: childTokenId,
        });
      });
    });

    it("should emit 'EquipAsset' event", async () => {
      await expect(
        avatarContract
          .connect(avatarOwner)
          .equipAssets(avatarId, [
            { assetContract: childContract.address, tokenId: childTokenId },
          ])
      )
        .to.emit(avatarContract, 'EquipAsset')
        .withArgs(avatarId, childContract.address, childTokenId);
    });
  });

  describe('unEquipAsset', async () => {
    const avatarId = 0;
    let avatarOwner: SignerWithAddress;
    let childContract: TestAsset;
    let childTokenId: number;
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

      childContract = assetContracts[0];
      const childTokenOwner = accounts[2];
      childTokenId = await mintAssetToken({
        contract: childContract,
        assetHouseContract: assetHouseContract,
        operator,
        owner: deployer,
        receiver: childTokenOwner.address,
      });

      await getChild({
        contract: avatarContract,
        avatarId,
        owner: deployer,
        childTokenOwner,
        childTokenId,
        childContract,
        childContractOwner: deployer,
      });

      await avatarContract
        .connect(avatarOwner)
        .equipAssets(avatarId, [
          { assetContract: childContract.address, tokenId: childTokenId },
        ]);
    });

    it('should be reverted if msg.sender is not authorized', async () => {
      const notAuthorizedUser = accounts[6];
      expect(notAuthorizedUser.address).not.to.equal(avatarOwner.address);

      const isApprovedForAll = await avatarContract.isApprovedForAll(
        avatarOwner.address,
        notAuthorizedUser.address
      );
      expect(isApprovedForAll).to.be.false;

      const approvedUser = await avatarContract.getApproved(avatarId);
      expect(approvedUser).not.to.equal(notAuthorizedUser.address);

      await expect(
        avatarContract
          .connect(notAuthorizedUser)
          ['unEquipAssets(uint256,address[])'](avatarId, [
            childContract.address,
          ])
      ).to.be.revertedWith(AvatarError.NOT_AUTHORIZED);
    });

    it('should change nothing if avatar does not equip the child token', async () => {
      const newAsset = ethers.Wallet.createRandom().address;

      await expect(
        avatarContract
          .connect(avatarOwner)
          ['unEquipAssets(uint256,address[])'](avatarId, [newAsset])
      ).not.to.emit(avatarContract, 'UnEquipAsset');
    });

    describe('should unequip asset successfully', async () => {
      it('and update equipped status', async () => {
        await checkChange({
          status: () =>
            avatarContract.equipped(avatarId, childContract.address),
          process: avatarContract
            .connect(avatarOwner)
            ['unEquipAssets(uint256,address[])'](avatarId, [
              childContract.address,
            ]),
          expectedBefore: true,
          expectedAfter: false,
        });
      });

      it('and update equippedAsset status', async () => {
        await checkBigNumberChange({
          status: () =>
            avatarContract.equippedAsset(avatarId, childContract.address),
          process: avatarContract
            .connect(avatarOwner)
            ['unEquipAssets(uint256,address[])'](avatarId, [
              childContract.address,
            ]),
          change: -childTokenId,
        });
      });
    });

    it("should emit 'UnEquipAsset' event", async () => {
      await expect(
        avatarContract
          .connect(avatarOwner)
          ['unEquipAssets(uint256,address[])'](avatarId, [
            childContract.address,
          ])
      )
        .to.emit(avatarContract, 'UnEquipAsset')
        .withArgs(avatarId, childContract.address, childTokenId);
    });
  });
});
