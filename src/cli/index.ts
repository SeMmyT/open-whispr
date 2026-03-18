#!/usr/bin/env node
import { Command } from "commander";
import { registerScanCommand } from "./commands/scan.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerTranscribeCommand } from "./commands/transcribe.js";

const program = new Command();

program
  .name("rw")
  .description("ReWhisper — CLI-first dictation tool")
  .version("0.1.0");

registerScanCommand(program);
registerConfigCommand(program);
registerStatusCommand(program);
registerTranscribeCommand(program);

program.parse();
