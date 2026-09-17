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

  // AI MODEL SELECTOR round — mode-badge artık bir <button> (bkz.
  // index.html), metni ARTIK bir alt span'de (modeBadgeTextEl) tutuluyor ki
  // setBadge()'in textContent ataması dropdown/caret'i SİLMESİN. modeBadge'in
  // KENDİSİ (id/class geçişleri: "badge"/"badge mock"/"badge live") HİÇ
  // değişmedi.
  var modelSelectorEl = document.getElementById("model-selector");
  var modeBadgeTextEl = document.getElementById("mode-badge-text");
  var modelDropdownEl = document.getElementById("model-dropdown");
  var modelDropdownListEl = document.getElementById("model-dropdown-list");
  // MODEL SELECTOR UI/UX POLISH round — dropdown artık sabit üst (başlık+
  // arama) / scroll eden gövde / sabit BYOK alt satırı olarak 3 bölgeye
  // ayrıldı (bkz. index.html/style.css). Scroll bölgesine SADECE açılışta
  // scrollTop'u sıfırlamak için referans tutuluyor.
  var modelDropdownScrollEl = document.getElementById("model-dropdown-scroll");
  // OPENROUTER MODEL CATALOG + BYOK round — arama kutusu + "kendi key'ini
  // kullan" satırı, mevcut dropdown'ın İÇİNDE (bkz. index.html); BYOK
  // popover/modal ise (taşma riskine karşı) dropdown'ın DIŞINDA, ayrı bir
  // position:fixed overlay (bkz. index.html/style.css notları).
  var modelSearchInputEl = document.getElementById("model-search-input");
  var modelByokBtnEl = document.getElementById("model-byok-btn");
  var modelByokBtnLabelEl = document.getElementById("model-byok-btn-label");
  var byokModalBackdropEl = document.getElementById("byok-modal-backdrop");
  var byokKeyInputEl = document.getElementById("byok-key-input");
  var byokModalStatusEl = document.getElementById("byok-modal-status");
  var byokUseBtnEl = document.getElementById("byok-use-btn");
  var byokCancelBtnEl = document.getElementById("byok-cancel-btn");
  var byokClearBtnEl = document.getElementById("byok-clear-btn");
  // PERSISTENT USER OPENROUTER API KEYS (Phase 3) round — signed-in-only
  // "save to account" satırı (bkz. index.html #byok-account-row).
  var byokAccountRowEl = document.getElementById("byok-account-row");
  var byokAccountStatusEl = document.getElementById("byok-account-status");
  var byokSaveAccountBtnEl = document.getElementById("byok-save-account-btn");
  var byokDeleteAccountBtnEl = document.getElementById("byok-delete-account-btn");

  // SUPABASE AUTHENTICATION FOUNDATION round — hesap UI referansları.
  // Mevcut model-selector/BYOK elementlerinin HİÇBİRİ değişmedi, bunlar
  // SADECE .page-header-right'a EKLENEN yeni account-control/auth-modal
  // elementlerine referans (bkz. index.html).
  var accountSigninBtnEl = document.getElementById("account-signin-btn");
  var accountControlEl = document.getElementById("account-control");
  var accountBtnEl = document.getElementById("account-btn");
  var accountBtnLabelEl = document.getElementById("account-btn-label");
  var accountDropdownEl = document.getElementById("account-dropdown");
  var accountDropdownEmailEl = document.getElementById("account-dropdown-email");
  var accountSignoutBtnEl = document.getElementById("account-signout-btn");
  var authModalBackdropEl = document.getElementById("auth-modal-backdrop");
  var authModalTitleEl = document.getElementById("auth-modal-title");
  var authTabSigninEl = document.getElementById("auth-tab-signin");
  var authTabSignupEl = document.getElementById("auth-tab-signup");
  var authEmailInputEl = document.getElementById("auth-email-input");
  var authPasswordInputEl = document.getElementById("auth-password-input");
  var authModalNoteEl = document.getElementById("auth-modal-note");
  var authModalStatusEl = document.getElementById("auth-modal-status");
  var authCancelBtnEl = document.getElementById("auth-cancel-btn");
  var authSubmitBtnEl = document.getElementById("auth-submit-btn");

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
  // ROUND J — QUALITY SCORE DETAILS: yeni modal element referansları.
  var qualityDetailsModalOverlay = document.getElementById("quality-details-modal-overlay");
  var qualityDetailsModalSubtitleEl = document.getElementById("quality-details-modal-subtitle");
  var qualityDetailsModalCloseBtn = document.getElementById("quality-details-modal-close");
  var qualityDetailsBodyEl = document.getElementById("quality-details-body");
  var previewStatusEl = document.getElementById("preview-status");
  var downloadBtn = document.getElementById("download-btn");

  // ROUND G — IMPROVE WITH AI: eski (Phase 4) inline "chip + textarea"
  // panelinin element referansları, yerini alan yeni modal referanslarıyla
  // değiştirildi (bkz. index.html). improveToggleBtn'in KENDİSİ (id/enabled-
  // disabled mantığı) HİÇ değişmedi.
  var improveToggleBtn = document.getElementById("improve-toggle-btn");
  var improveModalBackdropEl = document.getElementById("improve-modal-backdrop");
  var improveModalCloseBtnEl = document.getElementById("improve-modal-close-btn");
  var improveOptionsEl = document.getElementById("improve-options");
  var improveCustomInputEl = document.getElementById("improve-custom-input");
  var improveModalStatusEl = document.getElementById("improve-modal-status");
  var improveCancelBtnEl = document.getElementById("improve-cancel-btn");
  var improveSubmitBtn = document.getElementById("improve-submit-btn");

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
  // CUSTOM ASSET LIBRARY round — Upload Asset Library UI element referansları.
  var assetUploadInput = document.getElementById("asset-upload-input");
  var assetUploadBtn = document.getElementById("asset-upload-btn");
  var assetUploadStatusEl = document.getElementById("asset-upload-status");
  var assetCustomLibrariesEl = document.getElementById("asset-custom-libraries");
  var previewAssetTagEl = document.getElementById("preview-asset-tag");
  var assetModalOverlay = document.getElementById("asset-modal-overlay");
  var assetModalTitle = document.getElementById("asset-modal-title");
  var assetModalGrid = document.getElementById("asset-modal-grid");
  var assetModalCloseBtn = document.getElementById("asset-modal-close");

  // ROUND H — ASSET BROWSER: kategori filtre çipleri + gerçek asset detay
  // modalı element referansları. #asset-modal-overlay (üstteki, "+N View
  // All" popover'ı) HİÇ değişmedi/dokunulmadı — bu tamamen ayrı bir set.
  var assetFilterChipsEl = document.getElementById("asset-filter-chips");
  var assetDetailModalOverlay = document.getElementById("asset-detail-modal-overlay");
  var assetDetailModalCloseBtn = document.getElementById("asset-detail-modal-close");
  var assetDetailPreviewEl = document.getElementById("asset-detail-preview");
  var assetDetailNameEl = document.getElementById("asset-detail-name");
  var assetDetailCategoryEl = document.getElementById("asset-detail-category");
  var assetDetailTagsEl = document.getElementById("asset-detail-tags");
  var assetDetailKitEl = document.getElementById("asset-detail-kit");
  var assetDetailSourceEl = document.getElementById("asset-detail-source");
  var assetDetailUseBtn = document.getElementById("asset-detail-use-btn");

  // ROUND I — GAME LIBRARY element referansları.
  var sidebarMyGamesBtn = document.getElementById("sidebar-my-games-btn");
  var myGamesModalOverlay = document.getElementById("my-games-modal-overlay");
  var myGamesModalCloseBtn = document.getElementById("my-games-modal-close");
  var myGamesSearchInput = document.getElementById("my-games-search-input");
  var myGamesSortChipsEl = document.getElementById("my-games-sort-chips");
  var myGamesGridEl = document.getElementById("my-games-grid");
  var myGamesRenameModalOverlay = document.getElementById("my-games-rename-modal-overlay");
  var myGamesRenameInput = document.getElementById("my-games-rename-input");
  var myGamesRenameStatusEl = document.getElementById("my-games-rename-status");
  var myGamesRenameSaveBtn = document.getElementById("my-games-rename-save");
  var myGamesRenameCancelBtn = document.getElementById("my-games-rename-cancel");
  var myGamesRenameCloseBtn = document.getElementById("my-games-rename-close");
  var myGamesDeleteModalOverlay = document.getElementById("my-games-delete-modal-overlay");
  var myGamesDeleteMessageEl = document.getElementById("my-games-delete-message");
  var myGamesDeleteConfirmBtn = document.getElementById("my-games-delete-confirm");
  var myGamesDeleteCancelBtn = document.getElementById("my-games-delete-cancel");
  var myGamesDeleteCloseBtn = document.getElementById("my-games-delete-close");
  // Silinen/boş bir oyuna dönüldüğünde preview-placeholder'ı sayfa ilk
  // yüklendiğindeki GERÇEK/orijinal metnine geri döndürmek için — renderPreview
  // hata durumunda bu innerHTML'i geçici olarak değiştiriyor (bkz. resetGeneratorToEmptyState).
  var DEFAULT_PREVIEW_PLACEHOLDER_HTML = previewPlaceholder ? previewPlaceholder.innerHTML : "";

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

  // ROUND I — GAME LIBRARY: mevcut mimari incelendi (bkz. ÖNCE MEVCUT
  // SİSTEMİ İNCELE notu) — sistemde zaten TEK doğruluk kaynağı olan
  // `lastResult` VAR (html/cssExcerpt/jsExcerpt/validation/meta/prompt), ve
  // MODEL_STORAGE_KEY (yukarıda, sadece seçilen model id'si için) zaten
  // localStorage kullanıyor. Yeni bir database/backend YOK — sadece AYNI
  // localStorage mekanizması, bu sefer TAM game record'ları için kullanıldı.
  // currentGameId: Library'de hangi kaydın "şu an açık oyun" olduğunu
  // izler — Generate her zaman YENİ bir id/kayıt üretir, Improve/Fix with AI
  // ise (varsa) BU id'nin kaydını GÜNCELLER (bkz. saveGeneratedGameAsNew /
  // syncCurrentGameAfterFixOrImprove, aşağıda).
  var GAME_LIBRARY_STORAGE_KEY = "playableAi.gameLibrary";
  var gameLibrary = [];
  var currentGameId = null;
  var gameLibraryPersistFailed = false;
  // PERSISTENT MY GAMES round — signed-in bir kullanıcı için son
  // GET /api/games denemesi başarısız olduysa dürüst bir mesaj (bkz.
  // renderMyGamesLibrary'nin noticeHtml'i) — gameLibraryPersistFailed İLE
  // AYNI amaç, sadece "yazma" yerine "okuma" hatası için ayrı bir bayrak
  // (ikisi farklı, eşzamanlı olabilecek durumlar).
  var gameLibraryLoadError = null;
  // Auth durumu değiştiğinde (initAuth/onAuthStateChange) birden fazla
  // GET /api/games isteği çakışabilir (ör. INITIAL_SESSION + SIGNED_IN
  // art arda) — SADECE en son başlatılan isteğin sonucu uygulanır, daha
  // ESKİ bir isteğin geç gelen yanıtı state'i GERİYE almaz (görev: "Do not
  // cause duplicate fetches or race conditions during auth initialization").
  var gameLibraryLoadToken = 0;
  var myGamesSearchQuery = "";
  var myGamesSortOrder = "newest";
  var myGamesOpenMenuId = null;
  var myGamesRenameTargetId = null;
  var myGamesDeleteTargetId = null;

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
  // ROUND H — ASSET BROWSER: aktif kategori filtresi ("all" ya da
  // ASSET_CATEGORY_ORDER'dan biri). Sidebar'daki data-sidebar-asset-link
  // tıklamaları ve #asset-filter-chips'teki çipler AYNI bu değişkeni okur/
  // yazar — iki ayrı state YOK, tek doğruluk kaynağı.
  var assetCategoryFilter = "all";

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

  // CUSTOM ASSET LIBRARY round — GET /api/assets'in additive
  // `customLibraries` alanından ({id,name,version,assetCount,createdAt}[])
  // dolduruluyor; sadece görev md.8'in özet satırı için kullanılıyor. Bu
  // dizinin assetlerinin KENDİSİ zaten ASSET_LIBRARY'nin İÇİNDE (bkz.
  // routes/assets.js merge noktası) — renderAssetLibrary()'nin mevcut
  // kategori render mantığı hiç değişmeden onları da gösteriyor.
  var CUSTOM_LIBRARIES = [];

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
      // ROUND H — ASSET BROWSER: additive alanlar, HİÇBİR mevcut tüketici
      // fonksiyon bunları önceden okumuyordu (renderAssetLibrary/arama/
      // seçim/detectGameplayBlocks hepsi yukarıdaki alanları kullanıyor,
      // aşağıdakiler sadece YENİ Asset Detail modalı ve genişletilmiş arama
      // içindir). `pack` — görsel asset paketi (server/config/packs/*).
      // `kit` — SADECE custom library assetlerinde var olabilen, manifest'te
      // beyan edilmiş GAME_KITS anahtarı (bkz. customAssetLibrary.js);
      // default assetlerde backend bu alanı hiç göndermiyor, bu yüzden
      // burada da null kalır (uydurma değer YOK). `libraryId`/`libraryName`
      // SADECE custom library assetlerinde var — bu, "Default vs Custom
      // Library" ayrımının GERÇEK, backend-kaynaklı tespiti (bkz.
      // server/services/customAssetLibrary.js registerLibrary()).
      pack: a.pack || null,
      kit: a.kit || null,
      libraryId: a.libraryId || null,
      libraryName: a.libraryName || null,
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
        // CUSTOM ASSET LIBRARY round — additive alan: data.customLibraries
        // yoksa (eski/offline yanıt şekli) CUSTOM_LIBRARIES sessizce boş
        // kalır, görev md.8 özet satırı basitçe gösterilmez.
        CUSTOM_LIBRARIES = Array.isArray(data.customLibraries) ? data.customLibraries : [];
        renderCustomLibrariesSummary();
      })
      .catch(function () { /* offline/hata: ASSET_LIBRARY boş kalır, güvenli empty-state gösterilir */ });
  }

  // ---------------------------------------------------------------------
  // CUSTOM ASSET LIBRARY round — "+ Upload Asset Library" butonu, gizli
  // file input'u tetikler; seçilen ZIP ham binary body olarak POST
  // /api/assets/libraries'e gönderilir (multipart YOK — bkz.
  // routes/assetLibraries.js dosya başı notu, fetch bir File'ı doğrudan
  // body olarak kabul ediyor). loading/success/error durumları mevcut
  // .status-line/.error/.success sınıflarını (bkz. style.css, generate
  // akışıyla PAYLAŞILAN aynı kurallar) kullanır.
  // ---------------------------------------------------------------------
  function renderCustomLibrariesSummary() {
    if (!assetCustomLibrariesEl) return;
    if (!CUSTOM_LIBRARIES || CUSTOM_LIBRARIES.length === 0) {
      assetCustomLibrariesEl.innerHTML = "";
      assetCustomLibrariesEl.classList.add("hidden");
      return;
    }
    assetCustomLibrariesEl.classList.remove("hidden");
    assetCustomLibrariesEl.innerHTML =
      '<span>Custom Libraries:</span>' +
      CUSTOM_LIBRARIES.map(function (lib) {
        return (
          '<span class="custom-library-pill">' +
          escapeHtml(lib.name) + " · " + lib.assetCount + (lib.assetCount === 1 ? " asset" : " assets") +
          "</span>"
        );
      }).join("");
  }

  function setAssetUploadStatus(message, kind) {
    if (!assetUploadStatusEl) return;
    assetUploadStatusEl.textContent = message || "";
    assetUploadStatusEl.className = "status-line" + (kind ? " " + kind : "");
  }

  // err: /api/assets/libraries'in JSON hata gövdesi ({error, details?}).
  // details varsa (validation md.12 senaryoları) İLK 3 tanesi kısa bir özet
  // olarak eklenir — tüm listeyi dökmek UI'ı boğar, konsola tam liste zaten
  // yazılıyor (bkz. aşağı) ilgilenen biri (Selin) DevTools'tan görebilir.
  function formatUploadError(err) {
    var base = (err && err.error) || "Yükleme başarısız oldu.";
    if (err && Array.isArray(err.details) && err.details.length > 0) {
      var shown = err.details.slice(0, 3).join(" / ");
      var more = err.details.length > 3 ? " (+" + (err.details.length - 3) + " daha)" : "";
      return base + " — " + shown + more;
    }
    return base;
  }

  function handleAssetUploadFile(file) {
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      setAssetUploadStatus("Sadece .zip dosyaları kabul edilir.", "error");
      return;
    }

    if (assetUploadBtn) assetUploadBtn.disabled = true;
    setAssetUploadStatus("Yükleniyor…", "");

    fetch("/api/assets/libraries", {
      method: "POST",
      headers: { "Content-Type": "application/zip" },
      body: file,
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) {
          if (result.data && Array.isArray(result.data.details) && result.data.details.length > 0) {
            console.error("[asset upload] validation details:", result.data.details);
          }
          setAssetUploadStatus(formatUploadError(result.data), "error");
          return;
        }
        var lib = result.data && result.data.library;
        setAssetUploadStatus(
          lib ? "✓ \"" + lib.name + "\" eklendi (" + lib.assetCount + " asset)." : "✓ Yüklendi.",
          "success"
        );
        // Yeni assetlerin Asset Library ızgarasında/sidebar sayaçlarında
        // GERÇEKTEN görünmesi için mevcut GET /api/assets akışı (bkz.
        // loadAssetLibrary) TEKRAR çalıştırılır — ayrı bir "custom asset
        // ekle" client-side birleştirme mantığı YAZILMADI, tek doğruluk
        // kaynağı hep backend.
        loadAssetLibrary();
      })
      .catch(function () {
        setAssetUploadStatus("Yükleme sırasında bir bağlantı hatası oluştu.", "error");
      })
      .finally(function () {
        if (assetUploadBtn) assetUploadBtn.disabled = false;
        if (assetUploadInput) assetUploadInput.value = ""; // aynı dosyanın tekrar seçilebilmesi için
      });
  }

  function initAssetLibraryUpload() {
    if (assetUploadBtn && assetUploadInput) {
      assetUploadBtn.addEventListener("click", function () { assetUploadInput.click(); });
      assetUploadInput.addEventListener("change", function () {
        var file = assetUploadInput.files && assetUploadInput.files[0];
        handleAssetUploadFile(file);
      });
    }
  }

  // ---------------------------------------------------------------------
  // AI MODEL SELECTOR round — sağ üstteki mode-badge'i tıklanabilir bir
  // model seçici hâline getirir. loadAssetLibrary()'nin AYNI deseni: GET
  // ile salt-okunur veri çek, başarısızsa SESSİZCE no-op (mevcut "…" rozeti
  // görünmeye devam eder, tıklama da hiçbir şey açmaz — kırılma yok).
  // ---------------------------------------------------------------------
  var MODEL_STORAGE_KEY = "playableAi.selectedModel";
  var AVAILABLE_MODELS = [];
  var DEFAULT_MODEL_ID = null;
  var selectedModelId = null;
  // OPENROUTER MODEL CATALOG + BYOK round — arama sorgusu SADECE geçici
  // görüntü state'i, hiçbir yere kaydedilmiyor.
  var MODEL_SEARCH_QUERY = "";
  // GÜVENLİK (görev md.5/md.6 — ÇOK ÖNEMLİ): userApiKey SADECE bu modül
  // kapsamındaki (IIFE) bir JS DEĞİŞKENİ — bilerek localStorage/
  // sessionStorage/cookie'ye YAZILMIYOR. Sayfa yenilenince (refresh) kabul
  // edilebilir şekilde kaybolur (görev md.5'in AÇIKÇA izin verdiği
  // davranış) — kullanıcı isterse "Clear key" ile de elle temizleyebilir
  // (bkz. handleByokClear). Bu değişken hiçbir zaman: console.log'a,
  // herhangi bir DOM textContent/innerHTML'e, ya da /api/generate DIŞINDA
  // bir yere YAZILMAZ.
  var userApiKey = null;

  // localStorage private-browsing/quota hatalarına karşı try/catch'li —
  // bu SADECE seçilen model id string'ini tutar, API key/secret ASLA
  // yazılmıyor (bkz. görev md.6).
  function getStoredModelId() {
    try {
      return window.localStorage ? window.localStorage.getItem(MODEL_STORAGE_KEY) : null;
    } catch (err) {
      return null;
    }
  }

  function storeModelId(id) {
    try {
      if (window.localStorage) window.localStorage.setItem(MODEL_STORAGE_KEY, id);
    } catch (err) {
      /* private mode/quota: seçim bu sekmede geçerli kalır, sadece kalıcı olmaz */
    }
  }

  // id: GET /api/models'ten gelen AVAILABLE_MODELS içinde bulunamıyorsa
  // (ör. henüz yüklenmediyse ya da meta.model beklenmedik bir id ise) ham
  // id'nin kendisi güvenli bir fallback olarak gösterilir — hiçbir şey
  // gizlenmez, sadece "kullanıcı dostu isim" bulunamamış olur.
  function getModelDisplayName(id) {
    if (!id) return "OpenRouter";
    for (var i = 0; i < AVAILABLE_MODELS.length; i++) {
      if (AVAILABLE_MODELS[i].id === id) return AVAILABLE_MODELS[i].displayName;
    }
    return id;
  }

  function getSelectedModelId() {
    return selectedModelId;
  }

  // GÜVENLİK: bu getter'ın DIŞINDA userApiKey'i OKUYAN tek yer, Generate
  // isteğinin body'sini kurduğu satırdır (bkz. aşağıdaki fetch("/api/generate")
  // çağrısı) — hiçbir yerde loglanmaz/DOM'a yazılmaz.
  function getUserApiKey() {
    return userApiKey;
  }

  // OPENROUTER MODEL CATALOG + BYOK round — md.2: kullanıcı model listesini
  // arayabilsin. Sadece istemci tarafında, AVAILABLE_MODELS üzerinde ad/
  // sağlayıcı/id'ye göre filtreler — hiçbir ağ isteği tetiklemez.
  // Virtualized rendering GEREKMİYOR (görev md.2: "v1 için yeterli").
  function getFilteredModels() {
    var q = MODEL_SEARCH_QUERY.trim().toLowerCase();
    if (!q) return AVAILABLE_MODELS;
    return AVAILABLE_MODELS.filter(function (m) {
      return (
        (m.displayName && m.displayName.toLowerCase().indexOf(q) !== -1) ||
        (m.provider && m.provider.toLowerCase().indexOf(q) !== -1) ||
        (m.id && m.id.toLowerCase().indexOf(q) !== -1)
      );
    });
  }

  // MODEL SELECTOR UI/UX POLISH round — md.4/md.5: katalog çok büyüdüğünde
  // düz liste kullanışsızlaşıyor. "Recommended" (bilinen/güvenilir
  // fallback modeller) HER ZAMAN en üstte; ardından SADECE birkaç BÜYÜK
  // sağlayıcı için (bounded — kaç farklı sağlayıcı gelirse gelsin grup
  // sayısı sabit kalır, görev md.4'ün "model sayısı çok fazlaysa UX'i
  // kötüleştirmemeli" kısıtı) ayrı başlıklar; geri kalan HER ŞEY tek bir
  // "Other" grubuna düşer. Backend response'una (id/displayName/provider/…)
  // HİÇ dokunulmadı — bu SADECE istemci tarafında görsel bir gruplama.
  var RECOMMENDED_MODEL_IDS = ["deepseek/deepseek-v4-flash-0731", "qwen/qwen3.8-flash"];
  var MAJOR_PROVIDER_GROUPS = [
    { slug: "openai", label: "OpenAI" },
    { slug: "anthropic", label: "Anthropic" },
    { slug: "google", label: "Google" },
    { slug: "meta-llama", label: "Meta" },
    { slug: "meta", label: "Meta" },
    { slug: "x-ai", label: "xAI" },
    { slug: "mistralai", label: "Mistral" },
  ];

  function buildGroupedSections(models) {
    var byId = {};
    models.forEach(function (m) { byId[m.id] = m; });

    var recommended = RECOMMENDED_MODEL_IDS.map(function (id) { return byId[id]; }).filter(Boolean);
    var recommendedIds = recommended.map(function (m) { return m.id; });
    var remaining = models.filter(function (m) { return recommendedIds.indexOf(m.id) === -1; });

    var sections = [];
    if (recommended.length) sections.push({ label: "Recommended", models: recommended });

    MAJOR_PROVIDER_GROUPS.forEach(function (group) {
      var matched = remaining.filter(function (m) { return m.provider === group.slug; });
      if (!matched.length) return;
      // İki farklı slug AYNI etikete (ör. "meta-llama" + "meta" -> "Meta")
      // eşleniyorsa, YENİ bir section AÇMAK yerine var olana EKLENİR —
      // aksi halde aynı isimli iki grup başlığı yan yana görünürdü.
      var existing = sections.filter(function (s) { return s.label === group.label; })[0];
      if (existing) {
        existing.models = existing.models.concat(matched);
      } else {
        sections.push({ label: group.label, models: matched });
      }
      remaining = remaining.filter(function (m) { return m.provider !== group.slug; });
    });

    if (remaining.length) sections.push({ label: "Other", models: remaining });

    return sections;
  }

  function appendModelGroupHeader(label) {
    var header = document.createElement("div");
    header.className = "model-group-header";
    header.textContent = label;
    modelDropdownListEl.appendChild(header);
  }

  function appendModelOption(m) {
    var isSelected = m.id === selectedModelId;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "model-option" + (isSelected ? " selected" : "");
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    btn.dataset.modelId = m.id;

    var check = document.createElement("span");
    check.className = "model-option-check";
    check.textContent = "✓";
    check.setAttribute("aria-hidden", "true");

    // md.3: "Model Name / Provider" — isim + sağlayıcı ayrı satırda, her
    // ikisi de kendi ellipsis kuralına sahip (bkz. style.css) ki uzun
    // isimler dropdown'ı GENİŞLETMESİN.
    var nameWrap = document.createElement("span");
    nameWrap.className = "model-option-name-wrap";

    var nameEl = document.createElement("span");
    nameEl.className = "model-option-name";
    nameEl.textContent = m.displayName;
    nameWrap.appendChild(nameEl);

    if (m.provider) {
      var providerEl = document.createElement("span");
      providerEl.className = "model-option-provider";
      providerEl.textContent = m.provider;
      nameWrap.appendChild(providerEl);
    }

    btn.appendChild(check);
    btn.appendChild(nameWrap);
    modelDropdownListEl.appendChild(btn);
  }

  function renderModelDropdown() {
    if (!modelDropdownListEl) return;
    modelDropdownListEl.innerHTML = "";
    var isSearching = MODEL_SEARCH_QUERY.trim().length > 0;
    var filtered = getFilteredModels();

    if (filtered.length === 0) {
      var empty = document.createElement("div");
      empty.className = "model-dropdown-empty";
      empty.textContent = "No models found";
      modelDropdownListEl.appendChild(empty);
      return;
    }

    // Arama YAPILIYORSA: düz, filtrelenmiş liste (grup başlıkları arama
    // sırasında gereksiz — kullanıcı zaten daraltıyor, md.2). Arama
    // YAPILMIYORSA: Recommended + bounded sağlayıcı grupları (md.4).
    if (isSearching) {
      filtered.forEach(appendModelOption);
    } else {
      buildGroupedSections(filtered).forEach(function (section) {
        appendModelGroupHeader(section.label);
        section.models.forEach(appendModelOption);
      });
    }
  }

  function isModelDropdownOpen() {
    return !!modelDropdownEl && !modelDropdownEl.classList.contains("hidden");
  }

  function handleModelDropdownOutsideClick(e) {
    if (modelSelectorEl && !modelSelectorEl.contains(e.target)) {
      closeModelDropdown();
    }
  }

  function handleModelDropdownKeydown(e) {
    if (e.key === "Escape") {
      closeModelDropdown();
      if (modeBadge) modeBadge.focus();
    }
  }

  function openModelDropdown() {
    if (!modelDropdownEl || !modeBadge) return;
    modelDropdownEl.classList.remove("hidden");
    modeBadge.setAttribute("aria-expanded", "true");
    // OPENROUTER MODEL CATALOG + BYOK round — her açılışta arama kutusu
    // temiz başlar (önceki bir aramanın filtrelenmiş görünümünde takılı
    // kalmamak için).
    MODEL_SEARCH_QUERY = "";
    if (modelSearchInputEl) modelSearchInputEl.value = "";
    renderModelDropdown();
    updateByokRowLabel();
    // MODEL SELECTOR UI/UX POLISH round — her açılışta scroll gövdesi
    // baştan başlasın (önceki bir kapanıştan kalma scroll pozisyonunda
    // takılı kalmasın).
    if (modelDropdownScrollEl) modelDropdownScrollEl.scrollTop = 0;
    // Sadece açıkken dinle, kapanınca kaldır — gereksiz global listener birikmesin.
    document.addEventListener("click", handleModelDropdownOutsideClick, true);
    document.addEventListener("keydown", handleModelDropdownKeydown);
  }

  function closeModelDropdown() {
    if (!modelDropdownEl || !modeBadge) return;
    modelDropdownEl.classList.add("hidden");
    modeBadge.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", handleModelDropdownOutsideClick, true);
    document.removeEventListener("keydown", handleModelDropdownKeydown);
  }

  function toggleModelDropdown() {
    if (isModelDropdownOpen()) {
      closeModelDropdown();
    } else {
      openModelDropdown();
    }
  }

  function selectModel(id) {
    if (!id || id === selectedModelId) {
      closeModelDropdown();
      return;
    }
    selectedModelId = id;
    storeModelId(id);
    // DISCOVERABILITY round — henüz bir generate yapılmadıysa (rozet hâlâ
    // nötr/ilk "badge" durumundaysa, bkz. setBadge) kapalı seçiciye YENİ
    // seçimin adı hemen yansısın ("kullanıcı hangi modelin seçili olduğunu
    // ANINDA görebilmeli"). Bir generate ZATEN yapıldıysa (rozet "badge
    // mock"/"badge live" oldu) buraya HİÇ dokunulmuyor — setBadge'in
    // post-generation davranışı (o generate'te GERÇEKTEN kullanılan modeli
    // göstermesi) bu round'da HİÇ değişmedi.
    if (modeBadge && modeBadge.className === "badge") {
      setModeBadgeText(getModelDisplayName(selectedModelId));
    }
    renderModelDropdown();
    closeModelDropdown();
  }

  // ---------------------------------------------------------------------
  // OPENROUTER MODEL CATALOG + BYOK round — kullanıcının kendi OpenRouter
  // API key'i. GÜVENLİK KURALLARI (görev md.5/md.6/md.16, ÇOK ÖNEMLİ):
  //  - userApiKey SADECE bellekte (bu IIFE'nin bir değişkeni) tutulur.
  //  - localStorage/sessionStorage/cookie'ye ASLA yazılmaz.
  //  - console.log/console.error'a ASLA verilmez.
  //  - Doğrulama (validate-key) SADECE "Use API Key" tıklanınca yapılır —
  //    her Generate'te TEKRAR doğrulanmaz (md.7: "gereksiz tekrar
  //    doğrulama isteği atma").
  // ---------------------------------------------------------------------
  function updateByokRowLabel() {
    if (modelByokBtnLabelEl) {
      modelByokBtnLabelEl.textContent = userApiKey ? "Using your own API key" : "Use your own API key";
    }
    if (modelByokBtnEl) {
      modelByokBtnEl.classList.toggle("selected", !!userApiKey);
    }
  }

  function setByokModalStatus(text, kind) {
    if (!byokModalStatusEl) return;
    byokModalStatusEl.textContent = text || "";
    byokModalStatusEl.className = "byok-modal-status" + (kind ? " " + kind : "");
  }

  function isByokModalOpen() {
    return !!byokModalBackdropEl && !byokModalBackdropEl.classList.contains("hidden");
  }

  function openByokModal() {
    if (!byokModalBackdropEl) return;
    closeModelDropdown();
    if (byokKeyInputEl) byokKeyInputEl.value = "";
    setByokModalStatus("", "");
    if (byokClearBtnEl) byokClearBtnEl.classList.toggle("hidden", !userApiKey);
    byokModalBackdropEl.classList.remove("hidden");
    if (byokKeyInputEl) byokKeyInputEl.focus();
    document.addEventListener("keydown", handleByokModalKeydown);
    // PERSISTENT USER OPENROUTER API KEYS round (görev md.7): "When opening
    // the BYOK modal for an authenticated user: call GET
    // /api/keys/openrouter/status, show only whether a key is configured."
    // Anonim kullanıcı için bu satır sadece #byok-account-row'u hidden
    // tutar (aşağıdaki fonksiyonun kendi getCurrentUser() kontrolü) --
    // mevcut anonim BYOK davranışı HİÇ etkilenmez.
    refreshByokAccountRow();
  }

  // ---------------------------------------------------------------------
  // PERSISTENT USER OPENROUTER API KEYS (Phase 3) round — signed-in
  // kullanıcının hesabına KAYITLI OpenRouter key'i için minimal, ek UI.
  //
  // GÜVENLİK (görev md.7, KESİN):
  //  - Key, kaydedildikten SONRA bir daha ASLA sunucudan GERİ OKUNMAZ/
  //    gösterilmez -- SADECE GET .../status'un {hasKey, updatedAt}
  //    (secret İÇERMEYEN) sonucu gösterilir.
  //  - "Save key to my account" mevcut #byok-key-input'taki HAM değeri
  //    kullanır (AYRI bir input EKLENMEDİ, görev md.7: "büyük bir UI
  //    değişikliği gerektiriyorsa basit bir authenticated 'Save key'
  //    action'ı yeterli").
  //  - Saved key'i SİLMEK, bellek-içi session key'ini (userApiKey) ASLA
  //    otomatik temizlemez -- kullanıcı isterse AYRICA "Clear key"'e
  //    basmalı (görev md.7, KESİN).
  //  - Anonim kullanıcı için #byok-account-row HER ZAMAN hidden kalır,
  //    hiçbir /api/keys isteği ASLA atılmaz.
  // ---------------------------------------------------------------------
  function setByokAccountStatus(text, kind) {
    if (!byokAccountStatusEl) return;
    byokAccountStatusEl.textContent = text || "";
    byokAccountStatusEl.className = "byok-account-status" + (kind ? " " + kind : "");
  }

  function refreshByokAccountRow() {
    if (!byokAccountRowEl) return;
    var user = getCurrentUser();
    byokAccountRowEl.classList.toggle("hidden", !user);
    if (!user) return;

    setByokAccountStatus("Checking your saved key…", "");
    if (byokDeleteAccountBtnEl) byokDeleteAccountBtnEl.classList.add("hidden");
    if (typeof fetch !== "function") return;

    buildAuthHeaders()
      .then(function (authHeaders) {
        return fetch("/api/keys/openrouter/status", { headers: authHeaders });
      })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.hasKey) {
          setByokAccountStatus("A key is saved to your account.", "success");
          if (byokDeleteAccountBtnEl) byokDeleteAccountBtnEl.classList.remove("hidden");
        } else {
          setByokAccountStatus("No key saved to your account yet.", "");
        }
      })
      .catch(function () {
        setByokAccountStatus("Could not check your saved key right now.", "error");
      });
  }

  async function handleSaveKeyToAccount() {
    var rawKey = byokKeyInputEl ? byokKeyInputEl.value : "";
    if (!rawKey || !rawKey.trim()) {
      setByokAccountStatus("Enter your OpenRouter API key above first.", "error");
      return;
    }
    if (typeof fetch !== "function") {
      setByokAccountStatus("Saving is unavailable right now.", "error");
      return;
    }
    if (byokSaveAccountBtnEl) byokSaveAccountBtnEl.disabled = true;
    setByokAccountStatus("Saving…", "");
    try {
      var authHeaders = await buildAuthHeaders();
      var res = await fetch("/api/keys/openrouter", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, authHeaders),
        body: JSON.stringify({ apiKey: rawKey.trim() }),
      });
      var data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        data = null;
      }
      if (res.ok && data && data.hasKey) {
        // GÜVENLİK: kaydedilen key BİR DAHA hiçbir yerde gösterilmiyor --
        // SADECE sabit, secret-free bir onay metni.
        setByokAccountStatus("OpenRouter key saved securely.", "success");
        if (byokDeleteAccountBtnEl) byokDeleteAccountBtnEl.classList.remove("hidden");
      } else {
        setByokAccountStatus((data && data.error) || "Could not save your key.", "error");
      }
    } catch (err) {
      setByokAccountStatus("Could not reach the server to save your key.", "error");
    } finally {
      if (byokSaveAccountBtnEl) byokSaveAccountBtnEl.disabled = false;
    }
  }

  async function handleDeleteKeyFromAccount() {
    if (typeof fetch !== "function") return;
    if (byokDeleteAccountBtnEl) byokDeleteAccountBtnEl.disabled = true;
    setByokAccountStatus("Deleting…", "");
    try {
      var authHeaders = await buildAuthHeaders();
      var res = await fetch("/api/keys/openrouter", { method: "DELETE", headers: authHeaders });
      if (res.ok) {
        setByokAccountStatus("Saved key deleted.", "");
        if (byokDeleteAccountBtnEl) byokDeleteAccountBtnEl.classList.add("hidden");
        // GÜVENLİK (görev md.7, KESİN): userApiKey (bellek-içi SESSION key)
        // BURADA BİLEREK dokunulmuyor -- saved key'i silmek session key'ini
        // OTOMATİK temizlemez, kullanıcı isterse AYRICA "Clear key"'e basar.
      } else {
        setByokAccountStatus("Could not delete your saved key.", "error");
      }
    } catch (err) {
      setByokAccountStatus("Could not reach the server to delete your key.", "error");
    } finally {
      if (byokDeleteAccountBtnEl) byokDeleteAccountBtnEl.disabled = false;
    }
  }

  function closeByokModal() {
    if (!byokModalBackdropEl) return;
    byokModalBackdropEl.classList.add("hidden");
    // GÜVENLİK: modal kapanınca input'taki ham metin DOM'da/bellekte
    // gereksiz yere bırakılmaz — zaten geçerliyse userApiKey'e taşındı
    // (bkz. handleByokUse), değilse burada tamamen atılır.
    if (byokKeyInputEl) byokKeyInputEl.value = "";
    document.removeEventListener("keydown", handleByokModalKeydown);
  }

  function handleByokModalKeydown(e) {
    if (e.key === "Escape") closeByokModal();
  }

  async function handleByokUse() {
    var rawKey = byokKeyInputEl ? byokKeyInputEl.value : "";
    if (!rawKey || !rawKey.trim()) {
      setByokModalStatus("Please enter your OpenRouter API key.", "error");
      return;
    }
    if (typeof fetch !== "function") {
      setByokModalStatus("Key validation is unavailable right now.", "error");
      return;
    }
    setByokModalStatus("Checking key…", "");
    byokUseBtnEl.disabled = true;
    try {
      var res = await fetch("/api/models/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: rawKey.trim() }),
      });
      var data = res.ok ? await res.json() : { valid: false, error: "Invalid OpenRouter API key" };
      if (data && data.valid) {
        // GÜVENLİK: SADECE burada, bellek-içi değişkene taşınıyor —
        // hiçbir depolama API'sine yazılmıyor.
        userApiKey = rawKey.trim();
        updateByokRowLabel();
        setByokModalStatus("Key saved for this session.", "success");
        window.setTimeout(closeByokModal, 500);
      } else {
        setByokModalStatus((data && data.error) || "Invalid OpenRouter API key", "error");
      }
    } catch (err) {
      setByokModalStatus("Could not reach the server to validate the key.", "error");
    } finally {
      byokUseBtnEl.disabled = false;
    }
  }

  function handleByokClear() {
    userApiKey = null;
    if (byokKeyInputEl) byokKeyInputEl.value = "";
    updateByokRowLabel();
    setByokModalStatus("Key cleared.", "");
    if (byokClearBtnEl) byokClearBtnEl.classList.add("hidden");
  }

  function initModelSelector() {
    if (modeBadge) {
      modeBadge.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleModelDropdown();
      });
    }
    if (modelDropdownListEl) {
      modelDropdownListEl.addEventListener("click", function (e) {
        var optionBtn = e.target.closest ? e.target.closest(".model-option") : null;
        if (optionBtn && optionBtn.dataset.modelId) {
          selectModel(optionBtn.dataset.modelId);
        }
      });
    }
    if (modelSearchInputEl) {
      modelSearchInputEl.addEventListener("click", function (e) { e.stopPropagation(); });
      modelSearchInputEl.addEventListener("input", function () {
        MODEL_SEARCH_QUERY = modelSearchInputEl.value || "";
        renderModelDropdown();
      });
    }
    if (modelByokBtnEl) {
      modelByokBtnEl.addEventListener("click", function (e) {
        e.stopPropagation();
        openByokModal();
      });
    }
    if (byokUseBtnEl) byokUseBtnEl.addEventListener("click", handleByokUse);
    if (byokCancelBtnEl) byokCancelBtnEl.addEventListener("click", closeByokModal);
    if (byokClearBtnEl) byokClearBtnEl.addEventListener("click", handleByokClear);
    if (byokSaveAccountBtnEl) byokSaveAccountBtnEl.addEventListener("click", handleSaveKeyToAccount);
    if (byokDeleteAccountBtnEl) byokDeleteAccountBtnEl.addEventListener("click", handleDeleteKeyFromAccount);
    if (byokModalBackdropEl) {
      byokModalBackdropEl.addEventListener("click", function (e) {
        if (e.target === byokModalBackdropEl) closeByokModal();
      });
    }
    if (byokKeyInputEl) {
      byokKeyInputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleByokUse();
        }
      });
    }
    updateByokRowLabel();

    if (typeof fetch !== "function") return;
    fetch("/api/models")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.models) || data.models.length === 0) return;
        AVAILABLE_MODELS = data.models;
        DEFAULT_MODEL_ID = data.defaultModel || data.models[0].id;

        // HEDEF 7: ilk açılışta mevcut/varsayılan model seçili olsun. Sadece
        // GERÇEKTEN AVAILABLE_MODELS içinde var olan saklı bir seçim kabul
        // edilir — eski/geçersiz bir localStorage değeri sessizce varsayılana
        // düşer (server-side resolveRequestedModel ile AYNI güvenli felsefe).
        var stored = getStoredModelId();
        var storedIsValid = stored && AVAILABLE_MODELS.some(function (m) { return m.id === stored; });
        selectedModelId = storedIsValid ? stored : DEFAULT_MODEL_ID;

        // DISCOVERABILITY round — katalog yüklenir yüklenmez (sayfa
        // açılışında, HENÜZ hiçbir generate yapılmadan) kapalı rozet artık
        // statik "…" yerine seçili/varsayılan modelin GERÇEK adını gösterir.
        // Sadece rozet hâlâ nötr/ilk durumdaysa (className tam olarak
        // "badge") yazılır — kullanıcı bu fetch tamamlanmadan ÖNCE zaten bir
        // generate yapmışsa (rozet "badge mock"/"badge live" oldu) buraya
        // HİÇ dokunulmaz, setBadge'in post-generation metni ezilmez.
        if (modeBadge && modeBadge.className === "badge") {
          setModeBadgeText(getModelDisplayName(selectedModelId));
        }

        renderModelDropdown();
      })
      .catch(function () { /* offline/hata: selector sessizce işlevsiz kalır, mevcut rozet davranışı bozulmaz */ });
  }

  // ---------------------------------------------------------------------
  // SUPABASE AUTHENTICATION FOUNDATION round.
  //
  // Kapsam (KESİN — görevin "Do NOT" listesi): SADECE Sign Up/Sign In/Sign
  // Out/oturum kalıcılığı/top-right hesap UI. Games/API keys/Asset
  // Libraries'in persist edilmesi, Game Library'nin localStorage'dan
  // taşınması, generation/gameplay/model-selector/BYOK davranışlarının
  // DEĞİŞTİRİLMESİ — HİÇBİRİ bu round'da YOK.
  //
  // GÜVENLİK/MİMARİ:
  //  - Oturumun KENDİSİ (access/refresh token) SADECE Supabase JS SDK'sının
  //    KENDİ normal persistence mekanizmasıyla (varsayılan: localStorage,
  //    kendi anahtar adıyla) saklanır — burada elle AYRI bir depolama
  //    KURULMUYOR/YÖNETİLMİYOR (görev md.4: "SDK'nın normal davranışı").
  //    Bu, userApiKey'in BİLEREK bellek-dışına ASLA yazılmamasıyla FARKLI
  //    bir risk sınıfı — bir Supabase oturum token'ının sayfa
  //    yenilemelerinde kalıcı olması BEKLENEN/standart bir davranış.
  //  - getAccessToken()/buildAuthHeaders() BURADA TANIMLANIYOR ama (görev
  //    md.7 gereği) hiçbir MEVCUT fetch çağrısına (generate/autofix/
  //    improve/models/assets) HENÜZ BAĞLANMIYOR — sadece ileride
  //    kullanılabilecek KÜÇÜK, hazır bir mekanizma.
  //  - Supabase client'ı YOKSA (CDN engellenmiş/offline/env yapılandırılmamış)
  //    initAuth() SESSİZCE no-op olur: signed-out UI (Sign In butonu) aynen
  //    görünmeye devam eder, anonim kullanım HİÇ etkilenmez.
  // ---------------------------------------------------------------------
  var supabaseClient = null;
  var currentUser = null; // { id, email } | null — SADECE UI/getCurrentUser() için, ASLA bir API isteğine "userId" olarak elle eklenmez.
  var authMode = "signin"; // "signin" | "signup"

  function getCurrentUser() {
    return currentUser;
  }

  // Promise<string|null> döner — geçerli bir Supabase oturumu yoksa (veya
  // client hiç başlatılamadıysa) null'a çözülür, ASLA hata fırlatmaz.
  function getAccessToken() {
    if (!supabaseClient) return Promise.resolve(null);
    return supabaseClient.auth
      .getSession()
      .then(function (result) {
        var session = result && result.data && result.data.session;
        return (session && session.access_token) || null;
      })
      .catch(function () {
        return null;
      });
  }

  // md.7: "SADECE geçerli bir oturum varsa Authorization: Bearer <token>
  // ekleyen, küçük ve tekrar kullanılabilir bir mekanizma" — anonim
  // kullanıcı için Supabase token'ı ASLA gönderilmez (boş bir header objesi
  // döner). Henüz hiçbir mevcut fetch çağrısına BAĞLANMADI (görev md.7:
  // "her isteği şimdiden yeniden yazma").
  function buildAuthHeaders() {
    return getAccessToken().then(function (token) {
      return token ? { Authorization: "Bearer " + token } : {};
    });
  }

  function setAuthModalStatus(text, kind) {
    if (!authModalStatusEl) return;
    authModalStatusEl.textContent = text || "";
    authModalStatusEl.className = "byok-modal-status" + (kind ? " " + kind : "");
  }

  function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "signin";
    var isSignup = authMode === "signup";
    if (authTabSigninEl) {
      authTabSigninEl.classList.toggle("active", !isSignup);
      authTabSigninEl.setAttribute("aria-selected", String(!isSignup));
    }
    if (authTabSignupEl) {
      authTabSignupEl.classList.toggle("active", isSignup);
      authTabSignupEl.setAttribute("aria-selected", String(isSignup));
    }
    if (authModalTitleEl) authModalTitleEl.textContent = isSignup ? "Sign Up" : "Sign In";
    if (authSubmitBtnEl) authSubmitBtnEl.textContent = isSignup ? "Sign Up" : "Sign In";
    if (authModalNoteEl) {
      authModalNoteEl.textContent = isSignup
        ? "Create an account to sync your account across devices."
        : "Sign in to sync your account across devices.";
    }
    setAuthModalStatus("", "");
  }

  function isAuthModalOpen() {
    return !!authModalBackdropEl && !authModalBackdropEl.classList.contains("hidden");
  }

  function openAuthModal() {
    if (!authModalBackdropEl) return;
    closeModelDropdown();
    closeAccountDropdown();
    setAuthMode("signin");
    if (authEmailInputEl) authEmailInputEl.value = "";
    if (authPasswordInputEl) authPasswordInputEl.value = "";
    authModalBackdropEl.classList.remove("hidden");
    if (authEmailInputEl) authEmailInputEl.focus();
    document.addEventListener("keydown", handleAuthModalKeydown);
  }

  function closeAuthModal() {
    if (!authModalBackdropEl) return;
    authModalBackdropEl.classList.add("hidden");
    // GÜVENLİK: parola input'u kapanışta temizlenir (BYOK'un key input'unu
    // kapanışta temizlemesiyle AYNI önlem).
    if (authPasswordInputEl) authPasswordInputEl.value = "";
    document.removeEventListener("keydown", handleAuthModalKeydown);
  }

  function handleAuthModalKeydown(e) {
    if (e.key === "Escape") closeAuthModal();
  }

  // Signed-out/signed-in iki durumu da tek bir yerden günceller — mevcut
  // model-selector/help-btn'e HİÇ dokunmaz (görev md.5: "keep working").
  function renderAccountUI() {
    var signedIn = !!currentUser;
    if (accountSigninBtnEl) accountSigninBtnEl.classList.toggle("hidden", signedIn);
    if (accountControlEl) accountControlEl.classList.toggle("hidden", !signedIn);
    if (signedIn) {
      var label = currentUser.email || "Account";
      if (accountBtnLabelEl) accountBtnLabelEl.textContent = label;
      if (accountDropdownEmailEl) accountDropdownEmailEl.textContent = currentUser.email || "";
    } else {
      closeAccountDropdown();
    }
  }

  function isAccountDropdownOpen() {
    return !!accountDropdownEl && !accountDropdownEl.classList.contains("hidden");
  }

  function handleAccountDropdownOutsideClick(e) {
    if (accountControlEl && !accountControlEl.contains(e.target)) {
      closeAccountDropdown();
    }
  }

  function handleAccountDropdownKeydown(e) {
    if (e.key === "Escape") {
      closeAccountDropdown();
      if (accountBtnEl) accountBtnEl.focus();
    }
  }

  function openAccountDropdown() {
    if (!accountDropdownEl || !accountBtnEl) return;
    accountDropdownEl.classList.remove("hidden");
    accountBtnEl.setAttribute("aria-expanded", "true");
    document.addEventListener("click", handleAccountDropdownOutsideClick, true);
    document.addEventListener("keydown", handleAccountDropdownKeydown);
  }

  function closeAccountDropdown() {
    if (!accountDropdownEl || !accountBtnEl) return;
    accountDropdownEl.classList.add("hidden");
    accountBtnEl.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", handleAccountDropdownOutsideClick, true);
    document.removeEventListener("keydown", handleAccountDropdownKeydown);
  }

  function toggleAccountDropdown() {
    if (isAccountDropdownOpen()) {
      closeAccountDropdown();
    } else {
      openAccountDropdown();
    }
  }

  async function handleAuthSubmit() {
    if (!supabaseClient) {
      setAuthModalStatus("Sign-in is not available right now.", "error");
      return;
    }
    var email = authEmailInputEl ? authEmailInputEl.value.trim() : "";
    var password = authPasswordInputEl ? authPasswordInputEl.value : "";
    if (!email || !password) {
      setAuthModalStatus("Please enter your email and password.", "error");
      return;
    }
    setAuthModalStatus(authMode === "signup" ? "Creating account…" : "Signing in…", "");
    authSubmitBtnEl.disabled = true;
    try {
      var result =
        authMode === "signup"
          ? await supabaseClient.auth.signUp({ email: email, password: password })
          : await supabaseClient.auth.signInWithPassword({ email: email, password: password });
      var error = result && result.error;
      var session = result && result.data && result.data.session;
      var user = result && result.data && result.data.user;
      if (error) {
        setAuthModalStatus(error.message || "Authentication failed.", "error");
        return;
      }
      if (authMode === "signup" && !session) {
        // Supabase projesi email doğrulaması istiyor olabilir — bu durumda
        // signUp() bir kullanıcı oluşturur ama oturum DÖNDÜRMEZ. Bu, proje
        // ayarına bağlı NORMAL bir davranış; burada varsayım YAPILMIYOR,
        // sadece dürüst bir bilgi mesajı gösteriliyor.
        setAuthModalStatus("Account created. Check your email to confirm, then sign in.", "success");
        return;
      }
      // onAuthStateChange dinleyicisi currentUser/renderAccountUI'yi zaten
      // güncelleyecek (bkz. initAuth) — burada AYRICA elle set etmiyoruz,
      // TEK bir doğruluk kaynağı (Supabase'in kendi state'i) korunuyor.
      if (user) {
        setAuthModalStatus("Signed in.", "success");
      }
      window.setTimeout(closeAuthModal, 400);
    } catch (err) {
      setAuthModalStatus("Could not reach the server to sign in.", "error");
    } finally {
      authSubmitBtnEl.disabled = false;
    }
  }

  async function handleSignOut() {
    closeAccountDropdown();
    if (!supabaseClient) return;
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      /* çıkış API çağrısı başarısız olsa bile aşağıdaki onAuthStateChange
         dinleyicisi/UI en azından yerel oturumu temizlemeye çalışır; anonim
         kullanım HER durumda çalışmaya devam eder. */
    }
  }

  // GÜVENLİK (görev md.3/md.9): kimlik BURADA da SADECE Supabase'in kendi
  // doğrulanmış session/user objesinden türetilir — hiçbir yerde req.body
  // veya URL'den okunan bir "userId" YOK (bu, tamamen frontend/istemci
  // tarafı bir state, server tarafı attachUser middleware'i ZATEN kendi
  // bağımsız doğrulamasını token'ın kendisiyle yapıyor).
  async function initAuth() {
    // md.5/md.9: Sign In giriş noktası HER ZAMAN görünür/tıklanabilir
    // olmalı (Supabase henüz yapılandırılmamışken bile) — bu yüzden TÜM
    // event listener bağlama işi bu try/catch'in DIŞINDA, koşulsuz
    // çalışır. Supabase gerçekten kullanılamıyorsa (CDN engellenmiş/env
    // yapılandırılmamış/ağ hatası) supabaseClient null KALIR ve
    // handleAuthSubmit/handleSignOut zaten bunu kontrol edip modal
    // İÇİNDE dürüst bir "Sign-in is not available right now." mesajı
    // gösterir (bkz. handleAuthSubmit) — buton asla SESSİZCE ölü kalmaz.
    if (window.supabase && typeof window.supabase.createClient === "function") {
      try {
        var configRes = await fetch("/api/auth/config");
        var config = configRes.ok ? await configRes.json() : null;
        if (config && config.configured && config.supabaseUrl && config.supabaseAnonKey) {
          supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        }
        // config yoksa/configured=false ise (ör. local dev/.env'de
        // SUPABASE_URL/ANON_KEY yok) supabaseClient bilerek null kalır —
        // mevcut app AYNEN (anonim) çalışmaya devam eder.
      } catch (err) {
        // Ağ hatası/CDN engellenmiş: supabaseClient null kalır.
      }
    }

    if (supabaseClient) {
      // Oturum kalıcılığı: SDK kendi (varsayılan localStorage tabanlı)
      // mekanizmasıyla zaten yönetiyor — burada SADECE mevcut oturumu
      // okuyup UI state'ini onunla eşitliyoruz (görev md.4: "session
      // restoration").
      try {
        var sessionResult = await supabaseClient.auth.getSession();
        var initialSession = sessionResult && sessionResult.data && sessionResult.data.session;
        var initialUser = initialSession && initialSession.user;
        currentUser = initialUser ? { id: initialUser.id, email: initialUser.email || null } : null;
      } catch (err) {
        currentUser = null;
      }

      // md.4: "auth state change handling" — sign in/sign out/token
      // refresh/başka bir sekmede oturum değişimi gibi TÜM durumlarda TEK
      // bir yerden currentUser + UI güncellenir. PERSISTENT MY GAMES round:
      // Game Library'nin de "doğru kaynağa" (local vs remote) geçmesi
      // gerektiği TEK yer burası — refreshGameLibrary() kendi race-condition
      // koruması (gameLibraryLoadToken) sayesinde, bu callback art arda/
      // çakışan şekilde tetiklense bile (ör. INITIAL_SESSION + SIGNED_IN)
      // sonuç DETERMİNİSTİK kalır (SADECE en son çağrının sonucu uygulanır).
      supabaseClient.auth.onAuthStateChange(function (event, session) {
        var user = session && session.user;
        currentUser = user ? { id: user.id, email: user.email || null } : null;
        renderAccountUI();
        refreshGameLibrary();
      });
    }
    renderAccountUI();
    // İlk auth durumu (sayfa yüklendiğinde: signed-out VEYA kalıcı bir
    // oturumdan restore edilmiş signed-in) belirlendikten SONRA, Game
    // Library'i o duruma göre senkronize et. loadGameLibrary() (init
    // sırasında, initAuth'tan ÖNCE çağrılır) zaten localStorage'ı senkron
    // okuyup ilk paint'i anlık gösteriyor — signed-in bir kullanıcı için bu
    // çağrı, listeyi hemen ardından GERÇEK kaynağa (Supabase) geçirir.
    refreshGameLibrary();

    if (accountSigninBtnEl) {
      accountSigninBtnEl.addEventListener("click", function (e) {
        e.stopPropagation();
        openAuthModal();
      });
    }
    if (accountBtnEl) {
      accountBtnEl.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleAccountDropdown();
      });
    }
    if (accountSignoutBtnEl) accountSignoutBtnEl.addEventListener("click", handleSignOut);
    if (authTabSigninEl) authTabSigninEl.addEventListener("click", function () { setAuthMode("signin"); });
    if (authTabSignupEl) authTabSignupEl.addEventListener("click", function () { setAuthMode("signup"); });
    if (authSubmitBtnEl) authSubmitBtnEl.addEventListener("click", handleAuthSubmit);
    if (authCancelBtnEl) authCancelBtnEl.addEventListener("click", closeAuthModal);
    if (authModalBackdropEl) {
      authModalBackdropEl.addEventListener("click", function (e) {
        if (e.target === authModalBackdropEl) closeAuthModal();
      });
    }
    if (authPasswordInputEl) {
      authPasswordInputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAuthSubmit();
        }
      });
    }
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
  // ROUND H — ASSET BROWSER: her thumb artık ince bir .asset-thumb-wrap
  // içinde. .asset-thumb <button>'ının kendisi (id/class/click-delegasyonu —
  // bkz. assetLibraryGrid/assetModalGrid click handler'ları, ikisi de
  // .closest(".asset-thumb[data-asset-id]") kullanıyor) HİÇ değişmedi;
  // sadece yanına, AYRI bir <button> olan küçük "ⓘ" (detay) affordance'ı
  // eklendi — bir <button> içine ikinci bir <button> geçersiz HTML olacağı
  // için bu bir kardeş element olarak eklendi, iç içe DEĞİL. Custom library
  // assetleri (a.libraryId dolu — bkz. mapApiAssetToLibraryItem) küçük bir
  // "CUSTOM" rozeti alır; default assetlerde bu rozet hiç render edilmez.
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
          '<div class="asset-thumb-wrap">' +
          '<button type="button" class="' + cls + '" data-asset-id="' + escapeAttr(a.id) + '" ' +
          'title="' + escapeAttr(title) + '" aria-pressed="' + (isSelected ? "true" : "false") + '">' +
          '<img src="' + escapeAttr(a.path) + '" alt="' + escapeAttr(name) + '" loading="lazy" />' +
          "</button>" +
          '<button type="button" class="asset-thumb-info" data-asset-detail-id="' + escapeAttr(a.id) + '" ' +
          'aria-label="View details for ' + escapeAttr(name) + '">ⓘ</button>' +
          (a.libraryId ? '<span class="asset-thumb-custom-badge">CUSTOM</span>' : "") +
          "</div>"
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
    // var olan ASSET_LIBRARY dizisi üzerinde substring eşleşmesi. Yeni bir
    // veri kaynağı/backend YOK.
    // ROUND H — ASSET BROWSER: kapsam genişletildi — artık sadece isim/
    // kategori değil, id (ör. "sunnyland_bee"), tag'ler ve (varsa) kit de
    // taranıyor, hepsi case-insensitive (query zaten toLowerCase — bkz.
    // input listener). "apple" hem isimde hem id'de, "fruit" ise sadece
    // tags'te geçebilir — ikisi de artık eşleşiyor.
    var query = assetSearchQuery;
    var libraryItems = !query
      ? ASSET_LIBRARY
      : ASSET_LIBRARY.filter(function (a) {
          var name = prettyAssetName(a.id).toLowerCase();
          var idLower = a.id.toLowerCase();
          var catLabel = (ASSET_CATEGORY_LABELS[a.category] || a.category).toLowerCase();
          var tagsLower = (a.tags || []).join(" ").toLowerCase();
          var kitLower = (a.kit || "").toLowerCase();
          return (
            name.indexOf(query) !== -1 ||
            idLower.indexOf(query) !== -1 ||
            catLabel.indexOf(query) !== -1 ||
            tagsLower.indexOf(query) !== -1 ||
            (kitLower && kitLower.indexOf(query) !== -1)
          );
        });

    // ROUND H — ASSET BROWSER: kategori filtresi ("all" -> hiçbir daraltma).
    // Sidebar/çip senkronu için tek doğruluk kaynağı olan assetCategoryFilter
    // burada uygulanıyor — arama filtresinin ÜSTÜNE, ikisi birlikte çalışır
    // (ör. "Enemies" seçiliyken "bee" aramak sadece Enemies içinde arar).
    if (assetCategoryFilter && assetCategoryFilter !== "all") {
      libraryItems = libraryItems.filter(function (a) { return a.category === assetCategoryFilter; });
    }

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

    // ROUND H — ASSET BROWSER: iki AYRI, dürüst boş-durum mesajı — "arama
    // sonucu yok" ile "bu kategoride hiç asset yok" farklı durumlar,
    // kullanıcıya farklı bir şey söylemeliler (görev md.13).
    if (!newCardHtml && !categoryCardsHtml) {
      var emptyMessage = query
        ? 'No assets match “' + escapeHtml((assetSearchInput && assetSearchInput.value) || "") + '”.'
        : "No assets in this category.";
      assetLibraryGrid.innerHTML = '<p class="asset-search-empty">' + emptyMessage + "</p>";
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
    // ROUND H: asset detay modalı açıkken (ör. modaldaki "Use in Game"
    // dışında bir yerden seçim değişirse) buton durumu senkron kalsın.
    refreshAssetDetailUseBtn();
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
      // ROUND H — ASSET BROWSER: "ⓘ" detay affordance'ı — asset SEÇİMİNİ
      // (aşağıdaki toggleAssetSelection dalı) TETİKLEMEZ, sadece detay
      // modalını açar. .asset-thumb'tan AYRI bir <button> olduğu için
      // (bkz. renderThumbs) bu kontrol diğerlerinden önce, ayrı olarak yapılır.
      var infoBtn = e.target.closest(".asset-thumb-info[data-asset-detail-id]");
      if (infoBtn) {
        openAssetDetailModal(infoBtn.getAttribute("data-asset-detail-id"));
        return;
      }
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

  // ================== ROUND H — ASSET BROWSER: Asset Detail modal ==================
  // Şu an detay modalında gösterilen assetin id'si — "Use in Game" butonuna
  // basıldığında hangi asseti (yeniden) seçeceğimizi/kaldıracağımızı bilmek
  // ve butonun etiketini/durumunu her seçim değişikliğinde tazelemek için.
  var assetDetailCurrentId = null;

  // "Kit" alanı: uydurma bir tekil "kit" değeri YOK — mevcut veri modelinde
  // custom library assetleri OPSİYONEL bir `kit` alanı taşıyabilir (bkz.
  // customAssetLibrary.js manifest.kit), default assetlerde ise bunun yerine
  // `compatibleGameTypes` dizisi var (bkz. assetManifest.js). Bu fonksiyon
  // GERÇEKTEN mevcut olanı gösterir, ikisi de boşsa dürüstçe "General
  // purpose" der — hiçbir alan icat edilmiyor (görev md.10).
  function assetDetailKitText(asset) {
    if (asset.kit) return prettyAssetName(asset.kit.replace(/-/g, "_"));
    if (asset.gameTypes && asset.gameTypes.length > 0) {
      return asset.gameTypes.map(function (gt) { return prettyAssetName(gt.replace(/-/g, "_")); }).join(", ");
    }
    return "General purpose (not tied to a specific kit)";
  }

  function assetDetailSourceText(asset) {
    return asset.libraryId ? "Custom Library — " + (asset.libraryName || asset.libraryId) : "Default Library";
  }

  function refreshAssetDetailUseBtn() {
    if (!assetDetailUseBtn || !assetDetailCurrentId) return;
    var asset = findAssetById(assetDetailCurrentId);
    if (!asset) return;
    var selected = isAssetSelected(asset);
    assetDetailUseBtn.setAttribute("aria-pressed", selected ? "true" : "false");
    assetDetailUseBtn.textContent = selected ? "✓ Selected for Generation" : "+ Use in Game";
  }

  // ÖNEMLİ (görev md.10 — "mevcut sistemin desteklemediği davranışı
  // uydurma"): bu buton YENİ bir mekanizma İCAT ETMİYOR. Mevcut,
  // Generate'e ZATEN bağlı olan toggleAssetSelection()/selectedAssets/
  // buildPromptWithAssets() zincirini (bkz. yukarısı) TETİKLİYOR — aynı
  // asset library thumb'ına tıklamakla BİREBİR aynı, gerçek etki. Bu yüzden
  // "Available for AI selection" gibi dürüst ama PASİF bir metin yerine
  // gerçek, işlevsel bir buton gösterilebiliyor — çünkü mekanizma GERÇEKTEN
  // var ve GERÇEKTEN prompta ekleniyor (en iyi çaba/"best effort" olduğu,
  // modelin bunu her zaman uygulayacağının garanti edilmediği not metninde
  // (#asset-detail-use-btn'in üstündeki .asset-detail-use-note) açıkça belirtiliyor).
  if (assetDetailUseBtn) {
    assetDetailUseBtn.addEventListener("click", function () {
      if (!assetDetailCurrentId) return;
      toggleAssetSelection(assetDetailCurrentId);
      refreshAssetDetailUseBtn();
    });
  }

  function openAssetDetailModal(assetId) {
    var asset = findAssetById(assetId);
    if (!asset || !assetDetailModalOverlay) return;
    assetDetailCurrentId = assetId;

    var name = asset.name || prettyAssetName(asset.id);
    if (assetDetailPreviewEl) {
      assetDetailPreviewEl.innerHTML = '<img src="' + escapeAttr(asset.path) + '" alt="' + escapeAttr(name) + '" />';
    }
    if (assetDetailNameEl) assetDetailNameEl.textContent = name;
    if (assetDetailCategoryEl) assetDetailCategoryEl.textContent = ASSET_CATEGORY_LABELS[asset.category] || asset.category;
    if (assetDetailTagsEl) assetDetailTagsEl.textContent = asset.tags && asset.tags.length > 0 ? asset.tags.join(", ") : "—";
    if (assetDetailKitEl) assetDetailKitEl.textContent = assetDetailKitText(asset);
    if (assetDetailSourceEl) {
      assetDetailSourceEl.textContent = assetDetailSourceText(asset);
      assetDetailSourceEl.classList.toggle("is-custom-source", !!asset.libraryId);
    }
    refreshAssetDetailUseBtn();

    assetDetailModalOverlay.classList.remove("hidden");
    if (assetDetailModalCloseBtn) assetDetailModalCloseBtn.focus();
  }

  function closeAssetDetailModal() {
    if (!assetDetailModalOverlay) return;
    assetDetailModalOverlay.classList.add("hidden");
    assetDetailCurrentId = null;
  }

  if (assetDetailModalCloseBtn) assetDetailModalCloseBtn.addEventListener("click", closeAssetDetailModal);
  if (assetDetailModalOverlay) {
    assetDetailModalOverlay.addEventListener("click", function (e) {
      if (e.target === assetDetailModalOverlay) closeAssetDetailModal();
    });
  }

  if (assetModalCloseBtn) assetModalCloseBtn.addEventListener("click", closeAssetModal);

  if (assetModalOverlay) {
    assetModalOverlay.addEventListener("click", function (e) {
      if (e.target === assetModalOverlay) closeAssetModal();
    });
  }

  if (assetModalGrid) {
    assetModalGrid.addEventListener("click", function (e) {
      // ROUND H — ASSET BROWSER: aynı "ⓘ" affordance'ı, "View All" popover'ı
      // İÇİNDE de çalışır (renderThumbs paylaşılan tek fonksiyon).
      var infoBtn = e.target.closest(".asset-thumb-info[data-asset-detail-id]");
      if (infoBtn) {
        openAssetDetailModal(infoBtn.getAttribute("data-asset-detail-id"));
        return;
      }
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
    if (e.key !== "Escape") return;
    if (assetModalOverlay && !assetModalOverlay.classList.contains("hidden")) {
      closeAssetModal();
    }
    // ROUND H — ASSET BROWSER: yeni asset detay modalı da Escape ile kapanır.
    if (assetDetailModalOverlay && !assetDetailModalOverlay.classList.contains("hidden")) {
      closeAssetDetailModal();
    }
    // ROUND J — QUALITY SCORE DETAILS: yeni modal da Escape ile kapanır.
    if (qualityDetailsModalOverlay && !qualityDetailsModalOverlay.classList.contains("hidden")) {
      closeQualityDetailsModal();
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

  // AI MODEL SELECTOR round — metin artık modeBadgeTextEl'e (mode-badge
  // içindeki alt span) yazılıyor ki modeBadge.textContent ataması dropdown
  // caret'ini SİLMESİN. modeBadge (buton) üzerindeki className atamaları
  // (badge/badge mock/badge live) BİREBİR ÖNCEKİ round'la aynı — sadece
  // görsel renk/duruma bakan CSS kuralları, dropdown/caret ayrı elemanlar
  // olduğu için etkilenmiyor. modeBadgeTextEl yoksa (beklenmedik durum)
  // modeBadge.textContent'e düşülür — hiçbir zaman sessizce hiçbir şey
  // göstermemek yerine güvenli bir fallback.
  function setModeBadgeText(text) {
    if (modeBadgeTextEl) {
      modeBadgeTextEl.textContent = text;
    } else {
      modeBadge.textContent = text;
    }
  }

  function setBadge(meta) {
    updateMockInfoCard(meta);
    if (mockPreviewRibbonEl) mockPreviewRibbonEl.classList.toggle("hidden", !(meta && meta.mock));
    if (!meta) {
      setModeBadgeText("…");
      modeBadge.className = "badge";
      return;
    }
    if (meta.mock) {
      setModeBadgeText("MOCK MODE");
      modeBadge.className = "badge mock";
    } else {
      setModeBadgeText("LIVE — " + getModelDisplayName(meta.model));
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
    // ROUND G (md.6): Generate ile Improve with AI arasında race condition
    // olmasın — Generate sürerken Improve butonu da devre dışı kalır
    // (Improve tarafı da simetrik olarak Generate'i devre dışı bırakıyor,
    // bkz. improveSubmitBtn click handler).
    if (improveToggleBtn) improveToggleBtn.disabled = true;
    setGenerateBtnLoading(true);
    startGenerationPipeline();
    setStatus(
      selectedCount > 0
        ? "Generating… (" + selectedCount + " asset" + (selectedCount > 1 ? "s" : "") + " selected)"
        : "Generating…"
    );

    try {
      // /api/generate contract'ı BÜYÜK ÖLÇÜDE aynı: { prompt } string'i.
      // AI MODEL SELECTOR round — SADECE opsiyonel bir `model` alanı eklendi
      // (görev md.3: "gereksiz kırmadan"). getSelectedModelId() henüz hiç
      // seçim yapılmadıysa/GET /api/models yüklenemediyse null döner ve bu
      // durumda `model` hiç gönderilmez (undefined -> JSON.stringify onu
      // atlar) — backend zaten böyle bir isteği kendi varsayılanına
      // (resolveRequestedModel) düşürür, davranış ÖNCEKİ round'la aynı kalır.
      // OPENROUTER MODEL CATALOG + BYOK round — EK OLARAK opsiyonel bir
      // `apiKey` alanı eklendi: getUserApiKey() kullanıcı bir key GİRMEDİYSE
      // null döner ve `apiKey` hiç gönderilmez — backend zaten böyle bir
      // isteği MEVCUT .env ENV key fallback'ine düşürür (görev md.9,
      // regresyon YOK).
      // PERSISTENT USER OPENROUTER API KEYS round — signed-in kullanıcının
      // hesabına kayıtlı bir key'i sunucunun kullanabilmesi için (bkz.
      // resolveEffectiveApiKey'in YENİ orta tier'ı), bu istek de ARTIK
      // (My Games istekleriyle AYNI desen) buildAuthHeaders() ile
      // Authorization: Bearer <token> ekliyor -- SADECE geçerli bir
      // Supabase oturumu VARSA (anonim kullanıcıda authHeaders {} olur,
      // davranış HİÇ değişmez). Bu header, İÇİNDE hiçbir API key
      // TAŞIMAZ -- sadece kullanıcının KİMLİĞİNİ doğrulamak için.
      var generateAuthHeaders = await buildAuthHeaders();
      var res = await fetch("/api/generate", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, generateAuthHeaders),
        body: JSON.stringify({
          prompt: finalPrompt,
          model: getSelectedModelId() || undefined,
          apiKey: getUserApiKey() || undefined,
        }),
      });

      var data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unknown error");
      }

      applyNewResult(data.html, data.validation, data.meta, finalPrompt);
      // ROUND I (md.3/md.16): Generate HER ZAMAN yeni bir Game record
      // oluşturur (sadece geçerliyse — bkz. saveGeneratedGameAsNew'in kendi
      // validation.valid koruması); Improve/Fix with AI'dan FARKLI olarak
      // mevcut bir kaydı GÜNCELLEMEZ. PERSISTENT MY GAMES round: signed-in
      // iken bu bir /api/games POST'u -- await ediliyor ki başarısız olursa
      // (Supabase geçici olarak erişilemezse) generation'ın KENDİSİ başarılı
      // olduğu hâlde My Games'e kaydedilemediği AYRICA/dürüstçe bildirilsin.
      var gameSaveResult = await saveGeneratedGameAsNew();

      if (data.validation.valid) {
        if (gameSaveResult.ok) {
          setStatus("Playable ad generated ✔ — Quality score " + data.validation.score + "/100", "success");
        } else {
          setStatus(
            "Playable ad generated ✔ — Quality score " + data.validation.score + "/100, but couldn't save to My Games: " + gameSaveResult.error,
            "error"
          );
        }
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
      // ROUND G (md.1/md.6): generate bittiğinde Improve butonu SADECE
      // gerçekten bir generated game varsa (lastResult) tekrar aktif olur —
      // generate başarısız olduysa (lastResult hâlâ null) disabled kalmaya
      // devam eder, mevcut "generated game yokken disabled" kuralı bozulmaz.
      if (improveToggleBtn) improveToggleBtn.disabled = !lastResult;
      setGenerateBtnLoading(false);
      finishGenerationPipeline();
    }
  }

  // ================== RESPONSIVE PREVIEW FIT (render-layer only) ==================
  // PROBLEM: bir üretilen oyun sabit/geniş piksel boyutlarıyla (örn. 900px
  // genişliğinde bir #game/canvas) yazılmışsa, bu HTML host'un dar/telefon
  // benzeri #preview-frame / #output-game-frame iframe'lerine (320×568
  // portre, hatta 260px genişliğe kadar inen "Game" sekmesi) OLDUĞU GİBİ
  // yüklendiğinde, iframe'in KENDİ iç viewport'u oyunun gerçek boyutundan
  // dar kalıyor ve yatay (bazen dikey) taşma/scrollbar oluşuyor — HUD,
  // kontrol ipucu ve oyun alanının bir kısmı görünmez hale geliyor.
  //
  // KAPSAM/KISIT: server/prompts/systemPrompt.js (generation talimatları),
  // server/services/validation/checks.js, asset sistemi, AI model config
  // VE üretilen oyunun kendi JS mantığı/coordinate system'i BURADA
  // DEĞİŞTİRİLMİYOR — hiçbiri bu değişikliğin kapsamında değil. Bunun
  // yerine SADECE bu dosyanın (host render katmanı) srcdoc'a yazdığı HTML
  // string'ine, iframe içinde ÇALIŞACAK, TAMAMEN AYRI ve saf bir CSS
  // transform tabanlı "fit-to-viewport" script'i ENJEKTE EDİLİYOR:
  //   - <body>'nin GERÇEK/doğal (natural) scrollWidth/scrollHeight'ı ölçülür,
  //   - bu, iframe'in gerçek window.innerWidth/innerHeight'ından BÜYÜKSE,
  //     <body>'ye `transform: scale(...)` (SADECE küçültme yönünde, asla
  //     büyütme — zaten sığan oyunlar hiç dokunulmadan kalır) uygulanır,
  //   - <body>'nin transform SONRASI kapladığı görünür alanla eşleşmesi
  //     için width/height de scaled değere set edilir (böylece altta boşluk
  //     kalmaz / scrollbar oluşmaz).
  // Bu SADECE görsel bir ölçekleme katmanıdır: CSS transform, tarayıcının
  // click/touch hit-testing'ini VE getBoundingClientRect()'i otomatik olarak
  // post-transform (görünen) koordinatlara göre hesaplar — bu yüzden mevcut
  // click/tap/keyboard etkileşimi, oyunun kendi iç JS koordinat sistemi
  // (örn. canvas piksel koordinatları) TAMAMEN BOZULMADAN çalışmaya devam
  // eder. `transform`, CSS spesifikasyonu gereği position:fixed/absolute
  // torunları için de yeni bir containing block oluşturduğundan HUD/kontrol
  // elementleri de doğru şekilde birlikte ölçeklenir.
  //
  // Bu enjeksiyon SADECE srcdoc'a yazılan (ekranda GÖSTERİLEN) kopyada
  // yapılır — `lastResult.html` (Copy Code / Download'ın kullandığı asıl
  // üretim) HİÇBİR ZAMAN değiştirilmez, bkz. applyNewResult/downloadBtn.
  var RESPONSIVE_FIT_SCRIPT =
    "\n<script>(function(){\n" +
    "  function __paFitToViewport(){\n" +
    "    try {\n" +
    "      var body = document.body, docEl = document.documentElement;\n" +
    "      if (!body) return;\n" +
    "      body.style.transform = 'none';\n" +
    "      body.style.width = '';\n" +
    "      body.style.height = '';\n" +
    "      void body.offsetWidth; /* reflow, olculerin sifirlanmis haliyle alinmasi icin */\n" +
    "      var naturalWidth = Math.max(body.scrollWidth, docEl.scrollWidth, 1);\n" +
    "      var naturalHeight = Math.max(body.scrollHeight, docEl.scrollHeight, 1);\n" +
    "      var vw = window.innerWidth || naturalWidth;\n" +
    "      var vh = window.innerHeight || naturalHeight;\n" +
    "      var scale = Math.min(vw / naturalWidth, vh / naturalHeight, 1);\n" +
    "      if (scale < 0.999) {\n" +
    "        body.style.transformOrigin = 'top left';\n" +
    "        body.style.transform = 'scale(' + scale + ')';\n" +
    "        body.style.width = naturalWidth + 'px';\n" +
    "        body.style.height = naturalHeight + 'px';\n" +
    "      }\n" +
    "      docEl.style.overflow = 'hidden';\n" +
    "    } catch (e) { /* asla uretilen oyunu bozacak sekilde patlamamali */ }\n" +
    "  }\n" +
    "  __paFitToViewport();\n" +
    "  window.addEventListener('load', __paFitToViewport);\n" +
    "  window.addEventListener('resize', __paFitToViewport);\n" +
    "  window.addEventListener('orientationchange', __paFitToViewport);\n" +
    "})();</" + "script>\n";

  function withResponsiveFitLayer(html) {
    if (!html) return html;
    // </body> hemen öncesine ekle — o ana kadar body içindeki tüm
    // element/script'ler zaten DOM'a girmiş olur, ölçüm doğru natural
    // boyutu yansıtır. </body> yoksa (beklenmedik/eksik HTML) en sona
    // ekle — hiçbir zaman throw etmez, en kötü ihtimalle hiçbir şey
    // değişmemiş gibi davranır.
    if (/<\/body\s*>/i.test(html)) {
      return html.replace(/<\/body\s*>/i, RESPONSIVE_FIT_SCRIPT + "</body>");
    }
    return html + RESPONSIVE_FIT_SCRIPT;
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
    // Gerçek üretim (lastResult.html / Copy / Download) DEĞİŞMİYOR —
    // sadece burada, GÖRÜNTÜLENEN kopyaya responsive-fit katmanı ekleniyor.
    previewFrame.srcdoc = withResponsiveFitLayer(html);
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
      // ROUND J: geçerli bir sonuç yokken (ör. current game silindi/reset
      // edildi) açık kalmış bir Quality Score Details modalı, artık hiçbir
      // gerçek veriye karşılık gelmeyen ESKİ bir görünüm göstermeye devam
      // etmesin diye kapatılır — uydurma/stale veri göstermek yerine.
      if (typeof closeQualityDetailsModal === "function") closeQualityDetailsModal();
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

    // ROUND J: Quality Score Details modalı AÇIKKEN yeni bir Generate/Fix
    // with AI/Improve with AI/Open Game applyNewResult() çağırırsa (hepsi bu
    // fonksiyona -> renderQualityCard'a AKAR), modal içeriği STALE kalmasın
    // diye otomatik yeniden render edilir (görev md.7/md.8: "must update
    // automatically after Generate / Improve"). Modal kapalıysa hiçbir şey
    // yapılmaz (gereksiz iş yok).
    if (isQualityDetailsModalOpen()) renderQualityDetailsModal();
  }

  // ================== ROUND J — QUALITY SCORE DETAILS ==================
  // SYSTEM REVIEW (görev md.1'in istediği inceleme, kod içinde belgelendi):
  // Skor ZATEN server/services/validation/score.js -> computeScore() içinde
  // TEK bir yerde hesaplanıyor (pass=1, warning=0.5, fail=0 puan; toplam
  // check sayısına bölünüp yüzdeleniyor) ve server/services/validation/
  // checks.js içindeki 28 GERÇEK, statik-analiz tabanlı kontrolün (her biri
  // key/name/critical/status/detail taşıyor, bkz. validate.js — ROUND M'de
  // "gameplay-config-valid" + 7 mekanik-özel check eklenmesiyle 20 -> 28
  // oldu) sonucundan üretiliyor. Bu round YENİ bir scoring sistemi KURMUYOR —
  // sadece ZATEN VAR OLAN validation.checks dizisini, sabit/deterministik
  // bir key -> kategori haritasıyla gruplayıp, her kategori için
  // score.js'teki AYNI pass/warning/fail formülünü (bkz.
  // computeCategoryScore) bir ALT KÜMEYE uygulayarak sunuyor. Check'lerin
  // HER BİRİ tam olarak bir kategoriye dahil edilmiştir (çift sayım veya
  // kayıp yok — bkz. gameLibrarySmoke.js
  // benzeri bir doğrulama yerine burada doğrudan kod incelemesiyle
  // garanti edildi). "WHAT'S WORKING" SADECE gerçekten "pass" olan check'ler
  // için sabit bir insan-okunur etiket kullanır (bilinmeyen bir key'de
  // check'in KENDİ GERÇEK `name` alanına düşer). "NEEDS ATTENTION" ise
  // server'ın zaten ürettiği validation.warnings dizisini AYNEN kullanır —
  // ikinci bir uyarı listesi İCAT EDİLMEZ. lastResult.validation, Game
  // Library record'larında da AYNEN saklanıyor (bkz. ROUND I
  // buildGameRecordFromResult) — bu yüzden bu modal hem canlı bir
  // generate/improve sonrası hem de My Games'ten açılan (openGameFromLibrary
  // -> applyNewResult) bir kayıt için AYNI, TEK kaynaktan (lastResult.
  // validation) besleniyor; ikinci/tutarsız bir skor kaynağı yok. Score
  // eşikleri (80/50) de YENİ icat edilmedi — üstteki mevcut scoreClass()
  // fonksiyonuyla BİREBİR aynı, zaten var olan eşikler.

  var QUALITY_CATEGORY_DEFS = [
    {
      key: "gameplay",
      label: "Gameplay",
      checkKeys: [
        "interactive", "win-condition", "lose-condition", "can-end", "cta",
        "platformer-gameplay-consistency", "movement-input-consistency",
        // ROUND M — additive: self-report config sinyali + mekanik-özel
        // gerçek-sinyal check'leri (hepsi mevcut mekanik gruba katıldı,
        // yeni bir kategori icat edilmedi).
        "gameplay-config-valid",
        "racing-gameplay-consistency", "space-shooter-gameplay-consistency",
        "collection-gameplay-consistency", "memory-gameplay-consistency",
        "math-gameplay-consistency", "cooking-gameplay-consistency",
        "dungeon-gameplay-consistency",
      ],
      allPassText: "Core interaction and game flow (win / lose / end) checks passed.",
    },
    {
      key: "technical",
      label: "Technical Reliability",
      checkKeys: [
        "valid-html", "has-js", "js-syntax-valid", "no-storage",
        "no-external-resources", "resource-size", "no-infinite-loop",
      ],
      allPassText: "No critical validation failures detected.",
    },
    {
      key: "prompt-fulfillment",
      label: "Prompt Fulfillment",
      checkKeys: ["prompt-alignment", "duration", "level-length-consistency"],
      allPassText: "Generated output matches the key elements requested in your prompt.",
    },
    {
      key: "responsiveness",
      label: "Responsiveness",
      checkKeys: ["mobile-ready"],
      allPassText: "Mobile-ready (responsive viewport) layout detected.",
    },
    {
      key: "asset-usage",
      label: "Asset Usage",
      checkKeys: ["asset-paths-valid", "asset-integrity"],
      allPassText: "All referenced assets are valid and accounted for.",
    },
  ];

  var QUALITY_PASS_LABELS = {
    "valid-html": "Playable output generated",
    "has-js": "Game logic (JavaScript) present",
    "js-syntax-valid": "No JavaScript syntax errors",
    "interactive": "Core interaction detected (click / tap)",
    "win-condition": "Win condition implemented",
    "lose-condition": "Lose / game-over condition implemented",
    "can-end": "Game has a clear end state",
    "prompt-alignment": "Matches key elements from your prompt",
    "mobile-ready": "Responsive layout (mobile-ready)",
    "no-infinite-loop": "No infinite loop risk detected",
    "cta": "Call-to-action present",
    "duration": "Matches requested duration",
    "no-storage": "No browser storage used",
    "no-external-resources": "No external resource requests",
    "asset-paths-valid": "All asset references are valid",
    "asset-integrity": "Asset files verified on disk",
    "resource-size": "Output size within expected range",
    "platformer-gameplay-consistency": "Platformer gameplay is consistent / reachable",
    "level-length-consistency": "Level length matches your prompt",
    "movement-input-consistency": "Movement controls match your prompt",
    "gameplay-config-valid": "Gameplay self-report data is well-formed",
    "racing-gameplay-consistency": "Racing controls / obstacles match your prompt",
    "space-shooter-gameplay-consistency": "Shooting / enemy mechanics match your prompt",
    "collection-gameplay-consistency": "Collection mechanics match your prompt",
    "memory-gameplay-consistency": "Memory-matching mechanics match your prompt",
    "math-gameplay-consistency": "Math quiz mechanics match your prompt",
    "cooking-gameplay-consistency": "Cooking sequence mechanics match your prompt",
    "dungeon-gameplay-consistency": "Key / door / exit mechanics match your prompt",
  };

  // score.js -> computeScore() ile BİREBİR AYNI formül; ikinci bir puanlama
  // sistemi DEĞİL, aynı formülün bir alt kümeye (kategori) uygulanması.
  function computeCategoryScore(checks) {
    if (!checks || checks.length === 0) return null;
    var total = 0;
    checks.forEach(function (c) {
      if (c.status === "pass") total += 1;
      else if (c.status === "warning") total += 0.5;
    });
    return Math.round((total / checks.length) * 100);
  }

  function buildQualityCategories(validation) {
    if (!validation || !Array.isArray(validation.checks)) return [];
    var byKey = {};
    validation.checks.forEach(function (c) { byKey[c.key] = c; });

    return QUALITY_CATEGORY_DEFS.map(function (def) {
      var checks = def.checkKeys.map(function (k) { return byKey[k]; }).filter(Boolean);
      // md.3: bu sonuçta bu kategoriye ait HİÇBİR gerçek check verisi yoksa
      // (teorik olarak — şu an her kategori en az bir check'e karşılık
      // geliyor), kategori UYDURULMAZ, sessizce atlanır.
      if (checks.length === 0) return null;
      var failing = checks.filter(function (c) { return c.status !== "pass"; });
      var explanation = failing.length === 0
        ? def.allPassText
        : (checks.length - failing.length) + "/" + checks.length + " checks passed. Needs attention: " +
          failing.map(function (c) { return c.name; }).join(", ") + ".";
      return {
        key: def.key,
        label: def.label,
        score: computeCategoryScore(checks),
        checks: checks,
        explanation: explanation,
      };
    }).filter(Boolean);
  }

  function buildQualityPositiveSignals(validation) {
    if (!validation || !Array.isArray(validation.checks)) return [];
    return validation.checks
      .filter(function (c) { return c.status === "pass"; })
      .map(function (c) { return QUALITY_PASS_LABELS[c.key] || c.name; });
  }

  // validation.warnings server tarafında (validate.js) HER pass-olmayan
  // check için zaten "İsim: detay" formatında üretiliyor — burada ikinci bir
  // uyarı listesi İCAT EDİLMİYOR, aynen kullanılıyor.
  function buildQualityWarnings(validation) {
    if (!validation || !Array.isArray(validation.warnings)) return [];
    return validation.warnings;
  }

  function isQualityDetailsModalOpen() {
    return !!(qualityDetailsModalOverlay && !qualityDetailsModalOverlay.classList.contains("hidden"));
  }

  function renderQualityDetailsModal() {
    if (!qualityDetailsBodyEl || !lastResult || !lastResult.validation) return;
    var validation = lastResult.validation;
    var categories = buildQualityCategories(validation);
    var positives = buildQualityPositiveSignals(validation);
    var warnings = buildQualityWarnings(validation);

    if (qualityDetailsModalSubtitleEl) {
      qualityDetailsModalSubtitleEl.textContent =
        validation.score + " / 100 · " + (validation.valid ? "Passed critical checks" : "Some critical checks failed");
      qualityDetailsModalSubtitleEl.className = "my-games-modal-subtitle " + scoreClass(validation.score);
    }

    var categoriesHtml = categories.length
      ? categories
          .map(function (cat) {
            var barClass = cat.score == null ? "" : scoreClass(cat.score);
            return (
              '<div class="quality-category-row">' +
              '<div class="quality-category-header">' +
              '<span class="quality-category-name">' + escapeHtml(cat.label) + "</span>" +
              '<span class="quality-category-score ' + barClass + '">' + (cat.score == null ? "—" : cat.score) + "/100</span>" +
              "</div>" +
              '<div class="quality-category-bar-track"><div class="quality-category-bar-fill ' + barClass +
              '" style="width:' + (cat.score == null ? 0 : cat.score) + '%"></div></div>' +
              '<p class="quality-category-explanation">' + escapeHtml(cat.explanation) + "</p>" +
              "</div>"
            );
          })
          .join("")
      : '<p class="quality-details-empty">No category breakdown available for this result.</p>';

    var positivesHtml = positives.length
      ? '<ul class="quality-signal-list">' +
        positives.map(function (p) { return '<li class="quality-signal-item positive">✓ ' + escapeHtml(p) + "</li>"; }).join("") +
        "</ul>"
      : "";

    var warningsHtml = warnings.length
      ? '<ul class="quality-signal-list">' +
        warnings.map(function (w) { return '<li class="quality-signal-item warning">! ' + escapeHtml(w) + "</li>"; }).join("") +
        "</ul>"
      : '<p class="quality-signal-item positive">✓ No major issues detected</p>';

    qualityDetailsBodyEl.innerHTML =
      '<div class="quality-details-section">' +
      '<div class="quality-details-section-title">Category Breakdown</div>' +
      categoriesHtml +
      "</div>" +
      (positives.length
        ? '<div class="quality-details-section"><div class="quality-details-section-title">What’s Working</div>' + positivesHtml + "</div>"
        : "") +
      '<div class="quality-details-section">' +
      '<div class="quality-details-section-title">Needs Attention</div>' +
      warningsHtml +
      "</div>";
  }

  function openQualityDetailsModal() {
    if (!qualityDetailsModalOverlay || !lastResult || !lastResult.validation) return;
    renderQualityDetailsModal();
    qualityDetailsModalOverlay.classList.remove("hidden");
    if (qualityDetailsModalCloseBtn) qualityDetailsModalCloseBtn.focus();
  }

  function closeQualityDetailsModal() {
    if (qualityDetailsModalOverlay) qualityDetailsModalOverlay.classList.add("hidden");
  }

  // "Details" butonu (mevcut buton/ID — bkz. index.html) artık eski inline
  // pill-listesini (qualityChecksEl) AÇIP KAPAMIYOR — bunun yerine
  // kategorilere ayrılmış, gerçek validation verisinden üretilen "Quality
  // Score Details" modalını açıyor (görev md.2/md.3). qualityChecksEl HALA
  // (değişmeden, yukarıdaki renderQualityCard içinde) hesaplanıyor — sadece
  // artık kullanıcıya bu buton üzerinden gösterilmiyor; hiçbir veri kaybı
  // veya regresyon yok, sadece etkileşim daha zengin bir deneyime yönlendi.
  if (qualityDetailsToggleEl) {
    qualityDetailsToggleEl.addEventListener("click", openQualityDetailsModal);
  }
  if (qualityDetailsModalCloseBtn) qualityDetailsModalCloseBtn.addEventListener("click", closeQualityDetailsModal);
  if (qualityDetailsModalOverlay) {
    qualityDetailsModalOverlay.addEventListener("click", function (e) {
      if (e.target === qualityDetailsModalOverlay) closeQualityDetailsModal();
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
      // PRODUCTION BYOK SECURITY FIX — autofix, generate/improve İLE AYNI
      // BYOK deseni: getUserApiKey() kullanıcı bir key GİRMEDİYSE null
      // döner ve `apiKey` hiç gönderilmez (backend bu durumda mevcut mock
      // fallback davranışına düşer). Key SADECE bellekte tutulan
      // getUserApiKey()'den okunur — hiçbir yeni saklama eklenmedi.
      // PERSISTENT USER OPENROUTER API KEYS round — generate() İLE AYNI
      // gerekçe/desen (bkz. o fetch çağrısındaki yorum).
      var autofixAuthHeaders = await buildAuthHeaders();
      var res = await fetch("/api/autofix", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, autofixAuthHeaders),
        body: JSON.stringify({
          html: lastResult.html,
          prompt: lastResult.prompt,
          checks: lastResult.validation.checks,
          apiKey: getUserApiKey() || undefined,
        }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");

      if (data.applied) {
        applyNewResult(data.html, data.validation, lastResult.meta, lastResult.prompt);
        // ROUND I: Fix with AI da (Improve gibi) MEVCUT oyunu günceller,
        // yeni bir kopya oluşturmaz — syncCurrentGameAfterFixOrImprove
        // kendi içinde validation.valid === true kontrolünü yapıyor, bu
        // yüzden hâlâ geçersiz bir fix denemesi Library'yi ETKİLEMİYOR.
        // PERSISTENT MY GAMES round: signed-in iken bu bir /api/games PUT'u.
        var gameSyncResult = await syncCurrentGameAfterFixOrImprove();
        if (gameSyncResult.ok) {
          setStatus("Fix with AI applied ✔ — new score " + data.validation.score + "/100", "success");
        } else {
          setStatus(
            "Fix with AI applied ✔ — new score " + data.validation.score + "/100, but couldn't update My Games: " + gameSyncResult.error,
            "error"
          );
        }
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

  // ================== ROUND G: Improve with AI ==================
  // Eski (Phase 4) "chip + textarea + Apply" inline paneli tamamen bir
  // modale dönüştürüldü (bkz. index.html). Mimari değişmedi: HÂLÂ
  // POST /api/improve -> refinePlayableAd -> validatePlayable akışı (bkz.
  // server/routes/improve.js) — burada YENİ bir generation pipeline'ı
  // YAZILMIYOR, sadece isteğin gövdesi zenginleşti (seçili improvement
  // seçenekleri + custom metin + mevcut oyunun meta context'i + Generate
  // ile AYNI model/apiKey) ve sonuç UYGULANMADAN ÖNCE validation.valid
  // kontrol ediliyor (md.9/md.10: "invalid ise mevcut oyun korunmalı").
  var isImproving = false;

  function getSelectedImprovementKeys() {
    if (!improveOptionsEl) return [];
    var pressed = improveOptionsEl.querySelectorAll('.improve-option[aria-pressed="true"]');
    return Array.prototype.map.call(pressed, function (btn) {
      return btn.getAttribute("data-improve-key");
    });
  }

  function resetImproveModalSelection() {
    if (improveOptionsEl) {
      var opts = improveOptionsEl.querySelectorAll(".improve-option");
      Array.prototype.forEach.call(opts, function (btn) {
        btn.setAttribute("aria-pressed", "false");
      });
    }
    if (improveCustomInputEl) improveCustomInputEl.value = "";
    setImproveModalStatus("", "");
  }

  function setImproveModalStatus(text, kind) {
    if (!improveModalStatusEl) return;
    improveModalStatusEl.textContent = text || "";
    improveModalStatusEl.className = "improve-modal-status" + (kind ? " " + kind : "");
  }

  function isImproveModalOpen() {
    return !!improveModalBackdropEl && !improveModalBackdropEl.classList.contains("hidden");
  }

  function openImproveModal() {
    if (!improveModalBackdropEl || !lastResult) return;
    // md.6: Generate çalışırken Improve modalı açılamaz (buton zaten
    // disabled olur — bkz. generate()'in başı/sonu — bu sadece ek bir
    // güvenlik katmanı).
    if (generateBtn && generateBtn.disabled) return;
    resetImproveModalSelection();
    improveModalBackdropEl.classList.remove("hidden");
    improveToggleBtn.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", handleImproveModalKeydown);
    if (improveOptionsEl) {
      var firstOption = improveOptionsEl.querySelector(".improve-option");
      if (firstOption) firstOption.focus();
    }
  }

  function closeImproveModal() {
    if (!improveModalBackdropEl) return;
    // md.6: yükleme sırasında (isImproving) kapatma engellenir — kullanıcı
    // devam eden isteği "kaybetmiş" hissetmesin, sonucu görsün.
    if (isImproving) return;
    improveModalBackdropEl.classList.add("hidden");
    improveToggleBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", handleImproveModalKeydown);
  }

  function handleImproveModalKeydown(e) {
    if (e.key === "Escape") closeImproveModal();
  }

  if (improveToggleBtn) {
    improveToggleBtn.setAttribute("aria-expanded", "false");
    improveToggleBtn.addEventListener("click", function () {
      if (isImproveModalOpen()) {
        closeImproveModal();
      } else {
        openImproveModal();
      }
    });
  }

  if (improveModalCloseBtnEl) improveModalCloseBtnEl.addEventListener("click", closeImproveModal);
  if (improveCancelBtnEl) improveCancelBtnEl.addEventListener("click", closeImproveModal);
  if (improveModalBackdropEl) {
    improveModalBackdropEl.addEventListener("click", function (e) {
      if (e.target === improveModalBackdropEl) closeImproveModal();
    });
  }

  if (improveOptionsEl) {
    improveOptionsEl.addEventListener("click", function (e) {
      var optionBtn = e.target.closest ? e.target.closest(".improve-option") : null;
      if (!optionBtn) return;
      var isPressed = optionBtn.getAttribute("aria-pressed") === "true";
      optionBtn.setAttribute("aria-pressed", isPressed ? "false" : "true");
    });
  }

  if (improveSubmitBtn) {
    improveSubmitBtn.addEventListener("click", async function () {
      // md.6: aynı anda ikinci bir improve isteği gönderilemez.
      if (!lastResult || isImproving) return;

      var selectedKeys = getSelectedImprovementKeys();
      var customText = improveCustomInputEl ? improveCustomInputEl.value.trim() : "";

      if (selectedKeys.length === 0 && !customText) {
        setImproveModalStatus("Select an improvement option or describe one.", "error");
        return;
      }

      isImproving = true;
      improveSubmitBtn.disabled = true;
      if (improveCancelBtnEl) improveCancelBtnEl.disabled = true;
      if (improveModalCloseBtnEl) improveModalCloseBtnEl.disabled = true;
      var previousSubmitLabel = improveSubmitBtn.textContent;
      improveSubmitBtn.textContent = "Improving…";
      setImproveModalStatus("AI is refining your game…", "");

      // md.6: Generate ile Improve arasında race condition olmasın — Improve
      // sürerken Generate butonu da devre dışı kalır (generate()'in kendisi
      // de simetrik olarak Improve butonunu devre dışı bırakıyor, bkz. aşağı).
      if (generateBtn) generateBtn.disabled = true;

      try {
        // md.5: Generate ile AYNI model-selection sistemi — ayrı bir model
        // state YOK, getSelectedModelId()/getUserApiKey() Generate'in
        // KULLANDIĞI AYNI fonksiyonlar (bkz. yukarıdaki generate()).
        // PERSISTENT USER OPENROUTER API KEYS round — generate() İLE AYNI
        // gerekçe/desen (bkz. o fetch çağrısındaki yorum).
        var improveAuthHeaders = await buildAuthHeaders();
        var res = await fetch("/api/improve", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, improveAuthHeaders),
          body: JSON.stringify({
            html: lastResult.html,
            prompt: lastResult.prompt,
            meta: lastResult.meta,
            improvements: selectedKeys,
            customText: customText || undefined,
            model: getSelectedModelId() || undefined,
            apiKey: getUserApiKey() || undefined,
          }),
        });
        var data = await res.json();
        if (!res.ok) {
          // md.8: teknik hata detayları (OpenRouter/status kodu vb.)
          // kullanıcıya GÖSTERİLMEZ — mevcut oyun asla dokunulmadı.
          setImproveModalStatus("Could not improve the game. Your current version is still available.", "error");
          return;
        }

        if (!data.applied) {
          // Mock mode: gerçek bir AI çağrısı yapılmadı (ENV/BYOK key yok).
          // Mevcut oyun zaten hiç değişmedi (server aynı html'i geri döner).
          setImproveModalStatus(data.message, "");
          return;
        }

        // md.10 (Quality Guard): improve edilmiş çıktı da AYNI validation
        // pipeline'ından geçti (bkz. routes/improve.js -> validatePlayable).
        // Kritik bir kontrol fail verdiyse (validation.valid === false),
        // mevcut çalışan oyun KORUNUR — applyNewResult'a HİÇ girilmez, bu
        // yüzden lastResult/preview olduğu gibi kalır (md.9).
        if (!data.validation || data.validation.valid === false) {
          setImproveModalStatus("Could not improve the game. Your current version is still available.", "error");
          return;
        }

        // Başarılı newVersion -> currentVersion (md.9): SADECE burada,
        // geçerliliği doğrulanmış yeni sonuç mevcut oyunun yerini alıyor.
        // gameType/assetKit/pipeline/gameSpec gibi (improve'un değiştirmediği)
        // alanlar ÖNCEKİ meta'dan KORUNUYOR — sadece mock/model bu improve
        // çağrısının GERÇEK sonucunu yansıtacak şekilde güncelleniyor.
        var updatedMeta = Object.assign({}, lastResult.meta, {
          mock: data.mock,
          model: data.model || (lastResult.meta && lastResult.meta.model) || null,
        });
        applyNewResult(data.html, data.validation, updatedMeta, lastResult.prompt);
        // ROUND I (md.16/md.19/md.20): Improve MEVCUT current game'i
        // günceller (Game A -> Game A), yeni bir Game B OLUŞTURMAZ.
        // PERSISTENT MY GAMES round: signed-in iken bu bir /api/games PUT'u.
        var improveGameSyncResult = await syncCurrentGameAfterFixOrImprove();
        if (improveGameSyncResult.ok) {
          setImproveModalStatus("Improved ✔ — new score " + data.validation.score + "/100", "success");
        } else {
          setImproveModalStatus(
            "Improved ✔ — new score " + data.validation.score + "/100, but couldn't update My Games: " + improveGameSyncResult.error,
            "error"
          );
        }
        window.setTimeout(closeImproveModal, 700);
      } catch (err) {
        // md.8: network/parse hatalarında da aynı, teknik olmayan mesaj —
        // mevcut oyun dokunulmadan kalır.
        setImproveModalStatus("Could not improve the game. Your current version is still available.", "error");
      } finally {
        isImproving = false;
        improveSubmitBtn.disabled = false;
        improveSubmitBtn.textContent = previousSubmitLabel;
        if (improveCancelBtnEl) improveCancelBtnEl.disabled = false;
        if (improveModalCloseBtnEl) improveModalCloseBtnEl.disabled = false;
        // Generate hâlâ kendi çalışması sürüyorsa (teorik olarak imkânsız —
        // ikisi karşılıklı olarak birbirini engelliyor) onu ezmemek için
        // sadece lastResult VARSA geri açılır; generate()'in kendi finally'si
        // zaten kendi durumunu ayrıca yönetiyor.
        if (generateBtn) generateBtn.disabled = false;
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
    // Bkz. renderPreview/withResponsiveFitLayer — "Game" sekmesi AYNI
    // lastResult.html'i gösterir (yeni veri kaynağı değil), bu yüzden AYNI
    // görüntüleme-katmanı fix'ini alması gerekiyor (bu iframe portre modda
    // #preview-frame'den bile daha dar — max-width 260px). lastResult.html
    // kendisi burada da DEĞİŞMİYOR, sadece srcdoc'a yazılan kopya sarılıyor.
    outputGameFrame.srcdoc = withResponsiveFitLayer(lastResult.html);
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
    // ROUND H: "All Assets" sayısı — mevcut per-category sayaçlarla AYNI
    // dinamik kaynaktan (ASSET_LIBRARY.length), hardcode değil.
    var allEl = document.getElementById("sidebar-count-all");
    if (allEl) allEl.textContent = String(ASSET_LIBRARY.length);
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

    // ROUND H — SIDEBAR: her tıklanabilir (disabled olmayan) sidebar linki
    // artık tıklanınca "active" durumuna geçiyor (görev md.2 "clear active
    // page indication") — hepsi aynı sayfa içi anchor'lar, gerçek bir router
    // YOK, bu yüzden en dürüst/basit yaklaşım budur. Asset kategori linkleri
    // (data-sidebar-asset-link) EK olarak Asset Browser'ın filtresini de
    // senkron ediyor (bkz. setAssetCategoryFilter) — bidirectional sync
    // için tek giriş noktası.
    if (sidebarNavEl) {
      sidebarNavEl.addEventListener("click", function (e) {
        var link = e.target.closest(".sidebar-link");
        if (!link || link.getAttribute("aria-disabled") === "true") return;
        // ROUND I: "My Games" bir sayfa/panele DEĞİL, geçici bir modale
        // açılıyor — "şu an oradasınız" gibi kalıcı bir active durumu YANLIŞ
        // olur (modal kapanınca kullanıcı hâlâ Generator'da). Bu yüzden
        // navigasyon active-state mantığından BİLEREK hariç tutuluyor;
        // kendi click handler'ı (openMyGamesModal) zaten ayrıca bağlı.
        if (link.id === "sidebar-my-games-btn") return;

        var allLinks = sidebarNavEl.querySelectorAll(".sidebar-link");
        for (var i = 0; i < allLinks.length; i++) allLinks[i].classList.remove("active");
        link.classList.add("active");

        var assetCat = link.getAttribute("data-sidebar-asset-link");
        if (assetCat) setAssetCategoryFilter(assetCat, { fromSidebar: true });

        if (assetCat && window.matchMedia && window.matchMedia("(max-width: 980px)").matches) {
          setCollapsed(true);
        }
      });
    }
  }

  // ROUND H — ASSET BROWSER: sidebar kategori linkleri VE #asset-filter-chips
  // arasındaki tek, paylaşılan senkron noktası. `opts.fromSidebar` sadece
  // hangi taraftan geldiğini belirtir (şu an ikisi de aynı işi yapıyor, ama
  // gelecekte ayrışması gerekirse diye bırakıldı) — asıl iş: state'i
  // güncelle, çiplerin aria-pressed'ini eşitle, sidebar'daki asset linklerinin
  // active durumunu eşitle, grid'i yeniden çiz.
  function setAssetCategoryFilter(cat, opts) {
    assetCategoryFilter = cat;

    if (assetFilterChipsEl) {
      var chips = assetFilterChipsEl.querySelectorAll(".asset-filter-chip");
      for (var i = 0; i < chips.length; i++) {
        chips[i].setAttribute("aria-pressed", chips[i].getAttribute("data-asset-filter") === cat ? "true" : "false");
      }
    }

    var assetLinks = document.querySelectorAll(".sidebar-link[data-sidebar-asset-link]");
    for (var j = 0; j < assetLinks.length; j++) {
      var isMatch = assetLinks[j].getAttribute("data-sidebar-asset-link") === cat;
      assetLinks[j].classList.toggle("active", isMatch);
      // Bu grup dışındaki (Generator/Game Library/My Game/Code) linklerin
      // active durumunu SADECE sidebar'dan gelen tıklamalarda (yukarıdaki
      // genel handler zaten hallediyor) etkile — çipten gelen bir değişiklik
      // sidebar'ın Generator/Game Library gibi diğer linklerine dokunmasın.
    }
    if (!opts || !opts.fromSidebar) {
      // Çipten tetiklendiyse: karşılık gelen asset linkini active yap, diğer
      // (asset-olmayan) sidebar linklerini pasifleştir — tutarlı tek-aktif-
      // link davranışı için.
      var allLinks = document.querySelectorAll(".sidebar-link");
      for (var k = 0; k < allLinks.length; k++) {
        if (!allLinks[k].hasAttribute("data-sidebar-asset-link")) allLinks[k].classList.remove("active");
      }
    }

    renderAssetLibrary();
  }

  if (assetFilterChipsEl) {
    assetFilterChipsEl.addEventListener("click", function (e) {
      var chip = e.target.closest(".asset-filter-chip[data-asset-filter]");
      if (!chip) return;
      setAssetCategoryFilter(chip.getAttribute("data-asset-filter"));
    });
  }

  // ================== ROUND I — GAME LIBRARY ==================
  // SYSTEM REVIEW (görev md.1'in istediği inceleme, kod içinde belgelendi):
  // Üretilen oyun şu anda SADECE `lastResult` (bu dosyanın üst kısmında,
  // module-scope bir JS değişkeni — { html, cssExcerpt, jsExcerpt,
  // validation, meta, prompt }) içinde, sayfa hayatı boyunca bellekte
  // tutuluyor; sayfa yenilenince (refresh) TAMAMEN kaybolur. Kalıcı
  // (persistent) HİÇBİR mekanizma yoktu — `window.localStorage` sadece
  // MODEL_STORAGE_KEY (seçili model id'si, birkaç byte) için kullanılıyordu.
  // Bu round için: yeni bir database/Supabase/IndexedDB KURULMADI — mevcut,
  // zaten kullanılan localStorage mekanizması, bu sefer TAM game record'ları
  // saklamak için genişletildi. Bu, sayfa yenilendiğinde de (tarayıcı
  // sekmesi kapatılıp açılsa bile) oyunların kaybolmaması için YETERLİ ve
  // en küçük değişiklik: yeni bir backend endpoint'i, yeni bir npm paketi
  // veya yeni bir sunucu-taraflı persistence katmanı GEREKMEDİ.
  //
  // Game record şekli (md.2) — meta/validation zaten var olan, ZENGİN
  // objeler olduğu için AYNEN saklanıyor (kopya/uydurma alan YOK); title/
  // gameType/model/qualityScore SADECE bunlardan türetilen, ucuz arama/
  // sıralama/kart-render için önbelleğe alınmış kısayollar:
  // { id, title, titleIsCustom, prompt, html, meta, validation,
  //   gameType, model, qualityScore, createdAt, updatedAt }

  // ---------------------------------------------------------------------
  // PERSISTENT MY GAMES round — kalıcılık soyutlaması.
  //
  // Yukarıdaki "yeni bir backend GEREKMEDİ" notu artık SADECE anonim
  // kullanıcılar için geçerli. Signed-in bir kullanıcı için tek doğruluk
  // kaynağı ARTIK Supabase `games` tablosu (server/routes/games.js ->
  // server/services/gamePersistence.js, RLS auth.uid()=user_id ile
  // korunuyor) — localStorage SADECE anonim kullanıcılar için hâlâ
  // kullanılıyor (görev: "Keep the existing localStorage Game Library
  // behavior exactly as it currently works" signed-out için).
  //
  // Bu bölümün ALTINDAKİ tüm fonksiyonlar (buildGameRecordFromResult,
  // deriveGameTitle/Type/Model vb.) HİÇ DEĞİŞMEDİ — "game record" şeklini
  // hesaplama mantığı AYNI kaldı, SADECE onu NEREYE yazdığımız/NEREDEN
  // okuduğumuz (localStorage vs. /api/games) bu katmanda dallanıyor.
  //
  // isGameLibraryRemote() TEK karar noktası: getCurrentUser() (initAuth'un
  // yönettiği, Supabase'in kendi doğrulanmış oturum state'i) — bu, "TEK bir
  // doğruluk kaynağı" gereksinimini karşılıyor (auth state DEĞİŞTİĞİNDE
  // refreshGameLibrary() çağrılır, bkz. initAuth).
  // ---------------------------------------------------------------------
  function isGameLibraryRemote() {
    return !!getCurrentUser();
  }

  var GAMES_API_BASE = "/api/games";

  // GÜVENLİK (görev md.2/md.7/md. Do NOT add a userId field): Authorization
  // header'ı SADECE mevcut auth helper'ı (buildAuthHeaders -> getAccessToken)
  // üzerinden eklenir — hiçbir fetch çağrısına ASLA bir userId alanı
  // EKLENMEZ, kimlik SADECE server'ın kendi doğruladığı token'dan gelir.
  function gamesApiFetch(path, options) {
    return buildAuthHeaders().then(function (authHeaders) {
      var headers = Object.assign({ "Content-Type": "application/json" }, authHeaders, (options && options.headers) || {});
      return fetch(GAMES_API_BASE + path, Object.assign({}, options, { headers: headers }));
    });
  }

  async function readJsonSafely(res) {
    try {
      return await res.json();
    } catch (err) {
      return null;
    }
  }

  // Frontend game record -> /api/games POST/PUT body. SADECE bilinen
  // alanlar gönderilir -- id/createdAt/updatedAt ASLA gönderilmez (bunlar
  // server/DB tarafından atanır, bkz. görev "ID HANDLING": "Use the
  // Supabase UUID as the persistent game ID").
  function recordToPayload(record) {
    return {
      title: record.title,
      titleIsCustom: !!record.titleIsCustom,
      prompt: record.prompt,
      html: record.html,
      meta: record.meta,
      validation: record.validation,
      gameType: record.gameType,
      model: record.model,
      qualityScore: record.qualityScore,
    };
  }

  async function remoteListGames() {
    var res = await gamesApiFetch("", { method: "GET" });
    var data = await readJsonSafely(res);
    if (!res.ok) throw new Error((data && data.error) || "Could not load your games.");
    return (data && Array.isArray(data.games)) ? data.games : [];
  }

  async function remoteCreateGame(record) {
    var res = await gamesApiFetch("", { method: "POST", body: JSON.stringify(recordToPayload(record)) });
    var data = await readJsonSafely(res);
    if (!res.ok) throw new Error((data && data.error) || "Could not save this game.");
    return data.game;
  }

  // payload burada BİLEREK "kısmi" olabilir (ör. sadece {title,
  // titleIsCustom} -- Rename) -- server tarafı (gamePersistence.updateGame)
  // sadece VERİLEN alanları uygular, geri kalanı (meta/validation gibi)
  // MEVCUT satırdan korur.
  async function remoteUpdateGame(id, payload) {
    var res = await gamesApiFetch("/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(payload) });
    var data = await readJsonSafely(res);
    if (!res.ok) throw new Error((data && data.error) || "Could not update this game.");
    return data.game;
  }

  async function remoteDeleteGame(id) {
    var res = await gamesApiFetch("/" + encodeURIComponent(id), { method: "DELETE" });
    if (res.status === 204 || res.ok) return true;
    var data = await readJsonSafely(res);
    throw new Error((data && data.error) || "Could not delete this game.");
  }

  async function remoteDuplicateGame(id) {
    var res = await gamesApiFetch("/" + encodeURIComponent(id) + "/duplicate", { method: "POST" });
    var data = await readJsonSafely(res);
    if (!res.ok) throw new Error((data && data.error) || "Could not duplicate this game.");
    return data.game;
  }

  // Sadece anonim/local moddaki OKUMA -- mevcut loadGameLibrary()'nin
  // ESKİ (Phase öncesi) gövdesiyle BİREBİR aynı, sadece bir dönüş değeri
  // eklendi ki refreshGameLibrary() de kullanabilsin.
  function loadGameLibraryLocal() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(GAME_LIBRARY_STORAGE_KEY) : null;
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      // Bozuk/eski-şekilli bir kayıt VARSA sessizce boş başla — asla çökme.
      return [];
    }
  }

  // md. SYNC BEHAVIOR: initAuth() ilk auth durumunu belirlediğinde VE her
  // onAuthStateChange olayında (sign in/sign out) çağrılır -- Game
  // Library'nin "doğru kaynağa" (local vs remote) geçişini TEK bir yerden
  // yönetir. gameLibraryLoadToken, çakışan/geç gelen bir isteğin state'i
  // GERİYE almasını engeller (race condition koruması).
  async function refreshGameLibrary() {
    var myToken = ++gameLibraryLoadToken;
    if (isGameLibraryRemote()) {
      try {
        var remoteGames = await remoteListGames();
        if (myToken !== gameLibraryLoadToken) return; // daha yeni bir çağrı bunu geçersiz kıldı
        gameLibrary = remoteGames;
        gameLibraryPersistFailed = false;
        gameLibraryLoadError = null;
      } catch (err) {
        if (myToken !== gameLibraryLoadToken) return;
        // md. ERROR HANDLING: "Do not crash... Show a clear user-facing
        // error... Avoid destructive localStorage behavior" -- ESKİ liste
        // (varsa) OLDUĞU GİBİ bırakılır, sadece dürüst bir hata bayrağı
        // set edilir (renderMyGamesLibrary bunu gösterir).
        gameLibraryLoadError = err.message || "Could not load your games right now.";
      }
    } else {
      gameLibrary = loadGameLibraryLocal();
      gameLibraryPersistFailed = false;
      gameLibraryLoadError = null;
    }
    updateSidebarMyGamesCount();
    if (isMyGamesModalOpen()) renderMyGamesLibrary();
  }

  function loadGameLibrary() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(GAME_LIBRARY_STORAGE_KEY) : null;
      var parsed = raw ? JSON.parse(raw) : [];
      gameLibrary = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      // Bozuk/eski-şekilli bir kayıt VARSA sessizce boş başla — asla çökme.
      gameLibrary = [];
    }
  }

  // GÜVENLİK (görev md.15/md.22, ÇOK ÖNEMLİ): burada YAZILAN game record'ları
  // SADECE html/prompt/meta/validation/başlık gibi alanlar içerir. API key
  // (ne ENV'in ne kullanıcının BYOK key'i) hiçbir game record'a YAZILMAZ —
  // zaten `meta` objesinin kendisi (server'ın /api/generate ve /api/improve
  // yanıtlarından gelen GERÇEK meta) hiçbir zaman bir key alanı taşımıyor
  // (bkz. server/routes/generate.js ve improve.js — sadece
  // mock/model/finishReason/gameType/assetKit/pipeline/gameSpec).
  function persistGameLibrary() {
    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(GAME_LIBRARY_STORAGE_KEY, JSON.stringify(gameLibrary));
      gameLibraryPersistFailed = false;
    } catch (err) {
      // Kota aşımı (private mode / tarayıcı limiti) — md.15: "büyük bir
      // persistence mimarisi kurma", bu yüzden burada karmaşık bir
      // eviction/senkronizasyon sistemi YOK. Bellekteki state (bu sekme
      // ömrü boyunca) geçerli kalır, kullanıcı Library'yi açtığında dürüst
      // bir uyarı görür (bkz. renderMyGamesLibrary) — kullanıcının rızası
      // olmadan sessizce eski bir oyun SİLİNMEZ.
      gameLibraryPersistFailed = true;
    }
  }

  function makeGameId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "game_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  // md.2/md.19: uydurma metadata YOK — SADECE meta objesindeki gerçek
  // alanlardan (assetKit.name zaten backend'in ürettiği insan-okunur bir
  // isim, bkz. server/config/assetKits.js) türetiliyor; hiçbiri
  // bulunamazsa promptun kendisinden kısaltılmış, dürüst bir başlık.
  function deriveGameTitle(meta, prompt) {
    if (meta && meta.assetKit && meta.assetKit.name) return meta.assetKit.name;
    if (meta && meta.gameType) return prettyAssetName(meta.gameType.replace(/-/g, "_"));
    var trimmed = (prompt || "").trim();
    if (trimmed) return trimmed.length > 48 ? trimmed.slice(0, 48).trim() + "…" : trimmed;
    return "Untitled Game";
  }

  // md.19: game type bilinmiyorsa TAHMİN ETME — null döner, kart "—" gösterir.
  function deriveGameTypeLabel(meta) {
    if (meta && meta.pipeline === "topdown-runtime") return "TopDown";
    if (meta && meta.gameType) return prettyAssetName(meta.gameType.replace(/-/g, "_"));
    return null;
  }

  // md.17: uydurma model adı YOK — meta.mock/meta.model'den, mevcut model
  // katalog fonksiyonuyla (getModelDisplayName, Generate'in de kullandığı
  // AYNI fonksiyon) türetiliyor.
  function deriveGameModelLabel(meta) {
    if (!meta) return null;
    if (meta.mock) return "Mock Mode";
    if (meta.model) return getModelDisplayName(meta.model);
    return null;
  }

  function buildGameRecordFromResult(result, existing) {
    var meta = result.meta || null;
    var now = new Date().toISOString();
    return {
      id: existing ? existing.id : makeGameId(),
      // Kullanıcı Rename yaptıysa (titleIsCustom) bir sonraki Improve/Fix
      // with AI güncellemesi bu ismi SESSİZCE geri almaz.
      title: existing && existing.titleIsCustom ? existing.title : deriveGameTitle(meta, result.prompt),
      titleIsCustom: existing ? !!existing.titleIsCustom : false,
      prompt: result.prompt || "",
      html: result.html || "",
      meta: meta,
      validation: result.validation || null,
      gameType: deriveGameTypeLabel(meta),
      model: deriveGameModelLabel(meta),
      qualityScore: result.validation && typeof result.validation.score === "number" ? result.validation.score : null,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
  }

  function findGameIndexById(id) {
    for (var i = 0; i < gameLibrary.length; i++) {
      if (gameLibrary[i].id === id) return i;
    }
    return -1;
  }

  function findGameById(id) {
    var idx = findGameIndexById(id);
    return idx === -1 ? null : gameLibrary[idx];
  }

  // PERSISTENT MY GAMES round: buildGameRecordFromResult (yukarıda, HİÇ
  // değişmedi) her zaman TAM bir record hesaplar; signed-in iken bu record
  // /api/games'e POST edilir ve server'ın DÖNDÜRDÜĞÜ (gerçek UUID/
  // created_at/updated_at taşıyan) satır TEK doğruluk kaynağı olarak
  // kullanılır (görev "ID HANDLING": localStorage id formatı DB UUID'si
  // olarak VARSAYILMAZ) — client'ın kendi ürettiği id'nin kendisi ASLA
  // sunucuya "bu benim id'im" diye dayatılmaz.
  async function createGameFromResult(result) {
    var rec = buildGameRecordFromResult(result, null);
    if (isGameLibraryRemote()) {
      var saved = await remoteCreateGame(rec);
      gameLibrary.push(saved);
      return saved;
    }
    gameLibrary.push(rec);
    persistGameLibrary();
    return rec;
  }

  async function updateGameFromResult(id, result) {
    var idx = findGameIndexById(id);
    if (idx === -1) return createGameFromResult(result); // kayıt silinmiş/kaybolmuşsa: yeni oluştur, çökme
    var rec = buildGameRecordFromResult(result, gameLibrary[idx]);
    if (isGameLibraryRemote()) {
      var updated = await remoteUpdateGame(gameLibrary[idx].id, recordToPayload(rec));
      gameLibrary[idx] = updated;
      return updated;
    }
    gameLibrary[idx] = rec;
    persistGameLibrary();
    return gameLibrary[idx];
  }

  function updateSidebarMyGamesCount() {
    var el = document.getElementById("sidebar-count-my-games");
    if (el) el.textContent = String(gameLibrary.length);
  }

  function isMyGamesModalOpen() {
    return !!(myGamesModalOverlay && !myGamesModalOverlay.classList.contains("hidden"));
  }

  // md.3/md.16 — ÇOK ÖNEMLİ AYRIM:
  //  - Generate HER ZAMAN yeni bir Game record oluşturur (Game A) ve onu
  //    "current game" yapar — önceden açık bir oyun olsa bile ONU değiştirmez.
  //  - Fix with AI / Improve with AI ise MEVCUT current game'i GÜNCELLER
  //    (currentGameId varsa) — yeni bir kopya OLUŞTURMAZ.
  // İkisi de SADECE validation.valid === true olduğunda kaydeder/günceller
  // (md.3: "Invalid generated output Game Library'ye kaydedilmemeli").
  // PERSISTENT MY GAMES round: her ikisi de artık async (remote path bir
  // ağ isteği gerektirdiği için) VE bir { ok, error? } sonucu DÖNER —
  // çağıran (generate()/handleFixWithAi()/improve submit) bunu KENDİ
  // durum mesajına yansıtabilsin diye (görev ERROR HANDLING: "Do not
  // silently report success when the database operation failed" —
  // generation'ın KENDİSİ başarılı olsa bile, My Games'e kaydetme
  // başarısız olduysa bu AYRI ve dürüst şekilde bildirilmeli).
  async function saveGeneratedGameAsNew() {
    if (!lastResult || !lastResult.validation || lastResult.validation.valid !== true) return { ok: true };
    try {
      var rec = await createGameFromResult(lastResult);
      currentGameId = rec.id;
      updateSidebarMyGamesCount();
      if (isMyGamesModalOpen()) renderMyGamesLibrary();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Could not save this game to your account." };
    }
  }

  async function syncCurrentGameAfterFixOrImprove() {
    if (!lastResult || !lastResult.validation || lastResult.validation.valid !== true) return { ok: true };
    try {
      if (currentGameId && findGameIndexById(currentGameId) !== -1) {
        await updateGameFromResult(currentGameId, lastResult);
      } else {
        // Bu oyun daha önce hiç kaydedilmemiş (ör. ilk Generate invalid'di,
        // Fix/Improve onu şimdi ilk kez geçerli hâle getirdi) — ilk kez
        // geçerli olduğu bu anda kaydedilir.
        var rec = await createGameFromResult(lastResult);
        currentGameId = rec.id;
      }
      updateSidebarMyGamesCount();
      if (isMyGamesModalOpen()) renderMyGamesLibrary();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Could not update this game in your account." };
    }
  }

  // md.13: current game silindiğinde preview boş kalmamalı / crash olmamalı
  // — sayfa ilk yüklendiğindeki TEMİZ, boş jeneratör durumuna dönülür.
  function resetGeneratorToEmptyState() {
    lastResult = null;
    if (previewFrame) {
      previewFrame.srcdoc = "";
      previewFrame.onload = null;
    }
    if (previewPlaceholder) {
      previewPlaceholder.innerHTML = DEFAULT_PREVIEW_PLACEHOLDER_HTML;
      previewPlaceholder.classList.remove("error");
      previewPlaceholder.classList.remove("hidden");
    }
    if (restartBtn) restartBtn.disabled = true;
    if (openTabBtn) openTabBtn.disabled = true;
    if (copyCodeBtn) copyCodeBtn.disabled = true;
    if (downloadBtn) downloadBtn.disabled = true;
    if (improveToggleBtn) improveToggleBtn.disabled = true;
    if (playBtn) playBtn.disabled = true;
    if (fullscreenBtn) fullscreenBtn.disabled = true;
    renderQualityCard(null);
    setBadge(null);
    updateGameInfoRow(null);
    updatePreviewMetaBadges(null, null);
    updateOutputValidationSummary(null);
    // updateBottomStatusBar(validation) validation null iken erken return
    // ediyor (mevcut, değiştirilmeyen davranış) — bu yüzden alt status bar'ı
    // sayfa ilk yüklendiğindeki gerçek varsayılan metinlerine burada elle
    // geri döndürüyoruz (uydurma bir metin DEĞİL, index.html'deki orijinal
    // statik metinlerin birebir aynısı).
    if (statusBarSafeEl) { statusBarSafeEl.textContent = "🛡 Safe & Valid"; statusBarSafeEl.className = "status-bar-item"; }
    if (statusBarChecksEl) { statusBarChecksEl.textContent = "— Validation Checks"; statusBarChecksEl.className = "status-bar-item"; }
    if (statusBarExternalEl) { statusBarExternalEl.textContent = "No External Requests"; statusBarExternalEl.className = "status-bar-item"; }
    if (statusBarLoopEl) { statusBarLoopEl.textContent = "No Infinite Loop Risk"; statusBarLoopEl.className = "status-bar-item"; }
    if (statusBarAssetEl) { statusBarAssetEl.textContent = "Asset Verified"; statusBarAssetEl.className = "status-bar-item"; }
    renderActiveTab();
    renderAiSelectedAssetsFromPrompt();
    promptInput.value = "";
    updateCharCounter();
    setStatus("", null);
  }

  // md.9/md.17 — Open: seçilen oyun current game olur, preview/prompt/
  // metadata/quality score/model state (best-effort) senkron edilir. Sayfa
  // refresh GEREKMEZ.
  function openGameFromLibrary(id) {
    var game = findGameById(id);
    if (!game) return;
    currentGameId = game.id;
    promptInput.value = game.prompt || "";
    updateCharCounter();
    applyNewResult(game.html, game.validation, game.meta, game.prompt);
    // md.17: model state mümkün olduğunca senkron — sadece bu oyunun GERÇEKTEN
    // kullandığı model biliniyorsa (mock ise zaten meta.model null'dır,
    // selectModel çağrılmaz, mevcut seçim olduğu gibi kalır).
    if (game.meta && game.meta.model) selectModel(game.meta.model);
    closeMyGamesModal();
    setStatus("Opened \"" + (game.title || "Untitled Game") + "\".", "success");
  }

  // PERSISTENT MY GAMES round: signed-in iken bir /api/games/:id/duplicate
  // POST'u -- server, ownership'i (RLS + .eq("user_id", userId)) DOĞRULADIKTAN
  // sonra GERÇEK satırı kopyalar ve YENİ bir UUID'yle döner (client id
  // UYDURMAZ). async, ama çağrı yeri (click delegasyonu) mevcut kod
  // konvansiyonuyla AYNI şekilde await'siz (fire-and-forget) çağırıyor —
  // fonksiyonun kendisi hatayı yakalayıp setStatus ile bildiriyor.
  async function duplicateGame(id) {
    var game = findGameById(id);
    if (!game) return;
    if (isGameLibraryRemote()) {
      try {
        var copy = await remoteDuplicateGame(id);
        gameLibrary.push(copy);
        renderMyGamesLibrary();
        updateSidebarMyGamesCount();
      } catch (err) {
        setStatus("Could not duplicate this game: " + (err.message || "please try again."), "error");
      }
      return;
    }
    var now = new Date().toISOString();
    var localCopy = Object.assign({}, game, {
      id: makeGameId(),
      title: (game.title || "Untitled Game") + " Copy",
      titleIsCustom: true, // md.11: kopyanın adı sabit kalsın, sonraki bir Improve onu geri almasın
      createdAt: now,
      updatedAt: now,
    });
    gameLibrary.push(localCopy);
    persistGameLibrary();
    renderMyGamesLibrary();
    updateSidebarMyGamesCount();
  }

  function openRenameModal(id) {
    var game = findGameById(id);
    if (!game || !myGamesRenameModalOverlay || !myGamesRenameInput) return;
    myGamesRenameTargetId = id;
    myGamesRenameInput.value = game.title || "";
    if (myGamesRenameStatusEl) myGamesRenameStatusEl.textContent = "";
    myGamesRenameModalOverlay.classList.remove("hidden");
    myGamesRenameInput.focus();
    myGamesRenameInput.select();
  }

  function closeRenameModal() {
    if (myGamesRenameModalOverlay) myGamesRenameModalOverlay.classList.add("hidden");
    myGamesRenameTargetId = null;
  }

  // PERSISTENT MY GAMES round: signed-in iken bir /api/games/:id PUT'u --
  // BİLEREK KISMİ bir payload ({title, titleIsCustom}) gönderiyor, server
  // tarafı (gamePersistence.updateGame) SADECE bu iki alanı uygular,
  // meta/validation/html gibi diğer her şey MEVCUT satırdan KORUNUR (görev:
  // "Preserve existing metadata unless intentionally updated"). Hata
  // durumunda modal AÇIK kalır ve dürüst bir mesaj gösterilir -- sessizce
  // kapatıp başarılıymış gibi davranmaz.
  async function saveRename() {
    if (!myGamesRenameTargetId || !myGamesRenameInput) return;
    var value = myGamesRenameInput.value.trim();
    if (!value) {
      if (myGamesRenameStatusEl) myGamesRenameStatusEl.textContent = "Name cannot be empty.";
      return;
    }
    if (value.length > 80) value = value.slice(0, 80).trim();
    var idx = findGameIndexById(myGamesRenameTargetId);
    if (idx === -1) {
      closeRenameModal();
      return;
    }

    if (isGameLibraryRemote()) {
      var targetId = myGamesRenameTargetId;
      if (myGamesRenameSaveBtn) myGamesRenameSaveBtn.disabled = true;
      try {
        var updated = await remoteUpdateGame(targetId, { title: value, titleIsCustom: true });
        var freshIdx = findGameIndexById(targetId);
        if (freshIdx !== -1) gameLibrary[freshIdx] = updated;
        renderMyGamesLibrary();
        closeRenameModal();
      } catch (err) {
        if (myGamesRenameStatusEl) myGamesRenameStatusEl.textContent = err.message || "Could not rename this game.";
      } finally {
        if (myGamesRenameSaveBtn) myGamesRenameSaveBtn.disabled = false;
      }
      return;
    }

    gameLibrary[idx].title = value;
    gameLibrary[idx].titleIsCustom = true;
    persistGameLibrary();
    renderMyGamesLibrary();
    closeRenameModal();
  }

  function openDeleteModal(id) {
    var game = findGameById(id);
    if (!game || !myGamesDeleteModalOverlay) return;
    myGamesDeleteTargetId = id;
    if (myGamesDeleteMessageEl) {
      myGamesDeleteMessageEl.textContent = 'Delete "' + (game.title || "Untitled Game") + '"? This action cannot be undone.';
    }
    myGamesDeleteModalOverlay.classList.remove("hidden");
    if (myGamesDeleteConfirmBtn) myGamesDeleteConfirmBtn.focus();
  }

  function closeDeleteModal() {
    if (myGamesDeleteModalOverlay) myGamesDeleteModalOverlay.classList.add("hidden");
    myGamesDeleteTargetId = null;
  }

  // PERSISTENT MY GAMES round: signed-in iken bir /api/games/:id DELETE'i --
  // server'ın GERÇEKTEN silindiğini onaylamasını (RLS + .eq("user_id",
  // userId) ile ownership doğrulanmış) BEKLER, sonra local `gameLibrary`
  // cache'inden çıkarır. Başarısız olursa kayıt LİSTEDE KALIR (silinmemiş
  // gibi görünmeye devam eder, ki ZATEN silinmedi) ve dürüst bir hata
  // gösterilir.
  async function confirmDelete() {
    var id = myGamesDeleteTargetId;
    if (!id) return;
    if (isGameLibraryRemote()) {
      if (myGamesDeleteConfirmBtn) myGamesDeleteConfirmBtn.disabled = true;
      try {
        await remoteDeleteGame(id);
        gameLibrary = gameLibrary.filter(function (g) { return g.id !== id; });
        if (currentGameId === id) {
          currentGameId = null;
          resetGeneratorToEmptyState();
        }
        renderMyGamesLibrary();
        updateSidebarMyGamesCount();
        closeDeleteModal();
      } catch (err) {
        setStatus("Could not delete this game: " + (err.message || "please try again."), "error");
        closeDeleteModal();
      } finally {
        if (myGamesDeleteConfirmBtn) myGamesDeleteConfirmBtn.disabled = false;
      }
      return;
    }
    gameLibrary = gameLibrary.filter(function (g) { return g.id !== id; });
    persistGameLibrary();
    if (currentGameId === id) {
      // md.13: silinen oyun current game'se, Generator temiz bir boş duruma
      // döner — preview asla boş/kırık bırakılmaz, uygulama çökmez.
      currentGameId = null;
      resetGeneratorToEmptyState();
    }
    renderMyGamesLibrary();
    updateSidebarMyGamesCount();
    closeDeleteModal();
  }

  // md.7: title/prompt/gameType/model üzerinden, case-insensitive arama.
  function myGamesMatchesQuery(game, query) {
    if (!query) return true;
    var haystack = [
      game.title || "",
      game.prompt || "",
      game.gameType || "",
      game.model || "",
    ].join(" ").toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function myGameCardIcon(game) {
    var type = (game.gameType || "").toLowerCase();
    if (type.indexOf("topdown") !== -1) return "▦";
    if (type.indexOf("shooter") !== -1) return "✦";
    if (type.indexOf("runner") !== -1) return "▲";
    if (type.indexOf("puzzle") !== -1) return "◆";
    if (type.indexOf("platform") !== -1) return "▣";
    return "✦";
  }

  function myGameCardHtml(game) {
    var isCurrent = game.id === currentGameId;
    var scoreHtml =
      typeof game.qualityScore === "number"
        ? '<span class="' + (game.qualityScore >= 70 ? "quality-good" : game.qualityScore < 40 ? "quality-bad" : "") + '">Quality ' + game.qualityScore + "/100</span>"
        : "<span>Quality —</span>";
    var dateLabel = "";
    try {
      dateLabel = new Date(game.updatedAt || game.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (err) {
      dateLabel = "";
    }
    return (
      '<div class="my-games-card' + (isCurrent ? " is-current" : "") + '" data-game-id="' + escapeAttr(game.id) + '">' +
      '<div class="my-games-thumb" aria-hidden="true">' + myGameCardIcon(game) + "</div>" +
      '<div class="my-games-card-body">' +
      '<div class="my-games-card-title" title="' + escapeAttr(game.title || "Untitled Game") + '">' + escapeHtml(game.title || "Untitled Game") + "</div>" +
      '<div class="my-games-card-meta">' +
      "<span>" + escapeHtml(game.gameType || "—") + "</span>" +
      scoreHtml +
      "</div>" +
      '<div class="my-games-card-date">' + escapeHtml(dateLabel) + (game.model ? " · " + escapeHtml(game.model) : "") + "</div>" +
      '<div class="my-games-card-actions">' +
      '<button type="button" class="my-games-open-btn" data-my-games-open="' + escapeAttr(game.id) + '">Open</button>' +
      '<span class="my-games-menu-wrap">' +
      '<button type="button" class="my-games-menu-btn" data-my-games-menu-toggle="' + escapeAttr(game.id) + '" aria-haspopup="true" aria-expanded="' + (myGamesOpenMenuId === game.id ? "true" : "false") + '" aria-label="More actions for ' + escapeAttr(game.title || "Untitled Game") + '">⋯</button>' +
      '<div class="my-games-menu' + (myGamesOpenMenuId === game.id ? "" : " hidden") + '" role="menu">' +
      '<button type="button" role="menuitem" data-my-games-open="' + escapeAttr(game.id) + '">Open</button>' +
      '<button type="button" role="menuitem" data-my-games-duplicate="' + escapeAttr(game.id) + '">Duplicate</button>' +
      '<button type="button" role="menuitem" data-my-games-rename="' + escapeAttr(game.id) + '">Rename</button>' +
      '<button type="button" role="menuitem" class="is-danger" data-my-games-delete="' + escapeAttr(game.id) + '">Delete</button>' +
      "</div>" +
      "</span>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function renderMyGamesLibrary() {
    if (!myGamesGridEl) return;
    var query = myGamesSearchQuery;
    var filtered = gameLibrary.filter(function (g) { return myGamesMatchesQuery(g, query); });
    filtered.sort(function (a, b) {
      var aT = new Date(a.updatedAt || a.createdAt).getTime();
      var bT = new Date(b.updatedAt || b.createdAt).getTime();
      return myGamesSortOrder === "oldest" ? aT - bT : bT - aT;
    });

    var noticeHtml = gameLibraryPersistFailed
      ? '<p class="my-games-empty" style="grid-column:1/-1;padding:10px 4px;color:var(--danger);text-align:left;">⚠ Your browser storage is full — recent changes may not be saved permanently. Consider deleting some games.</p>'
      : "";

    // PERSISTENT MY GAMES round — GET /api/games başarısız olduysa (ör.
    // Supabase geçici erişilemez): "Do not silently report success" ->
    // eski liste (varsa) korunur ama dürüst bir hata gösterilir.
    if (gameLibraryLoadError) {
      noticeHtml +=
        '<p class="my-games-empty" style="grid-column:1/-1;padding:10px 4px;color:var(--danger);text-align:left;">⚠ Could not load your saved games: ' +
        escapeHtml(gameLibraryLoadError) +
        "</p>";
    }

    // MIGRATION (deferred, görev: "If migration would introduce
    // unnecessary complexity or risk, preserve them locally and clearly
    // report that migration is deferred") — signed-in iken, sign-in
    // ÖNCESİNDEN kalma local oyunlar SESSİZCE kaybolmaz: localStorage'a
    // hiç dokunulmuyor, sadece bunların şu an GÖRÜNMEDİĞİ (Library artık
    // hesabındaki oyunları gösteriyor) açıkça bildiriliyor.
    if (isGameLibraryRemote()) {
      var localCount = loadGameLibraryLocal().length;
      if (localCount > 0) {
        noticeHtml +=
          '<p class="my-games-empty" style="grid-column:1/-1;padding:10px 4px;color:var(--text-faint);text-align:left;">ℹ You have ' +
          localCount +
          (localCount === 1 ? " game" : " games") +
          " saved locally from before signing in. They're kept safe in this browser but aren't synced to your account yet — sign out to access them.</p>";
      }
    }

    if (gameLibrary.length === 0) {
      myGamesGridEl.innerHTML =
        noticeHtml +
        '<div class="my-games-empty">' +
        "<p>You haven't created any games yet.<br />Create your first playable game with AI.</p>" +
        '<button type="button" class="byok-btn byok-btn-primary" id="my-games-empty-create-btn">Create Game</button>' +
        "</div>";
      return;
    }

    if (filtered.length === 0) {
      myGamesGridEl.innerHTML = noticeHtml + '<div class="my-games-empty"><p>No games found.</p></div>';
      return;
    }

    myGamesGridEl.innerHTML = noticeHtml + filtered.map(myGameCardHtml).join("");
  }

  function openMyGamesModal() {
    if (!myGamesModalOverlay) return;
    myGamesOpenMenuId = null;
    renderMyGamesLibrary();
    myGamesModalOverlay.classList.remove("hidden");
    if (sidebarMyGamesBtn) sidebarMyGamesBtn.setAttribute("aria-expanded", "true");
    if (myGamesSearchInput) myGamesSearchInput.focus();
  }

  function closeMyGamesModal() {
    if (!myGamesModalOverlay) return;
    myGamesModalOverlay.classList.add("hidden");
    myGamesOpenMenuId = null;
    if (sidebarMyGamesBtn) sidebarMyGamesBtn.setAttribute("aria-expanded", "false");
  }

  function initMyGamesLibrary() {
    if (sidebarMyGamesBtn) sidebarMyGamesBtn.addEventListener("click", openMyGamesModal);
    if (myGamesModalCloseBtn) myGamesModalCloseBtn.addEventListener("click", closeMyGamesModal);
    if (myGamesModalOverlay) {
      myGamesModalOverlay.addEventListener("click", function (e) {
        if (e.target === myGamesModalOverlay) closeMyGamesModal();
      });
    }

    if (myGamesSearchInput) {
      myGamesSearchInput.addEventListener("input", function () {
        myGamesSearchQuery = myGamesSearchInput.value.trim().toLowerCase();
        renderMyGamesLibrary();
      });
    }

    if (myGamesSortChipsEl) {
      myGamesSortChipsEl.addEventListener("click", function (e) {
        var chip = e.target.closest(".asset-filter-chip[data-my-games-sort]");
        if (!chip) return;
        myGamesSortOrder = chip.getAttribute("data-my-games-sort");
        var chips = myGamesSortChipsEl.querySelectorAll(".asset-filter-chip");
        for (var i = 0; i < chips.length; i++) {
          chips[i].setAttribute("aria-pressed", chips[i] === chip ? "true" : "false");
        }
        renderMyGamesLibrary();
      });
    }

    // Tek bir delege edilmiş click handler — kart/menü/aksiyon butonlarının
    // hepsi burada, grid her renderMyGamesLibrary() çağrısında YENİDEN
    // oluşturulduğu için event listener'ları tek tek yeniden bağlamaya
    // GEREK YOK (delegasyon deseni, mevcut Asset Browser ile AYNI).
    if (myGamesGridEl) {
      myGamesGridEl.addEventListener("click", function (e) {
        var createBtn = e.target.closest("#my-games-empty-create-btn");
        if (createBtn) {
          closeMyGamesModal();
          promptInput.focus();
          return;
        }

        var menuToggle = e.target.closest("[data-my-games-menu-toggle]");
        if (menuToggle) {
          var id = menuToggle.getAttribute("data-my-games-menu-toggle");
          myGamesOpenMenuId = myGamesOpenMenuId === id ? null : id;
          renderMyGamesLibrary();
          return;
        }

        var openBtn = e.target.closest("[data-my-games-open]");
        if (openBtn) {
          openGameFromLibrary(openBtn.getAttribute("data-my-games-open"));
          return;
        }
        var dupBtn = e.target.closest("[data-my-games-duplicate]");
        if (dupBtn) {
          duplicateGame(dupBtn.getAttribute("data-my-games-duplicate"));
          return;
        }
        var renameBtn = e.target.closest("[data-my-games-rename]");
        if (renameBtn) {
          myGamesOpenMenuId = null;
          renderMyGamesLibrary();
          openRenameModal(renameBtn.getAttribute("data-my-games-rename"));
          return;
        }
        var deleteBtn = e.target.closest("[data-my-games-delete]");
        if (deleteBtn) {
          myGamesOpenMenuId = null;
          renderMyGamesLibrary();
          openDeleteModal(deleteBtn.getAttribute("data-my-games-delete"));
          return;
        }
      });
    }

    if (myGamesRenameSaveBtn) myGamesRenameSaveBtn.addEventListener("click", saveRename);
    if (myGamesRenameCancelBtn) myGamesRenameCancelBtn.addEventListener("click", closeRenameModal);
    if (myGamesRenameCloseBtn) myGamesRenameCloseBtn.addEventListener("click", closeRenameModal);
    if (myGamesRenameModalOverlay) {
      myGamesRenameModalOverlay.addEventListener("click", function (e) {
        if (e.target === myGamesRenameModalOverlay) closeRenameModal();
      });
    }
    if (myGamesRenameInput) {
      myGamesRenameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") saveRename();
      });
    }

    if (myGamesDeleteConfirmBtn) myGamesDeleteConfirmBtn.addEventListener("click", confirmDelete);
    if (myGamesDeleteCancelBtn) myGamesDeleteCancelBtn.addEventListener("click", closeDeleteModal);
    if (myGamesDeleteCloseBtn) myGamesDeleteCloseBtn.addEventListener("click", closeDeleteModal);
    if (myGamesDeleteModalOverlay) {
      myGamesDeleteModalOverlay.addEventListener("click", function (e) {
        if (e.target === myGamesDeleteModalOverlay) closeDeleteModal();
      });
    }

    // Menü açıkken dışarı tıklayınca kapansın (delegasyon: herhangi bir
    // menu-wrap DIŞINA tıklama).
    document.addEventListener("click", function (e) {
      if (myGamesOpenMenuId && !e.target.closest(".my-games-menu-wrap")) {
        myGamesOpenMenuId = null;
        renderMyGamesLibrary();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (myGamesDeleteModalOverlay && !myGamesDeleteModalOverlay.classList.contains("hidden")) {
        closeDeleteModal();
        return;
      }
      if (myGamesRenameModalOverlay && !myGamesRenameModalOverlay.classList.contains("hidden")) {
        closeRenameModal();
        return;
      }
      if (myGamesOpenMenuId) {
        myGamesOpenMenuId = null;
        renderMyGamesLibrary();
        return;
      }
      if (isMyGamesModalOpen()) closeMyGamesModal();
    });
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
  // AI MODEL SELECTOR round — GET /api/models'i çeker, dropdown'ı doldurur
  // ve tıklama/klavye/dış-tık davranışını bağlar. Başarısız olursa mevcut
  // "…" rozeti aynen görünmeye devam eder (bkz. initModelSelector içindeki
  // .catch).
  initModelSelector();
  // CUSTOM ASSET LIBRARY round — Upload butonunun click/change handler'larını
  // bağlar (bkz. initAssetLibraryUpload). GET /api/assets zaten yukarıdaki
  // loadAssetLibrary() ile çekiliyor — customLibraries alanı ORADA işlenir.
  initAssetLibraryUpload();
  // ROUND I — GAME LIBRARY: sayfa yüklenirken (varsa) localStorage'daki
  // kayıtlı oyunları oku, sidebar sayacını gerçek sayıyla doldur ve My Games
  // modal'ının event handler'larını bağla.
  loadGameLibrary();
  updateSidebarMyGamesCount();
  initMyGamesLibrary();
  // SUPABASE AUTHENTICATION FOUNDATION round — hesap UI/oturum kurulumu.
  // Supabase yapılandırılmamışsa veya CDN script'i yüklenemediyse SESSİZCE
  // no-op olur (bkz. initAuth) — mevcut init sırasındaki HİÇBİR çağrıya
  // (yukarıdaki) bağımlı değil, listenin EN SONUNA eklendi.
  initAuth();
})();
