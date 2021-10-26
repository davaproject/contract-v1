import { constants } from "ethers";
import { Low, JSONFile } from "lowdb";
import { Network } from "./network";

export type Deployed = {
  [network in Network]: {
    [contractName: string]: string;
  };
};

let logFile: Low<Deployed>;

export const getDeployLog = async () => {
  if (!logFile) {
    logFile = new Low(new JSONFile<Deployed>("deployed.json"));
    await logFile.read();
    logFile.data = logFile.data || { mainnet: {}, rinkeby: {} };
  }
  return logFile;
};

export const getDeployed = async (
  network: Network,
  contract: string
): Promise<string | undefined> => {
  const deployLog = await getDeployLog();
  const deployedAddress = (deployLog.data as Deployed)[network][contract];
  return deployedAddress;
};

export const recordDeployment = async (
  network: Network,
  contract: string,
  address: string
) => {
  if (address === constants.AddressZero) throw Error("Not deployed.");
  const deployLog = await getDeployLog();
  (deployLog.data as Deployed)[network][contract] = address;
  await deployLog.write();
};
