import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { DavaFrame, DavaFrame__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";
import data from "../data.json";

const network = getNetwork();
const id = 8;

const registerFrame = async ({
  davaFrame,
  frame,
}: {
  davaFrame: DavaFrame;
  frame: {
    image: string;
    zIndex: number;
  };
}): Promise<number> => {
  console.log(`Start registering ${frame.image} on <DavaFrame>`);
  const frameId = (await davaFrame.totalFrames()).toNumber();

  const tx = await davaFrame.registerFrame(frame.image, frame.zIndex);
  await tx.wait(1);
  console.log("Frame registered");

  return frameId;
};

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  console.log("Start interacting <DavaFrame>");
  const davaFrameAddress = getDeployed(network, "DavaFrame");
  if (!davaFrameAddress) {
    throw Error("DavaFrame is not deployed yet");
  }

  const DavaFrameContract = new DavaFrame__factory(deployer);
  const davaFrame = DavaFrameContract.attach(davaFrameAddress);

  const frames: { [key: string]: number } = {};
  await Object.entries(data.frames).reduce(
    (acc, [title, { image, zIndex }]) =>
      acc.then(async () => {
        const frameId = await registerFrame({
          davaFrame,
          frame: { image, zIndex },
        });
        frames[title] = frameId;
      }),
    Promise.resolve()
  );
  console.log("Frames are registered in <DavaFrame>");

  return {
    data: { frames: {} },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
