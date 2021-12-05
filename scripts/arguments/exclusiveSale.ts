import { getNetwork } from "../utils/network";
import { getDeployed } from "../utils/deploy-log";

const network = getNetwork();
const dava = getDeployed(network, "Dava");
const davaOfficial = getDeployed(network, "DavaOfficial");
const randomBox = getDeployed(network, "RandomBox");

export default [dava, davaOfficial, randomBox];
