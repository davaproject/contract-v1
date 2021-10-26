import fs from "fs";
import { constants } from "ethers";
import { Network } from "./network";

export type DeployedLog = {
  [network in Network]: {
    [contractName: string]: string;
  };
};

const filePath = `${__dirname}/../deployed.json`;
let logFile: DeployedLog;

export const getDeployLog = (): DeployedLog => {
  if (!logFile) {
    const logString = fs.readFileSync(filePath).toString();

    if (logString.length == 0) {
      logFile = { rinkeby: {}, mainnet: {} };
    }

    logFile = JSON.parse(logString) as DeployedLog;
  }

  return logFile;
};

export const getDeployed = (
  network: Network,
  contract: string
): string | undefined => {
  const deployLog = getDeployLog();
  const deployedAddress = deployLog[network][contract];
  return deployedAddress;
};

export const recordDeployment = (
  network: Network,
  contract: string,
  address: string
) => {
  if (address === constants.AddressZero) throw Error("Not deployed.");
  const deployLog = getDeployLog();
  deployLog[network][contract] = address;
  fs.writeFileSync(filePath, JSON.stringify(deployLog));
};
