/**
 * PHASE 5 — Mock/Template Asset Selector.
 *
 * Mock modun (API key yokken kullanılan yol) artık gerçek bir oyun HTML'i
 * üretebilmesi için, verilen (gameType, prompt) çiftinden gerçek bir "rol
 * seti" (player/environment/platform/collectible/obstacle/effect/target)
 * çözer. HİÇBİR asset UYDURULMAZ — ya assetKits.js'teki kürüte edilmiş kit
 * rolleri kullanılır, ya da (kit eşleşmediğinde) tüm ASSET_MANIFEST üzerinde
 * basit bir anahtar kelime taraması yapılır (frontend'deki GAMEPLAY_BLOCKS
 * ile aynı felsefede: AI/NLP "anlama" değil, düz string eşleştirme).
 *
 * Döndürülen roller HER ZAMAN ya gerçek bir asset objesi ya da null'dur —
 * emoji/placeholder/uydurma path YOK (Selin'in REQUIREMENTS #4/#6).
 */
const { ASSET_MANIFEST } = require("../config/assetManifest");
const { resolveKitRoles } = require("../config/assetKits");

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "key" kelimesini "keywords" içinde YANLIŞLIKLA eşleştirmemek için — düz
// indexOf yerine \b kelime sınırı kullanılıyor (case-insensitive). Kısa
// tag'lerin (key/star/gem gibi) başka kelimelerin İÇİNDE yanlış pozitif
// vermesini engeller.
function containsWord(text, word) {
  if (!word) return false;
  return new RegExp("\\b" + escapeRegExp(word) + "\\b", "i").test(text);
}

// Kit-dışı (gameType null) fallback taraması için: rol -> aranacak
// anahtar kelimeler + o rolün manifestteki hangi category'lerden
// doldurulabileceği. Frontend'deki public/app.js GAMEPLAY_BLOCKS'un
// server-side, biraz daha geniş bir eşdeğeri.
var FALLBACK_ROLE_RULES = [
  {
    role: "player",
    categories: ["character"],
    keywords: [
      "wizard", "knight", "hero", "player", "character", "mage", "ninja",
      "warrior", "avatar", "runner", "explorer",
    ],
  },
  {
    role: "environment",
    categories: ["background"],
    keywords: [
      "forest", "space", "desert", "dungeon", "enchanted", "jungle",
      "cave", "night", "sky", "world", "scene", "level",
    ],
  },
  {
    role: "platform",
    categories: ["platform"],
    keywords: ["platform", "jump", "jumping", "hop", "hopping", "floor", "ledge"],
  },
  {
    role: "collectible",
    categories: ["collectible"],
    pool: true,
    keywords: [
      "crystal", "crystals", "gem", "gems", "coin", "coins", "star", "stars",
      "treasure", "collect", "collecting", "collectible", "glowing", "shiny",
      "fruit", "apple", "key", "heart",
    ],
  },
  {
    role: "obstacle",
    categories: ["obstacle", "enemy"],
    pool: true,
    keywords: [
      "enemy", "enemies", "monster", "obstacle", "obstacles", "danger",
      "avoid", "rock", "trap", "hazard",
    ],
  },
  {
    role: "effect",
    categories: ["effect"],
    keywords: ["glow", "glowing", "sparkle", "shine", "magic", "spark", "explosion"],
  },
];

// Manifestteki category'ye göre role adaylarını döner (tags üzerinden en
// spesifik eşleşme önce). `rule.pool` true ise (collectible/obstacle gibi
// "birden fazla örnek doğal" roller) TEK asset değil, en fazla 3 asset'lik
// bir dizi döner — böylece mock oyunundaki grid'de gerçek çeldiriciler
// (decoy) olur, tek hücrelik/anlamsız bir oyun ortaya çıkmaz.
function candidatesForRole(rule, text) {
  var pool = ASSET_MANIFEST.filter(function (a) {
    return rule.categories.indexOf(a.category) !== -1;
  });
  if (pool.length === 0) return rule.pool ? [] : null;

  var tagMatches = pool.filter(function (a) {
    return (a.tags || []).some(function (tag) { return containsWord(text, tag); }) ||
      containsWord(text, a.id.replace(/_/g, " "));
  });

  var keywordHit = rule.keywords.some(function (kw) { return containsWord(text, kw); });

  if (!rule.pool) {
    if (tagMatches[0]) return tagMatches[0];
    return keywordHit ? pool[0] : null;
  }

  // pool: true — eşleşen(ler) + aynı kategoriden birkaç ek gerçek aday ile
  // en az 2, en fazla 3 elemanlı bir dizi kurulur (tümü GERÇEK manifest
  // kayıtları, hiçbiri uydurulmadı).
  if (tagMatches.length === 0 && !keywordHit) return [];
  var chosen = tagMatches.length > 0 ? tagMatches.slice(0, 3) : [pool[0]];
  if (chosen.length < 2) {
    pool.forEach(function (a) {
      if (chosen.length >= 3) return;
      if (chosen.indexOf(a) === -1) chosen.push(a);
    });
  }
  return chosen;
}

/**
 * gameType bir kite eşleşmişse: assetKits.js'teki kürüte edilmiş rolleri
 * (array/tekil/null aynen) döner — hiçbir ek mantık yok, tek kaynak kit
 * tanımı. usedFallback: false.
 *
 * gameType null/bilinmeyen ise: FALLBACK_ROLE_RULES ile tüm manifestte
 * best-effort bir rol seti kurar. Hiçbir rol için eşleşme yoksa o rol
 * null kalır (uydurulmaz). usedFallback: true — çağıran taraf (validation/
 * meta) bunu şeffaf şekilde işaretleyebilsin diye.
 */
function selectRolesForMock(gameType, prompt) {
  var text = (prompt || "").toLowerCase();

  if (gameType) {
    var resolved = resolveKitRoles(gameType);
    if (resolved) {
      return {
        source: "kit",
        kitName: resolved.name,
        usedFallback: false,
        roles: resolved.roles,
      };
    }
  }

  var roles = {};
  FALLBACK_ROLE_RULES.forEach(function (rule) {
    roles[rule.role] = candidatesForRole(rule, text);
  });

  var anyMatched = Object.keys(roles).some(function (r) {
    var v = roles[r];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });

  // Hiçbir rol eşleşmediyse (tamamen alakasız/boş bir prompt) bile oyun
  // yine de oynanabilir olmalı (REQUIREMENTS #6: broken/boş üretim yok) —
  // birkaç genel-amaçlı, her zaman var olan gerçek collectible + bir effect
  // ile minimal ama oynanabilir (birden fazla hücreli) bir set garanti
  // edilir. "Genel amaçlı" = herhangi bir spesifik temaya (meyve/silah/vb.)
  // bağlı olmayan, nötr toplanabilirler (yıldız/altın/mücevher) — rastgele
  // seçilmiyor, sabit ve GERÇEK üç manifest id'si.
  if (!anyMatched) {
    var GENERIC_COLLECTIBLE_IDS = ["star", "coin_gold", "gem_blue"];
    var defaultCollectible = ASSET_MANIFEST.filter(function (a) {
      return GENERIC_COLLECTIBLE_IDS.indexOf(a.id) !== -1;
    });
    if (defaultCollectible.length === 0) {
      defaultCollectible = ASSET_MANIFEST.filter(function (a) { return a.category === "collectible"; }).slice(0, 3);
    }
    var defaultEffect = ASSET_MANIFEST.filter(function (a) { return a.category === "effect"; })[0] || null;
    roles.collectible = defaultCollectible;
    roles.effect = defaultEffect;
  }

  return {
    source: "fallback",
    kitName: null,
    usedFallback: true,
    roles: roles,
  };
}

module.exports = { selectRolesForMock: selectRolesForMock };
