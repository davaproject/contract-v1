import { ethers } from 'hardhat';

const main: () => Promise<void> = async () => {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  const PartnerAssetFactory = await ethers.getContractFactory(
    'contracts/PartnerAssetFactory.sol:PartnerAssetFactory'
  );
  const contract = await PartnerAssetFactory.deploy(
    'TEST_PARTNER',
    'TPT',
    'PARTNER_TRAIT',
    1000,
    '0x54627c08b0d7c47ac9a3427db1a67d5aa26cea9c',
    '0x859571c5d497f9bbfe1ac2a2ec13c7386fdb60a3',
    '0xd771fcc810e66d3cf73441327c5e028771723838'
  );

  await contract.deployed();
  console.log('Contract deployed at:', contract.address);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
