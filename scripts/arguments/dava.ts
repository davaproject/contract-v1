import { getNetwork } from "../utils/network";
import { getDeployed } from "../utils/deploy-log";

const network = getNetwork();
const minimalProxy = getDeployed(network, "MinimalProxy");
const gatewayHandler = getDeployed(network, "GatewayHandler");

export default [minimalProxy, gatewayHandler];
