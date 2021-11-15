import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { DavaOfficial, DavaOfficial__factory } from "../types";
import data from "../data.json";
import { getData, recordData } from "./utils/data-log";

const network = getNetwork();
const id = 13;

const createPart = async ({
  davaOfficial,
  part,
}: {
  davaOfficial: DavaOfficial;
  part: {
    categoryId: string;
    title: string;
    description: string;
    ipfsHash: string;
    maxSupply: number;
    filledSupply: number;
  };
}): Promise<number> => {
  console.log(`Start register part <${part.title}> to <DavaOfficial>`);
  const partId = await davaOfficial.numberOfParts();
  const tx = await davaOfficial.unsafeCreatePart(
    part.categoryId,
    part.title,
    part.description,
    part.ipfsHash,
    [],
    part.maxSupply,
    part.filledSupply
  );
  await tx.wait(1);
  console.log(`part <${part.title}> is registered in <DavaOfficial>`);

  return partId.toNumber();
};

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const davaOfficialAddress = getDeployed(network, "DavaOfficial");
  if (!davaOfficialAddress) {
    throw Error(`${davaOfficialAddress} is not deployed yet`);
  }
  const DavaOfficial = new DavaOfficial__factory(deployer);
  const davaOfficial = DavaOfficial.attach(davaOfficialAddress);

  const result: { [key: string]: number } = {};
  try {
    await Object.values(data.parts).reduce(
      (acc, part, i) =>
        acc.then(async () => {
          console.log(`${i}/${data.parts.length}`);
          const partId = await createPart({
            davaOfficial,
            part: {
              categoryId: part.categoryId,
              title: part.title,
              description: part.description,
              ipfsHash: part.ipfsHash,
              maxSupply: part.maxSupply,
              filledSupply: part.filledSupply,
            },
          });
          result[part.fileName] = partId;
        }),
      Promise.resolve()
    );
  } catch (e) {
    recordData(network, { parts: result });
  }

  return {
    data: { parts: result },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
