import fs from "fs";
import { Network } from "./network";

export type ExecutionLog = {
  [network in Network]: {
    [id: number]: boolean;
  };
};

const filePath = `${__dirname}/../executions.json`;
let logFile: ExecutionLog;

export const getExecutionLog = (): ExecutionLog => {
  if (!logFile) {
    const logString = fs.readFileSync(filePath).toString();

    if (logString.length == 0) {
      logFile = { rinkeby: {}, mainnet: {} };
    }

    logFile = JSON.parse(logString) as ExecutionLog;
  }

  return logFile;
};

export const isExecuted = (network: Network, id: number): boolean => {
  const executionLog = getExecutionLog();
  const executionResult = executionLog[network][id];
  return !!executionResult;
};

export const recordExecution = (
  network: Network,
  id: number,
  result: boolean
) => {
  const executionLog = getExecutionLog();
  executionLog[network][id] = result;
  fs.writeFileSync(filePath, JSON.stringify(executionLog));
};
