import chai from 'chai';

import { solidity } from 'ethereum-waffle';
import { BigNumber } from '@ethersproject/bignumber';

chai.use(solidity);
const { expect } = chai;

export const checkBigNumberChange = async ({
  status,
  process,
  change,
}: {
  status: () => Promise<BigNumber>;
  process: Promise<any>;
  change: number;
}) => {
  const valueBefore = await status();
  await process;
  const valueAfter = await status();

  expect(valueAfter.sub(valueBefore)).to.equal(BigNumber.from(change));
};

export const checkChange = async ({
  status,
  process,
  expectedBefore,
  expectedAfter,
}: {
  status: () => Promise<any>;
  process: Promise<any>;
  expectedBefore: any;
  expectedAfter: any;
}) => {
  const valueBefore = await status();
  expect(valueBefore).to.eql(expectedBefore);

  await process;

  const valueAfter = await status();
  expect(valueAfter).to.eql(expectedAfter);
};
