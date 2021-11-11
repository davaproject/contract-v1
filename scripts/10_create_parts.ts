import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { DavaOfficial, DavaOfficial__factory } from "../types";
import data from "../data.json";
import { getData } from "./utils/data-log";

const network = getNetwork();
const id = 10;

const createPart = async ({
  davaOfficial,
  part,
}: {
  davaOfficial: DavaOfficial;
  part: {
    categoryId: string;
    title: string;
    description: string;
    uri: string;
    maxSupply: number;
  };
}): Promise<void> => {
  console.log(`Start register part <${part.title}> to <DavaOfficial>`);
  const tx = await davaOfficial.unsafeCreatePart(
    part.categoryId,
    part.title,
    part.description,
    part.uri,
    [],
    part.maxSupply,
    part.maxSupply
  );
  await tx.wait(1);
  console.log(`part <${part.title}> is registered in <DavaOfficial>`);
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

  const deployedData: { [key: string]: string } = getData(
    network,
    "categories"
  );

  await Object.entries(data.parts).reduce(
    (acc, [categoryTitle, partDataList]) =>
      acc.then(async () => {
        return await partDataList.reduce(async (acc_, partData) => {
          const part = {
            categoryId: deployedData[categoryTitle],
            title: partData.title,
            description: partData.description,
            uri: partData.uri,
            maxSupply: partData.maxSupply,
          };

          return acc_.then(() => createPart({ davaOfficial, part }));
        }, Promise.resolve());
      }),
    Promise.resolve()
  );

  return {};
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
