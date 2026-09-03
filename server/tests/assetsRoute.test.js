/**
 * PHASE 5 tests — GET /api/assets.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const assetsRouter = require("../routes/assets");
const { ASSET_MANIFEST, ASSET_GROUPS } = require("../config/assetManifest");

function startTestServer() {
  var app = express();
  app.use("/api", assetsRouter);
  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function getJson(port, path) {
  return new Promise(function (resolve, reject) {
    http
      .get({ hostname: "localhost", port: port, path: path }, function (res) {
        var chunks = "";
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

test("GET /api/assets: 39 asset döner, her biri type/preview/animation/group taşıyor", async function () {
  var ctx = await startTestServer();
  try {
    var res = await getJson(ctx.port, "/api/assets");
    assert.equal(res.status, 200);
    assert.equal(res.body.assets.length, ASSET_MANIFEST.length);
    assert.deepEqual(res.body.groups, ASSET_GROUPS);
    res.body.assets.forEach(function (a) {
      assert.equal(typeof a.type, "string");
      assert.equal(typeof a.preview, "string");
      assert.ok("animation" in a);
      assert.ok(ASSET_GROUPS.indexOf(a.group) !== -1, a.id + ": geçersiz group '" + a.group + "'");
    });
  } finally {
    ctx.server.close();
  }
});

test("GET /api/assets: CHARACTERS grubundaki bir asset gerçek bir animasyon state iskeleti taşıyor", async function () {
  var ctx = await startTestServer();
  try {
    var res = await getJson(ctx.port, "/api/assets");
    var knight = res.body.assets.filter(function (a) { return a.id === "masked_knight_front"; })[0];
    assert.ok(knight);
    assert.equal(knight.group, "CHARACTERS");
    assert.deepEqual(Object.keys(knight.animation).sort(), ["attack", "death", "hit", "idle", "jump", "run"].sort());
  } finally {
    ctx.server.close();
  }
});

test("GET /api/assets: CHARACTERS DIŞI bir asset için animation: null", async function () {
  var ctx = await startTestServer();
  try {
    var res = await getJson(ctx.port, "/api/assets");
    var star = res.body.assets.filter(function (a) { return a.id === "star"; })[0];
    assert.ok(star);
    assert.equal(star.animation, null);
  } finally {
    ctx.server.close();
  }
});
