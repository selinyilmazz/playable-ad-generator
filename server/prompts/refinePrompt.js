/**
 * Auto-Fix ve Improve with AI, aynı "mevcut HTML + talimat -> güncellenmiş HTML"
 * kalıbını paylaşır. Bu dosya o ikisinin ortak prompt inşasını tutar.
 */
const SYSTEM_PROMPT = require("./systemPrompt");

function buildRefineSystemPrompt() {
  return (
    SYSTEM_PROMPT +
    "\n\nEK GÖREV:\nSana daha önce üretilmiş bir playable ad HTML'i ve bir talimat verilecek. " +
    "Talimata göre HTML'i güncelle/düzelt. Yukarıdaki KATI KURALLAR'ın tamamı hâlâ geçerli " +
    "(tek dosya, dış kaynak yok, localStorage yok, vb.). Oyunun genel temasını ve çalışan " +
    "kısımlarını korumadan gereksiz yere değiştirme — sadece talimatta istenen değişikliği yap. " +
    "Sadece güncellenmiş, tam ve tek dosyalık HTML'i döndür; açıklama veya markdown ekleme."
  );
}

function buildRefineUserMessage(html, instruction) {
  return "TALİMAT:\n" + instruction + "\n\nMEVCUT HTML:\n" + html;
}

module.exports = {
  buildRefineSystemPrompt: buildRefineSystemPrompt,
  buildRefineUserMessage: buildRefineUserMessage,
};
