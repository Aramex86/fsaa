/* fsaa/lib/cli.mjs — command dispatch, flag parsing, interactive prompts (zero deps). */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { initCmd } from "./init.mjs";
import { generateCmd } from "./generate.mjs";

export function parseFlags(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[k] = true; // boolean flag
      } else {
        flags[k] = next;
        i++;
      }
    } else {
      rest.push(a);
    }
  }
  return { flags, rest };
}

function isInteractive() {
  return stdin.isTTY === true;
}

export async function prompt(question, fallback = "") {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim() || fallback;
  } finally {
    rl.close();
  }
}

const HELP = `FSAA CLI v0.1 — Feature-Sliced Atomic Architecture

  init    Scaffold a new app from an official FSAA starter template
  g       Generate a canonical feature slice inside an existing FSAA app
  help    Show this help

init usage:
    fsaa init                          # interactive (name, template, manager)
    fsaa init --name my-app --template vite --manager npm   # non-interactive

g usage (run inside a project scaffolded by fsaa init):
    fsaa g <slice-name>                # e.g. fsaa g checkout

Docs: https://aramex86.github.io/fsaa
`;

async function unknown(cmd) {
  console.error(`fsaa: unknown command "${cmd}" — run "fsaa help" for usage.`);
  return 1;
}

export async function run(argv) {
  const [cmd, ...rest] = argv;
  const { flags } = parseFlags(rest);
  switch (cmd) {
    case "init":
      return initCmd({ flags, interactive: isInteractive(), prompt });
    case "g":
    case "generate":
      return generateCmd({ args: rest, flags, interactive: isInteractive(), prompt });
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return 0;
    default:
      if (!cmd) {
        console.log(HELP);
        return 0;
      }
      return unknown(cmd);
  }
}