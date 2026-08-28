import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const contractName = "HelloVlad";
const sourceFile = path.join(dir, "../contracts/hello-vlad.sol");
const outFile = path.join(dir, "../abis/HelloVlad.json");

const source = fs.readFileSync(sourceFile, "utf8");

const input = {
  language: "Solidity",
  sources: { "hello-vlad.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
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

const artifact = output.contracts["hello-vlad.sol"][contractName];
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
