import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { DavaOfficial, DavaOfficial__factory } from "../types";
import data from "./data.json";
import { getData } from "./utils/data-log";

const network = getNetwork();
const id = 11;

const createCollection = async ({
  davaOfficial,
  collection,
}: {
  davaOfficial: DavaOfficial;
  collection: {
    name: string;
    backgroundImageTokenId: number;
    foregroundImageTokenId: number;
    zIndex: number;
  };
}): Promise<string> => {
  console.log(
    `Start register collection <${collection.name}> to <DavaOfficial>`
  );
  const tx = await davaOfficial.createCollection(
    collection.name,
    collection.backgroundImageTokenId,
    collection.foregroundImageTokenId,
    collection.zIndex
  );
  await tx.wait(1);
  console.log(
    `collection <${collection.name}> is registered in <DavaOfficial>`
  );

  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(collection.name));
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

  const deployedData: { [key: string]: number } = getData(network, "default");

  const collections: { [key: string]: string } = {};
  await Object.entries(data.collections).reduce(
    (acc, [assetTitle, data]) =>
      acc.then(async () => {
        const collection = {
          name: assetTitle,
          backgroundImageTokenId: deployedData[data.backgroundImage],
          foregroundImageTokenId: deployedData[data.foregroundImage],
          zIndex: data.zIndex,
        };

        const collectionType = await createCollection({
          davaOfficial,
          collection,
        });
        collections[assetTitle] = collectionType;
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
