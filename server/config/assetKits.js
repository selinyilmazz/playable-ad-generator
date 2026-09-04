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
  {
    key: "racing",
    name: "Racing",
    description: "Bir oyuncu arabası, trafikten/engellerden kaçınarak bitiş çizgisine ulaşır.",
    // ROUND 23 — Selin'in kendi sağladığı, CC0 lisanslı "Kenney Racing Pack"
    // bu kitin gerçek asset kiti olarak entegre edildi (bkz. assetManifest.js
    // "ROUND 23" bloğu ve public/assets/packs/racing/ATTRIBUTION.md). Bu,
    // "player" rolünü BİRİNCİL olarak bir "vehicle" category'sinin doldurduğu
    // İLK kit (önceki kitlerde player hep "character").
    roles: {
      // player rolü mockGameTemplate.js'in #player-sprite render mantığına
      // AYNEN oturuyor (role key = "player", category = "vehicle" — ikisi
      // birbirinden bağımsız, kod değişikliği gerekmedi).
      player: ["racing_car_player_red", "racing_car_player_blue"],
      // "obstacle" rolü hem trafik araçlarını (car/motorcycle) HEM sahne
      // engellerini (koni/yağ/bariyer) içeriyor — diğer kitlerdeki AYNI
      // "tek obstaclePool'da birleştir" çözümü (bkz. forest-platformer ve
      // space-shooter kitlerinin aynı yorumu).
      obstacle: [
        "racing_traffic_car_yellow",
        "racing_traffic_car_green",
        "racing_motorcycle_black",
        "racing_cone",
        "racing_oil_slick",
        "racing_barrier",
      ],
      // platform rolü mockGameTemplate.js'in #platform-row (4x tekrarlanan
      // zemin şeridi) render mantığına AYNEN oturuyor — düz yol karosu.
      platform: "racing_tile_road_straight",
      // "tile" — SADECE gerçek (LLM) üretimde görünür (mock şablonu bu
      // anahtarı OKUMUYOR, bkz. diğer kitlerdeki "decoration"/"projectile"
      // ile aynı desen). Viraj + bitiş çizgisi karosu.
      tile: ["racing_tile_road_curve", "racing_tile_finish_line"],
      effect: "racing_skidmark",
      // "decoration" — SADECE gerçek (LLM) üretimde görünür (mock tüketmiyor,
      // forest-platformer'ın decoration rolüyle aynı desen).
      decoration: ["racing_tree_large", "racing_tribune", "racing_tent"],
      // Aşağıdaki 4 rol için pakette GERÇEKTEN uygun bir asset yok — eski
      // PLANNED_PACKS_RAW tahmini (powerup:2, ui:1, background:2) pakette
      // dosya dosya kontrol edildikten sonra YANLIŞ çıktı; uydurmak yerine
      // dürüstçe null bırakıldı (bkz. missingRoles).
      collectible: null,
      background: null,
      powerup: null,
      ui: null,
    },
    missingRoles: [
      "collectible (pakette coin/gem/star tarzı bir toplanabilir yok)",
      "background (pakette tek-kare kapsayan bir pist/sahne arka planı yok)",
      "powerup (pakette nitro/kalkan gibi bir power-up ikonu yok)",
      "ui (pakette hız göstergesi/HUD ikonu yok)",
    ],
  },
  {
    key: "dungeon-rpg",
    name: "Tiny Dungeon",
    description: "Bir kahraman, zindanda düşmanlardan kaçınıp/onları yenip hazine bulur.",
    // ROUND 24 — Selin'in kendi sağladığı, CC0 lisanslı "Kenney Tiny Dungeon"
    // paketi bu kitin gerçek asset kiti olarak entegre edildi (bkz.
    // assetManifest.js "ROUND 24" bloğu ve
    // public/assets/packs/tiny-dungeon/ATTRIBUTION.md).
    roles: {
      // player rolü mockGameTemplate.js'in #player-sprite render mantığına
      // AYNEN oturuyor.
      player: ["tinydungeon_player_knight", "tinydungeon_player_wizard", "tinydungeon_player_adventurer"],
      // Pakette AYRI bir hazard/trap/projectile sprite'ı yok — bu yüzden
      // (forest-platformer ve space-shooter kitlerindeki AYNI çözümle)
      // TÜM canavarlar (mimic dahil) doğrudan "obstacle" rolüne kondu —
      // normalizeRoles()'in roles.obstacle||roles.enemy||roles.asteroid
      // OR-precedence tuzağını aşmak için (bkz. o kitlerin aynı yorumu).
      obstacle: [
        "tinydungeon_enemy_slime",
        "tinydungeon_enemy_crab",
        "tinydungeon_enemy_orc",
        "tinydungeon_enemy_bat",
        "tinydungeon_enemy_ghost",
        "tinydungeon_enemy_spider",
        "tinydungeon_enemy_mimic",
      ],
      // platform rolü mockGameTemplate.js'in #platform-row (4x tekrarlanan
      // zemin şeridi) render mantığına AYNEN oturuyor — düz zemin karosu.
      platform: "tinydungeon_tile_floor",
      // "tile" — SADECE gerçek (LLM) üretimde görünür (mock bu anahtarı
      // OKUMUYOR, bkz. Racing'in aynı deseni). Duvar + kapı eşiği karosu
      // (Tiny Dungeon) + ROUND 25: Retro Fantasy Kit'in taş merdiveni +
      // tırmanma merdiveni + Retro Textures Fantasy'nin tuğla duvar/tahta
      // zemin dokusu EKLENDİ — hepsi mock tarafından tüketilmeyen, SADECE
      // LLM'e sunulan bir rol olduğu için bu ekleme mock demo'nun görsel
      // tutarlılığını SIFIR riskle zenginleştiriyor (bkz. retro-fantasy.js
      // ve retro-textures-fantasy.js dosya başı notu).
      tile: [
        "tinydungeon_tile_wall",
        "tinydungeon_tile_door_threshold",
        "retrofantasy_stairs_stone",
        "retrofantasy_ladder",
        "retrotex_wall_brick",
        "retrotex_floor_wood",
      ],
      collectible: ["tinydungeon_potion_red", "tinydungeon_potion_blue"],
      // "gameObject" — YENİ kit rol anahtarı (bu göreve özel istenen "GAME
      // OBJECT" kategorisi için). normalizeRoles() bu anahtarı OKUMUYOR
      // (decoration/tile gibi mock'ta hiçbir etkisi/riski yok), ama
      // buildAssetContextMessageForKit() TÜM rolleri LLM'e aktardığı için
      // gerçek üretimde sandık/kapı LLM'e "kullanılabilir" gösteriliyor.
      // ROUND 25: Retro Textures Fantasy'nin ahşap kapısı EKLENDİ (Tiny
      // Dungeon'ın kendi tinydungeon_door'undan farklı bir görsel stil —
      // ikisi de LLM'e seçenek olarak sunuluyor, biri seçilmeye zorlanmıyor).
      gameObject: ["tinydungeon_chest", "tinydungeon_door", "retrotex_door_wood"],
      // "decoration" — SADECE gerçek (LLM) üretimde görünür (mock
      // tüketmiyor) — forest-platformer/racing ile aynı desen. ROUND 25:
      // Retro Fantasy Kit'in 4 mimari dekor objesi (duvar/kule/varil/sütun)
      // EKLENDİ — aynı gerekçeyle (tile rolüyle birebir aynı, bkz. yukarı).
      decoration: [
        "tinydungeon_decoration_torch",
        "tinydungeon_decoration_barrel",
        "tinydungeon_decoration_crate",
        "tinydungeon_decoration_tombstone",
        "retrofantasy_wall_fortified",
        "retrofantasy_tower",
        "retrofantasy_barrels",
        "retrofantasy_column",
      ],
      // ROUND 25: Particle Pack'in 2 partikülü (hit-impact: vuruş efekti,
      // magic-glow: büyü/iksir parıltısı) EKLENDİ — daha önce pakette hiç
      // gerçek bir effect sprite'ı yoktu, bu rol dürüstçe null'du (bkz.
      // eski missingRoles). Artık gerçek bir karşılığı var, missingRoles'ten
      // ÇIKARILDI (bkz. aşağı).
      effect: ["particle_hit_impact", "particle_magic_glow"],
      // Aşağıdaki 2 rol için pakette hâlâ GERÇEKTEN uygun bir asset yok —
      // uydurmak yerine dürüstçe null bırakıldı (bkz. missingRoles).
      background: null,
      ui: null,
    },
    missingRoles: [
      "background (pakette tam-sahne bir dungeon arka planı yok, her asset 16x16 bir tile)",
      "ui (pakette dungeon'a özel kullanılabilir bir HUD/UI ikonu yok — 3 adet beyaz reticle/forbidden-sign ikonu bulundu ama bunlar Tiled tileset editor placeholder'ı gibi görünüyor, gerçek in-game UI değil, dahil edilmedi)",
    ],
  },
  {
    key: "city",
    name: "City",
    description: "Bir araç, şehir trafiğinde/inşaat engellerinde ilerler.",
    // ROUND 25 — Selin'in kendi sağladığı, CC0 lisanslı "Kenney Car Kit" +
    // "City Kit Roads" + "City Kit Industrial 2.0" paketlerinden BİRLEŞTİRİLMİŞ,
    // internally-tutarlı YENİ bir kit (bkz. car-kit.js/city-kit-roads.js/
    // city-kit-industrial.js dosya başı notları ve ATTRIBUTION.md'ler).
    // Mevcut "racing" kitine BİLEREK eklenmedi — Car Kit/City Kit'in
    // "Kenney low-poly 3D toy" render stili, Racing pack'inin 2D top-down
    // sprite stiliyle görsel olarak çakışıyor; bu yüzden ayrı, kendi
    // içinde tutarlı bir kit kuruldu.
    roles: {
      player: "carkit_vehicle_sedan",
      // "obstacle" rolü hem trafik araçlarını HEM inşaat engellerini
      // içeriyor — diğer kitlerdeki AYNI "tek obstaclePool'da birleştir"
      // çözümü (bkz. racing/forest-platformer/space-shooter kitlerinin
      // aynı yorumu).
      obstacle: [
        "carkit_vehicle_taxi",
        "carkit_vehicle_police",
        "carkit_vehicle_ambulance",
        "carkit_vehicle_van",
        "carkit_vehicle_garbage_truck",
        "cityroads_cone",
        "cityroads_barrier",
      ],
      // platform rolü mockGameTemplate.js'in #platform-row (4x tekrarlanan
      // zemin şeridi) render mantığına AYNEN oturuyor — düz yol karosu.
      platform: "cityroads_tile_road_straight",
      // "tile" — SADECE gerçek (LLM) üretimde görünür (mock bu anahtarı
      // OKUMUYOR, bkz. Racing/Tiny Dungeon'ın aynı deseni). Viraj + kavşak.
      tile: ["cityroads_tile_road_curve", "cityroads_tile_road_intersection"],
      // "gameObject" — trafik ışığı + dur tabelası (interaktif sokak
      // objeleri, mock tüketmiyor, LLM'e sunuluyor).
      gameObject: ["cityroads_traffic_light", "cityroads_sign_stop"],
      // "decoration" — SADECE gerçek (LLM) üretimde görünür (mock
      // tüketmiyor) — City Kit Roads'un 2 sokak objesi + City Kit
      // Industrial'ın 4 bina/sanayi objesi.
      decoration: [
        "cityroads_dumpster",
        "cityroads_electricity_pole",
        "cityindustrial_building_office",
        "cityindustrial_building_factory",
        "cityindustrial_water_tower",
        "cityindustrial_shipping_container",
      ],
      // Particle Pack'in city'ye uygun 3 partikülü (çarpışma/duman/kıvılcım).
      effect: ["particle_hit_impact", "particle_smoke_puff", "particle_spark_burst"],
      // Aşağıdaki 3 rol için hiçbir pakette GERÇEKTEN uygun bir asset yok —
      // uydurmak yerine dürüstçe null bırakıldı (bkz. missingRoles).
      collectible: null,
      background: null,
      ui: null,
    },
    missingRoles: [
      "collectible (Car Kit/City Kit paketlerinde coin/gem tarzı bir toplanabilir yok)",
      "background (paketlerde tam-sahne bir şehir arka planı yok, sadece tekil yol/bina objeleri var)",
      "ui (paketlerde şehir temalı kullanılabilir bir HUD/UI ikonu yok)",
    ],
  },
  {
    key: "cooking",
    name: "Cooking",
    description: "Doğru malzemeyi doğru kaba/tahtaya toplayıp basit bir tarif tamamla.",
    // ROUND 25 — Selin'in kendi sağladığı, CC0 lisanslı "Kenney Food Kit"
    // bu kitin gerçek asset kiti olarak entegre edildi (bkz. food-kit.js ve
    // ATTRIBUTION.md). fruit-puzzle kitiyle benzer bir "toplanabilir +
    // hedef kap" iskeleti kullanıyor ama TEMASI tamamen farklı (yemek
    // pişirme, meyve/sebze eşleştirme değil) — bu yüzden ayrı bir kit.
    roles: {
      // Pakette hiçbir karakter/oyuncu figürü ya da doğal bir düşman/engel
      // YOK (fruit-puzzle'ın da hiç enemy'i olmadığı gibi) — dürüstçe null.
      player: null,
      obstacle: null,
      collectible: [
        "foodkit_apple",
        "foodkit_banana",
        "foodkit_tomato",
        "foodkit_carrot",
        "foodkit_egg",
        "foodkit_cheese",
        "foodkit_bread",
        "foodkit_fish",
      ],
      // fruit-puzzle'ın basket_red/basket_green'iyle AYNI desen: hedef kap.
      target: ["foodkit_plate", "foodkit_cutting_board"],
      // "gameObject" — mutfak aletleri (mock tüketmiyor, LLM'e sunuluyor).
      gameObject: ["foodkit_pot", "foodkit_frying_pan", "foodkit_cooking_knife"],
      // "decoration" — SADECE gerçek (LLM) üretimde görünür (mock
      // tüketmiyor) — hazır yemekler, sahne zenginliği.
      decoration: ["foodkit_burger", "foodkit_pizza", "foodkit_cake", "foodkit_donut"],
      // Particle Pack'in cooking'e uygun 2 partikülü (duman/parıltı).
      effect: ["particle_smoke_puff", "particle_star_sparkle"],
      // Aşağıdaki 2 rol için pakette GERÇEKTEN uygun bir asset yok —
      // uydurmak yerine dürüstçe null bırakıldı (bkz. missingRoles).
      background: null,
      ui: null,
    },
    missingRoles: [
      "player (Food Kit'te hiçbir karakter/şef figürü yok)",
      "obstacle (Food Kit'te doğal bir düşman/engel kavramı yok — fruit-puzzle'ın da hiç enemy'i olmadığı gibi)",
      "background (pakette tam-sahne bir mutfak arka planı yok, sadece tekil malzeme/alet objeleri var)",
      "ui (pakette yemek temalı kullanılabilir bir HUD/UI ikonu yok)",
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
