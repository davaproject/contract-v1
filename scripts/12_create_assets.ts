import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { DavaOfficial, DavaOfficial__factory } from "../types";
import data from "./data.json";
import { getData } from "./utils/data-log";

const network = getNetwork();
const id = 12;

const createAsset = async ({
  davaOfficial,
  asset,
}: {
  davaOfficial: DavaOfficial;
  asset: {
    collectionType: string;
    title: string;
    creator: string;
    description: string;
    uri: string;
    maxSupply: number;
  };
}): Promise<void> => {
  console.log(`Start register asset <${asset.title}> to <DavaOfficial>`);
  const tx = await davaOfficial.createAsset(
    asset.collectionType,
    asset.title,
    asset.creator,
    asset.description,
    asset.uri,
    [],
    asset.maxSupply
  );
  await tx.wait(1);
  console.log(`asset <${asset.title}> is registered in <DavaOfficial>`);
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
    "collections"
  );

  await Object.entries(data.assets).reduce(
    (acc, [collectionTitle, assetDataList]) =>
      acc.then(async () => {
        return await assetDataList.reduce(async (acc_, assetData) => {
          const asset = {
            collectionType: deployedData[collectionTitle],
            title: assetData.title,
            creator: assetData.creator || ethers.constants.AddressZero,
            description: assetData.description,
            uri: assetData.uri,
            maxSupply: assetData.maxSupply,
          };

          return acc_.then(() => createAsset({ davaOfficial, asset }));
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
