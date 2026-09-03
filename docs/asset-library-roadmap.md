# Multi-Genre Professional Asset Library — Mimari & Yol Haritası

**Round 18 — Sadece mimari ve rapor. Hiçbir yeni asset indirilmedi.**

Bu doküman iki bölümden oluşuyor: (1) mevcut mimarinin nasıl çalıştığı ve bu
round'da neyin, neden değiştiği; (2) 8 yeni tür için ihtiyaç analizi —
hangi rollerden yaklaşık kaç asset gerekiyor.

---

## 1. Mevcut mimari incelemesi — neyi bozmadan nereye kadar ölçekleniyor

İstediğin gibi önce mevcut `assetManifest`, `assetKits`, `mockAssetSelector`,
`mockGameTemplate` ve generation pipeline'ı (`gameTypeDetection.js`,
`routes/generate.js`, `assetContext.js`) tek tek incelendi. Sonuç: mimarinin
büyük kısmı **zaten** çok-türlü ölçeklenmeye hazırdı, sadece üç somut nokta
gerçek bir darboğazdı. Aşağıda hangi parça neden ✅/⚠️ olarak işaretlendi:

| Katman | Durum | Neden |
|---|---|---|
| `gameTypeDetection.js` (prompt → tür) | ✅ zaten hazır | `GAME_TYPE_KEYWORDS` düz bir obje — yeni tür = yeni bir `key: [kelimeler]` satırı, kod değişmiyor |
| `assetKits.js` (`GAME_KITS`, `resolveKitRoles`) | ✅ zaten hazır | `GAME_KITS` bir dizi, generic olarak dolaşılıyor — yeni kit = diziye yeni bir obje `push` |
| `mockAssetSelector.js` | ✅ zaten hazır | `resolveKitRoles(gameType)` sonucunu olduğu gibi kullanıyor, rol adlarını hardcode etmiyor |
| `assetContext.js` (`buildAssetContextMessageForKit`) | ✅ zaten hazır | `Object.keys(resolved.roles)` ile TÜM rolleri generic geziyor — yeni bir rol adı eklense bile otomatik LLM'e taşınır |
| `assetManifest.js` (asset verisi) | ⚠️ darboğazdı | Tüm paketler TEK dosyada, tek bir dizide — 10 pakete çıkınca binlerce satırlık, birleştirilmesi riskli bir dosya olurdu |
| `category` enum (asset sınıflandırması) | ⚠️ dardı | Sadece 9 değer — weapon/vehicle/tile/powerup/ui gibi yeni tür-özgü roller için karşılığı yoktu |
| Pack envanteri | ⚠️ yoktu | "Hangi paketler var, hangileri planlanıyor, hangi lisansla" sorusunun tek bir cevabı yoktu — bilgi assetManifest.js yorumlarına dağılmıştı |
| `mockGameTemplate.js` `normalizeRoles()` | ⚠️ dardı (mock-preview'a özel) | Sadece player/environment/platform/collectible/obstacle/effect/target rollerini tanıyordu |

Yani gerçek "mimari borç" sadece üç yerdeydi — onları düzelttim, geri kalanı
zaten senin orijinal Phase 3 tasarımın sayesinde hazırdı.

## 2. Bu round'da yapılan değişiklikler

### 2.1 `assetManifest.js` → paket-başına dosya mimarisi

`server/config/assetManifest.js` artık asset VERİSİ taşımıyor, sadece
**birleştirici** (aggregator). Gerçek veri paket başına ayrı dosyalarda:

```
server/config/packs/
  legacy-core.js            — eski 39 kayıt (paketsiz, düz public/assets/ altında)
  sunnyland-forest.js       — 17 kayıt (CC0, Round 14)
  kenney-space-shooter.js   — 22 kayıt (CC0, Round 16)
```

`assetManifest.js` bu üçünü `[].concat(...)` ile birleştirip aynı
`ASSET_MANIFEST` dizisini üretiyor — **hiçbir id/path/category/tags/
compatibleGameTypes/visualStyle değeri değişmedi**, sadece dosya
organizasyonu değişti. 10. paket eklendiğinde tek yapılacak şey
`packs/<yeni-pack>.js` dosyası + `assetManifest.js`'e bir `require` satırı;
mevcut paketlerin hiçbiri etkilenmiyor, diff'ler izole kalıyor.

### 2.2 `category` enum'u 9 → 14 değere genişledi

Yeni 5 değer: **`tile`, `powerup`, `weapon`, `vehicle`, `ui`**. Bugün
hiçbir asset bu kategorileri kullanmıyor (mevcut 78 kaydın hiçbiri
değişmedi) — sadece gelecekte eklenecek paketlerin varlıkları doğru
sınıflandırılabilsin diye şema önceden hazırlandı. Her biri `group`
(CHARACTERS/ENVIRONMENTS/PLATFORMS/OBJECTS/COLLECTIBLES/EFFECTS/UI)
taksonomisine de eşlendi — `ui` kategorisi, zaten var olup hiç
dolmamış "UI" grubunun ilk gerçek karşılığı oldu.

### 2.3 Yeni pack registry: `server/config/assetPacks.js`

Senin istediğin dizin ağacının (`sunnyland-forest/`, `kenney-space-shooter/`,
`medieval-rpg/`, `zombie-survival/`, `dungeon/`, ...) kod tarafındaki tek,
merkezi karşılığı. İki türde kayıt tutuyor:

- **`status: "active"`** (3 pack: legacy-core, sunnyland-forest,
  kenney-space-shooter) — `assetCount` alanı ASSET_MANIFEST'ten **canlı**
  sayılıyor, elle yazılmış/eskiyebilecek bir sayı değil.
- **`status: "planned"`** (8 pack — aşağıdaki bölüm) — `assetCount: 0`,
  `folderPath: null`, henüz hiçbir dosya yok. Her biri bir `roleBreakdown`
  (rol → tahmini asset sayısı) ve bir `suggestedKeywords` listesi taşıyor —
  gerçek assetler seçildiğinde `assetKits.js`'e kit olarak eklemek ve
  `gameTypeDetection.js`'e keyword olarak eklemek copy-paste'e yakın hale
  geliyor.

**Önemli:** planned paketlerin hiçbiri `assetKits.js` içindeki aktif
`GAME_KITS` dizisine ya da `gameTypeDetection.js` içindeki aktif
`GAME_TYPE_KEYWORDS`'e bağlanmadı — testler bunu özellikle doğruluyor
(`assetPacks.test.js`). Yani bugün "dungeon" yazan bir prompt hâlâ
`gameType: null` fallback'ine düşüyor, sana danışmadan hiçbir tür
"aktifleşmiş" gibi davranmıyor.

### 2.4 `mockGameTemplate.js` — genişletilmiş rol sözlüğü

`normalizeRoles()` artık `tile`/`weapon`/`vehicle`/`powerup`/`ui` rollerini
de tanıyor (`tilePool`, `weaponPool`, `vehicle`, `powerupPool`, `uiPool`
alanları eklendi). Bugün hiçbir aktif kit bu rolleri doldurmadığı için
**4 mevcut oyunun ürettiği HTML birebir aynı kaldı** (Playwright ile
Generate → Play doğrulandı, aşağıya bakın) — bu sadece, gerçek bir
"racing" kiti `roles.vehicle` tanımladığında mock şablonunun bu veriyi
sessizce yok saymak yerine en azından normalize edebilmesi için zemin.
Bu rollerin sahnede GÖRSEL olarak nasıl render edileceği (bir "vehicle"
sprite'ının nereye konacağı gibi) her yeni tür gerçek assetleriyle
entegre edilirken ayrıca tasarlanacak — bu round'un kapsamı değildi.

### 2.5 Test doğrulaması

78 test hâlâ **78/78 yeşil**. Üstüne 13 yeni test eklendi (yeni category
enum'u, `CATEGORY_TO_GROUP` bütünlüğü, `assetPacks.js` registry
doğrulaması, `normalizeRoles()`'un genişletilmiş rolleri) — toplam
**91/91 yeşil**. Ayrıca Playwright ile Generate → Play akışı hem Space
Shooter hem Forest Platformer için tekrar doğrulandı: üretilen HTML'deki
asset path'leri refactor öncesiyle **birebir aynı**.

---

## 3. Yeni asset kiti ihtiyaç raporu

Aşağıdaki 8 tür, mevcut 2 aktif pakettekiyle (17 ve 22 asset) **aynı
ölçekte** "küçük ama tam kapsayan curated kit" mantığıyla planlandı —
39 assetlik eski flat-primitive gibi rastgele büyük bir liste değil,
her biri görsel olarak tutarlı, tek kaynaktan (tercihen CC0/Kenney veya
benzeri) beslenecek bir kit.

Prompt → tür eşlemesi (aktifleştiğinde `gameTypeDetection.js`'e
eklenecek taslak anahtar kelimelerle):

| Prompt örneği | → Tür (pack key) | Önerilen anahtar kelimeler (taslak) |
|---|---|---|
| "space shooter" | `space-shooter` ✅ aktif | *(zaten aktif)* |
| "forest platformer" | `forest-platformer` ✅ aktif | *(zaten aktif)* |
| "dungeon RPG" | `dungeon` | dungeon, crawler, torch, trap, zindan, mahzen |
| "zombie survival" | `zombie-survival` | zombie, survival, apocalypse, zombi, hayatta kal |
| "medieval kingdom quest" | `medieval-rpg` | medieval, knight, castle, quest, şövalye, kale |
| "ninja stealth platformer" | `ninja-platformer` | ninja, shuriken, stealth, rooftop, samurai |
| "underwater diving adventure" | `underwater` | underwater, ocean, diver, submarine, deniz, dalgıç |
| "car racing" | `racing` | race, racing, car, track, yarış, araba |
| "magical fantasy quest" | `fantasy` | fantasy, magic, wizard, dragon, büyü, ejderha |
| "farm harvest simulator" | `farming` | farm, harvest, crop, çiftlik, hasat, tarla |

### 3.1 Rol/asset sayısı dökümü — 8 planlanan pack

| Pack | Toplam (tahmini) | Roller ve yaklaşık sayı |
|---|---|---|
| **medieval-rpg** | ~26 | character 3 (şövalye/büyücü/okçu) · enemy 5 (goblin/iskelet/ork/kurt/mini-boss) · weapon 3 (kılıç/yay/asa) · projectile 2 (ok/büyü mermisi) · collectible 3 (altın/iksir/mücevher) · powerup 2 · effect 3 · background 2 · tile 2 |
| **dungeon** | ~21 | character 2 · enemy 4 (iskelet/yarasa/slime/boss) · **tile 5** (duvar/zemin/kapı/merdiven/meşale) · object 3 (sandık/anahtar/tuzak) · collectible 2 · effect 3 · background 2 |
| **zombie-survival** | ~21 | character 2 · enemy 4 (normal/hızlı/tank/özel) · weapon 3 (tabanca/pompalı/sopa) · projectile 2 · object 3 (barikat/mühimmat/ilkyardım) · powerup 2 · effect 3 · background 2 |
| **ninja-platformer** | ~19 | character 2 · enemy 3 (samuray/rakip ninja/köpek) · weapon 2 · projectile 1 · collectible 2 · powerup 2 · effect 3 · background 2 · tile 2 |
| **underwater** | ~17 | character 2 · **vehicle 1** (mini denizaltı, opsiyonel) · enemy 4 (köpekbalığı/denizanası/yılanbalığı/ahtapot) · collectible 3 · powerup 2 · effect 2 · background 3 |
| **racing** | ~17 | **vehicle 3** (oyuncu arabası, 3 renk) · obstacle 3 (trafik/koni/yağ) · tile 3 (yol/viraj/bitiş) · powerup 2 · effect 3 · background 2 · **ui 1** (hız göstergesi) |
| **fantasy** | ~18 | character 2 · enemy 3 (mini ejderha/goblin/gölge) · collectible 3 · powerup 2 · projectile 2 · effect 3 · background 3 |
| **farming** | ~15 | character 1 · **vehicle 1** (traktör) · collectible 4 (buğday/havuç/balkabağı/mısır) · object 3 (çapa/kova/tohum) · powerup 2 · tile 2 · background 2 · effect 2 — *enemy bilerek yok, çiftlik türünde doğal bir çatışma yok* |

**Toplam tahmini: ~154 yeni curated asset, 8 pakette.**

### 3.2 Öncelik önerisi (senin onayına bağlı)

Sıralama, hem "en kolay tam kaynak bulunabilecek" hem de "en genel/talep
görecek tür" dengesine göre:

1. **dungeon** ve **medieval-rpg** — ikisi de Kenney'nin ilgili paketlerinde
   (ör. "Tiny Dungeon", "Medieval RTS/RPG" tarzı setler) muhtemelen tek
   kaynaktan karşılanabilir, tile-ağırlıklı yeni mimariyi ilk test edecek çift.
2. **zombie-survival** — weapon+projectile ikilisini ilk kullanan pack,
   talep gören bir tür.
3. **racing** — `vehicle` ve `ui` kategorilerinin ilk gerçek kullanım
   alanı, mimarinin bu iki yeni rolünü doğrulamak için değerli.
4. **ninja-platformer, underwater, fantasy, farming** — daha sonra,
   sırasıyla.

Bu sadece bir öneri — hangi türle başlamak istediğine sen karar ver,
ben o andan itibaren SunnyLand/Kenney Space Shooter'da izlenen AYNI
süreci (lisans doğrulama → görsel kalite/kategori/kullanılabilirlik
incelemesi → curated seçim → `packs/<key>.js` + `assetKits.js` +
`gameTypeDetection.js` + frontend kart güncellemeleri → test → Playwright
doğrulama → gerçek makineye teslim) uygularım.

---

## 4. Değişmeyenler (kontrol listesi)

- ✅ SunnyLand Forest ve Kenney Space Shooter kitleri **hiç bozulmadı** —
  Generate → Play her ikisi için de refactor öncesiyle birebir aynı HTML
  üretiyor.
- ✅ `GAME_KITS.length === 4`, `listGameTypeKeys()` aynı 4 tür — hiçbir
  planlanan tür otomatik aktifleşmedi.
- ✅ Hiçbir yeni asset dosyası indirilmedi/eklenmedi — bu round sadece
  mimari + rapor.
- ✅ 78 eski test + 13 yeni test = **91/91 yeşil**.
