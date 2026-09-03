# Prompt → Playable Ad Generator (MVP)

Kullanıcının doğal dille yazdığı bir prompt'u OpenRouter üzerinden bir LLM'e
gönderip, tarayıcıda gerçekten oynanabilir tek dosyalık bir HTML/CSS/JS mini
oyun (playable ad) üreten prototip.

Bu proje **Stretchy Studio** projesinden tamamen bağımsızdır.

## Hızlı başlangıç (Windows)

```bash
npm install
npm run dev
```

Sonra tarayıcıda `http://localhost:3000` adresini aç.

## OpenRouter key ekleme

1. `.env.example` dosyasını `.env` olarak kopyala.
2. `OPENROUTER_API_KEY=` satırına Ali Bey'in sağlayacağı key'i yapıştır.
3. Sunucuyu yeniden başlat (`npm run dev`).

Key yokken uygulama otomatik olarak **mock modda** çalışır: gerçek bir
OpenRouter çağrısı yapmak yerine hazır bir "fruit puzzle" örneği döner.
Bu sayede tüm akış (prompt → generate → preview) key gelmeden de uçtan uca
test edilebilir. Arayüzün sağ üstündeki rozet o an mock modda mı yoksa
gerçek (LIVE) modda mı olduğunu gösterir.

Kullanılacak model `server/config/models.js` içinde tanımlıdır; değiştirmek
için ya bu dosyayı ya da `.env` içindeki `OPENROUTER_MODEL` değerini
güncelle.

## Mimari

```
Prompt (frontend)
   → POST /api/generate (server/routes/generate.js)
       → generate  (server/services/openrouter.js — LLM çağrısı veya mock)
       → validate  (server/services/validate.js — basit HTML kontrolü)
   → JSON { html, valid, warnings, meta }
   → frontend, html'i <iframe sandbox="allow-scripts"> içine srcdoc olarak yazar
   → oyun tarayıcıda gerçekten çalışır
```

`generate → validate → preview` adımları ayrı fonksiyonlar olarak
yazıldı; ileride bu zincire yeni adımlar (asset generation, background
removal vb.) eklenmesi kolay olacak şekilde tasarlandı. Şu an için
gereksiz bir agent/MCP orkestrasyonu YOK — düz bir fonksiyon zinciri var.

## Klasör yapısı

```
server/
  index.js            Express sunucusu (statik dosyalar + API)
  routes/generate.js  POST /api/generate
  services/openrouter.js  OpenRouter çağrısı + mock fallback
  services/validate.js    Üretilen HTML için basit doğrulama
  config/models.js    Model/parametre ayarları (tek yerden yönetilir)
  prompts/systemPrompt.js  LLM'e gönderilen sabit sistem promptu
  mock/fruitPuzzle.html    Key olmadan test için hazır örnek oyun
public/
  index.html, style.css, app.js   Sade tek sayfa arayüz
```

## Güvenlik notu

`OPENROUTER_API_KEY` yalnızca sunucu tarafında (`process.env`) okunur ve
asla frontend'e gönderilmez; `.env` dosyası `.gitignore`'dadır.
