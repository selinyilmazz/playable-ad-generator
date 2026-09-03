/**
 * PHASE 3A — Game Kit sistemi.
 *
 * "Az sayıda ama yüksek kaliteli, birbiriyle uyumlu asset seti" isteğine
 * göre: rastgele/otomatik bir eşleştirme YOK — burada tanımlı 4 kit, Phase
 * 3 rapor analizinde mevcut 39 asset tek tek incelenerek ELLE küratörlüğü
 * yapılmış, sabit setlerdir. assetManifest.js'teki her assetin
 * `compatibleGameTypes` alanı da BU dosyadaki tanımlarla birebir tutarlı
 * tutuldu (aynı kaynaktan iki farklı elle senkronize liste değil — burada
 * roller tanımlanıyor, manifest tarafı buradan türetilen gerçeği yansıtıyor).
 *
 * Her kit `roles` altında, o oyun türü için gereken gameplay rollerini ve
 * bu role atanmış GERÇEK asset id'sini (veya birden fazla geçerli seçenek
 * varsa id dizisini) taşır. Bir role için uygun/yeterli kalitede mevcut
 * asset YOKSA değer bilerek `null` bırakıldı — UYDURULMADI. `missingRoles`
 * her kit için bu null'ların insan-okur bir özetini taşır (rapor için).
 *
 * Bu dosya SADECE veri/lookup katmanıdır. Hiçbir yerde generatePlayableAd()
 * çağrısına otomatik olarak bağlanmıyor (bkz. assetContext.js
 * buildAssetContextMessageForKit — altyapı hazır ama Phase 3A'da AKTİF
 * değil, bkz. o dosyadaki not).
 */
const { ASSET_MANIFEST } = require("./assetManifest");

function findAsset(id) {
  for (var i = 0; i < ASSET_MANIFEST.length; i++) {
    if (ASSET_MANIFEST[i].id === id) return ASSET_MANIFEST[i];
  }
  return null;
}

var GAME_KITS = [
  {
    key: "endless-runner",
    name: "City Runner / Endless Runner",
    description:
      "Otomatik koşan bir oyuncu, önüne çıkan bariyerlerden kaçınır ve coin toplar.",
    roles: {
      player: "hero_generic",
      // Manifestte özel bir "şehir" arka planı yok. background_dungeon
      // Phase 2'de görsel bir stand-in olarak kullanıldı ama gerçek bir
      // "endless-runner uyumlu" asset DEĞİL (bkz. assetManifest.js
      // background_dungeon notu) — bu yüzden burada bilerek null.
      environment: null,
      platform: "platform",
      obstacle: "rock",
      collectible: "coin_gold",
      effect: "sparkle",
    },
    missingRoles: [
      "environment (şehir temalı bir background asseti yok; background_dungeon sadece geçici bir görsel stand-in, gerçek eşleşme değil)",
    ],
  },
  {
    key: "space-shooter",
    name: "Space Shooter",
    description:
      "Bir oyuncu gemisi, gelen asteroid/düşmanlara ateş ederek hayatta kalır.",
    // ROUND 16 — Selin'in kendi sağladığı, CC0 lisanslı "Kenney Space
    // Shooter (Remastered)" paketi bu kitin gerçek asset kiti olarak
    // entegre edildi (bkz. assetManifest.js "ROUND 16" bloğu ve
    // public/assets/packs/kenney-space-shooter/ATTRIBUTION.md). Eski
    // flat-primitive assetler (red_enemy/blue_enemy/green_enemy/boss_enemy,
    // fireball, gem_blue/star, background_space, explosion) bu kitten
    // ÇIKARILDI — bkz. assetManifest.js her kaydın compatibleGameTypes'ından
    // "space-shooter" değerinin kaldırılışı (invariant korundu). Eski
    // dosyalar public/assets/ altından SİLİNMEDİ, sadece bu kit artık
    // onları KULLANMIYOR.
    roles: {
      // Artık GERÇEK uzay gemisi assetleri var — 3 farklı gövde/renk, hepsi
      // dizi olarak: mock şablonu (normalizeRoles' first()) ilkini
      // (Falcon) kullanır, gerçek (API key'li) üretimde LLM üçünden
      // birini seçebilir.
      // ROUND 20: 2 alt-renk varyantı EKLENDİ (interceptor-blue, vanguard-blue)
      // — 3 orijinal geminin SIRASI/İLK ELEMANI değişmedi (mock hâlâ falcon'u
      // kullanır, bkz. normalizeRoles' first()), sadece gerçek üretimde LLM'e
      // sunulan seçenek havuzu genişledi.
      player: [
        "spaceshooter_player_falcon", "spaceshooter_player_interceptor", "spaceshooter_player_vanguard",
        "spaceshooter_player_interceptor_blue", "spaceshooter_player_vanguard_blue",
      ],
      // "obstacle" rolü hem düşman gemilerini/UFO'yu HEM asteroidleri
      // içeriyor — mockGameTemplate.js'in normalizeRoles() fonksiyonu tek
      // bir "obstaclePool" (yanlış-dokunma havuzu) bekliyor; roles
      // objesinde HEM "obstacle" HEM "enemy" (HEM "asteroid") anahtarı
      // birlikte olsaydı sadece "obstacle" öncelikli olurdu ve diğerleri
      // sessizce hiç kullanılmazdı (bkz. normalizeRoles: roles.obstacle ||
      // roles.enemy || roles.asteroid) — bu yüzden hepsi TEK bir
      // "obstacle" dizisinde birleştirildi (forest-platformer kitindeki
      // AYNI çözüm, bkz. o kitin yorumu).
      // ROUND 20: UFO renk varyantları + gerçekten farklı tasarımlı enemy
      // varyantları (red mk1/mk3, black mk1) + 1 ek asteroid EKLENDİ. Bunlar
      // palet-swap DEĞİL (rapor öncesi görsel olarak doğrulandı) — her biri
      // ayrı bir manifest id'si, hiçbiri var olan bir id'nin duplicate'i değil.
      obstacle: [
        "spaceshooter_enemy_red",
        "spaceshooter_enemy_blue",
        "spaceshooter_enemy_green",
        "spaceshooter_enemy_heavy",
        "spaceshooter_enemy_ufo",
        "spaceshooter_asteroid_large",
        "spaceshooter_asteroid_medium",
        "spaceshooter_asteroid_small",
        "spaceshooter_enemy_ufo_blue",
        "spaceshooter_enemy_ufo_green",
        "spaceshooter_enemy_ufo_yellow",
        "spaceshooter_enemy_red_mk1",
        "spaceshooter_enemy_red_mk3",
        "spaceshooter_enemy_black_mk1",
        "spaceshooter_asteroid_large_grey",
      ],
      // ROUND 20: gold-tier 2 power-up rozeti + 1 "coin/currency" toplanabilir
      // EKLENDİ — space-shooter'da önceden hiç "coin" kavramı yoktu (bkz. rapor).
      collectible: [
        "spaceshooter_powerup_rapidfire", "spaceshooter_powerup_shield", "spaceshooter_powerup_star",
        "spaceshooter_powerup_shield_gold", "spaceshooter_powerup_star_gold", "spaceshooter_coin_treasure",
      ],
      background: ["spaceshooter_background_deep", "spaceshooter_background_nebula"],
      // ROUND 20: "speed boost" EKLENDİ — daha önce hiç temsil edilmeyen yeni
      // bir efekt kavramı (explosion/shield/spark zaten vardı).
      effect: [
        "spaceshooter_explosion", "spaceshooter_shield_effect", "spaceshooter_spark_effect",
        "spaceshooter_speed_boost",
      ],
      // "projectile" — mockGameTemplate.js'in normalizeRoles() fonksiyonu bu
      // anahtarı OKUMUYOR (mock şablonunda mermi/lazer için ayrı bir görsel
      // slot yok, sahne statik) — bu yüzden mock oyunda hiçbir etkisi/riski
      // yok. Ama buildAssetContextMessageForKit() TÜM role anahtarlarını
      // LLM'e aktarıyor (bkz. assetContext.js) — yani GERÇEK (API key'li)
      // üretimde bu lazerler LLM'e "kullanılabilir" olarak gösteriliyor.
      projectile: ["spaceshooter_laser_blue", "spaceshooter_laser_red", "spaceshooter_laser_green"],
    },
    // Bu kitte artık eksik rol yok — SunnyLand pilot'unun aksine, Kenney
    // Space Shooter (Remastered) paketi player/enemy/asteroid/collectible/
    // background/effect/projectile için gerçek, kaliteli bir karşılık
    // sunuyor.
    missingRoles: [],
  },
  {
    key: "forest-platformer",
    name: "Forest Platformer",
    description: "Bir karakter, orman temalı platformlar arasında zıplar ve yıldız toplar.",
    // ROUND 14 — Selin'in kendi sağladığı, CC0 lisanslı "SunnyLand Forest"
    // paketi (Luis Zuno "Ansimuz") bu kitin PİLOT profesyonel asset kiti
    // olarak entegre edildi. Eski flat-primitive assetler (hero_generic,
    // masked_knight_front, background_forest, platform, star, gem_blue,
    // rock, tree, sparkle) bu kitten ÇIKARILDI — bkz. assetManifest.js
    // "ROUND 14 NOTU" ve her bir eski kaydın compatibleGameTypes'ından
    // "forest-platformer" değerinin kaldırılışı (invariant korundu, bkz.
    // assetManifest.js dosya başı yorumu). Eski dosyalar public/assets/
    // altından SİLİNMEDİ, sadece bu kit artık onları KULLANMIYOR.
    roles: {
      player: "sunnyland_player",
      // ROUND 20: middleground layer EKLENDİ — mock hâlâ ilk elemanı
      // (forest) kullanır (first()), gerçek üretimde ek bir seçenek.
      background: ["sunnyland_background_forest", "sunnyland_background_sky", "sunnyland_background_middleground"],
      // SunnyLand pack'inde hazır, tek-parça bir "platform tile" PNG'si
      // yok — sadece bir tileset spritesheet'i var (bkz. missingRoles).
      // Tek bir tile'ı kırpıp uydurmak yerine dürüstçe null bırakıldı; tam
      // tileset public/assets/packs/sunnyland-forest/source/environment/
      // layers/tileset.png altında bozulmadan duruyor.
      platform: null,
      collectible: ["sunnyland_carrot", "sunnyland_star", "sunnyland_chest"],
      // "obstacle" rolü hem gerçek engelleri (rock/tree) hem düşmanları
      // (bee/piranha-plant/slug) içeriyor — mockGameTemplate.js'in
      // normalizeRoles() fonksiyonu tek bir "obstaclePool" (yanlış-dokunma
      // havuzu) bekliyor; roles objesinde HEM "obstacle" HEM "enemy" anahtarı
      // birlikte olsaydı "obstacle" öncelikli olurdu ve enemy'ler sessizce
      // hiç kullanılmazdı (bkz. normalizeRoles: roles.obstacle || roles.enemy
      // || roles.asteroid) — bu yüzden hepsi TEK bir "obstacle" dizisinde
      // birleştirildi, hiçbiri kaybolmasın diye.
      // ROUND 20: piranha-plant'in saldırı pozu EKLENDİ — aynı düşman,
      // farklı görsel varyant (yeni bir yaratık tasarımı değil).
      obstacle: [
        "sunnyland_rock",
        "sunnyland_tree",
        "sunnyland_bee",
        "sunnyland_piranha_plant",
        "sunnyland_slug",
        "sunnyland_piranha_plant_attack",
      ],
      // ROUND 20: tekil string -> dizi. resolveKitRoles/normalizeRoles zaten
      // hem tekil hem dizi değeri destekliyor (first() ilk elemanı alır) —
      // mock'ta kullanılan ilk eleman (sunnyland_enemy_death) DEĞİŞMEDİ,
      // sadece player_hurt ikinci seçenek olarak eklendi.
      effect: ["sunnyland_enemy_death", "sunnyland_player_hurt"],
      // "decoration" — mockGameTemplate.js'in normalizeRoles() fonksiyonu bu
      // anahtarı OKUMUYOR (mock şablonunda sahne dekoru için ayrı bir slot
      // yok, bkz. o dosya) — bu yüzden mock oyunda hiçbir etkisi/riski yok.
      // Ama buildAssetContextMessageForKit() TÜM role anahtarlarını LLM'e
      // aktarıyor (bkz. assetContext.js) — yani GERÇEK (API key'li) üretimde
      // bu sahne objeleri LLM'e "kullanılabilir" olarak gösteriliyor ve LLM
      // sahneyi zenginleştirmek için serbestçe seçebiliyor. Selin'in "mümkün
      // olduğunca bu gerçek assetlerden seçim yapılmasını sağla" isteğinin
      // somut karşılığı bu.
      decoration: [
        "sunnyland_house",
        "sunnyland_mushroom_red",
        "sunnyland_mushroom_brown",
        "sunnyland_plant",
        "sunnyland_vine",
      ],
    },
    missingRoles: [
      "platform (SunnyLand pack'inde hazır tek-parça bir platform tile PNG'si yok — sadece bir tileset spritesheet'i var; tek asset olarak kırpmak/uydurmak yerine dürüstçe null bırakıldı)",
    ],
  },
  {
    key: "fruit-puzzle",
    name: "Fruit Puzzle",
    description: "Doğru meyveyi/sebzeyi süre dolmadan doğru sepete seç.",
    roles: {
      collectible: [
        "apple", "banana", "orange", "strawberry", "carrot",
        "broccoli", "tomato", "corn", "grapes", "potato",
      ],
      target: ["basket_red", "basket_green"],
      // Nötr bir puzzle/tezgah arka planı yok — Phase 2'nin preset
      // kartında bu yüzden bu türe hiç background verilmemişti.
      background: null,
      effect: "sparkle",
    },
    missingRoles: [
      "background (meyve/sebze paletiyle uyumlu, nötr bir puzzle/tezgah arka planı yok)",
    ],
  },
];

function getKit(key) {
  for (var i = 0; i < GAME_KITS.length; i++) {
    if (GAME_KITS[i].key === key) return GAME_KITS[i];
  }
  return null;
}

function listGameTypeKeys() {
  return GAME_KITS.map(function (k) { return k.key; });
}

/**
 * roles içindeki id/id-dizisi/null değerlerini gerçek ASSET_MANIFEST
 * kayıtlarına (asset objelerine) çözer. Bir id manifestte yoksa (yazım
 * hatası vb.) o rol null'a düşürülür ve unresolved listesine eklenir —
 * sessizce yanlış bir asset göstermek yerine.
 */
function resolveKitRoles(key) {
  var kit = getKit(key);
  if (!kit) return null;

  var resolvedRoles = {};
  var unresolved = [];

  Object.keys(kit.roles).forEach(function (role) {
    var value = kit.roles[role];
    if (value == null) {
      resolvedRoles[role] = null;
      return;
    }
    if (Array.isArray(value)) {
      var assets = value
        .map(function (id) {
          var a = findAsset(id);
          if (!a) unresolved.push(role + ":" + id);
          return a;
        })
        .filter(Boolean);
      resolvedRoles[role] = assets.length > 0 ? assets : null;
      return;
    }
    var asset = findAsset(value);
    if (!asset) unresolved.push(role + ":" + value);
    resolvedRoles[role] = asset || null;
  });

  return {
    key: kit.key,
    name: kit.name,
    description: kit.description,
    roles: resolvedRoles,
    missingRoles: kit.missingRoles,
    unresolved: unresolved,
  };
}

module.exports = {
  GAME_KITS: GAME_KITS,
  getKit: getKit,
  listGameTypeKeys: listGameTypeKeys,
  resolveKitRoles: resolveKitRoles,
};
