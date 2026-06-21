const KNOWN_SYMBOLS = ["TSLAx", "NVDAx", "AAPLx", "MSFTx", "METAx", "AMZNx", "SPCXx"];
const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

const METRIC_LABELS = {
  venueCount: "Venue count",
  depthUsd: "Depth (USD)",
  spreadBps: "Spread (bps)",
  referenceDriftBps: "Drift vs underlying (bps)",
  concentrationPct: "Top-10 concentration",
};

const SCORE_CLASS = {
  THIN: "s-thin",
  SHALLOW: "s-shallow",
  DEEP: "s-deep",
  "N/A": "s-na",
};

const BADGE_CLASS = {
  THIN: "badge-thin",
  SHALLOW: "badge-shallow",
  DEEP: "badge-deep",
  "N/A": "badge-na",
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function fmtMetricValue(name, value) {
  if (value === null || value === undefined) return "n/a";
  if (name === "depthUsd") return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (name === "concentrationPct") return `${Number(value).toFixed(2)}%`;
  if (name === "venueCount") return String(value);
  return String(value);
}

function renderMetric(name, metric) {
  const score = metric.score ?? "N/A";
  return el("details", { class: "metric" }, [
    el("summary", {}, [
      el("span", { class: "metric-name", text: METRIC_LABELS[name] ?? name }),
      el("span", { class: "metric-value", text: fmtMetricValue(name, metric.value) }),
      el("span", { class: `metric-score ${SCORE_CLASS[score] ?? "s-na"}`, text: score }),
    ]),
    el("div", { class: "metric-evidence", text: metric.evidence ?? "" }),
  ]);
}

function renderCrossChain(ctx) {
  if (!ctx) return null;
  const rows = [];
  for (const chain of ["solana", "arbitrum", "ethereum"]) {
    const entry = ctx[chain];
    if (!entry) continue;
    rows.push(
      el("div", { class: "cc-row" }, [
        el("span", { text: chain }),
        el("span", {
          text: `${entry.venues} venue${entry.venues === 1 ? "" : "s"} · $${Number(entry.tvlUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })} TVL`,
        }),
      ])
    );
  }
  if (rows.length === 0) return null;
  return el("div", { class: "cross-chain" }, [
    el("div", { class: "label", text: "Cross-chain TVL (for context)" }),
    ...rows,
  ]);
}

function renderAttestation(att) {
  if (!att?.txHash) return null;
  return el("div", { class: "attest-footer" }, [
    el("span", { class: "label", text: `agent ${att.agentId}` }),
    el("span", { class: "label", text: "·" }),
    el("span", { class: "label", text: "report" }),
    el("span", { text: shortHash(att.reportHash) }),
    el("span", { class: "label", text: "·" }),
    el("a", {
      href: att.explorerUrl ?? `https://mantlescan.xyz/tx/${att.txHash}`,
      target: "_blank",
      rel: "noopener",
      text: `tx ${shortHash(att.txHash)}`,
    }),
  ]);
}

function renderCard(report, opts = {}) {
  const verdict = report.verdict ?? "N/A";
  const card = el("article", {
    class: `card${opts.live ? " card-live" : ""}`,
    "data-symbol": report.asset?.symbol,
  });

  const head = el("div", { class: "card-head" }, [
    el("div", {}, [
      el("div", { class: "card-symbol", text: report.asset?.symbol ?? "?" }),
      el("div", { class: "card-name", text: report.asset?.name ?? "" }),
    ]),
    el("span", { class: `badge ${BADGE_CLASS[verdict] ?? "badge-na"}`, text: verdict }),
  ]);
  card.appendChild(head);

  const meta = el("div", { class: "card-meta" }, [
    el("div", {}, [
      el("span", { class: "label", text: "issuer: " }),
      el("span", { class: "value", text: report.asset?.issuer ?? "?" }),
    ]),
    el("div", {}, [
      el("span", { class: "label", text: "contract: " }),
      el("a", {
        href: `https://mantlescan.xyz/token/${report.asset?.contract}`,
        target: "_blank",
        rel: "noopener",
        text: shortAddr(report.asset?.contract),
      }),
    ]),
  ]);
  card.appendChild(meta);

  const metrics = el("div", { class: "metrics" });
  for (const name of ["venueCount", "depthUsd", "spreadBps", "referenceDriftBps", "concentrationPct"]) {
    const m = report.metrics?.[name];
    if (m) metrics.appendChild(renderMetric(name, m));
  }
  card.appendChild(metrics);

  const verdictRow = el("div", { class: "verdict-row" }, [
    el("span", { text: "Verdict:" }),
    el("span", { class: `badge ${BADGE_CLASS[verdict] ?? "badge-na"}`, text: verdict }),
  ]);
  card.appendChild(verdictRow);
  if (report.verdictReason) {
    card.appendChild(el("div", { class: "verdict-reason", text: report.verdictReason }));
  }

  const cc = renderCrossChain(report.crossChainContext);
  if (cc) card.appendChild(cc);

  const att = renderAttestation(report.attestation);
  if (att) card.appendChild(att);

  if (opts.live) {
    card.appendChild(
      el("div", {
        class: "live-footer",
        text: "Live result — not attested. The reports above are the canonical onchain proof (agent 136).",
      })
    );
  }

  return card;
}

async function loadGallery() {
  const gallery = document.getElementById("gallery");
  try {
    const reports = await Promise.all(
      KNOWN_SYMBOLS.map(async (sym) => {
        const r = await fetch(`/reports/${sym.toLowerCase()}-friction-report.json`);
        if (!r.ok) throw new Error(`${sym}: HTTP ${r.status}`);
        return r.json();
      })
    );
    gallery.innerHTML = "";
    for (const report of reports) {
      gallery.appendChild(renderCard(report));
    }
  } catch (err) {
    gallery.innerHTML = "";
    gallery.appendChild(
      el("p", {
        class: "loading",
        text: `Failed to load reports: ${err.message}`,
      })
    );
  }
}

function showError(msg) {
  const banner = document.getElementById("live-error");
  banner.textContent = msg;
  banner.hidden = false;
}

function clearError() {
  const banner = document.getElementById("live-error");
  banner.hidden = true;
  banner.textContent = "";
}

async function runLive(query) {
  const target = document.getElementById("live-result");
  const button = document.getElementById("run-btn");
  target.innerHTML = "";
  clearError();

  let url;
  if (ADDR_RE.test(query)) {
    url = `/api/friction?address=${encodeURIComponent(query)}`;
  } else {
    const match = KNOWN_SYMBOLS.find((s) => s.toLowerCase() === query.toLowerCase());
    if (!match) {
      showError(`"${query}" is neither a known ticker (${KNOWN_SYMBOLS.join(", ")}) nor a 0x address.`);
      return;
    }
    url = `/api/friction?symbol=${encodeURIComponent(match)}`;
  }

  button.disabled = true;
  button.textContent = "Running…";
  target.appendChild(el("p", { class: "loading", text: "Computing friction live (may take 10–20 seconds)…" }));

  try {
    const res = await fetch(url);
    const body = await res.json().catch(() => ({ error: "non-JSON response" }));
    if (!res.ok) {
      target.innerHTML = "";
      showError(body.error ?? `HTTP ${res.status}`);
      return;
    }
    target.innerHTML = "";
    target.appendChild(renderCard(body, { live: true }));
  } catch (err) {
    target.innerHTML = "";
    showError(`Network error: ${err.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Run";
  }
}

document.getElementById("live-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const query = document.getElementById("live-input").value.trim();
  if (!query) return;
  runLive(query);
});

loadGallery();
