// import fs from "fs";
// import path from "path";

export function explorerUrl(sig: string, rpc: string) {
  return `https://explorer.solana.com/tx/${sig}${rpc.includes("devnet") ? "?cluster=devnet" : ""}`;
}
export function solscanUrl(sig: string, rpc: string) {
  return `https://solscan.io/tx/${sig}${rpc.includes("devnet") ? "?cluster=devnet" : ""}`;
}

// export function appendTxLog(kind: "BUY" | "SELL", mint: string, sig: string, rpc: string) {
//   const dir = path.join(process.cwd(), "logs");
//   const file = path.join(dir, "tx.csv");

//   if (!fs.existsSync(file)) {
//     fs.writeFileSync(file, "timestamp,kind,mint,signature,cluster\n", "utf8");
//   }

//   const date = new Date().toISOString();
//   const cluster = rpc.includes("devnet") ? "devnet" : "mainnet";
//   const row = `${date},${kind},${mint},${sig},${cluster}\n`;

//   fs.appendFileSync(file, row, "utf8");
// }