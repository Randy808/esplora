const test = require("node:test");
const assert = require("node:assert/strict");
const render = require("snabbdom-to-html");

const { getPegAccounting } = require("../client/src/lib/peg");
const { pegInfo } = require("../client/src/views/peg-info");
const l10n = require("../client/src/l10n").default;
const { nativeAssetId } = require("../client/src/const");

test("derives federation assets from peg amounts", () => {
  const accounting = getPegAccounting({
    peg_in_amount: 100_000_000_000,
    peg_out_amount: 10_000_000_000,
  });

  assert.equal(accounting.federationAssets, 90_000_000_000);
});

test("handles invalid or incomplete peg amounts", () => {
  const invalidAssets = getPegAccounting({
    peg_in_amount: 100,
    peg_out_amount: 101,
  });
  const incompleteStats = getPegAccounting({
    peg_in_amount: 100,
  });

  assert.equal(invalidAssets.federationAssets, null);
  assert.equal(incompleteStats.federationAssets, null);
});

test("renders holdings in BTC and aggregate volumes with two decimal places", () => {
  const html = render(pegInfo({
    chain_stats: {
      peg_in_count: 10,
      peg_in_amount: 100_000_000_000,
      peg_out_count: 4,
      peg_out_amount: 10_000_000_000,
    },
  }, [], { t: l10n.en, feeEst: null }));

  assert.match(html, />900\.00000000 BTC</);
  assert.match(html, /VOLUME IN<\/div><div class="info-stat-value">~1,000\.00</);
  assert.match(html, /VOLUME OUT<\/div><div class="info-stat-value">~100\.00</);
});

test("passes peg information copy through localization", () => {
  const localizedStrings = new Set();
  const t = (parts, ...values) => {
    const key = parts.join("%s");
    localizedStrings.add(key);
    return parts.reduce(
      (result, part, index) => result + part + (values[index] || ""),
      "",
    );
  };
  const txs = [{
    txid: "a".repeat(64),
    vin: [{ is_pegin: true }],
    vout: [{ asset: nativeAssetId, value: 600 }],
    status: { confirmed: true, block_height: 100, block_time: 1000 },
  }, {
    txid: "b".repeat(64),
    vin: [],
    vout: [{ asset: nativeAssetId, value: 400, pegout: {} }],
    status: { confirmed: false },
  }];

  render(pegInfo({
    chain_stats: {
      peg_in_count: 1,
      peg_in_amount: 600,
      peg_out_count: 1,
      peg_out_amount: 400,
    },
  }, txs, { t, feeEst: null }));

  [
    "Proof of Reserves",
    "Federation BTC Holdings",
    "Confirmed peg-ins minus confirmed peg-outs.",
    "Last change on %s",
    "Recent Peg-Ins/Outs",
    "PEG-IN",
    "PEG-OUT",
    "VOLUME IN",
    "VOLUME OUT",
    "TYPE",
    "TXID",
    "AMOUNT",
    "BLOCK",
    "ETA",
    "Estimated time until the peg transaction is confirmed.",
    "Peg-in",
    "Peg-out",
    "Confirmed",
    "N/A",
  ].forEach((message) => assert.ok(
    localizedStrings.has(message),
    `Missing localized string: ${message}`,
  ));
});

test("expands a transaction containing both peg directions into two event rows", () => {
  const txid = "a".repeat(64);
  const html = render(pegInfo({
    chain_stats: {
      peg_in_count: 1,
      peg_in_amount: 1010,
      peg_out_count: 1,
      peg_out_amount: 400,
    },
  }, [{
    txid,
    vin: [{ is_pegin: true }],
    vout: [
      { asset: nativeAssetId, value: 600 },
      { asset: nativeAssetId, value: 400, pegout: {} },
      { asset: nativeAssetId, value: 10, scriptpubkey_type: "fee" },
    ],
    status: { confirmed: true, block_height: 100, block_time: 1000 },
  }], { t: l10n.en, feeEst: null }));

  assert.equal((html.match(new RegExp(`href="tx/${txid}"`, "g")) || []).length, 2);
  assert.match(html, /Peg-in/);
  assert.match(html, /Peg-out/);
  assert.match(html, /0\.00001010 BTC/);
  assert.match(html, /0\.00000400 BTC/);
});

test("subtracts regular native inputs when deriving a peg-in amount", () => {
  const html = render(pegInfo({
    chain_stats: {
      peg_in_count: 1,
      peg_in_amount: 610,
      peg_out_count: 0,
      peg_out_amount: 0,
    },
  }, [{
    txid: "b".repeat(64),
    vin: [
      { is_pegin: true },
      {
        is_pegin: false,
        prevout: { asset: nativeAssetId, value: 400 },
      },
    ],
    vout: [
      { asset: nativeAssetId, value: 1000 },
      { asset: nativeAssetId, value: 10, scriptpubkey_type: "fee" },
    ],
    status: { confirmed: true, block_height: 100, block_time: 1000 },
  }], { t: l10n.en, feeEst: null }));

  assert.match(html, /0\.00000610 BTC/);
});

test("shows at most seven recent peg transactions", () => {
  const txs = Array.from({ length: 8 }, (_, index) => ({
    txid: String(index + 1).repeat(64),
    vin: [{ is_pegin: true }],
    vout: [{ asset: nativeAssetId, value: 100 + index }],
    status: {
      confirmed: true,
      block_height: 100 + index,
      block_time: 1000 + index,
    },
  }));
  const html = render(pegInfo({
    chain_stats: {
      peg_in_count: 8,
      peg_in_amount: 828,
      peg_out_count: 0,
      peg_out_amount: 0,
    },
  }, txs, { t: l10n.en, feeEst: null }));

  assert.equal((html.match(/href="tx\//g) || []).length, 7);
  assert.doesNotMatch(html, new RegExp(`href="tx/${txs[0].txid}"`));
});

test("renders an unavailable state when peg requests fail", () => {
  const html = render(pegInfo(null, null, {
    t: l10n.en,
    feeEst: null,
    error: true,
  }));

  assert.match(html, /Peg data is currently unavailable\./);
  assert.doesNotMatch(html, /loading/);
});

test("keeps previous peg data visible when a refresh fails", () => {
  const html = render(pegInfo({
    chain_stats: {
      peg_in_count: 10,
      peg_in_amount: 100_000_000_000,
      peg_out_count: 4,
      peg_out_amount: 10_000_000_000,
    },
  }, [], {
    t: l10n.en,
    feeEst: null,
    error: true,
  }));

  assert.match(html, /Unable to refresh — showing previous data\./);
  assert.match(html, />900\.00000000 BTC</);
  assert.doesNotMatch(html, /Peg data is currently unavailable\./);
});
