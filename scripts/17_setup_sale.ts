import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 17;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const sale = getDeployed(network, "Sale");
  if (!sale) {
    throw Error("Sale is not deployed yet");
  }

  const davaAddress = getDeployed(network, "Dava");
  if (!davaAddress) {
    throw Error("Dava is not deployed yet");
  }

  console.log("Grant MINTER_ROLE to <Sale> contract");
  const Dava = await ethers.getContractFactory("contracts/Dava.sol/Dava");
  const dava = await Dava.attach(davaAddress);
  const MINTER_ROLE = await dava.MINTER_ROLE();
  const tx = await dava.grantRole(MINTER_ROLE, sale);
  await tx.wait(1);
  console.log("MINTER_ROLE is granted");

  return;
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
