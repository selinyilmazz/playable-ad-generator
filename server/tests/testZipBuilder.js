/**
 * CUSTOM ASSET LIBRARY round — testler için, SIFIR harici dependency'li
 * (Node'un kendi `zlib`'i dışında) minimal bir ZIP YAZICI.
 *
 * Neden testler `zip` CLI'sini ÇAĞIRMIYOR: `npm test` Selin'in Windows
 * makinesinde de çalışabilmeli (bkz. AI MODEL SELECTOR round raporundaki
 * `device_bash` limitation notu) — bir shell aracına (zip/7z) bağımlı
 * fixture üretimi taşınabilir DEĞİL. Bunun yerine server/services/
 * zipReader.js'in okuduğu AYNI formatı (local header + central directory +
 * EOCD) elle, saf JS ile üretiyoruz.
 */
const zlib = require("zlib");

var CRC_TABLE = (function () {
  var table = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  var crc = 0xffffffff;
  for (var i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * entries: [{ name, content: (string|Buffer), store?: bool, isDirectory?:
 *   bool, symlink?: bool }, ...]
 * store: true -> STORE (sıkıştırmasız, method 0); aksi halde DEFLATE (method 8).
 * symlink: true -> central directory external attributes'a Unix S_IFLNK
 *   modu yazar (zipReader.js'in symlink reddini test edebilmek için).
 * Dönüş: geçerli, gerçek unzip araçlarıyla da açılabilen bir ZIP Buffer'ı.
 */
function buildZip(entries) {
  var localChunks = [];
  var centralChunks = [];
  var offset = 0;

  entries.forEach(function (f) {
    var content = Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content || "", "utf8");
    var method = f.store ? 0 : 8;
    var data = method === 0 ? content : zlib.deflateRawSync(content);
    var crc = f.isDirectory ? 0 : crc32(content);
    var nameBuf = Buffer.from(f.name, "utf8");

    var localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    var localOffset = offset;
    localChunks.push(localHeader, nameBuf, data);
    offset += localHeader.length + nameBuf.length + data.length;

    var centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);

    var externalAttrs = f.isDirectory ? 0x10 : 0;
    if (f.symlink) externalAttrs = (0xa000 << 16) >>> 0;
    centralHeader.writeUInt32LE(externalAttrs >>> 0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);

    centralChunks.push(centralHeader, nameBuf);
  });

  var centralDir = Buffer.concat(centralChunks);
  var centralOffset = offset;

  var eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat(localChunks.concat([centralDir, eocd]));
}

// 1x1 piksellik geçerli, minimal bir PNG — testlerde "gerçek" bir görsel
// dosyası gereken her yerde kullanılıyor (gerçek bir sanat dosyası değil,
// sadece geçerli PNG byte imzası taşıyan en küçük olası dosya).
var TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100" +
    "5a1c2a1e0000000049454e44ae426082",
  "hex"
);

/** manifestObj -> JSON, files: { "relative/path.png": Buffer|string } -> tek bir ZIP Buffer'ı. */
function buildManifestZip(manifestObj, files, opts) {
  opts = opts || {};
  var entries = [{ name: "manifest.json", content: JSON.stringify(manifestObj) }];
  Object.keys(files || {}).forEach(function (relPath) {
    entries.push({ name: relPath, content: files[relPath] });
  });
  if (opts.extraEntries) entries.push.apply(entries, opts.extraEntries);
  return buildZip(entries);
}

module.exports = {
  buildZip: buildZip,
  buildManifestZip: buildManifestZip,
  crc32: crc32,
  TINY_PNG: TINY_PNG,
};
