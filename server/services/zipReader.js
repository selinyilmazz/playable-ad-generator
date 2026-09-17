/**
 * CUSTOM ASSET LIBRARY round — bağımsız, minimal, GÜVENLİ bir ZIP okuyucu.
 *
 * Bilerek YENİ bir npm dependency (adm-zip/unzipper/yauzl vb.) EKLENMEDİ:
 * (1) bu proje bugüne kadar sadece dotenv+express kullanıyor, (2) gerçek
 * makinede `device_bash` şu an devre dışı (bkz. AI MODEL SELECTOR round
 * raporundaki limitation) — yeni bir dependency, Selin `npm install`
 * ÇALIŞTIRANA kadar teslim edilen kodun ÇALIŞMAMASI riski taşır. Sadece
 * Node'un kendi çekirdek modülleri (`zlib`) kullanılıyor.
 *
 * SADECE central directory'den (güvenilir kaynak — local header'daki
 * boyutlar "data descriptor" biti set edilmişse sıfır/yanlış olabilir)
 * okunuyor; local header SADECE dosya verisinin gerçek başlangıç offset'ini
 * bulmak için kullanılıyor (kendi boyut alanlarına GÜVENİLMİYOR).
 *
 * Desteklenmeyen/şüpheli her durumda (ZIP64, bilinmeyen sıkıştırma yöntemi,
 * bozuk/sınır-dışı offset, symlink) SESSİZCE bir şey UYDURMAK yerine açık
 * bir ZipError fırlatılır — çağıran (customAssetLibrary.js) bunu 400'e
 * çevirir, server ASLA çökmez (try/catch route seviyesinde).
 */
const zlib = require("zlib");

var EOCD_SIGNATURE = 0x06054b50;
var CENTRAL_DIR_SIGNATURE = 0x02014b50;
var LOCAL_HEADER_SIGNATURE = 0x04034b50;
var EOCD_MIN_SIZE = 22;
var MAX_COMMENT_SIZE = 65535;

function ZipError(message) {
  this.name = "ZipError";
  this.message = message;
}
ZipError.prototype = Object.create(Error.prototype);
ZipError.prototype.constructor = ZipError;

function findEndOfCentralDirectory(buffer) {
  var scanFloor = Math.max(0, buffer.length - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);
  for (var i = buffer.length - EOCD_MIN_SIZE; i >= scanFloor; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

/**
 * buffer: yüklenen ZIP'in tam ham byte'ları.
 * Dönüş: [{ name, method, compressedSize, uncompressedSize,
 *           localHeaderOffset, isDirectory, isSymlink }, ...]
 * ZIP64 (4-byte alanlarda 0xFFFFFFFF sentinel) veya bozuk/sınır-dışı bir
 * central directory bulunursa ZipError fırlatır.
 */
function readCentralDirectory(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < EOCD_MIN_SIZE) {
    throw new ZipError("Geçerli bir ZIP dosyası değil (dosya çok küçük).");
  }

  var eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset === -1) {
    throw new ZipError("Geçerli bir ZIP dosyası değil (End Of Central Directory imzası bulunamadı).");
  }

  var totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  var centralDirSize = buffer.readUInt32LE(eocdOffset + 12);
  var centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (totalEntries === 0xffff || centralDirSize === 0xffffffff || centralDirOffset === 0xffffffff) {
    throw new ZipError("ZIP64 formatı desteklenmiyor.");
  }
  if (centralDirOffset + centralDirSize > buffer.length) {
    throw new ZipError("Bozuk ZIP: central directory dosya sınırlarının dışında.");
  }

  var entries = [];
  var offset = centralDirOffset;

  for (var i = 0; i < totalEntries; i++) {
    if (offset + 46 > buffer.length) {
      throw new ZipError("Bozuk ZIP: central directory kaydı eksik/kesik.");
    }
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIR_SIGNATURE) {
      throw new ZipError("Bozuk ZIP: beklenmeyen central directory imzası.");
    }

    var method = buffer.readUInt16LE(offset + 10);
    var compressedSize = buffer.readUInt32LE(offset + 20);
    var uncompressedSize = buffer.readUInt32LE(offset + 24);
    var nameLen = buffer.readUInt16LE(offset + 28);
    var extraLen = buffer.readUInt16LE(offset + 30);
    var commentLen = buffer.readUInt16LE(offset + 32);
    var externalAttrs = buffer.readUInt32LE(offset + 38);
    var localHeaderOffset = buffer.readUInt32LE(offset + 42);

    var nameStart = offset + 46;
    if (nameStart + nameLen > buffer.length) {
      throw new ZipError("Bozuk ZIP: dosya adı alanı sınır dışı.");
    }
    var name = buffer.toString("utf8", nameStart, nameStart + nameLen);

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      throw new ZipError("ZIP64 formatı desteklenmiyor: " + name);
    }
    if (localHeaderOffset >= buffer.length) {
      throw new ZipError("Bozuk ZIP: local header offset sınır dışı (" + name + ").");
    }

    // Unix external attributes'ın üst 16 biti dosya modudur (bkz. unzip
    // kaynak kodu/ZIP spesifikasyonu convention'ı) — S_IFLNK (0xA000)
    // sembolik link demektir. Sembolik linkler GÜVENLİK gereği (extraction
    // dizini dışına işaret edebilirler) TAMAMEN reddediliyor.
    var unixMode = (externalAttrs >>> 16) & 0xffff;
    var isSymlink = (unixMode & 0xf000) === 0xa000;
    var isDirectory = name.charAt(name.length - 1) === "/" || (externalAttrs & 0x10) !== 0;

    entries.push({
      name: name,
      method: method,
      compressedSize: compressedSize,
      uncompressedSize: uncompressedSize,
      localHeaderOffset: localHeaderOffset,
      isDirectory: isDirectory,
      isSymlink: isSymlink,
    });

    offset = nameStart + nameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * entry: readCentralDirectory()'nin döndürdüğü bir kayıt.
 * Dönüş: dosyanın ham (sıkıştırılmamış) içeriği (Buffer).
 * entry.compressedSize/uncompressedSize (CENTRAL DIRECTORY'den, güvenilir)
 * kullanılır — local header'ın KENDİ boyut alanlarına hiç bakılmaz (bazı
 * yazıcılar "data descriptor" biti ile bunları 0 bırakabilir).
 */
function extractEntry(buffer, entry) {
  var offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length) {
    throw new ZipError("Bozuk ZIP: local header sınır dışı (" + entry.name + ").");
  }
  if (buffer.readUInt32LE(offset) !== LOCAL_HEADER_SIGNATURE) {
    throw new ZipError("Bozuk ZIP: beklenmeyen local header imzası (" + entry.name + ").");
  }

  var nameLen = buffer.readUInt16LE(offset + 26);
  var extraLen = buffer.readUInt16LE(offset + 28);
  var dataStart = offset + 30 + nameLen + extraLen;
  var dataEnd = dataStart + entry.compressedSize;

  if (dataStart > buffer.length || dataEnd > buffer.length) {
    throw new ZipError("Bozuk ZIP: dosya verisi sınır dışı (" + entry.name + ").");
  }

  var compressed = buffer.slice(dataStart, dataEnd);

  if (entry.method === 0) {
    return compressed;
  }
  if (entry.method === 8) {
    try {
      return zlib.inflateRawSync(compressed);
    } catch (err) {
      throw new ZipError("ZIP içeriği açılamadı (" + entry.name + "): " + err.message);
    }
  }
  throw new ZipError("Desteklenmeyen sıkıştırma yöntemi (" + entry.method + "): " + entry.name);
}

module.exports = {
  ZipError: ZipError,
  readCentralDirectory: readCentralDirectory,
  extractEntry: extractEntry,
};
