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
    })
  : null;

module.exports = {
  isConfigured: isConfigured,
  serverClient: serverClient,
  // GÜVENLİK: routes/authConfig.js'in frontend'e döndürdüğü TEK kaynak —
  // SADECE url + anon key. service role key bu objede HİÇ YOK.
  publicConfig: {
    supabaseUrl: isConfigured ? SUPABASE_URL : null,
    supabaseAnonKey: isConfigured ? SUPABASE_ANON_KEY : null,
    configured: isConfigured,
  },
};
