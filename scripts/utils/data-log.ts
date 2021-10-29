import fs from "fs";
import { Network } from "./network";

export type DataLog = {
  [network in Network]: {
    [key: string]: any;
  };
};

const filePath = `${__dirname}/../registeredData.json`;
let logFile: DataLog;

export const getDataLog = (): DataLog => {
  if (!logFile) {
    const logString = fs.readFileSync(filePath).toString();

    if (logString.length == 0) {
      logFile = { rinkeby: {}, mainnet: {} };
    }

    logFile = JSON.parse(logString) as DataLog;
  }

  return logFile;
};

export const getData = (network: Network, key: string): any => {
  const dataLog = getDataLog();
  const dataResult = dataLog[network][key];
  return dataResult;
};

export const recordData = (network: Network, data: { [key: string]: any }) => {
  const dataLog = getDataLog();
  Object.entries(data).forEach(([key, value]) => {
    dataLog[network][key] = value;
  });
  fs.writeFileSync(filePath, JSON.stringify(dataLog));
};
