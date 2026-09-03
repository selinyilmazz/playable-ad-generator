/**
 * TEŞHİS AMAÇLI, GEÇİCİ script — proje koduna hiçbir bağımlılığı/etkisi yok.
 * Sadece OpenRouter bağlantısını teşhis eder. API key DEĞERİNİ hiçbir yerde
 * yazdırmaz — sadece "bulundu/bulunamadı" ve OpenRouter'dan dönen (secret
 * içermeyen) limit/kredi/HTTP durum bilgilerini yazdırır.
 *
 * Kullanım: proje kök dizininde (package.json'un yanında) çalıştırın:
 *   node diagnose-openrouter.js
 *
 * İşiniz bitince bu dosyayı silebilirsiniz — projenin bir parçası değildir.
 */
require("dotenv").config();
const modelConfig = require("./server/config/models");

const apiKey = process.env.OPENROUTER_API_KEY;
const hasKey = typeof apiKey === "string" && apiKey.trim().length > 0;

console.log("== STEP 1: .env içinde OPENROUTER_API_KEY ==");
console.log(hasKey ? "BULUNDU (uygulama okuyor)" : "BULUNAMADI");

console.log("\n== STEP 2: Çözümlenen OPENROUTER_MODEL ==");
console.log(modelConfig.model);

async function main() {
  if (!hasKey) {
    console.log("\nKey bulunamadığı için API testleri atlanıyor.");
    return;
  }

  console.log("\n== STEP 3/4: Key/kredi durumu (openrouter.ai/api/v1/key) ==");
  try {
    const keyRes = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: "Bearer " + apiKey },
    });
    const keyJson = await keyRes.json().catch(() => null);
    console.log("HTTP status: " + keyRes.status);
    if (keyJson && keyJson.data) {
      const d = keyJson.data;
      console.log("label: " + d.label);
      console.log("usage: " + d.usage);
      console.log("limit: " + d.limit);
      console.log("limit_remaining: " + d.limit_remaining);
      console.log("is_free_tier: " + d.is_free_tier);
      console.log("rate_limit: " + JSON.stringify(d.rate_limit));
    } else {
      console.log("Yanıt: " + JSON.stringify(keyJson));
    }
  } catch (e) {
    console.log("HATA: " + e.message);
  }

  console.log("\n== STEP 5: Minimal test isteği (model: " + modelConfig.model + ") ==");
  try {
    const body = {
      model: modelConfig.model,
      max_tokens: 20,
      messages: [{ role: "user", content: "Reply with exactly: TEST_OK" }],
    };
    const res = await fetch(modelConfig.apiUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "HTTP-Referer": modelConfig.appUrl,
        "X-Title": modelConfig.appName,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log("HTTP status: " + res.status);
    console.log("Body: " + text.slice(0, 800));
  } catch (e) {
    console.log("HATA: " + e.message);
  }
}

main();
