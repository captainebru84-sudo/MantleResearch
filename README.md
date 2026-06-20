# Mantle Distribution Friction

A Claude Skill that measures how distributed a tokenized RWA actually is on Mantle.

Mantle's own thesis says tokenized assets are solved, distribution isn't. This Skill answers that question with numbers: for any given tokenized equity or RWA on Mantle, it measures **venues count**, **top-of-book depth**, **effective spread**, **reference-price drift**, and **holder concentration**, then emits a verdict — `THIN`, `SHALLOW`, or `DEEP` — anchored onchain via ERC-8004.

## Quickstart

```bash
npm install
cp .env.example .env       # set MANTLE_RPC_URL
npm run demo               # offline, fixture-backed
npm run friction -- NVDAx  # live
```

See [`SKILL.md`](./SKILL.md) for the full Skill manifest and usage.

## v1 asset coverage

Seven Backed-issued xStocks on Mantle: `TSLAx`, `NVDAx`, `AAPLx`, `MSFTx`, `METAx`, `AMZNx`, `SPCXx`. Registry in [`data/xstocks-registry.json`](./data/xstocks-registry.json).

## Built for

[Mantle Research Challenge](https://www.mantle.xyz/) — Track 2 (Research Agent) of The Turing Test Hackathon 2026.

## License

MIT
