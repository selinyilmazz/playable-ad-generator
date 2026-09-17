/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Renderer + tema tablosu
 *
 * TÜM görsel çizimin tek yeri: zemin/arka plan + hafif bir "derinlik ızgara"
 * + dünya sınırı + entity'ler (basit yön göstergesi + isabet flash'i +
 * dokunulmazlık titremesi + hafif "bob" animasyonu ile). Görev maddesi
 * "sadece boş bir canvas gibi görünmesin" burada karşılanıyor.
 *
 * THEMES tablosu BİLEREK veri-tabanlı: yeni bir tema eklemek (örn. "desert")
 * sadece bu objeye bir girdi eklemek demektir — hiçbir yerde `if (theme ===
 * "forest")` gibi bir dallanma yok. specSchema.js zaten theme'i bir string'e
 * indirger; burada bilinmeyen bir tema ismi sessizce "neutral"a düşer.
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Utils = ns.Utils;

  // COLLECTIBLES+OBSTACLES round — her temaya SADECE bir `obstacle` rengi
  // eklendi (additive, mevcut alanlar/değerler HİÇ değişmedi). Collectible'lar
  // ayrı bir renk İSTEMİYOR — zaten "dikkat çeksin" diye tasarlanmış
  // `theme.accent`'i (parlama/çekirdek) kullanıyorlar, bkz. drawCollectible.
  var THEMES = {
    neutral: { sky: "#161a22", ground: "#1d2430", grid: "rgba(255,255,255,0.05)", player: "#f4d35e", enemy: "#ef476f", accent: "#8ecae6", obstacle: "#3a4356" },
    forest: { sky: "#12261c", ground: "#183a29", grid: "rgba(180,255,200,0.06)", player: "#ffd166", enemy: "#c0392b", accent: "#7bd389", obstacle: "#4a3b2a" },
    dungeon: { sky: "#151018", ground: "#231a29", grid: "rgba(200,170,255,0.05)", player: "#f4d35e", enemy: "#9b5de5", accent: "#c77dff", obstacle: "#332738" },
    space: { sky: "#05070f", ground: "#0b1027", grid: "rgba(140,180,255,0.06)", player: "#4cc9f0", enemy: "#f72585", accent: "#4361ee", obstacle: "#1c2340" },
  };

  function getTheme(name) {
    return THEMES[name] || THEMES.neutral;
  }

  // ASSET LIBRARY round — sprite'lar (player/enemy/collectible/obstacle/
  // background) her zaman entity'nin hitbox'ından (radius) BİRAZ büyük
  // çizilsin diye sabit ölçek çarpanları — "kolay fark edilsin"/"tema ile
  // uyumlu görünsün" gereksinimi, çoğu asset'in (16px-40px pixel-art)
  // hitbox'la aynı boyutta çizildiğinde çok küçük/silik kalmasını önler.
  // WORLD RENDERING round — HEDEF 6 "entity türüne göre mantıklı scale":
  // tek bir paylaşılan sabit YERİNE, role göre küçük bir lookup tablosu
  // (THEMES/COLLISION_MODES İLE AYNI veri-tabanlı desen). Player biraz daha
  // büyük/belirgin (odak noktası), enemy net görünür ama player'ı gölgede
  // bırakmayacak kadar küçük. Bilinmeyen/verilmeyen bir rol (ör. ileride
  // yeni bir entity türü) eski PAYLAŞILAN değere (2.6) düşer — davranış
  // hiçbir zaman tanımsız/NaN olmaz.
  var ENTITY_SPRITE_SCALE_BY_ROLE = { player: 2.9, enemy: 2.5 };
  var DEFAULT_ENTITY_SPRITE_SCALE = 2.6;
  // WORLD DENSITY & GAMEPLAY READABILITY round — HEDEF 7 "collectible kolay
  // fark edilsin": 2.7 -> 3.0 küçük artış (obstacle/decoration'dan daha
  // görünür olsun diye) — player(2.9)/enemy(2.5) İLE AYNI büyüklük
  // mertebesinde kalır, "aşırı büyütme" kısıtını ihlal etmez.
  var COLLECTIBLE_SPRITE_SCALE = 3.0;
  // WORLD DENSITY & GAMEPLAY READABILITY round — HEDEF 4 "Dekorasyonlar
  // gameplay objelerinden daha baskın görünmemeli": eski değer (1.7 —
  // tileSize=64 için ~108.8px) player'dan (spriteScale 2.9*radius16≈46px)
  // ve obstacle'ın varsayılan boyutundan (tileSize*0.75≈48px) BELİRGİN
  // ŞEKİLDE büyüktü — dekorasyonlar (ör. bir mantar/ev) gameplay
  // entity'lerinden daha "baskın" görünüyordu. 1.7 -> 1.0'a düşürüldü
  // (tileSize=64 için ~64px temel kutu — obstacle/player mertebesinde,
  // ONLARI GEÇMİYOR), + DECORATION_ALPHA ile hafif bir görsel "geri çekilme"
  // (visual hierarchy: decoration < obstacle/collectible/enemy/player).
  var DECORATION_TILE_MULTIPLIER = 1.0;
  // HEDEF 2 "dekorasyonların hepsi aynı büyüklükte ... görünmemeli":
  // worldDecorations.js'in her öğe için ürettiği deterministik `scale`
  // (bkz. specSchema.js sanitizeDecorations) [MIN,MAX] aralığına
  // kelepçelenir — burada TEKRAR kelepçelemek (specSchema.js zaten
  // yapıyor) sadece renderer'ın kendi güvenlik ağı (elle yazılmış bir
  // spec'te mantıksız bir scale gelse bile çizim asla bozulmaz/devasa
  // olmaz).
  var DECORATION_SCALE_MIN = 0.5;
  var DECORATION_SCALE_MAX = 2;
  // HEDEF 4/8 "decoration gameplay objelerinden daha baskın olmasın" /
  // "obstacle gibi görünmesine izin verme": tam opaklığın hafif altında —
  // gözün önce player/enemy/collectible/obstacle'a gitmesini sağlayan,
  // göze batmayan küçük bir görsel "geri plan" ipucu.
  var DECORATION_ALPHA = 0.88;
  // Viewport dışında kalan dekorasyonları çizmeden atlamak için küçük bir
  // pay (tam kenarda aniden "kesilmiş" görünmesin diye).
  var DECORATION_CULL_MARGIN = 96;

  // VISUAL QUALITY round — enemy "moving" iken çok hafif bir nefes alma
  // (uniform scale) pulse'ı: x/y'ye AYNI oranda uygulandığı için sprite'ın
  // en-boy oranını/şeklini HİÇ bozmaz (görev kısıtı: "sprite'ın şeklini
  // bozacak transformlar kullanma") — sadece "canlı/tetikte" hissi verir.
  // Player'a UYGULANMAZ (görev SADECE enemy için istiyor).
  var ENEMY_PULSE_AMPLITUDE = 0.06;

  // Basit eliptik "ground shadow" (HEDEF 7) — entity'nin GERÇEK (bob'suz)
  // konumunun hemen altına, sabit oranlarla ölçeklenmiş, sprite/primitive
  // HER İKİ modda da aynı şekilde çizilir. Gameplay/collision'a HİÇ dahil
  // değil — sadece renderer içinde, salt görsel.
  var SHADOW_OFFSET_Y_RATIO = 0.62;
  var SHADOW_RADIUS_X_RATIO = 0.85;
  var SHADOW_RADIUS_Y_RATIO = 0.35;
  var SHADOW_ALPHA = 0.28;

  // WORLD RENDERING round — HEDEF 2 "çok hafif texture/noise/pattern":
  // gerçek bir zemin karosu (groundImage) YOKKEN (bkz. drawWorld), düz tek
  // renkli zemin çok "AI demo canvas" hissi verdiği için, dünya
  // koordinatına SABİT (kamerayla birlikte "yüzmeyen"), deterministik
  // (Utils.deterministicHash01 — Math.random YOK) küçük "leke"lerle hafif
  // bir varyasyon eklenir. Yoğunluk/opaklık BİLEREK çok düşük tutuldu
  // ("gameplay elementlerinin okunabilirliğini bozma" kısıtı) — SADECE
  // görünür hücreler hesaplanır (grid çizgileriyle AYNI teknik), bu yüzden
  // dünya boyutundan BAĞIMSIZ, ucuz bir işlem.
  var GROUND_TEXTURE_CELL_SIZE = 96;
  var GROUND_TEXTURE_DENSITY = 0.32;
  var GROUND_TEXTURE_BASE_ALPHA = 0.05;
  var GROUND_TEXTURE_ALPHA_VARIANCE = 0.05;

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    // ASSET LIBRARY round — TÜM asset'ler pixel-art (bkz. assetResolver.js
    // kaynak paketleri): varsayılan bilinear smoothing bulanıklaştırır.
    // Bu SADECE drawImage()'ı etkiler — mevcut daire/dikdörtgen/gradient
    // (path/fill tabanlı) primitive çizimlerin GÖRÜNÜMÜNÜ HİÇ DEĞİŞTİRMEZ.
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * image'i (dw, dh) sınırlarına, DOĞAL en-boy oranını BOZMADAN ("contain",
   * ortalanmış) sığdırıp (dx, dy) merkezli çizer. ASSET LIBRARY round'un
   * "asset'in doğal aspect ratio'sunu bozma" kuralının TEK, paylaşılan
   * uygulama noktası.
   */
  function drawImageContained(ctx, image, cx, cy, maxW, maxH) {
    var scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
    var w = image.naturalWidth * scale;
    var h = image.naturalHeight * scale;
    ctx.drawImage(image, cx - w / 2, cy - h / 2, w, h);
  }

  Renderer.prototype.clear = function (theme) {
    var ctx = this.ctx;
    var w = this.canvas.clientWidth;
    var h = this.canvas.clientHeight;
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, w, h);
  };

  /**
   * WORLD RENDERING round — dünya koordinatına SABİT (kameradan BAĞIMSIZ,
   * bu yüzden "yüzmeyen"), deterministik hafif zemin varyasyonu. SADECE
   * groundImage YOKKEN (bkz. drawWorld) çağrılır — gerçek bir zemin karosu
   * kendi dokusunu zaten taşıyor, üstüne bunu eklemek gereksiz/gürültülü
   * olurdu. SADECE görünür (kameranın gördüğü) hücreler için hesaplanır.
   */
  Renderer.prototype._drawGroundTexture = function (camera, world, theme, viewportW, viewportH) {
    var ctx = this.ctx;
    var cell = GROUND_TEXTURE_CELL_SIZE;
    var startCol = Math.max(0, Math.floor(camera.x / cell));
    var endCol = Math.min(Math.ceil(world.width / cell), Math.ceil((camera.x + viewportW) / cell));
    var startRow = Math.max(0, Math.floor(camera.y / cell));
    var endRow = Math.min(Math.ceil(world.height / cell), Math.ceil((camera.y + viewportH) / cell));

    ctx.save();
    ctx.fillStyle = theme.accent;
    for (var row = startRow; row <= endRow; row++) {
      for (var col = startCol; col <= endCol; col++) {
        var roll = Utils.deterministicHash01(col, row, 11);
        if (roll > GROUND_TEXTURE_DENSITY) continue;

        var worldX = col * cell + Utils.deterministicHash01(col, row, 22) * cell;
        var worldY = row * cell + Utils.deterministicHash01(col, row, 33) * cell;
        if (worldX > world.width || worldY > world.height) continue;

        var size = 2 + Utils.deterministicHash01(col, row, 44) * 3;
        ctx.globalAlpha = GROUND_TEXTURE_BASE_ALPHA + Utils.deterministicHash01(col, row, 55) * GROUND_TEXTURE_ALPHA_VARIANCE;
        ctx.beginPath();
        ctx.ellipse(worldX - camera.x, worldY - camera.y, size, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /**
   * groundImage: OPSİYONEL (4.parametre — ASSET LIBRARY round'da adı
   * "backgroundImage"ti; WORLD RENDERING round'da anlamı DARALTILDI: artık
   * SADECE gerçekten döşenebilir/seamless olduğu ELLE doğrulanmış bir
   * kaynaktan gelir — bkz. server/services/topdown/assetResolver.js
   * resolveTopDownGroundTile() — "background" rolünün KENDİSİ DEĞİL, çünkü
   * bazı temaların (forest) background asset'i aslında bir YAN-BAKIŞ
   * platformer parallax sahnesi ve top-down'da döşendiğinde "yatay şerit"
   * hatası üretiyordu (bkz. teslim raporu). Verilmezse (forest/neutral):
   * düz zemin rengi + HAFİF deterministik doku (bkz. _drawGroundTexture) +
   * ızgara — "tek ve sürekli bir dünya" hissi, "AI demo" düzlüğü değil.
   * Verilirse (dungeon'ın küçük floor tile'ı / space'in yıldız alanı):
   * kameranın ızgarayla AYNI mod-tabanlı tekniğiyle (bkz. startX/startY)
   * döşenir — sadece görünür viewport kadar çizilir, performans dünya
   * boyutundan BAĞIMSIZ kalır. Dünya sınırı çerçevesi HER İKİ modda da
   * çizilir.
   */
  Renderer.prototype.drawWorld = function (camera, world, theme, groundImage) {
    var ctx = this.ctx;
    var w = this.canvas.clientWidth;
    var h = this.canvas.clientHeight;

    if (groundImage) {
      var tileW = groundImage.naturalWidth;
      var tileH = groundImage.naturalHeight;
      var bgStartX = -(camera.x % tileW);
      var bgStartY = -(camera.y % tileH);
      for (var tx = bgStartX; tx < w; tx += tileW) {
        for (var ty = bgStartY; ty < h; ty += tileH) {
          ctx.drawImage(groundImage, tx, ty, tileW, tileH);
        }
      }
    } else {
      // Zemin (dünyanın kendisi, kamera ofsetiyle).
      ctx.fillStyle = theme.ground;
      ctx.fillRect(-camera.x, -camera.y, world.width, world.height);

      // WORLD RENDERING round — hafif, deterministik zemin varyasyonu.
      this._drawGroundTexture(camera, world, theme, w, h);

      // Hafif ızgara — kameranın/hareketin hissedilmesi için basit bir
      // derinlik ipucu (dekoratif, oynanışı etkilemez).
      var tile = world.tileSize;
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      var startX = -(camera.x % tile);
      var startY = -(camera.y % tile);
      for (var x = startX; x < w; x += tile) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (var y = startY; y < h; y += tile) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }

    // Dünya sınırı — oyuncunun "kenara geldim" hissetmesi için belirgin çerçeve.
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(-camera.x, -camera.y, world.width, world.height);
  };

  /**
   * WORLD RENDERING round — decorations: spec.decorations (bkz.
   * specSchema.js) — [{x, y, path}], SADECE görsel, gameplay/collision'a
   * HİÇ dahil değil (hiçbir çağıran bu listeyi collision için okumuyor).
   * assetLoader.getByPath() ile TEMBEL yüklenir; henüz hazır değilse/
   * yüklenemezse o dekorasyon o frame'de SESSİZCE atlanır (kritik değil,
   * SADECE bir bonus sahne objesi) — primitive bir fallback ŞEKLİ ÇİZİLMEZ
   * (bir dekorasyonun "ne" olduğu bilinmeden anlamlı bir primitive icat
   * etmek yerine, en güvenlisi hiç çizmemek). Viewport dışındakiler ucuz bir
   * kutu testiyle atlanır (performans).
   *
   * WORLD DENSITY & GAMEPLAY READABILITY round — HER dekorasyonun kendi
   * (opsiyonel, varsayılan 1) `d.scale`'i temel kutuya çarpılır ("hepsi
   * aynı büyüklükte görünmesin") ve DECORATION_ALPHA (tam opaklığın hafif
   * altı) ile çizilir (visual hierarchy: decoration, gameplay entity'lerin
   * ALTINDA bir görsel ağırlıkta kalsın). Draw order (ground -> decoration
   * -> obstacle -> collectible -> enemy -> player, bkz. runtime.js render())
   * HİÇ değişmedi.
   */
  Renderer.prototype.drawDecorations = function (decorations, camera, assetLoader, tileSize) {
    if (!decorations || decorations.length === 0) return;
    var ctx = this.ctx;
    var w = this.canvas.clientWidth;
    var h = this.canvas.clientHeight;
    var baseBox = (typeof tileSize === "number" && tileSize > 0 ? tileSize : 64) * DECORATION_TILE_MULTIPLIER;

    for (var i = 0; i < decorations.length; i++) {
      var d = decorations[i];
      var sx = d.x - camera.x;
      var sy = d.y - camera.y;
      if (sx < -DECORATION_CULL_MARGIN || sx > w + DECORATION_CULL_MARGIN) continue;
      if (sy < -DECORATION_CULL_MARGIN || sy > h + DECORATION_CULL_MARGIN) continue;

      var image = assetLoader.getByPath(d.path);
      if (!image) continue;

      var itemScale = Utils.clamp(
        typeof d.scale === "number" && isFinite(d.scale) ? d.scale : 1,
        DECORATION_SCALE_MIN,
        DECORATION_SCALE_MAX
      );
      var box = baseBox * itemScale;

      ctx.save();
      ctx.globalAlpha = DECORATION_ALPHA;
      drawImageContained(ctx, image, sx, sy, box, box);
      ctx.restore();
    }
  };

  /**
   * VISUAL QUALITY round — HER iki modda (sprite/primitive) da entity'nin
   * ALTINA, sabit oranlarla ölçeklenmiş, yarı saydam bir elips gölge çizer.
   * Entity'nin GERÇEK (bob'suz) konumu kullanılır (groundSx/groundSy) —
   * böylece sprite hafifçe "zıplarken" (bob) gölge sabit/"yerde" kalır,
   * klasik 2D oyun tekniği. Sadece renderer içinde, saf görsel — gameplay/
   * collision hesabına HİÇ dahil değil (hiçbir çağıran bu fonksiyonun
   * sonucunu okumuyor bile).
   */
  Renderer.prototype._drawGroundShadow = function (groundSx, groundSy, radius) {
    var ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = SHADOW_ALPHA;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(
      groundSx,
      groundSy + radius * SHADOW_OFFSET_Y_RATIO,
      radius * SHADOW_RADIUS_X_RATIO,
      radius * SHADOW_RADIUS_Y_RATIO,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  };

  /**
   * image: OPSİYONEL (4. parametre, ASSET LIBRARY round — geriye dönük
   * UYUMLU, verilmezse/hazır değilse davranış BİREBİR ÖNCEKİ round'la aynı:
   * düz renkli daire + yön göstergesi). Verilirse gerçek sprite, doğal
   * en-boy oranı korunarak (drawImageContained) çizilir; isabet/dokunulmazlık
   * geri bildirimi (flash/flicker) sprite modunda da KORUNUR — sadece "beyaz
   * daireye dönüştürme" yerine (bir PNG'yi pikselden yeniden renklendirmek
   * karmaşık/kırılgan olurdu) sprite'ın ÜZERİNE yarı saydam beyaz bir "isabet"
   * halkası bindirilir; bu da AYNI "bir şey oldu" hissini verir.
   *
   * options: OPSİYONEL (5. parametre, VISUAL QUALITY round — geriye dönük
   * UYUMLU, verilmezse davranış ÖNCEKİ round'la aynı + yeni yön/gölge
   * eklemeleriyle). `options.pulse === true` ise (SADECE runtime.js'in enemy
   * çağrısında kullanılıyor) entity "moving" durumundayken sprite'ın
   * en-boy oranını KORUYAN (x/y'ye AYNI oranda) hafif bir "nefes" pulse'ı
   * eklenir — sprite'ın ŞEKLİNİ asla bozmaz. `options.role` ("player" |
   * "enemy", WORLD RENDERING round) HANGİ sprite ölçek çarpanının (bkz.
   * ENTITY_SPRITE_SCALE_BY_ROLE) kullanılacağını belirler — verilmezse/
   * tanınmayan bir değerse ÖNCEKİ round'daki PAYLAŞILAN sabite düşer.
   */
  Renderer.prototype.drawEntity = function (entity, camera, color, image, options) {
    options = options || {};
    var ctx = this.ctx;
    // Yerde/collision'da kullanılan GERÇEK konum — bob'suz, gölge bunu kullanır.
    var groundSx = entity.x - camera.x;
    var groundSy = entity.y - camera.y;
    var sx = groundSx;
    var sy = groundSy + Math.sin(entity.bobPhase) * 2;

    this._drawGroundShadow(groundSx, groundSy, entity.radius);

    var visual = ns.Animation.resolveVisualState(entity);
    var isFlashing = entity.hitFlashTimer > 0 && Math.floor(entity.hitFlashTimer * 20) % 2 === 0;
    var isInvulnerable = typeof entity.isInvulnerable === "function" && entity.isInvulnerable();
    var flicker = isInvulnerable && Math.floor((entity.invulnerableTimer || 0) * 12) % 2 === 0;
    // Enemy-only "nefes" pulse'ı (bkz. yukarıdaki options notu) — Entity'nin
    // KENDİ bobPhase'ini (zaten sadece "moving" iken ilerliyor) kaynak alır,
    // yeni bir zamanlayıcı İCAT ETMEZ.
    var pulseScale = (options.pulse && visual.moving)
      ? 1 + Math.sin(entity.bobPhase * 1.3) * ENEMY_PULSE_AMPLITUDE
      : 1;
    var spriteScale = ENTITY_SPRITE_SCALE_BY_ROLE[options.role] || DEFAULT_ENTITY_SPRITE_SCALE;

    ctx.save();
    ctx.globalAlpha = flicker ? 0.35 : 1;

    if (image) {
      var box = entity.radius * spriteScale * pulseScale;
      // Yatay flip: sağa bakarken normal, sola bakarken scaleX(-1) — sprite
      // ASLA döndürülmez/deforme edilmez (görev kısıtı), sadece aynalanır.
      // translate + scale ile sprite'ı (0,0)'a göre çizip context'i geri
      // saklıyoruz (ctx.restore() en sonda) — flip SADECE bu entity'yi etkiler.
      ctx.save();
      ctx.translate(sx, sy);
      if (visual.flipX) ctx.scale(-1, 1);
      drawImageContained(ctx, image, 0, 0, box, box);
      if (isFlashing) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = flicker ? 0.35 : 1;
      }
      ctx.restore();
    } else {
      ctx.fillStyle = isFlashing ? "#ffffff" : color;
      ctx.beginPath();
      ctx.arc(sx, sy, entity.radius * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      // Basit yön göstergesi — hareket varsa entity'nin "baktığı" yönü belli eder.
      if (Math.abs(entity.vx) > 1 || Math.abs(entity.vy) > 1) {
        var dir = Math.atan2(entity.vy, entity.vx);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(dir) * entity.radius, sy + Math.sin(dir) * entity.radius);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /**
   * COLLECTIBLES+OBSTACLES round — obstacle: {x, y, width, height} (SOL-ÜST
   * köşe, bkz. specSchema.js sanitizeObstacles). "Oyun alanının parçası gibi
   * görünsün": theme'e özgü, ground'dan ayırt edilebilir ama ona ait
   * hissettiren yuvarlak-köşeli bir dikdörtgen + ince accent kenarlık.
   * roundRect() bazı eski canvas implementasyonlarında yok — uyumluluk için
   * elle path çizildi (yeni bir dış bağımlılık/API varsayımı yok).
   */
  /**
   * image: OPSİYONEL (5. parametre, ASSET LIBRARY round — geriye dönük
   * UYUMLU). Verilirse, obstacle'ın {width,height} dikdörtgenine "contain"
   * (en-boy oranı BOZULMADAN, ortalanmış) sığdırılır; verilmezse/hazır
   * değilse davranış BİREBİR ÖNCEKİ round'la aynı (yuvarlak köşeli dikdörtgen
   * fallback).
   */
  Renderer.prototype.drawObstacle = function (obstacle, camera, theme, image) {
    var ctx = this.ctx;
    var sx = obstacle.x - camera.x;
    var sy = obstacle.y - camera.y;
    var w = obstacle.width;
    var h = obstacle.height;

    if (image) {
      ctx.save();
      drawImageContained(ctx, image, sx + w / 2, sy + h / 2, w, h);
      ctx.restore();
      return;
    }

    var r = Math.min(10, w / 4, h / 4);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx + r, sy);
    ctx.lineTo(sx + w - r, sy);
    ctx.quadraticCurveTo(sx + w, sy, sx + w, sy + r);
    ctx.lineTo(sx + w, sy + h - r);
    ctx.quadraticCurveTo(sx + w, sy + h, sx + w - r, sy + h);
    ctx.lineTo(sx + r, sy + h);
    ctx.quadraticCurveTo(sx, sy + h, sx, sy + h - r);
    ctx.lineTo(sx, sy + r);
    ctx.quadraticCurveTo(sx, sy, sx + r, sy);
    ctx.closePath();

    ctx.fillStyle = theme.obstacle || theme.ground;
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  /**
   * COLLECTIBLES+OBSTACLES round — item: {x, y, radius, bobPhase} (bkz.
   * collectibles.js CollectibleField). "Kolay fark edilsin": yumuşak bir
   * dış parlama (radial gradient) + parlak bir çekirdek + hafif nabız
   * (pulse)/bob animasyonu — Entity'lerin (player/enemy) düz daire
   * görünümünden BİLEREK farklı, "toplanabilir" hissi versin diye.
   */
  /**
   * image: OPSİYONEL (4. parametre, ASSET LIBRARY round — geriye dönük
   * UYUMLU). Verilirse bob/pulse hareketi KORUNARAK gerçek sprite (doğal
   * en-boy oranıyla) çizilir, ALTINDA hâlâ hafif bir accent parlaması
   * bırakılır (sprite küçük bir pixel-art ikonken bile "kolay fark
   * edilsin" gereksinimini korumak için) — verilmezse/hazır değilse
   * davranış BİREBİR ÖNCEKİ round'la aynı (glow + daire + highlight).
   */
  Renderer.prototype.drawCollectible = function (item, camera, theme, image) {
    var ctx = this.ctx;
    var sx = item.x - camera.x;
    var sy = item.y - camera.y + Math.sin(item.bobPhase) * 3;
    var pulse = 1 + Math.sin(item.bobPhase * 1.5) * 0.12;
    var r = item.radius * pulse;

    ctx.save();
    var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
    glow.addColorStop(0, theme.accent);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = image ? 0.3 : 0.45;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    if (image) {
      ctx.globalAlpha = 1;
      drawImageContained(ctx, image, sx, sy, r * COLLECTIBLE_SPRITE_SCALE, r * COLLECTIBLE_SPRITE_SCALE);
      ctx.restore();
      return;
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  ns.Renderer = Renderer;
  ns.getTheme = getTheme;
  ns.THEMES = THEMES;
})(window.TopDownRuntime);
