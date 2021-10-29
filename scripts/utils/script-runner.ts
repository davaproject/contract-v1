import { recordDeployment } from "./deploy-log";
import { recordData } from "./data-log";
import { isExecuted, recordExecution } from "./execution-log";
import { Network } from "./network";

const before = async (network: Network, id: number): Promise<void> => {
  if (await isExecuted(network, id)) {
    throw Error(`${id} is already executed`);
  }
};

const after = async ({
  network,
  id,
  deployedContract,
  data,
}: {
  network: Network;
  id: number;
  deployedContract?: DeployedContract;
  data?: Data;
}): Promise<void> => {
  await recordExecution(network, id, true);
  if (deployedContract) {
    recordDeployment(
      network,
      deployedContract.contractName,
      deployedContract.address
    );
  }
  if (data) {
    recordData(network, data);
  }
};

export type Data = { [key: string]: any };
export type DeployedContract = { contractName: string; address: string };
export type HardhatScript = () => Promise<{
  deployedContract?: DeployedContract;
  data?: Data;
}>;

export const main = async (
  network: Network,
  id: number,
  func: HardhatScript
): Promise<void> => {
  await before(network, id);
  const { deployedContract, data } = await func();
  await after({ network, id, deployedContract, data });
};
