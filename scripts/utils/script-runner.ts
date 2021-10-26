import { isDeployed, recordDeployment } from "./deploy-log";
import { isExecuted, recordExecution } from "./execution-log";
import { Network } from "./network";

const before = async (network: Network, id: number): Promise<void> => {
  if (await isExecuted(network, id)) {
    throw Error(`${id} is already executed`);
  }
};

const after = async (
  network: Network,
  id: number,
  deployedContract?: DeployedContract
): Promise<void> => {
  await recordExecution(network, id, true);
  if (deployedContract) {
    recordDeployment(
      network,
      deployedContract.contractName,
      deployedContract.address
    );
  }
};

export type DeployedContract = { contractName: string; address: string };
export type HardhatScript = () => Promise<DeployedContract | undefined>;

export const main = async (
  network: Network,
  id: number,
  func: HardhatScript
): Promise<void> => {
  await before(network, id);
  const deployedContract = await func();
  await after(network, id, deployedContract);
};
