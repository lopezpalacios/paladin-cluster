import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const contractName = "StorageVlad";
const sourceFile = path.join(dir, "../contracts/storage-vlad.sol");
const outFile = path.join(dir, "../abis/StorageVlad.json");

const source = fs.readFileSync(sourceFile, "utf8");

const input = {
  language: "Solidity",
  sources: { "storage-vlad.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const severe = output.errors.filter((e) => e.severity === "error");
  if (severe.length > 0) {
    console.error("Compilation errors:");
    for (const e of severe) console.error(e.formattedMessage);
    process.exit(1);
  }
}

const artifact = output.contracts["storage-vlad.sol"][contractName];
if (!artifact) {
  console.error(`Contract ${contractName} not found in compilation output`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(
  outFile,
  JSON.stringify({ abi: artifact.abi, bytecode: "0x" + artifact.evm.bytecode.object }, null, 2)
);
console.log(`Compiled ${contractName} -> ${outFile}`);
