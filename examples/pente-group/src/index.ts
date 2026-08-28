import PaladinClient from "@lfdecentralizedtrust/paladin-sdk";
import { PenteFactory, PentePrivateContract } from "@lfdecentralizedtrust/paladin-sdk";
import storageVladJson from "../abis/StorageVlad.json";

const logger = console;

class PrivateStorageVlad extends PentePrivateContract<void> {
  constructor(group: any, address: string) {
    super(group, storageVladJson.abi, address);
  }
  using(_paladin: PaladinClient): PentePrivateContract<void> {
    throw new Error("not used in this example");
  }
}

const NODE1_URL = process.env.NODE1_URL || "http://localhost:31548";
const NODE2_URL = process.env.NODE2_URL || "http://localhost:31648";
const NODE1_ID = process.env.NODE1_ID || "node1";
const NODE2_ID = process.env.NODE2_ID || "node2";

async function main(): Promise<boolean> {
  const paladinNode1 = new PaladinClient({ url: NODE1_URL });
  const paladinNode2 = new PaladinClient({ url: NODE2_URL });

  const [verifierNode1] = paladinNode1.getVerifiers(`owner@${NODE1_ID}`);
  const [verifierNode2] = paladinNode2.getVerifiers(`owner@${NODE2_ID}`);
  logger.log("Node1 verifier:", verifierNode1.lookup);
  logger.log("Node2 verifier:", verifierNode2.lookup);

  logger.log("Creating a privacy group for Node1 and Node2...");
  const penteFactory = new PenteFactory(paladinNode1, "pente");
  const memberPrivacyGroup = await penteFactory
    .newPrivacyGroup({
      members: [verifierNode1, verifierNode2],
      evmVersion: "shanghai",
      externalCallsEnabled: true,
    })
    .waitForDeploy(120000);

  if (!memberPrivacyGroup) {
    logger.error("Privacy group deployment failed!");
    return false;
  }

  logger.log("Privacy group created!");
  logger.log("Group id:", memberPrivacyGroup.salt);
  logger.log("Group contract address:", memberPrivacyGroup.address);
  logger.log("Members:", JSON.stringify(memberPrivacyGroup.members));

  logger.log("STEP 2: Deploying a smart contract to the privacy group...");
  const privateContractAddress = await memberPrivacyGroup
    .deploy({
      abi: storageVladJson.abi,
      bytecode: storageVladJson.bytecode,
      from: verifierNode1.lookup,
    })
    .waitForDeploy(120000);

  if (!privateContractAddress) {
    logger.error("STEP 2: Private contract deployment failed!");
    return false;
  }
  logger.log("STEP 2: Private StorageVlad contract deployed at", privateContractAddress);

  const privateStorageContract = new PrivateStorageVlad(
    memberPrivacyGroup,
    privateContractAddress
  );

  const note = process.env.NOTE || "i send vlad";
  const amount = process.env.AMOUNT || "8152";

  logger.log(`STEP 3: Storing note "${note}" amount ${amount}...`);
  const storeReceipt = await privateStorageContract
    .sendTransaction({
      from: verifierNode1.lookup,
      function: "store",
      data: { note, amount },
    })
    .waitForReceipt(120000);
  if (!storeReceipt?.transactionHash) {
    logger.error("STEP 3: Store failed!");
    return false;
  }
  logger.log("STEP 3: Value stored! Transaction hash:", storeReceipt.transactionHash);

  logger.log("STEP 4: Retrieving as Node2...");
  const node2Group = memberPrivacyGroup.using(paladinNode2);
  const node2Contract = new PrivateStorageVlad(node2Group, privateContractAddress);
  const retrieveResult = await node2Contract.call({
    from: verifierNode2.lookup,
    function: "retrieve",
    data: {},
  });
  logger.log("STEP 4: Retrieved (as Node2):", JSON.stringify(retrieveResult));

  if (retrieveResult["note"] !== note || retrieveResult["amount"] !== amount) {
    logger.error("STEP 4: Mismatch!");
    return false;
  }
  logger.log("STEP 4: Verified!");
  logger.log("\n" + retrieveResult["note"] + " " + retrieveResult["amount"] + " chf\n");
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
