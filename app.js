/* 课表 PWA —— 纯本地存储，无构建步骤 */
'use strict';

const KEY = 'kebiao.v1';
const RH = 52;
const TIME_COL = 34;
const DAY_MIN_W = 58;
const COLORS = ['#3b5bdb', '#0d9488', '#d97706', '#db2777', '#7c3aed', '#16a34a', '#e11d48', '#0f766e'];
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DEFAULT_PERIODS = [
  ['08:20', '09:00'], ['09:05', '09:45'], ['10:05', '10:45'], ['10:50', '11:30'],
  ['11:35', '12:15'], ['14:30', '15:10'], ['15:15', '15:55'], ['16:15', '16:55'],
  ['17:00', '17:40'], ['19:30', '20:10'], ['20:15', '20:55'], ['21:00', '21:40'],
];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n) => String(n).padStart(2, '0');
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/* ---------- 日期工具 ---------- */
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseYmd(s) { const [y, m, d] = String(s || '').split('-').map(Number); return new Date(y || 2026, (m || 1) - 1, d || 1); }
function mondayOf(d) { const x = new Date(d); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function toMin(t) { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); }
function fmtMD(d) { return `${d.getMonth() + 1}月${d.getDate()}日`; }
function hm(mins) { const m = Math.max(0, Math.round(mins)); if (m < 60) return `${m} 分钟`; return `${Math.floor(m / 60)} 小时 ${m % 60 ? (m % 60) + ' 分' : ''}`.trim(); }

/* ---------- 周次表达式 ---------- */
// 「3」「6-9」「5-7单」「8-16(双)」逗号/顿号分隔，展开成周次数组
function parseWl(str, maxW) {
  const max = clamp(+maxW || 30, 1, 60);
  const set = new Set();
  String(str == null ? '' : str).split(/[,，、;；\s]+/).forEach((raw) => {
    let tok = raw.replace(/[本次周]/g, '').trim();
    if (!tok) return;
    let odd = null;
    const pm = tok.match(/[（(]?(单|双)[)）]?$/);
    if (pm) { odd = pm[1] === '单'; tok = tok.slice(0, pm.index); }
    const rm = tok.match(/^(\d+)(?:\s*[-~—]\s*(\d+))?$/);
    if (!rm) return;
    const a = clamp(+rm[1], 1, max);
    const b = clamp(+(rm[2] || rm[1]), 1, max);
    for (let w = Math.min(a, b); w <= Math.max(a, b); w++) {
      if (odd === null || (w % 2 === 1) === odd) set.add(w);
    }
  });
  return [...set].sort((x, y) => x - y);
}
function fmtWl(list) {
  const a = [...new Set((list || []).map(Number).filter((n) => n >= 1))].sort((x, y) => x - y);
  const out = [];
  let s = a[0], p = a[0];
  for (let i = 1; i <= a.length; i++) {
    if (a[i] === p + 1) { p = a[i]; continue; }
    out.push(s === p ? `${s}` : `${s}-${p}`);
    s = p = a[i];
  }
  return out.join(',');
}
// 就地把手工数据统一成 wl + wList（导入的旧备份只有 wFrom/wTo/parity）
function normWeeks(c, maxW) {
  const max = clamp(+maxW || 30, 1, 60);
  let list = Array.isArray(c.wList) && c.wList.length ? c.wList.map(Number) : null;
  if (!list && c.wl) list = parseWl(c.wl, max);
  if (!list && c.wFrom) {
    const from = clamp(+c.wFrom, 1, max), to = clamp(+c.wTo || c.wFrom, from, max);
    list = [];
    for (let w = from; w <= to; w++) {
      if (c.parity === 'odd' && w % 2 === 0) continue;
      if (c.parity === 'even' && w % 2 === 1) continue;
      list.push(w);
    }
  }
  c.wList = (list || []).filter((w) => w >= 1 && w <= max);
  if (!c.wList.length) c.wList = Array.from({ length: max }, (_, i) => i + 1);
  c.wl = fmtWl(c.wList);
  delete c.wFrom; delete c.wTo; delete c.parity;
  return c;
}

/* ---------- 数据 ---------- */
let state = null;
let view = 'week';
let shownWeek = null;

function newSemester() {
  const start = mondayOf(new Date());
  return {
    id: uid(),
    name: `${start.getFullYear()}—${start.getFullYear() + 1} 第1学期`,
    start: ymd(start),
    weeks: 20,
    days: 5,
    periods: DEFAULT_PERIODS.map(([s, e]) => ({ s, e })),
  };
}

function seedCourses(semId, weeks, nPer) {
  const list = window.SEED && window.SEED.courses;
  if (!Array.isArray(list)) return [];
  const maxPer = clamp(+nPer || 12, 1, 40);
  return list.filter((c) => c && c.name).map((c) => {
    const start = clamp(+c.start || 1, 1, maxPer);
    const end = Math.max(start, clamp(+c.end || c.start || 1, 1, maxPer));
    const out = {
      id: uid(), sem: semId,
      name: String(c.name).slice(0, 24),
      teacher: String(c.teacher || '').slice(0, 16),
      loc: String(c.loc || '').slice(0, 24),
      day: clamp(+c.day || 1, 1, 7), start, end,
      wl: c.wl, wList: c.wList, wFrom: c.wFrom, wTo: c.wTo, parity: c.parity,
      color: c.color || COLORS[0],
    };
    return normWeeks(out, weeks);
  });
}

function freshState() {
  const sem = newSemester();
  const sd = window.SEED && window.SEED.semester;
  if (sd) {
    if (sd.name) sem.name = sd.name;
    if (sd.start) sem.start = sd.start;
    if (sd.weeks) sem.weeks = clamp(+sd.weeks, 1, 40);
    if (sd.days) sem.days = clamp(+sd.days, 1, 7);
  }
  return {
    v: 1, semesters: [sem], activeSem: sem.id,
    courses: seedCourses(sem.id, sem.weeks, sem.periods.length),
    ui: { theme: 'auto' },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.semesters) || !s.semesters.length) return freshState();
    s.courses = Array.isArray(s.courses) ? s.courses : [];
    s.courses.forEach((c) => {
      const owner = s.semesters.find((x) => x.id === c.sem);
      normWeeks(c, owner ? owner.weeks : 30);
    });
    s.ui = s.ui || { theme: 'auto' };
    if (!s.semesters.some((x) => x.id === s.activeSem)) s.activeSem = s.semesters[0].id;
    return s;
  } catch (e) {
    console.warn('读取本地数据失败', e);
    return freshState();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast('保存失败：本地存储不可用'); }
}

const sem = () => state.semesters.find((s) => s.id === state.activeSem) || state.semesters[0];
const coursesOf = (id) => state.courses.filter((c) => c.sem === id);

function semWeek(d = new Date()) {
  const s = sem();
  const anchor = mondayOf(parseYmd(s.start));
  const diff = Math.floor((mondayOf(d).getTime() - anchor.getTime()) / 86400000 / 7);
  const w = diff + 1;
  return w >= 1 && w <= s.weeks ? w : null;
}
function weekStartDate(s, w) { return addDays(mondayOf(parseYmd(s.start)), (w - 1) * 7); }
function inWeek(c, w) {
  if (Array.isArray(c.wList) && c.wList.length) return c.wList.indexOf(w) !== -1;
  if (c.wFrom) return w >= c.wFrom && w <= (c.wTo || c.wFrom);
  return true;
}
function coursesInWeek(w, s = sem()) { return coursesOf(s.id).filter((c) => inWeek(c, w)); }
function periodTime(s, idx) { const p = s.periods[idx - 1]; return p || { s: '--:--', e: '--:--' }; }

/* ---------- 状态栏文案 ---------- */
function nowInfo() {
  const s = sem();
  const d = new Date();
  const w = semWeek(d);
  const day = (d.getDay() + 6) % 7 + 1;
  const mins = d.getHours() * 60 + d.getMinutes();
  const list = w ? coursesInWeek(w).filter((c) => c.day === day)
    .map((c) => ({ c, from: toMin(periodTime(s, c.start).s), to: toMin(periodTime(s, c.end).e) }))
    .sort((a, b) => a.from - b.from) : [];
  const cur = list.find((x) => mins >= x.from && mins < x.to) || null;
  const next = list.find((x) => x.from > mins) || null;
  let periodNow = 0;
  s.periods.forEach((p, i) => { if (mins >= toMin(p.s) && mins < toMin(p.e)) periodNow = i + 1; });
  return { s, d, w, day, mins, list, cur, next, periodNow };
}

/* ---------- 渲染：周课表 ---------- */
function renderWeek() {
  const s = sem();
  const wrap = $('#grid');
  if (shownWeek === null) shownWeek = semWeek() ?? 1;
  const nDays = clamp(s.days || 5, 1, 7);
  shownWeek = clamp(shownWeek, 1, s.weeks);
  const w = shownWeek;
  const nPer = s.periods.length;
  const cols = `${TIME_COL}px repeat(${nDays}, minmax(${DAY_MIN_W}px, 1fr))`;
  const minWidth = TIME_COL + nDays * DAY_MIN_W;
  const list = coursesInWeek(w);
  const now = nowInfo();
  const monday = weekStartDate(s, w);
  const isCurWeek = now.w === w;

  $('#wk-label').textContent = `第 ${w} 周`;
  $('#wk-range').textContent = `${fmtMD(monday)} — ${fmtMD(addDays(monday, 6))}${isCurWeek ? ' · 本周' : ''}`;
  $('#wk-now').textContent = !isCurWeek ? '' : now.cur ? `正在上：${now.cur.c.name}` : now.next ? `下节 ${hm(now.next.from - now.mins)}后` : '今天没有课了';

  if (!list.length) {
    wrap.innerHTML = `<div class="empty"><b>第 ${w} 周还没有课</b><br>点右下角 ＋ 添加，或先载入示例看看效果
      <div><button class="wide-btn primary" id="empty-sample" style="max-width:180px;margin:14px auto 0">载入示例课表</button></div></div>`;
    $('#empty-sample').onclick = loadSample;
    return;
  }

  let html = `<div class="grid" style="min-width:${minWidth}px">`;
  html += `<div class="grid-head" style="grid-template-columns:${cols}"><div class="g-corner"></div>`;
  for (let d = 1; d <= nDays; d++) {
    const date = addDays(monday, d - 1);
    const today = isCurWeek && now.day === d;
    html += `<div class="g-day${today ? ' is-today' : ''}">${DAY_NAMES[d - 1]}<br><span style="font-weight:400">${date.getMonth() + 1}/${date.getDate()}</span></div>`;
  }
  html += `</div><div class="grid-body" style="grid-template-columns:${cols}"><div class="time-col">`;
  for (let i = 1; i <= nPer; i++) {
    const p = s.periods[i - 1];
    html += `<div class="g-time${isCurWeek && now.periodNow === i ? ' is-now' : ''}"><b>${i}</b><span>${esc(p.s)}</span></div>`;
  }
  html += `</div>`;
  for (let d = 1; d <= nDays; d++) {
    const today = isCurWeek && now.day === d;
    const lines = Array.from({ length: nPer }, (_, i) => i + 1)
      .map((i) => `<div class="rowline" data-per="${i}"></div>`).join('');
    html += `<div class="day-col${today ? ' is-today' : ''}" data-day="${d}" style="height:${nPer * RH}px">${lines}</div>`;
  }
  html += `</div></div>`;
  wrap.innerHTML = html;

  const body = $('.grid-body', wrap);
  const dayCols = $$('.day-col', body);
  list.forEach((c) => {
    if (c.day > nDays || c.start > nPer) return;
    dayCols[c.day - 1].appendChild(makeBlock(c, nPer, isCurWeek && now.day === c.day ? now : null));
  });
  layoutOverlaps(dayCols);
  dayCols.forEach((col) => {
    col.addEventListener('click', (e) => {
      if (e.target.closest('.block')) return;
      const per = clamp(Math.floor((e.clientY - col.getBoundingClientRect().top) / RH) + 1, 1, nPer);
      openSheet({ day: +col.dataset.day, start: per, end: per });
    });
  });
}

function makeBlock(c, nPer, nowCtx) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'block';
  b.dataset.id = c.id;
  const top = (c.start - 1) * RH + 2;
  const h = (c.end - c.start + 1) * RH - 4;
  b.style.top = `${top}px`;
  b.style.height = `${h}px`;
  b.style.background = c.color || COLORS[0];
  const running = nowCtx && nowCtx.cur && nowCtx.cur.c.id === c.id;
  if (running) b.classList.add('is-now');
  if (nowCtx && nowCtx.mins > toMin(periodTime(sem(), c.end).s) && nowCtx.day === c.day) b.classList.add('dim');
  const span = c.end - c.start + 1;
  const loc = c.loc ? `<span>${esc(c.loc)}</span>` : '';
  b.innerHTML = `<b>${esc(c.name)}</b>${span >= 2 ? loc : ''}${c.teacher ? `<span>${esc(c.teacher)}</span>` : ''}`;
  b.onclick = (e) => { e.stopPropagation(); openSheet(c); };
  return b;
}

function layoutOverlaps(dayCols) {
  dayCols.forEach((col) => {
    const blocks = $$('.block', col).sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));
    let cluster = [], clusterEnd = -1, colsUsed = [];
    const flush = () => {
      const k = colsUsed.length || 1;
      cluster.forEach(({ el, i }) => {
        if (k > 1) {
          el.style.left = `calc(${(i * 100) / k}% + 2px)`;
          el.style.width = `calc(${100 / k}% - 4px)`;
        }
      });
      cluster = []; colsUsed = []; clusterEnd = -1;
    };
    blocks.forEach((el) => {
      const top = parseFloat(el.style.top), bot = top + parseFloat(el.style.height);
      if (cluster.length && top >= clusterEnd) flush();
      let i = colsUsed.findIndex((end) => end <= top);
      if (i < 0) { i = colsUsed.length; colsUsed.push(bot); } else { colsUsed[i] = bot; }
      cluster.push({ el, i });
      clusterEnd = Math.max(clusterEnd, bot);
    });
    flush();
  });
}

/* ---------- 渲染：今日 ---------- */
function renderToday() {
  const { s, d, w, day, mins, list, cur, next } = nowInfo();
  const wd = DAY_NAMES[day - 1];
  const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  let big, pill;
  if (cur) {
    big = `正在上 · ${esc(cur.c.name)}`;
    pill = `还有 ${hm(cur.to - mins)}下课${cur.c.loc ? ' · ' + esc(cur.c.loc) : ''}`;
  } else if (w && next) {
    big = `${wd}的第 ${next.c.start} 节课还没开始`;
    pill = `下一节 ${hm(next.from - mins)}后 · ${esc(next.c.name)}${next.c.loc ? ' · ' + esc(next.c.loc) : ''}`;
  } else if (w) {
    big = '今天没有课了';
    pill = `下一个有课的日子：${nextDayWithCourse()}`;
  } else {
    big = '当前不在学期周次内';
    pill = `开学日：${s.start}`;
  }
  $('#today-hero').innerHTML = `
    <div class="big">${big}</div>
    <div class="sub">${fmtMD(d)} ${wd}${w ? ` · 第 ${w} 周` : ' · 学期外'} · ${clock}</div>
    <div class="pill">${pill}</div>`;

  $('#today-list').innerHTML = list.length ? list.map(({ c, from, to }) => {
    const st = mins >= to ? ['已结束', 'past'] : mins >= from ? ['进行中', 'now'] : ['未开始', ''];
    return `<div class="t-item ${st[1]}">
      <div class="t-bar" style="background:${c.color || COLORS[0]}"></div>
      <div class="t-body">
        <div class="t-title"><b>${esc(c.name)}</b><small>${c.start}-${c.end}节</small><span class="t-tag">${st[0]}</span></div>
        <div class="t-meta">${periodTime(s, c.start).s}–${periodTime(s, c.end).e}${c.loc ? ' · ' + esc(c.loc) : ''}${c.teacher ? ' · ' + esc(c.teacher) : ''}</div>
      </div></div>`;
  }).join('') : `<div class="empty">${w ? `${wd} 第 ${w} 周没有课` : '下一节：' + nextDayWithCourse()}</div>`;
}
function nextDayWithCourse() {
  const s = sem();
  for (let k = 1; k <= 8; k++) {
    const d = addDays(new Date(), k);
    const w = semWeek(d);
    if (!w) continue;
    const day = (d.getDay() + 6) % 7 + 1;
    const has = coursesInWeek(w).some((c) => c.day === day && day <= (s.days || 5));
    if (has) return `${fmtMD(d)} ${DAY_NAMES[day - 1]}`;
  }
  return '暂无后续课程';
}

/* ---------- 渲染：管理 ---------- */
function renderManage() {
  const s = sem();
  $('#sem-list').innerHTML = state.semesters.map((x) => {
    const n = coursesOf(x.id).length;
    const inp = 'border:1px solid var(--line);border-radius:8px;background:var(--surface-2);padding:6px;font-size:13px;color:var(--text)';
    return `<div class="row" style="align-items:flex-start" data-sem="${x.id}">
      <div class="grow" style="display:flex;flex-direction:column;gap:6px">
        <input class="sem-name" value="${esc(x.name)}" aria-label="学期名称" style="${inp};width:100%;padding:7px 8px">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <label style="display:flex;gap:4px;align-items:center;font-size:12px;color:var(--muted)">开学<input type="date" class="sem-start" value="${esc(x.start)}" style="${inp}"></label>
          <label style="display:flex;gap:4px;align-items:center;font-size:12px;color:var(--muted)">共<input type="number" class="sem-weeks" min="1" max="40" value="${x.weeks}" style="${inp};width:54px">周</label>
          <select class="sem-days" style="${inp}">
            ${[5, 6, 7].map((k) => `<option value="${k}"${(x.days || 5) === k ? ' selected' : ''}>${k === 7 ? '周一~周日' : k === 6 ? '周一~周六' : '周一~周五'}</option>`).join('')}
          </select>
        </div>
        <div class="sub">${n} 门课${x.id === state.activeSem ? ' · 使用中' : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;padding-top:2px">
        <button class="mini sem-use" type="button">${x.id === state.activeSem ? '使用中' : '切换'}</button>
        <button class="mini sem-del danger" type="button">删除</button>
      </div>
    </div>`;
  }).join('');

  $('#per-list').innerHTML = s.periods.map((p, i) => `<div class="period-row" data-i="${i}">
      <b>第${i + 1}节</b>
      <input type="time" class="p-s" value="${esc(p.s)}">
      <span class="muted">–</span>
      <input type="time" class="p-e" value="${esc(p.e)}">
      <button class="mini p-del danger" type="button" aria-label="删除">✕</button>
    </div>`).join('');

  const list = coursesOf(s.id).sort((a, b) => a.day - b.day || a.start - b.start);
  $('#course-list').innerHTML = list.length ? list.map((c) => `<div class="row" data-c="${c.id}">
      <span class="dot" style="background:${c.color || COLORS[0]}"></span>
      <div class="grow"><div>${esc(c.name)}</div>
        <div class="sub">${DAY_NAMES[c.day - 1]} ${c.start}-${c.end}节 · 第${esc(c.wl || '')}周${c.loc ? ' · ' + esc(c.loc) : ''}${c.day > (s.days || 5) ? ' · 超出上课天数，网格不显示' : ''}</div></div>
      <button class="mini c-edit" type="button">编辑</button>
      <button class="mini c-del danger" type="button">删除</button>
    </div>`).join('') : '<p class="hint" style="margin:0">当前学期还没有课程。</p>';

  const seedN = (window.SEED && Array.isArray(window.SEED.courses) ? window.SEED.courses : []).filter((c) => c && c.name).length;
  $('#data-seed').hidden = !seedN;

  const hint = $('#install-hint');
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    hint.textContent = '已作为独立应用运行。更新内容只需重新打开本页。';
  } else {
    hint.innerHTML = '用 iPhone 的 <b>Safari</b> 打开本页面 → 点底部 <b>分享</b> 按钮 → <b>添加到主屏幕</b>，即可从桌面全屏启动。<br>提示：必须通过 https 地址访问（如 GitHub Pages），不能用本地文件路径。';
  }
}

/* ---------- 渲染：通用 ---------- */
function renderAll() {
  const cur = $('.view.active');
  $('#title').textContent = sem().name.replace(/\s+/g, ' ');
  renderSemSelect();
  applyTheme();
  if (!cur || view === 'week') renderWeek();
  if (view === 'today') renderToday();
  if (view === 'manage') renderManage();
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
  $('#fab').hidden = view === 'manage';
}

function renderSemSelect() {
  const sel = $('#semester-select');
  sel.innerHTML = state.semesters.map((s) => `<option value="${s.id}"${s.id === state.activeSem ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
}

function applyTheme() {
  const t = state.ui.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const label = t === 'auto' ? '◐' : t === 'dark' ? '☾' : '☀';
  $('#btn-theme').textContent = label;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------- 课程编辑 ---------- */
let editing = null;
function openSheet(src) {
  const s = sem();
  const isNew = !src?.id;
  editing = isNew ? null : src;
  const c = src || { name: '', teacher: '', loc: '', day: 1, start: 1, end: 1, wl: `1-${s.weeks}`, color: COLORS[0] };
  $('#sheet-title').textContent = isNew ? '添加课程' : '编辑课程';
  $('#f-name').value = c.name || '';
  $('#f-teacher').value = c.teacher || '';
  $('#f-loc').value = c.loc || '';
  $('#f-day').innerHTML = DAY_NAMES.map((n, i) => `<option value="${i + 1}"${c.day === i + 1 ? ' selected' : ''}>${n}</option>`).join('');
  const opts = (v) => s.periods.map((_, i) => `<option value="${i + 1}"${v === i + 1 ? ' selected' : ''}>第 ${i + 1} 节 ${esc(s.periods[i].s)}</option>`).join('');
  $('#f-start').innerHTML = opts(c.start);
  $('#f-end').innerHTML = opts(c.end);
  $('#f-wl').value = c.wl || fmtWl(c.wList) || '1-' + s.weeks;
  $('#f-colors').innerHTML = COLORS.map((x) => `<button type="button" class="swatch${(c.color || COLORS[0]) === x ? ' on' : ''}" data-color="${x}" style="background:${x}"></button>`).join('');
  $('#f-delete').hidden = isNew;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#f-name').focus(), 60);
}
function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; editing = null; }

function saveSheet(e) {
  e.preventDefault();
  const s = sem();
  const name = $('#f-name').value.trim();
  if (!name) return toast('请填写课程名称');
  let start = +$('#f-start').value, end = +$('#f-end').value;
  if (start > end) [start, end] = [end, start];
  const wlRaw = $('#f-wl').value.trim();
  const wList = parseWl(wlRaw || `1-${s.weeks}`, s.weeks);
  if (!wList.length) return toast('周次没看懂，可填 1-16 或 3,6-9');
  const picked = $('.swatch.on')?.dataset.color || COLORS[0];
  const data = normWeeks({
    sem: s.id, name,
    teacher: $('#f-teacher').value.trim(),
    loc: $('#f-loc').value.trim(),
    day: +$('#f-day').value, start, end,
    wl: wlRaw, wList,
    color: picked,
  }, s.weeks);
  const wasEdit = !!editing;
  if (editing) Object.assign(editing, data);
  else state.courses.push({ id: uid(), ...data });
  save();
  closeSheet();
  renderAll();
  toast(wasEdit ? '已更新' : '已添加');
}

function loadSample() {
  const s = sem();
  const rows = [
    ['高等数学 A', '李老师', '一教 201', 1, 1, 2, COLORS[0]],
    ['大学英语 读写译', '王老师', '外语楼 305', 1, 3, 4, COLORS[2]],
    ['数据结构', '张老师', '实验楼 B402', 2, 1, 2, COLORS[3]],
    ['线性代数', '陈老师', '一教 108', 3, 3, 4, COLORS[4]],
    ['体育 太极拳', '赵教练', '西区操场', 4, 7, 8, COLORS[5]],
    ['离散数学', '孙老师', '三教 502', 5, 1, 2, COLORS[1]],
  ];
  rows.forEach(([name, teacher, loc, day, start, end, color]) => {
    state.courses.push(normWeeks({ id: uid(), sem: s.id, name, teacher, loc, day, start, end, wl: `1-${s.weeks}`, color }, s.weeks));
  });
  save();
  renderAll();
  toast('已载入示例，可在「管理」里修改');
}

/* ---------- 事件绑定 ---------- */
function bind() {
  $$('.tab').forEach((t) => t.addEventListener('click', () => { view = t.dataset.view; renderAll(); }));
  $('#semester-select').addEventListener('change', (e) => {
    state.activeSem = e.target.value; save(); shownWeek = semWeek() ?? 1; renderAll();
  });
  $('#btn-theme').addEventListener('click', () => {
    const order = ['auto', 'light', 'dark'];
    state.ui.theme = order[(order.indexOf(state.ui.theme) + 1) % 3];
    save(); applyTheme();
    toast({ auto: '主题：跟随系统', light: '主题：浅色', dark: '主题：深色' }[state.ui.theme]);
  });

  $('#wk-prev').onclick = () => { shownWeek = clamp((shownWeek ?? 1) - 1, 1, sem().weeks); renderWeek(); };
  $('#wk-next').onclick = () => { shownWeek = clamp((shownWeek ?? 1) + 1, 1, sem().weeks); renderWeek(); };
  $('#wk-today').onclick = () => { shownWeek = semWeek() ?? 1; renderWeek(); };
  $('#wk-jump').onclick = () => {
    const v = prompt(`跳到第几周（1–${sem().weeks}）`, String(semWeek() ?? 1));
    if (v === null) return;
    shownWeek = clamp(+v || 1, 1, sem().weeks);
    renderWeek();
  };

  $('#fab').onclick = () => openSheet(null);
  $('#sheet-form').addEventListener('submit', saveSheet);
  $$('[data-close]').forEach((el) => el.addEventListener('click', closeSheet));
  $('#f-colors').addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    $$('.swatch').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
  });
  $('#f-delete').onclick = () => {
    if (!editing || !confirm(`删除「${editing.name}」？`)) return;
    state.courses = state.courses.filter((c) => c.id !== editing.id);
    save(); closeSheet(); renderAll(); toast('已删除');
  };
  $('#f-start').addEventListener('change', (e) => {
    const end = $('#f-end');
    if (+end.value < +e.target.value) end.value = e.target.value;
  });

  $('#sem-add').onclick = () => {
    const s = newSemester();
    state.semesters.push(s);
    state.activeSem = s.id;
    shownWeek = semWeek() ?? 1;
    save(); renderAll(); toast('已新增学期');
  };
  $('#sem-list').addEventListener('click', (e) => {
    const row = e.target.closest('[data-sem]');
    if (!row) return;
    const id = row.dataset.sem;
    const target = state.semesters.find((x) => x.id === id);
    if (e.target.closest('.sem-use')) { state.activeSem = id; shownWeek = semWeek() ?? 1; save(); renderAll(); }
    if (e.target.closest('.sem-del')) {
      const n = coursesOf(id).length;
      if (!confirm(`删除「${target.name}」${n ? `及 ${n} 门课` : ''}？建议先导出备份。`)) return;
      state.semesters = state.semesters.filter((x) => x.id !== id);
      state.courses = state.courses.filter((c) => c.sem !== id);
      if (!state.semesters.length) state.semesters.push(newSemester());
      state.activeSem = state.semesters[0].id;
      save(); renderAll(); toast('已删除学期');
    }
  });
  $('#sem-list').addEventListener('change', (e) => {
    const row = e.target.closest('[data-sem]');
    const target = state.semesters.find((x) => x.id === row?.dataset.sem);
    if (!target) return;
    if (e.target.classList.contains('sem-name')) target.name = e.target.value.trim() || '未命名学期';
    if (e.target.classList.contains('sem-start')) target.start = e.target.value || target.start;
    if (e.target.classList.contains('sem-weeks')) target.weeks = clamp(Math.round(+e.target.value) || 20, 1, 40);
    if (e.target.classList.contains('sem-days')) target.days = clamp(+e.target.value || 5, 1, 7);
    save();
    $('#title').textContent = sem().name;
    renderSemSelect();
    if (view === 'week') renderWeek(); else renderManage();
  });

  const perRow = (e) => e.target.closest('[data-i]');
  $('#per-list').addEventListener('change', (e) => {
    const row = perRow(e);
    if (!row) return;
    const p = sem().periods[+row.dataset.i];
    if (e.target.classList.contains('p-s')) p.s = e.target.value;
    if (e.target.classList.contains('p-e')) p.e = e.target.value;
    save(); toast('节次时间已更新');
  });
  $('#per-list').addEventListener('click', (e) => {
    if (!e.target.closest('.p-del')) return;
    const row = perRow(e);
    const s = sem();
    if (s.periods.length <= 1) return toast('至少保留一节课');
    s.periods.splice(+row.dataset.i, 1);
    coursesOf(s.id).forEach((c) => {
      c.start = clamp(c.start, 1, s.periods.length);
      c.end = clamp(c.end, c.start, s.periods.length);
    });
    save(); renderManage(); renderWeek();
  });
  $('#per-add').onclick = () => {
    const s = sem();
    const last = s.periods[s.periods.length - 1];
    const startMin = last ? toMin(last.e) + 10 : 8 * 60;
    s.periods.push({ s: `${pad(Math.floor(startMin / 60) % 24)}:${pad(startMin % 60)}`, e: `${pad(Math.floor((startMin + 45) / 60) % 24)}:${pad((startMin + 45) % 60)}` });
    save(); renderManage(); renderWeek();
  };
  $('#per-reset').onclick = () => {
    if (!confirm(`恢复默认 ${DEFAULT_PERIODS.length} 节时间？`)) return;
    sem().periods = DEFAULT_PERIODS.map(([s, e]) => ({ s, e }));
    save(); renderManage(); renderWeek();
  };

  $('#course-list').addEventListener('click', (e) => {
    const row = e.target.closest('[data-c]');
    if (!row) return;
    const c = state.courses.find((x) => x.id === row.dataset.c);
    if (e.target.closest('.c-edit')) openSheet(c);
    if (e.target.closest('.c-del')) {
      if (!confirm(`删除「${c.name}」？`)) return;
      state.courses = state.courses.filter((x) => x.id !== c.id);
      save(); renderManage(); renderWeek(); toast('已删除');
    }
  });

  $('#data-export').onclick = exportData;
  $('#data-copy').onclick = copyBackup;
  $('#data-seed').onclick = applySeed;
  $('#data-import').onclick = () => $('#file-input').click();
  $('#file-input').addEventListener('change', importData);
  $('#data-sample').onclick = loadSample;
  $('#data-clear').onclick = () => {
    if (!confirm('清空全部学期与课程？此操作不可撤销。')) return;
    state = freshState();
    shownWeek = null;
    save(); renderAll(); toast('已清空');
  };
}

async function copyBackup() {
  const text = JSON.stringify(state);
  try {
    await navigator.clipboard.writeText(text);
    toast('备份已复制，去备忘录粘贴即可');
  } catch (e) {
    toast('剪贴板不可用，改用文件导出');
    exportData();
  }
}

function applySeed() {
  const s = sem();
  const list = seedCourses(s.id, s.weeks, s.periods.length);
  if (!list.length) return toast('seed.js 里没有课程数据');
  const had = coursesOf(s.id).length;
  if (!confirm(`用预设的 ${list.length} 门课替换当前学期的 ${had} 门课？`)) return;
  state.courses = state.courses.filter((c) => c.sem !== s.id).concat(list);
  save(); renderAll();
  toast(`已载入 ${list.length} 门课`);
}

async function exportData() {
  const text = JSON.stringify(state, null, 2);
  const fname = `课表备份-${ymd(new Date())}.json`;
  if (navigator.canShare && window.File) {
    try {
      const file = new File([text], fname, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: fname }); return; }
    } catch (e) { /* 用户取消或不支持，退回下载 */ }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('已导出，可存到「文件」App');
}

function importData(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data.semesters) || !data.semesters.length) throw new Error('格式不符');
      data.semesters.forEach((s) => { s.id = s.id || uid(); s.periods = Array.isArray(s.periods) && s.periods.length ? s.periods : DEFAULT_PERIODS.map(([a, b]) => ({ s: a, e: b })); s.days = s.days || 5; s.weeks = s.weeks || 20; });
      data.courses = (data.courses || []).filter((c) => data.semesters.some((s) => s.id === c.sem));
      data.courses.forEach((c) => {
        const owner = data.semesters.find((s) => s.id === c.sem);
        normWeeks(c, owner ? owner.weeks : 30);
      });
      data.ui = data.ui || { theme: 'auto' };
      if (!data.semesters.some((s) => s.id === data.activeSem)) data.activeSem = data.semesters[0].id;
      state = data;
      shownWeek = null;
      save(); renderAll();
      toast(`导入成功：${state.semesters.length} 个学期 / ${state.courses.length} 门课`);
    } catch (err) { toast('导入失败：' + err.message); }
    e.target.value = '';
  };
  r.readAsText(file);
}

/* ---------- 启动 ---------- */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!location.protocol.startsWith('http')) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW 注册失败', e));
  });
}

let tick = 0;
setInterval(() => {
  if (document.hidden) return;
  if (view === 'today') { renderToday(); }
  else if (view === 'week' && ++tick % 4 === 0) { renderWeek(); }
}, 15000);

state = load();
if (!localStorage.getItem(KEY)) save();
shownWeek = semWeek() ?? 1;
bind();
renderAll();
registerSW();
