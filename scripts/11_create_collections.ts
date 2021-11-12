import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import {
  Dava,
  Dava__factory,
  DavaOfficial,
  DavaOfficial__factory,
} from "../types";
import data from "../data.json";
import { getData } from "./utils/data-log";

const network = getNetwork();
const id = 11;

const createCategory = async ({
  davaOfficial,
  category,
}: {
  davaOfficial: DavaOfficial;
  category: {
    title: string;
    backgroundImageTokenId: number;
    foregroundImageTokenId: number;
    zIndex: number;
  };
}): Promise<string> => {
  console.log(`Start register category <${category.title}> to <DavaOfficial>`);
  const tx = await davaOfficial.createCategory(
    category.title,
    category.backgroundImageTokenId,
    category.foregroundImageTokenId,
    category.zIndex
  );
  await tx.wait(1);

  console.log(`category <${category.title}> is registered in <DavaOfficial>`);

  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(category.title));
};

const registerCategory = async ({
  dava,
  categoryId,
}: {
  dava: Dava;
  categoryId: string;
}) => {
  console.log(`Start registering categoryId <${categoryId}> to <Dava>`);
  const tx = await dava.registerCategory(categoryId);
  await tx.wait(1);

  console.log(`categoryId <${categoryId}> is registered in <Dava>`);
};

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

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

  const deployedData: { [key: string]: number } = getData(network, "default");

  const categories: { [key: string]: string } = {};
  await Object.entries(data.categories).reduce(
    (acc, [categoryTitle, data]) =>
      acc.then(async () => {
        const category = {
          title: categoryTitle,
          backgroundImageTokenId: deployedData[data.backgroundImage],
          foregroundImageTokenId: deployedData[data.foregroundImage],
          zIndex: data.zIndex,
        };

        const categoryId = await createCategory({
          davaOfficial,
          category,
        });
        categories[categoryTitle] = categoryId;

        await registerCategory({
          dava,
          categoryId,
        });
      }),
    Promise.resolve()
  );

  return { data: { categories } };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
