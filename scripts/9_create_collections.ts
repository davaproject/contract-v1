import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import {
  Dava,
  Dava__factory,
  DavaOfficial,
  DavaOfficial__factory,
} from "../types";
import data from "../data.json";
import { getData } from "./utils/data-log";

const network = getNetwork();
const id = 9;

const createPartType = async ({
  davaOfficial,
  collection,
}: {
  davaOfficial: DavaOfficial;
  collection: {
    title: string;
    backgroundImageTokenId: number;
    foregroundImageTokenId: number;
    zIndex: number;
  };
}): Promise<string> => {
  console.log(
    `Start register collection <${collection.title}> to <DavaOfficial>`
  );
  const tx = await davaOfficial.createPartType(
    collection.title,
    collection.backgroundImageTokenId,
    collection.foregroundImageTokenId,
    collection.zIndex
  );
  await tx.wait(1);

  console.log(
    `collection <${collection.title}> is registered in <DavaOfficial>`
  );

  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(collection.title));
};

const registerPartType = async ({
  dava,
  partType,
}: {
  dava: Dava;
  partType: string;
}) => {
  console.log(`Start registering partType <${partType}> to <Dava>`);
  const tx = await dava.registerPartType(partType);
  await tx.wait(1);

  console.log(`partType <${partType}> is registered in <Dava>`);
};

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const davaAddress = getDeployed(network, "Dava");
  if (!davaAddress) {
    throw Error(`${davaAddress} is not deployed yet`);
  }
  const Dava = new Dava__factory(deployer);
  const dava = Dava.attach(davaAddress);

  const davaOfficialAddress = getDeployed(network, "DavaOfficial");
  if (!davaOfficialAddress) {
    throw Error(`${davaOfficialAddress} is not deployed yet`);
  }
  const DavaOfficial = new DavaOfficial__factory(deployer);
  const davaOfficial = DavaOfficial.attach(davaOfficialAddress);

  const deployedData: { [key: string]: number } = getData(network, "default");

  const collections: { [key: string]: string } = {};
  await Object.entries(data.collections).reduce(
    (acc, [partTitle, data]) =>
      acc.then(async () => {
        const collection = {
          title: partTitle,
          backgroundImageTokenId: deployedData[data.backgroundImage],
          foregroundImageTokenId: deployedData[data.foregroundImage],
          zIndex: data.zIndex,
        };

        const partType = await createPartType({
          davaOfficial,
          collection,
        });
        collections[partTitle] = partType;

        await registerPartType({
          dava,
          partType,
        });
      }),
    Promise.resolve()
  );

  return { data: { collections } };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
