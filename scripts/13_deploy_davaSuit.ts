import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";

const network = getNetwork();
const id = 13;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaSuit>");
  const DavaSuit = await ethers.getContractFactory(
    "contracts/assets/DavaSuit.sol/DavaSuit"
  );
  const davaSuit = await DavaSuit.deploy(
    data.images.default.emptyBodyBackground,
    data.images.default.emptyHead
  );
  await davaSuit.deployed();
  console.log("<DavaSuit> Contract deployed at:", davaSuit.address);

  return {
    contractName: "DavaSuit",
    address: davaSuit.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
