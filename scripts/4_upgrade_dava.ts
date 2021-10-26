import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 4;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const davaAddress = getDeployed(network, "Dava");
  if (!davaAddress) {
    throw Error("Dava is not deployed yet");
  }

  const avatarV1 = getDeployed(network, "AvatarV1");
  if (!avatarV1) {
    throw Error("AvatarV1 is not deployed yet");
  }

  console.log("Start upgrading <Dava> with <AvatarV1>");
  const DavaContract = await ethers.getContractFactory(
    "contracts/Dava.sol/Dava"
  );
  const dava = await DavaContract.attach(davaAddress);
  const tx = await dava.connect(deployer).upgradeTo(avatarV1);
  await tx.wait(1);
  console.log("Finish upgrading <Dava> with <AvatarV1>");

  return;
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
