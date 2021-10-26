import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Contract } from "@ethersproject/contracts";

const network = getNetwork();
const id = 15;

const registerAsset = async ({
  dava,
  asset,
}: {
  dava: Contract;
  asset: string;
}): Promise<void> => {
  console.log(`Start register asset <${asset}> to <Dava>`);
  const tx = await dava.registerAsset(asset);
  await tx.wait(1);
  console.log(`asset <${asset}> contract is registered in <Dava>`);
};

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const assets = [
    "DavaFrameBackground",
    "DavaFrameBody",
    "DavaFrameHead",
    "DavaSignature",
    "DavaBackground",
    "DavaEmotion",
    "DavaHelmet",
    "DavaHelmetAddOn",
    "DavaSuit",
    "DavaSuitAddOn",
  ];

  const davaAddress = getDeployed(network, "Dava");
  if (!davaAddress) {
    throw Error(`${davaAddress} is not deployed yet`);
  }
  const DavaContract = await ethers.getContractFactory(
    "contracts/Dava.sol/Dava"
  );
  const dava = await DavaContract.attach(davaAddress);

  await assets.reduce(
    (acc, assetTitle) =>
      acc.then(async () => {
        const asset = getDeployed(network, assetTitle);
        if (!asset) {
          throw Error(`${assetTitle} is not deployed yet`);
        }

        await registerAsset({ dava, asset: asset });
      }),
    Promise.resolve()
  );

  return;
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
