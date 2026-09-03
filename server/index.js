require("dotenv").config();

const path = require("path");
const express = require("express");
const generateRouter = require("./routes/generate");
const autofixRouter = require("./routes/autofix");
const improveRouter = require("./routes/improve");
// PHASE 5: salt-okunur GET /api/assets — bkz. routes/assets.js
const assetsRouter = require("./routes/assets");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

// API rotaları
app.use("/api", generateRouter);
app.use("/api", autofixRouter);
app.use("/api", improveRouter);
app.use("/api", assetsRouter);

// Statik frontend (public/)
app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, function () {
  var hasKey = !!process.env.OPENROUTER_API_KEY;
  console.log("Playable Ad Generator http://localhost:" + PORT + " adresinde çalışıyor.");
  console.log(
    hasKey
      ? "OpenRouter key bulundu -> gerçek LLM çağrıları yapılacak."
      : "OpenRouter key YOK -> mock mod aktif (generate/autofix/improve mock davranışına düşecek)."
  );
});
