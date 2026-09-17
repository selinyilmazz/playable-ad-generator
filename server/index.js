require("dotenv").config();

const path = require("path");
const express = require("express");
const generateRouter = require("./routes/generate");
const autofixRouter = require("./routes/autofix");
const improveRouter = require("./routes/improve");
// PHASE 5: salt-okunur GET /api/assets — bkz. routes/assets.js
const assetsRouter = require("./routes/assets");
// AI MODEL SELECTOR round: salt-okunur GET /api/models — bkz. routes/models.js
const modelsRouter = require("./routes/models");
// CUSTOM ASSET LIBRARY round: POST/GET /api/assets/libraries — bkz.
// routes/assetLibraries.js
const assetLibrariesRouter = require("./routes/assetLibraries");
// SUPABASE AUTHENTICATION FOUNDATION round — OPSİYONEL kimlik doğrulama.
// attachUser HİÇBİR isteği reddetmez/bloklamaz, SADECE geçerli bir
// Authorization: Bearer <token> varsa req.user/req.userId'i doldurur;
// yoksa/geçersizse istek anonim olarak mevcut davranışıyla devam eder.
// Bu yüzden mevcut router'lardan ÖNCE (görev md.3 gereği) ama onlarınla
// AYNI güvenlik modelini bozmadan mount ediliyor.
const { attachUser } = require("./middleware/attachUser");
const authConfigRouter = require("./routes/authConfig");
// PERSISTENT MY GAMES round — /api/games CRUD, sadece signed-in kullanıcılar
// için (bkz. routes/games.js'in kendi requireAuth'u). attachUser'ın GENEL
// "hiçbir isteği reddetme" kuralı DEĞİŞMEDİ — bu router KENDİ İÇİNDE 401
// döner, diğer HİÇBİR route'u etkilemez.
const gamesRouter = require("./routes/games");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

// SUPABASE AUTHENTICATION FOUNDATION round — mevcut API router'larından
// ÖNCE mount edilir (görev gereği), ama HİÇBİR mevcut route'u etkilemez:
// attachUser sadece req.user/req.userId'i (opsiyonel) doldurur, hiçbir
// isteği reddetmez.
app.use("/api", attachUser);
app.use("/api", authConfigRouter);

// API rotaları
app.use("/api", generateRouter);
app.use("/api", autofixRouter);
app.use("/api", improveRouter);
app.use("/api", assetsRouter);
app.use("/api", modelsRouter);
app.use("/api", assetLibrariesRouter);
app.use("/api", gamesRouter);

// Statik frontend (public/)
app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, function () {
  // PRODUCTION BYOK SECURITY FIX — bu log artık ALLOW_SERVER_API_KEY'i de
  // hesaba katıyor: .env'de OPENROUTER_API_KEY tanımlı olması ARTIK TEK
  // BAŞINA "gerçek LLM çağrıları yapılacak" anlamına gelmiyor (bkz.
  // openrouterClient.resolveEffectiveApiKey) — flag açık değilse (production
  // varsayılanı) server-side key HİÇBİR isteğe otomatik kullanılmaz, SADECE
  // kullanıcının kendi BYOK key'i ile gerçek çağrı yapılabilir. Bu, hiçbir
  // davranışı DEĞİŞTİRMİYOR, sadece başlangıç logunun artık YANILTICI
  // olmamasını sağlıyor.
  var hasKey = !!process.env.OPENROUTER_API_KEY;
  var allowServerKey = process.env.ALLOW_SERVER_API_KEY === "true";
  console.log("Playable Ad Generator http://localhost:" + PORT + " adresinde çalışıyor.");
  if (allowServerKey && hasKey) {
    console.log("OpenRouter server-side key AKTİF (ALLOW_SERVER_API_KEY=true) -> BYOK olmadan da gerçek LLM çağrıları yapılabilir.");
  } else if (hasKey) {
    console.log(
      "OpenRouter key .env'de var ama ALLOW_SERVER_API_KEY=true DEĞİL -> server-side key KULLANILMAYACAK " +
        "(production-safe varsayılan). Gerçek LLM çağrısı SADECE kullanıcının kendi BYOK key'iyle yapılabilir; " +
        "BYOK yoksa generate/autofix/improve mock davranışına düşer."
    );
  } else {
    console.log("OpenRouter key YOK -> mock mod aktif (BYOK yoksa generate/autofix/improve mock davranışına düşecek).");
  }
});
