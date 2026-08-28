import PaladinClient from "@lfdecentralizedtrust/paladin-sdk";
import { NotoFactory } from "@lfdecentralizedtrust/paladin-sdk";

const logger = console;

const NODE1_URL = process.env.NODE1_URL || "http://localhost:31548";
const NODE2_URL = process.env.NODE2_URL || "http://localhost:31648";
const NODE1_ID = process.env.NODE1_ID || "node1";
const NODE2_ID = process.env.NODE2_ID || "node2";

async function main(): Promise<boolean> {
  const paladinClientNode1 = new PaladinClient({ url: NODE1_URL });
  const paladinClientNode2 = new PaladinClient({ url: NODE2_URL });

  const [verifierNode1] = paladinClientNode1.getVerifiers(`owner@${NODE1_ID}`);
  const [verifierNode2] = paladinClientNode2.getVerifiers(`owner@${NODE2_ID}`);

  logger.log("Step 1: Deploying Noto token with allowBurn=true...");
  const notoFactory = new NotoFactory(paladinClientNode1, "noto");
  const burnToken = await notoFactory
    .newNoto(verifierNode1, {
      name: "BURNT",
      symbol: "BURNT",
      notary: verifierNode1,
      notaryMode: "basic",
      options: {
        basic: {
          restrictMint: false,
          allowBurn: true,
          allowLock: false,
        },
      },
    })
    .waitForDeploy(120000);
  if (!burnToken) {
    logger.error("Step 1: Deploy failed!");
    return false;
  }
  logger.log("Step 1: Token deployed at", burnToken.address);

  logger.log("Step 2: Minting 500 BURNT to Node1...");
  const mintReceipt = await burnToken
    .mint(verifierNode1, { to: verifierNode1, amount: 500, data: "0x" })
    .waitForReceipt(120000);
  if (!mintReceipt) {
    logger.error("Step 2: Mint failed!");
    return false;
  }
  logger.log("Step 2: Minted 500. tx:", mintReceipt.transactionHash);

  logger.log("Step 3: Node1 burning 300 BURNT...");
  const burnReceipt = await burnToken
    .burn(verifierNode1, { amount: 300, data: "0x" })
    .waitForReceipt(120000);
  if (!burnReceipt) {
    logger.error("Step 3: Burn failed!");
    return false;
  }
  logger.log("Step 3: Burned 300. tx:", burnReceipt.transactionHash);
  logger.log("\nSupply now: 200 (500 minted - 300 burned). Node1 balance: 200");
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
