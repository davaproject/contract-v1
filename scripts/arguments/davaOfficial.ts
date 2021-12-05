import { getNetwork } from "../utils/network";
import { getDeployed } from "../utils/deploy-log";

const network = getNetwork();
const gatewayHandler = getDeployed(network, "GatewayHandler");
const dava = getDeployed(network, "Dava");

export default [gatewayHandler, dava];
