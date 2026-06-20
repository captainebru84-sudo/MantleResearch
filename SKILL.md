---
name: mantle-distribution-friction
description: Measures distribution friction for tokenized RWAs on Mantle — venues count, top-of-book depth, effective spread, reference-price drift, and holder concentration. Outputs a structured Friction Report with verdict THIN / SHALLOW / DEEP, anchored onchain via ERC-8004. Use to answer Mantle's stated thesis ("tokenized assets are solved, distribution isn't") with hard data on any tokenized equity or RWA on Mantle.
---

# Mantle Distribution Friction

## What it does

Takes a tokenized RWA symbol on Mantle (e.g. `NVDAx`, `SPCXx`), measures five microstructure dimensions against live data sources, and emits a structured Friction Report. Each metric is classified `THIN`, `SHALLOW`, or `DEEP`; the overall verdict is the majority bucket (ties resolved toward `THIN`). Every score traces to a re-runnable fetch (Mantle Subgraph query, GeckoTerminal pool probe, Yahoo Finance reference, DefiLlama cross-chain TVL), and every report hash is anchored on Mantle mainnet via ERC-8004 so a verifier can confirm the report has not been mutated since publication.

## How to run

1. `npm install`
2. `cp .env.example .env` and set `MANTLE_RPC_URL`. For onchain attestation also set `ERC8004_PRIVATE_KEY` (a funded Mantle mainnet wallet).
3. Live single asset: `npm run friction -- NVDAx`
4. Live batch (all 7 v1 assets): `npm run friction -- --all`
5. Render JSON reports to Markdown: `npm run render`
6. Register agent once (one-time, mints ERC-8004 agentId on Mantle): `npm run attest-live -- register`
7. Anchor a report onchain: `npm run attest-live -- attest NVDAx` (writes the canonical-JSON keccak256 to the Mantle ERC-8004 Validation Registry, saves attested JSON to `examples/`).

## How it's built

TypeScript ESM, Node 22, viem. Five metric modules under `src/metrics/` each consume one fetcher (`src/fetchers/`) and emit a `{value, score, evidence}` triple. `src/synthesize/verdict.ts` performs the majority synthesis; `src/synthesize/report.ts` assembles the canonical JSON shape. `src/attest-8004/` canonicalizes the JSON (recursive sorted keys), hashes via keccak256, and calls `validationRequest` on the Mantle ERC-8004 Validation Registry. `src/report/render-md.ts` renders each JSON into a clean Markdown summary for human consumption — the canonical artifact is the JSON, since canonical-JSON hashing is deterministic where PDF rendering is not. See `data/xstocks-registry.json` for the curated v1 asset set (7 Backed-issued xStocks) and reference-price routing.
