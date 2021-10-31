import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Dava__factory } from "../types";

const network = getNetwork();
const id = 13;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const davaAddress = getDeployed(network, "Dava");
  if (!davaAddress) {
    throw Error(`${davaAddress} is not deployed yet`);
  }
  const Dava = new Dava__factory(deployer);
  const dava = Dava.attach(davaAddress);

  const defaultCollections = [
    "DavaFrameBackground",
    "DavaFrameBody",
    "DavaFrameHead",
    "DavaSignature",
  ];
  await defaultCollections.reduce(
    (acc, title) =>
      acc.then(async () => {
        const defaultCollection = getDeployed(network, title);
        if (!defaultCollection) {
          throw Error(`${title} is not deployed yet`);
        }
        const tx = await dava.registerDefaultCollection(defaultCollection);
        await tx.wait(1);
        return;
      }),
    Promise.resolve()
  );

  const davaOfficial = getDeployed(network, "DavaOfficial");
  if (!davaOfficial) {
    throw Error(`${davaOfficial} is not deployed yet`);
  }

  const tx = await dava.registerCollection(davaOfficial);
  await tx.wait(1);

  return {};
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
