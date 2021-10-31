import chai from "chai";

import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

export const checkChange = async ({
  status,
  process,
  expectedBefore,
  expectedAfter,
}: {
  status: () => Promise<any>;
  process: () => Promise<any>;
  expectedBefore: any;
  expectedAfter: any;
}) => {
  const valueBefore = await status();
  expect(valueBefore).to.eql(expectedBefore);

  await process();

  const valueAfter = await status();
  expect(valueAfter).to.eql(expectedAfter);
};
