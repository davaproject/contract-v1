import chai from 'chai';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BaseContract } from 'ethers';
import { solidity } from 'ethereum-waffle';

chai.use(solidity);
const { expect } = chai;

export const testOnlyOwner = async ({
  contract,
  method,
  args,
  owner,
  nonOwner,
}: {
  contract: BaseContract;
  method: string;
  args: any;
  owner: SignerWithAddress;
  nonOwner: SignerWithAddress;
}) => {
  expect(owner.address).not.to.equal(nonOwner.address);

  await expect(contract.connect(owner)[method](args)).not.to.be.reverted;

  await expect(contract.connect(nonOwner)[method](args)).to.be.revertedWith(
    'Ownable: caller is not the owner'
  );
};

export const testOnlyOperator = async ({
  contract,
  method,
  args,
  operator,
  nonOperator,
}: {
  contract: BaseContract;
  method: string;
  args: any;
  operator: SignerWithAddress;
  nonOperator: SignerWithAddress;
}) => {
  expect(operator.address).not.to.equal(nonOperator.address);

  await expect(contract.connect(operator)[method](args)).not.to.be.reverted;

  await expect(contract.connect(nonOperator)[method](args)).to.be.revertedWith(
    'Operable: caller is not the operator'
  );
};
