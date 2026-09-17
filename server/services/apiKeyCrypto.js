/**
 * PERSISTENT USER OPENROUTER API KEYS (Phase 3) — uygulama-seviyesi
 * authenticated encryption (AES-256-GCM).
 *
 * MİMARİ (bkz. Phase 3 analiz round'unun "D. Recommended architecture"i):
 *  - Plaintext OpenRouter key, SADECE bu modülün encrypt/decrypt
 *    fonksiyonlarının çalışması sırasında, geçici olarak server process
 *    belleğinde var olur — hiçbir zaman diske/DB'ye/loga yazılmaz.
 *  - Ciphertext'i çözen/açan TEK anahtar, process.env.API_KEY_ENCRYPTION_KEY
 *    ("master key") — Supabase'in KENDİSİNDEN bağımsız, SADECE bu server
 *    process'inin ortam değişkenlerinde yaşayan bir secret. Veritabanı
 *    (hatta service-role erişimi olan biri bile) bu key'e erişemez.
 *  - Her encryptApiKey() çağrısı, crypto.randomBytes(12) ile TAZE, 96-bit'lik
 *    (GCM için standart/önerilen boyut) bir nonce üretir — AYNI master key
 *    ile bir nonce'un TEKRAR KULLANILMASI GCM'in güvenlik garantisini
 *    (hem gizlilik hem bütünlük) tamamen geçersiz kılar, bu yüzden nonce
 *    HİÇBİR ZAMAN elle/sabit verilmez, HER ZAMAN yeniden rastgele üretilir.
 *  - authTag (GCM'in kimlik doğrulama etiketi), ciphertext/nonce üzerinde
 *    EN KÜÇÜK bir değişikliği (kasıtlı/kasıtsız bit bozulması) decrypt
 *    sırasında BAŞARISIZ kılar (createDecipheriv().final() throw eder) —
 *    bu yüzden "tampered ciphertext" asla sessizce yanlış bir plaintext
 *    üretmez, HER ZAMAN açıkça hata verir.
 *
 * GÜVENLİK (KESİN):
 *  - Bu dosya HİÇBİR ZAMAN: master key'i, plaintext key'i, ciphertext'i,
 *    decrypted key'i, nonce/authTag'i console.log/console.error/console.warn
 *    İLE LOGLAMAZ. Hata mesajları SADECE sabit, secret İÇERMEYEN metinlerdir.
 *  - Master key eksik/yanlış formatta ise SESSİZCE plaintext'e/rastgele bir
 *    yedek key'e DÜŞÜLMEZ — açıkça, hemen throw edilir (MasterKeyError).
 *    Çağıran taraf (userApiKeyPersistence.js) bu hatayı, "stored key
 *    kullanılamıyor" anlamında güvenli bir şekilde ele alır.
 */
const crypto = require("crypto");

var ALGORITHM = "aes-256-gcm";
var KEY_LENGTH_BYTES = 32; // AES-256 -> 32 bayt (256 bit) anahtar.
var NONCE_LENGTH_BYTES = 12; // 96 bit -- GCM için standart/önerilen boyut.
var CURRENT_KEY_VERSION = 1;

function MasterKeyError(message) {
  this.name = "MasterKeyError";
  this.message = message || "API key encryption is not configured correctly.";
}
MasterKeyError.prototype = Object.create(Error.prototype);

function DecryptionError(message) {
  this.name = "DecryptionError";
  this.message = message || "Stored API key could not be decrypted.";
}
DecryptionError.prototype = Object.create(Error.prototype);

/**
 * process.env.API_KEY_ENCRYPTION_KEY -- base64 ile kodlanmış, TAM 32
 * bayta (AES-256) çözülmesi gereken bir string. Eksik/boş/geçersiz
 * base64/yanlış uzunluk -- HEPSİ AYNI, açık MasterKeyError'ı fırlatır;
 * hiçbir durumda "rastgele bir key üret" ya da "plaintext'e düş" YOKTUR
 * (görev md: "do NOT silently fall back to plaintext, do NOT generate a
 * random replacement key automatically").
 */
function loadMasterKey() {
  var raw = process.env.API_KEY_ENCRYPTION_KEY;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    throw new MasterKeyError("API_KEY_ENCRYPTION_KEY is not configured.");
  }

  var buf;
  try {
    buf = Buffer.from(raw.trim(), "base64");
  } catch (err) {
    throw new MasterKeyError("API_KEY_ENCRYPTION_KEY is not valid base64.");
  }

  // Buffer.from(..., "base64") geçersiz karakterlerde THROW ETMEZ, sadece
  // decode'u erken keser -- bu yüzden uzunluk kontrolü, hem "yanlış boyut"
  // HEM "geçersiz base64" durumlarını GÜVENİLİR şekilde yakalayan tek,
  // yeterli kontrol.
  if (buf.length !== KEY_LENGTH_BYTES) {
    throw new MasterKeyError("API_KEY_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded AES-256 key).");
  }

  return buf;
}

/**
 * plaintext: kullanıcının HAM OpenRouter API key'i (string).
 * Dönüş: { ciphertext: Buffer, nonce: Buffer, authTag: Buffer, keyVersion: number }.
 * Master key eksik/geçersizse MasterKeyError fırlatır (çağıran, bu durumda
 * "şifreleme kullanılamıyor" olarak ele almalı -- ASLA plaintext'i olduğu
 * gibi saklamamalı).
 */
function encryptApiKey(plaintext) {
  if (typeof plaintext !== "string" || !plaintext.trim()) {
    throw new Error("encryptApiKey requires a non-empty plaintext string.");
  }

  var key = loadMasterKey();
  var nonce = crypto.randomBytes(NONCE_LENGTH_BYTES);
  var cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
  var ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  var authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext,
    nonce: nonce,
    authTag: authTag,
    keyVersion: CURRENT_KEY_VERSION,
  };
}

/**
 * record: { ciphertext: Buffer, nonce: Buffer, authTag: Buffer, keyVersion?: number }.
 * Dönüş: orijinal plaintext (string).
 * Master key eksik/geçersizse MasterKeyError, ciphertext/nonce/authTag
 * bozuk/eksik/manipüle edilmişse DecryptionError fırlatır -- HİÇBİR
 * durumda sessizce yanlış/boş bir string DÖNMEZ, HER ZAMAN throw eder;
 * "decrypt başarısız olursa güvenli şekilde düş" kararı ÇAĞIRANIN işi
 * (bkz. userApiKeyPersistence.getUserApiKey).
 */
function decryptApiKey(record) {
  if (!record || typeof record !== "object") {
    throw new DecryptionError("decryptApiKey requires a record.");
  }

  var key = loadMasterKey();
  var nonce = toBuffer(record.nonce);
  var authTag = toBuffer(record.authTag);
  var ciphertext = toBuffer(record.ciphertext);

  if (!nonce || nonce.length !== NONCE_LENGTH_BYTES) {
    throw new DecryptionError("Stored API key has an invalid nonce.");
  }
  if (!authTag || authTag.length === 0) {
    throw new DecryptionError("Stored API key has an invalid authentication tag.");
  }
  if (!ciphertext || ciphertext.length === 0) {
    throw new DecryptionError("Stored API key has invalid ciphertext.");
  }

  try {
    var decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAuthTag(authTag);
    // GCM: ciphertext/nonce/authTag üçlüsünden HERHANGİ biri değiştirilmişse
    // (tampering) final() burada throw eder -- catch bloğu bunu, secret
    // içermeyen genel bir DecryptionError'a çevirir.
    var plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch (err) {
    // GÜVENLİK: err (Node'un kendi "Unsupported state or unable to
    // authenticate data" gibi mesajları) hiçbir secret İÇERMEZ, ama yine de
    // burada ORİJİNAL hata objesini/mesajını DIŞARI SIZDIRMIYORUZ -- sabit,
    // genel bir DecryptionError fırlatıyoruz (defense in depth).
    throw new DecryptionError("Stored API key could not be decrypted (invalid key or tampered data).");
  }
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    // userApiKeyPersistence.js, Postgres'ten okuduğu bytea kolonlarını
    // KENDİSİ Buffer'a çeviriyor (bkz. o dosyadaki pgByteaToBuffer) -- bu
    // dal SADECE bu modülün doğrudan (Postgres'siz) birim testlerinde,
    // ham hex string verilme ihtimaline karşı bir güvenlik ağı.
    try {
      return Buffer.from(value, "hex");
    } catch (err) {
      return null;
    }
  }
  return null;
}

module.exports = {
  encryptApiKey: encryptApiKey,
  decryptApiKey: decryptApiKey,
  MasterKeyError: MasterKeyError,
  DecryptionError: DecryptionError,
  // Testler için -- gerçek değerler HİÇBİR ZAMAN loglanmadan/expose
  // edilmeden, SADECE boyut/format sabitlerini dışa açıyor.
  _internal: {
    ALGORITHM: ALGORITHM,
    KEY_LENGTH_BYTES: KEY_LENGTH_BYTES,
    NONCE_LENGTH_BYTES: NONCE_LENGTH_BYTES,
  },
};
