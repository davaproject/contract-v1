import dotenv from "dotenv";
dotenv.config();

export type Network = "rinkeby" | "mainnet";

export const getNetwork = (): Network => {
  const network = process.env.NETWORK || "";
  if (!["rinkeby", "mainnet"].includes(network)) {
    throw Error("Set process.env.NETWORK");
  }
  return network as Network;
};
