import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import {
  DavaOfficial__factory,
  Dava__factory,
  RandomBox__factory,
} from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 14;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  console.log("Registering Sale as a Minter & Operator");
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

  const ramdomBoxAddress = getDeployed(network, "RandomBox");
  if (!ramdomBoxAddress) {
    throw Error(`${ramdomBoxAddress} is not deployed yet`);
  }
  const RandomBox = new RandomBox__factory(deployer);
  const randomBox = RandomBox.attach(ramdomBoxAddress);

  const saleAddress = getDeployed(network, "Sale");
  if (!saleAddress) {
    throw Error(`${saleAddress} is not deployed yet`);
  }

  const DAVA_MINTER_ROLE = await dava.MINTER_ROLE();
  const tx1 = await dava.grantRole(DAVA_MINTER_ROLE, saleAddress);
  await tx1.wait(1);

  const DAVA_OFFICIAL_MINTER_ROLE = await davaOfficial.MINTER_ROLE();
  const tx2 = await davaOfficial.grantRole(
    DAVA_OFFICIAL_MINTER_ROLE,
    saleAddress
  );
  await tx2.wait(1);

  const RANDOMBOX_OPERATOR_ROLE = await randomBox.OPERATOR_ROLE();
  const tx3 = await randomBox.grantRole(RANDOMBOX_OPERATOR_ROLE, saleAddress);
  await tx3.wait(1);

  console.log("Everything is registered");
  return {};
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
