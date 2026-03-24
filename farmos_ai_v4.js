/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║       BİZİM ÇİFTLİK — AI SÜPER MODÜL v4.0                      ║
 * ║  1. Sesli Komut ile Kayıt (Web Speech API + Groq)               ║
 * ║  2. Fotoğraftan Hastalık Tespiti (Kamera + Gemini Vision)       ║
 * ║  3. Otomatik Günlük Görev Planlama AI                           ║
 * ║  4. Genetik Soy Ağacı + Verim Tahmini (D3.js)                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Kurulum: farmos.html içinde </body> öncesine ekleyin:
 *   <script src="farmos_ai_v4.js"></script>
 *
 * Sonra ana navigasyona menü öğelerini ekleyin (initAIModule çağrısı otomatik yapar)
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// YARDIMCI: D ile mevcut state'e güvenli erişim
// ─────────────────────────────────────────────────────────────────────────────
const AI4 = {

  // ── Groq key al ──────────────────────────────────────────────────────────
  groqKey() {
    return (typeof getGroqKey === 'function' ? getGroqKey() : '') ||
           (window.D?.settings?.groq_key) ||
           localStorage.getItem('_groq_key') || '';
  },

  geminiKey() {
    return window.D?.settings?.gemini_key || localStorage.getItem('_gemini_key') || '';
  },

  // ── Groq çağrısı ─────────────────────────────────────────────────────────
  async groq(prompt, system = '', maxTokens = 1200) {
    const key = this.groqKey();
    if (!key) throw new Error('Groq API key girilmemiş. Ayarlar → AI sekmesinden ekleyin.');
    const msgs = [];
    if (system) msgs.push({ role: 'system', content: system });
    msgs.push({ role: 'user', content: prompt });
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: window.D?.settings?.aimodel || 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
        messages: msgs,
        temperature: 0.65
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error?.message || 'HTTP ' + r.status);
    }
    const d = await r.json();
    return d.choices?.[0]?.message?.content || '';
  },

  // ── Gemini Vision çağrısı ─────────────────────────────────────────────────
  async geminiVision(base64img, prompt, mimeType = 'image/jpeg') {
    const key = this.geminiKey();
    if (!key) throw new Error('Gemini API key girilmemiş. Ayarlar → AI sekmesinden ekleyin.');
    const model = window.D?.settings?.gemini_model || 'gemini-1.5-flash';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64img } },
              { text: prompt }
            ]
          }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.4 }
        })
      }
    );
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error?.message || 'Gemini HTTP ' + r.status);
    }
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  // ── Çiftlik bağlamı özeti ─────────────────────────────────────────────────
  farmContext() {
    if (typeof farmCtx === 'function') return farmCtx();
    const D = window.D || {};
    return `Çiftlik: ${D.settings?.farm_name||'Bizim Çiftlik'} | Hayvan: ${D.animals?.length||0} | Hasta: ${D.animals?.filter(a=>a.status==='Hasta').length||0}`;
  },

  // ── Toast göster ──────────────────────────────────────────────────────────
  toast(msg, type = 'gr') {
    if (typeof showToast === 'function') showToast(msg, type);
    else console.log('[AI4]', msg);
  },

  // ── Modal aç ─────────────────────────────────────────────────────────────
  modal(title, html) {
    const ov = document.getElementById('ov');
    const md = document.getElementById('md');
    const mdTitle = document.getElementById('md-title');
    const mdBody = document.getElementById('md-body');
    if (!ov || !md) {
      // Fallback modal
      const el = document.createElement('div');
      el.id = 'ai4-modal';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
      el.innerHTML = `<div style="background:var(--card,#fff);border-radius:16px;padding:24px;width:min(720px,96vw);max-height:90vh;overflow-y:auto;border:1px solid var(--brd,#e2e8f0);box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <h3 style="font-size:16px;font-weight:700">${title}</h3>
          <button onclick="document.getElementById('ai4-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--sub,#888)">✕</button>
        </div>
        <div>${html}</div>
      </div>`;
      el.addEventListener('click', e => { if (e.target === el) el.remove(); });
      document.body.appendChild(el);
      return;
    }
    if (mdTitle) mdTitle.textContent = title;
    if (mdBody) mdBody.innerHTML = html;
    ov.style.display = 'block';
    md.style.display = 'block';
  },

  closeModal() {
    if (typeof closeModal === 'function') closeModal();
    document.getElementById('ai4-modal')?.remove();
  }
};


// ═════════════════════════════════════════════════════════════════════════════
// 1. SESLİ KOMUT İLE KAYIT
// ═════════════════════════════════════════════════════════════════════════════
const VoiceRecord = {
  recognition: null,
  isListening: false,
  transcript: '',
  _timerInterval: null,
  _seconds: 0,

  supported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  init() {
    if (!this.supported()) return false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.lang = 'tr-TR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) this.transcript += ' ' + final.trim();
      this._updateDisplay(this.transcript.trim(), interim);
    };

    this.recognition.onerror = (e) => {
      this._setStatus('Hata: ' + e.error, 'error');
      this.stop();
    };

    this.recognition.onend = () => {
      if (this.isListening) this.recognition.start(); // continuous
    };

    return true;
  },

  open() {
    AI4.modal('🎙️ Sesli Komut ile Kayıt', this._html());
    setTimeout(() => this._bindEvents(), 100);
  },

  _html() {
    const supported = this.supported();
    return `
<style>
#voice-modal { font-family: inherit; }
.vm-orb-wrap { display:flex;justify-content:center;margin:20px 0; }
.vm-orb {
  width:90px;height:90px;border-radius:50%;
  background:var(--accent,#2fb344);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:all .2s;
  box-shadow:0 0 0 0 rgba(47,179,68,.4);
  border:none;
}
.vm-orb:hover { transform:scale(1.06); }
.vm-orb.listening {
  animation:pulse-ring 1.5s ease-out infinite;
  background:#ef4444;
  box-shadow:0 0 0 0 rgba(239,68,68,.4);
}
@keyframes pulse-ring {
  0%   { box-shadow:0 0 0 0 rgba(239,68,68,.4); }
  70%  { box-shadow:0 0 0 22px rgba(239,68,68,0); }
  100% { box-shadow:0 0 0 0 rgba(239,68,68,0); }
}
.vm-orb svg { width:34px;height:34px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round; }
.vm-timer { text-align:center;font-size:13px;color:var(--sub,#888);margin-bottom:6px; }
.vm-status { text-align:center;font-size:12px;padding:6px 12px;border-radius:20px;margin:8px auto;display:inline-block;background:var(--bg,#f4f6f8); }
.vm-transcript {
  min-height:80px;padding:12px;border:1px solid var(--brd,#e2e8f0);
  border-radius:10px;background:var(--bg,#f4f6f8);font-size:13px;
  line-height:1.6;color:var(--txt,#1a1d23);margin:10px 0;
  transition:border .2s;
}
.vm-transcript.active { border-color:var(--accent,#2fb344); }
.vm-interim { color:var(--sub,#888);font-style:italic; }
.vm-examples {
  background:var(--bg,#f4f6f8);border-radius:10px;padding:12px;
  font-size:11.5px;color:var(--sub,#888);margin:10px 0;
  border:1px solid var(--brd,#e2e8f0);
}
.vm-examples div { padding:3px 0; }
.vm-parse-result {
  background:var(--card,#fff);border:1px solid var(--accent,#2fb344);
  border-radius:10px;padding:14px;margin:10px 0;display:none;
}
.vm-parse-title { font-size:12px;font-weight:700;color:var(--accent,#2fb344);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px; }
.vm-field { display:flex;gap:8px;padding:4px 0;font-size:12.5px; }
.vm-field-key { color:var(--sub,#888);min-width:120px; }
.vm-field-val { font-weight:600; }
.vm-actions { display:flex;gap:8px;flex-wrap:wrap;margin-top:14px; }
</style>
<div id="voice-modal">
  ${!supported ? `<div style="padding:16px;background:#fee2e2;border-radius:10px;color:#dc2626;text-align:center">
    ⚠️ Tarayıcınız ses tanımayı desteklemiyor. Chrome veya Edge kullanın.
  </div>` : `
  <div style="text-align:center">
    <div class="vm-orb-wrap">
      <button class="vm-orb" id="vm-orb-btn" onclick="VoiceRecord.toggle()">
        <svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8"/></svg>
      </button>
    </div>
    <div class="vm-timer" id="vm-timer">00:00</div>
    <div style="text-align:center"><span class="vm-status" id="vm-status">Mikrofon butonuna bas ve konuş</span></div>
  </div>

  <div class="vm-transcript" id="vm-transcript">
    <span style="color:var(--sub,#888);font-style:italic">Ses kaydı burada görünecek...</span>
  </div>

  <div class="vm-examples">
    <div style="font-weight:700;margin-bottom:4px;color:var(--txt,#1a1d23)">Örnek komutlar:</div>
    <div>🐄 "TR045 bugün 3 litre süt verdi, hafif öksürük var"</div>
    <div>💉 "KY012'ye şap aşısı vurdum, maliyet 150 lira, veteriner Mehmet Bey"</div>
    <div>📋 "Yarın sabah ahır temizliği yapılacak, Hasan'a ata"</div>
    <div>💰 "Bugün 50 kilo yem aldım, 800 lira ödedim Akhisar Kooperatifine"</div>
    <div>⚖️ "KZ003 tartıldı 28 kilogram"</div>
  </div>

  <div class="vm-parse-result" id="vm-parse-result">
    <div class="vm-parse-title" id="vm-parse-title">Tespit Edilen Kayıt</div>
    <div id="vm-parse-fields"></div>
  </div>

  <div class="vm-actions">
    <button class="btn btn-sec" id="vm-clear-btn" onclick="VoiceRecord.clearTranscript()" style="display:none">Temizle</button>
    <button class="btn btn-pr" id="vm-parse-btn" onclick="VoiceRecord.parseAndShow()" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>
      AI ile Analiz Et
    </button>
    <button class="btn btn-pr" id="vm-save-btn" onclick="VoiceRecord.saveRecord()" style="display:none;background:#16a34a">
      ✓ Kaydet
    </button>
  </div>
  `}
</div>`;
  },

  _bindEvents() {
    if (!this.supported()) return;
    this.init();
    this.transcript = '';
    this.isListening = false;
    this._seconds = 0;
  },

  toggle() {
    if (this.isListening) this.stop();
    else this.start();
  },

  start() {
    if (!this.recognition) this.init();
    this.isListening = true;
    this.transcript = '';
    this.recognition.start();
    document.getElementById('vm-orb-btn')?.classList.add('listening');
    this._setStatus('🔴 Dinleniyor... Konuşun', 'active');
    this._seconds = 0;
    clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => {
      this._seconds++;
      const m = String(Math.floor(this._seconds / 60)).padStart(2, '0');
      const s = String(this._seconds % 60).padStart(2, '0');
      const el = document.getElementById('vm-timer');
      if (el) el.textContent = m + ':' + s;
    }, 1000);
  },

  stop() {
    this.isListening = false;
    try { this.recognition?.stop(); } catch(e) {}
    clearInterval(this._timerInterval);
    document.getElementById('vm-orb-btn')?.classList.remove('listening');
    this._setStatus('⏹ Kayıt durduruldu', '');
    if (this.transcript.trim()) {
      document.getElementById('vm-parse-btn').style.display = '';
      document.getElementById('vm-clear-btn').style.display = '';
    }
  },

  _setStatus(msg, cls) {
    const el = document.getElementById('vm-status');
    if (el) el.textContent = msg;
  },

  _updateDisplay(final, interim) {
    const el = document.getElementById('vm-transcript');
    if (!el) return;
    el.classList.add('active');
    el.innerHTML = (final || '') +
      (interim ? `<span class="vm-interim"> ${interim}</span>` : '');
    if (!final && !interim) el.innerHTML = '<span style="color:var(--sub);font-style:italic">Ses kaydı burada görünecek...</span>';
    if (final) {
      document.getElementById('vm-parse-btn').style.display = '';
      document.getElementById('vm-clear-btn').style.display = '';
    }
  },

  clearTranscript() {
    this.transcript = '';
    this._updateDisplay('', '');
    document.getElementById('vm-parse-btn').style.display = 'none';
    document.getElementById('vm-save-btn').style.display = 'none';
    document.getElementById('vm-parse-result').style.display = 'none';
    document.getElementById('vm-clear-btn').style.display = 'none';
  },

  _parsed: null,

  async parseAndShow() {
    const text = this.transcript.trim();
    if (!text) { AI4.toast('Önce ses kaydı yapın!', 'yl'); return; }
    const btn = document.getElementById('vm-parse-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analiz ediliyor...'; }
    try {
      const prompt = `Türkçe çiftlik sesli komutunu analiz et ve JSON döndür.
Format: {"type":"health|production|task|finance|feeding|weight","data":{...alanlar}}

Örnekler:
- "TR001 3 litre süt verdi" → {"type":"production","data":{"animal_tag":"TR001","production_type":"Süt","quantity":3,"unit":"litre","date":"BUGÜN"}}
- "KY012'ye şap aşısı 150 lira" → {"type":"health","data":{"animal_tag":"KY012","record_type":"Aşılama","diagnosis":"Şap Aşısı","cost":150,"date":"BUGÜN"}}
- "yarın ahır temizliği Hasan" → {"type":"task","data":{"title":"Ahır temizliği","assigned_to":"Hasan","due_date":"YARIN","priority":"Orta","status":"Bekliyor"}}
- "50 kilo yem 800 lira" → {"type":"finance","data":{"type":"Gider","category":"Yem","amount":800,"description":"50 kg yem alımı","date":"BUGÜN"}}
- "KZ003 28 kilo" → {"type":"weight","data":{"tag":"KZ003","weight":28,"date":"BUGÜN"}}

Sadece JSON döndür. BUGÜN=${new Date().toISOString().split('T')[0]}, YARIN=${new Date(Date.now()+86400000).toISOString().split('T')[0]}
Komut: "${text}"`;

      const raw = await AI4.groq(prompt, 'Çiftlik yönetim sistemi için sesli komut ayrıştırıcısı. Sadece geçerli JSON döndür.', 400);
      const clean = raw.replace(/```json|```/g, '').trim();
      this._parsed = JSON.parse(clean);
      this._showParsed(this._parsed);
      document.getElementById('vm-save-btn').style.display = '';
    } catch(e) {
      AI4.toast('Analiz hatası: ' + e.message, 'rd');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg> AI ile Analiz Et'; }
    }
  },

  _showParsed(parsed) {
    const typeLabels = {
      health: '🏥 Sağlık Kaydı', production: '🥛 Üretim Kaydı',
      task: '✅ Görev', finance: '💰 Finansal İşlem',
      feeding: '🌾 Yemleme', weight: '⚖️ Tartım'
    };
    const el = document.getElementById('vm-parse-result');
    const titleEl = document.getElementById('vm-parse-title');
    const fieldsEl = document.getElementById('vm-parse-fields');
    if (!el || !titleEl || !fieldsEl) return;
    titleEl.textContent = typeLabels[parsed.type] || parsed.type;
    fieldsEl.innerHTML = Object.entries(parsed.data || {})
      .filter(([, v]) => v !== null && v !== '')
      .map(([k, v]) => `<div class="vm-field"><span class="vm-field-key">${k}</span><span class="vm-field-val">${v}</span></div>`)
      .join('');
    el.style.display = '';
  },

  saveRecord() {
    if (!this._parsed) return;
    const D = window.D;
    if (!D) { AI4.toast('Veri sistemi bulunamadı', 'rd'); return; }
    const today = new Date().toISOString().split('T')[0];
    const rec = { ...this._parsed.data };
    // Tarih normalize
    Object.keys(rec).forEach(k => {
      if (typeof rec[k] === 'string') rec[k] = rec[k].replace('BUGÜN', today).replace('YARIN', new Date(Date.now()+86400000).toISOString().split('T')[0]);
    });
    const keyMap = { health:'health', production:'production', task:'tasks', finance:'finance', feeding:'feeding' };
    const key = keyMap[this._parsed.type];
    if (this._parsed.type === 'weight') {
      if (!D.weights) D.weights = [];
      D.weights.push({ tag: rec.tag, date: rec.date || today, weight: parseFloat(rec.weight) || 0, note: rec.note || 'Sesli kayıt' });
    } else if (key && D[key]) {
      if (!rec.date) rec.date = today;
      D[key].push(rec);
    }
    if (typeof persist === 'function') persist();
    AI4.toast('✓ ' + (this._parsed.type || 'Kayıt') + ' eklendi!');
    this.clearTranscript();
    this._parsed = null;
    document.getElementById('vm-save-btn').style.display = 'none';
    document.getElementById('vm-parse-result').style.display = 'none';
    if (typeof renderPage === 'function' && typeof curPage !== 'undefined') renderPage(curPage);
  }
};


// ═════════════════════════════════════════════════════════════════════════════
// 2. FOTOĞRAFTAN HASTALLIK TESPİTİ
// ═════════════════════════════════════════════════════════════════════════════
const PhotoDiag = {
  _stream: null,
  _facing: 'environment',
  _capturedBase64: null,
  _capturedMime: 'image/jpeg',

  open() {
    AI4.modal('📸 Fotoğraftan Hastalık Tespiti', this._html());
    setTimeout(() => this._bindEvents(), 150);
  },

  _html() {
    const hasCam = !!(navigator.mediaDevices?.getUserMedia);
    const hasGemini = !!AI4.geminiKey();
    return `
<style>
#photo-diag { font-family:inherit; }
.pd-tabs { display:flex;border-bottom:2px solid var(--brd,#e2e8f0);margin-bottom:16px; }
.pd-tab { padding:8px 16px;font-size:13px;cursor:pointer;border:none;background:none;color:var(--sub,#888);font-weight:500;border-bottom:2px solid transparent;margin-bottom:-2px; }
.pd-tab.active { color:var(--accent,#2fb344);border-bottom-color:var(--accent,#2fb344);font-weight:700; }
.pd-cam-wrap { position:relative;background:#000;border-radius:12px;overflow:hidden;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center; }
.pd-cam-wrap video { width:100%;height:100%;object-fit:cover; }
.pd-cam-wrap canvas { display:none; }
.pd-overlay { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none; }
.pd-crosshair { width:200px;height:200px;border:2px solid rgba(47,179,68,.8);border-radius:8px; }
.pd-crosshair::before,.pd-crosshair::after { content:'';position:absolute;background:rgba(47,179,68,.8); }
.pd-cam-controls { position:absolute;bottom:12px;left:0;right:0;display:flex;justify-content:center;gap:12px; }
.pd-capture-btn { width:58px;height:58px;background:#fff;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.4);transition:.15s; }
.pd-capture-btn:active { transform:scale(.93); }
.pd-capture-btn svg { width:24px;height:24px;stroke:#1a1d23;fill:none;stroke-width:2.5; }
.pd-switch-btn { width:40px;height:40px;background:rgba(255,255,255,.2);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;align-self:center;backdrop-filter:blur(4px); }
.pd-switch-btn svg { width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2; }
.pd-preview { width:100%;max-height:280px;object-fit:contain;border-radius:12px;border:2px solid var(--brd,#e2e8f0); }
.pd-result { margin-top:12px;padding:14px;border-radius:10px;border:1px solid var(--brd,#e2e8f0);background:var(--card,#fff);display:none; }
.pd-result-title { font-size:13px;font-weight:700;color:var(--accent,#2fb344);margin-bottom:10px; }
.pd-severity { display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px; }
.pd-sev-low { background:#dcfce7;color:#15803d; }
.pd-sev-med { background:#fef3c7;color:#b45309; }
.pd-sev-high { background:#fee2e2;color:#dc2626; }
.pd-sev-crit { background:#7f1d1d;color:#fca5a5; }
.pd-section { margin-top:10px;padding-top:10px;border-top:1px solid var(--brd,#e2e8f0); }
.pd-section-title { font-size:11px;font-weight:700;color:var(--sub,#888);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px; }
.pd-text { font-size:12.5px;line-height:1.65;color:var(--txt,#1a1d23); }
.pd-quick-save { margin-top:12px;padding:10px;background:var(--accent-lt,#edfbf0);border-radius:8px;border:1px solid var(--accent,#2fb344); }
.pd-quick-save-title { font-size:11.5px;font-weight:700;color:var(--accent,#2fb344);margin-bottom:6px; }
</style>
<div id="photo-diag">
  ${!hasGemini ? `<div style="padding:10px 14px;background:#fef3c7;border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:12px;font-size:12.5px">
    ⚠️ Görüntü analizi için <b>Gemini API key</b> gerekli. Ayarlar → AI sekmesinden ekleyin.
    <a onclick="AI4.closeModal();setTimeout(()=>{if(typeof showPage==='function')showPage('Settings',null);setTimeout(()=>{if(typeof showStab==='function')showStab('ai',null)},300)},100)" style="cursor:pointer;color:var(--accent,#2fb344);font-weight:700;margin-left:8px">Ayarlara git →</a>
  </div>` : ''}

  <div class="pd-tabs">
    <button class="pd-tab active" onclick="PhotoDiag._switchTab('camera',this)" id="pd-tab-camera">📷 Kamera</button>
    <button class="pd-tab" onclick="PhotoDiag._switchTab('upload',this)" id="pd-tab-upload">📁 Dosya Yükle</button>
  </div>

  <!-- Kamera paneli -->
  <div id="pd-panel-camera">
    ${!hasCam ? `<div style="padding:16px;background:#fee2e2;border-radius:10px;color:#dc2626;text-align:center">Kamera erişimi desteklenmiyor.</div>` : `
    <div class="pd-cam-wrap" id="pd-cam-wrap">
      <video id="pd-video" autoplay muted playsinline></video>
      <canvas id="pd-canvas"></canvas>
      <div class="pd-overlay"><div class="pd-crosshair"></div></div>
      <div class="pd-cam-controls">
        <button class="pd-switch-btn" onclick="PhotoDiag.switchCamera()" title="Kamerayı çevir">
          <svg viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
        </button>
        <button class="pd-capture-btn" onclick="PhotoDiag.capture()" title="Fotoğraf çek">
          <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-pr" onclick="PhotoDiag.startCamera()" id="pd-start-btn">Kamerayı Başlat</button>
      <button class="btn btn-sec" onclick="PhotoDiag.stopCamera()" id="pd-stop-btn" style="display:none">Durdur</button>
    </div>`}
  </div>

  <!-- Dosya yükleme paneli -->
  <div id="pd-panel-upload" style="display:none">
    <label style="display:block;border:2px dashed var(--brd,#e2e8f0);border-radius:12px;padding:30px;text-align:center;cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--accent,#2fb344)'" onmouseout="this.style.borderColor='var(--brd,#e2e8f0)'">
      <div style="font-size:36px;margin-bottom:8px">🖼️</div>
      <div style="font-size:13px;font-weight:600">Fotoğraf seçin veya sürükleyin</div>
      <div style="font-size:11.5px;color:var(--sub,#888);margin-top:4px">JPG, PNG, WebP — Maks 5MB</div>
      <input type="file" accept="image/*" style="display:none" onchange="PhotoDiag.fileSelected(this)">
    </label>
  </div>

  <!-- Önizleme -->
  <div id="pd-preview-wrap" style="display:none;margin-top:12px">
    <img id="pd-preview-img" class="pd-preview" src="" alt="Önizleme"/>
    <div style="margin-top:10px">
      <div class="fg" style="margin-bottom:8px">
        <label style="font-size:11.5px;color:var(--sub,#888);display:block;margin-bottom:4px">Hayvan Küpe / İsim (opsiyonel)</label>
        <input id="pd-animal-tag" placeholder="TR001, Sarı..." style="width:180px;padding:6px 10px;border:1px solid var(--brd,#e2e8f0);border-radius:7px;font-size:12.5px;background:var(--card,#fff);color:var(--txt,#1a1d23)"/>
      </div>
      <div class="fg" style="margin-bottom:10px">
        <label style="font-size:11.5px;color:var(--sub,#888);display:block;margin-bottom:4px">Ek Gözlem (opsiyonel)</label>
        <input id="pd-extra-note" placeholder="3 gündür yemiyor, ateşi var..." style="width:100%;padding:6px 10px;border:1px solid var(--brd,#e2e8f0);border-radius:7px;font-size:12.5px;background:var(--card,#fff);color:var(--txt,#1a1d23)"/>
      </div>
      <button class="btn btn-pr" onclick="PhotoDiag.analyze()" id="pd-analyze-btn" ${!hasGemini ? 'disabled' : ''}>
        🔍 AI ile Analiz Et
      </button>
      <button class="btn btn-sec" onclick="PhotoDiag.reset()" style="margin-left:8px">Yeni Fotoğraf</button>
    </div>
  </div>

  <!-- Sonuç -->
  <div class="pd-result" id="pd-result"></div>
</div>`;
  },

  _switchTab(tab, btn) {
    document.querySelectorAll('.pd-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['camera','upload'].forEach(t => {
      const p = document.getElementById('pd-panel-' + t);
      if (p) p.style.display = t === tab ? '' : 'none';
    });
    if (tab === 'camera') setTimeout(() => this.startCamera(), 100);
    else this.stopCamera();
  },

  async startCamera() {
    const video = document.getElementById('pd-video');
    if (!video) return;
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this._facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false
      });
      video.srcObject = this._stream;
      const startBtn = document.getElementById('pd-start-btn');
      const stopBtn = document.getElementById('pd-stop-btn');
      if (startBtn) startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = '';
    } catch(e) {
      AI4.toast('Kamera açılamadı: ' + e.message, 'rd');
    }
  },

  stopCamera() {
    if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    const startBtn = document.getElementById('pd-start-btn');
    const stopBtn = document.getElementById('pd-stop-btn');
    if (startBtn) startBtn.style.display = '';
    if (stopBtn) stopBtn.style.display = 'none';
  },

  async switchCamera() {
    this._facing = this._facing === 'environment' ? 'user' : 'environment';
    this.stopCamera();
    await this.startCamera();
  },

  capture() {
    const video = document.getElementById('pd-video');
    const canvas = document.getElementById('pd-canvas');
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (this._facing === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    this.stopCamera();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    this._capturedBase64 = dataUrl.split(',')[1];
    this._capturedMime = 'image/jpeg';
    this._showPreview(dataUrl);
  },

  fileSelected(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { AI4.toast('Dosya 5MB\'dan büyük!', 'yl'); return; }
    this._capturedMime = file.type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = e => {
      this._capturedBase64 = e.target.result.split(',')[1];
      this._showPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  },

  _showPreview(dataUrl) {
    const preview = document.getElementById('pd-preview-img');
    const wrap = document.getElementById('pd-preview-wrap');
    if (preview) preview.src = dataUrl;
    if (wrap) wrap.style.display = '';
    const result = document.getElementById('pd-result');
    if (result) result.style.display = 'none';
  },

  async analyze() {
    if (!this._capturedBase64) { AI4.toast('Önce fotoğraf çekin!', 'yl'); return; }
    const tag = document.getElementById('pd-animal-tag')?.value || '';
    const note = document.getElementById('pd-extra-note')?.value || '';
    const btn = document.getElementById('pd-analyze-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analiz ediliyor...'; }

    const prompt = `Sen deneyimli bir çiftlik veterinerisin. Bu çiftlik hayvanı fotoğrafını analiz et.
${tag ? `Hayvan: ${tag}` : ''}
${note ? `Ek gözlem: ${note}` : ''}

Lütfen şunları belirt:
1. **Genel Durum**: Hayvanın görsel sağlık değerlendirmesi
2. **Tespit Edilen Bulgular**: Gözlemlenen anormallikler (varsa)
3. **Olası Tanı**: En olası sağlık sorunları (varsa)
4. **Aciliyet Seviyesi**: Düşük / Orta / Yüksek / Kritik
5. **Önerilen Eylemler**: Hemen yapılması gerekenler
6. **Veteriner Gereksinimi**: Evet/Hayır ve gerekçe

Türkçe yanıtla. Fotoğrafta hayvan yoksa bunu belirt.`;

    const resultEl = document.getElementById('pd-result');
    try {
      const text = await AI4.geminiVision(this._capturedBase64, prompt, this._capturedMime);

      // Aciliyet seviyesini tespit et
      let severity = 'low', sevText = 'Düşük Risk', sevClass = 'pd-sev-low';
      if (/kritik|acil|hemen|emergency/i.test(text)) { severity = 'crit'; sevText = '🚨 Kritik'; sevClass = 'pd-sev-crit'; }
      else if (/yüksek|yüksek risk|urgent/i.test(text)) { severity = 'high'; sevText = '⚠️ Yüksek Risk'; sevClass = 'pd-sev-high'; }
      else if (/orta|moderate/i.test(text)) { severity = 'med'; sevText = '⚡ Orta Risk'; sevClass = 'pd-sev-med'; }

      // Metni formatla
      const formatted = text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p style="margin:6px 0">')
        .replace(/\n/g, '<br>');

      resultEl.innerHTML = `
        <div class="pd-result-title">🔬 AI Hastalık Analizi ${tag ? '— ' + tag : ''}</div>
        <span class="pd-severity ${sevClass}">${sevText}</span>
        <div class="pd-text"><p style="margin:0">${formatted}</p></div>
        <div class="pd-quick-save">
          <div class="pd-quick-save-title">Sağlık kaydı oluştur?</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input id="pd-save-tag" placeholder="Küpe no *" value="${tag}" style="width:130px;padding:5px 9px;border:1px solid var(--brd,#e2e8f0);border-radius:6px;font-size:12px;background:var(--card,#fff);color:var(--txt,#1a1d23)"/>
            <button class="btn btn-pr btn-sm" onclick="PhotoDiag.saveHealthRecord('${severity}')">✓ Sağlık Kaydı Ekle</button>
          </div>
        </div>`;
      resultEl.style.display = '';
      this._lastAnalysis = { text, severity, tag };
    } catch(e) {
      resultEl.innerHTML = `<div style="color:#dc2626;font-size:12.5px">❌ Analiz hatası: ${e.message}</div>`;
      resultEl.style.display = '';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔍 AI ile Analiz Et'; }
    }
  },

  _lastAnalysis: null,

  saveHealthRecord(severity) {
    const tagEl = document.getElementById('pd-save-tag');
    const tag = tagEl?.value?.trim() || document.getElementById('pd-animal-tag')?.value?.trim() || '';
    if (!tag) { AI4.toast('Küpe numarası girin!', 'yl'); tagEl?.focus(); return; }
    const D = window.D;
    if (!D?.health) { AI4.toast('Veri sistemi bulunamadı', 'rd'); return; }
    const sevMap = { low: 'İyi', med: 'Orta', high: 'Dikkat', crit: 'Kritik' };
    D.health.push({
      animal_tag: tag,
      record_type: 'Muayene',
      date: new Date().toISOString().split('T')[0],
      diagnosis: 'Fotoğraf Analizi — AI Teşhis',
      notes: (this._lastAnalysis?.text || '').substring(0, 500),
      health_score: sevMap[severity] || 'Orta',
      cost: null,
      vet_name: 'AI Görüntü Analizi'
    });
    if (typeof persist === 'function') persist();
    AI4.toast('✓ Sağlık kaydı eklendi!');
  },

  reset() {
    this._capturedBase64 = null;
    this._lastAnalysis = null;
    const wrap = document.getElementById('pd-preview-wrap');
    const result = document.getElementById('pd-result');
    if (wrap) wrap.style.display = 'none';
    if (result) result.style.display = 'none';
    const tagInput = document.getElementById('pd-animal-tag');
    const noteInput = document.getElementById('pd-extra-note');
    if (tagInput) tagInput.value = '';
    if (noteInput) noteInput.value = '';
  },

  _bindEvents() {
    const camTab = document.getElementById('pd-tab-camera');
    if (camTab && camTab.classList.contains('active')) {
      setTimeout(() => this.startCamera(), 200);
    }
    // Drag & Drop
    const uploadPanel = document.getElementById('pd-panel-upload');
    if (uploadPanel) {
      uploadPanel.addEventListener('dragover', e => { e.preventDefault(); });
      uploadPanel.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file) {
          const fakeInput = { files: [file] };
          this.fileSelected(fakeInput);
        }
      });
    }
  },

  cleanup() { this.stopCamera(); }
};


// ═════════════════════════════════════════════════════════════════════════════
// 3. OTOMATİK GÜNLÜK GÖREV PLANLAMA AI
// ═════════════════════════════════════════════════════════════════════════════
const DailyPlanner = {
  _plan: null,

  open() {
    AI4.modal('📅 Otomatik Günlük Görev Planlama', this._html());
    setTimeout(() => this.generate(), 200);
  },

  _html() {
    return `
<style>
#daily-planner { font-family:inherit; }
.dp-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
.dp-date { font-size:14px;font-weight:700; }
.dp-weather-badge { display:flex;align-items:center;gap:6px;padding:5px 12px;background:var(--bg,#f4f6f8);border-radius:20px;font-size:12px; }
.dp-loading { text-align:center;padding:40px;color:var(--sub,#888); }
.dp-spinner { display:inline-block;width:28px;height:28px;border:3px solid var(--brd,#e2e8f0);border-top-color:var(--accent,#2fb344);border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px; }
@keyframes spin { to { transform:rotate(360deg); } }
.dp-section { margin-bottom:16px; }
.dp-section-hd { display:flex;align-items:center;gap:8px;margin-bottom:8px; }
.dp-section-hd .dp-ico { font-size:16px; }
.dp-section-hd span { font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--sub,#888); }
.dp-task-card {
  display:flex;align-items:flex-start;gap:10px;padding:10px 12px;
  border-radius:9px;border:1px solid var(--brd,#e2e8f0);
  background:var(--card,#fff);margin-bottom:6px;transition:.12s;
  cursor:pointer;
}
.dp-task-card:hover { border-color:var(--accent,#2fb344);transform:translateX(2px); }
.dp-task-card.added { background:var(--accent-lt,#edfbf0);border-color:var(--accent,#2fb344); }
.dp-prio { width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px; }
.dp-prio-crit { background:#ef4444; }
.dp-prio-high { background:#f59e0b; }
.dp-prio-med  { background:#3b82f6; }
.dp-prio-low  { background:#94a3b8; }
.dp-task-info { flex:1;min-width:0; }
.dp-task-title { font-size:13px;font-weight:600;margin-bottom:2px; }
.dp-task-meta { font-size:11px;color:var(--sub,#888);display:flex;gap:8px;flex-wrap:wrap; }
.dp-add-btn { padding:3px 10px;background:var(--accent,#2fb344);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0; }
.dp-add-btn:disabled { background:var(--sub,#888);cursor:default; }
.dp-add-all { display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--brd,#e2e8f0); }
.dp-insights { background:var(--bg,#f4f6f8);border-radius:10px;padding:12px 14px;font-size:12.5px;line-height:1.65;margin-bottom:14px;border-left:3px solid var(--accent,#2fb344); }
.dp-insights-title { font-size:11px;font-weight:700;color:var(--accent,#2fb344);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px; }
</style>
<div id="daily-planner">
  <div class="dp-header">
    <div class="dp-date">📅 ${new Date().toLocaleDateString('tr-TR', { weekday:'long', day:'2-digit', month:'long' })}</div>
    <div class="dp-weather-badge" id="dp-weather-badge">🌤️ Yükleniyor...</div>
  </div>
  <div id="dp-content">
    <div class="dp-loading">
      <div class="dp-spinner"></div>
      <div>AI günlük planınızı hazırlıyor...</div>
      <div style="font-size:11px;color:var(--sub,#888);margin-top:6px">Çiftlik verileriniz analiz ediliyor</div>
    </div>
  </div>
</div>`;
  },

  async generate() {
    const D = window.D || {};
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayOfWeek = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][new Date().getDay()];
    const season = ['Kış','Kış','İlkbahar','İlkbahar','İlkbahar','Yaz','Yaz','Yaz','Sonbahar','Sonbahar','Sonbahar','Kış'][new Date().getMonth()];

    // Hava durumu badge güncelle
    const wBadge = document.getElementById('dp-weather-badge');
    const wCache = window._weatherCache;
    if (wCache?.current) {
      const temp = Math.round(wCache.current.temperature_2m);
      const code = wCache.current.weather_code;
      const icons = [0,1,2,3,45,48,51,53,55,61,63,65,71,73,75,80,81,82,95,96,99];
      const ico = code === 0 ? '☀️' : code <= 2 ? '⛅' : code <= 3 ? '☁️' : code <= 48 ? '🌫️' : code <= 65 ? '🌧️' : code <= 75 ? '❄️' : '⛈️';
      if (wBadge) wBadge.textContent = `${ico} ${temp}°C · ${season}`;
    } else {
      if (wBadge) wBadge.textContent = `🌤️ ${season}`;
    }

    // Veri özeti
    const hasta = D.animals?.filter(a => a.status === 'Hasta') || [];
    const gebe = D.animals?.filter(a => a.status === 'Gebe') || [];
    const kritikStok = D.inventory?.filter(i => (i.current_stock || 0) < (i.minimum_stock || 0)) || [];
    const bugünVade = D.tasks?.filter(t => t.due_date === today && t.status !== 'Tamamlandı') || [];
    const yakınAşı = D.health?.filter(h => h.next_date && h.next_date >= today && h.next_date <= tomorrow) || [];
    const yakınDoğum = D.repro?.filter(r => {
      if (!r.expected_birth_date || r.outcome !== 'Beklemede') return false;
      const diff = (new Date(r.expected_birth_date) - new Date()) / 86400000;
      return diff >= 0 && diff <= 3;
    }) || [];
    const çalışanlar = D.employees?.filter(e => e.status === 'Aktif').map(e => e.name) || ['Ali', 'Mehmet'];

    const prompt = `Sen deneyimli bir çiftlik danışmanısın. Bugün (${today}, ${dayOfWeek}) için çiftlik yöneticisine günlük görev planı oluştur.

ÇİFTLİK DURUMU:
- Toplam hayvan: ${D.animals?.length || 0} baş
- Hasta hayvan: ${hasta.length} (${hasta.map(a => a.tag_number).join(', ') || 'yok'})
- Gebe: ${gebe.length} (${gebe.map(a => a.tag_number).join(', ') || 'yok'})
- Yakın doğum (3 gün): ${yakınDoğum.map(r => r.animal_tag).join(', ') || 'yok'}
- Yakın aşı: ${yakınAşı.map(h => h.animal_tag + '/' + h.record_type).join(', ') || 'yok'}
- Kritik stok: ${kritikStok.map(i => i.name).join(', ') || 'yok'}
- Bugün vadeli mevcut görevler: ${bugünVade.map(t => t.title).join(', ') || 'yok'}
- Aktif çalışanlar: ${çalışanlar.join(', ')}
- Mevsim: ${season}

GÖREV PLANI FORMAT (JSON döndür):
{
  "insights": "2-3 cümlelik bugünün özeti ve kritik notlar",
  "tasks": [
    {
      "title": "Görev başlığı",
      "category": "Veteriner|Yem|Temizlik|İdari|Bakım|Üretim",
      "priority": "Kritik|Yüksek|Orta|Düşük",
      "assigned": "çalışan adı",
      "time": "sabah|öğle|akşam|tüm gün",
      "duration": "30 dk|1 saat|2 saat vb",
      "notes": "kısa not"
    }
  ]
}
7-12 görev üret, gerçekçi ve uygulanabilir olsun. Sadece JSON döndür.`;

    try {
      const raw = await AI4.groq(prompt, 'Çiftlik günlük planlama asistanı. Sadece geçerli JSON döndür.', 1500);
      const clean = raw.replace(/```json|```/g, '').trim();
      // JSON bloğu bul
      const jsonMatch = clean.match(/\{[\s\S]+\}/);
      this._plan = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(clean);
      this._renderPlan(this._plan);
    } catch(e) {
      document.getElementById('dp-content').innerHTML = `
        <div style="padding:16px;background:#fee2e2;border-radius:10px;color:#dc2626">
          ❌ Plan oluşturulamadı: ${e.message}<br>
          <button class="btn btn-sec btn-sm" onclick="DailyPlanner.generate()" style="margin-top:8px">Tekrar Dene</button>
        </div>`;
    }
  },

  _renderPlan(plan) {
    const tasks = plan.tasks || [];
    const prioColors = { Kritik: 'dp-prio-crit', Yüksek: 'dp-prio-high', Orta: 'dp-prio-med', Düşük: 'dp-prio-low' };
    const timeGroups = { sabah: [], öğle: [], akşam: [], 'tüm gün': [] };
    tasks.forEach(t => { const key = t.time || 'tüm gün'; (timeGroups[key] = timeGroups[key] || []).push(t); });
    const timeLabels = { sabah: '🌅 Sabah', öğle: '☀️ Öğle', akşam: '🌇 Akşam', 'tüm gün': '🔄 Gün Boyu' };

    let html = '';
    if (plan.insights) {
      html += `<div class="dp-insights"><div class="dp-insights-title">💡 Günün Özeti</div>${plan.insights}</div>`;
    }

    Object.entries(timeGroups).forEach(([time, tasks]) => {
      if (!tasks.length) return;
      html += `<div class="dp-section">
        <div class="dp-section-hd"><span>${timeLabels[time] || time}</span></div>
        ${tasks.map((t, i) => `
          <div class="dp-task-card" id="dptask-${time}-${i}">
            <div class="dp-prio ${prioColors[t.priority] || 'dp-prio-med'}"></div>
            <div class="dp-task-info">
              <div class="dp-task-title">${t.title}</div>
              <div class="dp-task-meta">
                <span>👤 ${t.assigned || 'Atanmadı'}</span>
                <span>⏱️ ${t.duration || '?'}</span>
                <span>📂 ${t.category || ''}</span>
                ${t.notes ? `<span style="color:var(--sub)">${t.notes}</span>` : ''}
              </div>
            </div>
            <button class="dp-add-btn" id="dpbtn-${time}-${i}" onclick="DailyPlanner.addTask(${JSON.stringify(t).replace(/"/g,"'")}, '${time}-${i}')">+ Ekle</button>
          </div>`).join('')}
      </div>`;
    });

    html += `<div class="dp-add-all">
      <button class="btn btn-pr" onclick="DailyPlanner.addAll()">
        ✓ Tümünü Görevlere Ekle (${tasks.length})
      </button>
      <button class="btn btn-sec" onclick="DailyPlanner.generate()">↻ Yeniden Oluştur</button>
      <button class="btn btn-sec" onclick="DailyPlanner.sendWhatsApp()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        WhatsApp
      </button>
    </div>`;

    const content = document.getElementById('dp-content');
    if (content) content.innerHTML = html;
  },

  addTask(taskObj, id) {
    const D = window.D;
    if (!D?.tasks) return;
    const today = new Date().toISOString().split('T')[0];
    D.tasks.push({
      title: taskObj.title,
      category: taskObj.category || 'Diğer',
      priority: taskObj.priority || 'Orta',
      status: 'Bekliyor',
      due_date: today,
      assigned_to: taskObj.assigned || '',
      description: taskObj.notes || '',
    });
    if (typeof persist === 'function') persist();
    const card = document.getElementById('dptask-' + id);
    const btn = document.getElementById('dpbtn-' + id);
    if (card) card.classList.add('added');
    if (btn) { btn.textContent = '✓'; btn.disabled = true; }
    AI4.toast('✓ Görev eklendi: ' + taskObj.title);
  },

  addAll() {
    const tasks = this._plan?.tasks || [];
    const D = window.D;
    if (!D?.tasks) return;
    const today = new Date().toISOString().split('T')[0];
    let added = 0;
    tasks.forEach((t, i) => {
      D.tasks.push({
        title: t.title, category: t.category || 'Diğer',
        priority: t.priority || 'Orta', status: 'Bekliyor',
        due_date: today, assigned_to: t.assigned || '',
        description: t.notes || '',
      });
      added++;
    });
    if (typeof persist === 'function') persist();
    // Tümünü işaretle
    document.querySelectorAll('.dp-task-card').forEach(c => c.classList.add('added'));
    document.querySelectorAll('.dp-add-btn').forEach(b => { b.textContent = '✓'; b.disabled = true; });
    AI4.toast('✓ ' + added + ' görev eklendi!');
    setTimeout(() => AI4.closeModal(), 1200);
  },

  sendWhatsApp() {
    const phone = (window.D?.settings?.wa_phone || '').replace(/\D/g, '');
    if (!phone) { AI4.toast('WhatsApp numarası Ayarlar\'dan ekleyin', 'yl'); return; }
    const tasks = this._plan?.tasks || [];
    const today = new Date().toLocaleDateString('tr-TR');
    const msg = `📅 *${window.D?.settings?.farm_name || 'Çiftlik'} — Günlük Plan (${today})*\n\n` +
      tasks.map(t => `${t.priority === 'Kritik' ? '🔴' : t.priority === 'Yüksek' ? '🟡' : '🟢'} ${t.title}\n   👤 ${t.assigned || '-'} · ⏱️ ${t.duration || '?'}`).join('\n\n') +
      '\n\n_Bizim Çiftlik AI Planlama_';
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
  }
};


// ═════════════════════════════════════════════════════════════════════════════
// 4. GENETİK SOY AĞACI + VERİM TAHMİNİ
// ═════════════════════════════════════════════════════════════════════════════
const GeneticTree = {
  _svg: null,
  _data: null,

  open(animalTag) {
    AI4.modal('🧬 Genetik Soy Ağacı & Verim Tahmini', this._html());
    setTimeout(() => {
      this._bindEvents();
      if (animalTag) {
        const sel = document.getElementById('gt-animal-sel');
        if (sel) sel.value = animalTag;
        this.load(animalTag);
      }
    }, 150);
  },

  _html() {
    const D = window.D || {};
    const animals = D.animals || [];
    return `
<style>
#genetic-tree { font-family:inherit; }
.gt-controls { display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px; }
.gt-sel { padding:7px 10px;border:1px solid var(--brd,#e2e8f0);border-radius:7px;font-size:12.5px;background:var(--card,#fff);color:var(--txt,#1a1d23);min-width:200px; }
.gt-tree-wrap { overflow:auto;background:var(--bg,#f4f6f8);border-radius:12px;border:1px solid var(--brd,#e2e8f0);min-height:300px;position:relative; }
.gt-tree-empty { display:flex;align-items:center;justify-content:center;height:300px;color:var(--sub,#888);font-size:13px;flex-direction:column;gap:8px; }
.gt-node {
  background:var(--card,#fff);border:2px solid var(--brd,#e2e8f0);
  border-radius:10px;padding:10px 12px;cursor:pointer;
  transition:all .15s;box-shadow:0 2px 8px rgba(0,0,0,.06);
  min-width:130px;text-align:center;
}
.gt-node:hover { border-color:var(--accent,#2fb344);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.12); }
.gt-node.root { border-color:var(--accent,#2fb344);background:var(--accent-lt,#edfbf0); }
.gt-node.mother { border-color:#8b5cf6;background:#f5f3ff; }
.gt-node.father { border-color:#3b82f6;background:#eff6ff; }
.gt-node.unknown { border-color:#e2e8f0;background:var(--bg,#f4f6f8);opacity:.65; }
.gt-node-tag { font-size:12px;font-weight:800; }
.gt-node-name { font-size:10.5px;color:var(--sub,#888);margin-top:1px; }
.gt-node-species { font-size:10px;color:var(--sub,#888); }
.gt-node-score { font-size:11px;font-weight:700;margin-top:4px; }
.gt-score-high { color:#16a34a; }
.gt-score-med  { color:#d97706; }
.gt-score-low  { color:#dc2626; }
.gt-stats { display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:14px; }
.gt-stat { background:var(--card,#fff);border-radius:9px;padding:12px;border:1px solid var(--brd,#e2e8f0);text-align:center; }
.gt-stat-val { font-size:20px;font-weight:800;color:var(--accent,#2fb344); }
.gt-stat-lbl { font-size:11px;color:var(--sub,#888);margin-top:3px; }
.gt-ai-section { margin-top:14px;padding:14px;background:var(--bg,#f4f6f8);border-radius:10px;border-left:3px solid var(--accent,#2fb344); }
.gt-ai-title { font-size:11px;font-weight:700;color:var(--accent,#2fb344);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px; }
.gt-legend { display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--sub,#888);margin-bottom:10px; }
.gt-legend-item { display:flex;align-items:center;gap:5px; }
.gt-legend-dot { width:10px;height:10px;border-radius:3px; }
</style>
<div id="genetic-tree">
  <div class="gt-controls">
    <select class="gt-sel" id="gt-animal-sel" onchange="GeneticTree.load(this.value)">
      <option value="">-- Hayvan Seçin --</option>
      ${animals.map(a => `<option value="${a.tag_number}">${a.tag_number}${a.name ? ' · ' + a.name : ''} (${a.species})</option>`).join('')}
    </select>
    <button class="btn btn-pr btn-sm" onclick="GeneticTree.load(document.getElementById('gt-animal-sel').value)">↻ Yükle</button>
    <button class="btn btn-ai btn-sm" id="gt-ai-btn" onclick="GeneticTree.analyzeWithAI()" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg> AI Verim Analizi
    </button>
    <button class="btn btn-sec btn-sm" onclick="GeneticTree.exportSVG()" id="gt-export-btn" style="display:none">
      ↓ SVG İndir
    </button>
  </div>

  <div class="gt-legend">
    <div class="gt-legend-item"><div class="gt-legend-dot" style="background:#2fb344"></div>Seçili Hayvan</div>
    <div class="gt-legend-item"><div class="gt-legend-dot" style="background:#8b5cf6"></div>Anne</div>
    <div class="gt-legend-item"><div class="gt-legend-dot" style="background:#3b82f6"></div>Baba</div>
    <div class="gt-legend-item"><div class="gt-legend-dot" style="background:#94a3b8"></div>Bilinmiyor</div>
  </div>

  <div class="gt-tree-wrap" id="gt-tree-wrap">
    <div class="gt-tree-empty">
      <span style="font-size:32px">🧬</span>
      <span>Yukarıdan hayvan seçin</span>
    </div>
  </div>

  <div id="gt-stats-wrap"></div>
  <div id="gt-ai-section"></div>
</div>`;
  },

  _bindEvents() {},

  _buildTree(tag, D) {
    const find = t => D.animals?.find(a => a.tag_number === t) || null;
    const animal = find(tag);
    if (!animal) return null;
    const mother = animal.mother_tag ? find(animal.mother_tag) : null;
    const father = animal.father_tag ? find(animal.father_tag) : null;
    const mgm = mother?.mother_tag ? find(mother.mother_tag) : null;
    const mgf = mother?.father_tag ? find(mother.father_tag) : null;
    const pgm = father?.mother_tag ? find(father.mother_tag) : null;
    const pgf = father?.father_tag ? find(father.father_tag) : null;
    return { animal, mother, father, mgm, mgf, pgm, pgf };
  },

  _calcScore(animal, D) {
    if (!animal) return 0;
    const health = D.health?.filter(h => h.animal_tag === animal.tag_number) || [];
    const prod   = D.production?.filter(p => p.animal_tag === animal.tag_number) || [];
    const sick   = health.filter(h => h.record_type === 'Tedavi').length;
    const milkTotal = prod.filter(p => p.production_type === 'Süt').reduce((s, p) => s + (parseFloat(p.quantity) || 0), 0);
    let score = 50;
    if (animal.weight > 0) score += Math.min(20, animal.weight / 30);
    if (animal.daily_milk > 0) score += Math.min(20, animal.daily_milk * 2);
    if (milkTotal > 0) score += Math.min(15, milkTotal / 100);
    score -= sick * 5;
    if (animal.status === 'Hasta') score -= 15;
    return Math.max(0, Math.min(100, Math.round(score)));
  },

  _nodeHtml(animal, role) {
    if (!animal) {
      const label = role === 'mother' ? 'Anne' : role === 'father' ? 'Baba' : role === 'mgm' ? 'Anne Babaanne' : role === 'mgf' ? 'Anne Dede' : role === 'pgm' ? 'Baba Babaanne' : 'Baba Dede';
      return `<div class="gt-node unknown">
        <div class="gt-node-tag">?</div>
        <div class="gt-node-name">${label}</div>
        <div class="gt-node-species">Bilinmiyor</div>
      </div>`;
    }
    const D = window.D || {};
    const score = this._calcScore(animal, D);
    const scoreClass = score >= 70 ? 'gt-score-high' : score >= 40 ? 'gt-score-med' : 'gt-score-low';
    const healthCount = D.health?.filter(h => h.animal_tag === animal.tag_number).length || 0;
    return `<div class="gt-node ${role}" onclick="GeneticTree._nodeClick('${animal.tag_number}')">
      <div class="gt-node-tag">${animal.tag_number}</div>
      ${animal.name ? `<div class="gt-node-name">${animal.name}</div>` : ''}
      <div class="gt-node-species">${animal.species || ''}${animal.breed ? ' · ' + animal.breed : ''}</div>
      <div class="gt-node-score ${scoreClass}">⭐ ${score}/100</div>
      <div style="font-size:10px;color:var(--sub,#888);margin-top:2px">${animal.weight ? animal.weight + 'kg' : ''} ${healthCount ? '· ' + healthCount + ' sağlık kaydı' : ''}</div>
    </div>`;
  },

  load(tag) {
    if (!tag) return;
    const D = window.D || {};
    const tree = this._buildTree(tag, D);
    if (!tree) { AI4.toast('Hayvan bulunamadı!', 'yl'); return; }
    this._data = tree;
    const wrap = document.getElementById('gt-tree-wrap');
    if (!wrap) return;

    // SVG tabanlı ağaç çiz
    wrap.innerHTML = `
<svg id="gt-svg" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" style="width:100%;min-height:480px">
  <!-- Bağlantı çizgileri -->
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="var(--brd,#e2e8f0)"/>
    </marker>
  </defs>
  <!-- Nesil 3 (büyük ebeveynler) - y=40 -->
  <!-- Anne tarafı büyük ebeveynler -->
  <line x1="100" y1="90" x2="200" y2="200" stroke="var(--brd,#cbd5e1)" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="300" y1="90" x2="200" y2="200" stroke="var(--brd,#cbd5e1)" stroke-width="1.5" stroke-dasharray="4,3"/>
  <!-- Baba tarafı büyük ebeveynler -->
  <line x1="500" y1="90" x2="600" y2="200" stroke="var(--brd,#cbd5e1)" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="700" y1="90" x2="600" y2="200" stroke="var(--brd,#cbd5e1)" stroke-width="1.5" stroke-dasharray="4,3"/>
  <!-- Anne-Baba → Root -->
  <line x1="200" y1="290" x2="400" y2="370" stroke="var(--sub,#94a3b8)" stroke-width="2"/>
  <line x1="600" y1="290" x2="400" y2="370" stroke="var(--sub,#94a3b8)" stroke-width="2"/>
</svg>`;

    // foreignObject ile HTML node'lar ekle (daha iyi görünüm için absolute div kullan)
    wrap.style.position = 'relative';
    wrap.innerHTML = this._buildDivTree(tree);

    // İstatistikler
    this._renderStats(tree);
    document.getElementById('gt-ai-btn').style.display = '';
    document.getElementById('gt-export-btn').style.display = '';
  },

  _buildDivTree(tree) {
    const positions = {
      // Nesil 3 (büyük ebeveynler) y=30px
      mgm: { x: 10,  y: 30,  role: 'mgm' },
      mgf: { x: 190, y: 30,  role: 'mgf' },
      pgm: { x: 430, y: 30,  role: 'pgm' },
      pgf: { x: 610, y: 30,  role: 'pgf' },
      // Nesil 2 (ebeveynler) y=160px
      mother: { x: 80,  y: 165, role: 'mother' },
      father: { x: 510, y: 165, role: 'father' },
      // Nesil 1 (seçili) y=300px
      animal: { x: 300, y: 300, role: 'root' },
    };

    const svgLines = `<svg style="position:absolute;inset:0;width:100%;height:480px;pointer-events:none" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
      <line x1="80"  y1="55"  x2="145" y2="165" stroke="#c4b5fd" stroke-width="1.5" stroke-dasharray="5,3" opacity=".6"/>
      <line x1="255" y1="55"  x2="145" y2="165" stroke="#c4b5fd" stroke-width="1.5" stroke-dasharray="5,3" opacity=".6"/>
      <line x1="500" y1="55"  x2="575" y2="165" stroke="#93c5fd" stroke-width="1.5" stroke-dasharray="5,3" opacity=".6"/>
      <line x1="680" y1="55"  x2="575" y2="165" stroke="#93c5fd" stroke-width="1.5" stroke-dasharray="5,3" opacity=".6"/>
      <line x1="145" y1="265" x2="370" y2="300" stroke="#86efac" stroke-width="2.5" opacity=".7"/>
      <line x1="575" y1="265" x2="430" y2="300" stroke="#86efac" stroke-width="2.5" opacity=".7"/>
    </svg>`;

    const nodes = Object.entries(positions).map(([key, pos]) => {
      const animal = tree[key];
      return `<div style="position:absolute;left:${pos.x}px;top:${pos.y}px;width:150px">
        ${this._nodeHtml(animal, pos.role)}
      </div>`;
    }).join('');

    return `<div style="position:relative;min-height:480px;overflow:auto;padding:10px">
      ${svgLines}
      ${nodes}
    </div>`;
  },

  _nodeClick(tag) {
    const sel = document.getElementById('gt-animal-sel');
    if (sel) sel.value = tag;
    this.load(tag);
  },

  _renderStats(tree) {
    const D = window.D || {};
    const animal = tree.animal;
    const statsWrap = document.getElementById('gt-stats-wrap');
    if (!statsWrap) return;

    const score = this._calcScore(animal, D);
    const motherScore = this._calcScore(tree.mother, D);
    const fatherScore = this._calcScore(tree.father, D);
    const inheritedScore = Math.round((motherScore + fatherScore) / 2);

    const healthCount = D.health?.filter(h => h.animal_tag === animal.tag_number).length || 0;
    const prodTotal = D.production?.filter(p => p.animal_tag === animal.tag_number).reduce((s, p) => s + (parseFloat(p.quantity) || 0), 0) || 0;

    // Verim tahmini (kalıtsal potansiyel)
    const offspring = D.animals?.filter(a => a.mother_tag === animal.tag_number || a.father_tag === animal.tag_number) || [];
    const offspringAvgWeight = offspring.length ?
      offspring.reduce((s, a) => s + (parseFloat(a.weight) || 0), 0) / offspring.length : 0;

    statsWrap.innerHTML = `
      <div class="gt-stats">
        <div class="gt-stat">
          <div class="gt-stat-val">${score}</div>
          <div class="gt-stat-lbl">Genetik Skor / 100</div>
        </div>
        <div class="gt-stat">
          <div class="gt-stat-val">${inheritedScore}</div>
          <div class="gt-stat-lbl">Ebeveyn Ort. Skoru</div>
        </div>
        <div class="gt-stat">
          <div class="gt-stat-val">${offspring.length}</div>
          <div class="gt-stat-lbl">Toplam Yavru</div>
        </div>
        <div class="gt-stat">
          <div class="gt-stat-val">${offspringAvgWeight > 0 ? offspringAvgWeight.toFixed(1) + 'kg' : '-'}</div>
          <div class="gt-stat-lbl">Yavru Ort. Ağırlık</div>
        </div>
        <div class="gt-stat">
          <div class="gt-stat-val">${healthCount}</div>
          <div class="gt-stat-lbl">Sağlık Kaydı</div>
        </div>
        <div class="gt-stat">
          <div class="gt-stat-val">${prodTotal > 0 ? prodTotal.toFixed(0) : '-'}</div>
          <div class="gt-stat-lbl">Toplam Üretim</div>
        </div>
      </div>`;
  },

  async analyzeWithAI() {
    if (!this._data) { AI4.toast('Önce hayvan seçin!', 'yl'); return; }
    const D = window.D || {};
    const tree = this._data;
    const animal = tree.animal;
    const btn = document.getElementById('gt-ai-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analiz ediliyor...'; }

    const prod = D.production?.filter(p => p.animal_tag === animal.tag_number) || [];
    const health = D.health?.filter(h => h.animal_tag === animal.tag_number) || [];
    const offspring = D.animals?.filter(a => a.mother_tag === animal.tag_number || a.father_tag === animal.tag_number) || [];

    const prompt = `Çiftlik hayvanı genetik ve verim analizi yap.

HAYVAN: ${animal.tag_number} (${animal.name || '-'}) · ${animal.species} · ${animal.breed || 'Bilinmiyor'}
Ağırlık: ${animal.weight || '?'} kg · Günlük Süt: ${animal.daily_milk || '?'} lt · Durum: ${animal.status}
Anne: ${tree.mother ? tree.mother.tag_number + ' (' + tree.mother.species + ')' : 'Bilinmiyor'}
Baba: ${tree.father ? tree.father.tag_number + ' (' + tree.father.species + ')' : 'Bilinmiyor'}
Sağlık geçmişi: ${health.length} kayıt (${health.filter(h => h.record_type === 'Tedavi').length} tedavi)
Üretim: ${prod.length} kayıt · Toplam: ${prod.reduce((s, p) => s + (parseFloat(p.quantity) || 0), 0).toFixed(0)} birim
Yavrular: ${offspring.length} (ort. ağırlık: ${offspring.length ? (offspring.reduce((s,a) => s + (parseFloat(a.weight)||0), 0)/offspring.length).toFixed(1) : '-'} kg)

Şunları analiz et (3-4 kısa madde):
1. Genetik potansiyel değerlendirmesi
2. Verim tahmini (süt/et/üreme)
3. Kalıtsal sağlık riski
4. Damızlık değeri ve öneri

Türkçe, emoji kullan, kısa tut.`;

    const aiSection = document.getElementById('gt-ai-section');
    if (aiSection) {
      aiSection.innerHTML = `<div class="gt-ai-section">
        <div class="gt-ai-title">🧠 AI Genetik Analizi</div>
        <div style="color:var(--sub,#888);font-size:12px">Analiz hazırlanıyor...</div>
      </div>`;
    }

    try {
      const text = await AI4.groq(prompt, AI4.farmContext(), 600);
      if (aiSection) {
        aiSection.innerHTML = `<div class="gt-ai-section">
          <div class="gt-ai-title">🧠 AI Genetik Analizi — ${animal.tag_number}</div>
          <div style="font-size:12.5px;line-height:1.7">${text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div>
        </div>`;
      }
    } catch(e) {
      if (aiSection) aiSection.innerHTML = `<div class="gt-ai-section" style="border-color:#ef4444">❌ ${e.message}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg> AI Verim Analizi'; }
    }
  },

  exportSVG() {
    const svgEl = document.getElementById('gt-tree-wrap')?.querySelector('svg');
    if (!svgEl) { AI4.toast('SVG bulunamadı', 'yl'); return; }
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'soy-agaci-' + (this._data?.animal?.tag_number || 'tree') + '.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
};


// ═════════════════════════════════════════════════════════════════════════════
// ANA MODÜL INIT — Navigasyona butonlar ekle
// ═════════════════════════════════════════════════════════════════════════════
function initAIModule() {
  // AI Araçlar sayfası oluştur
  injectAIToolsPage();
  // Ana sayfaya Hızlı Erişim butonları ekle
  injectDashboardAIBar();
  // Navigasyona AI Araçları menüsü ekle
  injectAINavItem();
  console.log('[AI4] Modül yüklendi ✓ — Sesli kayıt, Görüntü analizi, Günlük planlama, Soy ağacı');
}

function injectAIToolsPage() {
  const content = document.getElementById('content');
  if (!content || document.getElementById('pg-AITools')) return;

  const pg = document.createElement('div');
  pg.className = 'pg';
  pg.id = 'pg-AITools';
  pg.innerHTML = `
<div style="max-width:900px;margin:0 auto">
  <!-- Hero -->
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1a3c2e 50%,#1e1b4b 100%);border-radius:16px;padding:28px 32px;margin-bottom:24px;position:relative;overflow:hidden">
    <div style="position:absolute;right:-20px;top:-20px;width:180px;height:180px;background:radial-gradient(circle,rgba(47,179,68,.15) 0%,transparent 70%);pointer-events:none"></div>
    <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px">AI SÜPER ARAÇLAR</div>
    <div style="font-size:26px;font-weight:800;color:#fff;margin-bottom:6px">Yapay Zeka Asistanı</div>
    <div style="font-size:13px;color:rgba(255,255,255,.6)">Sesli kayıt · Görüntü analizi · Akıllı planlama · Genetik analiz</div>
  </div>

  <!-- 4 Araç Kartı -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:24px">
    <!-- Sesli Kayıt -->
    <div onclick="VoiceRecord.open()" style="background:var(--card);border:1px solid var(--brd);border-radius:14px;padding:20px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)';this.style.borderColor='var(--accent)'" onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--brd)'">
      <div style="width:52px;height:52px;background:linear-gradient(135deg,#2fb344,#16a34a);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" width="24" height="24" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8"/></svg>
      </div>
      <div style="font-size:14px;font-weight:700;margin-bottom:5px">Sesli Kayıt</div>
      <div style="font-size:11.5px;color:var(--sub);line-height:1.5">Konuşun, AI otomatik kayıt oluştursun</div>
      <div style="margin-top:10px;font-size:11px;background:var(--accent-lt);color:var(--accent);padding:3px 10px;border-radius:20px;display:inline-block">Türkçe Destekli</div>
    </div>

    <!-- Görüntü Analizi -->
    <div onclick="PhotoDiag.open()" style="background:var(--card);border:1px solid var(--brd);border-radius:14px;padding:20px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)';this.style.borderColor='#8b5cf6'" onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--brd)'">
      <div style="width:52px;height:52px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" width="24" height="24" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
      <div style="font-size:14px;font-weight:700;margin-bottom:5px">Hastalık Tespiti</div>
      <div style="font-size:11.5px;color:var(--sub);line-height:1.5">Fotoğraf çek, AI hastalık tanısı koysun</div>
      <div style="margin-top:10px;font-size:11px;background:#f5f3ff;color:#8b5cf6;padding:3px 10px;border-radius:20px;display:inline-block">Gemini Vision</div>
    </div>

    <!-- Günlük Planlama -->
    <div onclick="DailyPlanner.open()" style="background:var(--card);border:1px solid var(--brd);border-radius:14px;padding:20px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)';this.style.borderColor='#f59e0b'" onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--brd)'">
      <div style="width:52px;height:52px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" width="24" height="24" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
      </div>
      <div style="font-size:14px;font-weight:700;margin-bottom:5px">Günlük Planlama</div>
      <div style="font-size:11.5px;color:var(--sub);line-height:1.5">AI çiftlik durumuna göre plan oluştursun</div>
      <div style="margin-top:10px;font-size:11px;background:#fffbeb;color:#b45309;padding:3px 10px;border-radius:20px;display:inline-block">WhatsApp Entegre</div>
    </div>

    <!-- Soy Ağacı -->
    <div onclick="GeneticTree.open()" style="background:var(--card);border:1px solid var(--brd);border-radius:14px;padding:20px;cursor:pointer;transition:all .15s;text-align:center" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)';this.style.borderColor='#3b82f6'" onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--brd)'">
      <div style="width:52px;height:52px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" width="24" height="24" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div style="font-size:14px;font-weight:700;margin-bottom:5px">Soy Ağacı</div>
      <div style="font-size:11.5px;color:var(--sub);line-height:1.5">3 nesil genetik analiz ve verim tahmini</div>
      <div style="margin-top:10px;font-size:11px;background:#eff6ff;color:#2563eb;padding:3px 10px;border-radius:20px;display:inline-block">3 Nesil Görsel</div>
    </div>
  </div>

  <!-- API Durum -->
  <div style="background:var(--card);border:1px solid var(--brd);border-radius:12px;padding:16px" id="ai-tools-status">
    <div style="font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">API Durum</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap" id="ai-api-status-badges"></div>
  </div>
</div>`;

  content.appendChild(pg);

  // Sayfa açılınca API durumunu güncelle
  const origRenderPage = window.renderPage;
  window.renderPage = function(id) {
    if (id === 'AITools') renderAIToolsPage();
    if (origRenderPage) origRenderPage(id);
  };
}

function renderAIToolsPage() {
  const el = document.getElementById('ai-api-status-badges');
  if (!el) return;
  const groqOk = !!(AI4.groqKey()?.startsWith('gsk_'));
  const geminiOk = !!(AI4.geminiKey());
  const speechOk = VoiceRecord.supported();
  const camOk = !!(navigator.mediaDevices?.getUserMedia);
  const badges = [
    { label: 'Groq AI', ok: groqOk, note: groqOk ? 'Bağlı' : 'Key yok' },
    { label: 'Gemini Vision', ok: geminiOk, note: geminiOk ? 'Bağlı' : 'Key yok' },
    { label: 'Sesli Kayıt', ok: speechOk, note: speechOk ? 'Destekleniyor' : 'Desteklenmiyor' },
    { label: 'Kamera', ok: camOk, note: camOk ? 'Erişilebilir' : 'Erişilemez' },
  ];
  el.innerHTML = badges.map(b => `
    <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;background:${b.ok ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.08)'};border:1px solid ${b.ok ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}">
      <span style="width:7px;height:7px;border-radius:50%;background:${b.ok ? '#16a34a' : '#dc2626'};display:inline-block"></span>
      <span style="font-size:12px;font-weight:600">${b.label}</span>
      <span style="font-size:11px;color:var(--sub)">${b.note}</span>
    </div>`).join('');
}

function injectDashboardAIBar() {
  // Dashboard'a AI hızlı erişim butonu ekle — bir sonraki renderDashboard çağrısında
  const origRenderDashboard = window.renderDashboard;
  window.renderDashboard = function() {
    if (origRenderDashboard) origRenderDashboard();
    injectDashboardQuickAI();
  };
}

function injectDashboardQuickAI() {
  // Dashboard hero'ya AI araçları butonu ekle
  const heroActions = document.querySelector('.dash-hero-actions');
  if (!heroActions || heroActions.querySelector('#dash-ai-tools-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'dash-ai-tools-btn';
  btn.className = 'btn-hero-sec';
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/></svg>AI Araçları`;
  btn.onclick = () => { if (typeof showPage === 'function') showPage('AITools', null); };
  heroActions.appendChild(btn);
}

function injectAINavItem() {
  // NAV array'e eklendi — bu fonksiyon artık gerekmiyor
}

// ── Hayvan detay sayfasından soy ağacı açma ──────────────────────────────────
// Hayvan detay sayfasındaki "QR Kod" tab yanına "Soy Ağacı" butonu eklenir
const origOpenAnimalDetail = window.openAnimalDetail;
if (typeof origOpenAnimalDetail === 'function') {
  window.openAnimalDetail = function(idx) {
    origOpenAnimalDetail(idx);
    setTimeout(() => {
      const tabsWrap = document.querySelector('#pg-AnimalDetail .tabs');
      if (!tabsWrap || tabsWrap.querySelector('#tab-btn-genetic')) return;
      const D = window.D || {};
      const animal = D.animals?.[idx];
      if (!animal) return;
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.id = 'tab-btn-genetic';
      btn.innerHTML = '🧬 Soy Ağacı';
      btn.onclick = () => GeneticTree.open(animal.tag_number);
      tabsWrap.appendChild(btn);
    }, 200);
  };
}

// ── Modal kapanınca kameraları temizle ────────────────────────────────────────
const origCloseModal2 = window.closeModal;
window.closeModal = function() {
  PhotoDiag.cleanup?.();
  VoiceRecord.isListening && VoiceRecord.stop?.();
  if (typeof origCloseModal2 === 'function') origCloseModal2();
  document.getElementById('ai4-modal')?.remove();
};

// ── DOMContentLoaded veya hemen başlat ────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initAIModule, 500));
} else {
  setTimeout(initAIModule, 500);
}
