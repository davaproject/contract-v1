import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Contract } from "@ethersproject/contracts";
import { AvatarV1__factory, DavaSuit__factory, Dava__factory } from "../types";
import data from "./data.json";

const network = getNetwork();
const id = 9999;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const davaSuitAddress = getDeployed(network, "DavaSuit");
  if (!davaSuitAddress) {
    throw Error("<DavaSuit> is not deployed yet");
  }
  const DavaSuit = new DavaSuit__factory(deployer);
  const davaSuit = DavaSuit.attach(davaSuitAddress);

  const davaAddress = getDeployed(network, "Dava");
  if (!davaAddress) {
    throw Error("<Dava> is not deployed yet");
  }
  const Dava = new Dava__factory(deployer);
  const dava = Dava.attach(davaAddress);

  const avatarAddress = await dava.getAvatar(0);
  const Avatar = new AvatarV1__factory(deployer);
  const avatar = Avatar.attach(avatarAddress);

  const assetType = await davaSuit.assetType();
  await avatar.takeOff([assetType]);

  return;
};

main(network, 9999, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
