import chai from 'chai';

import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  RandomBox,
  RandomBox__factory,
  TestRandomBox,
  TestRandomBox__factory,
} from '../../types';
import { solidity } from 'ethereum-waffle';
import { OperableError, RandomBoxError } from './module/errors';
import { checkChange } from './module/compare';

chai.use(solidity);
const { expect } = chai;

describe('RandomBox', () => {
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  let randomBoxContract: RandomBox;

  beforeEach(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const RandomBox = new RandomBox__factory(deployer);
    randomBoxContract = await RandomBox.deploy();
  });

  describe('constructor', async () => {
    it('should be initialized successfully', async () => {
      expect(await randomBoxContract.owner()).to.equal(deployer.address);
    });
  });

  describe('addOperators', async () => {
    it('should add operators successfully', async () => {
      const operators = [accounts[1].address, accounts[2].address];

      await checkChange({
        status: () =>
          Promise.all(
            operators.map((addr) => randomBoxContract.isOperable(addr))
          ),
        process: randomBoxContract.addOperators(operators),
        expectedBefore: [false, false],
        expectedAfter: [true, true],
      });
    });
  });

  describe('getRandomNumber', async () => {
    let testRandomBoxContract: TestRandomBox;
    const maxNumber = 10;

    beforeEach(async () => {
      const TestRandomBox = new TestRandomBox__factory(deployer);
      testRandomBoxContract = await TestRandomBox.deploy(
        randomBoxContract.address
      );

      await randomBoxContract.addOperator(testRandomBoxContract.address);
    });

    it("should be reverted for non-operator's trial", async () => {
      const nonOperator = accounts[1];
      const isOperable = await randomBoxContract.isOperable(
        nonOperator.address
      );
      expect(isOperable).to.be.false;

      await expect(
        randomBoxContract.connect(nonOperator).getRandomNumber(maxNumber)
      ).to.be.revertedWith(OperableError.NON_OPERATOR);
    });

    it('should be reverted if maxNumber is 0', async () => {
      await expect(testRandomBoxContract.getRandomNumber(0)).to.be.revertedWith(
        RandomBoxError.ONLY_POS_NUMBER
      );
    });

    it('should return different result on each request', async () => {
      const iteration = 100;
      let result: { [key: number]: boolean } = {};

      for (let i = 0; i < iteration; i += 1) {
        await testRandomBoxContract.getRandomNumber(maxNumber);
        const randomNum = (
          await testRandomBoxContract.randomNumber()
        ).toNumber();

        expect(randomNum).to.lt(maxNumber);
        result[randomNum] = true;
      }

      expect(Object.keys(result).length).to.equal(maxNumber);
    });
  });
});
