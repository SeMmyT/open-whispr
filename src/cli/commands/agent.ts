import type { Command } from "commander";
import { reason } from "../../core/reasoning/index.js";
import { fail, info } from "../output.js";
import type { ReasoningProvider } from "../../shared/types.js";

export function registerAgentCommand(program: Command): void {
  program
    .command("agent <text...>")
    .description("Process text through AI reasoning")
    .option("-p, --provider <provider>", "Provider: openai, anthropic, gemini, groq")
    .option("-m, --model <model>", "Model to use")
    .option("-n, --name <name>", "Agent name")
    .action(
      async (
        textParts: string[],
        opts: { provider?: string; model?: string; name?: string },
      ) => {
        const text = textParts.join(" ");
        try {
          const result = await reason(text, {
            provider: opts.provider as ReasoningProvider,
            model: opts.model,
            agentName: opts.name,
          });
          console.log(result.text);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          fail(message);
          process.exit(1);
        }
      },
    );
}
