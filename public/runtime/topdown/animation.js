/**
 * TOP-DOWN PLAYABLE GAME RUNTIME — Animation layer (VISUAL QUALITY round)
 *
 * Player/enemy'nin "idle" mi "moving" mi olduğunu ve hangi yöne baktığını
 * (facing) TEK bir yerden, renderer.js'in doğrudan tüketebileceği küçük,
 * saf bir "visual descriptor" objesine indirger. Ham state (state/facing/
 * bobPhase) ZATEN entity.js'te tutuluyor — bu dosya onu ÇOĞALTMIYOR, sadece
 * OKUYUP özetliyor (tek kaynak yine Entity).
 *
 * NEDEN gerçek bir sprite-sheet/frame animasyon sistemine BAĞLANMADI:
 * server/config/packs/*.js içindeki HER TEK asset kaydı bugün
 * `animationType: "static"` (gerçek frame verisi hiçbir pakette YOK — bkz.
 * server/config/assetManifest.js buildAnimationSkeleton(), tüm state'ler
 * `null`). Bu bilgi ayrıca specSchema.js/assetResolver.js'in ürettiği
 * `spec.assets` objesine (sadece `{role: url|null}`) hiç YANSITILMIYOR.
 * Bunu buraya kadar taşımak (specSchema.js'e yeni bir alan eklemek) bu
 * round'un kendi kısıtlarını ("Asset manifest/kit verilerini değiştirme",
 * "Spec extraction sistemine dokunma", "gereksiz refactor yapma") ihlal
 * ederdi — üstelik bugün HİÇBİR asset'in animationType'ı "static" DIŞINDA
 * bir değer taşımadığından, bu bağlantı SIFIR davranış farkı yaratır,
 * sadece spec/asset boru hattına gereksiz risk ekler.
 *
 * Bunun yerine bu katman KONTRATI tanımlıyor: `supportsFrameAnimation`,
 * ileride gerçek bir animationType (ör. "spritesheet") ortaya çıkarsa
 * renderer.js'in HİÇ değişmeden danışabileceği TEK nokta — bugün HER ZAMAN
 * `false` döner (dürüst: hiçbir frame verisi UYDURULMAZ). `resolveVisualState`
 * ise bugün GERÇEKTEN kullanılan, güvenli fallback'i üretir: idle/moving
 * ayrımı + yatay yön (flip) — sprite hiçbir şekilde döndürülmez/deforme
 * edilmez.
 *
 * Sadece Entity'nin ALANLARINA (state/facing) bakar — DOM/canvas'a hiç
 * dokunmaz, bu yüzden entity.js/player.js/enemy.js İLE AYNI Node `vm`
 * sandbox'ında test edilebilir (bkz. server/tests/topDownRuntimeCore.test.js).
 */
window.TopDownRuntime = window.TopDownRuntime || {};

(function (ns) {
  "use strict";

  // Bugün BOŞ — bkz. dosya başı notu. Gelecekte gerçek frame verisi taşıyan
  // bir animationType eklenirse (ör. "spritesheet"), buraya eklenmesi
  // yeterli olacak şekilde tasarlandı; renderer.js/entity.js'in hiçbirine
  // dokunmadan.
  var KNOWN_FRAME_ANIMATION_TYPES = [];

  /**
   * animationType: asset manifest'inin (bugün hep "static") taşıdığı ham
   * değer. Dönüş: gerçek kare/frame tabanlı animasyon uygulanabilir mi?
   * Bugün, hiçbir asset kaydı bunu desteklemediği için HER ZAMAN false.
   */
  function supportsFrameAnimation(animationType) {
    return KNOWN_FRAME_ANIMATION_TYPES.indexOf(animationType) !== -1;
  }

  /**
   * entity: Entity/Player/Enemy örneği. Dönüş: renderer.js'in ihtiyaç
   * duyduğu üç basit alan — HİÇBİRİ yeni bir hesap İCAT ETMİYOR, sadece
   * entity.state/entity.facing'i okunabilir bir sözleşmeye indirgiyor.
   */
  function resolveVisualState(entity) {
    var flip = entity && entity.facing === -1;
    return {
      moving: !!entity && entity.state === "moving",
      facing: flip ? -1 : 1,
      flipX: flip,
    };
  }

  ns.Animation = {
    supportsFrameAnimation: supportsFrameAnimation,
    resolveVisualState: resolveVisualState,
  };
})(window.TopDownRuntime);
