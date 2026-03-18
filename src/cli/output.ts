import chalk from "chalk";

export const ok = (msg: string) => console.log(chalk.green("✓"), msg);
export const fail = (msg: string) => console.log(chalk.red("✗"), msg);
export const warn = (msg: string) => console.log(chalk.yellow("!"), msg);
export const info = (msg: string) => console.log(chalk.blue("i"), msg);

export function table(rows: Array<[string, string]>): void {
  const maxKey = Math.max(...rows.map(([k]) => k.length));
  for (const [key, value] of rows) {
    console.log(`  ${chalk.dim(key.padEnd(maxKey))}  ${value}`);
  }
}
