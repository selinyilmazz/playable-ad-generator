/**
 * ROUND 18 — Asset Pack Registry.
 *
 * "Prompt-to-playable-game platformu artık uzun vadede çok farklı oyun
 * türlerini desteklemeli" mimari isteğinin somut karşılığı: HER paketin
 * (aktif veya henüz planlanan) tek, merkezi bir kaydı burada.
 *
 * Bu dosya İKİ türde kayıt tutar:
 *
 *  - status: "active"  — gerçek dosyaları public/assets/packs/<key>/ altında
 *    duran, server/config/packs/<key>.js içinde gerçek ASSET_MANIFEST
 *    kayıtları olan, en az bir Game Kit'e (assetKits.js) bağlı paketler.
 *    assetCount BURADA elle yazılmıyor — ASSET_MANIFEST'ten CANLI olarak
 *    sayılıyor (bkz. countAssetsForPack), yani asla gerçek veriyle
 *    çelişemez/eskiyemez.
 *
 *  - status: "planned" — Selin'in istediği 8 yeni tür için HENÜZ HİÇBİR
 *    dosya indirilmedi/entegre edilmedi (assetCount: 0, folderPath: null).
 *    Sadece roadmap/rapor amaçlı: hangi rollerin, yaklaşık kaç assetle
 *    doldurulması gerektiğinin planı. Buradaki hiçbir kayıt GAME_KITS'e
 *    (assetKits.js) veya GAME_TYPE_KEYWORDS'e (gameTypeDetection.js) OTOMATİK
 *    bağlanmaz — bir tür gerçekten aktifleşince (gerçek assetler
 *    seçilip/indirilip server/config/packs/<key>.js yazıldığında) o kit ve
 *    keyword'ler elle eklenir, tıpkı sunnyland-forest ve kenney-space-shooter
 *    için ROUND 14/16'da yapıldığı gibi.
 *
 * Fiziksel klasör convention'ı (aktif paketlerin ikisi de buna uyuyor,
 * planlanan paketlerin hepsi de aktifleştiğinde buna uyacak):
 *   public/assets/packs/<pack-key>/
 *     ATTRIBUTION.md        — yazar/lisans/hangi asset hangi kaynaktan
 *     LICENSE.txt           — orijinal lisans metni, unmodified
 *     characters/           — oyuncu figürleri
 *     enemies/               — düşman figürleri
 *     objects/               — projectile/obstacle/collectible/powerup/weapon
 *                              (frontend'de tek "object" bucket'ına toplanıyor,
 *                              bkz. public/app.js ASSET_CATEGORY_ORDER)
 *     effects/               — görsel efektler
 *     backgrounds/           — arka plan sahneleri
 *     tiles/                 — (YENİ, ROUND 18) tekrarlanan zemin/duvar karoları
 *     source/                — paketin TAM/bozulmamış orijinal hali (curation
 *                              sırasında seçilmeyen varyantlar dahil)
 */
const { ASSET_MANIFEST } = require("./assetManifest");

function countAssetsForPack(packKey) {
  return ASSET_MANIFEST.filter(function (a) { return a.pack === packKey; }).length;
}

function sumRoleBreakdown(roleBreakdown) {
  return roleBreakdown.reduce(function (sum, r) { return sum + r.estimatedCount; }, 0);
}

// ============================== ACTIVE PACKS ==============================
var ACTIVE_PACKS_RAW = [
  {
    key: "legacy-core",
    name: "Legacy Core (flat-primitive)",
    status: "active",
    license: "N/A — proje içi orijinal basit SVG şekiller",
    source: "Proje içi (Phase 1-2)",
    theme: "generic",
    activatedRound: 1,
    poweredGameTypes: ["endless-runner", "fruit-puzzle"],
    // Bu pakette `pack` alanı yok (bkz. legacy-core.js notu) — dosyalar
    // public/assets/characters|objects|effects|backgrounds/ altında düz
    // duruyor, kendi klasörü YOK.
    folderPath: null,
    isFlat: true,
  },
  {
    key: "sunnyland-forest",
    name: "SunnyLand Forest",
    status: "active",
    license: "CC0",
    source: "Luis Zuno (\"Ansimuz\", ansimuz.com)",
    theme: "forest",
    activatedRound: 14,
    poweredGameTypes: ["forest-platformer"],
    folderPath: "public/assets/packs/sunnyland-forest/",
    isFlat: false,
  },
  {
    key: "kenney-space-shooter",
    name: "Kenney Space Shooter (Remastered)",
    status: "active",
    license: "CC0",
    source: "Kenney Vleugels (kenney.nl)",
    theme: "space",
    activatedRound: 16,
    poweredGameTypes: ["space-shooter"],
    folderPath: "public/assets/packs/kenney-space-shooter/",
    isFlat: false,
  },
];

var ACTIVE_PACKS = ACTIVE_PACKS_RAW.map(function (p) {
  return Object.assign({}, p, {
    assetCount: p.isFlat
      ? ASSET_MANIFEST.filter(function (a) { return !a.pack; }).length
      : countAssetsForPack(p.key),
  });
});

// ============================= PLANNED PACKS ===============================
// Selin'in istediği 8 yeni tür. Her satır bir ROL TAHMİNİ — gerçek asset
// seçimi/indirmesi henüz YAPILMADI (bilinçli olarak, "rastgele yüzlerce
// dosya indirme" kısıtı gereği bir sonraki round'da BİRLİKTE yapılacak).
// estimatedCount'lar mevcut 2 aktif pakette (17 ve 22 asset) izlenen
// "küçük ama tam kapsayan curated kit" ölçeğiyle TUTARLI seçildi — 39
// asset'lik eski flat-primitive gibi rastgele büyük bir liste DEĞİL.
var PLANNED_PACKS_RAW = [
  {
    key: "medieval-rpg",
    name: "Medieval RPG",
    theme: "medieval fantasy — overworld/köy/kale",
    suggestedGameTypeKey: "medieval-rpg",
    suggestedKeywords: [
      "medieval", "knight", "kingdom", "castle", "quest", "rpg", "sword",
      "village", "kral", "şövalye", "kale",
    ],
    roleBreakdown: [
      { role: "character", estimatedCount: 3, notes: "3 sınıf: şövalye/büyücü/okçu" },
      { role: "enemy", estimatedCount: 5, notes: "goblin, iskelet, ork, kurt, mini-boss" },
      { role: "weapon", estimatedCount: 3, notes: "kılıç, yay, asa (oyuncu elinde görsel)" },
      { role: "projectile", estimatedCount: 2, notes: "ok, büyü mermisi" },
      { role: "collectible", estimatedCount: 3, notes: "altın, iksir, mücevher" },
      { role: "powerup", estimatedCount: 2, notes: "can iksiri, güç zırhı" },
      { role: "effect", estimatedCount: 3, notes: "kılıç vuruşu, büyü parıltısı, iyileşme" },
      { role: "background", estimatedCount: 2, notes: "köy meydanı, kale iç mekan" },
      { role: "tile", estimatedCount: 2, notes: "taş zemin, çim zemin" },
    ],
    notes:
      "\"Dungeon\" ile TEMASI benzer ama kapsamı farklı: medieval-rpg AÇIK ALAN/köy/kale " +
      "odaklı, dungeon ise kapalı/karanlık koridor-oda odaklı — iki ayrı pakete bilerek " +
      "bölündü (Selin'in kendi klasör listesinde de ikisi ayrı).",
  },
  {
    key: "dungeon",
    name: "Dungeon Crawler",
    theme: "karanlık zindan/mahzen",
    suggestedGameTypeKey: "dungeon-rpg",
    suggestedKeywords: [
      "dungeon", "crawler", "torch", "trap", "underground", "labyrinth",
      "zindan", "mahzen", "maze",
    ],
    roleBreakdown: [
      { role: "character", estimatedCount: 2, notes: "kaşif/paladin varyantı" },
      { role: "enemy", estimatedCount: 4, notes: "iskelet, yarasa, slime, zindan boss'u" },
      { role: "tile", estimatedCount: 5, notes: "duvar, zemin, kapı, merdiven, meşale-duvar" },
      { role: "object", estimatedCount: 3, notes: "sandık, anahtar, tuzak (diken/ok)" },
      { role: "collectible", estimatedCount: 2, notes: "altın, mücevher" },
      { role: "effect", estimatedCount: 3, notes: "meşale titreşimi, büyü parıltısı, vuruş" },
      { role: "background", estimatedCount: 2, notes: "zindan koridoru, mahzen odası" },
    ],
    notes: "Ağırlıklı olarak TILE-tabanlı bir kit — yeni 'tile' category'sinin ilk gerçek kullanım alanı.",
  },
  {
    key: "zombie-survival",
    name: "Zombie Survival",
    theme: "post-apocalyptic şehir",
    suggestedGameTypeKey: "zombie-survival",
    suggestedKeywords: [
      "zombie", "zombies", "survival", "survive", "apocalypse", "infected",
      "outbreak", "zombi", "hayatta kal",
    ],
    roleBreakdown: [
      { role: "character", estimatedCount: 2, notes: "hayatta kalan (erkek/kadın)" },
      { role: "enemy", estimatedCount: 4, notes: "normal/hızlı/tank zombi + özel varyant" },
      { role: "weapon", estimatedCount: 3, notes: "tabanca, pompalı, yakın dövüş sopası" },
      { role: "projectile", estimatedCount: 2, notes: "mermi, molotof" },
      { role: "object", estimatedCount: 3, notes: "barikat, mühimmat kutusu, ilkyardım kiti" },
      { role: "powerup", estimatedCount: 2, notes: "hız artışı, çift hasar" },
      { role: "effect", estimatedCount: 3, notes: "kan sıçraması, namlu alevi, patlama" },
      { role: "background", estimatedCount: 2, notes: "harap sokak, terkedilmiş bina içi" },
    ],
    notes: "İlk 'weapon' + 'projectile' birlikte kullanılan pakete aday (silahın kendisi + attığı mermi ayrı görseller).",
  },
  {
    key: "ninja-platformer",
    name: "Ninja Platformer",
    theme: "gece/Japon esintili platform",
    suggestedGameTypeKey: "ninja-platformer",
    suggestedKeywords: [
      "ninja", "shuriken", "stealth", "rooftop", "samurai", "dojo", "sensei",
    ],
    roleBreakdown: [
      { role: "character", estimatedCount: 2, notes: "erkek/kadın ninja" },
      { role: "enemy", estimatedCount: 3, notes: "samuray muhafız, rakip ninja, köpek" },
      { role: "weapon", estimatedCount: 2, notes: "kılıç (katana), shuriken standı" },
      { role: "projectile", estimatedCount: 1, notes: "fırlatılan shuriken" },
      { role: "collectible", estimatedCount: 2, notes: "parşömen, altın sikke" },
      { role: "powerup", estimatedCount: 2, notes: "çift zıplama parşömeni, hız artışı" },
      { role: "effect", estimatedCount: 3, notes: "duman/kayboluş, kılıç izi, iniş tozu" },
      { role: "background", estimatedCount: 2, notes: "gece çatıları, dojo iç mekan" },
      { role: "tile", estimatedCount: 2, notes: "çatı/platform karosu" },
    ],
    notes: null,
  },
  {
    key: "underwater",
    name: "Underwater Adventure",
    theme: "derin deniz/resif",
    suggestedGameTypeKey: "underwater",
    suggestedKeywords: [
      "underwater", "ocean", "sea", "diver", "submarine", "fish", "reef",
      "deniz", "dalgıç", "denizaltı",
    ],
    roleBreakdown: [
      { role: "character", estimatedCount: 2, notes: "dalgıç veya balık-karakter" },
      { role: "vehicle", estimatedCount: 1, notes: "mini denizaltı (opsiyonel alternatif player)" },
      { role: "enemy", estimatedCount: 4, notes: "köpekbalığı, denizanası, yılan balığı, ahtapot" },
      { role: "collectible", estimatedCount: 3, notes: "inci, deniz kabuğu, hazine" },
      { role: "powerup", estimatedCount: 2, notes: "oksijen tüpü, hız yüzgeci" },
      { role: "effect", estimatedCount: 2, notes: "kabarcık patlaması, mürekkep bulutu" },
      { role: "background", estimatedCount: 3, notes: "resif, açık derin deniz, mağara" },
    ],
    notes: "İlk 'vehicle' rolünün karakter YERİNE alternatif olarak denendiği pakete aday.",
  },
  {
    key: "racing",
    name: "Racing",
    theme: "yarış pisti",
    suggestedGameTypeKey: "racing",
    suggestedKeywords: [
      "race", "racing", "car", "cars", "track", "drift", "speed", "finish line",
      "yarış", "araba",
    ],
    roleBreakdown: [
      { role: "vehicle", estimatedCount: 3, notes: "3 renk/model oyuncu arabası" },
      { role: "obstacle", estimatedCount: 3, notes: "trafik arabası, koni, yağ lekesi" },
      { role: "tile", estimatedCount: 3, notes: "düz yol, viraj, bitiş çizgisi" },
      { role: "powerup", estimatedCount: 2, notes: "nitro/hız artışı, kalkan" },
      { role: "effect", estimatedCount: 3, notes: "lastik dumanı, nitro alevi, çarpışma kıvılcımı" },
      { role: "background", estimatedCount: 2, notes: "çöl pisti, şehir pisti" },
      { role: "ui", estimatedCount: 1, notes: "hız göstergesi ikonu (HUD)" },
    ],
    notes: "'vehicle' rolünün asıl/birincil player-role olduğu ilk pakete aday; 'ui' category'sinin de ilk gerçek kullanım alanı.",
  },
  {
    key: "fantasy",
    name: "Fantasy Adventure",
    theme: "büyülü macera (medieval-rpg'den farklı: savaş değil keşif/büyü odaklı)",
    suggestedGameTypeKey: "fantasy",
    suggestedKeywords: [
      "fantasy", "magic", "wizard", "dragon", "spell", "enchanted", "mystical",
      "büyü", "büyülü", "ejderha",
    ],
    roleBreakdown: [
      { role: "character", estimatedCount: 2, notes: "büyücü/peri karakteri" },
      { role: "enemy", estimatedCount: 3, notes: "küçük ejderha, goblin, gölge yaratık" },
      { role: "collectible", estimatedCount: 3, notes: "büyü kristali, iksir, tılsım" },
      { role: "powerup", estimatedCount: 2, notes: "büyü yükseltmesi, kalkan büyüsü" },
      { role: "projectile", estimatedCount: 2, notes: "ateş topu, buz mermisi" },
      { role: "effect", estimatedCount: 3, notes: "büyü parıltısı, teleport pofu, iyileşme halkası" },
      { role: "background", estimatedCount: 3, notes: "büyülü orman, gökyüzü adası, kristal mağara" },
    ],
    notes: "medieval-rpg ile TEMA olarak komşu ama kapsamı bilerek dar tutuldu: burada savaş değil keşif/büyü ağırlıklı.",
  },
  {
    key: "farming",
    name: "Farming",
    theme: "çiftlik/hasat",
    suggestedGameTypeKey: "farming",
    suggestedKeywords: [
      "farm", "farming", "harvest", "crop", "crops", "field", "barn",
      "çiftlik", "hasat", "tarla",
    ],
    roleBreakdown: [
      { role: "character", estimatedCount: 1, notes: "çiftçi" },
      { role: "vehicle", estimatedCount: 1, notes: "traktör" },
      { role: "collectible", estimatedCount: 4, notes: "buğday, havuç, balkabağı, mısır (hasat ürünü)" },
      { role: "object", estimatedCount: 3, notes: "çapa, sulama kabı, tohum torbası" },
      { role: "powerup", estimatedCount: 2, notes: "gübre (hızlı büyüme), sulama artışı" },
      { role: "tile", estimatedCount: 2, notes: "toprak/tarla karosu, çim karosu" },
      { role: "background", estimatedCount: 2, notes: "ahır önü, açık tarla" },
      { role: "effect", estimatedCount: 2, notes: "büyüme parıltısı, hasat tozu" },
    ],
    notes: "'enemy' rolü BİLEREK yok — çiftlik türünde doğal bir çatışma/düşman yok, dürüstçe boş bırakılacak (tıpkı fruit-puzzle'ın background'ı gibi).",
  },
];

var PLANNED_PACKS = PLANNED_PACKS_RAW.map(function (p) {
  return Object.assign({}, p, {
    status: "planned",
    license: null,
    source: null,
    activatedRound: null,
    poweredGameTypes: [],
    folderPath: null,
    assetCount: 0,
    estimatedAssetCount: sumRoleBreakdown(p.roleBreakdown),
  });
});

var ASSET_PACKS = ACTIVE_PACKS.concat(PLANNED_PACKS);

function getPack(key) {
  for (var i = 0; i < ASSET_PACKS.length; i++) {
    if (ASSET_PACKS[i].key === key) return ASSET_PACKS[i];
  }
  return null;
}

function getActivePacks() {
  return ASSET_PACKS.filter(function (p) { return p.status === "active"; });
}

function getPlannedPacks() {
  return ASSET_PACKS.filter(function (p) { return p.status === "planned"; });
}

module.exports = {
  ASSET_PACKS: ASSET_PACKS,
  getPack: getPack,
  getActivePacks: getActivePacks,
  getPlannedPacks: getPlannedPacks,
};
