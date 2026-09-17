/**
 * SUPABASE AUTHENTICATION FOUNDATION round — GET /api/auth/config.
 *
 * Frontend'in Supabase browser client'ını başlatabilmesi için gereken
 * SADECE iki public-safe değeri (url + anon key) servis eder — AYNI
 * `GET /api/models`in server-held config'i frontend'e servis etme
 * DESENİ. GÜVENLİK: supabaseConfig.publicConfig zaten service role key'i
 * HİÇ içermiyor (bkz. server/config/supabase.js) — bu route o objeyi
 * OLDUĞU GİBİ döner, ekstra bir alan eklemez.
 */
const express = require("express");
const supabaseConfig = require("../config/supabase");

const router = express.Router();

router.get("/auth/config", function (req, res) {
  res.json(supabaseConfig.publicConfig);
});

module.exports = router;
