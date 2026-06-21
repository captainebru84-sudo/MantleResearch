import handler from "../api/friction.ts";

type MockRes = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status: (n: number) => MockRes;
  json: (b: unknown) => MockRes;
  setHeader: (k: string, v: string) => MockRes;
};

function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 0,
    body: undefined,
    headers: {},
    status(n) {
      this.statusCode = n;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
  };
  return res;
}

async function call(query: Record<string, string>) {
  const req = { query, method: "GET", url: "/api/friction" } as unknown as Parameters<
    typeof handler
  >[0];
  const res = mockRes();
  await handler(req, res as unknown as Parameters<typeof handler>[1]);
  return res;
}

const args = process.argv.slice(2);
const mode = args[0];
const value = args[1];

if (!mode || !value) {
  console.error("usage: tsx scripts/smoke-api.mts <symbol|address|missing> <value>");
  console.error("  examples:");
  console.error("    tsx scripts/smoke-api.mts symbol TSLAx");
  console.error("    tsx scripts/smoke-api.mts address 0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0");
  console.error("    tsx scripts/smoke-api.mts symbol UNKNOWN");
  process.exit(1);
}

const query =
  mode === "address" ? { address: value } : mode === "missing" ? {} : { symbol: value };

console.log(`[smoke] GET /api/friction?${new URLSearchParams(query).toString()}`);
const res = await call(query);
console.log(`[smoke] status: ${res.statusCode}`);
console.log(`[smoke] cache: ${res.headers["Cache-Control"] ?? "(none)"}`);
console.log("[smoke] body:");
console.log(JSON.stringify(res.body, null, 2));
