import PaladinClient from "@lfdecentralizedtrust/paladin-sdk";
import { PenteFactory, PentePrivateContract } from "@lfdecentralizedtrust/paladin-sdk";
import storageVladJson from "../abis/StorageVlad.json";

const logger = console;

const NODE1_URL = process.env.NODE1_URL || "http://localhost:31548";
const NODE2_URL = process.env.NODE2_URL || "http://localhost:31648";
const NODE1_ID = process.env.NODE1_ID || "node1";
const NODE2_ID = process.env.NODE2_ID || "node2";
const GROUP_ID = process.env.GROUP_ID || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

class PrivateStorageVlad extends PentePrivateContract<void> {
  constructor(group: any, address: string) {
    super(group, storageVladJson.abi, address);
  }
  using(_paladin: PaladinClient): PentePrivateContract<void> {
    throw new Error("not used in this example");
  }
}

async function main(): Promise<boolean> {
  const paladinNode1 = new PaladinClient({ url: NODE1_URL });
  const paladinNode2 = new PaladinClient({ url: NODE2_URL });

  const [verifierNode1] = paladinNode1.getVerifiers(`owner@${NODE1_ID}`);
  const [verifierNode2] = paladinNode2.getVerifiers(`owner@${NODE2_ID}`);

  const penteFactory = new PenteFactory(paladinNode1, "pente");
  const group = await penteFactory.resumePrivacyGroup({ id: GROUP_ID });
  if (!group) {
    logger.error("Group not found on node1!");
    return false;
  }
  logger.log("Resumed group:", group.salt);

  const contract = new PrivateStorageVlad(group, CONTRACT_ADDRESS);

  logger.log("Node1 retrieving the value from the contract...");
  const valueNode1 = await contract.call({
    from: verifierNode1.lookup,
    function: "retrieve",
    data: {},
  });
  logger.log("Node1 retrieved:", JSON.stringify(valueNode1));

  logger.log("Node2 retrieving the value from the contract...");
  const valueNode2 = await new PrivateStorageVlad(group.using(paladinNode2), CONTRACT_ADDRESS).call({
    from: verifierNode2.lookup,
    function: "retrieve",
    data: {},
  });
  logger.log("Node2 retrieved:", JSON.stringify(valueNode2));

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
