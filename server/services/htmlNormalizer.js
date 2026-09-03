/**
 * LLM'den gelen ham metni güvenilir, çalıştırılabilir bir HTML dokümanına
 * normalize eder. Üç adım:
 *
 *  1) Markdown code fence varsa temizle (```html ... ``` gibi).
 *  2) <html>...</html> dışında kalan açıklama/ön-son metin varsa at.
 *  3) <body> AÇILIŞINDAN ÖNCE (yani <head> içinde) kalmış <script> blokları
 *     varsa </body>'nin hemen öncesine taşı.
 *
 * (3) somut bir hatayı düzeltir: <script> DOM henüz oluşmadan (<head> içinde,
 * body elementlerinden önce) çalışırsa document.getElementById(...) çağrıları
 * null döner ve PLAY/START gibi butonlara event listener hiç bağlanmaz —
 * buton "çalışmıyormuş" gibi görünür. Bu normalize adımı, LLM sistem
 * promptuna uymasa bile bunu güvenli şekilde telafi eder.
 *
 * Taşıma işlemi SADECE script'in konumunu değiştirir, içeriğine dokunmaz —
 * bu yüzden global fonksiyon/değişken tanımları (onclick="..." attribute'ların
 * ihtiyaç duyduğu global scope) bozulmaz. (Bir closure'a sarmak bu garantiyi
 * bozacağı için bilerek yapılmıyor.)
 *
 * ÖNEMLİ — bu dosya SADECE güvenli, yapısal normalization yapar:
 * - Oyunun JS/HTML mantığına, değişken/fonksiyon isimlerine, solver/oyun
 *   kurallarına hiç dokunmaz.
 * - Truncated/eksik çıktıyı "düzeltmeye" ÇALIŞMAZ (örn. eksik </script>'i
 *   uydurarak kapatmaz) — bu, gerçekte çalışmayan bir kodu çalışıyormuş gibi
 *   göstermek olurdu. Eksik/yarım kalmış çıktının PLAY'e gönderilmemesi
 *   sorumluluğu bilerek bu dosyada değil, validation (checks.js) + frontend
 *   (app.js) katmanında — PLAY'e SADECE görünüşte tamam olan HTML gider,
 *   gerçekten tamam olup olmadığını (syntax vs.) checks.js karar verir.
 */

function stripCodeFence(text) {
  var trimmed = text.trim();
  var fenceMatch = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function extractHtmlDocument(text) {
  var withDoctype = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
  if (withDoctype) return withDoctype[0];
  var htmlOnly = text.match(/<html[\s\S]*<\/html>/i);
  return htmlOnly ? htmlOnly[0] : text;
}

function moveHeadScriptsToBodyEnd(html) {
  var bodyOpenMatch = html.match(/<body[^>]*>/i);
  if (!bodyOpenMatch) return html; // <body> yoksa güvenli bir taşıma yapılamaz, dokunma

  var bodyOpenIndex = bodyOpenMatch.index;
  var head = html.slice(0, bodyOpenIndex);
  var rest = html.slice(bodyOpenIndex);

  var scriptRe = /<script[^>]*>[\s\S]*?<\/script>/gi;
  var movedScripts = [];
  var newHead = head.replace(scriptRe, function (block) {
    movedScripts.push(block);
    return "";
  });

  if (movedScripts.length === 0) return html; // taşınacak bir şey yok, orijinali koru

  // Taşınan script'leri, body içinde zaten var olan İLK <script>'ten hemen
  // önce ekle (varsa) — böylece orijinal kaynak sırası (head script'leri
  // body script'lerinden önce tanımlanmıştı) olabildiğince korunur. Body'de
  // hiç script yoksa </body>'den hemen önce ekle.
  var firstBodyScriptIdx = rest.search(/<script[^>]*>/i);
  var insertIdx;
  if (firstBodyScriptIdx !== -1) {
    insertIdx = firstBodyScriptIdx;
  } else {
    var bodyCloseIdx = rest.search(/<\/body>/i);
    if (bodyCloseIdx === -1) {
      var htmlCloseIdx = rest.search(/<\/html>/i);
      insertIdx = htmlCloseIdx === -1 ? rest.length : htmlCloseIdx;
    } else {
      insertIdx = bodyCloseIdx;
    }
  }

  return newHead + rest.slice(0, insertIdx) + movedScripts.join("\n") + rest.slice(insertIdx);
}

/**
 * Üretilen HTML'in kritik kapanışlarının GERÇEKTEN var olup olmadığını
 * raporlar (sadece okur, hiçbir şeyi değiştirmez/uydurmaz). generate.js /
 * checks.js bu bilgiyi validation'a dahil edebilir; frontend PLAY'e
 * göndermeden önce bu sinyali kullanabilir.
 */
function analyzeStructuralCompleteness(html) {
  var lower = (html || "").toLowerCase();
  var hasHtmlOpen = lower.indexOf("<html") !== -1;
  var hasHtmlClose = lower.indexOf("</html>") !== -1;
  var hasBodyOpen = lower.indexOf("<body") !== -1;
  var hasBodyClose = lower.indexOf("</body>") !== -1;
  var scriptOpenCount = (lower.match(/<script[^>]*>/g) || []).length;
  var scriptCloseCount = (lower.match(/<\/script>/g) || []).length;
  var hasUnclosedScript = scriptOpenCount > scriptCloseCount;

  var complete =
    hasHtmlOpen && hasHtmlClose && hasBodyOpen && hasBodyClose && !hasUnclosedScript && scriptOpenCount > 0;

  var reasons = [];
  if (!hasHtmlOpen) reasons.push("<html> açılışı yok");
  if (!hasHtmlClose) reasons.push("</html> kapanışı yok");
  if (!hasBodyOpen) reasons.push("<body> açılışı yok");
  if (!hasBodyClose) reasons.push("</body> kapanışı yok");
  if (scriptOpenCount === 0) reasons.push("<script> hiç yok");
  if (hasUnclosedScript) reasons.push("<script> kapanmamış (muhtemelen kesilmiş yanıt)");

  return { complete: complete, reasons: reasons };
}

function normalizeGeneratedHtml(rawText) {
  var stripped = stripCodeFence(rawText);
  var extracted = extractHtmlDocument(stripped);
  var fixed = moveHeadScriptsToBodyEnd(extracted);
  return fixed.trim();
}

module.exports = {
  normalizeGeneratedHtml: normalizeGeneratedHtml,
  stripCodeFence: stripCodeFence,
  analyzeStructuralCompleteness: analyzeStructuralCompleteness,
};
