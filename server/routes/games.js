/**
 * PERSISTENT MY GAMES round — /api/games CRUD.
 *
 * Bu router'ın TÜM route'ları kimlik doğrulaması İSTER (requireAuth, hemen
 * aşağıda) — bu, attachUser middleware'inin GENEL kuralından ("hiçbir
 * isteği reddetme") KASITLI bir istisna: My Games persistence'ı KENDİSİ
 * bir hesap gerektiren bir özellik (görev md. "Every authenticated request
 * must be associated with req.user/req.userId"). attachUser'ın kendisi
 * DEĞİŞMEDİ/gevşetilmedi — sadece BU router, req.userId yoksa 401 döner.
 * Anonim kullanıcılar zaten bu endpoint'lere hiç istek ATMAZ (bkz.
 * public/app.js isGameLibraryRemote() -- sadece signed-in iken çağrılır).
 *
 * GÜVENLİK (KESİN): userId HİÇBİR route handler'da req.body/req.query'den
 * OKUNMAZ -- HER ZAMAN req.userId (attachUser'ın doğruladığı) kullanılır.
 */
const express = require("express");
const gamePersistence = require("../services/gamePersistence");

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Sign in required to access your saved games." });
  }
  next();
}

function handlePersistenceError(res, err) {
  if (err instanceof gamePersistence.PersistenceUnavailableError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof gamePersistence.PersistenceError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Beklenmeyen bir hata -- token/secret İÇERMEYEN jenerik bir mesaj
  // logla (görev: "access token'ı ASLA loglama" -- err.message Postgrest/
  // SDK hatası olduğu için zaten bir token TAŞIMAZ, ama yine de sadece
  // mesajı logluyoruz, tüm err objesini/header'ları DEĞİL).
  console.error("[games] beklenmeyen hata:", err && err.message);
  return res.status(500).json({ error: "Could not complete this request right now." });
}

router.use("/games", requireAuth);

router.get("/games", async function (req, res) {
  try {
    var games = await gamePersistence.listGames(req.accessToken, req.userId);
    res.json({ games: games });
  } catch (err) {
    handlePersistenceError(res, err);
  }
});

router.post("/games", async function (req, res) {
  try {
    var game = await gamePersistence.createGame(req.accessToken, req.userId, req.body || {});
    res.status(201).json({ game: game });
  } catch (err) {
    handlePersistenceError(res, err);
  }
});

router.put("/games/:id", async function (req, res) {
  try {
    var game = await gamePersistence.updateGame(req.accessToken, req.userId, req.params.id, req.body || {});
    if (!game) return res.status(404).json({ error: "Game not found." });
    res.json({ game: game });
  } catch (err) {
    handlePersistenceError(res, err);
  }
});

router.delete("/games/:id", async function (req, res) {
  try {
    var deleted = await gamePersistence.deleteGame(req.accessToken, req.userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Game not found." });
    res.status(204).end();
  } catch (err) {
    handlePersistenceError(res, err);
  }
});

router.post("/games/:id/duplicate", async function (req, res) {
  try {
    var game = await gamePersistence.duplicateGame(req.accessToken, req.userId, req.params.id);
    if (!game) return res.status(404).json({ error: "Game not found." });
    res.status(201).json({ game: game });
  } catch (err) {
    handlePersistenceError(res, err);
  }
});

module.exports = router;
