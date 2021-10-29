import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { DavaOfficial__factory } from "../types";
import data from "./data.json";

const network = getNetwork();
const id = 10;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const davaOfficialAddress = getDeployed(network, "DavaOfficial");
  if (!davaOfficialAddress) {
    throw Error("<DavaOfficial> is not deployed yet");
  }
  const DavaOfficial = new DavaOfficial__factory(deployer);
  const davaOfficial = DavaOfficial.attach(davaOfficialAddress);

  const defaultAssetType = await davaOfficial.DEFAULT_ASSET_TYPE();
  const assets = Object.entries(data.images.bases);

  const result: { [key: string]: number } = {};
  await assets.reduce(
    (acc, [title, assetUri]) =>
      acc.then(async () => {
        const assetId = await (await davaOfficial.numberOfAssets()).toNumber();

        console.log(`Start create default asset <${title}> to <DavaOfficial>`);
        const tx = await davaOfficial.createAsset(
          defaultAssetType,
          "",
          ethers.constants.AddressZero,
          "",
          assetUri,
          [],
          0
        );
        await tx.wait(1);
        console.log(`default asset <${title}> is registered in <DavaOfficial>`);

        result[title] = assetId;
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
