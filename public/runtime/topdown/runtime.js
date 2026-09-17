/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — orchestrator (public API)
 *
 * `window.TopDownRuntime.create(canvas, rawSpec, options)` — tüm alt
 * sistemleri (spec normalize, camera, input, entity'ler, collision,
 * particles, HUD, game loop, responsive canvas) birbirine bağlayan TEK
 * giriş noktası. Belirli bir oyuna/temaya özel HİÇBİR şey içermez — tüm
 * davranış normalize edilmiş spec'ten (bkz. specSchema.js) türetilir.
 *
 * Bu dosya, aşağıdaki tüm dosyalardan SONRA yüklenmelidir (bkz.
 * topdown-test.html <script> sırası): utils, collision, specSchema,
 * inputManager, camera, entity, player, enemy, particles, gameState,
 * renderer, hud, gameLoop.
 *
 * ÖNEMLİ — LLM'den gelen HTML'e HİÇBİR BAĞIMLILIĞI YOK: bu runtime, tek
 * ihtiyaç duyduğu <canvas> elementi + bir JSON spec verildiğinde tamamen
 * bağımsız çalışır; free-HTML Generator pipeline'ı (systemPrompt.js,
 * openrouter.js, checks.js, app.js'in generate/preview akışı) bu dosyayı
 * hiç import ETMİYOR ve bu dosya da onlardan hiçbirini import ETMİYOR —
 * bu round'da AI generation entegrasyonu YOK (görev kapsamı dışı, kasıtlı).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  var Utils = ns.Utils;
  var Collision = ns.Collision;

  // HUD metnini her frame (60/sn) yerine bu aralıkla güncelle — görsel
  // sonuç kullanıcı için ayırt edilemez ama gereksiz DOM yazımı önlenir.
  var HUD_UPDATE_INTERVAL = 0.1;

  /**
   * Oyuncudan belirli bir minimum uzaklıkta, dünya sınırları içinde rastgele
   * düşman konumları üretir. `count` kez dener; makul bir deneme sayısından
   * sonra (nadir, çok küçük dünya + çok fazla düşman durumunda) en son bulunan
   * konumla devam eder — SONSUZ DÖNGÜYE asla girmez.
   *
   * COLLECTIBLES+OBSTACLES round — obstacleField OPSİYONEL/additive: verilirse
   * aynı retry döngüsü, bir obstacle'ın İÇİNE düşen konumları da elemeye
   * çalışır (mantıklı bir varsayılan: düşman bir duvarın içinde doğmasın).
   * Verilmezse (eski çağrı biçimi) davranış birebir ÖNCEKİ round'la aynıdır.
   */
  function spawnEnemies(spec, player, obstacleField) {
    var list = [];
    var minDistFromPlayer = Math.max(150, spec.world.width * 0.12);

    for (var i = 0; i < spec.enemies.count; i++) {
      var x, y, tries = 0;
      do {
        x = Utils.randRange(spec.enemies.radius, spec.world.width - spec.enemies.radius);
        y = Utils.randRange(spec.enemies.radius, spec.world.height - spec.enemies.radius);
        tries++;
      } while (
        (Utils.distance(x, y, player.x, player.y) < minDistFromPlayer ||
          (obstacleField && obstacleField.blocksCircle({ x: x, y: y, radius: spec.enemies.radius }))) &&
        tries < 20
      );

      list.push(new ns.Enemy({ x: x, y: y, radius: spec.enemies.radius, speed: spec.enemies.speed }));
    }
    return list;
  }

  /**
   * Canvas'ı, ebeveyn elementinin GERÇEK boyutuna (ve devicePixelRatio'ya)
   * göre yeniden boyutlandırır — "Responsive canvas / viewport" gereksinimi.
   * Gereksiz reflow'dan kaçınmak için boyut GERÇEKTEN değiştiyse dokunur.
   */
  function resizeCanvasToContainer(canvas) {
    var parent = canvas.parentElement;
    var cssWidth = parent ? parent.clientWidth : canvas.clientWidth;
    var cssHeight = parent ? parent.clientHeight : canvas.clientHeight;
    var dpr = window.devicePixelRatio || 1;

    var targetWidth = Math.max(1, Math.round(cssWidth * dpr));
    var targetHeight = Math.max(1, Math.round(cssHeight * dpr));

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";

    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { width: cssWidth, height: cssHeight };
  }

  function create(canvas, rawSpec, options) {
    options = options || {};
    var spec = ns.normalizeSpec(rawSpec);
    var theme = ns.getTheme(spec.theme);
    var hudContainer = options.hudContainer || canvas.parentElement || document.body;

    var viewport = resizeCanvasToContainer(canvas);
    var camera = new ns.Camera(viewport.width, viewport.height);
    var input = new ns.InputManager(options.inputTarget || window);
    var renderer = new ns.Renderer(canvas);
    var particles = new ns.Particles();
    var state = new ns.GameState(spec);
    var hudUpdateAccumulator = 0;

    // ASSET LIBRARY round — spec.assets ZATEN specSchema.js'in
    // sanitizeAssets()'i tarafından güvenli hale getirildi (her rol için
    // geçerli bir URL ya da null). Yükleme burada BİR KERE başlar (restart'ta
    // YENİDEN yüklenmez/yeniden istenmez — assets spec'in SABİT bir parçası,
    // obstacles İLE AYNI mantık). `assets.get(role)` her frame güvenle
    // çağrılabilir — henüz yüklenmemiş/başarısız olmuşsa `null` döner ve
    // renderer.js OTOMATİK olarak primitive fallback'e düşer.
    var assets = new ns.AssetLoader(spec.assets);

    // COLLECTIBLES+OBSTACLES round — obstacles spec'in SABİT bir parçası
    // (restart'ta değişmez), bu yüzden bir kere kurulur. collectibles ise
    // "toplandı" durumu taşıdığı için her restart'ta (resetEntities içinde)
    // spec.collectibles'tan TAZE yeniden kurulur — spec'in kendisi hiç
    // mutate edilmez (CollectibleField kendi kopyasını oluşturur).
    var obstacleField = new ns.ObstacleField(spec.obstacles);
    var collectibles;

    // WORLD RENDERING round — decorations, obstacles İLE AYNI mantık: spec'in
    // SABİT bir parçası (restart'ta DEĞİŞMEZ, "toplandı" gibi bir durumu
    // yok), bu yüzden bir kere referans alınır. SADECE renderer.drawDecorations()
    // tarafından ÇİZİLİR — hiçbir collision/gameplay sistemi bu diziye HİÇ
    // bakmaz (bkz. specSchema.js sanitizeDecorations notu).
    var decorations = spec.decorations || [];

    var player, enemies;

    function resetEntities() {
      player = new ns.Player({
        x: spec.world.width / 2,
        y: spec.world.height / 2,
        radius: spec.player.radius,
        speed: spec.player.speed,
      });
      enemies = spawnEnemies(spec, player, obstacleField);
      collectibles = new ns.CollectibleField(spec.collectibles);
      camera.snapTo(player.x, player.y, spec.world.width, spec.world.height);
      particles.list.length = 0;
    }

    resetEntities();

    var hud = new ns.Hud(hudContainer, spec, {
      onRestart: function () {
        restart();
      },
    });
    hud.update(state);

    function handleCollisions() {
      for (var i = enemies.length - 1; i >= 0; i--) {
        var enemy = enemies[i];
        if (!Collision.circleIntersect(player, enemy)) continue;

        if (spec.enemies.onPlayerCollision === "removeOnContact") {
          particles.spawnBurst(enemy.x, enemy.y, theme.enemy, 14);
          enemies.splice(i, 1);
          state.enemyDefeated();
        } else if (!player.isInvulnerable()) {
          state.applyDamage(1);
          player.takeHit(1.0);
          particles.spawnBurst(player.x, player.y, theme.enemy, 10);
          hud.flashDamage();
        }
      }

      // COLLECTIBLES+OBSTACLES round — enemy collision İLE AYNI desen:
      // toplama anında somut bir görsel geri bildirim (parçacık patlaması,
      // theme.accent — collectible'ın kendi rengiyle AYNI, "bu şey oradaydı,
      // artık toplandı" hissi) + skorun kendisinin kısa bir "pop" animasyonu
      // (bkz. hud.js flashCollect/style.css .td-score-pop).
      var collected = collectibles.collectAt(player);
      if (collected) {
        particles.spawnBurst(collected.x, collected.y, theme.accent, 10);
        state.collectItem();
        hud.flashCollect();
      }
    }

    function update(dt) {
      if (state.status === "playing") {
        var move = input.getMovementVector();
        player.vx = move.x * player.speed;
        player.vy = move.y * player.speed;
        // COLLECTIBLES+OBSTACLES round — obstacleField.resolveMovement(),
        // obstacles.list boşken (spec.obstacles vermeyen HER ÖNCEKİ oyun)
        // player.move() ile MATEMATİKSEL OLARAK BİREBİR AYNI sonucu üretir
        // (bkz. obstacles.js dosya başı notu + server/tests/
        // topDownRuntimeCore.test.js'teki eşdeğerlik testi) — bu yüzden
        // koşulsuz değiştirildi, mevcut davranış BOZULMADI.
        obstacleField.resolveMovement(player, player.vx * dt, player.vy * dt, spec.world.width, spec.world.height);
        player.update(dt);

        for (var i = 0; i < enemies.length; i++) {
          enemies[i].seek(player.x, player.y, dt, spec.world.width, spec.world.height, obstacleField);
          enemies[i].update(dt);
        }
        collectibles.update(dt);

        handleCollisions();
        camera.follow(player, spec.world.width, spec.world.height, dt);
        state.update(dt);

        hudUpdateAccumulator += dt;
        if (hudUpdateAccumulator >= HUD_UPDATE_INTERVAL) {
          hudUpdateAccumulator = 0;
          hud.update(state);
        }

        if (state.status !== "playing") {
          hud.update(state);
          hud.showEndScreen(state.status);
        }
      }
      // Oyun bittiğinde de partiküller doğal şekilde sönümlensin diye
      // güncellenmeye devam eder; player/enemy hareketi ve collision durur.
      particles.update(dt);
    }

    function render() {
      renderer.clear(theme);
      // WORLD RENDERING round — zemin döşemesi artık "background" YERİNE
      // "ground" rolünü kullanıyor (bkz. renderer.js drawWorld notu) —
      // "background" hâlâ spec.assets'te (geriye dönük uyumlu, ör. gelecekte
      // başka bir amaçla kullanılabilir) ama zemin ÇİZİMİNDE artık TÜKETİLMİYOR.
      renderer.drawWorld(camera, spec.world, theme, assets.get("ground"));
      // WORLD RENDERING round — dekoratif sahne objeleri (bkz. HEDEF 5
      // layering): zeminin HEMEN üstünde, ama obstacle/collectible/enemy/
      // player'dan ÖNCE (onların ARKASINDA kalmalı, önlerini kesmemeli).
      renderer.drawDecorations(decorations, camera, assets, spec.world.tileSize);
      // Render sırası (arkadan öne): zemin -> dekorasyon -> obstacle
      // (dünyanın/terrainin parçası) -> collectible (zeminin üstünde duran
      // bir eşya) -> enemy -> player -> particles (her zaman en üstte, geri
      // bildirim netliği için).
      for (var i = 0; i < obstacleField.list.length; i++) {
        renderer.drawObstacle(obstacleField.list[i], camera, theme, assets.get("obstacle"));
      }
      for (var j = 0; j < collectibles.list.length; j++) {
        renderer.drawCollectible(collectibles.list[j], camera, theme, assets.get("collectible"));
      }
      for (var k = 0; k < enemies.length; k++) {
        // VISUAL QUALITY round — SADECE enemy'ler için hafif "nefes" pulse'ı
        // (bkz. renderer.js drawEntity options.pulse notu); player'a bilerek
        // uygulanmadı (görev sadece enemy için istiyor). WORLD RENDERING
        // round — `role: "enemy"` EKLENDİ (bkz. ENTITY_SPRITE_SCALE_BY_ROLE).
        renderer.drawEntity(enemies[k], camera, theme.enemy, assets.get("enemy"), { pulse: true, role: "enemy" });
      }
      // WORLD RENDERING round — `role: "player"` EKLENDİ (bkz.
      // ENTITY_SPRITE_SCALE_BY_ROLE — player artık enemy'den BİRAZ daha
      // büyük/belirgin çiziliyor).
      renderer.drawEntity(player, camera, theme.player, assets.get("player"), { role: "player" });
      particles.render(renderer.ctx, camera);
    }

    var loop = new ns.GameLoop({ update: update, render: render });

    var resizeObserver = null;
    function onResize() {
      var vp = resizeCanvasToContainer(canvas);
      camera.setViewportSize(vp.width, vp.height);
    }
    if (typeof window.ResizeObserver === "function") {
      resizeObserver = new window.ResizeObserver(onResize);
      resizeObserver.observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener("resize", onResize);
    }

    function restart() {
      state.reset();
      resetEntities();
      hudUpdateAccumulator = 0;
      hud.hideEndScreen();
      hud.update(state);
      if (!loop.running) loop.start();
    }

    function start() {
      loop.start();
    }

    function stop() {
      loop.stop();
    }

    function destroy() {
      loop.stop();
      input.destroy();
      hud.destroy();
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", onResize);
    }

    return {
      start: start,
      stop: stop,
      restart: restart,
      destroy: destroy,
      // Test/debug amaçlı salt-okunur erişim (dışarıdan mutate edilmesi
      // beklenmez) — Playwright ile canlı doğrulama bu üzerinden yapılır.
      getState: function () {
        return state;
      },
      getSpec: function () {
        return spec;
      },
      getPlayer: function () {
        return player;
      },
      getEnemies: function () {
        return enemies;
      },
      // COLLECTIBLES+OBSTACLES round — getEnemies/getPlayer İLE AYNI desen,
      // Playwright/canlı doğrulama için salt-okunur erişim.
      getCollectibles: function () {
        return collectibles.list;
      },
      getObstacles: function () {
        return obstacleField.list;
      },
      // ASSET LIBRARY round — getCollectibles/getObstacles İLE AYNI desen.
      getAssets: function () {
        return assets;
      },
      // WORLD RENDERING round — getAssets İLE AYNI desen: SADECE salt-okunur
      // test/debug erişimi (Playwright ile camera.x/y/viewport doğrulaması
      // için) — camera.js'in KENDİSİ bu round'da hiç değiştirilmedi, sadece
      // buradan DIŞARIYA açıldı.
      getCamera: function () {
        return camera;
      },
      // WORLD RENDERING round — getCollectibles/getObstacles İLE AYNI desen,
      // dekoratif (SADECE görsel, sıfır collision) sahne objelerine
      // Playwright'ın erişebilmesi için.
      getDecorations: function () {
        return decorations;
      },
    };
  }

  ns.create = create;
})(window.TopDownRuntime);
