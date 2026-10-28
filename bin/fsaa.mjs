#!/usr/bin/env node
/* FSAA CLI — scaffold apps from the official starters and generate canonical slices. */
import { run } from "../lib/cli.mjs";
run(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    if (err && err.userError) {
      console.error("fsaa: " + (err.message || "invalid input"));
      process.exit(1);
    }
    console.error("fsaa: unexpected error");
    if (err && err.stack) console.error(err.stack.split("\n").slice(0, 3).join("\n"));
    else console.error(String(err));
    process.exit(1);
  },
);