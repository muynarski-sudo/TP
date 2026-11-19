(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ---------- estado ---------- */
const DEF = { speed:60, size:48, lh:1.4, margin:6, focus:30, count:3, align:'left', fg:'#FFFFFF', bg:'#000000',
  mirror:false, guide:true, cue:true, camera:false, shade:40, facing:'user' };
let S = Object.assign({}, DEF, store.get('tp.settings', {}));
let scripts = store.get('tp.scripts', null);
if (!scripts) {
  scripts = [{ id: Date.now(), title:'Exemplo de roteiro', updated: Date.now(),
    body:'Olá, pessoal! Este é um roteiro de exemplo.\n\n[respire e sorria]\n\nToque na tela para iniciar ou pausar a rolagem. Ajuste a velocidade com o controle deslizante e o tamanho do texto em Ajustes.\n\nPara gravar um vídeo olhando para a câmera, ative "Usar câmera" nos Ajustes e toque no botão vermelho.\n\nBoa gravação!' }];
  store.set('tp.scripts', scripts);
}
let cur = null;
const saveScripts = () => store.set('tp.scripts', scripts);
const saveSettings = () => store.set('tp.settings', S);

/* ---------- navegação ---------- */
function show(id){ $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
function toast(msg, ms = 2500){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, ms); }

/* ---------- lista ---------- */
function renderList(){
  const L = $('#list'); L.innerHTML = '';
  $('#emptyMsg').hidden = scripts.length > 0;
  [...scripts].sort((a, b) => b.updated - a.updated).forEach(s => {
    const c = document.createElement('div'); c.className = 'card';
    const w = words(s.body);
    c.innerHTML = '<h3></h3><p></p><small></small>';
    c.querySelector('h3').textContent = s.title || 'Sem título';
    c.querySelector('p').textContent = s.body || '(vazio)';
    c.querySelector('small').textContent = `${w} palavras · ~${dur(w)}`;
    c.onclick = () => openEditor(s.id);
    L.appendChild(c);
  });
}
const words = t => (t.trim().match(/\S+/g) || []).length;
const dur = w => { const m = w / 140; return m < 1 ? Math.max(1, Math.round(m * 60)) + ' s' : m.toFixed(1).replace('.', ',') + ' min'; };

$('#btnNew').onclick = () => {
  const s = { id: Date.now(), title:'', body:'', updated: Date.now() };
  scripts.push(s); saveScripts(); openEditor(s.id, true);
};

/* ---------- editor ---------- */
function openEditor(id, focus){
  cur = scripts.find(s => s.id === id); if (!cur) return;
  $('#title').value = cur.title; $('#body').value = cur.body; updMeta(); show('editor');
  if (focus) $('#title').focus();
}
function updMeta(){ const w = words($('#body').value); $('#wc').textContent = w + ' palavras'; $('#dur').textContent = '~' + dur(w) + ' de leitura'; }
function commit(){
  if (!cur) return;
  cur.title = $('#title').value.trim(); cur.body = $('#body').value; cur.updated = Date.now(); saveScripts();
}
$('#title').oninput = commit;
$('#body').oninput = () => { updMeta(); commit(); };
$('#btnBack').onclick = () => {
  commit();
  if (cur && !cur.title && !cur.body.trim()) scripts = scripts.filter(s => s !== cur);
  saveScripts(); cur = null; renderList(); show('home');
};
$('#btnDelete').onclick = () => {
  if (!confirm('Excluir este roteiro?')) return;
  scripts = scripts.filter(s => s !== cur); saveScripts(); cur = null; renderList(); show('home');
};

/* ---------- ajustes ---------- */
const FMT = { speed:v => v + ' px/s', size:v => v + ' px', lh:v => (+v).toFixed(1), margin:v => v + '%', focus:v => v + '%', count:v => v + ' s', shade:v => v + '%' };
function applySettings(){
  const T = $('#text'), P = $('#prompter');
  T.style.fontSize = S.size + 'px'; T.style.lineHeight = S.lh; T.style.textAlign = S.align; T.style.color = S.fg;
  T.style.paddingLeft = T.style.paddingRight = S.margin + '%';
  P.style.background = S.bg;
  $('#mirror').style.transform = S.mirror ? 'scaleX(-1)' : '';
  $('#guide').style.top = S.focus + '%'; $('#guide').hidden = !S.guide;
  $('#shade').style.opacity = S.camera ? S.shade / 100 : 0;
  P.classList.toggle('cam', S.camera);
  $$('[data-cam]').forEach(e => e.hidden = !S.camera);
  $$('#sheet input[type=range]').forEach(i => i.value = S[i.dataset.k]);
  $$('#sheet [data-o]').forEach(o => o.textContent = FMT[o.dataset.o](S[o.dataset.o]));
  $$('#sheet input[type=checkbox]').forEach(i => i.checked = !!S[i.dataset.k]);
  $$('#sheet .seg').forEach(g => $$('button', g)); 
  $$('#sheet .seg').forEach(g => [...g.children].forEach(b => b.classList.toggle('on', b.dataset.v === S[g.dataset.k])));
  $('#rSpeed').value = S.speed; $('#oSpeed').textContent = FMT.speed(S.speed);
  $('#pRec').hidden = !S.camera;
  saveSettings(); layout();
}
$$('#sheet input[type=range]').forEach(i => i.oninput = () => { S[i.dataset.k] = +i.value; applySettings(); });
$$('#sheet input[type=checkbox]').forEach(i => i.onchange = async () => {
  S[i.dataset.k] = i.checked; applySettings();
  if (i.dataset.k === 'camera') { if (S.camera) await startCam(); else stopCam(); }
  else if (i.dataset.k === 'cue') render();
});
$$('#sheet .seg').forEach(g => g.onclick = async e => {
  const b = e.target.closest('button'); if (!b) return; S[g.dataset.k] = b.dataset.v; applySettings();
  if (g.dataset.k === 'facing' && S.camera && $('#prompter').classList.contains('active')) await startCam();
  if (g.dataset.k === 'align') layout();
});
$('#rSpeed').oninput = e => { S.speed = +e.target.value; applySettings(); };
$('#btnSettings').onclick = () => $('#sheet').hidden = false;
$('#pSettings').onclick = () => { $('#sheet').hidden = false; };
$('#sheetClose').onclick = () => $('#sheet').hidden = true;
$('#sheet').onclick = e => { if (e.target.id === 'sheet') $('#sheet').hidden = true; };

/* ---------- teleprompter ---------- */
let pos = 0, playing = false, last = 0, raf = 0, maxPos = 0, hideT = 0, cdT = 0, counting = false;
function render(){
  const T = $('#text'); T.innerHTML = '';
  const src = (cur ? cur.body : '') || '(roteiro vazio)';
  src.split(/\n{2,}/).forEach(par => {
    const p = document.createElement('p');
    par.split('\n').forEach((line, i, arr) => {
      if (S.cue && /^\s*\[.*\]\s*$/.test(line)) { const sp = document.createElement('span'); sp.className = 'cue'; sp.textContent = line.trim(); p.appendChild(sp); }
      else p.appendChild(document.createTextNode(line));
      if (i < arr.length - 1) p.appendChild(document.createElement('br'));
    });
    T.appendChild(p);
  });
  layout();
}
function layout(){
  const T = $('#text'), h = innerHeight;
  T.style.paddingTop = (h * S.focus / 100) + 'px';
  T.style.paddingBottom = (h * (100 - S.focus) / 100) + 'px';
  maxPos = Math.max(0, T.scrollHeight - h);
  pos = Math.min(pos, maxPos); paint();
}
function paint(){
  $('#text').style.transform = `translate3d(0,${-pos}px,0)`;
  $('#progress b').style.width = (maxPos ? pos / maxPos * 100 : 0) + '%';
}
function tick(t){
  if (!playing) return;
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  pos += S.speed * dt;
  if (pos >= maxPos) { pos = maxPos; paint(); pause(); toast('Fim do roteiro'); return; }
  paint(); raf = requestAnimationFrame(tick);
}
function play(){
  if (playing || counting) return;
  if (pos >= maxPos && maxPos > 0) pos = 0;
  if (pos === 0 && S.count > 0 && !play.skip) return countdown(S.count);
  play.skip = false; playing = true; last = performance.now(); raf = requestAnimationFrame(tick);
  $('#pPlay').textContent = '❚❚'; scheduleHide(); wake(true);
}
function pause(){
  playing = false; cancelAnimationFrame(raf); $('#pPlay').textContent = '▶'; showCtl(); wake(false);
}
function toggle(){ counting ? cancelCount() : playing ? pause() : play(); }
function countdown(n){
  counting = true; const c = $('#countdown'); c.hidden = false; c.textContent = n; $('#pPlay').textContent = '❚❚';
  cdT = setInterval(() => {
    n--; if (n <= 0) { cancelCount(true); play.skip = true; play(); } else c.textContent = n;
  }, 1000);
  scheduleHide();
}
function cancelCount(done){ clearInterval(cdT); counting = false; $('#countdown').hidden = true; if (!done) { $('#pPlay').textContent = '▶'; showCtl(); } }
function showCtl(){ $('#prompter').classList.remove('hide'); clearTimeout(hideT); }
function scheduleHide(){ /* controles ficam sempre visíveis */ }
function setSpeed(d){ S.speed = Math.max(5, Math.min(400, S.speed + d)); applySettings(); toast('Velocidade: ' + S.speed); }
function restart(){ pause(); cancelCount(); pos = 0; paint(); }

$('#btnPlay').onclick = () => { commit(); openPrompter(); };
function openPrompter(){
  pos = 0; show('prompter'); render(); applySettings(); showCtl();
  if (S.camera) startCam();
  requestFs();
}
$('#pExit').onclick = () => { if (recording) stopRec(); restart(); stopCam(); exitFs(); show('editor'); };
$('#pPlay').onclick = e => { e.stopPropagation(); toggle(); };
$('#pFaster').onclick = e => { e.stopPropagation(); setSpeed(10); };
$('#pSlower').onclick = e => { e.stopPropagation(); setSpeed(-10); };
$('#pRestart').onclick = e => { e.stopPropagation(); restart(); };
$('#pbottom').addEventListener('pointerdown', e => e.stopPropagation());
$('#ptop').addEventListener('pointerdown', e => e.stopPropagation());

/* toque = play/pause ; arrastar = rolar manualmente */
(() => {
  const st = $('#stage'); let y0 = 0, p0 = 0, moved = false, down = false, id = null;
  st.addEventListener('pointerdown', e => { down = true; moved = false; y0 = e.clientY; p0 = pos; id = e.pointerId; st.setPointerCapture(id); });
  st.addEventListener('pointermove', e => {
    if (!down) return; const dy = e.clientY - y0;
    if (Math.abs(dy) > 8) moved = true;
    if (moved) { pos = Math.max(0, Math.min(maxPos, p0 - dy)); paint(); }
  });
  const up = () => { if (!down) return; down = false; if (!moved) { toggle(); if (playing || counting) scheduleHide(); } else if (playing) last = performance.now(); };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', () => down = false);
  st.addEventListener('wheel', e => { pos = Math.max(0, Math.min(maxPos, pos + e.deltaY)); paint(); }, { passive: true });
})();
addEventListener('keydown', e => {
  if (!$('#prompter').classList.contains('active')) return;
  const k = e.key;
  if (k === ' ' || k === 'Enter' || k === 'PageDown') { e.preventDefault(); toggle(); }
  else if (k === 'ArrowUp') { e.preventDefault(); setSpeed(10); }
  else if (k === 'ArrowDown') { e.preventDefault(); setSpeed(-10); }
  else if (k === 'Home') restart();
  else if (k === 'Escape') $('#pExit').click();
});
addEventListener('resize', layout); addEventListener('orientationchange', () => setTimeout(layout, 300));

/* ---------- tela ligada / tela cheia ---------- */
let lock = null;
async function wake(on){
  try { if (on && 'wakeLock' in navigator) lock = await navigator.wakeLock.request('screen'); else if (lock) { await lock.release(); lock = null; } } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && playing) wake(true); });
function requestFs(){ try { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => {}); } catch {} }
function exitFs(){ try { if (document.fullscreenElement) document.exitFullscreen(); } catch {} }

/* ---------- câmera e gravação ---------- */
let stream = null, mr = null, chunks = [], recording = false, recT0 = 0, recI = 0, recBlob = null, recExt = 'webm';
async function startCam(){
  stopCam();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Câmera indisponível. Abra o app por HTTPS.', 4000); S.camera = false; applySettings(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: S.facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: { echoCancellation: true, noiseSuppression: true }
    });
    const v = $('#cam'); v.srcObject = stream; v.style.transform = S.facing === 'user' ? 'scaleX(-1)' : ''; v.play().catch(() => {});
  } catch (err) {
    toast('Sem permissão para a câmera/microfone.', 4000); S.camera = false; applySettings();
  }
}
function stopCam(){ if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } $('#cam').srcObject = null; }
function pickMime(){
  const c = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return c.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function startRec(){
  if (!stream) return toast('Ative a câmera primeiro.');
  if (!window.MediaRecorder) return toast('Este navegador não grava vídeo.', 4000);
  const mime = pickMime(); chunks = [];
  try { mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined); } catch { return toast('Falha ao iniciar a gravação.'); }
  recExt = (mr.mimeType || mime).includes('mp4') ? 'mp4' : 'webm';
  mr.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
  mr.onstop = () => {
    recBlob = new Blob(chunks, { type: mr.mimeType || 'video/' + recExt });
    $('#recVideo').src = URL.createObjectURL(recBlob); $('#rec').hidden = false;
  };
  mr.start(1000); recording = true; recT0 = Date.now();
  $('#pRec').classList.add('on'); $('#recTimer').hidden = false;
  recI = setInterval(() => { const s = Math.floor((Date.now() - recT0) / 1000); $('#recTimer').textContent = '● ' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 500);
  restart(); play();
}
function stopRec(){
  if (!recording) return; recording = false; clearInterval(recI);
  try { mr.stop(); } catch {} $('#pRec').classList.remove('on'); $('#recTimer').hidden = true; pause();
}
$('#pRec').onclick = e => { e.stopPropagation(); recording ? stopRec() : startRec(); };
const fname = () => 'teleprompter-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.' + recExt;
$('#recSave').onclick = () => {
  if (!recBlob) return; const a = document.createElement('a'); a.href = URL.createObjectURL(recBlob); a.download = fname();
  document.body.appendChild(a); a.click(); a.remove(); toast('Vídeo salvo em Downloads/Arquivos.');
};
$('#recShare').onclick = async () => {
  if (!recBlob) return; const f = new File([recBlob], fname(), { type: recBlob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] }); else toast('Compartilhamento não suportado. Use Salvar.'); } catch {}
};
$('#recClose').onclick = () => { $('#rec').hidden = true; $('#recVideo').removeAttribute('src'); recBlob = null; };

/* ---------- init ---------- */
renderList(); applySettings();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
