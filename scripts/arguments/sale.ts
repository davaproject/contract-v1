import { getNetwork } from "../utils/network";
import { getDeployed } from "../utils/deploy-log";
import data from "../../data.json";

const network = getNetwork();
const dava = getDeployed(network, "Dava");
const davaOfficial = getDeployed(network, "DavaOfficial");
const randomBox = getDeployed(network, "RandomBox");
const preStart = data.sale[network].presaleStartsAt;
const preEnd = data.sale[network].presaleEndsAt;
const publicStart = data.sale[network].mainsaleStartsAt;

export default [dava, davaOfficial, randomBox, preStart, preEnd, publicStart];
