/**
 * PERSISTENT USER OPENROUTER API KEYS (Phase 3) — `api_keys` tablosu için
 * CRUD katmanı. server/services/gamePersistence.js İLE BİREBİR AYNI
 * mimari/güvenlik desenini takip eder (bkz. o dosyanın dosya başı notu):
 *
 *  - Her çağrı, route katmanının ZATEN doğruladığı (attachUser) bir
 *    userId/accessToken ALIR -- bu dosya hiçbir zaman req.body/query'den
 *    bir "userId" OKUMAZ.
 *  - RLS'in auth.uid()'i DOĞRU değerlendirmesi için her çağrı, çağıranın
 *    KENDİ access token'ıyla kurulan, İSTEK-BAZLI bir Supabase client'ı
 *    kullanır (createRequestScopedClient) -- ASLA SUPABASE_SERVICE_ROLE_KEY
 *    kullanılmaz, bu client HER ZAMAN anon key ile kurulur.
 *  - user_id kolonu YAZILIRKEN SADECE parametre olarak geçirilen `userId`
 *    kullanılır; update/delete/select sorguları RLS'e EK OLARAK
 *    `.eq("user_id", userId)` ile de filtrelenir (defense in depth).
 *  - access token hiçbir zaman loglanmaz.
 *
 * EK GÜVENLİK (Phase 3'e ÖZGÜ, bu dosyanın KENDİ sorumluluğu):
 *  - Plaintext API key, BU DOSYANIN DIŞINA (route/response) HİÇBİR ZAMAN
 *    dönmez -- getUserApiKey() SADECE server-içi başka bir fonksiyon
 *    (openrouterClient.resolveEffectiveApiKey) tarafından çağrılmalı, bir
 *    route handler'ından DEĞİL (bkz. server/routes/apiKeys.js -- o dosya
 *    bu fonksiyonu HİÇ import etmiyor).
 *  - Şifreleme/çözme işleminin KENDİSİ apiKeyCrypto.js'e devredilir -- bu
 *    dosya SADECE Postgres bytea kolonları <-> Buffer dönüşümünü ve
 *    Supabase sorgularını yönetir, kriptografik mantık İÇERMEZ.
 *  - Decrypt başarısız olursa (bozuk veri, master key değişmiş/kayıp)
 *    getUserApiKey() bunu YUKARI FIRLATMAZ -- null döner (çağıran taraf,
 *    "stored key yok" davranışına güvenli şekilde düşer, bkz. o
 *    fonksiyonun kendi yorumu).
 */
const { createClient } = require("@supabase/supabase-js");
const supabaseConfig = require("../config/supabase");
const apiKeyCrypto = require("./apiKeyCrypto");

var TABLE = "api_keys";
var SUPPORTED_PROVIDERS = ["openrouter"];

function PersistenceUnavailableError(message) {
  this.name = "PersistenceUnavailableError";
  this.message = message || "API key storage is not available right now.";
  this.status = 503;
}
PersistenceUnavailableError.prototype = Object.create(Error.prototype);

function PersistenceError(message, status) {
  this.name = "PersistenceError";
  this.message = message || "Could not complete the requested API key operation.";
  this.status = status || 500;
}
PersistenceError.prototype = Object.create(Error.prototype);

function isSupportedProvider(provider) {
  return SUPPORTED_PROVIDERS.indexOf(provider) !== -1;
}

/**
 * gamePersistence.createRequestScopedClient İLE BİREBİR AYNI desen --
 * ANON key + çağıranın KENDİ access token'ı. Service role KESİNLİKLE
 * kullanılmaz.
 */
function createRequestScopedClient(accessToken) {
  if (!supabaseConfig.isConfigured || !accessToken) return null;
  return createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: "Bearer " + accessToken } },
  });
}

// TEST SEAM -- gamePersistence.js İLE AYNI amaç/kısıt: SADECE testler
// kullanır, production kodunun hiçbir yerinde override edilmez.
var activeClientFactory = createRequestScopedClient;

function requireClient(accessToken) {
  var client = activeClientFactory(accessToken);
  if (!client) throw new PersistenceUnavailableError();
  return client;
}

function toPersistenceError(error) {
  if (error && error.code === "42501") {
    return new PersistenceError("You do not have permission to modify this API key.", 403);
  }
  return new PersistenceError("Could not reach the API key storage right now.", 502);
}

// ---------------------------------------------------------------------
// Postgres `bytea` <-> Node Buffer. PostgREST/Postgres, bytea kolonlarını
// JSON'da varsayılan "hex" text-output formatıyla ("\x" önekli hex string)
// serileştirir/kabul eder (bytea_output=hex, Postgres varsayılanı) -- bu
// yüzden hem YAZARKEN hem OKURKEN aynı, kendi kendine tutarlı kodlamayı
// kullanıyoruz. Bu iki fonksiyon SAF/network-siz -- kendi round-trip
// testleriyle (bkz. server/tests/apiKeyPersistence.test.js) doğrulanır.
// ---------------------------------------------------------------------
function bufferToPgBytea(buf) {
  return "\\x" + buf.toString("hex");
}

function pgByteaToBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value !== "string") return null;
  var hex = value.indexOf("\\x") === 0 ? value.slice(2) : value;
  try {
    return Buffer.from(hex, "hex");
  } catch (err) {
    return null;
  }
}

function rowToDecryptRecord(row) {
  return {
    ciphertext: pgByteaToBuffer(row.ciphertext),
    nonce: pgByteaToBuffer(row.nonce),
    authTag: pgByteaToBuffer(row.auth_tag),
    keyVersion: row.key_version,
  };
}

/**
 * accessToken/userId: route katmanının (attachUser'dan) doğruladığı
 * değerler -- ASLA req.body'den gelmez.
 * provider: SADECE server/routes/apiKeys.js'in ZATEN doğruladığı bir
 * değer (bkz. isSupportedProvider) -- bu fonksiyon YİNE DE kendi başına
 * doğrular (defense in depth, bu dosyanın başka bir çağıranı olursa bile
 * güvenli kalsın diye).
 * plaintextKey: kullanıcının HAM key'i -- encrypt edilmeden HİÇBİR
 * satıra/loga yazılmaz.
 * Dönüş: { provider, hasKey: true, updatedAt } -- plaintext/ciphertext
 * HİÇBİR ZAMAN dönmez.
 */
async function saveUserApiKey(accessToken, userId, provider, plaintextKey) {
  if (!isSupportedProvider(provider)) {
    throw new PersistenceError("Unsupported provider.", 400);
  }
  if (typeof plaintextKey !== "string" || !plaintextKey.trim()) {
    throw new PersistenceError("A non-empty API key is required.", 400);
  }

  var client = requireClient(accessToken);

  var encrypted;
  try {
    encrypted = apiKeyCrypto.encryptApiKey(plaintextKey.trim());
  } catch (err) {
    // MasterKeyError (API_KEY_ENCRYPTION_KEY eksik/geçersiz) -- KESİNLİKLE
    // plaintext'e düşülmez, açık ama secret-free bir hata fırlatılır.
    throw new PersistenceError("API key encryption is not available right now.", 503);
  }

  var row = {
    user_id: userId,
    provider: provider,
    nonce: bufferToPgBytea(encrypted.nonce),
    auth_tag: bufferToPgBytea(encrypted.authTag),
    ciphertext: bufferToPgBytea(encrypted.ciphertext),
    key_version: encrypted.keyVersion,
  };

  var result = await client.from(TABLE).upsert(row, { onConflict: "user_id,provider" }).select().single();
  if (result.error) throw toPersistenceError(result.error);

  return {
    provider: result.data.provider,
    hasKey: true,
    updatedAt: result.data.updated_at,
  };
}

/**
 * Route katmanı için -- ciphertext/nonce/authTag'i HİÇ SELECT ETMEZ, bu
 * yüzden bunları yanlışlıkla bir response'a taşıma riski yapısal olarak
 * yok. Dönüş: { provider, hasKey, updatedAt }.
 */
async function getUserApiKeyStatus(accessToken, userId, provider) {
  if (!isSupportedProvider(provider)) {
    throw new PersistenceError("Unsupported provider.", 400);
  }
  var client = requireClient(accessToken);
  var result = await client
    .from(TABLE)
    .select("provider, updated_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (result.error) throw toPersistenceError(result.error);

  return {
    provider: provider,
    hasKey: !!result.data,
    updatedAt: result.data ? result.data.updated_at : null,
  };
}

/**
 * SADECE server-içi kullanım için -- bkz. dosya başı notu. Bir route
 * handler'ından ASLA çağrılmamalı/döndürülmemeli.
 *
 * Dönüş: plaintext string (bulunduysa VE decrypt başarılıysa), aksi
 * HALDE null -- satır yoksa, Supabase/ağ hatası olursa, VEYA decrypt
 * başarısız olursa (bozuk veri/master key değişmiş) HEPSİ AYNI, güvenli
 * "null" sonucuna düşer; hiçbiri bu fonksiyonun ÇAĞIRANINA (openrouterClient.
 * resolveEffectiveApiKey) throw etmez -- o fonksiyon bu sayede HER ZAMAN
 * güvenli şekilde bir sonraki tier'a (server key/mock) düşebilir.
 */
async function getUserApiKey(accessToken, userId, provider) {
  try {
    if (!isSupportedProvider(provider)) return null;
    var client = requireClient(accessToken);
    var result = await client
      .from(TABLE)
      .select("ciphertext, nonce, auth_tag, key_version")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();

    if (result.error || !result.data) return null;

    return apiKeyCrypto.decryptApiKey(rowToDecryptRecord(result.data));
  } catch (err) {
    // GÜVENLİK: err (Supabase/ağ hatası VEYA apiKeyCrypto.DecryptionError/
    // MasterKeyError) hiçbir secret İÇERMEZ, ama yine de burada SADECE
    // sabit/genel bir mesaj logluyoruz -- err.message'ı bile YAZDIRMIYORUZ
    // (defense in depth: bu satırın gelecekte yanlışlıkla değiştirilip
    // hassas bir detay eklenmesi riskini baştan sıfırlıyor).
    console.error("[userApiKeyPersistence] stored API key could not be retrieved/decrypted; falling back safely.");
    return null;
  }
}

/**
 * Dönüş: { provider, hasKey: false } -- satır var olsun ya da olmasın
 * (idempotent), her zaman aynı, dürüst şekli döner.
 */
async function deleteUserApiKey(accessToken, userId, provider) {
  if (!isSupportedProvider(provider)) {
    throw new PersistenceError("Unsupported provider.", 400);
  }
  var client = requireClient(accessToken);
  var result = await client
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider)
    .select();
  if (result.error) throw toPersistenceError(result.error);

  return !!(result.data && result.data.length > 0);
}

module.exports = {
  saveUserApiKey: saveUserApiKey,
  getUserApiKeyStatus: getUserApiKeyStatus,
  getUserApiKey: getUserApiKey,
  deleteUserApiKey: deleteUserApiKey,
  isSupportedProvider: isSupportedProvider,
  SUPPORTED_PROVIDERS: SUPPORTED_PROVIDERS,
  PersistenceUnavailableError: PersistenceUnavailableError,
  PersistenceError: PersistenceError,
  _internal: {
    bufferToPgBytea: bufferToPgBytea,
    pgByteaToBuffer: pgByteaToBuffer,
    rowToDecryptRecord: rowToDecryptRecord,
    createRequestScopedClient: createRequestScopedClient,
    setClientFactoryForTests: function (fn) {
      activeClientFactory = fn;
    },
    resetClientFactoryForTests: function () {
      activeClientFactory = createRequestScopedClient;
    },
  },
};
