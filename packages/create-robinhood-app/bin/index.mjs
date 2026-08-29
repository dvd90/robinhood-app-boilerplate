#!/usr/bin/env node
// create-robinhood-app: clone the template (with forge submodules), prune by flag, rename, git init.
// No dependencies on purpose: node:fs + git are all a fresh machine has.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";

const TEMPLATE = "https://github.com/dvd90/robinhood-app-boilerplate.git";
const USAGE = `Usage: npx create-robinhood-app <name> [--bare | --fullstack] [--with-token] [--template <git-url-or-path>]

  --bare        contracts only (default)
  --fullstack   contracts + apps/web (Next 15 + wagmi/viem)
  --with-token  keep the optional plain GameToken ERC-20
  --template    git URL or local path to clone from (default: ${TEMPLATE})`;

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) exit(USAGE, 0);
const flag = (f) => args.includes(f);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
let name = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--template");

if (!name) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  name = (await rl.question("Project name: ")).trim();
  rl.close();
}
if (!/^[a-z0-9][a-z0-9-_]*$/i.test(name)) exit(`Invalid name "${name}". Use letters, digits, - or _.`, 1);
const dir = resolve(process.cwd(), name);
if (existsSync(dir)) exit(`${dir} already exists.`, 1);
const fullstack = flag("--fullstack");
const withToken = flag("--with-token");
const template = opt("--template", TEMPLATE);

const sh = (cmd, cwd = dir) => execSync(cmd, { cwd, stdio: "inherit" });
const rm = (p) => rmSync(resolve(dir, p), { recursive: true, force: true });
const edit = (p, fn) => writeFileSync(resolve(dir, p), fn(readFileSync(resolve(dir, p), "utf8")));

console.log(`\nCloning template into ${name}/ ...`);
sh(`git clone --quiet --depth 1 --recurse-submodules --shallow-submodules "${template}" "${dir}"`, process.cwd());

// Fresh history. Submodule contents stay as plain vendored dirs so `forge test` works offline.
rm(".git");
rm(".gitmodules");
for (const lib of ["forge-std", "openzeppelin-contracts", "openzeppelin-contracts-upgradeable", "reference"]) {
  rm(`contracts/lib/${lib}/.git`);
}
rm("packages"); // the CLI itself
rm("PLAN.md");

if (!fullstack) {
  rm("apps");
  rm("pnpm-workspace.yaml");
  rm("pnpm-lock.yaml");
  edit("package.json", (s) => s.replace(/,\n\s*"dev": "[^"]*"/, ""));
}
if (!withToken) {
  rm("contracts/src/GameToken.sol");
  rm("contracts/test/GameToken.t.sol");
}

edit("package.json", (s) => s.replace("robinhood-app-boilerplate", name));
edit("README.md", (s) => s.replace(/^# .*$/m, `# ${name}`));
if (fullstack) edit("apps/web/app/layout.tsx", (s) => s.replace('title: "Membership"', `title: "${name}"`));

sh("git init --quiet && git add -A && git commit --quiet -m 'chore: scaffold with create-robinhood-app'");

console.log(`
Done. Next:
  cd ${name}
  ${fullstack ? "pnpm install && " : ""}pnpm verify        # forge fmt --check && forge test${fullstack ? " && tsc && lint" : ""}
  pnpm dryrun        # anvil: deploy → mint → deposit → distribute

Read CLAUDE.md before changing anything. Every chain-4663 address is VERIFY-tagged: confirm
them against official Robinhood Chain docs + explorer before a real deploy.
`);

function exit(msg, code) {
  console[code ? "error" : "log"](msg);
  process.exit(code);
}
