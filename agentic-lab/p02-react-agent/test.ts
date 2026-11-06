import { tools } from "./tools.ts";

const find = (n: string) => tools.find((t) => t.name === n)!;

console.log("1.", await find("calculator").run({ expression: "(10 + 5) * 2" }));
console.log("2.", await find("calculator").run({ expression: "process.exit()" }));
console.log("3.", await find("read_file").run({ filename: "notes.txt" }));
console.log("4.", await find("read_file").run({ filename: "../tools.ts" }));
console.log("5. tools:", tools.map((t) => t.name).join(", "));
