/**
 * PERSISTENT MY GAMES round — Supabase `games` tablosu için CRUD katmanı.
 *
 * MİMARİ/GÜVENLİK (görev'in KESİN gereksinimleri):
 *  - Her çağrı, req.user/req.userId'den (attachUser middleware'i, bkz.
 *    server/middleware/attachUser.js) gelen, ZATEN doğrulanmış bir userId
 *    ALIR — bu dosya hiçbir zaman req.body/query/localStorage'dan bir
 *    "userId" OKUMAZ, sadece parametre olarak verileni kullanır (o
 *    parametrenin route handler'da SADECE req.userId'den geldiğinden emin
 *    olmak route katmanının sorumluluğu, bkz. routes/games.js).
 *  - RLS'in auth.uid()'i DOĞRU değerlendirmesi için her çağrı, çağıranın
 *    KENDİ (zaten doğrulanmış) access token'ıyla kurulan, İSTEK-BAZLI bir
 *    Supabase client'ı kullanır (createRequestScopedClient) — ASLA
 *    server/config/supabase.js'in service-role/anon-key'li paylaşılan
 *    `serverClient`'ı (o SADECE token DOĞRULAMA için var, bkz. attachUser.js)
 *    ya da SUPABASE_SERVICE_ROLE_KEY'in kendisi kullanılmaz. Bu client HER
 *    ZAMAN anon key ile kurulur (asla service role) — RLS bu yüzden HİÇBİR
 *    zaman bypass edilemez; auth.uid() SADECE Authorization header'daki
 *    JWT'nin (Postgrest tarafından ayrıca, bağımsızca DOĞRULANAN) "sub"
 *    claim'inden gelir.
 *  - user_id kolonu YAZILIRKEN (insert/update WHERE koşulu) SADECE bu
 *    dosyaya parametre olarak geçirilen `userId` kullanılır — payload
 *    içindeki hiçbir user_id/userId alanı OKUNMAZ/GÜVENİLMEZ (bkz.
 *    mapClientToRow, payload'dan sadece BEYAZ LİSTELİ alanlar okunur).
 *  - RLS zaten yetkilendirme sınırı olduğu için update/delete sorguları
 *    ayrıca `.eq("user_id", userId)` ile de filtrelenir — bu bir savunma
 *    katmanı FAZLASI (defense in depth), RLS'in YERİNE geçmez.
 *  - access token hiçbir zaman loglanmaz.
 */
const { createClient } = require("@supabase/supabase-js");
const supabaseConfig = require("../config/supabase");

function PersistenceUnavailableError(message) {
  this.name = "PersistenceUnavailableError";
  this.message = message || "Game persistence is not available right now.";
  this.status = 503;
}
PersistenceUnavailableError.prototype = Object.create(Error.prototype);

function PersistenceError(message, status) {
  this.name = "PersistenceError";
  this.message = message || "Could not complete the requested game operation.";
  this.status = status || 500;
}
PersistenceError.prototype = Object.create(Error.prototype);

/**
 * İSTEK-BAZLI, çağıranın KENDİ access token'ıyla kurulan client. autoRefresh/
 * persistSession bilerek false (server/config/supabase.js'teki serverClient
 * İLE AYNI gerekçe: bu, kendi oturumunu yönetmeyen, tek-istek ömürlü bir
 * client). ANON key ile kurulur — service role KESİNLİKLE kullanılmaz, bu
 * yüzden RLS her zaman devrede kalır; Postgrest, `global.headers.Authorization`
 * içindeki JWT'yi KENDİSİ doğrular ve auth.uid()'i ondan türetir.
 */
function createRequestScopedClient(accessToken) {
  if (!supabaseConfig.isConfigured || !accessToken) return null;
  return createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: "Bearer " + accessToken } },
    // NODE 18 CRASH FIX: bkz. server/config/supabase.js'in REALTIME_DISABLED
    // notu -- bu createClient() çağrısı da (server/config/supabase.js'teki
    // İLE AYNI şekilde) createClient() anında bir RealtimeClient inşa
    // ediyor; `realtime.transport` verilmezse Node 18'de native WebSocket
    // arayışı hemen fırlatır. Bu servis Realtime'ı hiç kullanmadığı için
    // aynı, paylaşılan devre dışı bırakma seçeneği kullanılıyor.
    realtime: supabaseConfig.REALTIME_DISABLED,
  });
}

// TEST SEAM (SADECE server/tests/*.test.js kullanır): gerçek bir Supabase/
// Postgres bağlantısı OLMADAN route+service davranışını (ownership
// filtreleri, userId'nin HER ZAMAN parametre olarak geldiği, service-role
// key'in ASLA kullanılmadığı) test edebilmek için, hangi client fabrikasının
// çağrılacağını değiştirilebilir yapıyor. Production kodunun HİÇBİR yerinde
// bu override kullanılmaz -- varsayılan HER ZAMAN gerçek
// createRequestScopedClient'tır.
var activeClientFactory = createRequestScopedClient;

function requireClient(accessToken) {
  var client = activeClientFactory(accessToken);
  if (!client) throw new PersistenceUnavailableError();
  return client;
}

// Postgrest hata objesini (varsa) makul bir HTTP status'a çevirir. RLS
// "with check" ihlali tipik olarak 42501 (insufficient_privilege) code'u
// ile gelir -- bunu 403'e, geri kalanı 500'e (dürüst, teknik olmayan bir
// mesajla) haritalar. Hata mesajının KENDİSİ hiçbir zaman token/secret
// İÇERMEZ (Postgrest hataları zaten bunları içermez).
function toPersistenceError(error) {
  if (error && error.code === "42501") {
    return new PersistenceError("You do not have permission to modify this game.", 403);
  }
  return new PersistenceError("Could not reach the games database right now.", 502);
}

// ---------------------------------------------------------------------
// Frontend <-> games tablosu alan haritalama.
//
// games sütunları (bkz. supabase/migrations/20260917010000_..._schema.sql):
//   id, user_id, title, prompt, html, game_type, model, quality_score,
//   metadata (jsonb), created_at, updated_at
//
// Frontend game record'u (bkz. public/app.js buildGameRecordFromResult):
//   { id, title, titleIsCustom, prompt, html, meta, validation, gameType,
//     model, qualityScore, createdAt, updatedAt }
//
// meta/validation/titleIsCustom — üçü de tek bir `metadata` jsonb kolonunda
// paketlenir (görev: "Preserve useful existing metadata rather than
// throwing information away" — hiçbiri ATILMIYOR, sadece TEK bir sütuna
// gruplanıyor).
// ---------------------------------------------------------------------

function mapRowToClient(row) {
  var metadata = row.metadata || {};
  var qualityScore = row.quality_score;
  if (qualityScore !== null && qualityScore !== undefined && typeof qualityScore !== "number") {
    var parsed = Number(qualityScore);
    qualityScore = isNaN(parsed) ? null : parsed;
  }
  return {
    id: row.id,
    title: row.title || "Untitled Game",
    titleIsCustom: !!metadata.titleIsCustom,
    prompt: row.prompt || "",
    html: row.html || "",
    meta: metadata.meta !== undefined ? metadata.meta : null,
    validation: metadata.validation !== undefined ? metadata.validation : null,
    gameType: row.game_type || null,
    model: row.model || null,
    qualityScore: qualityScore === undefined ? null : qualityScore,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// BEYAZ LİSTE: payload'dan SADECE bu alanlar okunur — bir istemci payload'a
// `user_id`/`userId`/`id`/`created_at` gibi başka bir alan eklese bile
// HİÇBİRİ buradan geçip bir sütuna yazılamaz (görev md.1/md.3, KESİN).
function pickKnownFields(payload) {
  payload = payload || {};
  var picked = {};
  if (payload.title !== undefined) picked.title = payload.title;
  if (payload.prompt !== undefined) picked.prompt = payload.prompt;
  if (payload.html !== undefined) picked.html = payload.html;
  if (payload.gameType !== undefined) picked.gameType = payload.gameType;
  if (payload.model !== undefined) picked.model = payload.model;
  if (payload.qualityScore !== undefined) picked.qualityScore = payload.qualityScore;
  if (payload.meta !== undefined) picked.meta = payload.meta;
  if (payload.validation !== undefined) picked.validation = payload.validation;
  if (payload.titleIsCustom !== undefined) picked.titleIsCustom = payload.titleIsCustom;
  return picked;
}

// Yeni bir insert için TAM bir satır kurar (title/prompt/html hiç
// verilmemişse dürüst/boş varsayılanlar — mevcut buildGameRecordFromResult
// zaten HER ZAMAN bunları dolu gönderiyor, burası SADECE ek bir güvenlik ağı).
function buildInsertRow(userId, payload) {
  var p = pickKnownFields(payload);
  return {
    user_id: userId,
    title: p.title || "Untitled Game",
    prompt: p.prompt || "",
    html: p.html || "",
    game_type: p.gameType || null,
    model: p.model || null,
    quality_score: typeof p.qualityScore === "number" ? p.qualityScore : null,
    metadata: {
      meta: p.meta !== undefined ? p.meta : null,
      validation: p.validation !== undefined ? p.validation : null,
      titleIsCustom: !!p.titleIsCustom,
    },
  };
}

// Kısmi bir update için, SADECE payload'da GERÇEKTEN verilen alanları
// `existingRow`'un üzerine uygular -- metadata alt-alanları (meta/
// validation/titleIsCustom) tek tek birleştirilir (görev: "Preserve
// existing metadata unless intentionally updated" -- ör. sadece rename
// isteyen bir PUT, meta/validation'ı ASLA silmez).
function buildUpdateRow(existingRow, payload) {
  var p = pickKnownFields(payload);
  var row = {};
  if (p.title !== undefined) row.title = p.title;
  if (p.prompt !== undefined) row.prompt = p.prompt;
  if (p.html !== undefined) row.html = p.html;
  if (p.gameType !== undefined) row.game_type = p.gameType;
  if (p.model !== undefined) row.model = p.model;
  if (p.qualityScore !== undefined) row.quality_score = typeof p.qualityScore === "number" ? p.qualityScore : null;

  var touchesMetadata = p.meta !== undefined || p.validation !== undefined || p.titleIsCustom !== undefined;
  if (touchesMetadata) {
    var existingMetadata = (existingRow && existingRow.metadata) || {};
    row.metadata = Object.assign({}, existingMetadata);
    if (p.meta !== undefined) row.metadata.meta = p.meta;
    if (p.validation !== undefined) row.metadata.validation = p.validation;
    if (p.titleIsCustom !== undefined) row.metadata.titleIsCustom = !!p.titleIsCustom;
  }
  return row;
}

async function listGames(accessToken, userId) {
  var client = requireClient(accessToken);
  // .eq("user_id", userId) RLS'in ZATEN garanti ettiğini tekrarlayan bir
  // savunma katmanı -- userId SADECE çağıranın kendi doğrulanmış
  // req.userId'sinden gelir (bkz. routes/games.js).
  var result = await client
    .from("games")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (result.error) throw toPersistenceError(result.error);
  return (result.data || []).map(mapRowToClient);
}

async function createGame(accessToken, userId, payload) {
  var client = requireClient(accessToken);
  var row = buildInsertRow(userId, payload);
  var result = await client.from("games").insert(row).select().single();
  if (result.error) throw toPersistenceError(result.error);
  return mapRowToClient(result.data);
}

async function getOwnedGameRow(client, userId, gameId) {
  var result = await client.from("games").select("*").eq("id", gameId).eq("user_id", userId).maybeSingle();
  if (result.error) throw toPersistenceError(result.error);
  return result.data || null;
}

async function updateGame(accessToken, userId, gameId, payload) {
  var client = requireClient(accessToken);
  var existing = await getOwnedGameRow(client, userId, gameId);
  if (!existing) return null; // bulunamadı VEYA başka bir kullanıcıya ait -- ikisi de aynı, dürüst 404
  var row = buildUpdateRow(existing, payload);
  var result = await client
    .from("games")
    .update(row)
    .eq("id", gameId)
    .eq("user_id", userId)
    .select()
    .single();
  if (result.error) throw toPersistenceError(result.error);
  return mapRowToClient(result.data);
}

async function deleteGame(accessToken, userId, gameId) {
  var client = requireClient(accessToken);
  var result = await client
    .from("games")
    .delete()
    .eq("id", gameId)
    .eq("user_id", userId)
    .select();
  if (result.error) throw toPersistenceError(result.error);
  return !!(result.data && result.data.length > 0);
}

async function duplicateGame(accessToken, userId, gameId) {
  var client = requireClient(accessToken);
  var existing = await getOwnedGameRow(client, userId, gameId);
  if (!existing) return null;
  var copyRow = {
    user_id: userId,
    title: (existing.title || "Untitled Game") + " Copy",
    prompt: existing.prompt,
    html: existing.html,
    game_type: existing.game_type,
    model: existing.model,
    quality_score: existing.quality_score,
    // md.11 (mevcut local davranışla AYNI): kopyanın adı sabit kalsın, bir
    // sonraki Improve/Fix onu geri almasın.
    metadata: Object.assign({}, existing.metadata, { titleIsCustom: true }),
  };
  var result = await client.from("games").insert(copyRow).select().single();
  if (result.error) throw toPersistenceError(result.error);
  return mapRowToClient(result.data);
}

module.exports = {
  listGames: listGames,
  createGame: createGame,
  updateGame: updateGame,
  deleteGame: deleteGame,
  duplicateGame: duplicateGame,
  PersistenceUnavailableError: PersistenceUnavailableError,
  PersistenceError: PersistenceError,
  // Test/iç kullanım için dışa açık — gerçek bir Supabase bağlantısı
  // OLMADAN saf fonksiyon davranışını (alan haritalama/beyaz liste) test
  // edebilmek için.
  _internal: {
    mapRowToClient: mapRowToClient,
    buildInsertRow: buildInsertRow,
    buildUpdateRow: buildUpdateRow,
    pickKnownFields: pickKnownFields,
    createRequestScopedClient: createRequestScopedClient,
    // SADECE testler için -- bkz. yukarıdaki "TEST SEAM" notu.
    setClientFactoryForTests: function (fn) {
      activeClientFactory = fn;
    },
    resetClientFactoryForTests: function () {
      activeClientFactory = createRequestScopedClient;
    },
  },
};
