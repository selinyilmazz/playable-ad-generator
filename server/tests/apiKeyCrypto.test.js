/**
 * PERSISTENT USER OPENROUTER API KEYS round — server/services/apiKeyCrypto.js
 * için saf birim testleri (network/DB yok).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");

const apiKeyCrypto = require("../services/apiKeyCrypto");

function withEnvVar(name, value) {
  var previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  return function restore() {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  };
}

function validMasterKey() {
  return crypto.randomBytes(32).toString("base64");
}

test("encryptApiKey/decryptApiKey: round-trip aynı plaintext'i geri verir", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    var plaintext = "sk-or-v1-abcdefghijklmnopqrstuvwxyz0123456789";
    var enc = apiKeyCrypto.encryptApiKey(plaintext);
    assert.equal(apiKeyCrypto.decryptApiKey(enc), plaintext);
  } finally {
    restore();
  }
});

test("encryptApiKey: her çağrı BENZERSİZ bir nonce üretir (aynı plaintext için bile) -- nonce reuse yok", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    var plaintext = "sk-or-v1-same-key-encrypted-twice";
    var enc1 = apiKeyCrypto.encryptApiKey(plaintext);
    var enc2 = apiKeyCrypto.encryptApiKey(plaintext);
    assert.notEqual(enc1.nonce.toString("hex"), enc2.nonce.toString("hex"));
    // Farklı nonce -> farklı ciphertext (GCM), aynı plaintext'e rağmen.
    assert.notEqual(enc1.ciphertext.toString("hex"), enc2.ciphertext.toString("hex"));
    // Her ikisi de KENDİ nonce'uyla doğru şekilde decrypt edilebilir olmalı.
    assert.equal(apiKeyCrypto.decryptApiKey(enc1), plaintext);
    assert.equal(apiKeyCrypto.decryptApiKey(enc2), plaintext);
  } finally {
    restore();
  }
});

test("encryptApiKey: nonce her zaman tam 12 bayt (96 bit)", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    for (var i = 0; i < 5; i++) {
      var enc = apiKeyCrypto.encryptApiKey("sk-or-test-" + i);
      assert.equal(enc.nonce.length, 12);
    }
  } finally {
    restore();
  }
});

test("decryptApiKey: ciphertext'te TEK BİR bit değişse bile decrypt BAŞARISIZ olur (tamper detection)", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    var enc = apiKeyCrypto.encryptApiKey("sk-or-v1-tamper-target-key");
    var tampered = Object.assign({}, enc, { ciphertext: Buffer.from(enc.ciphertext) });
    tampered.ciphertext[0] = tampered.ciphertext[0] ^ 0xff;
    assert.throws(function () {
      apiKeyCrypto.decryptApiKey(tampered);
    }, apiKeyCrypto.DecryptionError);
  } finally {
    restore();
  }
});

test("decryptApiKey: authTag manipüle edilirse decrypt BAŞARISIZ olur (tamper detection)", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    var enc = apiKeyCrypto.encryptApiKey("sk-or-v1-authtag-tamper-target");
    var tampered = Object.assign({}, enc, { authTag: Buffer.from(enc.authTag) });
    tampered.authTag[0] = tampered.authTag[0] ^ 0xff;
    assert.throws(function () {
      apiKeyCrypto.decryptApiKey(tampered);
    }, apiKeyCrypto.DecryptionError);
  } finally {
    restore();
  }
});

test("decryptApiKey: yanlış nonce ile decrypt BAŞARISIZ olur", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    var enc = apiKeyCrypto.encryptApiKey("sk-or-v1-wrong-nonce-target");
    var tampered = Object.assign({}, enc, { nonce: crypto.randomBytes(12) });
    assert.throws(function () {
      apiKeyCrypto.decryptApiKey(tampered);
    }, apiKeyCrypto.DecryptionError);
  } finally {
    restore();
  }
});

test("encryptApiKey: API_KEY_ENCRYPTION_KEY tanımsızsa MasterKeyError fırlatır -- plaintext'e SESSİZCE düşülmez", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", undefined);
  try {
    assert.throws(function () {
      apiKeyCrypto.encryptApiKey("sk-or-v1-should-never-be-stored-as-plaintext");
    }, apiKeyCrypto.MasterKeyError);
  } finally {
    restore();
  }
});

test("encryptApiKey: API_KEY_ENCRYPTION_KEY boş string ise MasterKeyError fırlatır", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", "");
  try {
    assert.throws(function () {
      apiKeyCrypto.encryptApiKey("sk-or-v1-x");
    }, apiKeyCrypto.MasterKeyError);
  } finally {
    restore();
  }
});

test("encryptApiKey: API_KEY_ENCRYPTION_KEY yanlış uzunlukta (32 bayta çözülmeyen) bir değerse MasterKeyError fırlatır", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", Buffer.from("too-short").toString("base64"));
  try {
    assert.throws(function () {
      apiKeyCrypto.encryptApiKey("sk-or-v1-x");
    }, apiKeyCrypto.MasterKeyError);
  } finally {
    restore();
  }
});

test("encryptApiKey: API_KEY_ENCRYPTION_KEY geçersiz/anlamsız bir string ise (base64 DEĞİL bile olsa) MasterKeyError fırlatır, ASLA rastgele bir key İCAT ETMEZ", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", "not-valid-base64-!!!-and-wrong-length");
  try {
    assert.throws(function () {
      apiKeyCrypto.encryptApiKey("sk-or-v1-x");
    }, apiKeyCrypto.MasterKeyError);
  } finally {
    restore();
  }
});

test("decryptApiKey: master key DEĞİŞMİŞSE (ör. rotasyon sonrası eski key ile şifrelenmiş bir satır) decrypt BAŞARISIZ olur, çökmeden throw eder", function () {
  var restoreA = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var enc;
  try {
    enc = apiKeyCrypto.encryptApiKey("sk-or-v1-encrypted-with-key-A");
  } finally {
    restoreA();
  }
  var restoreB = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    assert.throws(function () {
      apiKeyCrypto.decryptApiKey(enc);
    }, apiKeyCrypto.DecryptionError);
  } finally {
    restoreB();
  }
});

test("encryptApiKey: boş/whitespace-only plaintext reddedilir", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    assert.throws(function () { apiKeyCrypto.encryptApiKey(""); });
    assert.throws(function () { apiKeyCrypto.encryptApiKey("   "); });
    assert.throws(function () { apiKeyCrypto.encryptApiKey(null); });
    assert.throws(function () { apiKeyCrypto.encryptApiKey(undefined); });
  } finally {
    restore();
  }
});

test("plaintext, ciphertext alanının İÇİNDE HİÇ görünmez (encode edilmiş bir alt-dize olarak bile)", function () {
  var restore = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    var plaintext = "sk-or-v1-this-exact-string-must-not-leak-into-ciphertext";
    var enc = apiKeyCrypto.encryptApiKey(plaintext);
    var ciphertextHex = enc.ciphertext.toString("hex");
    var ciphertextBase64 = enc.ciphertext.toString("base64");
    assert.equal(ciphertextHex.indexOf(Buffer.from(plaintext, "utf8").toString("hex")), -1);
    assert.equal(ciphertextBase64.indexOf(plaintext), -1);
  } finally {
    restore();
  }
});

test("kod incelemesi: apiKeyCrypto.js hiçbir console çağrısında master key/plaintext/ciphertext/nonce/authTag İÇERMİYOR (statik, yorumlar hariç)", function () {
  var src = fs.readFileSync(require.resolve("../services/apiKeyCrypto.js"), "utf8");
  var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  var logCalls = codeOnly.match(/console\.(log|error|warn|info)\([^)]*\)/g) || [];
  // Bu dosya ZATEN hiçbir console.* çağrısı İÇERMEMELİ (tasarım gereği) --
  // varsa bile hiçbiri değişken adı olarak plaintext/ciphertext/masterKey/
  // nonce/authTag TAŞIMAMALI.
  logCalls.forEach(function (call) {
    assert.equal(/plaintext|ciphertext|masterKey|nonce|authTag/i.test(call), false, "Bir console çağrısı secret bir değişken adı içeriyor olabilir: " + call);
  });
});
