import PaladinClient, { TransactionType } from "@lfdecentralizedtrust/paladin-sdk";
import helloVladJson from "../abis/HelloVlad.json";

const logger = console;

const NODE_URL = process.env.PALADIN_URL || "http://localhost:31548";
const NODE_ID = process.env.PALADIN_NODE_ID || "node1";
const NAME = process.env.GREET_NAME || "Vlad";
const POLL_TIMEOUT = parseInt(process.env.POLL_TIMEOUT || "60000", 10);

async function main(): Promise<boolean> {
  logger.log("Paladin node:", NODE_URL);

  const paladin = new PaladinClient({ url: NODE_URL });
  const [owner] = paladin.getVerifiers(`owner@${NODE_ID}`);
  logger.log("Owner verifier:", owner.lookup);

  logger.log("STEP 1: Deploying the HelloVlad contract...");
  const deploymentTxID = await paladin.ptx.sendTransaction({
    type: TransactionType.PUBLIC,
    abi: helloVladJson.abi,
    bytecode: helloVladJson.bytecode,
    from: owner.lookup,
    data: {},
  });

  const deploymentReceipt = await paladin.pollForReceipt(deploymentTxID, POLL_TIMEOUT, true);
  if (!deploymentReceipt?.contractAddress) {
    logger.error("STEP 1: Deployment failed!");
    return false;
  }
  logger.log("STEP 1: HelloVlad deployed at", deploymentReceipt.contractAddress);

  logger.log("STEP 2: Calling sayHello...");
  const sayHelloTxID = await paladin.ptx.sendTransaction({
    type: TransactionType.PUBLIC,
    abi: helloVladJson.abi,
    function: "sayHello",
    from: owner.lookup,
    to: deploymentReceipt.contractAddress,
    data: { name: NAME },
  });

  const functionReceipt = await paladin.pollForReceipt(sayHelloTxID, POLL_TIMEOUT, true);
  if (!functionReceipt?.transactionHash || !functionReceipt.success) {
    logger.error("STEP 2: Function call failed!");
    return false;
  }
  logger.log("STEP 2: sayHello executed!");

  logger.log("STEP 3: Retrieving emitted events...");
  const events = await paladin.bidx.decodeTransactionEvents(
    functionReceipt.transactionHash,
    helloVladJson.abi,
    "pretty=true"
  );

  const message = events[0]?.data["message"];
  const expected = `Welcome to Paladin, ${NAME}`;
  if (message !== expected) {
    logger.error(`STEP 3: Mismatch! got "${message}", expected "${expected}"`);
    return false;
  }
  logger.log("STEP 3: Events verified!");
  logger.log("\n" + message + "\n");

  return true;
}

if (require.main === module) {
  main()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error("Uncaught error:", err);
      process.exit(1);
    });
}
