import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { DavaOfficial__factory } from "../types";
import data from "../data.json";

const network = getNetwork();
const id = 8;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const davaOfficialAddress = getDeployed(network, "DavaOfficial");
  if (!davaOfficialAddress) {
    throw Error("<DavaOfficial> is not deployed yet");
  }
  const DavaOfficial = new DavaOfficial__factory(deployer);
  const davaOfficial = DavaOfficial.attach(davaOfficialAddress);

  const defaultCategory = await davaOfficial.DEFAULT_CATEGORY();
  const parts = Object.entries(data.images.bases);

  const result: { [key: string]: number } = {};
  await parts.reduce(
    (acc, [title, partUri]) =>
      acc.then(async () => {
        const partId = await (await davaOfficial.numberOfParts()).toNumber();

        console.log(`Start create default part <${title}> to <DavaOfficial>`);
        const tx = await davaOfficial.createPart(
          defaultCategory,
          "",
          "",
          partUri,
          [],
          0
        );
        await tx.wait(1);
        console.log(`default part <${title}> is registered in <DavaOfficial>`);

        result[title] = partId;
        return;
      }),
    Promise.resolve()
  );

  return { data: { default: result } };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
