import { Low, JSONFile } from "lowdb";
import { Network } from "./network";

export type ExecutionLog = {
  [network in Network]: {
    [id: number]: boolean;
  };
};

let logFile: Low<ExecutionLog>;

export const getExecutionLog = async () => {
  if (!logFile) {
    logFile = new Low(new JSONFile<ExecutionLog>("executions.json"));
    await logFile.read();
    logFile.data = logFile.data || { mainnet: {}, rinkeby: {} };
  }
  return logFile;
};

export const isExecuted = async (
  network: Network,
  id: number
): Promise<boolean> => {
  const executionLog = await getExecutionLog();
  const executionResult = (executionLog.data as ExecutionLog)[network][id];
  return !!executionResult;
};

export const recordExecution = async (
  network: Network,
  id: number,
  result: boolean
) => {
  const executionLog = await getExecutionLog();
  (executionLog.data as ExecutionLog)[network][id] = result;
  await executionLog.write();
};
