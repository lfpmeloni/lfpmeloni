# real-estate-mcp.md

> realtor-mcp: a read-only MCP connector that lets AI chat assistants answer US housing-market questions with cited publisher data instead of made-up numbers.

- Status: deployed, refreshed nightly, research MVP for a private client
- Period: September 2026 - October 2026
- Role: freelance engineer, sole developer
- Links: private repo (client work)

## Problem

Ask a chat assistant about home prices in a US metro and you get a confident number from nowhere. Or worse, an average of two figures that measure different things: one publisher's "typical home value" index against another's actual median sale price. The client wanted an assistant that answers housing questions only from real, cited data, names the period it covers, and says when the data is stale.

## Solution

An MCP server[^mcp] with five tools: `list_metrics`, `find_region`, `get_market_data`, `market_snapshot` and `get_mortgage_rates`. The data comes from five public publishers: the FHFA house price index[^fhfa-hpi], Freddie Mac mortgage rates, Zillow Research, Realtor.com research and the Redfin Data Center. That's 17 feeds in total, covering the country, states, metros and counties, with history back to the 1970s where the source has it.

The server's own instructions tell the model to never average or substitute one publisher's metric for another's, to always cite the observation period, and to disclose stale data.

## Architecture

There are two halves: a nightly data pipeline in GitHub Actions and a small read-only server. The server never fetches anything during a tool call. It only queries the snapshot that shipped with the deployment.

```text
 GitHub Actions (nightly · on push · manual)
   tests ─► restore encrypted last-good state
         ─► conditional GET per feed (ETag / Last-Modified)
         ─► download changed feeds ─► normalize to Parquet (DuckDB)
         ─► validate snapshot (no lost series, no shrinking history)
         ─► vercel build ─► byte-for-byte bundle check
         ─► candidate deploy ─► live MCP smoke test ─► promote
         ─► save encrypted state

 Vercel Python function
   FastMCP (stateless HTTP, JSON) ─► DuckDB over bundled Parquet
   /health · /readyz · privacy + terms pages
```

## Engineering decisions

- **Snapshots baked into the deploy, not live fetching.** Answers are fast and reproducible, and an upstream outage never breaks a tool call. The cost is up to a day of latency, which is fine for monthly and weekly housing data.
- **Validation gates before every release.** A refresh that loses a series or shortens its history is rejected. The build runs on one DuckDB thread[^duckdb] in 512 MiB, to stay well inside the limits the deployment has.
- **Bounded answers.** At most 600 points per series and 6,000 per call, and truncation is flagged in the response, so the model knows it didn't get everything.
- **Strict geography.** Regions match only on official codes or crosswalks[^crosswalk] I checked by hand: Fairfax County is not Fairfax City, and a metro division[^metro-division] is never relabeled as its parent metro.
- **State without a database.** The last good state lives in an encrypted GitHub Actions cache[^actions-cache]. If the key changes, the pipeline bootstraps from scratch and nothing is lost.
- **Deploy only on real change.** It redeploys only when the data hash or backend-code hash changes, so docs-only pushes don't redeploy. The first version shipped as Docker on Fly.io[^fly-io]. I moved it to native Vercel Python functions, which removed a whole hosting layer.

### What broke and how I fixed it

- **Production ran old code.** Vercel's native Python build cached the package wheel[^wheel] and kept shipping a stale copy of the app. I keyed the build cache on the source files and added a check that compares every bundled file byte for byte with the repo.
- **A failed run lost the last good state.** When an upstream refresh failed, the pipeline never recorded what was still valid. State is now saved even when the run fails.
- **Clean runners failed where my cache hid the bug.** On a fresh runner, the Zillow and Redfin crosswalks were built before the reference data they depend on existed. I fixed the build order and included the resolved crosswalk in the cache fingerprint.
- **`vercel promote` didn't work with a team token.** It looked up a personal user. I replaced it with a small script that calls the team-scoped API, checks the deployment is ready and production-built, and waits for the domain alias.
- **Upstream hiccups failed the pipeline three nights in a row.** Transient publisher errors failed the nightly run and filled my inbox with failure alerts. Those are now warnings: no deploy, the last good data stays live, and only real pipeline failures fail the run.

## Outcome

- **Works:** five tools over five publishers, refreshed nightly, with the smoke test[^smoke-test] against the real endpoint as the gate.
- **Delivered:** 26 commits in about three weeks, 47 tests plus a golden-questions suite[^golden-questions], nightly runs green.
- **Still rough:** the end-to-end usability test inside the client's chat assistant, authentication on the endpoint, city-level boundaries, and one publisher's legacy feed that has stopped updating (correctly flagged as stale).

## Evidence

- Repository: private client work. I can walk through the pipeline and run the golden questions in an interview.
- Architecture: diagram above.

## Stack

`Python` `MCP` `FastMCP` `DuckDB` `Parquet` `GitHub Actions` `Vercel`

## Glossary for nerds

[^mcp]: **MCP** (Model Context Protocol) - an open standard for connecting AI assistants to tools and data through one common interface. Here: the assistant calls these tools instead of guessing numbers.
[^fhfa-hpi]: **FHFA HPI** - the US Federal Housing Finance Agency's house price index, built from repeat sales of the same homes. Here: one of the official long-history sources, going back to the 1970s.
[^fastmcp]: **FastMCP** - a Python framework for building MCP servers from plain decorated functions. Here: the five tools are typed Python functions.
[^stateless-http]: **Stateless HTTP** - every request stands alone, with no session kept on the server. Here: it fits serverless functions, which can start and stop at any time.
[^conditional-get]: **Conditional GET** - a request that only downloads a file if it changed since last time, using its ETag or Last-Modified date. Here: the nightly run skips feeds that didn't change.
[^parquet]: **Parquet** - a compressed, column-oriented file format for tabular data. Here: decades of housing data ship inside the deployment and load fast.
[^duckdb]: **DuckDB** - an in-process analytical SQL database, like SQLite for analytics. Here: it queries the bundled data files directly, with no database server to run.
[^crosswalk]: **Crosswalk** - a mapping table between two geography code systems. Here: every publisher names regions differently, and the crosswalks make sure a metro is the same metro everywhere.
[^metro-division]: **Metro division** - an official subdivision of a very large US metro area, such as part of New York's. Here: data for a division is never relabeled as the whole metro.
[^actions-cache]: **GitHub Actions cache** - storage that persists files between CI runs. Here: it keeps the last good state, encrypted, so no database is needed.
[^fly-io]: **Fly.io** - a platform that runs Docker containers on servers around the world. Here: the first host, later replaced by native Vercel functions to drop a hosting layer.
[^wheel]: **Wheel** - Python's built-package format. Here: a cached wheel kept shipping old code until the cache key included the source files.
[^smoke-test]: **Smoke test** - a quick check that a deployed system basically works. Here: a candidate deployment must answer real MCP calls before it's promoted to production.
[^golden-questions]: **Golden questions** - a fixed set of real questions with known correct answers, rerun after every change. Here: they check what the assistant answers end to end, not just the code.
[^readyz]: **`/health` and `/readyz`** - endpoints that report whether a service is alive and ready to take traffic. Here: deploy checks and monitoring use them.
