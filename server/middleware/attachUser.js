/**
 * SUPABASE AUTHENTICATION FOUNDATION round — OPSİYONEL kullanıcı kimlik
 * doğrulama middleware'i.
 *
 * KESİN GÜVENLİK/DAVRANIŞ KURALLARI (görev md.3):
 *  - Authorization header eksik/bozuk/süresi dolmuş/geçersizse istek
 *    ANONİM sayılır — middleware ASLA bir isteği bu yüzden REDDETMEZ,
 *    HER ZAMAN next() çağırır (mevcut hiçbir route'u bloklamaz).
 *  - req.body.userId (veya benzeri client-supplied bir alan) KİMLİK
 *    olarak HİÇBİR ZAMAN güvenilmez — kimlik SADECE doğrulanmış Supabase
 *    token'ından gelir (auth.getUser(token)).
 *  - access token HİÇBİR ZAMAN loglanmaz (ne başarı ne hata durumunda).
 *  - Supabase yapılandırılmamışsa (server/config/supabase.js ->
 *    isConfigured=false) HİÇBİR ağ çağrısı yapılmaz — istek doğrudan
 *    anonim olarak geçer (local dev/test/CI'da yavaşlama veya çökme yok).
 *
 * PERSISTENT MY GAMES round — EK OLARAK, token GERÇEKTEN doğrulandığında
 * (req.user/req.userId ile AYNI anda) req.accessToken'a da atanır. Bu,
 * services/gamePersistence.js'in Postgres RLS'in auth.uid()'i DOĞRU
 * değerlendirmesi için İSTEK-BAZLI (çağıranın KENDİ token'ıyla kurulan)
 * bir Supabase client'ı oluşturabilmesi İÇİNDİR (bkz. o dosyadaki
 * createRequestScopedClient) — service role/anon key'le kurulan TEK bir
 * paylaşılan client BUNU YAPAMAZ (auth.uid() o zaman null/anonim kalırdı).
 * req.accessToken hiçbir yerde loglanmaz/response'a yazılmaz — SADECE
 * aynı istek içindeki route handler'lara aktarılan geçici bir referans.
 */
const supabaseConfig = require("../config/supabase");

var BEARER_RE = /^Bearer\s+(.+)$/i;

function extractBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== "string") {
    return null;
  }
  var match = headerValue.match(BEARER_RE);
  if (!match) {
    return null;
  }
  var token = match[1].trim();
  return token.length > 0 ? token : null;
}

async function attachUser(req, res, next) {
  // Varsayılan: anonim. Aşağıdaki hiçbir dal bunu DEĞİŞTİREMEZSE (erken
  // dönüş / hata) istek zaten anonim kalır.
  req.user = null;
  req.userId = null;
  req.accessToken = null;

  // Supabase yapılandırılmamış -> HİÇBİR ağ çağrısı yapma, doğrudan devam
  // et. (Bu dal, gerçek Supabase env değişkenleri olmayan local dev/test
  // ortamlarında normal/beklenen yoldur.)
  if (!supabaseConfig.isConfigured || !supabaseConfig.serverClient) {
    return next();
  }

  var token = extractBearerToken(req.headers && req.headers.authorization);
  if (!token) {
    return next();
  }

  try {
    var result = await supabaseConfig.serverClient.auth.getUser(token);
    var user = result && result.data && result.data.user;
    var error = result && result.error;

    // Süresi dolmuş/geçersiz/bozuk token: normal/beklenen bir durum,
    // token'ın kendisini veya hata detayını LOGLAMADAN sessizce anonime
    // düş.
    if (error || !user) {
      return next();
    }

    req.user = { id: user.id, email: user.email || null };
    req.userId = user.id;
    // GÜVENLİK: SADECE burada, kimlik BAŞARIYLA doğrulandıktan SONRA atanır
    // — req.user/req.userId ile AYNI anda set edilir/temizlenir, asla tek
    // başına (ör. doğrulanmamış bir token'la) set edilmez.
    req.accessToken = token;
    return next();
  } catch (err) {
    // Gerçekten beklenmeyen bir hata (ör. ağ hatası) — token'ı VEYA
    // herhangi bir hassas detayı İÇERMEYEN, jenerik bir mesaj logla,
    // isteği yine de anonim olarak devam ettir (asla reddetme/çökme).
    console.error("[attachUser] beklenmeyen bir hata oluştu, istek anonim olarak devam ediyor.");
    return next();
  }
}

module.exports = { attachUser: attachUser };
