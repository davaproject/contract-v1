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
import data from "./data.json";
import { getData } from "./utils/data-log";

const network = getNetwork();
const id = 11;

const createAssetType = async ({
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
  const tx = await davaOfficial.createAssetType(
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

const registerAssetType = async ({
  dava,
  collection,
  assetType,
}: {
  dava: Dava;
  collection: string;
  assetType: string;
}) => {
  console.log(`Start register assetType <${assetType}> to <Dava>`);
  const tx = await dava.registerAssetType(collection, assetType);
  await tx.wait(1);

  console.log(`assetType <${assetType}> is registered in <Dava>`);
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
    (acc, [assetTitle, data]) =>
      acc.then(async () => {
        const collection = {
          name: assetTitle,
          backgroundImageTokenId: deployedData[data.backgroundImage],
          foregroundImageTokenId: deployedData[data.foregroundImage],
          zIndex: data.zIndex,
        };

        const assetType = await createAssetType({
          davaOfficial,
          collection,
        });
        collections[assetTitle] = assetType;

        await registerAssetType({
          dava,
          collection: davaOfficialAddress,
          assetType: assetType,
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
