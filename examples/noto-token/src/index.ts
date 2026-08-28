import PaladinClient from "@lfdecentralizedtrust/paladin-sdk";
import { NotoFactory } from "@lfdecentralizedtrust/paladin-sdk";

const logger = console;

const NODE1_URL = process.env.NODE1_URL || "http://localhost:31548";
const NODE2_URL = process.env.NODE2_URL || "http://localhost:31648";
const NODE3_URL = process.env.NODE3_URL || "http://localhost:31748";
const NODE1_ID = process.env.NODE1_ID || "node1";
const NODE2_ID = process.env.NODE2_ID || "node2";
const NODE3_ID = process.env.NODE3_ID || "node3";

async function main(): Promise<boolean> {
  const paladinClientNode1 = new PaladinClient({ url: NODE1_URL });
  const paladinClientNode2 = new PaladinClient({ url: NODE2_URL });
  const paladinClientNode3 = new PaladinClient({ url: NODE3_URL });

  const [verifierNode1] = paladinClientNode1.getVerifiers(`owner@${NODE1_ID}`);
  const [verifierNode2] = paladinClientNode2.getVerifiers(`owner@${NODE2_ID}`);
  const [verifierNode3] = paladinClientNode3.getVerifiers(`owner@${NODE3_ID}`);

  logger.log("Step 1: Deploying a Noto cash token...");
  const notoFactory = new NotoFactory(paladinClientNode1, "noto");
  const cashToken = await notoFactory
    .newNoto(verifierNode1, {
      name: "NOTO",
      symbol: "NOTO",
      notary: verifierNode1,
      notaryMode: "basic",
    })
    .waitForDeploy(120000);
  if (!cashToken) {
    logger.error("Step 1: Failed to deploy the Noto cash token!");
    return false;
  }
  logger.log("Step 1: Noto cash token deployed! Address:", cashToken.address);

  logger.log("Step 2: Minting 2000 units of cash to Node1...");
  const mintReceipt = await cashToken
    .mint(verifierNode1, {
      to: verifierNode1,
      amount: 2000,
      data: "0x",
    })
    .waitForReceipt(120000);
  if (!mintReceipt) {
    logger.error("Step 2: Failed to mint!");
    return false;
  }
  logger.log("Step 2: Minted 2000 NOTO to Node1. tx:", mintReceipt.transactionHash);

  logger.log("Step 3: Transferring 1000 units of cash from Node1 to Node2...");
  const transferToNode2 = await cashToken
    .transfer(verifierNode1, {
      to: verifierNode2,
      amount: 1000,
      data: "0x",
    })
    .waitForReceipt(120000);
  if (!transferToNode2) {
    logger.error("Step 3: Failed to transfer to Node2!");
    return false;
  }
  logger.log("Step 3: Transferred 1000 NOTO to Node2. tx:", transferToNode2.transactionHash);

  logger.log("Step 4: Transferring 800 units of cash from Node2 to Node3...");
  const transferToNode3 = await cashToken
    .using(paladinClientNode2)
    .transfer(verifierNode2, {
      to: verifierNode3,
      amount: 800,
      data: "0x",
    })
    .waitForReceipt(120000);
  if (!transferToNode3) {
    logger.error("Step 4: Failed to transfer to Node3!");
    return false;
  }
  logger.log("Step 4: Transferred 800 NOTO to Node3. tx:", transferToNode3.transactionHash);

  logger.log("\nALL STEPS COMPLETE");
  logger.log("Balances: Node1=1000 Node2=200 Node3=800 (notary: Node1)");
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
