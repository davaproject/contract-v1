import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";

const network = getNetwork();
const id = 14;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaSuitAddOn>");
  const DavaSuitAddOn = await ethers.getContractFactory(
    "contracts/assets/DavaSuitAddOn.sol/DavaSuitAddOn"
  );
  const davaSuitAddOn = await DavaSuitAddOn.deploy(
    data.images.default.emptyBodyBackground,
    data.images.default.emptyHead
  );
  await davaSuitAddOn.deployed();
  console.log("<DavaSuitAddOn> Contract deployed at:", davaSuitAddOn.address);

  return {
    contractName: "DavaSuitAddOn",
    address: davaSuitAddOn.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
