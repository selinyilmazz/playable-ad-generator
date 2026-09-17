/**
 * CUSTOM ASSET LIBRARY round — şirketlerin kendi asset paketlerini
 * yükleyebilmesi için registry + validation + güvenli extraction katmanı.
 *
 * MİMARİ KARAR (Ali Bey'in 2. geri bildirimi): mevcut 181 default asset
 * (server/config/assetManifest.js + packs/*.js) HİÇ DEĞİŞMEDİ, HİÇ
 * OKUNMADI/YAZILMADI. Bu dosya TAMAMEN AYRI, additive bir "custom library"
 * katmanı — default sistemi bir PARALEL registry olarak GENİŞLETİYOR, onun
 * YERİNE geçmiyor (bkz. server/routes/assets.js'teki merge noktası).
 *
 * NAMESPACE İZOLASYONU (görev md.7 "Tercih: custom asset'leri library
 * namespace ile ayır"): her custom asset'in DIŞA DÖNÜK id'si
 * "custom_<libraryId>_<manifestteki-orijinal-id>" şeklinde — bu, default
 * 181 asset'in id'leriyle (hiçbiri "custom_" ile başlamıyor) VE farklı
 * custom library'ler arasında ÇAKIŞMANIN MATEMATİKSEL OLARAK İMKANSIZ
 * olmasını garanti eder (libraryId her upload'ta crypto.randomBytes ile
 * üretilir, bkz. allocateLibraryId). Orijinal id ayrıca `originalId`
 * alanında saklanır (şeffaflık için).
 *
 * STORAGE: public/uploads/asset-libraries/<libraryId>/<manifestteki path> —
 * server zaten public/'u statik servis ediyor (bkz. server/index.js), bu
 * yüzden ayrı bir static route eklemeye GEREK YOK. Bir registry.json dosyası
 * (aynı klasörde) upload'ların server restart'larında hayatta kalmasını
 * sağlar — bu, in-memory bir Map'ten daha gerçekçi/kullanışlı ama hâlâ
 * "development ortamında local storage" (görev md.11) kapsamında basit bir
 * çözüm; DB/cloud storage YOK (kapsam dışı, md.16).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readCentralDirectory, extractEntry, ZipError } = require("./zipReader");
const { CATEGORY_TO_GROUP, categoryToGroup } = require("../config/assetManifest");
const { listGameTypeKeys } = require("../config/assetKits");

var DEFAULT_UPLOAD_ROOT = path.join(__dirname, "..", "..", "public", "uploads", "asset-libraries");
var REGISTRY_FILENAME = "registry.json";

var VALID_CATEGORIES = Object.keys(CATEGORY_TO_GROUP);
var SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

// Güvenlik/kalite limitleri (görev md.12 "reasonable server limits").
var MAX_ZIP_ENTRIES = 2000;
var MAX_ASSETS_PER_LIBRARY = 300;
var MAX_SINGLE_FILE_BYTES = 8 * 1024 * 1024; // 8MB / dosya
var MAX_TOTAL_UNCOMPRESSED_BYTES = 60 * 1024 * 1024; // 60MB / upload (zip-bomb koruması, central directory'nin BEYAN ettiği boyuttan — inflate ÖNCESİ kontrol edilir)

var uploadRoot = DEFAULT_UPLOAD_ROOT;
var libraries = [];
var registryLoaded = false;

function ValidationError(message, details) {
  this.name = "ValidationError";
  this.message = message;
  this.details = details || [];
}
ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.constructor = ValidationError;

function ensureLoaded() {
  if (registryLoaded) return;
  registryLoaded = true;
  try {
    var raw = fs.readFileSync(path.join(uploadRoot, REGISTRY_FILENAME), "utf8");
    var parsed = JSON.parse(raw);
    libraries = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // Dosya yok (ilk çalıştırma) veya bozuk -> boş başla, ASLA çökme.
    libraries = [];
  }
}

function persistRegistrySync() {
  try {
    fs.mkdirSync(uploadRoot, { recursive: true });
    var tmpPath = path.join(uploadRoot, REGISTRY_FILENAME + ".tmp");
    fs.writeFileSync(tmpPath, JSON.stringify(libraries, null, 2));
    fs.renameSync(tmpPath, path.join(uploadRoot, REGISTRY_FILENAME));
  } catch (err) {
    // Registry dosyaya yazılamasa bile in-memory state (bu process ömrü
    // boyunca) geçerliliğini korur — upload isteği bu yüzden ÇÖKMEMELİ,
    // sadece bir sonraki restart'ta bu library kaybolabilir. Sessizce log.
    console.error("[customAssetLibrary] registry.json yazılamadı:", err.message);
  }
}

/**
 * p: hem ZIP entry adı (dizinler dahil) hem manifest'teki `path` alanı için
 * ortak güvenlik kontrolü. Mutlak yol, sürücü harfi, ".." bileşeni veya
 * ters slash içeren HERHANGİ bir değer reddedilir.
 */
function isSafeRelativePath(p) {
  if (typeof p !== "string" || p.length === 0) return false;
  if (p.indexOf("\\") !== -1) return false;
  if (p.charAt(0) === "/") return false;
  if (/^[a-zA-Z]:/.test(p)) return false;
  var parts = p.split("/");
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] === "" || parts[i] === ".." || parts[i] === ".") return false;
  }
  return true;
}

function isSafeZipEntryName(name) {
  var n = name.charAt(name.length - 1) === "/" ? name.slice(0, -1) : name;
  if (n.length === 0) return true; // kök dizin kaydı ("/"), zararsız
  return isSafeRelativePath(n);
}

function getExtension(p) {
  var match = /\.[^./]+$/.exec(p);
  return match ? match[0].toLowerCase() : "";
}

function slugify(name) {
  var slug = String(name || "library")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "library";
}

function allocateLibraryId(name) {
  var base = slugify(name);
  var candidate;
  do {
    candidate = base + "-" + crypto.randomBytes(4).toString("hex");
  } while (libraries.some(function (l) { return l.id === candidate; }));
  return candidate;
}

/**
 * entries: readCentralDirectory()'nin tüm ZIP kaydı. manifest.json'ı ya ZIP
 * KÖKÜNDE ya da TEK bir üst klasör altında ("my-assets/manifest.json" —
 * bir klasörü zip'lerken oluşan yaygın durum) arar. İkisi de yoksa null.
 * Dönüş: { entry, rootPrefix } — rootPrefix, sonraki tüm path'lerin bu
 * kaydırma ile karşılaştırılması için (örn. "my-assets/").
 */
function findManifestEntry(entries) {
  var rootManifest = entries.filter(function (e) { return !e.isDirectory && e.name === "manifest.json"; })[0];
  if (rootManifest) return { entry: rootManifest, rootPrefix: "" };

  var topDirs = {};
  var everyEntryHasTopDir = true;
  entries.forEach(function (e) {
    var slashIndex = e.name.indexOf("/");
    if (slashIndex === -1) { everyEntryHasTopDir = false; return; }
    topDirs[e.name.slice(0, slashIndex)] = true;
  });

  var topDirNames = Object.keys(topDirs);
  if (everyEntryHasTopDir && topDirNames.length === 1) {
    var prefix = topDirNames[0] + "/";
    var nested = entries.filter(function (e) { return !e.isDirectory && e.name === prefix + "manifest.json"; })[0];
    if (nested) return { entry: nested, rootPrefix: prefix };
  }

  return null;
}

function stripRootPrefix(name, rootPrefix) {
  if (!rootPrefix) return name;
  if (name.indexOf(rootPrefix) !== 0) return null;
  return name.slice(rootPrefix.length);
}

/**
 * Ham manifest.json içeriğini doğrular ve normalize eder. SADECE ŞEKİL/
 * FORMAT kontrolü yapar (id benzersizliği/formatı, category enum'u, path'in
 * GÜVENLİ bir string ŞEKLİNDE olması) — path'in ZIP içinde GERÇEKTEN var
 * olup olmadığı (dosya varlığı/uzantı/boyut) registerLibrary()'de, entries
 * elinde olduğunda kontrol edilir.
 */
function validateManifestShape(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ValidationError("manifest.json bir JSON obje olmalı.");
  }

  var name = typeof manifest.name === "string" && manifest.name.trim() ? manifest.name.trim() : "Custom Library";
  var version = typeof manifest.version === "string" && manifest.version.trim() ? manifest.version.trim() : "1.0.0";

  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new ValidationError("manifest.json'da en az 1 öğe içeren bir 'assets' dizisi olmalı.");
  }
  if (manifest.assets.length > MAX_ASSETS_PER_LIBRARY) {
    throw new ValidationError(
      "Çok fazla asset (" + manifest.assets.length + "), limit: " + MAX_ASSETS_PER_LIBRARY + "."
    );
  }

  var problems = [];
  var seenIds = {};
  var gameTypeKeys = listGameTypeKeys();

  var normalized = manifest.assets.map(function (raw, index) {
    var label = "assets[" + index + "]";
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      problems.push(label + ": geçerli bir obje değil.");
      return null;
    }

    var id = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!id) {
      problems.push(label + ": 'id' zorunlu ve boş olamaz.");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      problems.push(label + ": 'id' sadece harf/rakam/-/_ içerebilir (aldı: '" + id + "').");
    } else if (seenIds[id]) {
      problems.push(label + ": yinelenen id '" + id + "' (aynı manifest içinde).");
    } else {
      seenIds[id] = true;
    }

    var category = typeof raw.category === "string" ? raw.category.trim() : "";
    if (!category) {
      problems.push(label + " (id: " + (id || "?") + "): 'category' zorunlu.");
    } else if (VALID_CATEGORIES.indexOf(category) === -1) {
      problems.push(
        label + " (id: " + (id || "?") + "): geçersiz category '" + category +
        "' (geçerli değerler: " + VALID_CATEGORIES.join(", ") + ")."
      );
    }

    var assetPath = typeof raw.path === "string" ? raw.path.trim() : "";
    if (!assetPath) {
      problems.push(label + " (id: " + (id || "?") + "): 'path' zorunlu.");
    } else if (!isSafeRelativePath(assetPath)) {
      problems.push(label + " (id: " + (id || "?") + "): güvensiz/geçersiz 'path' ('" + assetPath + "').");
    }

    // kit/role OPSİYONEL metadata (görev md.6) — kit, MEVCUT GAME_KITS
    // anahtarlarından biri değilse SESSİZCE null'a düşer (hard-reject
    // DEĞİL: bu sadece bir zenginleştirme ipucu, asset'in KENDİSİ yine de
    // kaydedilir/görünür/genel amaçlı kullanılabilir olur).
    var kit = typeof raw.kit === "string" && gameTypeKeys.indexOf(raw.kit) !== -1 ? raw.kit : null;
    var role = typeof raw.role === "string" && raw.role.trim() ? raw.role.trim() : null;
    var tags = Array.isArray(raw.tags) ? raw.tags.filter(function (t) { return typeof t === "string"; }) : [];

    return {
      id: id,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : id,
      category: category,
      path: assetPath,
      kit: kit,
      role: role,
      tags: tags,
    };
  });

  if (problems.length > 0) {
    throw new ValidationError("manifest.json doğrulaması başarısız.", problems);
  }

  return { name: name, version: version, assets: normalized };
}

function toPublicLibrarySummary(lib) {
  return {
    id: lib.id,
    name: lib.name,
    version: lib.version,
    assetCount: lib.assets.length,
    createdAt: lib.createdAt,
  };
}

/**
 * zipBuffer: yüklenen ZIP dosyasının ham byte'ları (Buffer).
 * Dönüş (başarı): toPublicLibrarySummary() şekli — { id, name, version,
 * assetCount, createdAt }.
 * Başarısızlık: ValidationError fırlatır (message + opsiyonel details[]),
 * hiçbir şey diske/registry'e YAZILMAZ (all-or-nothing). Route katmanı bunu
 * 400'e çevirir — server ASLA çökmez.
 */
function registerLibrary(zipBuffer) {
  ensureLoaded();

  var entries;
  try {
    entries = readCentralDirectory(zipBuffer);
  } catch (err) {
    if (err instanceof ZipError) throw new ValidationError("ZIP okunamadı: " + err.message);
    throw err;
  }

  if (entries.length === 0) {
    throw new ValidationError("ZIP dosyası boş.");
  }
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new ValidationError("ZIP çok fazla dosya içeriyor (" + entries.length + "), limit: " + MAX_ZIP_ENTRIES + ".");
  }

  // Extraction'dan ÖNCE, HER entry (manifest'in referans etmediği dosyalar
  // dahil) güvenlik için taranır — path traversal/symlink asla diske
  // yazılmadan reddedilir.
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.isSymlink) {
      throw new ValidationError("Güvenlik reddi: ZIP bir sembolik link içeriyor ('" + e.name + "').");
    }
    if (!isSafeZipEntryName(e.name)) {
      throw new ValidationError("Güvenlik reddi: ZIP güvensiz bir dosya yolu içeriyor ('" + e.name + "').");
    }
  }

  var manifestLocation = findManifestEntry(entries);
  if (!manifestLocation) {
    throw new ValidationError("manifest.json bulunamadı (ZIP kök dizininde veya tek bir üst klasör altında olmalı).");
  }

  var manifestRaw;
  try {
    manifestRaw = extractEntry(zipBuffer, manifestLocation.entry).toString("utf8");
  } catch (err) {
    throw new ValidationError("manifest.json açılamadı: " + err.message);
  }

  var manifestJson;
  try {
    manifestJson = JSON.parse(manifestRaw);
  } catch (err) {
    throw new ValidationError("manifest.json geçerli bir JSON değil: " + err.message);
  }

  var validated = validateManifestShape(manifestJson);

  var entryByPath = {};
  entries.forEach(function (e) {
    if (e.isDirectory) return;
    var relative = stripRootPrefix(e.name, manifestLocation.rootPrefix);
    if (relative != null) entryByPath[relative] = e;
  });

  var problems = [];
  var totalUncompressed = 0;

  validated.assets.forEach(function (asset, index) {
    var label = "assets[" + index + "] (id: " + asset.id + ")";
    var zipEntry = entryByPath[asset.path];

    if (!zipEntry) {
      problems.push(label + ": path '" + asset.path + "' ZIP içinde bulunamadı.");
      return;
    }

    var ext = getExtension(asset.path);
    if (SUPPORTED_EXTENSIONS.indexOf(ext) === -1) {
      problems.push(
        label + ": desteklenmeyen dosya formatı '" + (ext || "(uzantısız)") +
        "' (desteklenen: " + SUPPORTED_EXTENSIONS.join(", ") + ")."
      );
      return;
    }

    if (zipEntry.uncompressedSize > MAX_SINGLE_FILE_BYTES) {
      problems.push(
        label + ": dosya çok büyük (" + zipEntry.uncompressedSize + " bayt, limit: " + MAX_SINGLE_FILE_BYTES + ")."
      );
      return;
    }

    totalUncompressed += zipEntry.uncompressedSize;
    asset._zipEntry = zipEntry; // dahili, extraction adımında kullanılacak — dışa açılmıyor
  });

  if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
    problems.push(
      "Toplam asset boyutu limiti aşıyor (" + totalUncompressed + " bayt, limit: " + MAX_TOTAL_UNCOMPRESSED_BYTES + ")."
    );
  }

  if (problems.length > 0) {
    throw new ValidationError("Asset library doğrulaması başarısız (" + problems.length + " sorun).", problems);
  }

  // Buraya kadar geldiyse HER ŞEY doğrulandı. Extraction (diske yazma)
  // SADECE manifest'in referans ettiği dosyalar için yapılır — ZIP'teki
  // başka hiçbir dosyaya dokunulmaz (görev md.4: "manifest dışında erişim
  // sağlamasın").
  var libraryId = allocateLibraryId(validated.name);
  var libraryDir = path.join(uploadRoot, libraryId);
  var resolvedLibraryDir = path.resolve(libraryDir);

  try {
    fs.mkdirSync(libraryDir, { recursive: true });

    var registeredAssets = validated.assets.map(function (asset) {
      var content = extractEntry(zipBuffer, asset._zipEntry);
      var destPath = path.resolve(path.join(libraryDir, asset.path));

      // Savunma derinliği: path zaten isSafeRelativePath ile format olarak
      // doğrulandı, ama son bir kez GERÇEK çözülmüş dosya yolunun library
      // dizini dışına çıkmadığını teyit ediyoruz.
      if (destPath.indexOf(resolvedLibraryDir + path.sep) !== 0) {
        throw new ValidationError("Güvenlik reddi: '" + asset.path + "' library dizini dışına yazmaya çalıştı.");
      }

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, content);

      var namespacedId = "custom_" + libraryId.replace(/-/g, "_") + "_" + asset.id;
      var publicUrl = "/uploads/asset-libraries/" + libraryId + "/" + asset.path;

      return {
        id: namespacedId,
        originalId: asset.id,
        name: asset.name,
        category: asset.category,
        tags: asset.tags,
        path: publicUrl,
        compatibleGameTypes: [],
        kit: asset.kit,
        role: asset.role || asset.category,
        libraryId: libraryId,
        libraryName: validated.name,
        type: "image",
        preview: publicUrl,
        animation: null,
        group: categoryToGroup(asset.category),
      };
    });

    var summary = {
      id: libraryId,
      name: validated.name,
      version: validated.version,
      createdAt: new Date().toISOString(),
      assets: registeredAssets,
    };

    libraries.push(summary);
    persistRegistrySync();

    return toPublicLibrarySummary(summary);
  } catch (err) {
    // Kısmi yazılmış dizini best-effort temizle — registry'e HİÇ eklenmedi
    // (push, yazma adımlarından SONRA çalışıyor), bu yüzden tutarsız bir
    // "yarım" library asla listelenmez.
    try { fs.rmSync(libraryDir, { recursive: true, force: true }); } catch (cleanupErr) { /* yok say */ }
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("Asset library kaydedilirken beklenmeyen bir hata oluştu: " + err.message);
  }
}

function listLibraries() {
  ensureLoaded();
  return libraries.map(toPublicLibrarySummary);
}

function listAllCustomAssets() {
  ensureLoaded();
  var out = [];
  libraries.forEach(function (lib) {
    lib.assets.forEach(function (a) { out.push(a); });
  });
  return out;
}

/** Sadece manifest'te `kit` alanıyla BEYAN EDİLMİŞ (uydurma eşleme YOK) custom assetleri döner. */
function getCustomAssetsForKit(kitKey) {
  if (!kitKey) return [];
  return listAllCustomAssets().filter(function (a) { return a.kit === kitKey; });
}

function getCustomAssetsForKitRole(kitKey, role) {
  return getCustomAssetsForKit(kitKey).filter(function (a) { return a.role === role; });
}

/**
 * gameType/kit eşleşmesi YOKKEN (serbest/eşleşmeyen bir prompt) devreye
 * giren basit bir anahtar-kelime ön-filtresi — "bütün custom library'yi
 * körlemesine LLM'e gönderme" riskini azaltır (görev md.9). Bilerek
 * gameTypeDetection.js'in ağırlıklı skorlama sistemini KOPYALAMIYOR — çok
 * daha basit bir substring/kelime örtüşmesi yeterli, bu sadece bir ön-filtre.
 */
function getCustomAssetsRelevantToPrompt(prompt, limit) {
  var text = String(prompt || "").toLowerCase();
  if (!text) return [];

  var scored = listAllCustomAssets()
    .map(function (a) {
      var haystack = [a.name, a.category, a.role || ""].concat(a.tags || []).join(" ").toLowerCase();
      var words = haystack.split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; });
      var hits = words.filter(function (w) { return text.indexOf(w) !== -1; }).length;
      return { asset: a, hits: hits };
    })
    .filter(function (entry) { return entry.hits > 0; })
    .sort(function (x, y) { return y.hits - x.hits; });

  return scored.slice(0, limit || 12).map(function (entry) { return entry.asset; });
}

/**
 * TEST-ONLY: in-memory state'i sıfırlar ve upload root'unu (varsa) geçici
 * bir dizine yönlendirir — testler gerçek public/uploads/ klasörüne HİÇ
 * yazmasın diye (bkz. server/tests/customAssetLibrary.test.js). Production
 * kod yolunda ÇAĞRILMAZ.
 */
function _resetForTests(customRoot) {
  uploadRoot = customRoot || DEFAULT_UPLOAD_ROOT;
  libraries = [];
  registryLoaded = true; // customRoot'tan disk okuması YAPMA — testler her zaman temiz başlar
}

function _getUploadRootForTests() {
  return uploadRoot;
}

module.exports = {
  ValidationError: ValidationError,
  registerLibrary: registerLibrary,
  listLibraries: listLibraries,
  listAllCustomAssets: listAllCustomAssets,
  getCustomAssetsForKit: getCustomAssetsForKit,
  getCustomAssetsForKitRole: getCustomAssetsForKitRole,
  getCustomAssetsRelevantToPrompt: getCustomAssetsRelevantToPrompt,
  SUPPORTED_EXTENSIONS: SUPPORTED_EXTENSIONS,
  VALID_CATEGORIES: VALID_CATEGORIES,
  MAX_ASSETS_PER_LIBRARY: MAX_ASSETS_PER_LIBRARY,
  MAX_SINGLE_FILE_BYTES: MAX_SINGLE_FILE_BYTES,
  MAX_TOTAL_UNCOMPRESSED_BYTES: MAX_TOTAL_UNCOMPRESSED_BYTES,
  MAX_ZIP_ENTRIES: MAX_ZIP_ENTRIES,
  isSafeRelativePath: isSafeRelativePath,
  _resetForTests: _resetForTests,
  _getUploadRootForTests: _getUploadRootForTests,
};
