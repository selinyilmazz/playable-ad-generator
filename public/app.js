(function () {
  // ---------- existing elements (unchanged pipeline hooks) ----------
  var promptInput = document.getElementById("prompt-input");
  var generateBtn = document.getElementById("generate-btn");
  var statusLine = document.getElementById("status-line");
  var previewFrame = document.getElementById("preview-frame");
  var previewPlaceholder = document.getElementById("preview-placeholder");
  var codeOutput = document.getElementById("code-output");
  var modeBadge = document.getElementById("mode-badge");
  var mockInfoCard = document.getElementById("mock-info-card");

  // ---------- UI elements from the previous redesign ----------
  var charCounter = document.getElementById("char-counter");
  var exampleChipsWrap = document.getElementById("example-chips");
  var gameLibraryGrid = document.getElementById("game-library-grid");
  var configureApiBtn = document.getElementById("configure-api-btn");
  var helpBtn = document.getElementById("help-btn");
  var restartBtn = document.getElementById("restart-btn");
  var openTabBtn = document.getElementById("open-tab-btn");
  var outputTabs = document.getElementById("output-tabs");
  var copyCodeBtn = document.getElementById("copy-code-btn");

  // ---------- new: Quality Score / Auto-Fix / Improve / Export ----------
  var qualityScoreEl = document.getElementById("quality-score");
  var qualityPlaceholder = document.getElementById("quality-placeholder");
  var qualitySummaryEl = document.getElementById("quality-summary");
  var qualityDetailsToggleEl = document.getElementById("quality-details-toggle");
  var qualityChecksEl = document.getElementById("quality-checks");
  var qualityActionsEl = document.getElementById("quality-actions");
  var previewStatusEl = document.getElementById("preview-status");
  var downloadBtn = document.getElementById("download-btn");

  var improveToggleBtn = document.getElementById("improve-toggle-btn");
  var improvePanel = document.getElementById("improve-panel");
  var improveChips = document.getElementById("improve-chips");
  var improveInput = document.getElementById("improve-input");
  var improveSubmitBtn = document.getElementById("improve-submit-btn");
  var improveStatus = document.getElementById("improve-status");

  // ---------- UI redesign (premium AI studio layout) — new elements ----------
  // Bunların hiçbiri backend contract'ını değiştirmiyor; hepsi mevcut
  // /api/generate yanıtındaki gerçek meta/validation alanlarını okuyor.
  var playBtn = document.getElementById("play-btn");
  var fullscreenBtn = document.getElementById("fullscreen-btn");
  var phoneFrameWrap = document.getElementById("phone-frame-wrap");
  var deviceToggleMobileBtn = document.getElementById("device-toggle-mobile");
  var deviceToggleDesktopBtn = document.getElementById("device-toggle-desktop");

  var metaModelEl = document.getElementById("meta-model");
  var metaFinishReasonEl = document.getElementById("meta-finish-reason");
  var metaAssetRetryEl = document.getElementById("meta-asset-retry");
  var metaValidationBadgeEl = document.getElementById("meta-validation-badge");

  var qualityScoreBarEl = document.getElementById("quality-score-bar");
  var qualityRingEl = document.getElementById("quality-ring");
  var outputValidationSummaryEl = document.getElementById("output-validation-summary");

  // ---------- PHASE 2/4: Game Creation Workspace additions ----------
  var aiAssetsRowEl = document.getElementById("ai-assets-row");
  var aiAssetsModeEl = document.getElementById("ai-assets-mode");
  var gameInfoAssetsEl = document.getElementById("game-info-assets");
  var gameInfoTypeEl = document.getElementById("game-info-gametype");
  var generationPipelineEl = document.getElementById("generation-pipeline");

  // PHASE 4: Generated Output "Game" tab — bkz. renderOutputGameTab().
  var outputGameWrap = document.getElementById("output-game-wrap");
  var outputGameFrame = document.getElementById("output-game-frame");
  var outputGamePlaceholder = document.getElementById("output-game-placeholder");
  var codeWindowFilenameEl = document.getElementById("code-window-filename");

  // PHASE 4 polish: mock modda gösterilen oyunun içeriği sabit bir örnek
  // olduğu için (bkz. server/services/openrouter.js getMockResponse),
  // algılanan game type ile birebir eşleşmesi garanti değil — bu rozet
  // bunu dürüstçe işaretler (bkz. setBadge).
  var mockPreviewRibbonEl = document.getElementById("mock-preview-ribbon");

  var assetLibraryGrid = document.getElementById("asset-library-grid");
  var assetCountEl = document.getElementById("asset-count");
  // ROUND 12: gerçek, çalışan bir arama kutusu — ASSET_LIBRARY zaten
  // client-side'da tam olarak mevcut olduğu için (bkz. üstteki dizi),
  // backend'e/yeni bir API'ye HİÇ gerek yok; sadece renderAssetLibrary()
  // içinde basit bir substring filtresi. Sahte/işlevsiz bir arama kutusu
  // eklemek yerine gerçekten filtreliyor.
  var assetSearchInput = document.getElementById("asset-search-input");
  var assetSelectionSummaryEl = document.getElementById("asset-selection-summary");
  var previewAssetTagEl = document.getElementById("preview-asset-tag");
  var assetModalOverlay = document.getElementById("asset-modal-overlay");
  var assetModalTitle = document.getElementById("asset-modal-title");
  var assetModalGrid = document.getElementById("asset-modal-grid");
  var assetModalCloseBtn = document.getElementById("asset-modal-close");

  var appShellEl = document.getElementById("app-shell");
  var sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
  var sidebarNavEl = document.querySelector(".sidebar-nav");
  var brandMarkSidebarEl = document.getElementById("brand-mark-sidebar");

  var statusBarSafeEl = document.getElementById("statusbar-safe");
  var statusBarChecksEl = document.getElementById("statusbar-checks");
  var statusBarExternalEl = document.getElementById("statusbar-external");
  var statusBarLoopEl = document.getElementById("statusbar-loop");
  var statusBarAssetEl = document.getElementById("statusbar-asset");

  var PROMPT_MAX = 1000;

  // Single source of truth for "what's currently generated". Every action
  // (tabs, restart, open-in-new-tab, copy, download, quality card,
  // auto-fix, improve) reads/writes this — no separate fake state anywhere.
  // { html, cssExcerpt, jsExcerpt, validation, meta, prompt }
  var lastResult = null;
  var activeTab = "game";

  // Asset seçim state'i. Salt bu closure-variable'da tutulur, lastResult gibi
  // tek doğruluk kaynağıdır. Kategori şekli, gerçek kullanım senaryosuna göre
  // kasıtlı olarak farklı: bir sahnede genelde tek bir karakter, tek bir
  // background ve tek bir efekt olur ama BİRDEN FAZLA obje (kılıç + iksir +
  // hazine gibi) olması çok normal — bu yüzden "object" bir DİZİ, diğer üç
  // kategori ise tekil (asset objesi veya null). Bu karma şekil bilerek
  // seçildi; character/effect/background da ileride çoklu seçime taşınmak
  // isterse tek yapılacak iş ilgili key'i [] ile başlatmak (bkz. getAllSelected,
  // toggleAssetSelection, deselectAsset — hepsi Array.isArray ile kategori
  // şeklinden bağımsız çalışıyor).
  // ROUND 14: "enemy" eklendi (SunnyLand Forest pack'iyle birlikte artık
  // frontend'de de gerçek bir Enemies kategorisi var — eskiden "character"
  // kovasına toplanıyordu). "object" gibi dizi: birden fazla düşman türü
  // (bee/piranha-plant/slug) aynı anda seçilebilsin diye.
  var selectedAssets = { character: null, enemy: [], object: [], effect: null, background: null };
  var assetSearchQuery = ""; // ROUND 12: küçük harfe çevrilmiş, trim'lenmiş arama metni

  // PHASE 4 polish: "AI Selected Assets" panelinde o an gösterilen asset
  // id'lerinin kümesi (heuristik ÖNCESİ ya da gerçek SONUÇ, bkz.
  // renderAiSelectedAssetsFromPrompt/FromResult). Asset Library grid'indeki
  // ilgili thumbnail'lara küçük bir "AI" rozeti eklemek için kullanılıyor —
  // böylece kullanıcı AI'ın hangi assetleri neden seçtiğini, tam kütüphane
  // içinde de görsel olarak takip edebiliyor (bkz. renderThumbs).
  var aiPickedAssetIds = {};

  // Tüm seçili assetleri kategoriden bağımsız DÜZ bir listeye çeviren tek
  // yardımcı — özet şeridi, prompt entegrasyonu, Live Preview etiketi ve
  // Generate butonu metni hepsi AYNI bu fonksiyonu kullanıyor (tekrar yok).
  function getAllSelected() {
    var list = [];
    ASSET_CATEGORY_ORDER.forEach(function (cat) {
      var v = selectedAssets[cat];
      if (Array.isArray(v)) {
        v.forEach(function (a) { list.push(a); });
      } else if (v) {
        list.push(v);
      }
    });
    return list;
  }

  function isAssetSelected(asset) {
    var v = selectedAssets[asset.category];
    if (Array.isArray(v)) return v.some(function (a) { return a.id === asset.id; });
    return !!(v && v.id === asset.id);
  }

  // "red_enemy" -> "Red Enemy" — chip'lerde, Live Preview etiketinde ve thumb
  // tooltip'lerinde daha okunaklı bir isim için.
  function prettyAssetName(id) {
    return id
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // ================== Asset Library (GET /api/assets üzerinden GERÇEK veri) ==================
  // ROUND 20 (Part C) — STALE UI FIX: Bu dizi ÖNCEDEN (Round 14-16) burada
  // elle yazılmış, SunnyLand Forest + Kenney Space Shooter paketlerinin (39
  // asset) BİREBİR bir kopyasıydı. server/config/assetManifest.js'e Round 18
  // ve Round 20'de yeni asset eklendikçe bu elle-senkronize kopya
  // GÜNCELLENMEDİ — backend gerçek toplamı 95'e çıkarken bu dizi sessizce
  // 39'da donmuş kaldı (Selin'in bulduğu "39 assets available" / "Characters
  // 4, Enemies 8, Objects 19, Effects 4, Backgrounds 4" sorunu tam olarak
  // buydu). Artık HİÇBİR asset burada elle yazılmıyor: dizi BOŞ başlıyor ve
  // SADECE loadAssetLibrary() tarafından, GET /api/assets'in gerçek yanıtından
  // (server/config/assetManifest.js -> ASSET_MANIFEST_ENRICHED, backend'in
  // TEK doğruluk kaynağı) dolduruluyor. Bu dosyadaki arama/kategori sayaçları/
  // "View All"/seçili-asset özeti/AI Selected Assets eşleştirmesi gibi HİÇBİR
  // tüketici fonksiyon değişmedi — hepsi bu diziyi (aynı id/path/category/
  // name/tags/gameTypes/theme/style alan adlarıyla) okumaya devam ediyor,
  // sadece içeriği artık backend'den geliyor.
  var ASSET_LIBRARY = [];

  // Backend'in 14 değerli category enum'unu (bkz. assetManifest.js) bu
  // sayfanın kullanıcı-dostu taksonomisine eşler. "object" geri kalan HER ŞEY
  // için (collectible/obstacle/platform/game-object/projectile/tile/powerup/
  // weapon/vehicle) ortak kova — Round 14'ten beri kullanılan AYNI felsefe
  // (eskiden bu eşleme elle, dizi yazılırken yapılıyordu), sadece artık bu
  // fonksiyonla otomatik uygulanıyor. "ui" — Round 20'de gerçek ilk assetini
  // (HUD life bar) alan YENİ, kendi başına bir kova.
  var DIRECT_CATEGORY_BUCKETS = { character: true, enemy: true, background: true, effect: true, ui: true };
  function bucketForBackendCategory(category) {
    return DIRECT_CATEGORY_BUCKETS[category] ? category : "object";
  }

  // GET /api/assets'in zenginleştirilmiş formatını (id/path/category/name/
  // tags/compatibleGameTypes/visualStyle/theme) bu sayfanın ASSET_LIBRARY öğe
  // şekline çevirir — id/path/category/name/tags/gameTypes/theme/style. Hiçbir
  // tüketici fonksiyon (findAssetById, detectGameplayBlocks,
  // getUsedAssetsWithRoles, renderAssetLibrary, arama, sidebar sayaçları)
  // DEĞİŞMEDİ, hepsi bu alan adlarını zaten okuyordu.
  function mapApiAssetToLibraryItem(a) {
    return {
      id: a.id,
      path: a.path,
      category: bucketForBackendCategory(a.category),
      name: a.name,
      tags: a.tags || [],
      gameTypes: a.compatibleGameTypes || [],
      theme: a.theme || null,
      style: a.visualStyle || null,
    };
  }

  // GET /api/assets'i çeker ve ASSET_LIBRARY'yi GERÇEK veriyle doldurur.
  // loadAssetMetadata()'dan (aşağıda, PHASE 5) BİLEREK AYRI tutuldu — o
  // fonksiyon SADECE "AI Selected Assets" kartlarındaki ek bilgi satırı için
  // var ve bu round'da dokunulmadı; ikisi aynı salt-okunur endpoint'i ayrı
  // ayrı çekiyor (mevcut çalışan kodu birleştirmek bu round'un kapsamı
  // DEĞİL — sadece stale-veri sorunu düzeltiliyor).
  //
  // Fetch başarısız olursa (offline/hata) ASSET_LIBRARY BOŞ kalır —
  // renderAssetLibrary() bu durumu zaten ASSET_LIBRARY_PENDING_MESSAGE ile
  // güvenli/dürüst bir "yakında" mesajıyla gösteriyor (bkz. aşağısı).
  // Eski sabit "39 assets available" verisi artık HİÇ yok, o yüzden
  // yanlışlıkla gösterilemez.
  function loadAssetLibrary() {
    if (typeof fetch !== "function") return;
    fetch("/api/assets")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.assets)) return;
        ASSET_LIBRARY = data.assets.map(mapApiAssetToLibraryItem);
        renderAssetLibrary();
        updateSidebarAssetCounts();
        renderAssetSelectionSummary();
        renderAiSelectedAssetsFromPrompt();
      })
      .catch(function () { /* offline/hata: ASSET_LIBRARY boş kalır, güvenli empty-state gösterilir */ });
  }

  // renderAssetLibrary() içinde, kütüphane GERÇEKTEN boşsa (arama sonucu boş
  // olmasından AYRI bir durum) gösterilecek dürüst mesaj — bkz. ROUND 13 notu.
  // ROUND 14'te kütüphane artık boş değil ama gelecekte (ör. bir pack tümüyle
  // kaldırılırsa) bu yol yine devrede kalsın diye korunuyor.
  var ASSET_LIBRARY_PENDING_MESSAGE =
    "The Asset Library is being upgraded to a new, professionally licensed asset pack. Check back soon.";

  // ROUND 14: "enemy" eklendi (5. kova) — Selin'in istediği taksonomi:
  // Characters / Enemies / Objects / Effects / Backgrounds.
  // ROUND 20: "ui" eklendi (6. kova) — backend'de gerçek ilk ui-category
  // asseti (HUD life bar) eklendiğinde bu sayfada da GERÇEKTEN görünsün diye
  // (bkz. DIRECT_CATEGORY_BUCKETS yukarıda ve index.html'deki yeni sidebar
  // linki) — tasarım/CSS DEĞİŞMEDİ, mevcut 5 kartla AYNI şablon.
  var ASSET_CATEGORY_LABELS = {
    character: "Characters",
    enemy: "Enemies",
    object: "Objects",
    effect: "Effects",
    background: "Backgrounds",
    ui: "UI",
  };
  var ASSET_CATEGORY_ORDER = ["character", "enemy", "object", "effect", "background", "ui"];
  var ASSET_THUMB_LIMIT_PER_CATEGORY = 9; // premium/sıkışık görünüm için kırpma; sayı gerçek toplamdan geliyor

  function findAssetById(id) {
    for (var i = 0; i < ASSET_LIBRARY.length; i++) {
      if (ASSET_LIBRARY[i].id === id) return ASSET_LIBRARY[i];
    }
    return null;
  }

  // ================== PHASE 2: Gameplay Blocks (prompt -> real asset registry) ==================
  // "ÇOK ÖNEMLİ" (Ali Bey feedback): Prompt -> gameplay requirement -> semantic
  // asset selection ilişkisini GÖRÜNÜR ve GERÇEK kılmak. Bu, gerçek bir AI/NLP
  // "anlama" sistemi DEĞİL — düz, istemci taraflı bir anahtar kelime taraması.
  // Her blok, GERÇEK bir ASSET_LIBRARY kategorisine bağlı; bir kelime
  // eşleştiğinde, o kategoriden id'si anahtar kelimeye en yakın GERÇEK bir
  // asset öneriliyor (uydurma isim değil). Bu yapı, ileride gerçek semantik
  // asset seçimine (prompt -> otomatik seçili assetler) genişletilmeye hazır:
  // tek yapılacak iş matchedAsset'i selectedAssets'e uygulamak olurdu — bu
  // tur BUNU YAPMIYORUZ (spec: "backend/generation mekanizmasını yeniden
  // yazma"), sadece veri yapısını ve görünürlüğü hazırlıyoruz.
  var GAMEPLAY_BLOCKS = [
    {
      key: "player",
      label: "Player / Runner",
      icon: "▲",
      category: "character",
      keywords: ["player", "runner", "character", "hero", "knight", "avatar", "spaceship", "ship"],
    },
    {
      key: "environment",
      label: "Environment",
      icon: "▧",
      category: "background",
      keywords: ["city", "forest", "space", "desert", "dungeon", "background", "level", "world", "scene", "environment"],
    },
    {
      key: "collectible",
      label: "Collectible",
      icon: "◆",
      category: "object",
      keywords: ["coin", "coins", "star", "stars", "gem", "fruit", "fruits", "collect", "collectible", "key", "treasure", "chest", "heart"],
    },
    {
      key: "obstacle",
      label: "Obstacle",
      icon: "✕",
      // ROUND 14: "enemy" artık ayrı bir kategori (bkz. ASSET_CATEGORY_ORDER)
      // — "enemy"/"enemies" gibi anahtar kelimeler hâlâ bu bloğa eşleşsin
      // diye category bir DİZİ oldu (bkz. aşağıdaki detectGameplayBlocks,
      // Array.isArray(block.category) dalı). "object" tek kategoriyken
      // olduğu gibi çalışmaya devam ediyor.
      category: ["object", "enemy"],
      keywords: ["barrier", "barriers", "obstacle", "obstacles", "enemy", "enemies", "asteroid", "asteroids", "rock", "hazard", "avoid", "wall", "spike"],
    },
  ];

  // Bir prompt metni içinde bu bloğun anahtar kelimelerinden biri var mı diye
  // bakar; varsa GERÇEK ASSET_LIBRARY'den (o kategoriden) en yakın id
  // eşleşmesini, yoksa kategorinin ilk assetini "önerilen asset" olarak
  // döndürür. Hiç eşleşme yoksa detected:false — blok yine de gösterilir
  // (kalıcı bir workspace alanı gibi hissetmesi için hiçbir zaman kaybolmaz),
  // sadece nötr/"—" durumunda kalır.
  function detectGameplayBlocks(promptText) {
    var text = (promptText || "").toLowerCase();
    return GAMEPLAY_BLOCKS.map(function (block) {
      var matchedKeyword = null;
      for (var i = 0; i < block.keywords.length; i++) {
        if (text.indexOf(block.keywords[i]) !== -1) {
          matchedKeyword = block.keywords[i];
          break;
        }
      }
      var matchedAsset = null;
      if (matchedKeyword) {
        var stem = matchedKeyword.replace(/s$/, "");
        // ROUND 14: block.category artık dizi de olabiliyor (bkz. "obstacle"
        // bloğu — object + enemy) — tekil string ile tam geriye dönük uyumlu.
        var candidates = ASSET_LIBRARY.filter(function (a) {
          return Array.isArray(block.category)
            ? block.category.indexOf(a.category) !== -1
            : a.category === block.category;
        });
        matchedAsset =
          candidates.filter(function (a) { return a.id.indexOf(stem) !== -1; })[0] ||
          candidates[0] ||
          null;
      }
      return {
        key: block.key,
        label: block.label,
        icon: block.icon,
        detected: !!matchedKeyword,
        matchedAsset: matchedAsset,
      };
    });
  }

  // ================== PHASE 4: AI Selected Assets (prompt heuristic OR real result) ==================
  // İki modu var, ikisi de AYNI görsel dilde (thumbnail + isim + rol) —
  // hiçbiri uydurma değil:
  //  1) ÜRETİM ÖNCESİ ("matched from your prompt"): yukarıdaki
  //     detectGameplayBlocks() ile AYNI, gerçek istemci taraflı anahtar
  //     kelime taraması (AI/NLP DEĞİL) -> gerçek ASSET_LIBRARY eşleşmesi.
  //  2) ÜRETİM SONRASI ("used in this generation"): /api/generate'in
  //     GERÇEK yanıtı — üretilen HTML'de fiilen geçen asset path'leri +
  //     (varsa) backend'in gerçek meta.assetKit rolleri. Tahmine dayalı
  //     DEĞİL, kesin (bkz. getUsedAssetsWithRoles).

  // Kit rolü anahtarlarını (bkz. server/config/assetKits.js roles) okunur
  // bir etikete çevirir — backend'in gerçek rol isimlerine 1:1 karşılık
  // gelir, uydurma bir etiket YOK.
  var KIT_ROLE_LABELS = {
    player: "Player",
    enemy: "Enemy",
    collectible: "Collectible",
    obstacle: "Obstacle",
    platform: "Platform",
    projectile: "Projectile",
    background: "Environment",
    environment: "Environment",
    effect: "Effect",
    target: "Target",
    asteroid: "Obstacle",
  };

  // Gerçek üretilen HTML içinde fiilen geçen ASSET_LIBRARY girişlerini
  // döner (countUsedAssets ile AYNI mantık, ama sayı değil tam liste).
  // meta.assetKit varsa (bkz. server/routes/generate.js -> getKit()), her
  // kullanılan assetin GERÇEK kit rolünü eşler; yoksa ASSET_CATEGORY_LABELS'a
  // (Character/Object/Effect/Background) düşer.
  function getUsedAssetsWithRoles(html, meta) {
    if (!html) return [];
    var used = ASSET_LIBRARY.filter(function (a) { return html.indexOf(a.path) !== -1; });

    var roleById = {};
    if (meta && meta.assetKit && meta.assetKit.roles) {
      Object.keys(meta.assetKit.roles).forEach(function (role) {
        var value = meta.assetKit.roles[role];
        if (!value) return;
        var ids = Array.isArray(value) ? value : [value];
        ids.forEach(function (id) {
          roleById[id] = KIT_ROLE_LABELS[role] || role;
        });
      });
    }

    return used.map(function (a) {
      return { asset: a, role: roleById[a.id] || ASSET_CATEGORY_LABELS[a.category] || a.category };
    });
  }

  // Rol adına göre sabit, az sayıda semantik renk sınıfı (CSS'te tanımlı) —
  // uydurma bir veri değil, sadece KIT_ROLE_LABELS/ASSET_CATEGORY_LABELS'tan
  // gelen aynı gerçek rol metninin küçük bir görsel kodlaması.
  function roleTagClass(role) {
    var key = role.toLowerCase();
    if (key.indexOf("player") !== -1) return "role-player";
    if (key.indexOf("enemy") !== -1) return "role-obstacle";
    if (key.indexOf("obstacle") !== -1) return "role-obstacle";
    if (key.indexOf("collectible") !== -1) return "role-collectible";
    if (key.indexOf("environment") !== -1 || key.indexOf("background") !== -1) return "role-environment";
    if (key.indexOf("effect") !== -1) return "role-effect";
    return "role-default";
  }

  // ================== PHASE 5: gerçek asset metadata (GET /api/assets) ==================
  // server/config/assetManifest.js'in zenginleştirilmiş halini (name/group/
  // animation/compatibleGameTypes) tek seferlik çeker. Bu SADECE AI Selected
  // Assets kartlarındaki EK bilgi satırı (animasyon durumu / "✓ Compatible")
  // için kullanılıyor — mevcut Asset Library grid'i (ASSET_LIBRARY,
  // ASSET_CATEGORY_ORDER) hiç dokunulmadan, hâlâ kendi sabit dizisiyle
  // çalışıyor (o dizinin 4 kova kategorisi ile backend'in 9 değerli
  // category'si birebir örtüşmüyor — bu yüzden ayrı tutuldu, birleştirmek
  // grid'i kırardı). Fetch başarısız olursa (offline vb.) sessizce boş
  // kalır — kartlar sadece o EK satır olmadan, eskisi gibi render olur.
  var ASSET_METADATA_BY_ID = {};
  var lastKnownGameType = null; // post-generation meta.gameType (varsa) — "✓ Compatible" için

  function loadAssetMetadata() {
    if (typeof fetch !== "function") return;
    fetch("/api/assets")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.assets)) return;
        data.assets.forEach(function (a) { ASSET_METADATA_BY_ID[a.id] = a; });
        // Metadata geç gelmiş olabilir (kartlar zaten ilk render'ını yapmış
        // olabilir) — mevcut moda göre kartları EK bilgiyle yeniden çiziyoruz.
        if (lastAiAssetsMode === "result" && lastAiAssetsArgs) {
          renderAiSelectedAssetsFromResult(lastAiAssetsArgs.html, lastAiAssetsArgs.meta);
        } else {
          renderAiSelectedAssetsFromPrompt();
        }
      })
      .catch(function () { /* offline/hata: kartlar EK satır olmadan çalışmaya devam eder */ });
  }

  var lastAiAssetsMode = null;
  var lastAiAssetsArgs = null;

  // Karakter/düşman DIŞI assetler için gerçek tags'ten kısa, uydurma-olmayan
  // bir betimleyici satır ("forest, environment" gibi) — CHARACTERS grubu
  // için ise animasyon state iskeletinin durumu ("Static sprite" — hiçbiri
  // henüz gerçek frame taşımıyor, bu da dürüstçe böyle gösteriliyor).
  function assetMetaLine(meta) {
    if (!meta) return null;
    if (meta.group === "CHARACTERS") {
      var states = meta.animation
        ? Object.keys(meta.animation).filter(function (k) { return meta.animation[k]; })
        : [];
      return states.length > 0 ? states.join(" / ") : "Static sprite";
    }
    var tags = (meta.tags || []).slice(0, 2);
    return tags.length > 0 ? tags.join(", ") : null;
  }

  function aiAssetCardHtml(asset, role, gameTypeForCompat) {
    var name = prettyAssetName(asset.id);
    var meta = ASSET_METADATA_BY_ID[asset.id] || null;
    var metaLine = assetMetaLine(meta);
    var isCompatible =
      !!gameTypeForCompat && !!meta && (meta.compatibleGameTypes || []).indexOf(gameTypeForCompat) !== -1;

    return (
      '<div class="ai-asset-card">' +
      '<div class="ai-asset-thumb"><img src="' + escapeAttr(asset.path) + '" alt="" /></div>' +
      '<div class="ai-asset-copy">' +
      '<div class="ai-asset-copy-top">' +
      '<span class="ai-asset-name">' + escapeHtml(name) + "</span>" +
      '<span class="ai-asset-role-tag ' + roleTagClass(role) + '">' + escapeHtml(role) + "</span>" +
      "</div>" +
      (metaLine ? '<span class="ai-asset-meta-line">' + escapeHtml(metaLine) + "</span>" : "") +
      (isCompatible ? '<span class="ai-asset-compat">✓ Compatible</span>' : "") +
      "</div>" +
      "</div>"
    );
  }

  function setAiPickedIds(entries) {
    aiPickedAssetIds = {};
    entries.forEach(function (e) { aiPickedAssetIds[e.asset.id] = true; });
  }

  // Üretim ÖNCESİ mod. Aynı zamanda: gerçek bir üretim (lastResult) VARKEN
  // kullanıcı promptu değiştirirse de buraya dönülür — çünkü gösterilen son
  // üretim artık güncel prompt için değil (bkz. input event listener, aşağıda).
  function renderAiSelectedAssetsFromPrompt() {
    if (!aiAssetsRowEl) return;
    lastAiAssetsMode = "prompt";
    lastAiAssetsArgs = null;
    if (aiAssetsModeEl) aiAssetsModeEl.textContent = "matched from your prompt";
    var blocks = detectGameplayBlocks(promptInput.value).filter(function (b) {
      return b.detected && b.matchedAsset;
    });
    var entries = blocks.map(function (b) { return { asset: b.matchedAsset, role: b.label }; });
    setAiPickedIds(entries);
    if (entries.length === 0) {
      aiAssetsRowEl.innerHTML =
        '<span class="ai-assets-empty">AI will select suitable assets automatically once you generate.</span>';
    } else {
      // Üretim öncesi henüz kesin bir gameType yok (detectGameType server'da
      // çalışıyor) — bu yüzden "✓ Compatible" burada gösterilmiyor (3.
      // parametre null), sadece üretim SONRASI gerçek meta.gameType ile.
      aiAssetsRowEl.innerHTML = entries.map(function (e) { return aiAssetCardHtml(e.asset, e.role, null); }).join("");
    }
    renderAssetLibrary();
  }

  // Üretim SONRASI mod — /api/generate'in gerçek yanıtından, kesin.
  function renderAiSelectedAssetsFromResult(html, meta) {
    if (!aiAssetsRowEl) return;
    lastAiAssetsMode = "result";
    lastAiAssetsArgs = { html: html, meta: meta };
    if (meta && meta.gameType) lastKnownGameType = meta.gameType;
    if (aiAssetsModeEl) aiAssetsModeEl.textContent = "used in this generation";
    var entries = getUsedAssetsWithRoles(html, meta);
    setAiPickedIds(entries);
    if (entries.length === 0) {
      aiAssetsRowEl.innerHTML =
        (meta && meta.mock
          ? '<span class="ai-assets-empty">Mock preview — this canned sample doesn’t reference real Asset Library files, so it won’t necessarily match the detected game type below.</span>'
          : '<span class="ai-assets-empty">No known Asset Library assets were detected in this generation’s HTML.</span>');
    } else {
      var gameTypeForCompat = meta && meta.gameType ? meta.gameType : null;
      aiAssetsRowEl.innerHTML = entries.map(function (e) { return aiAssetCardHtml(e.asset, e.role, gameTypeForCompat); }).join("");
    }
    renderAssetLibrary();
  }

  // Her thumb artık gerçek bir <button> — tıklanabilir, klavyeyle odaklanabilir
  // (focus-visible), hover ve is-selected durumları var. selectedAssets'teki
  // güncel state'e göre is-selected class'ı burada hesaplanıyor, bu yüzden hem
  // ana grid hem de asset-modal-grid AYNI fonksiyonu kullanıyor — tek kaynak.
  function renderThumbs(items) {
    return items
      .map(function (a) {
        var isSelected = isAssetSelected(a);
        var isAiPick = !!aiPickedAssetIds[a.id];
        var cls =
          "asset-thumb" +
          (a.isNew ? " is-new" : "") +
          (isSelected ? " is-selected" : "") +
          (isAiPick ? " is-ai-pick" : "");
        var name = prettyAssetName(a.id);
        var title = name + (isAiPick ? " — AI selected" : "");
        return (
          '<button type="button" class="' + cls + '" data-asset-id="' + escapeAttr(a.id) + '" ' +
          'title="' + escapeAttr(title) + '" aria-pressed="' + (isSelected ? "true" : "false") + '">' +
          '<img src="' + escapeAttr(a.path) + '" alt="' + escapeAttr(name) + '" loading="lazy" />' +
          "</button>"
        );
      })
      .join("");
  }

  function renderAssetLibrary() {
    if (!assetLibraryGrid) return;
    // ROUND (Interaction Audit): arama kutusu SADECE kütüphane gerçekten
    // boşken devre dışı olmalı — önceden bu satır sadece "boş" dalında
    // (aşağıda) `disabled = true` yapıyordu ama HİÇBİR yerde `false`'a geri
    // ALINMIYORDU. Sonuç: ASSET_LIBRARY, ilk (senkron, boş) render'dan SONRA
    // gerçek veriyle dolduğunda (bkz. loadAssetLibrary) arama kutusu
    // KALICI OLARAK disabled kalıyordu — kullanıcıya aktifmiş gibi görünen
    // ama hiçbir tuş girişini kabul etmeyen bir "fake" arama kutusuydu. Her
    // render'da state'i gerçek ASSET_LIBRARY.length'ten YENİDEN türeterek
    // (idempotent) düzeltildi.
    if (assetSearchInput) assetSearchInput.disabled = ASSET_LIBRARY.length === 0;
    if (assetCountEl) {
      // ROUND 12: bu her zaman GERÇEK toplam kütüphane boyutunu gösterir
      // (arama filtrelense bile) — "39 assets available" bir arama
      // sonucu sayacı değil, kütüphanenin gerçek toplam büyüklüğü.
      // ROUND 13: kütüphane bilerek boşsa (bkz. ASSET_LIBRARY tanımı) "0
      // assets available" gibi bozuk görünen bir mesaj yerine dürüst bir
      // durum metni gösteriliyor.
      assetCountEl.textContent =
        ASSET_LIBRARY.length === 0 ? "Upgrading…" : ASSET_LIBRARY.length + " assets available";
    }

    // ROUND 13: kütüphane GERÇEKTEN boşsa (arama sonucu boş olmasından farklı
    // bir durum — bkz. ASSET_LIBRARY_PENDING_MESSAGE) arama mantığına hiç
    // girmeden dürüst bir "yakında" mesajı gösterilir; arama kutusu da
    // devre dışı bırakılır (aranacak hiçbir şey yok).
    if (ASSET_LIBRARY.length === 0) {
      // disabled state artık fonksiyon başında (yukarıda) tek yerden yönetiliyor.
      assetLibraryGrid.innerHTML = '<p class="asset-search-empty">' + escapeHtml(ASSET_LIBRARY_PENDING_MESSAGE) + "</p>";
      return;
    }

    // ROUND 12: gerçek, çalışan arama filtresi — sadece client-side'da zaten
    // var olan ASSET_LIBRARY dizisi üzerinde substring eşleşmesi (isim veya
    // kategori etiketine göre). Yeni bir veri kaynağı/backend YOK.
    var query = assetSearchQuery;
    var libraryItems = !query
      ? ASSET_LIBRARY
      : ASSET_LIBRARY.filter(function (a) {
          var name = prettyAssetName(a.id).toLowerCase();
          var catLabel = (ASSET_CATEGORY_LABELS[a.category] || a.category).toLowerCase();
          return name.indexOf(query) !== -1 || catLabel.indexOf(query) !== -1;
        });

    var newItems = libraryItems.filter(function (a) { return a.isNew; });

    // Yeni eklenen 12 Sorting asseti (apple/banana/.../basket_green), normal
    // "Objects" kategorisinin 9'luk kırpma limitine takılıp "+N" arkasında
    // kaybolmasın diye ayrı, öne çıkan bir kart olarak TAM listeleniyor —
    // bu sadece görsel gruplama, gerçek category alanı hâlâ "object". Başlık
    // "FEATURED ASSETS" olarak güncellendi çünkü gerçekte bir "sıralama"
    // (sorting) işlemi yapılmıyor — sadece bu 12 asset öne çıkarılıyor.
    var newCardHtml = "";
    if (newItems.length > 0) {
      newCardHtml =
        '<div class="asset-category asset-category-featured">' +
        '<div class="asset-category-title"><span>✨ Featured Assets</span>' +
        '<span class="asset-category-count">' + newItems.length + "</span></div>" +
        '<div class="asset-thumb-row">' + renderThumbs(newItems) + "</div>" +
        "</div>";
    }

    var categoryCardsHtml = ASSET_CATEGORY_ORDER.map(function (cat) {
      var allItemsInCat = ASSET_LIBRARY.filter(function (a) { return a.category === cat; });
      var items = libraryItems.filter(function (a) {
        return a.category === cat;
      });
      if (items.length === 0) return "";

      var shown = items.slice(0, ASSET_THUMB_LIMIT_PER_CATEGORY);
      var remaining = items.length - shown.length;

      var thumbs = renderThumbs(shown);
      if (remaining > 0) {
        thumbs +=
          '<button type="button" class="asset-thumb-more" data-more-category="' + escapeAttr(cat) + '" ' +
          'title="Show all ' + escapeAttr(ASSET_CATEGORY_LABELS[cat] || cat) + '">+' + remaining + "</button>";
      }

      // ROUND 12: her kategorinin altında GERÇEK bir "View All" bağlantısı —
      // sahte/dekoratif değil: aynı .asset-thumb-more sınıfı ve
      // data-more-category attribute'u sayesinde MEVCUT delege edilmiş click
      // handler'ı (bkz. openAssetModal çağrısı) üzerinden aynı gerçek modal'ı
      // açar. Bu kategoride zaten kırpma yoksa bile (ör. Effects/Backgrounds)
      // kullanıcı yine de tüm listeyi modal'da görebilir.
      var viewAllHtml =
        '<button type="button" class="asset-thumb-more asset-category-viewall" data-more-category="' + escapeAttr(cat) + '">' +
        "View All (" + allItemsInCat.length + ") →</button>";

      return (
        '<div class="asset-category">' +
        '<div class="asset-category-title"><span>' + (ASSET_CATEGORY_LABELS[cat] || cat) + "</span>" +
        '<span class="asset-category-count">' + items.length + (query ? " / " + allItemsInCat.length : "") + "</span></div>" +
        '<div class="asset-thumb-row">' + thumbs + "</div>" +
        viewAllHtml +
        "</div>"
      );
    }).join("");

    if (query && !newCardHtml && !categoryCardsHtml) {
      assetLibraryGrid.innerHTML =
        '<p class="asset-search-empty">No assets match “' + escapeHtml((assetSearchInput && assetSearchInput.value) || "") + '”.</p>';
      return;
    }

    assetLibraryGrid.innerHTML = newCardHtml + categoryCardsHtml;
  }

  // ================== Asset selection: click handling, summary, modal ==================

  // Kategori şekline göre (dizi mi, tekil mi) doğru seç/kaldır davranışını
  // uygular: Objects'te tıklamak listeye ekler/çıkarır, diğer kategorilerde
  // aynı assete tekrar tıklamak seçimi kaldırır, farklı bir assete tıklamak
  // önceki tekil seçimin yerini alır.
  function toggleAssetSelection(assetId) {
    var asset = findAssetById(assetId);
    if (!asset) return;

    if (Array.isArray(selectedAssets[asset.category])) {
      var arr = selectedAssets[asset.category];
      var idx = arr.findIndex(function (a) { return a.id === asset.id; });
      if (idx === -1) arr.push(asset);
      else arr.splice(idx, 1);
    } else {
      var current = selectedAssets[asset.category];
      selectedAssets[asset.category] = current && current.id === asset.id ? null : asset;
    }

    onSelectionChanged();
  }

  function deselectAsset(category, assetId) {
    if (Array.isArray(selectedAssets[category])) {
      selectedAssets[category] = selectedAssets[category].filter(function (a) { return a.id !== assetId; });
    } else if (selectedAssets[category] && selectedAssets[category].id === assetId) {
      selectedAssets[category] = null;
    }
    onSelectionChanged();
  }

  // Seçim her değiştiğinde güncellenmesi gereken tüm görünümler tek yerden —
  // asset grid'i (is-selected class'ları), özet şeridi, Live Preview etiketi
  // ve Generate butonunun "N asset ile" metni.
  function onSelectionChanged() {
    renderAssetLibrary();
    renderAssetSelectionSummary();
    updatePreviewAssetTag();
    updateGenerateBtnIdleLabel();
  }

  function renderAssetSelectionSummary() {
    if (!assetSelectionSummaryEl) return;
    var all = getAllSelected();
    var label = '<span class="asset-selection-label">Selected Assets</span>';

    if (all.length === 0) {
      assetSelectionSummaryEl.innerHTML =
        label + '<span class="asset-selection-empty">No assets selected — AI will choose suitable assets.</span>';
      return;
    }

    var chips = all
      .map(function (a) {
        return (
          '<span class="asset-selection-chip">' +
          escapeHtml(prettyAssetName(a.id)) +
          '<button type="button" data-clear-category="' + escapeAttr(a.category) + '" ' +
          'data-clear-id="' + escapeAttr(a.id) + '" aria-label="Remove ' + escapeAttr(prettyAssetName(a.id)) + '">✕</button>' +
          "</span>"
        );
      })
      .join("");

    assetSelectionSummaryEl.innerHTML = label + chips;
  }

  // Live Preview'daki "N assets selected" / "Knight · Sword · Forest" etiketi.
  // Sadece gerçek frontend seçim state'ini yansıtır; preview'ın kendisi ya da
  // boyutu/konumu etkilenmiyor — preview-badges satırına küçük bir tag ekleniyor.
  function updatePreviewAssetTag() {
    if (!previewAssetTagEl) return;
    var all = getAllSelected();
    if (all.length === 0) {
      previewAssetTagEl.textContent = "";
      previewAssetTagEl.classList.add("hidden");
      return;
    }
    var text =
      all.length <= 3
        ? all.map(function (a) { return prettyAssetName(a.id); }).join(" · ")
        : all.length + " assets selected";
    previewAssetTagEl.textContent = text;
    previewAssetTagEl.classList.remove("hidden");
  }

  if (assetLibraryGrid) {
    assetLibraryGrid.addEventListener("click", function (e) {
      var moreBtn = e.target.closest(".asset-thumb-more");
      if (moreBtn) {
        openAssetModal(moreBtn.getAttribute("data-more-category"));
        return;
      }
      var thumb = e.target.closest(".asset-thumb[data-asset-id]");
      if (thumb) toggleAssetSelection(thumb.getAttribute("data-asset-id"));
    });
  }

  if (assetSelectionSummaryEl) {
    assetSelectionSummaryEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-clear-category]");
      if (!btn) return;
      deselectAsset(btn.getAttribute("data-clear-category"), btn.getAttribute("data-clear-id"));
    });
  }

  // "+N" — mevcut tasarım diline uygun küçük bir popover açar (bkz.
  // index.html #asset-modal-overlay), büyük bir asset marketplace grid'i
  // DEĞİL: sadece o kategorinin tam listesini gösterir, aynı renderThumbs()
  // fonksiyonunu (dolayısıyla aynı hover/selected görselini) yeniden kullanır.
  function openAssetModal(category) {
    if (!assetModalOverlay || !assetModalGrid) return;
    var items = ASSET_LIBRARY.filter(function (a) { return a.category === category; });
    if (assetModalTitle) {
      assetModalTitle.textContent = (ASSET_CATEGORY_LABELS[category] || category) + " — " + items.length + " assets";
    }
    assetModalGrid.innerHTML = renderThumbs(items);
    assetModalOverlay.classList.remove("hidden");
  }

  function closeAssetModal() {
    if (!assetModalOverlay) return;
    assetModalOverlay.classList.add("hidden");
  }

  if (assetModalCloseBtn) assetModalCloseBtn.addEventListener("click", closeAssetModal);

  if (assetModalOverlay) {
    assetModalOverlay.addEventListener("click", function (e) {
      if (e.target === assetModalOverlay) closeAssetModal();
    });
  }

  if (assetModalGrid) {
    assetModalGrid.addEventListener("click", function (e) {
      var thumb = e.target.closest(".asset-thumb[data-asset-id]");
      if (!thumb) return;
      var id = thumb.getAttribute("data-asset-id");
      var asset = findAssetById(id);
      toggleAssetSelection(id);
      // Objects çoklu seçime izin veriyor: modalı kapatmak yerine, seçili
      // durumun hemen görünmesi için modal içeriğini yerinde tazeliyoruz —
      // kullanıcı arka arkaya birkaç obje seçebilsin. Tekil-seçim
      // kategorilerinde (character/effect/background) bir seçim yeterli,
      // modal önceki davranış gibi otomatik kapanıyor.
      if (asset && Array.isArray(selectedAssets[asset.category])) {
        var items = ASSET_LIBRARY.filter(function (a) { return a.category === asset.category; });
        assetModalGrid.innerHTML = renderThumbs(items);
      } else {
        closeAssetModal();
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && assetModalOverlay && !assetModalOverlay.classList.contains("hidden")) {
      closeAssetModal();
    }
  });

  // ================== Asset selection -> generation prompt (tek gerçek bağlantı noktası) ==================
  // /api/generate endpoint'i backend'de DEĞİŞTİRİLMEDİ, hâlâ sadece { prompt }
  // kabul ediyor (bkz. server/routes/generate.js — bu tur dokunulmadı). Bu
  // yüzden seçili assetleri gerçek üretime bağlamanın mevcut mimariyle
  // mümkün olan TEK dürüst yolu, seçimi kullanıcının promptuna insan-okunur,
  // açık bir ek olarak eklemek ve aynı, değişmemiş endpoint'e göndermek.
  // Bu decorasyon değil: LLM bu satırları gerçekten görür ve zaten mevcut
  // assetContext.js enjeksiyonu sayesinde bu path'lerin ne olduğunu bilir.
  // Modelin bu tercihi her zaman uygulayacağının garantisi yok (bu session
  // içindeki önceki canlı benchmark'larda da görüldüğü gibi, model bazen
  // sağlanan gerçek asset path'lerini yine de kullanmıyor) — bu, sistemin
  // zaten var olan, belgelenmiş bir sınırlamasıdır ve final raporda tekrar
  // açıkça belirtiliyor.
  function buildPromptWithAssets(rawPrompt) {
    var lines = getAllSelected().map(function (a) {
      return "- " + (ASSET_CATEGORY_LABELS[a.category] || a.category) + ": " + a.id + " (" + a.path + ")";
    });
    if (lines.length === 0) return rawPrompt;
    return (
      rawPrompt +
      "\n\nPreferred assets selected by the user from the Asset Library — please use these exact asset file paths where relevant to the scene, if possible:\n" +
      lines.join("\n")
    );
  }

  // ================== PHASE 2: Game Information (sadece gerçek, hesaplanmış veri) ==================
  // "Sahte değerleri gerçek data gibi gösterme" — bu yüzden burada SADECE
  // gerçekten hesaplanabilen tek şey var: üretilen HTML çıktısı içinde kaç
  // farklı GERÇEK ASSET_LIBRARY path'inin geçtiği. "Interactions" veya "Game
  // type" gibi alanlar YOK çünkü backend'de bunlar için güvenilir bir veri
  // kaynağı yok (bkz. checks.js / score.js — 16 gerçek check var, bunlardan
  // hiçbiri etkileşim sayısı veya oyun tipi sınıflandırması üretmiyor).

  function countUsedAssets(html) {
    if (!html) return 0;
    var count = 0;
    ASSET_LIBRARY.forEach(function (a) {
      if (html.indexOf(a.path) !== -1) count++;
    });
    return count;
  }

  function updateGameInfoRow(html, meta) {
    if (gameInfoAssetsEl) {
      var n = html ? countUsedAssets(html) : null;
      gameInfoAssetsEl.innerHTML =
        '<span class="game-info-icon">◆</span>Assets: ' + (n === null ? "—" : n);
    }
    // PHASE 3B: meta.gameType artık backend'in GERÇEK, deterministik
    // gameTypeDetection sonucu (bkz. server/services/gameTypeDetection.js) —
    // uydurma bir sınıflandırma DEĞİL. Detection eşleşmediyse (gameType
    // null) veya henüz üretim yapılmadıysa "—" gösterilir.
    if (gameInfoTypeEl) {
      var label = meta && meta.gameType ? prettyAssetName(meta.gameType.replace(/-/g, "_")) : "—";
      // PHASE 4 polish: bu değer prompt'un deterministik anahtar kelime
      // taramasından gelir (bkz. server/services/gameTypeDetection.js) —
      // gerçek üretilen oyunun İÇERİĞİYLE eşleştiği garanti değil (özellikle
      // mock modda, bkz. mock-preview-ribbon). Yanlış kesinlik izlenimi
      // vermemek için kısa bir açıklama eklendi — veri DEĞİŞMEDİ.
      var hint = "Detected from your prompt's keywords (deterministic, not AI) — describes your intent, not a guarantee about the generated game's actual content.";
      gameInfoTypeEl.innerHTML =
        '<span class="game-info-icon">▣</span>Game type: ' + escapeHtml(label) +
        ' <span class="info-hint" title="' + escapeAttr(hint) + '">ⓘ</span>';
    }
  }

  // ================== PHASE 2: Generation Experience pipeline ==================
  // /api/generate senkron, tek bir { html, validation, meta } yanıtı
  // döndürüyor — backend'de gerçek bir streaming/progress event'i YOK (bu tur
  // eklenmedi, spec: "backend/generation mekanizmasını yeniden yazma"). Bu
  // yüzden aşağıdaki adımlar SADECE istemci taraflı, zamanlamalı bir UX
  // temposu: gerçek fetch bu adımlardan daha KISA sürerse
  // finishGenerationPipeline() tüm adımları anında "tamamlandı" işaretler;
  // daha UZUN sürerse son adım ("Validating") asla sahte biçimde
  // tamamlanmış görünmez, sadece nabız gibi atmaya (is-active) devam eder.
  var GENERATION_STAGE_COUNT = 5;
  var pipelineTimeouts = [];

  function clearPipelineTimeouts() {
    pipelineTimeouts.forEach(function (t) { clearTimeout(t); });
    pipelineTimeouts = [];
  }

  function setPipelineStage(activeIndex) {
    if (!generationPipelineEl) return;
    var items = generationPipelineEl.querySelectorAll(".pipeline-stage");
    Array.prototype.forEach.call(items, function (el, i) {
      el.classList.toggle("is-done", i < activeIndex);
      el.classList.toggle("is-active", i === activeIndex);
    });
  }

  function startGenerationPipeline() {
    if (!generationPipelineEl) return;
    clearPipelineTimeouts();
    if (previewPlaceholder) previewPlaceholder.classList.add("hidden");
    generationPipelineEl.classList.remove("hidden");
    setPipelineStage(0);
    // Adımlar arası tempo — gerçek bir ölçümden değil, sadece okunabilir bir
    // "sanal" ilerleme hissi vermek için seçilmiş sabit gecikmeler.
    var delays = [550, 1200, 1950, 2700];
    delays.forEach(function (delay, i) {
      pipelineTimeouts.push(
        setTimeout(function () { setPipelineStage(i + 1); }, delay)
      );
    });
  }

  function finishGenerationPipeline() {
    clearPipelineTimeouts();
    if (!generationPipelineEl) return;
    var items = generationPipelineEl.querySelectorAll(".pipeline-stage");
    Array.prototype.forEach.call(items, function (el) {
      el.classList.add("is-done");
      el.classList.remove("is-active");
    });
    setTimeout(function () {
      generationPipelineEl.classList.add("hidden");
      Array.prototype.forEach.call(items, function (el) {
        el.classList.remove("is-done");
        el.classList.remove("is-active");
      });
    }, 260);
  }

  // ================== Preview meta badges (gerçek meta + validation) ==================

  function setPill(el, label, value, cls) {
    if (!el) return;
    el.innerHTML = '<span class="meta-pill-label">' + label + "</span>" + escapeHtml(String(value));
    el.className = "meta-pill" + (cls ? " " + cls : "");
  }

  function updatePreviewMetaBadges(meta, validation) {
    if (metaModelEl) {
      if (meta && meta.mock) {
        setPill(metaModelEl, "Model", "mock (no API key)", "warn");
      } else if (meta && meta.model) {
        setPill(metaModelEl, "Model", meta.model, null);
      } else {
        setPill(metaModelEl, "Model", "—", null);
      }
    }

    if (metaFinishReasonEl) {
      var fr = meta && meta.finishReason ? meta.finishReason : "—";
      setPill(metaFinishReasonEl, "Finish Reason", fr, fr === "length" ? "warn" : null);
    }

    if (metaAssetRetryEl) {
      var retried = !!(meta && meta.assetRetryApplied);
      setPill(metaAssetRetryEl, "Asset Retry", retried ? "true" : "false", retried ? "warn" : null);
    }

    if (metaValidationBadgeEl) {
      if (!validation) {
        setPill(metaValidationBadgeEl, "Validation", "—", null);
      } else if (validation.valid) {
        setPill(metaValidationBadgeEl, "Validation", "Passed", "ok");
      } else {
        setPill(metaValidationBadgeEl, "Validation", "Failed", "fail");
      }
    }
  }

  // ================== Bottom status bar (gerçek validation.checks alt kümesi) ==================

  function findCheck(validation, key) {
    if (!validation || !validation.checks) return null;
    for (var i = 0; i < validation.checks.length; i++) {
      if (validation.checks[i].key === key) return validation.checks[i];
    }
    return null;
  }

  function updateBottomStatusBar(validation) {
    if (!validation) return;

    if (statusBarSafeEl) {
      statusBarSafeEl.textContent = validation.valid ? "🛡 Safe & Valid" : "⚠ Critical Checks Failed";
      statusBarSafeEl.className = "status-bar-item " + (validation.valid ? "ok" : "fail");
    }

    if (statusBarChecksEl && validation.checks) {
      var passCount = validation.checks.filter(function (c) { return c.status === "pass"; }).length;
      statusBarChecksEl.textContent = passCount + " / " + validation.checks.length + " Validation Checks";
      statusBarChecksEl.className = "status-bar-item " + (passCount === validation.checks.length ? "ok" : "neutral");
    }

    // Bu iki rozet, checks.js'teki GERÇEK check key'lerine 1:1 eşleniyor —
    // uydurma bir "runtime safe" metriği yerine mevcut sistemin gerçekten
    // ölçtüğü "no-infinite-loop" kontrolünün adı kullanılıyor.
    var externalCheck = findCheck(validation, "no-external-resources");
    if (statusBarExternalEl && externalCheck) {
      statusBarExternalEl.textContent = (externalCheck.status === "pass" ? "✓ " : "✕ ") + "No External Requests";
      statusBarExternalEl.className = "status-bar-item " + (externalCheck.status === "pass" ? "ok" : "fail");
    }

    var loopCheck = findCheck(validation, "no-infinite-loop");
    if (statusBarLoopEl && loopCheck) {
      statusBarLoopEl.textContent = (loopCheck.status === "pass" ? "✓ " : "⚠ ") + "No Infinite Loop Risk";
      statusBarLoopEl.className = "status-bar-item " + (loopCheck.status === "pass" ? "ok" : "neutral");
    }

    var assetCheck = findCheck(validation, "asset-paths-valid");
    if (statusBarAssetEl && assetCheck) {
      statusBarAssetEl.textContent = (assetCheck.status === "pass" ? "✓ " : "✕ ") + "Asset Verified";
      statusBarAssetEl.className = "status-bar-item " + (assetCheck.status === "pass" ? "ok" : "fail");
    }
  }

  function updateOutputValidationSummary(validation) {
    if (!outputValidationSummaryEl) return;
    if (!validation || !validation.checks) {
      outputValidationSummaryEl.textContent = "";
      outputValidationSummaryEl.className = "output-validation-summary";
      return;
    }
    var passCount = validation.checks.filter(function (c) { return c.status === "pass"; }).length;
    var total = validation.checks.length;
    var ok = passCount === total;
    outputValidationSummaryEl.textContent = (ok ? "✓ " : "⚠ ") + passCount + " / " + total + " validation checks passed";
    outputValidationSummaryEl.className = "output-validation-summary " + (ok ? "ok" : "fail");
  }

  // ================== status / badge (unchanged logic) ==================

  function setStatus(text, kind) {
    statusLine.textContent = text || "";
    statusLine.className = "status-line" + (kind ? " " + kind : "");
  }

  // mock-info-card artık statik değil: yalnızca sunucudan gerçekten "mock
  // fallback kullanıldı" bilgisi (meta.mock === true) geldiğinde gösterilir.
  // meta.mock yalnızca OPENROUTER_API_KEY tanımsızken true olabilir (bkz.
  // server/services/openrouter.js) — yani bu kart artık gerçek runtime
  // durumunu yansıtıyor, gerçek bir LIVE üretimden sonra asla görünmüyor.
  function updateMockInfoCard(meta) {
    if (!mockInfoCard) return;
    if (meta && meta.mock) {
      mockInfoCard.classList.remove("hidden");
    } else {
      mockInfoCard.classList.add("hidden");
    }
  }

  function setBadge(meta) {
    updateMockInfoCard(meta);
    if (mockPreviewRibbonEl) mockPreviewRibbonEl.classList.toggle("hidden", !(meta && meta.mock));
    if (!meta) {
      modeBadge.textContent = "…";
      modeBadge.className = "badge";
      return;
    }
    if (meta.mock) {
      modeBadge.textContent = "MOCK MODE";
      modeBadge.className = "badge mock";
    } else {
      modeBadge.textContent = "LIVE — " + (meta.model || "OpenRouter");
      modeBadge.className = "badge live";
    }
  }

  // ================== character counter ==================

  function updateCharCounter() {
    var len = promptInput.value.length;
    charCounter.textContent = len + " / " + PROMPT_MAX;
  }

  // ================== example chips ==================

  // PHASE 2: eski ".chip" seçici -> ".preset-card" — SADECE bu container
  // (#example-chips) için. #improve-chips hâlâ ayrı bir handler'da ".chip"
  // kullanıyor (aşağıda, Phase 4 bölümünde) ve bu değişiklikten etkilenmiyor.
  if (exampleChipsWrap) {
    exampleChipsWrap.addEventListener("click", function (e) {
      var card = e.target.closest(".preset-card");
      if (!card) return;
      promptInput.value = card.getAttribute("data-prompt") || "";
      updateCharCounter();
      renderAiSelectedAssetsFromPrompt();
      promptInput.focus();
    });
  }

  // ================== Game Library (PHASE 6) ==================

  // #example-chips ile BİREBİR aynı mantık (prompt'u gerçek data-prompt
  // metniyle doldur, AI Selected Assets'i güncelle) — sadece kaynak
  // container farklı. Yeni bir backend/veri çağrısı YOK.
  if (gameLibraryGrid) {
    gameLibraryGrid.addEventListener("click", function (e) {
      var card = e.target.closest(".game-library-card");
      if (!card) return;
      promptInput.value = card.getAttribute("data-prompt") || "";
      updateCharCounter();
      renderAiSelectedAssetsFromPrompt();
      var generatorPanel = document.querySelector(".generator-panel");
      if (generatorPanel && generatorPanel.scrollIntoView) {
        generatorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      promptInput.focus();
    });
  }

  // ================== Help (Interaction Audit fix) ==================
  // Öncesinde bu buton (index.html'de yalnızca title="Help" ile işaretli,
  // hiçbir id/handler'ı olmayan bir <button>) .icon-btn'nin hover/glow
  // stiliyle tıklanabilir GÖRÜNÜYORDU ama tıklandığında HİÇBİR ŞEY
  // yapmıyordu — klasik bir "fake interaction". Yeni bir modal/yardım
  // sistemi icat etmek yerine, uygulamanın zaten sahip olduğu, GERÇEK
  // durum-bildirme kanalı (setStatus — bkz. Configure API butonu, hemen
  // altta) yeniden kullanılıyor; sadece sayfadaki gerçek 3 adımı (Describe/
  // Generate/Play — bkz. .workflow-steps) ve gerçek bir klavye ipucunu
  // özetliyor, uydurma bir özellik/URL YOK.
  if (helpBtn) {
    helpBtn.addEventListener("click", function () {
      setStatus(
        "How it works: Describe your idea (or pick an example) → Generate → Play, Restart or open it in a new tab. " +
          "Tip: every button here is keyboard-accessible — Tab to move focus, Enter or Space to activate.",
        null
      );
    });
  }

  // ================== configure API (stub, no backend yet) ==================

  if (configureApiBtn) {
    configureApiBtn.addEventListener("click", function () {
      setStatus(
        "API key configuration will be available once OpenRouter access is connected. For now, add OPENROUTER_API_KEY to .env on the server.",
        null
      );
    });
  }

  // ================== generate (existing pipeline, preserved) ==================

  // Generate butonunun orijinal (idle) içeriği — loading state bittiğinde
  // buraya geri dönülüyor. Bu SADECE görsel bir durum göstergesi; fetch/
  // validation/API akışının hiçbir adımını değiştirmiyor.
  var generateBtnIdleHTML = generateBtn ? generateBtn.innerHTML : "";

  function setGenerateBtnLoading(isLoading) {
    if (!generateBtn) return;
    if (isLoading) {
      generateBtn.innerHTML =
        '<span class="btn-spinner" aria-hidden="true"></span><span>Generating playable ad…</span>';
    } else {
      generateBtn.innerHTML = generateBtnIdleHTML;
    }
  }

  // Asset seçiliyken Generate butonu "Generate with N assets" gösterir —
  // kullanıcıya seçimin gerçekten generation'a bağlı olduğu hissini verir.
  // Buton yapısı (round play icon + metin) korunuyor, sadece orta metin
  // değişiyor. generateBtnIdleHTML burada güncellenir ki loading state
  // bitince setGenerateBtnLoading(false) doğru (güncel) metne dönsün.
  function updateGenerateBtnIdleLabel() {
    if (!generateBtn) return;
    var count = getAllSelected().length;
    var label = count > 0 ? "Generate with " + count + " asset" + (count > 1 ? "s" : "") : "MAKE IT PLAYABLE";
    generateBtnIdleHTML =
      '<span class="btn-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><span>' +
      escapeHtml(label) +
      "</span>";
    // Şu an loading spinner gösterilmiyorsa (disabled değilse) değişikliği hemen yansıt.
    if (!generateBtn.disabled) {
      generateBtn.innerHTML = generateBtnIdleHTML;
    }
  }

  async function generate() {
    var prompt = promptInput.value.trim();
    if (!prompt) {
      setStatus("Please write a prompt first.", "error");
      return;
    }

    var finalPrompt = buildPromptWithAssets(prompt);
    var selectedCount = getAllSelected().length;

    generateBtn.disabled = true;
    setGenerateBtnLoading(true);
    startGenerationPipeline();
    setStatus(
      selectedCount > 0
        ? "Generating… (" + selectedCount + " asset" + (selectedCount > 1 ? "s" : "") + " selected)"
        : "Generating…"
    );

    try {
      // /api/generate contract'ı aynı: tek bir { prompt } string'i. Asset
      // seçimi varsa, o seçim bu string'in İÇİNE (buildPromptWithAssets ile)
      // ekleniyor — ayrı bir alan/parametre YOK, backend değişmedi.
      var res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });

      var data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unknown error");
      }

      applyNewResult(data.html, data.validation, data.meta, finalPrompt);

      if (data.validation.valid) {
        setStatus("Playable ad generated ✔ — Quality score " + data.validation.score + "/100", "success");
      } else {
        setStatus(
          "Generated, but some critical checks failed (score " + data.validation.score + "/100).",
          "error"
        );
      }
    } catch (err) {
      setStatus("Error: " + err.message, "error");
      // Üretim hiç tamamlanmadıysa (applyNewResult hiç çalışmadıysa) preview
      // alanını boş bir pipeline kalıntısıyla bırakmamak için orijinal
      // placeholder mesajına geri dön — daha önce hiç başarılı bir üretim
      // yoksa (lastResult null) bu, Phase 2 öncesindeki davranışla aynıdır.
      if (!lastResult && previewPlaceholder) {
        previewPlaceholder.classList.remove("hidden");
      }
    } finally {
      generateBtn.disabled = false;
      setGenerateBtnLoading(false);
      finishGenerationPipeline();
    }
  }

  // isValid === false: sunucudan gelen validation.valid alanı false demek —
  // en az bir kritik kontrol (valid-html / has-js / js-syntax-valid /
  // interactive / no-storage / no-external-resources) fail vermiş. Bu
  // durumda üretilen (muhtemelen yarım kalmış/syntax hatalı) HTML'i hiç
  // iframe'e yüklemiyoruz ("PLAY'e doğrudan göndermeyelim") — bunun yerine
  // mevcut "preview-placeholder" alanını (tasarımı bozmadan, yeni bir
  // element eklemeden) açık bir hata mesajıyla gösteriyoruz. Geçerli
  // üretimlerde (isValid !== false) davranış birebir eskisi gibi.
  function renderPreview(html, isValid) {
    previewStatusEl.textContent = "";
    previewPlaceholder.classList.remove("error");

    if (isValid === false) {
      previewFrame.srcdoc = "";
      previewFrame.onload = null;
      previewPlaceholder.innerHTML =
        "⚠ Generation failed — this playable could not be verified as runnable " +
        "(missing/incomplete HTML, JavaScript or a syntax error).<br />Try <b>Fix with AI</b>, " +
        "or check the HTML/JS tabs below.";
      previewPlaceholder.classList.add("error");
      previewPlaceholder.classList.remove("hidden");
      return;
    }

    previewPlaceholder.classList.add("hidden");
    // sandbox="allow-scripts" -> runs isolated, no outside/parent access
    previewFrame.srcdoc = html;
    previewFrame.onload = function () {
      previewStatusEl.textContent = "Preview loaded ✓";
    };
  }

  // ================== shared: apply a (re)generated result ==================
  // Used by Generate, Fix with AI, and Improve with AI — they all produce the
  // exact same shape of result, so they all flow through the same renderer.

  function extractBlock(html, tagName) {
    var re = new RegExp("<" + tagName + "[^>]*>([\\s\\S]*?)<\\/" + tagName + ">", "i");
    var match = html.match(re);
    return match ? match[1].trim() : "";
  }

  function applyNewResult(html, validation, meta, promptUsed) {
    lastResult = {
      html: html,
      cssExcerpt: extractBlock(html, "style"),
      jsExcerpt: extractBlock(html, "script"),
      validation: validation,
      meta: meta || (lastResult && lastResult.meta) || null,
      prompt: promptUsed || (lastResult && lastResult.prompt) || "",
    };

    renderPreview(html, validation ? validation.valid : true);
    if (meta) setBadge(meta);

    restartBtn.disabled = false;
    openTabBtn.disabled = false;
    copyCodeBtn.disabled = false;
    downloadBtn.disabled = false;
    improveToggleBtn.disabled = false;
    if (playBtn) playBtn.disabled = false;
    if (fullscreenBtn) fullscreenBtn.disabled = false;

    renderActiveTab();
    renderQualityCard(validation);
    updatePreviewMetaBadges(lastResult.meta, validation);
    updateBottomStatusBar(validation);
    updateOutputValidationSummary(validation);
    updateGameInfoRow(html, lastResult.meta);
    renderAiSelectedAssetsFromResult(html, lastResult.meta);
  }

  // ================== Phase 1/2: Quality Score card ==================

  function scoreClass(score) {
    if (score >= 80) return "score-good";
    if (score >= 50) return "score-mid";
    return "score-bad";
  }

  function statusIcon(status) {
    if (status === "pass") return "✓";
    if (status === "warning") return "⚠";
    return "✕";
  }

  function statusClass(status) {
    if (status === "pass") return "ok";
    if (status === "warning") return "warn";
    return "fail";
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  function renderQualityCard(validation) {
    if (!validation) {
      qualityScoreEl.textContent = "— / 100";
      qualityScoreEl.className = "quality-score";
      qualityChecksEl.innerHTML = "";
      qualityChecksEl.classList.add("hidden");
      qualityActionsEl.innerHTML = "";
      qualityPlaceholder.classList.remove("hidden");
      if (qualitySummaryEl) {
        qualitySummaryEl.textContent = "";
        qualitySummaryEl.className = "quality-summary hidden";
      }
      if (qualityDetailsToggleEl) {
        qualityDetailsToggleEl.classList.add("hidden");
        qualityDetailsToggleEl.setAttribute("aria-expanded", "false");
        qualityDetailsToggleEl.classList.remove("is-open");
      }
      if (qualityScoreBarEl) {
        qualityScoreBarEl.style.width = "0%";
        qualityScoreBarEl.className = "quality-score-bar-fill";
      }
      if (qualityRingEl) {
        qualityRingEl.style.setProperty("--score-pct", 0);
        qualityRingEl.className = "quality-ring";
      }
      return;
    }

    qualityPlaceholder.classList.add("hidden");

    // PHASE 4 polish: 16 check pill'i yerine tek satır gerçek özet ön planda
    // — GERÇEK validation.checks üzerinden hesaplanan pass sayısı, uydurma
    // değil. Tam liste varsayılan KAPALI, "Details" ile açılıyor (her yeni
    // üretimde yeniden kapalı başlar — bkz. aşağıdaki reset).
    if (validation.checks && qualitySummaryEl) {
      var passN = validation.checks.filter(function (c) { return c.status === "pass"; }).length;
      var totalN = validation.checks.length;
      qualitySummaryEl.textContent =
        (validation.valid ? "✓ " : "⚠ ") + passN + " / " + totalN + " checks passed";
      qualitySummaryEl.className = "quality-summary " + (validation.valid ? "ok" : "warn");
    }
    if (qualityDetailsToggleEl) {
      qualityDetailsToggleEl.classList.remove("hidden");
      qualityDetailsToggleEl.classList.remove("is-open");
      qualityDetailsToggleEl.setAttribute("aria-expanded", "false");
    }
    qualityChecksEl.classList.add("hidden");

    qualityScoreEl.textContent = validation.score + " / 100";
    qualityScoreEl.className = "quality-score " + scoreClass(validation.score);
    if (qualityScoreBarEl) {
      qualityScoreBarEl.style.width = Math.max(0, Math.min(100, validation.score)) + "%";
      qualityScoreBarEl.className = "quality-score-bar-fill " + scoreClass(validation.score);
    }
    // Halka de AYNI gerçek validation.score değerini kullanıyor — ikinci bir
    // veri kaynağı yok, sadece görsel bir sunum katmanı (bkz. style.css
    // .quality-ring conic-gradient).
    if (qualityRingEl) {
      qualityRingEl.style.setProperty("--score-pct", Math.max(0, Math.min(100, validation.score)));
      qualityRingEl.className = "quality-ring " + scoreClass(validation.score);
    }
    // Skor her yeni üretimde küçük bir "reveal" animasyonuyla belirsin (salt
    // görsel — skorun kendisi hâlâ backend'den gelen gerçek değer).
    qualityScoreEl.classList.remove("score-reveal");
    void qualityScoreEl.offsetWidth; // reflow: animasyonun yeniden tetiklenmesi için
    qualityScoreEl.classList.add("score-reveal");

    qualityChecksEl.innerHTML = validation.checks
      .map(function (c) {
        var title = c.detail ? ' title="' + escapeAttr(c.detail) + '"' : "";
        return (
          '<span class="status-pill ' + statusClass(c.status) + '"' + title + ">" +
          statusIcon(c.status) + " " + escapeHtml(c.name) +
          "</span>"
        );
      })
      .join("");

    // Phase 3: Auto-Fix — only offered when a critical check actually failed.
    if (!validation.valid) {
      qualityActionsEl.innerHTML =
        '<span class="quality-warning">⚠ Critical checks failed.</span>' +
        '<button class="text-btn" id="fix-with-ai-btn" type="button">✦ Fix with AI</button>';
      document.getElementById("fix-with-ai-btn").addEventListener("click", handleFixWithAi);
    } else {
      qualityActionsEl.innerHTML = "";
    }
  }

  // PHASE 4 polish: Quality Score "Details" toggle — SADECE zaten
  // hesaplanmış qualityChecksEl içeriğinin görünürlüğünü açar/kapar, yeni
  // bir veri istemiyor.
  if (qualityDetailsToggleEl) {
    qualityDetailsToggleEl.addEventListener("click", function () {
      var isOpen = !qualityChecksEl.classList.contains("hidden");
      qualityChecksEl.classList.toggle("hidden", isOpen);
      qualityDetailsToggleEl.classList.toggle("is-open", !isOpen);
      qualityDetailsToggleEl.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });
  }

  // ================== Phase 3: Auto-Fix ==================

  async function handleFixWithAi() {
    if (!lastResult) return;
    var btn = document.getElementById("fix-with-ai-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Fixing…";
    }
    setStatus("Running Fix with AI…");

    try {
      var res = await fetch("/api/autofix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: lastResult.html,
          prompt: lastResult.prompt,
          checks: lastResult.validation.checks,
        }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");

      if (data.applied) {
        applyNewResult(data.html, data.validation, lastResult.meta, lastResult.prompt);
        setStatus("Fix with AI applied ✔ — new score " + data.validation.score + "/100", "success");
      } else {
        // Mock mode: architecture is wired end-to-end, but no real AI call was made.
        setStatus(data.message, null);
      }
    } catch (err) {
      setStatus("Error: " + err.message, "error");
    } finally {
      var btnAgain = document.getElementById("fix-with-ai-btn");
      if (btnAgain) {
        btnAgain.disabled = false;
        btnAgain.textContent = "✦ Fix with AI";
      }
    }
  }

  // ================== Phase 4: Improve with AI ==================

  if (improveToggleBtn) {
    improveToggleBtn.addEventListener("click", function () {
      improvePanel.classList.toggle("hidden");
    });
  }

  if (improveChips) {
    improveChips.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      improveInput.value = chip.getAttribute("data-instruction") || "";
      improveInput.focus();
    });
  }

  if (improveSubmitBtn) {
    improveSubmitBtn.addEventListener("click", async function () {
      if (!lastResult) return;
      var instruction = improveInput.value.trim();
      if (!instruction) {
        improveStatus.textContent = "Describe an improvement first.";
        improveStatus.className = "status-line error";
        return;
      }

      improveSubmitBtn.disabled = true;
      improveStatus.textContent = "Applying…";
      improveStatus.className = "status-line";

      try {
        var res = await fetch("/api/improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: lastResult.html,
            prompt: lastResult.prompt,
            instruction: instruction,
          }),
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unknown error");

        if (data.applied) {
          applyNewResult(data.html, data.validation, lastResult.meta, lastResult.prompt);
          improveStatus.textContent = "Applied ✔ — new score " + data.validation.score + "/100";
          improveStatus.className = "status-line success";
        } else {
          // Mock mode: no real AI call, but the request round-tripped through the real endpoint.
          improveStatus.textContent = data.message;
          improveStatus.className = "status-line";
        }
      } catch (err) {
        improveStatus.textContent = "Error: " + err.message;
        improveStatus.className = "status-line error";
      } finally {
        improveSubmitBtn.disabled = false;
      }
    });
  }

  // ================== code tabs (unchanged behavior) ==================

  function renderCodeLines(text) {
    if (!text) {
      codeOutput.innerHTML = "";
      var note = document.createElement("li");
      note.className = "code-empty-note";
      note.textContent = "No content in this tab yet.";
      codeOutput.appendChild(note);
      return;
    }
    var lines = text.split("\n");
    codeOutput.innerHTML = lines
      .map(function (line) {
        return "<li>" + (escapeHtml(line) || "&nbsp;") + "</li>";
      })
      .join("");
  }

  // PHASE 4: "Game" sekmesi — AYNI gerçek lastResult.html'i (Live
  // Preview'daki ile birebir aynı veri) küçük bir iframe'de gösterir; yeni
  // bir üretim/veri kaynağı DEĞİL. Ana preview'la AYNI invalid-gate mantığı
  // uygulanır: doğrulanamayan bir üretim burada da iframe'e yüklenmez.
  function renderOutputGameTab() {
    if (!outputGameFrame || !outputGamePlaceholder) return;
    if (!lastResult) {
      outputGameFrame.srcdoc = "";
      outputGameFrame.style.display = "none";
      outputGamePlaceholder.style.display = "block";
      outputGamePlaceholder.textContent = "No playable ad generated yet. Write a prompt and hit Generate Playable Ad.";
      return;
    }
    var isValid = lastResult.validation ? lastResult.validation.valid : true;
    if (isValid === false) {
      outputGameFrame.srcdoc = "";
      outputGameFrame.style.display = "none";
      outputGamePlaceholder.style.display = "block";
      outputGamePlaceholder.textContent = "This generation could not be verified as runnable — see the HTML/JS tabs.";
      return;
    }
    outputGamePlaceholder.style.display = "none";
    outputGameFrame.style.display = "block";
    outputGameFrame.srcdoc = lastResult.html;
  }

  var CODE_WINDOW_FILENAMES = { game: "live preview", html: "playable-ad.html", css: "style.css", js: "game.js" };

  function renderActiveTab() {
    if (outputGameWrap) outputGameWrap.classList.toggle("is-active", activeTab === "game");
    if (codeOutput) codeOutput.style.display = activeTab === "game" ? "none" : "";
    if (codeWindowFilenameEl) codeWindowFilenameEl.textContent = CODE_WINDOW_FILENAMES[activeTab] || "playable-ad.html";

    if (activeTab === "game") {
      renderOutputGameTab();
      return;
    }
    if (!lastResult) {
      renderCodeLines("");
      return;
    }
    if (activeTab === "html") {
      renderCodeLines(lastResult.html);
    } else if (activeTab === "css") {
      renderCodeLines(lastResult.cssExcerpt || "No separate <style> block found in the generated HTML.");
    } else if (activeTab === "js") {
      renderCodeLines(lastResult.jsExcerpt || "No separate <script> block found in the generated HTML.");
    }
  }

  if (outputTabs) {
    outputTabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".tab-btn");
      if (!btn) return;
      activeTab = btn.getAttribute("data-tab");
      Array.prototype.forEach.call(outputTabs.querySelectorAll(".tab-btn"), function (b) {
        var isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      renderActiveTab();
    });
  }

  // ================== copy / restart / open in new tab (unchanged) ==================

  if (copyCodeBtn) {
    copyCodeBtn.addEventListener("click", async function () {
      if (!lastResult) return;
      // "game" sekmesi kavramsal olarak "html" ile aynı gerçek kaynağı
      // gösteriyor (bkz. renderOutputGameTab) — bu yüzden varsayılan dal
      // ikisini de kapsar.
      var text = activeTab === "css" ? lastResult.cssExcerpt : activeTab === "js" ? lastResult.jsExcerpt : lastResult.html;

      try {
        await navigator.clipboard.writeText(text || "");
        var original = copyCodeBtn.textContent;
        copyCodeBtn.textContent = "Copied!";
        setTimeout(function () {
          copyCodeBtn.textContent = original;
        }, 1500);
      } catch (err) {
        setStatus("Couldn't copy to clipboard: " + err.message, "error");
      }
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", function () {
      if (!lastResult) return;
      // Force a genuine reload of the same generated game (re-assigning the
      // identical string does not reliably reload an iframe in every browser).
      // Routed through renderPreview (not a raw srcdoc assignment) so an
      // invalid/broken generation stays blocked from PLAY on Restart too —
      // otherwise Restart would bypass the same protection renderPreview
      // just applied on the initial load.
      previewFrame.srcdoc = "";
      requestAnimationFrame(function () {
        renderPreview(lastResult.html, lastResult.validation ? lastResult.validation.valid : true);
      });
    });
  }

  if (openTabBtn) {
    openTabBtn.addEventListener("click", function () {
      if (!lastResult) return;
      var blob = new Blob([lastResult.html], { type: "text/html" });
      var url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 60000);
    });
  }

  // ================== Play (redesign: same real reload as Restart) ==================
  // Backend/preview mekanizması değişmedi — "Play" de aynı renderPreview()
  // üzerinden aynı gerçek HTML'i (iframe.srcdoc) yeniden yüklüyor.
  if (playBtn) {
    playBtn.addEventListener("click", function () {
      if (!lastResult) return;
      previewFrame.srcdoc = "";
      requestAnimationFrame(function () {
        renderPreview(lastResult.html, lastResult.validation ? lastResult.validation.valid : true);
      });
    });
  }

  // ================== Fullscreen (gerçek Fullscreen API, preview alanı için) ==================
  if (fullscreenBtn && phoneFrameWrap) {
    fullscreenBtn.addEventListener("click", function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }
      if (phoneFrameWrap.requestFullscreen) {
        phoneFrameWrap.requestFullscreen().catch(function () {
          // Fullscreen API bazı tarayıcı/iframe bağlamlarında reddedilebilir —
          // sessizce yoksay, mevcut önizleme etkilenmez.
        });
      }
    });
  }

  // ================== Preview width toggle (mobile / desktop) ==================
  // Gerçek, çalışan bir genişlik değişimi — generated HTML/iframe mantığı
  // değişmiyor, sadece preview çerçevesinin görünür genişliği değişiyor.
  if (deviceToggleMobileBtn && deviceToggleDesktopBtn && phoneFrameWrap) {
    deviceToggleMobileBtn.addEventListener("click", function () {
      phoneFrameWrap.classList.remove("desktop-mode");
      deviceToggleMobileBtn.classList.add("active");
      deviceToggleDesktopBtn.classList.remove("active");
    });
    deviceToggleDesktopBtn.addEventListener("click", function () {
      phoneFrameWrap.classList.add("desktop-mode");
      deviceToggleDesktopBtn.classList.add("active");
      deviceToggleMobileBtn.classList.remove("active");
    });
  }

  // ================== Phase 6: Export / Download ==================
  // Interaction fix: Download artık aktif Generated Output sekmesine göre
  // içerik/dosya adı/MIME type seçiyor — önceden sekme ne olursa olsun her
  // zaman lastResult.html (tam oyun) indiriliyordu. "Aktif tab" için YENİ
  // bir state icat edilmedi: mevcut tek doğruluk kaynağı olan `activeTab`
  // (bkz. output-tabs click handler ve renderActiveTab) ve copyCodeBtn'in
  // zaten kullandığı AYNI cssExcerpt/jsExcerpt alanları (extractBlock ile
  // gerçek üretilen HTML'den çıkarılıyor, ekranda HTML/CSS/JS sekmelerinde
  // gösterilenle BİREBİR aynı kaynak) yeniden kullanıldı. Blob +
  // createObjectURL + geçici <a> deseni DEĞİŞMEDİ, sadece parametrize edildi.
  var DOWNLOAD_TAB_CONFIG = {
    game: { filename: "playable-ad.html", mime: "text/html" },
    html: { filename: "playable-ad.html", mime: "text/html" },
    css: { filename: "playable-ad.css", mime: "text/css" },
    js: { filename: "playable-ad.js", mime: "application/javascript" },
  };

  function getDownloadPayload() {
    var cfg = DOWNLOAD_TAB_CONFIG[activeTab] || DOWNLOAD_TAB_CONFIG.game;
    var content;
    if (activeTab === "css") {
      content = lastResult.cssExcerpt || "";
    } else if (activeTab === "js") {
      content = lastResult.jsExcerpt || "";
    } else {
      // "game" ve "html" ikisi de aynı gerçek kaynağı (tam üretilen
      // playable HTML) gösterir/indirir — bkz. renderActiveTab/renderOutputGameTab.
      content = lastResult.html || "";
    }
    return { content: content, filename: cfg.filename, mime: cfg.mime };
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      if (!lastResult) return;
      var payload = getDownloadPayload();
      var blob = new Blob([payload.content], { type: payload.mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = payload.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 5000);
    });
  }

  // ================== Application shell (sidebar + topbar) ==================
  // Faz 1 kapsamı: marka sembolünü enjekte etmek, sidebar'ı aç/kapa yapmak ve
  // sidebar'daki gerçek asset kategori sayılarını göstermek. Generator akışını
  // (prompt/preview/quality/asset seçimi/output) HİÇ etkilemiyor — sadece
  // sayfanın dış çerçevesiyle ilgili, tamamen ayrı bir katman.

  function initBrandMark() {
    if (brandMarkSidebarEl && window.PLAYABLE_BRAND) {
      brandMarkSidebarEl.innerHTML = window.PLAYABLE_BRAND.markSvg;
    }
  }

  // Sidebar'daki "Characters/Objects/Effects/Backgrounds" sayıları, Asset
  // Library'deki kartlarla AYNI ASSET_LIBRARY dizisinden hesaplanıyor — ikinci
  // bir kaynak/hardcode sayı yok. ASSET_LIBRARY sabit olduğu için tek seferlik.
  function updateSidebarAssetCounts() {
    ASSET_CATEGORY_ORDER.forEach(function (cat) {
      var el = document.getElementById("sidebar-count-" + cat);
      if (!el) return;
      var count = ASSET_LIBRARY.filter(function (a) { return a.category === cat; }).length;
      el.textContent = String(count);
    });
  }

  function initSidebar() {
    if (!appShellEl || !sidebarToggleBtn) return;

    function setCollapsed(collapsed) {
      appShellEl.classList.toggle("sidebar-collapsed", collapsed);
      sidebarToggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }

    // Dar ekranlarda sidebar varsayılan olarak kapalı başlar (overlay modu) —
    // .layout'un kendi 980px kırılım noktasıyla tutarlı.
    if (window.matchMedia && window.matchMedia("(max-width: 980px)").matches) {
      setCollapsed(true);
    }

    sidebarToggleBtn.addEventListener("click", function () {
      setCollapsed(!appShellEl.classList.contains("sidebar-collapsed"));
    });

    // Mobilde bir kategori linkine tıklayınca (asset-library-panel'e
    // kaydırdıktan sonra) overlay'i otomatik kapat — masaüstünde etkisiz.
    if (sidebarNavEl) {
      sidebarNavEl.addEventListener("click", function (e) {
        var link = e.target.closest(".sidebar-link[data-sidebar-asset-link]");
        if (!link) return;
        if (window.matchMedia && window.matchMedia("(max-width: 980px)").matches) {
          setCollapsed(true);
        }
      });
    }
  }

  // ================== init ==================

  promptInput.addEventListener("input", updateCharCounter);
  promptInput.addEventListener("input", renderAiSelectedAssetsFromPrompt);
  generateBtn.addEventListener("click", generate);
  if (assetSearchInput) {
    assetSearchInput.addEventListener("input", function () {
      assetSearchQuery = assetSearchInput.value.trim().toLowerCase();
      renderAssetLibrary();
    });
  }
  updateCharCounter();
  renderQualityCard(null);
  renderAssetLibrary();
  renderAssetSelectionSummary();
  updatePreviewAssetTag();
  updateGenerateBtnIdleLabel();
  renderAiSelectedAssetsFromPrompt();
  updateGameInfoRow(null);
  renderActiveTab();
  initBrandMark();
  updateSidebarAssetCounts();
  initSidebar();
  loadAssetMetadata();
  // ROUND 20 (Part C): sayfa ilk açıldığında ASSET_LIBRARY boş (yukarıdaki
  // renderAssetLibrary()/updateSidebarAssetCounts() çağrıları bu yüzden
  // dürüst bir "Upgrading…" / "—" durumu gösterir) — bu çağrı GET
  // /api/assets'ten gerçek veriyi çekip geldiğinde aynı fonksiyonları TEKRAR
  // çalıştırarak gerçek 95 assetlik veriyle değiştirir.
  loadAssetLibrary();
})();
