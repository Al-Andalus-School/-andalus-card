/* =====================================================================
   منطق التطبيق: الواجهة، المعاينة، الحفظ، التصدير
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normDigits = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\D/g, '');
  const CARD_W = 794, CARD_H = 1123; // A4 بدقة 96dpi
  const KEY_CARDS = 'andalus.cards.v1', KEY_DRAFT = 'andalus.draft.v1';

  const state = { type: null, id: null, data: {}, zoomed: false };

  /* ---------- تطبيق الهوية ---------- */
  const root = document.documentElement.style;
  Object.entries({ primary: THEME.primary, ink: THEME.ink, soft: THEME.soft, tint: THEME.tint, bg: THEME.bg, line: THEME.line, font: THEME.font })
    .forEach(([k, v]) => root.setProperty('--' + k, v));

  /* ---------- التخزين المحلي ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  const getCards = () => store.get(KEY_CARDS, []);

  /* ---------- إشعارات وحوار التأكيد ---------- */
  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || 'ok');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
  }
  function confirmBox(msg, okText) {
    return new Promise(res => {
      const d = $('#dlg'); $('#dlgMsg').textContent = msg; $('#dlgOk').textContent = okText || 'تأكيد';
      const done = v => { d.close(); res(v); };
      $('#dlgOk').onclick = () => done(true); $('#dlgCancel').onclick = () => done(false);
      d.onclick = e => { if (e.target === d) done(false); };
      d.showModal();
    });
  }
  const busy = on => $('#busy').classList.toggle('show', on);

  /* ---------- الصفحة الرئيسية ---------- */
  const svg = p => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`;
  function renderHome() {
    $('#typeGrid').innerHTML = Object.entries(CARD_TYPES).map(([k, t]) => `
      <article class="type-card">
        <div class="ico">${svg(t.icon)}</div>
        <h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p>
        <button class="btn primary" data-new="${k}">إنشاء بطاقة</button>
      </article>`).join('');
    const draft = store.get(KEY_DRAFT, null);
    const hasDraft = draft && CARD_TYPES[draft.type] && Object.values(draft.data || {}).some(v => (Array.isArray(v) ? v.length : typeof v === 'object' ? Object.values(v).some(Boolean) : v));
    $('#draftBox').hidden = !hasDraft;
    renderSaved();
  }
  function renderSaved() {
    const list = getCards().sort((a, b) => b.updated - a.updated);
    $('#savedEmpty').hidden = list.length > 0;
    $('#savedCount').textContent = list.length ? '(' + list.length + ')' : '';
    $('#savedList').innerHTML = list.map(c => {
      const t = CARD_TYPES[c.type]; if (!t) return '';
      const dt = new Date(c.created).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
      return `<li class="saved-item">
        <div class="meta"><span class="tag">${esc(t.short)}</span><strong>${esc(c.data[t.titleField] || 'بدون عنوان')}</strong>
        <span class="sub">${esc(c.data.teacher || 'لم يحدد المعلم')} · ${esc(dt)}</span></div>
        <div class="acts"><button class="btn sm" data-open="${esc(c.id)}">فتح</button><button class="btn sm" data-dup="${esc(c.id)}">نسخ</button><button class="btn sm danger" data-del="${esc(c.id)}">حذف</button></div></li>`;
    }).join('');
  }

  /* ---------- النموذج ---------- */
  const emptyData = t => Object.assign(
    Object.fromEntries(Object.entries(t.fields).map(([k, f]) => [k, f.type === 'date' ? { day: '', week: '' } : f.type === 'checks' ? [] : ''])),
    Object.fromEntries(t.signatures.map((s, i) => ['sig_' + i, '']))); // sig_N = صورة التوقيع المرسوم
  const okSig = u => typeof u === 'string' && u.indexOf('data:image/png;base64,') === 0;
  const opts = a => a.map(o => `<option>${esc(o)}</option>`).join('');
  function control(k, f) {
    const id = 'f_' + k;
    switch (f.type) {
      case 'select': return `<select id="${id}" data-k="${k}"><option value="">اختر ${esc(f.label)}</option>${opts(f.options)}</select>`;
      case 'date': return `<div class="duo"><select data-k="${k}" data-s="day" aria-label="اليوم"><option value="">اليوم</option>${opts(LISTS.days)}</select><select data-k="${k}" data-s="week" aria-label="الأسبوع"><option value="">الأسبوع</option>${opts(LISTS.weeks)}</select></div>`;
      case 'number': return `<input id="${id}" data-k="${k}" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="0">`;
      case 'textarea': return `<textarea id="${id}" data-k="${k}" rows="4" maxlength="${f.max || 500}" placeholder="${esc(f.ph || '')}"></textarea>`;
      case 'checks': return `<div class="checks">${f.options.map(o => `<label class="chk"><input type="checkbox" data-k="${k}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div>`;
      default: return `<input id="${id}" data-k="${k}" type="text" maxlength="${f.max || 100}" placeholder="${esc(f.ph || '')}" autocomplete="off"${f.options ? ` list="dl_${k}"` : ''}>${f.options ? `<datalist id="dl_${k}">${opts(f.options)}</datalist>` : ''}`;
    }
  }
  // لوحة التوقيع (سبورة): يرسم المستخدم توقيعه فيظهر في البطاقة
  const sigHTML = t => `<fieldset class="grp"><legend>التوقيعات</legend><p class="hint">وقّع بالإصبع أو بالماوس داخل المربع، ويظهر توقيعك في البطاقة مباشرة.</p><div class="pads">${t.signatures.map((s, i) => s.manual ? '' :
    `<div class="padbox"><div class="padhead"><strong>${esc(s.role)}</strong><button type="button" class="btn sm" data-clrsig="${i}">مسح التوقيع</button></div><canvas class="pad" data-sig="${i}" width="640" height="220" aria-label="لوحة توقيع ${esc(s.role)}"></canvas></div>`).join('')}</div></fieldset>`;
  function initPads() {
    $$('canvas.pad', $('#form')).forEach(cv => {
      const i = cv.dataset.sig, ctx = cv.getContext('2d'); let drawing = false, last = null;
      ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = ctx.fillStyle = '#0f2430';
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
      cv.onpointerdown = e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { } drawing = true; last = pos(e); ctx.beginPath(); ctx.arc(last.x, last.y, 2, 0, 6.3); ctx.fill(); };
      cv.onpointermove = e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; };
      const end = () => { if (!drawing) return; drawing = false; state.data['sig_' + i] = cv.toDataURL('image/png'); renderPreview(); saveDraft(); };
      cv.onpointerup = end; cv.onpointercancel = end;
    });
  }
  function fillPads() {
    $$('canvas.pad', $('#form')).forEach(cv => {
      const ctx = cv.getContext('2d'), u = state.data['sig_' + cv.dataset.sig]; ctx.clearRect(0, 0, cv.width, cv.height);
      if (okSig(u)) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0); im.src = u; }
    });
  }
  function buildForm() {
    const t = CARD_TYPES[state.type], groups = {};
    Object.entries(t.fields).forEach(([k, f]) => (groups[f.group] = groups[f.group] || []).push([k, f]));
    $('#form').innerHTML = Object.entries(groups).map(([g, fs]) => `
      <fieldset class="grp"><legend>${esc(g)}</legend><div class="grid">${fs.map(([k, f]) => `
        <div class="f${f.type === 'date' || f.type === 'checks' || f.type === 'textarea' || k === 'name' ? ' wide' : ''}" data-f="${k}">
          <label${f.type === 'date' || f.type === 'checks' ? '' : ` for="f_${k}"`}>${esc(f.label)}${f.required ? ' <em>*</em>' : ''}</label>
          ${control(k, f)}<small class="err"></small></div>`).join('')}</div></fieldset>`).join('') + sigHTML(t);
    initPads();
  }
  function readForm() {
    const t = CARD_TYPES[state.type], d = state.data;
    Object.entries(t.fields).forEach(([k, f]) => {
      const els = $$(`[data-k="${k}"]`, $('#form'));
      if (f.type === 'date') els.forEach(e => d[k][e.dataset.s] = e.value);
      else if (f.type === 'checks') d[k] = els.filter(e => e.checked).map(e => e.value);
      else d[k] = els[0].value;
    });
  }
  function fillForm() {
    const t = CARD_TYPES[state.type], d = state.data;
    Object.entries(t.fields).forEach(([k, f]) => {
      const els = $$(`[data-k="${k}"]`, $('#form'));
      if (f.type === 'date') els.forEach(e => e.value = (d[k] || {})[e.dataset.s] || '');
      else if (f.type === 'checks') els.forEach(e => e.checked = (d[k] || []).includes(e.value));
      else els[0].value = d[k] || '';
    });
    fillPads();
  }
  function validate() {
    const t = CARD_TYPES[state.type]; let first = null;
    $$('.f', $('#form')).forEach(w => { w.classList.remove('bad'); $('.err', w).textContent = ''; });
    Object.entries(t.fields).forEach(([k, f]) => {
      if (f.required && !String(state.data[k]).trim()) {
        const w = $(`[data-f="${k}"]`, $('#form')); w.classList.add('bad'); $('.err', w).textContent = 'هذا الحقل مطلوب'; first = first || w;
      }
    });
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('أكمل الحقول المطلوبة ثم أعد المحاولة', 'err'); return false; }
    return true;
  }

  /* ---------- تصميم البطاقة ---------- */
  // بناء HTML البطاقة (يُستخدم في المعاينة والتصدير والطباعة)
  function cardHTML(type, d) {
    const t = CARD_TYPES[type], S = SCHOOL_CONFIG;
    const val = k => {
      const f = t.fields[k], v = d[k];
      if (f.type === 'date') return `<span class="dp"><i>اليوم:</i> ${esc(v.day)}</span><span class="dp"><i>الأسبوع:</i> ${esc(v.week)}</span>`;
      if (f.type === 'checks') return `<div class="cks">${f.options.map(o => `<span class="ck${v.includes(o) ? ' on' : ''}"><b></b>${esc(o)}</span>`).join('')}</div>`;
      return esc(String(v).trim()).replace(/\n/g, '<br>');
    };
    const rows = t.rows.map(r => r.length === 1
      ? `<tr${t.fields[r[0]].type === 'textarea' ? ' class="tall"' : ''}><th>${esc(t.fields[r[0]].label)}</th><td colspan="3">${val(r[0])}</td></tr>`
      : `<tr><th>${esc(t.fields[r[0]].label)}</th><td>${val(r[0])}</td><th>${esc(t.fields[r[1]].label)}</th><td>${val(r[1])}</td></tr>`).join('');
    const sigs = t.signatures.map((s, idx) => {
      const nm = s.fixed ? S[s.fixed] : String(d[s.from] || '').trim();
      return `<div class="sig"><h4>${esc(s.role)}</h4><p>${nm ? `<b>${esc(nm)}</b>` : '<span class="ln"></span>'}</p><p class="sg${(!s.manual && okSig(d['sig_' + idx])) ? ' has' : ''}">التوقيع: <span class="ln">${(!s.manual && okSig(d['sig_' + idx])) ? `<img src="${d['sig_' + idx]}" alt="">` : ''}</span></p></div>`;
    }).join('');
    return `<div class="card" dir="rtl" style="--rowh:${t.rowHeight}px">
      <div class="bar"><i></i><i></i><i></i></div>
      <header class="c-head">
        <div class="lg">${S.ministryLogo ? `<img src="${esc(S.ministryLogo)}" alt="">` : ''}</div>
        <div class="org"><p>${esc(S.educationDepartment)}</p><h2>${esc(S.schoolName)}</h2></div>
        <div class="lg">${S.logo ? `<img src="${esc(S.logo)}" alt="">` : ''}</div></header>
      <div class="c-title">${esc(t.title)}</div>
      <table class="c-table"><colgroup><col style="width:21%"><col style="width:29%"><col style="width:21%"><col style="width:29%"></colgroup><tbody>${rows}</tbody></table>
      <div class="sigs n${t.signatures.length}">${sigs}</div></div>`;
  }
  function renderPreview() {
    $('#cardMount').innerHTML = cardHTML(state.type, state.data);
    fitPreview();
  }
  function fitPreview() {
    const frame = $('#frame'), card = $('#cardMount .card'); if (!card) return;
    const w = frame.clientWidth - (state.zoomed ? 0 : 0);
    const s = state.zoomed ? 0.85 : Math.min(1, w / CARD_W);
    card.style.transform = `scale(${s})`;
    $('#cardMount').style.width = CARD_W * s + 'px'; $('#cardMount').style.height = CARD_H * s + 'px';
    $('#zoomBtn').textContent = state.zoomed ? 'ملاءمة العرض' : 'تكبير المعاينة';
  }

  /* ---------- الحفظ ---------- */
  const saveDraft = () => store.set(KEY_DRAFT, { type: state.type, id: state.id, data: state.data });
  function saveCard(silent) {
    const list = getCards(), now = Date.now();
    let rec = list.find(c => c.id === state.id);
    if (rec) { rec.data = JSON.parse(JSON.stringify(state.data)); rec.updated = now; }
    else { state.id = 'c' + now.toString(36) + Math.random().toString(36).slice(2, 6); list.push({ id: state.id, type: state.type, data: JSON.parse(JSON.stringify(state.data)), created: now, updated: now }); }
    if (!store.set(KEY_CARDS, list)) return toast('تعذر الحفظ: مساحة المتصفح ممتلئة أو التخزين معطل', 'err');
    saveDraft(); if (!silent) toast('تم حفظ البطاقة في «البطاقات المحفوظة»');
  }

  /* ---------- التنقل ---------- */
  function openEditor(type, rec) {
    state.type = type; state.id = rec ? rec.id : null; state.zoomed = false;
    const t = CARD_TYPES[type];
    state.data = Object.assign(emptyData(t), rec ? JSON.parse(JSON.stringify(rec.data)) : {});
    $('#edTitle').textContent = t.title;
    buildForm(); fillForm(); renderPreview();
    $('#home').hidden = true; $('#editor').hidden = false; window.scrollTo(0, 0);
  }
  function goHome() { $('#editor').hidden = true; $('#home').hidden = false; renderHome(); window.scrollTo(0, 0); }

  /* ---------- إنشاء صورة البطاقة (PNG) ---------- */
  // يُرسم نسخة بحجمها الحقيقي خارج الشاشة لضمان تطابقها مع المعاينة
  async function renderCanvas() {
    if (typeof html2canvas === 'undefined') throw new Error('lib');
    const stage = document.createElement('div'); stage.className = 'stage'; stage.innerHTML = cardHTML(state.type, state.data);
    document.body.appendChild(stage);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all($$('img', stage).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
      return await html2canvas(stage.firstElementChild, { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false, width: CARD_W, height: CARD_H });
    } finally { stage.remove(); }
  }
  const fileBase = () => {
    const t = CARD_TYPES[state.type], n = String(state.data[t.titleField] || '').replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 50);
    return t.short + (n ? ' - ' + n : '');
  };
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  async function run(label, fn) {
    if (!validate()) return;
    $('#busyMsg').textContent = label; busy(true);
    try { await fn(); } catch (e) { toast(e.message === 'lib' ? 'تعذر تحميل مكتبة التصدير. تأكد من الاتصال بالإنترنت' : 'حدث خطأ أثناء إنشاء الصورة، حاول مجدداً', 'err'); }
    busy(false);
  }
  const exportPNG = () => run('جارٍ إنشاء صورة البطاقة…', async () => {
    const c = await renderCanvas();
    await new Promise(r => c.toBlob(b => { download(URL.createObjectURL(b), fileBase() + '.png'); r(); }, 'image/png'));
    saveCard(true); toast('تم تحميل البطاقة بنجاح');
  });
  const exportPDF = () => run('جارٍ إنشاء ملف PDF…', async () => {
    if (!window.jspdf) throw new Error('lib');
    const c = await renderCanvas(), pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297); pdf.save(fileBase() + '.pdf');
    saveCard(true); toast('تم تحميل ملف PDF');
  });
  const copyImage = () => run('جارٍ نسخ البطاقة…', async () => {
    if (!navigator.clipboard || !window.ClipboardItem) return toast('متصفحك لا يدعم نسخ الصور، استخدم تحميل PNG', 'err');
    const c = await renderCanvas();
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('تم نسخ البطاقة كصورة');
  });
  function printCard() {
    if (!validate()) return;
    $('#printRoot').innerHTML = cardHTML(state.type, state.data);
    const clear = () => { $('#printRoot').innerHTML = ''; window.removeEventListener('afterprint', clear); };
    window.addEventListener('afterprint', clear);
    setTimeout(() => window.print(), 60);
  }

  /* ---------- الأحداث ---------- */
  document.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const ds = b.dataset;
    if (ds.clrsig != null) { state.data['sig_' + ds.clrsig] = ''; fillPads(); renderPreview(); saveDraft(); }
    else if (ds.new) openEditor(ds.new);
    else if (ds.open) { const r = getCards().find(c => c.id === ds.open); if (r) openEditor(r.type, r); }
    else if (ds.dup) {
      const list = getCards(), r = list.find(c => c.id === ds.dup); if (!r) return;
      const now = Date.now(); list.push({ id: 'c' + now.toString(36) + Math.random().toString(36).slice(2, 6), type: r.type, data: JSON.parse(JSON.stringify(r.data)), created: now, updated: now });
      store.set(KEY_CARDS, list); renderSaved(); toast('تم نسخ البطاقة');
    }
    else if (ds.del) { if (await confirmBox('سيتم حذف هذه البطاقة نهائياً. هل تريد المتابعة؟', 'حذف')) { store.set(KEY_CARDS, getCards().filter(c => c.id !== ds.del)); renderSaved(); toast('تم حذف البطاقة'); } }
  });
  $('#btnHome').onclick = goHome;
  $('#btnDraft').onclick = () => { const d = store.get(KEY_DRAFT); if (d) { openEditor(d.type, { id: d.id, data: d.data }); } };
  $('#btnDownload').onclick = exportPNG;
  $('#btnPdf').onclick = exportPDF;
  $('#btnCopy').onclick = copyImage;
  $('#btnPrint').onclick = printCard;
  $('#btnSave').onclick = () => { if (validate()) saveCard(); };
  $('#btnEdit').onclick = () => { const i = $('#form input, #form select'); $('#form').scrollIntoView({ behavior: 'smooth', block: 'start' }); if (i) setTimeout(() => i.focus({ preventScroll: true }), 350); };
  $('#btnClear').onclick = async () => {
    if (await confirmBox('سيتم مسح جميع البيانات المدخلة في هذه البطاقة. هل تريد المتابعة؟', 'مسح البيانات')) {
      state.data = emptyData(CARD_TYPES[state.type]); fillForm(); $$('.f', $('#form')).forEach(w => { w.classList.remove('bad'); $('.err', w).textContent = ''; });
      renderPreview(); saveDraft(); toast('تم مسح البيانات');
    }
  };
  $('#zoomBtn').onclick = () => { state.zoomed = !state.zoomed; $('#frame').classList.toggle('zoomed', state.zoomed); fitPreview(); };

  // تحديث مباشر للمعاينة أثناء الكتابة
  $('#form').addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k && CARD_TYPES[state.type].fields[t.dataset.k].type === 'number') t.value = normDigits(t.value);
    const w = t.closest('.f'); if (w) { w.classList.remove('bad'); $('.err', w).textContent = ''; }
    readForm(); renderPreview(); saveDraft();
  });
  window.addEventListener('resize', fitPreview);
  if (window.ResizeObserver) new ResizeObserver(fitPreview).observe($('#frame'));

  // تهيئة
  $('#brandLogo').src = SITE_CONFIG.siteLogo;
  $('#siteTitle').textContent = SITE_CONFIG.siteTitle;
  $('#heroSub').textContent = SITE_CONFIG.siteSubtitle;
  document.title = SITE_CONFIG.siteTitle + ' | ' + SCHOOL_CONFIG.schoolName;
  $('#schoolName').textContent = SCHOOL_CONFIG.schoolName;
  renderHome();
})();
