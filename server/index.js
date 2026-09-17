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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

// API rotaları
app.use("/api", generateRouter);
app.use("/api", autofixRouter);
app.use("/api", improveRouter);
app.use("/api", assetsRouter);
app.use("/api", modelsRouter);
app.use("/api", assetLibrariesRouter);

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
