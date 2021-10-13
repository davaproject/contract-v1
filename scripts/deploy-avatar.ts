import { ethers } from 'hardhat';

const main: () => Promise<void> = async () => {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  const Avatar = await ethers.getContractFactory('Avatar');
  const contract = await Avatar.deploy();

  await contract.deployed();
  console.log('Contract deployed at:', contract.address);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
