import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaHelmetAddOn__factory } from "../types";

const network = getNetwork();
const id = 12;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaHelmetAddOn>");
  const DavaHelmetAddOn = new DavaHelmetAddOn__factory(deployer);
  const davaHelmetAddOn = await DavaHelmetAddOn.deploy(
    data.images.default.emptyHeadBodyBackground,
    ""
  );
  await davaHelmetAddOn.deployed();
  console.log(
    "<DavaHelmetAddOn> Contract deployed at:",
    davaHelmetAddOn.address
  );

  return {
    contractName: "DavaHelmetAddOn",
    address: davaHelmetAddOn.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
