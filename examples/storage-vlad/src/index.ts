import PaladinClient, { TransactionType } from "@lfdecentralizedtrust/paladin-sdk";
import storageVladJson from "../abis/StorageVlad.json";

const logger = console;

const NODE_URL = process.env.PALADIN_URL || "http://localhost:31548";
const NODE_ID = process.env.PALADIN_NODE_ID || "node1";
const NOTE = process.env.NOTE || "i send vlad";
const AMOUNT = process.env.AMOUNT || "8152";
const POLL_TIMEOUT = parseInt(process.env.POLL_TIMEOUT || "60000", 10);

async function main(): Promise<boolean> {
  logger.log("Paladin node:", NODE_URL);

  const paladin = new PaladinClient({ url: NODE_URL });
  const [owner] = paladin.getVerifiers(`owner@${NODE_ID}`);
  logger.log("Owner verifier:", owner.lookup);

  logger.log("STEP 1: Deploying the StorageVlad contract...");
  const deploymentTxID = await paladin.ptx.sendTransaction({
    type: TransactionType.PUBLIC,
    abi: storageVladJson.abi,
    bytecode: storageVladJson.bytecode,
    from: owner.lookup,
    data: {},
  });

  const deploymentReceipt = await paladin.pollForReceipt(deploymentTxID, POLL_TIMEOUT, true);
  if (!deploymentReceipt?.contractAddress) {
    logger.error("STEP 1: Deployment failed!");
    return false;
  }
  logger.log("STEP 1: StorageVlad deployed at", deploymentReceipt.contractAddress);

  logger.log(`STEP 2: Storing note "${NOTE}" amount ${AMOUNT}...`);
  const storeTxID = await paladin.ptx.sendTransaction({
    type: TransactionType.PUBLIC,
    abi: storageVladJson.abi,
    function: "store",
    from: owner.lookup,
    to: deploymentReceipt.contractAddress,
    data: { note: NOTE, amount: AMOUNT },
  });

  const storeReceipt = await paladin.pollForReceipt(storeTxID, POLL_TIMEOUT, true);
  if (!storeReceipt?.transactionHash || !storeReceipt.success) {
    logger.error("STEP 2: Store failed!");
    return false;
  }
  logger.log("STEP 2: Stored!");

  logger.log("STEP 3: Retrieving...");
  const retrieveResult = await paladin.ptx.call({
    type: TransactionType.PUBLIC,
    abi: storageVladJson.abi,
    function: "retrieve",
    from: owner.lookup,
    to: deploymentReceipt.contractAddress,
    data: {},
  });

  const note = retrieveResult["note"];
  const amount = retrieveResult["amount"];
  logger.log("STEP 3: Retrieved:", JSON.stringify(retrieveResult));

  if (note !== NOTE || amount !== AMOUNT) {
    logger.error(`STEP 3: Mismatch! got note="${note}" amount="${amount}"`);
    return false;
  }
  logger.log("STEP 3: Verified!");

  logger.log("\n" + note + " " + amount + " chf\n");
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
