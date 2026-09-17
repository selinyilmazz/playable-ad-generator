/**
 * SUPABASE AUTHENTICATION FOUNDATION round — Supabase istemcisi/ayarları
 * TEK yerden okunur. server/config/models.js İLE AYNI konvansiyon: bu
 * dosya DIŞINDA hiçbir yer process.env.SUPABASE_* okumaz.
 *
 * GÜVENLİK (görev md.2/md.3, KESİN):
 *  - SUPABASE_SERVICE_ROLE_KEY hiçbir zaman frontend'e gönderilmez, hiçbir
 *    response body'sine yazılmaz, hiçbir yerde loglanmaz — SADECE
 *    `serverClient` objesinin (bu dosyanın DIŞINA hiç sızmayan) içinde
 *    yaşar. routes/authConfig.js SADECE `publicConfig` alanını (url + anon
 *    key) frontend'e döner — service role key oraya HİÇ dahil edilmez.
 *  - Ortam değişkenleri (SUPABASE_URL/ANON_KEY) eksikse bu modül ÇÖKMEZ —
 *    openrouterClient.resolveEffectiveApiKey'in "key yoksa null döner,
 *    çağıran taraf güvenli şekilde mock'a düşer" FELSEFESİYLE AYNI: auth
 *    burada "yapılandırılmamış" sayılır (isConfigured=false), attachUser
 *    middleware bu durumda HİÇBİR ağ çağrısı yapmadan tüm istekleri
 *    anonim olarak geçirir (local dev/test ortamlarında server ÇÖKMEZ/
 *    YAVAŞLAMAZ, yeni bir zorunlu secret/dependency EKLENMİŞ olmaz).
 */
const { createClient } = require("@supabase/supabase-js");

var SUPABASE_URL = process.env.SUPABASE_URL || "";
var SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Auth SADECE URL + anon key mevcutsa "yapılandırılmış" sayılır — bunlar
// zaten public-safe, tarayıcıya gönderilmesi GEREKEN değerler (Supabase'in
// kendi tasarımı). service role key OPSİYONEL (görev: "server-side
// OPTIONAL user identity verification") — yoksa anon key'e düşülür (bkz.
// aşağıdaki serverClient), token doğrulama YİNE çalışır.
var isConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * NODE 18 PRODUCTION CRASH FIX:
 * @supabase/supabase-js'in createClient()'ı, Realtime HİÇ kullanılmasa
 * bile, çağrıldığı anda (constructor içinde, senkron) bir RealtimeClient
 * inşa eder. RealtimeClient'ın KENDİ constructor'ı, `options.transport`
 * verilmediği sürece native global bir `WebSocket` constructor'ı bulmaya
 * çalışır (@supabase/realtime-js WebSocketFactory.getWebSocketConstructor).
 * Node 18'de native global `WebSocket` OLMADIĞI için (Node 22'ye kadar
 * stabilize edilmedi) bu arama HEMEN "Node.js detected but native
 * WebSocket not found." hatasını fırlatır — bu modül require edilir
 * edilmez tüm server process'i çöker. Bu, birebir Railway'de görülen
 * crash'tir (stack: server/config/supabase.js).
 *
 * Bu uygulama Supabase Realtime'ı HİÇBİR YERDE kullanmıyor (server/
 * altında `.channel(`/`.realtime.` çağrısı yok) — yani gerçek bir
 * WebSocket implementasyonuna (ör. `ws` paketi) veya global bir
 * polyfill'e hiç gerek yok; sadece createClient()'ın Realtime'ı inşa
 * ederken yaptığı bu erken/senkron aramayı devre dışı bırakmak yeterli.
 * `options.transport`'a null/undefined OLMAYAN herhangi bir değer bu
 * aramayı tamamen atlar (RealtimeClient._initializeOptions:
 * `options?.transport ?? getWebSocketConstructor()`) — bu yüzden burada,
 * Realtime gerçekten (yanlışlıkla) kullanılırsa açık bir hata fırlatan
 * bir placeholder veriyoruz. Bunun etkisi SADECE bu client'ın `realtime`
 * seçeneğiyle sınırlı: Auth (ayrı client, auth-js) ve Postgrest/RLS
 * sorguları (HTTP-only) hiç etkilenmez, global `WebSocket`'e dokunulmaz,
 * yeni bir npm bağımlılığı gerekmez.
 */
function DisabledRealtimeTransport() {
  throw new Error(
    "Supabase Realtime is intentionally disabled in this deployment (Node 18 " +
      "compatibility) and is not expected to be used. If Realtime is genuinely " +
      "needed, provide a real WebSocket implementation via the `realtime.transport` " +
      "client option instead of removing this guard."
  );
}

// Üç `createClient()` çağrı noktasının (bu dosya + gamePersistence.js +
// userApiKeyPersistence.js) paylaştığı tek seçenek parçası — `realtime`
// anahtarı, `auth`/`global` anahtarlarının YANINA eklenir, YERİNE geçmez.
var REALTIME_DISABLED = { transport: DisabledRealtimeTransport };

/**
 * Token doğrulama (auth.getUser(token)) için kullanılan, SADECE server
 * tarafında yaşayan client. service role key varsa onunla, yoksa anon
 * key'le başlatılır — hangisiyle başlatıldığı, hangi KULLANICI olarak
 * doğrulama yapılacağını ETKİLEMEZ (bunu, çağıranın verdiği token'ın
 * kendisi belirler); sadece client'ın Supabase'e KENDİ kimliğini bildirir.
 * autoRefreshToken/persistSession bilerek false — bu bir sunucu-taraflı,
 * istek-başına doğrulama client'ı, kendi oturumunu YÖNETMEZ/SAKLAMAZ.
 */
var serverClient = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: REALTIME_DISABLED,
    })
  : null;

module.exports = {
  isConfigured: isConfigured,
  serverClient: serverClient,
  // Diğer iki request-scoped createClient() çağrı noktasının
  // (gamePersistence.js, userApiKeyPersistence.js) AYNI korumayı
  // kullanabilmesi için dışa açık.
  REALTIME_DISABLED: REALTIME_DISABLED,
  // GÜVENLİK: routes/authConfig.js'in frontend'e döndürdüğü TEK kaynak —
  // SADECE url + anon key. service role key bu objede HİÇ YOK.
  publicConfig: {
    supabaseUrl: isConfigured ? SUPABASE_URL : null,
    supabaseAnonKey: isConfigured ? SUPABASE_ANON_KEY : null,
    configured: isConfigured,
  },
  // PERSISTENT MY GAMES round — SADECE server-içi kullanım için (ör.
  // services/gamePersistence.js'in, çağıranın KENDİ doğrulanmış access
  // token'ıyla İSTEK-BAZLI bir client kurması gerektiğinde). BUNLAR
  // publicConfig İLE AYNI (zaten public-safe) değerler — service role key
  // burada da YOK, bu obje frontend'e HİÇ gönderilmiyor, sadece diğer
  // server modüllerinin process.env'e doğrudan erişmesini önlemek için
  // (bu dosyanın "TEK yerden okunur" sözleşmesi).
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};
