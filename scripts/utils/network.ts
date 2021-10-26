export type Network = "rinkeby" | "mainnet";

export const getNetwork = (): Network => {
  const network: Network = process.env.NETWORK as Network;
  if (!(network in ["rinkeby", "mainnet"])) {
    throw Error("Set process.env.NETWORK");
  }
  return network;
};
