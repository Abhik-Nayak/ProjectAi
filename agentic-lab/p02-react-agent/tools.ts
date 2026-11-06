import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";


const SANDBOX = path.resolve("sandbox");

// The shape every tool must have
export type Tool = {
  name: string;
  description: string;
  schema: z.ZodObject;
  run: (args: any) => Promise<string>;
};

export const tools: Tool[] = [
  {
    name: "get_time",
    description: "Get the current date and time in ISO format.",
    schema: z.object({}), // no arguments
    run: async () => new Date().toISOString(),
  },
   {
    name: "calculator",
    description: "Evaluate a math expression. Use for ANY arithmetic.",
    schema: z.object({ expression: z.string() }),
    run: async ({ expression }) => {
      // Safety: allow only digits, spaces and + - * / ( ) . %
      if (!/^[\d\s+\-*/().%]+$/.test(expression))
        return "Error: only numbers and + - * / ( ) % are allowed";
      return String(Function(`"use strict"; return (${expression})`)());
    },
  },
  {
    name: "read_file",
    description: "Read a text file from the sandbox folder.",
    schema: z.object({ filename: z.string() }),
    run: async ({ filename }) => {
      const p = path.resolve(SANDBOX, filename);
      // Safety: block paths that escape the sandbox, like "../../secrets.txt"
      if (!p.startsWith(SANDBOX + path.sep)) return "Error: access denied";
      return (await readFile(p, "utf8")).slice(0, 4000);
    },
  },
];
