// import chai from "chai";

// import { ethers } from "hardhat";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import {
//   AvatarV1__factory,
//   AvatarV1,
//   Dava,
//   DavaOfficial,
//   RandomBox,
//   TestSale,
//   TestSale__factory,
//   Test721,
//   Test721__factory,
//   Test1155,
//   Test1155__factory,
//   EthGateway,
//   EthGateway__factory,
// } from "../../types";
// import { solidity } from "ethereum-waffle";
// import { fixtures } from "../../scripts/utils/fixtures";
// import { checkChange } from "./utils/compare";
// import { genWhitelistSig, genClaimSig } from "./utils/signature";
// import { categoryId } from "./utils/part";
// import { BigNumberish } from "@ethersproject/bignumber";
// import BytesLikeArray from "./types/BytesLikeArray";
// import { partIdsToHex } from "./utils/bit";

// chai.use(solidity);
// const { expect } = chai;

// const contractInfo = {
//   name: "AvatarSale",
//   version: "V1",
// };

// describe("Sale", () => {
//   let snapshot: string;
//   let sale: TestSale;
//   let dava: Dava;
//   let davaOfficial: DavaOfficial;
//   let randomBox: RandomBox;
//   let test721: Test721;
//   let test1155: Test1155;
//   let gateway: EthGateway;
//   let [deployer, ...accounts]: SignerWithAddress[] = [];

//   const partIds: Array<number> = [];
//   const partInfo: Array<string> = [];

//   before(async () => {
//     [deployer, ...accounts] = await ethers.getSigners();

//     const Test721 = new Test721__factory(deployer);
//     test721 = await Test721.deploy();
//     for (let i = 0; i < 100; i += 1) {
//       test721.mint();
//     }
//     const Gateway = new EthGateway__factory(deployer);
//     gateway = await Gateway.deploy(test721.address);
//     test721.setApprovalForAll(gateway.address, true);

//     const Test1155 = new Test1155__factory(deployer);
//     test1155 = await Test1155.deploy();
//     await gateway.register1155(test1155.address);
//     for (let i = 0; i < 100; i += 1) {
//       await test1155.mint(i, 100);
//     }
//     test1155.setApprovalForAll(gateway.address, true);

//     const { contracts } = await fixtures();
//     ({
//       dava,
//       randomBox,
//       parts: { davaOfficial },
//     } = contracts);

//     const Sale = new TestSale__factory(deployer);
//     sale = await Sale.deploy(
//       dava.address,
//       davaOfficial.address,
//       randomBox.address,
//       0,
//       2 ** 32 - 1,
//       0
//     );
//     const minterRoleFromCollection = await davaOfficial.MINTER_ROLE();
//     await davaOfficial.grantRole(minterRoleFromCollection, sale.address);
//     const minterRoleFromDava = await dava.MINTER_ROLE();
//     await dava.grantRole(minterRoleFromDava, sale.address);

//     for (let i = 0; i < 3; i += 1) {
//       const collectionName = `${Date.now()}`;
//       const frameTokenId = 0;
//       const zIndex = i;

//       await davaOfficial.createCategory(
//         collectionName,
//         frameTokenId,
//         frameTokenId,
//         zIndex
//       );
//       await dava.registerCategory(categoryId(collectionName));

//       const partId = (await davaOfficial.numberOfParts()).toNumber();
//       await davaOfficial.unsafeCreatePart(
//         categoryId(collectionName),
//         "test",
//         "test",
//         "test",
//         [],
//         1,
//         1
//       );

//       partIds.push(partId);
//       partInfo.push(categoryId(collectionName));
//     }

//     await randomBox.setSeed();
//     await randomBox.setA(
//       new Array(358).fill(
//         partIdsToHex(new Array(28).fill(partIds[0]))
//       ) as BytesLikeArray
//     );
//     await randomBox.setB(
//       new Array(358).fill(
//         partIdsToHex(new Array(28).fill(partIds[1]))
//       ) as BytesLikeArray
//     );
//     await randomBox.setC(
//       new Array(358).fill(
//         partIdsToHex(new Array(28).fill(partIds[2]))
//       ) as BytesLikeArray
//     );
//   });

//   beforeEach(async () => {
//     snapshot = await ethers.provider.send("evm_snapshot", []);
//   });

//   afterEach(async () => {
//     await ethers.provider.send("evm_revert", [snapshot]);
//   });

//   describe("TEST", () => {
//     it("gas", async () => {
//       let amount = 1;
//       const tokenIds = new Array(amount).fill(0).map((_, i) => i);
//       for (let i = 0; i < tokenIds.length; i++) {
//         expect(await test721.ownerOf(i)).to.equal(deployer.address);
//       }
//       const tx = await gateway.batchReceiveAvatar(tokenIds);
//       for (let i = 0; i < tokenIds.length; i++) {
//         expect(await test721.ownerOf(i)).to.equal(gateway.address);
//       }

//       console.log(tx.gasLimit.toNumber());

//       /**
//        * 1: 76,110 - 0.007611
//        * 5: 144,574 - 0.0144574
//        * 100: 1,776,553 - 0.1776553
//        */
//     });

//     it("gas", async () => {
//       let ids = 100;
//       const amount = 100;
//       const tokenIds = new Array(ids).fill(0).map((_, i) => i);
//       console.log(tokenIds);
//       for (let i = 0; i < tokenIds.length; i++) {
//         expect(await test1155.balanceOf(deployer.address, i)).to.equal(amount);
//       }
//       const tx = await gateway.batchReceive1155(
//         test1155.address,
//         tokenIds,
//         new Array(ids).fill(amount)
//       );
//       for (let i = 0; i < tokenIds.length; i++) {
//         expect(await test1155.balanceOf(deployer.address, i)).to.equal(0);
//         expect(await test1155.balanceOf(gateway.address, i)).to.equal(amount);
//       }

//       console.log(tx.gasLimit.toNumber());

//       /**
//        * 1: 68,646 - 0.0068646
//        * 5: 187,694 - 0.0187694
//        * 100: 3,008,040 - 0.300804
//        */
//     });
//   });

//   // describe("calculate gas", () => {
//   //   let categoryId1: string;
//   //   let categoryId2: string;
//   //   let partId1: number;
//   //   let partId2: number;
//   //   let avatarId: number;
//   //   let avatar: AvatarV1;

//   //   beforeEach(async () => {
//   //     await davaOfficial.createCategory("TEST_1", 0, 0, 100);
//   //     categoryId1 = categoryId("TEST_1");
//   //     await dava.registerCategory(categoryId1);

//   //     await davaOfficial.createCategory("TEST_2", 0, 0, 101);
//   //     categoryId2 = categoryId("TEST_2");
//   //     await dava.registerCategory(categoryId2);

//   //     partId1 = (await davaOfficial.numberOfParts()).toNumber();
//   //     await davaOfficial.createPart(
//   //       categoryId1,
//   //       "test",
//   //       "test",
//   //       "test",
//   //       [],
//   //       100
//   //     );
//   //     await davaOfficial.mint(deployer.address, partId1, 1, "0x");

//   //     partId2 = (await davaOfficial.numberOfParts()).toNumber();
//   //     await davaOfficial.createPart(
//   //       categoryId2,
//   //       "test",
//   //       "test",
//   //       "test",
//   //       [],
//   //       100
//   //     );
//   //     await davaOfficial.mint(deployer.address, partId2, 1, "0x");

//   //     avatarId = 2;
//   //     await dava.mint(deployer.address, avatarId);
//   //     const avatarAddress = await dava.getAvatar(avatarId);

//   //     const Avatar = new AvatarV1__factory(deployer);
//   //     avatar = Avatar.attach(avatarAddress);
//   //   });

//   //   it("zap: single asset takeOff", async () => {
//   //     await dava.zap(
//   //       avatarId,
//   //       [{ collection: davaOfficial.address, id: partId1 }],
//   //       []
//   //     );

//   //     const tx = await dava.zap(avatarId, [], [categoryId1]);
//   //     console.log(tx.gasLimit.toNumber());
//   //   });

//   //   it("zap: dual asset takeOff", async () => {
//   //     await dava.zap(
//   //       avatarId,
//   //       [
//   //         { collection: davaOfficial.address, id: partId1 },
//   //         { collection: davaOfficial.address, id: partId2 },
//   //       ],
//   //       []
//   //     );

//   //     const tx = await dava.zap(avatarId, [], [categoryId1, categoryId2]);
//   //     console.log(tx.gasLimit.toNumber());
//   //   });

//   //   it("avatar: transfer single asset", async () => {
//   //     await dava.zap(
//   //       avatarId,
//   //       [{ collection: davaOfficial.address, id: partId1 }],
//   //       []
//   //     );

//   //     const txData =
//   //       await davaOfficial.populateTransaction.safeBatchTransferFrom(
//   //         avatar.address,
//   //         deployer.address,
//   //         [partId1],
//   //         [1],
//   //         "0x"
//   //       );

//   //     const tx = await avatar.execute({
//   //       to: davaOfficial.address,
//   //       value: 0,
//   //       data: txData.data || "0x",
//   //     });
//   //     console.log(tx.gasLimit.toNumber());
//   //   });

//   //   it("avatar: transfer double asset", async () => {
//   //     await dava.zap(
//   //       avatarId,
//   //       [
//   //         { collection: davaOfficial.address, id: partId1 },
//   //         { collection: davaOfficial.address, id: partId2 },
//   //       ],
//   //       []
//   //     );

//   //     const txData =
//   //       await davaOfficial.populateTransaction.safeBatchTransferFrom(
//   //         avatar.address,
//   //         deployer.address,
//   //         [partId1, partId2],
//   //         [1, 1],
//   //         "0x"
//   //       );

//   //     const tx = await avatar.execute({
//   //       to: davaOfficial.address,
//   //       value: 0,
//   //       data: txData.data || "0x",
//   //     });
//   //     console.log(tx.gasLimit.toNumber());
//   //   });
//   // });
// });
