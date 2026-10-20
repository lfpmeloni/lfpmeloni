# financial-portfolio-agents.md

> open-decade: understand your whole financial picture by talking to the agent you already use, while the records stay in a local vault and every number can be traced back to its inputs. Open source.

- Status: v0.1.0 in development, not yet released
- Period: October 2026 - Present
- Role: sole author (public repo plus a private planning and research repo)
- Links: [github.com/lfpmeloni/open-decade](https://github.com/lfpmeloni/open-decade)

## Problem

Most "AI for your finances" products want you to upload your bank exports to their servers. Then they hand you a number you can't check. I wanted the opposite, especially for anyone whose money is spread across countries and currencies: ask an agent about my net worth, cashflow, goals, retirement or a housing decision, and get answers that are reproducible, cite their inputs, and say "I don't know" when the data isn't there.

Two rules came first and everything else follows from them. **Unknown is not zero**: missing data is shown as missing, not quietly treated as zero. **The software never moves money**: no orders, no transfers, ever.

## Solution

A local toolkit with three front doors over the same operations:

- `od`, a CLI: doctor, init, import preview/apply, reports, exports, backup/restore/migrate.
- A stdio[^stdio] **MCP server**[^mcp] with bounded tools, so Claude, Codex or any MCP host can be the agent.
- A local **browser app** (React) served by a loopback-only[^loopback] Node service with a session token and host/origin checks.

Imports cover generic and mapped CSV, OFX/QFX[^ofx], Wise, IBKR Flex[^ibkr-flex] and ECB reference FX[^ecb-fx]. On top of that sit deterministic methods: the financial picture, spending, a diagnosis, goals, life planning, household views, Monte Carlo simulation[^monte-carlo], and routing of tax documents across seven jurisdictions. The capability registry currently lists 55 capabilities, 50 stable and 5 experimental.

## Architecture

There is no LLM inside the code. The agent you bring is the LLM. It reads `AGENTS.md` plus a set of Markdown workflows, which act as skills, and calls the tools. Anything the agent extracts from a PDF or screenshot goes through the same preview → confirm → apply path as a CSV.

```text
 You ⇄ your agent (any MCP host or CLI, brings its own model)
          │              │                  │
       od CLI       MCP (stdio)     browser UI ⇄ local Node
          └──────────────┼──────────────────┘
                         ▼
           operations layer (one dispatcher)
           ├─ schema validation (Ajv, versioned)
           ├─ deterministic methods (decimal.js, seeded MC)
           └─ import adapters (CSV, OFX, Wise, IBKR, ECB)
                         │
      preview → confirmation digest → atomic batch write
                         ▼
 local vault (outside the code tree): immutable JSON batches,
 profile, reviews, raw sources · knowledge/: written methods
```

## Engineering decisions

- **Determinism over cleverness.** All money math uses decimal.js[^decimal-js] and amounts are stored as decimal strings. The Monte Carlo runs on a versioned, seeded PCG32 generator[^pcg32], so the same seed gives the same paths on any machine. Every report records its input IDs, data dates, software and method versions, assumptions and missing coverage. Reproducing a result never needs the agent.
- **Append-only vault.**[^append-only] Imports are immutable batches. A correction replaces a record by ID instead of rewriting it. A vault-wide writer lock and staged atomic renames[^atomic-rename] protect writes. A confirmation is tied to a digest[^digest] of the file *and* the current vault state, so a stale preview can't be applied.
- **Partial answers instead of false reassurance.** If FX rates are missing, totals stay per currency. If history is missing, profit and savings rate are blocked. If policy data is missing, the diagnosis won't say "you're fine".
- **Small, pinned, offline-installable.** Plain JavaScript ES modules on a pinned Node version, six runtime dependencies, a lockfile that installs with `npm ci`[^npm-ci] offline. One runtime covers the CLI, the server, MCP and the UI build, and there is very little to audit.
- **Privacy is stated precisely.** No telemetry. Network calls only happen on explicit fetch commands to fixed endpoints. Broker tokens live in the OS credential store[^credential-store], never in the vault or the agent's context. The README also says plainly: local storage does not mean local inference, because your agent's model still sees what you show it.
- **Research stays private, methods stay original.** I keep a separate private repo for planning and reference research. It decided which concepts to adopt, and every public method is written from scratch.

### What broke and how I fixed it

- **Duplicate imports slipped past the overlap check.** An independent review found that writing the same amount with a different decimal spelling, or importing through a corrected account alias, bypassed duplicate detection. The overlap check now compares canonical amounts and resolved accounts, and each bypass is a regression test.
- **Goals double-counted the same money.** Two goals could both claim the same funds and both show as on track. Competing claims now return "progress unavailable" instead of a reassuring double count. Fractional funding came later, with tests against over-claiming through corrected IDs.
- **Rounding noise invented shortfalls.** Monthly roundoff could add up to an annual shortfall that didn't exist, while a real shortfall smaller than display precision could vanish. Methods version 2 handles both directions, and each has its own test.
- **The release gate passed with tests skipped.** Skipped Node tests exited 0, and a missing browser report also counted as a pass. The release check now fails closed[^fail-closed] on any skip, flaky test, missing report or dirty tree.

## Outcome

- **Works:** CLI, MCP server and local UI over one vault. Imports, reports, simulations and exports are all deterministic and traceable.
- **Delivered:** 129 Node tests and 15 Chromium tests, all passing on the recorded release run. All fixtures are synthetic. The adversarial cases include hostile CSV, OFX external entities[^xxe], archive path traversal[^path-traversal], symlinks and concurrent writers.
- **Still rough:** certified only on Linux/WSL2 and Chromium so far, more bank and broker layouts are needed, there's no published release yet, and the name and regulatory position need a review before any promotion. OCR, tax filing, trading and an embedded chat are out of scope on purpose.

## Evidence

- Public repository: [github.com/lfpmeloni/open-decade](https://github.com/lfpmeloni/open-decade), including the methods, schemas, workflows and tests
- Private planning repo: not shared. I can talk through the research process in an interview.
- Architecture: diagram above.

## Stack

`JavaScript` `Node.js` `MCP` `React` `Vite` `decimal.js` `Ajv` `Playwright` `GitHub Actions`

## Glossary for nerds

[^stdio]: **stdio** - communication over a program's standard input and output, with no network port. Here: the agent starts the MCP server as a local process, so nothing is exposed on the network.
[^mcp]: **MCP** (Model Context Protocol) - an open standard for connecting AI assistants to tools and data through one common interface. Here: any MCP-capable agent, such as Claude or Codex, can use the toolkit without a custom integration.
[^loopback]: **Loopback** - the 127.0.0.1 network interface, reachable only from the same machine. Here: the browser app's server can't be reached from the local network or the internet.
[^ofx]: **OFX/QFX** (Open Financial Exchange) - XML file formats banks offer for exporting transactions; QFX is Quicken's variant. Here: a standard way to import bank history without screen scraping.
[^ibkr-flex]: **IBKR Flex** - Interactive Brokers' Flex Queries, configurable account statements. Here: the import path for brokerage positions and trades.
[^ecb-fx]: **ECB reference FX** - the daily euro exchange rates published by the European Central Bank. Here: a public, citable source for converting multi-currency totals.
[^monte-carlo]: **Monte Carlo simulation** - running a plan thousands of times over random market paths to see the spread of outcomes. Here: retirement and goal projections show ranges and probabilities, not one number.
[^decimal-js]: **decimal.js** - a library for exact decimal arithmetic; plain JavaScript numbers are binary floats, where 0.1 + 0.2 is not 0.3. Here: money math never picks up float rounding errors.
[^pcg32]: **Seeded PCG32** - a small, fast pseudo-random number generator; the same seed always gives the same sequence. Here: any simulation can be reproduced exactly on any machine.
[^ajv]: **Ajv** - a JSON Schema validator for JavaScript. Here: vault records and imports are checked against versioned schemas before anything is written.
[^append-only]: **Append-only** - records are only ever added; a correction is a new record that replaces the old one by ID. Here: every past report can be traced to the exact data it used.
[^atomic-rename]: **Atomic rename** - write to a temporary file, then rename it into place in one step that either fully happens or doesn't. Here: a crash mid-write can't leave a half-written vault.
[^digest]: **Confirmation digest** - a hash of the previewed file together with the vault state at preview time. Here: if anything changed since the preview, the confirmation no longer matches and the import is refused.
[^npm-ci]: **`npm ci`** - installs exactly the versions in the lockfile and fails if it disagrees with package.json. Here: installs are reproducible, even offline, over a small dependency set.
[^credential-store]: **OS credential store** - the operating system's secure secret storage: Keychain, Windows Credential Manager, Secret Service on Linux. Here: broker tokens never sit in plain files or in the agent's context.
[^fail-closed]: **Fail closed** - when a check can't decide, it blocks instead of letting things through. Here: a skipped test or a missing report stops the release instead of passing it.
[^xxe]: **XXE** (XML External Entities) - an attack where an XML file makes the parser read local files or call URLs. Here: OFX is XML, so hostile bank files are part of the test suite.
[^path-traversal]: **Path traversal** - a file name like `../../etc/passwd` that escapes the intended folder. Here: restoring a backup archive must never write outside the vault.
