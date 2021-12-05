import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { DavaOfficial__factory, Dava__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 19;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("setting up roles");
  const saleAddress = getDeployed(network, "ExclusiveSale");
  if (!saleAddress) {
    throw Error(`${saleAddress} is not deployed yet`);
  }

  const davaAddress = getDeployed(network, "Dava");
  if (!davaAddress) {
    throw Error(`${davaAddress} is not deployed yet`);
  }
  const Dava = new Dava__factory(deployer);
  const dava = Dava.attach(davaAddress);

  const DAVA_MINTER_ROLE = await dava.MINTER_ROLE();
  const txA = await dava.grantRole(DAVA_MINTER_ROLE, saleAddress);
  await txA.wait(1);

  const davaOfficialAddress = getDeployed(network, "DavaOfficial");
  if (!davaOfficialAddress) {
    throw Error(`${davaOfficialAddress} is not deployed yet`);
  }
  const DavaOfficial = new DavaOfficial__factory(deployer);
  const davaOfficial = DavaOfficial.attach(davaOfficialAddress);

  const DAVA_OFFICIAL_MINTER_ROLE = await davaOfficial.MINTER_ROLE();
  const txB = await davaOfficial.grantRole(
    DAVA_OFFICIAL_MINTER_ROLE,
    saleAddress
  );
  await txB.wait(1);

  return {};
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
