import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Brain, Calendar, Check, ChevronDown,
  ChevronUp, Clock, Compass, Download, Eye, Flame, Gauge, GraduationCap, Home,
  Layers, LineChart as LineIcon, Lock, LogOut, Music, Pause, Play, Plus, RotateCcw,
  Settings as SettingsIcon, Shield, Smartphone, Sparkles, Target, Trash2, TrendingUp,
  Users, X, Zap, AlertCircle, Coffee, ListChecks, Building2, User, CreditCard
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";

/* ────────────────────────────────────────────────────────────────
   FocusFlow — Personal Performance Intelligence
   Single-file MVP. All numbers below are computed from stored
   session data; nothing on screen is hard-coded decoration.
   ──────────────────────────────────────────────────────────────── */

const STORE_KEY = "focusflow:v1";

/* ── design tokens ─────────────────────────────────────────────── */
const C = {
  ink: "#12172B",
  ink2: "#3E4664",
  muted: "#727B99",
  line: "#E7E9F2",
  accent: "#4338CA",
  accentSoft: "#EEF0FF",
  good: "#159A6B",
  maybe: "#D9930B",
  bad: "#D64545",
  idle: "#9AA1B9",
  surface: "#FFFFFF",
  page: "#F7F8FC",
};

const CLASS_META = {
  productive: { label: "Productive", color: C.good, tint: "#E8F6F0" },
  contextual: { label: "Contextual", color: "#2563EB", tint: "#E9F0FE" },
  maybe: { label: "Potentially productive", color: C.maybe, tint: "#FCF3E0" },
  distraction: { label: "Distraction", color: C.bad, tint: "#FBEAEA" },
  idle: { label: "Idle", color: C.idle, tint: "#F0F1F6" },
};
const CLASS_ORDER = ["productive", "contextual", "maybe", "distraction", "idle"];

/* ── small helpers ─────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round = (n, d = 0) => { const p = 10 ** d; return Math.round(n * p) / p; };
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sum = (a) => a.reduce((s, x) => s + x, 0);

function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  if (m) return `${m}m`;
  return `${sec}s`;
}
function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function hourLabel(h) {
  const hh = ((h + 11) % 12) + 1;
  return `${hh}${h < 12 ? "AM" : "PM"}`;
}
function windowLabel(h) { return `${hourLabel(h)}–${hourLabel((h + 2) % 24)}`; }
function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24, m = Math.round(mins % 60);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const todayKey = () => dayKey(Date.now());
function prettyDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* ── activity catalogue used by the tracking simulator ─────────── */
const APPS = [
  { app: "VS Code", note: "Graph traversal practice", cls: "productive", focusish: true },
  { app: "PDF Reader", note: "Lecture notes — Unit 3", cls: "productive", focusish: true },
  { app: "Notion", note: "Revision summary", cls: "productive", focusish: true },
  { app: "Chrome", note: "Stack Overflow / docs", cls: "contextual", focusish: true },
  { app: "WhatsApp", note: "Class assignment discussion", cls: "maybe", focusish: false },
  { app: "YouTube", note: "Champions League highlights", cls: "distraction", focusish: false },
  { app: "Instagram", note: "Reels", cls: "distraction", focusish: false },
  { app: "Idle", note: "Away from device", cls: "idle", focusish: false },
];
const appByName = (n) => APPS.find((a) => a.app === n) || APPS[0];

/* ── quiz bank ─────────────────────────────────────────────────── */
const QUIZ_BANK = {
  dsa: [
    { q: "Worst-case time complexity of BFS on a graph with V vertices and E edges?", o: ["O(V log V)", "O(V + E)", "O(V²)", "O(E log V)"], a: 1 },
    { q: "Which structure does depth-first search use implicitly?", o: ["Queue", "Heap", "Stack", "Hash map"], a: 2 },
    { q: "Dijkstra's algorithm fails when the graph contains…", o: ["Cycles", "Negative edge weights", "Self loops", "Disconnected parts"], a: 1 },
    { q: "A binary heap of n elements supports extract-min in…", o: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], a: 1 },
    { q: "Topological sort is only defined for…", o: ["Any graph", "Undirected graphs", "Directed acyclic graphs", "Weighted graphs"], a: 2 },
  ],
  physics: [
    { q: "Lami's theorem applies to three coplanar forces that are…", o: ["Parallel", "Concurrent and in equilibrium", "Perpendicular", "Unequal"], a: 1 },
    { q: "The parallel axis theorem relates moment of inertia about…", o: ["Two perpendicular axes", "An axis and a parallel axis through the centre of mass", "Any two random axes", "Rotational and linear motion"], a: 1 },
    { q: "In a p-n junction at equilibrium, the depletion region contains…", o: ["Free electrons only", "Immobile ionised dopants", "Holes only", "No charge at all"], a: 1 },
    { q: "Momentum is conserved when…", o: ["Kinetic energy is conserved", "Net external force is zero", "The collision is elastic", "Mass is constant"], a: 1 },
    { q: "For a converging lens, an object at 2f forms an image that is…", o: ["Virtual and enlarged", "Real, inverted, same size", "At infinity", "Real and diminished"], a: 1 },
  ],
  maths: [
    { q: "d/dx of ln(x²) equals…", o: ["1/x²", "2/x", "2x", "x/2"], a: 1 },
    { q: "∫ from 0 to 1 of 2x dx =", o: ["0.5", "1", "2", "0"], a: 1 },
    { q: "The determinant of a 2×2 identity matrix is…", o: ["0", "1", "2", "Undefined"], a: 1 },
    { q: "A function is continuous at a point if…", o: ["It is differentiable there", "Its limit equals its value there", "It is increasing", "It has no roots"], a: 1 },
    { q: "The sum of an infinite GP with |r| < 1 is…", o: ["a/(1−r)", "a·r", "a(1−r)", "ar/(1+r)"], a: 0 },
  ],
  chemistry: [
    { q: "Which quantum number describes orbital shape?", o: ["n", "l", "m", "s"], a: 1 },
    { q: "A buffer resists change in…", o: ["Temperature", "pH", "Pressure", "Density"], a: 1 },
    { q: "Bond order in O₂ is…", o: ["1", "1.5", "2", "3"], a: 2 },
    { q: "SN1 reactions proceed through…", o: ["A carbocation", "A concerted step", "A radical", "A carbanion"], a: 0 },
    { q: "Le Chatelier's principle predicts the response to…", o: ["A catalyst", "A disturbance in equilibrium", "Bond energy", "Molar mass"], a: 1 },
  ],
  generic: [
    { q: "Recalling material without looking at notes is called…", o: ["Re-reading", "Active recall", "Highlighting", "Skimming"], a: 1 },
    { q: "Spacing revision across days rather than massing it improves…", o: ["Short-term recall only", "Long-term retention", "Reading speed", "Nothing measurable"], a: 1 },
    { q: "Interleaving means…", o: ["Studying one topic until mastery", "Mixing related topics in a session", "Studying with music", "Taking longer breaks"], a: 1 },
    { q: "A practice test mainly helps by…", o: ["Filling time", "Surfacing what you cannot yet retrieve", "Reducing difficulty", "Replacing notes"], a: 1 },
    { q: "The best moment to review a topic is…", o: ["Immediately after learning it", "Just before you would forget it", "Only before the exam", "Never"], a: 1 },
  ],
};
function quizFor(subject) {
  const s = (subject || "").toLowerCase();
  if (s.includes("dsa") || s.includes("data struct") || s.includes("algo") || s.includes("comp")) return QUIZ_BANK.dsa;
  if (s.includes("phys")) return QUIZ_BANK.physics;
  if (s.includes("math") || s.includes("calc")) return QUIZ_BANK.maths;
  if (s.includes("chem")) return QUIZ_BANK.chemistry;
  return QUIZ_BANK.generic;
}

/* ── persistence (window.storage, with in-memory fallback) ─────── */
const emptyState = () => ({
  users: [],
  currentUserId: null,
  isDemo: false,
  profile: null,      // { id, name, email, subjects[], goal, preferredHour, defaultFocus, defaultBreak }
  sessions: [],
  plans: [],
  prefs: { notifSession: true, notifBreak: true, notifRecs: true },
  privacy: { localProcessing: true, cloudSync: false, anonAnalytics: true },
});

async function loadState() {
  try {
    const r = await window.storage.get(STORE_KEY);
    if (r && r.value) return { ...emptyState(), ...JSON.parse(r.value) };
  } catch (e) { /* first run or storage unavailable */ }
  return emptyState();
}
async function saveState(state) {
  try { await window.storage.set(STORE_KEY, JSON.stringify(state)); } catch (e) { /* keep going in memory */ }
}

/* ── session maths ─────────────────────────────────────────────── */
function bucketsOf(session) {
  const b = { productive: 0, contextual: 0, maybe: 0, distraction: 0, idle: 0 };
  (session.activities || []).forEach((a) => { b[a.cls] = (b[a.cls] || 0) + a.sec; });
  return b;
}
function statsOf(session) {
  const b = bucketsOf(session);
  const focused = b.productive + b.contextual;
  const distracted = b.maybe + b.distraction;
  const idle = b.idle;
  const total = focused + distracted + idle || session.actualSec || 0;
  return {
    focused, distracted, idle, total,
    productivity: total ? round((focused / total) * 100) : 0,
  };
}
function aggregate(sessions) {
  const acc = { focused: 0, distracted: 0, idle: 0, total: 0 };
  sessions.forEach((s) => {
    const st = statsOf(s);
    acc.focused += st.focused; acc.distracted += st.distracted; acc.idle += st.idle; acc.total += st.total;
  });
  acc.productivity = acc.total ? round((acc.focused / acc.total) * 100) : 0;
  return acc;
}

/* ── the personal performance model ────────────────────────────── */
const MIN_SESSIONS = 4;

function buildModel(sessions) {
  const n = sessions.length;
  const ready = n >= MIN_SESSIONS;
  const withStats = sessions.map((s) => ({ ...s, st: statsOf(s) }));

  // hour-of-day productivity
  const byHour = {};
  withStats.forEach((s) => {
    const h = new Date(s.startedAt).getHours();
    (byHour[h] = byHour[h] || []).push(s.st.productivity);
  });
  const windows = [];
  for (let h = 6; h <= 23; h++) {
    const vals = [...(byHour[h] || []), ...(byHour[(h + 1) % 24] || [])];
    if (vals.length) windows.push({ hour: h, score: round(mean(vals)), n: vals.length });
  }
  const sortedW = [...windows].sort((a, b) => b.score - a.score);
  const best = sortedW[0] || null;
  const worst = sortedW[sortedW.length - 1] || null;

  // average effective (focused) session length, in minutes
  const focusMins = withStats.map((s) => s.st.focused / 60).filter((m) => m > 0).sort((a, b) => a - b);
  const avgFocus = focusMins.length ? round(mean(focusMins)) : 0;
  // failure point = 75th percentile of sustained focused minutes
  const p75 = focusMins.length ? focusMins[Math.min(focusMins.length - 1, Math.floor(focusMins.length * 0.75))] : 0;
  const failurePoint = p75 ? round(p75) : 0;

  // distraction leaderboard
  const distApps = {};
  withStats.forEach((s) => (s.activities || []).forEach((a) => {
    if (a.cls === "distraction" || a.cls === "maybe") distApps[a.app] = (distApps[a.app] || 0) + a.sec;
  }));
  const distRank = Object.entries(distApps).sort((a, b) => b[1] - a[1]);
  const topDistraction = distRank[0] ? { app: distRank[0][0], sec: distRank[0][1] } : null;

  // best break length
  const byBreak = {};
  withStats.forEach((s) => {
    const k = clamp(Math.round((s.breakMin || 5) / 3) * 3, 3, 15);
    (byBreak[k] = byBreak[k] || []).push(s.st.productivity);
  });
  const breakRank = Object.entries(byBreak)
    .map(([k, v]) => ({ min: +k, score: round(mean(v)), n: v.length }))
    .sort((a, b) => b.score - a.score);
  const bestBreak = breakRank[0] || null;

  // environment: phone away × music
  const envKey = (s) => `${s.phoneAway ? "Phone away" : "Phone nearby"} · ${s.music ? "music on" : "no music"}`;
  const byEnv = {};
  withStats.forEach((s) => (byEnv[envKey(s)] = byEnv[envKey(s)] || []).push(s.st.productivity));
  const envRank = Object.entries(byEnv)
    .map(([k, v]) => ({ env: k, score: round(mean(v)), n: v.length }))
    .sort((a, b) => b.score - a.score);

  // quiz + confidence
  const quizzes = withStats.filter((s) => s.quiz).map((s) => (s.quiz.score / s.quiz.total) * 100);
  const avgQuiz = quizzes.length ? round(mean(quizzes)) : null;
  const avgConfidence = withStats.filter((s) => s.confidence != null).length
    ? round(mean(withStats.filter((s) => s.confidence != null).map((s) => s.confidence)))
    : null;

  // completion: session reached at least 90% of planned time
  const completion = withStats.length
    ? round((withStats.filter((s) => s.actualSec >= s.plannedMin * 60 * 0.9).length / withStats.length) * 100)
    : 0;
  const eveningSet = withStats.filter((s) => new Date(s.startedAt).getHours() >= 17);
  const daySet = withStats.filter((s) => new Date(s.startedAt).getHours() < 17);
  const eveningLift = eveningSet.length && daySet.length
    ? round(mean(eveningSet.map((s) => s.st.productivity)) - mean(daySet.map((s) => s.st.productivity)))
    : null;

  const phoneOn = withStats.filter((s) => s.phoneAway);
  const phoneOff = withStats.filter((s) => !s.phoneAway);
  const phoneLift = phoneOn.length && phoneOff.length
    ? round(mean(phoneOn.map((s) => s.st.productivity)) - mean(phoneOff.map((s) => s.st.productivity)))
    : null;

  const overall = aggregate(sessions);

  return {
    ready, n, avgFocus, failurePoint, best, worst, topDistraction, bestBreak,
    env: envRank[0] || null, envRank, avgQuiz, avgConfidence, completion,
    eveningLift, phoneLift, overall, windows, byHour, switchesPerHour: (() => {
      const t = sum(withStats.map((s) => s.st.total)) / 3600;
      return t ? round(sum(withStats.map((s) => s.appSwitches || 0)) / t) : 0;
    })(),
  };
}

/* ── insight generation (data only, no motivational filler) ────── */
function buildInsights(sessions, model) {
  const out = [];
  if (!model.ready) return out;
  if (model.eveningLift != null && Math.abs(model.eveningLift) >= 5) {
    out.push({
      tone: model.eveningLift > 0 ? "good" : "bad",
      text: model.eveningLift > 0
        ? `You perform ${model.eveningLift}% better in evening sessions than in daytime ones.`
        : `Your daytime sessions run ${Math.abs(model.eveningLift)}% better than your evening ones.`,
      basis: `${model.n} sessions compared by start hour.`,
    });
  }
  if (model.failurePoint) {
    out.push({
      tone: "warn",
      text: `Sustained focus holds to about ${model.failurePoint} minutes, then falls away.`,
      basis: "75th percentile of focused minutes per session.",
    });
  }
  if (model.phoneLift != null && Math.abs(model.phoneLift) >= 4) {
    out.push({
      tone: model.phoneLift > 0 ? "good" : "warn",
      text: `Sessions with the phone away score ${Math.abs(model.phoneLift)}% ${model.phoneLift > 0 ? "higher" : "lower"} on productivity.`,
      basis: "Phone-away sessions vs phone-nearby sessions.",
    });
  }
  if (model.bestBreak) {
    out.push({
      tone: "good",
      text: `Your strongest sessions use breaks of about ${model.bestBreak.min - 1}–${model.bestBreak.min + 1} minutes.`,
      basis: `${model.bestBreak.n} sessions at this break length, averaging ${model.bestBreak.score}%.`,
    });
  }
  if (model.topDistraction) {
    out.push({
      tone: "bad",
      text: `${model.topDistraction.app} accounts for the largest share of your off-task time (${fmtDur(model.topDistraction.sec)} logged).`,
      basis: "Summed across every classified activity.",
    });
  }
  if (model.switchesPerHour > 12) {
    out.push({
      tone: "warn",
      text: `You switch applications ${model.switchesPerHour} times an hour, which fragments long blocks.`,
      basis: "App switches divided by tracked hours.",
    });
  }
  if (model.avgQuiz != null) {
    const strong = sessions.filter((s) => s.quiz && statsOf(s).productivity >= 70).map((s) => (s.quiz.score / s.quiz.total) * 100);
    const weak = sessions.filter((s) => s.quiz && statsOf(s).productivity < 70).map((s) => (s.quiz.score / s.quiz.total) * 100);
    if (strong.length && weak.length) {
      const d = round(mean(strong) - mean(weak));
      out.push({
        tone: d > 0 ? "good" : "warn",
        text: `Quiz scores after high-productivity sessions are ${Math.abs(d)}% ${d > 0 ? "higher" : "lower"} than after low-productivity ones.`,
        basis: `${strong.length + weak.length} sessions with a quiz attached.`,
      });
    }
  }
  return out;
}

/* ── failure attribution for one session ───────────────────────── */
function attributeLoss(session, model) {
  const st = statsOf(session);
  const loss = clamp(100 - st.productivity, 0, 100);
  if (loss <= 0) return { loss: 0, parts: [] };
  const acts = session.activities || [];
  const secBy = (pred) => sum(acts.filter(pred).map((a) => a.sec));
  const phoneSec = secBy((a) => ["WhatsApp", "Instagram"].includes(a.app) && a.cls !== "productive" && a.cls !== "contextual");
  const otherDistractSec = st.distracted - phoneSec;

  const durMin = st.total / 60;
  const overrun = model.failurePoint ? Math.max(0, durMin - model.failurePoint) : 0;
  const hour = new Date(session.startedAt).getHours();
  const hourScore = model.byHour && model.byHour[hour] ? mean(model.byHour[hour]) : st.productivity;
  const bestScore = model.best ? model.best.score : hourScore;
  const timingGap = Math.max(0, bestScore - hourScore);
  const conf = session.confidence != null ? session.confidence : 60;
  const quizPct = session.quiz ? (session.quiz.score / session.quiz.total) * 100 : conf;
  const difficulty = Math.max(0, 100 - (conf * 0.4 + quizPct * 0.6));

  const raw = [
    { key: "Phone interruptions", w: phoneSec / 60 * 1.4, hint: "Messaging and social time inside the session." },
    { key: "App switching", w: (session.appSwitches || 0) * 0.6, hint: "Every switch costs re-entry time." },
    { key: "Task difficulty", w: difficulty * 0.25, hint: "Low confidence and quiz recall on this task." },
    { key: "Wrong study time", w: timingGap * 0.5, hint: "This hour underperforms your best window." },
    { key: "Long session", w: overrun * 0.7, hint: "Minutes run past your focus limit." },
    { key: "Idle drift", w: st.idle / 60 * 0.9, hint: "Time away from the device mid-session." },
  ].filter((r) => r.w > 0.01);

  const tot = sum(raw.map((r) => r.w)) || 1;
  const parts = raw
    .map((r) => ({ ...r, pct: round((r.w / tot) * loss, 1) }))
    .filter((r) => r.pct >= 0.5)
    .sort((a, b) => b.pct - a.pct);
  return { loss: round(loss), parts };
}

function recommendationFor(session, model, sessions) {
  if (!model.ready) {
    return "Log a few more sessions and this recommendation will be rebuilt from your own numbers instead of a default.";
  }
  const subj = session ? session.subject : (model.topSubject || "your hardest subject");
  const bw = model.best ? windowLabel(model.best.hour) : "the evening";
  const lo = Math.max(20, model.avgFocus - 3), hi = model.avgFocus + 3;
  const inWindow = sessions.filter((s) => {
    const h = new Date(s.startedAt).getHours();
    return model.best && h >= model.best.hour && h < model.best.hour + 2;
  });
  const outWindow = sessions.filter((s) => {
    const h = new Date(s.startedAt).getHours();
    return !(model.best && h >= model.best.hour && h < model.best.hour + 2);
  });
  const compIn = inWindow.length ? mean(inWindow.map((s) => statsOf(s).productivity)) : 0;
  const compOut = outWindow.length ? mean(outWindow.map((s) => statsOf(s).productivity)) : 0;
  const lift = compIn && compOut ? round(((compIn - compOut) / compOut) * 100) : null;
  const breakTxt = model.bestBreak ? `${model.bestBreak.min - 1}–${model.bestBreak.min + 1} minute breaks` : "short breaks";
  return `Next time, study ${subj} inside ${bw} and use ${lo}–${hi} minute blocks with ${breakTxt}.` +
    (lift != null && lift > 0 ? ` Your productivity in that window runs ${lift}% higher than outside it.` : "");
}

/* ── transparent prediction rule ───────────────────────────────── */
function predictEfficiency(inp, model) {
  const idealFocus = model.ready && model.avgFocus ? model.avgFocus : 45;
  const idealBreak = model.ready && model.bestBreak ? model.bestBreak.min : 8;
  const bestHour = model.ready && model.best ? model.best.hour : 20;

  const rows = [];
  let score = 62;
  rows.push({ label: "Baseline", val: 62 });

  const focusPenalty = -Math.abs(inp.focus - idealFocus) * 0.45;
  score += focusPenalty;
  rows.push({ label: `Focus block vs your ${idealFocus} min norm`, val: round(focusPenalty, 1) });

  const breakPenalty = -Math.abs(inp.brk - idealBreak) * 1.1;
  score += breakPenalty;
  rows.push({ label: `Break length vs your ${idealBreak} min norm`, val: round(breakPenalty, 1) });

  const hourDist = Math.min(Math.abs(inp.hour - bestHour), 24 - Math.abs(inp.hour - bestHour));
  const timeAdj = 14 - hourDist * 2.6;
  score += timeAdj;
  rows.push({ label: `Start time vs ${hourLabel(bestHour)} peak`, val: round(timeAdj, 1) });

  const phoneAdj = inp.phoneAway ? (model.phoneLift != null ? clamp(model.phoneLift, 3, 14) : 9) : -7;
  score += phoneAdj;
  rows.push({ label: inp.phoneAway ? "Phone away" : "Phone nearby", val: round(phoneAdj, 1) });

  const musicAdj = inp.music ? 2 : 0;
  score += musicAdj;
  rows.push({ label: inp.music ? "Music on" : "No music", val: musicAdj });

  const switchAdj = -inp.switches * 0.85;
  score += switchAdj;
  rows.push({ label: `${inp.switches} app switches per hour`, val: round(switchAdj, 1) });

  const overrun = Math.max(0, inp.focus - (model.failurePoint || 50));
  const overrunAdj = -overrun * 0.5;
  score += overrunAdj;
  if (overrun > 0) rows.push({ label: `Past your ${model.failurePoint || 50} min focus limit`, val: round(overrunAdj, 1) });

  return { score: clamp(round(score), 5, 99), rows };
}

/* ── demo data: Rahul, three weeks ─────────────────────────────── */
function makeDemoSessions() {
  const subjects = ["Physics", "Maths", "DSA", "Chemistry"];
  const tasks = {
    Physics: ["Optics", "Semiconductors", "Rotational Mechanics", "Momentum", "Thermodynamics"],
    Maths: ["Integration", "Matrices", "Series", "Limits"],
    DSA: ["Graph algorithms", "Heaps", "Dynamic programming", "Trees"],
    Chemistry: ["Equilibrium", "Organic reactions", "Bonding"],
  };
  const out = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

  for (let d = 20; d >= 0; d--) {
    const week = d > 13 ? 1 : d > 6 ? 2 : 3;
    const perDay = week === 1 ? 1 : 2;
    for (let k = 0; k < perDay; k++) {
      if (week === 1 && rnd() < 0.25) continue;
      const evening = week === 1 ? rnd() < 0.5 : rnd() < 0.72;
      const hour = evening ? 20 + Math.floor(rnd() * 2) : 14 + Math.floor(rnd() * 3);
      const subject = subjects[Math.floor(rnd() * subjects.length)];
      const task = tasks[subject][Math.floor(rnd() * tasks[subject].length)];
      const planned = week === 1 ? [30, 60, 75][Math.floor(rnd() * 3)] : [40, 45, 50][Math.floor(rnd() * 3)];
      const brk = week === 1 ? [3, 5, 12][Math.floor(rnd() * 3)] : [7, 8, 9][Math.floor(rnd() * 3)];
      const phoneAway = week === 1 ? rnd() < 0.35 : rnd() < 0.8;
      const music = rnd() < 0.6;

      const start = new Date();
      start.setDate(start.getDate() - d);
      start.setHours(hour, Math.floor(rnd() * 40), 0, 0);

      // quality follows the hidden truth we want the model to discover
      let quality = 0.52;
      if (evening) quality += 0.16;
      if (phoneAway) quality += 0.09;
      if (brk >= 7 && brk <= 9) quality += 0.07;
      if (planned > 55) quality -= 0.12;
      quality += (rnd() - 0.5) * 0.12;
      quality = clamp(quality, 0.28, 0.94);

      const actualSec = Math.round(planned * 60 * clamp(0.72 + quality * 0.35, 0.6, 1.05));
      const focused = Math.round(actualSec * quality);
      const idle = Math.round(actualSec * (0.04 + rnd() * 0.07));
      const distracted = Math.max(0, actualSec - focused - idle);

      const activities = [
        { id: uid(), app: subject === "DSA" ? "VS Code" : "PDF Reader", note: `${task} — working set`, cls: "productive", sec: Math.round(focused * 0.72) },
        { id: uid(), app: "Chrome", note: "Reference lookup", cls: "contextual", sec: focused - Math.round(focused * 0.72) },
        { id: uid(), app: "YouTube", note: rnd() < 0.4 ? `${task} lecture` : "Champions League highlights", cls: "distraction", sec: Math.round(distracted * 0.55) },
        { id: uid(), app: "WhatsApp", note: rnd() < 0.5 ? "Class assignment discussion" : "Random conversation", cls: "maybe", sec: distracted - Math.round(distracted * 0.55) },
        { id: uid(), app: "Idle", note: "Away from device", cls: "idle", sec: idle },
      ].filter((a) => a.sec > 0);

      const quizPct = clamp(quality * 100 + (rnd() - 0.5) * 18, 20, 100);
      out.push({
        id: uid(),
        startedAt: start.toISOString(),
        subject, task,
        plannedMin: planned, breakMin: brk, phoneAway, music,
        actualSec, appSwitches: Math.round(4 + (1 - quality) * 26 + rnd() * 5),
        activities,
        confidence: Math.round(clamp(quality * 100 + (rnd() - 0.5) * 22, 15, 98)),
        quiz: rnd() < 0.75 ? { score: Math.round((quizPct / 100) * 5), total: 5 } : null,
        endedAt: new Date(start.getTime() + actualSec * 1000).toISOString(),
      });
    }
  }
  return out.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

function demoState() {
  return {
    ...emptyState(),
    isDemo: true,
    currentUserId: "demo",
    users: [{ id: "demo", name: "Rahul", email: "rahul@demo.focusflow", password: "demo" }],
    profile: {
      id: "demo", name: "Rahul", email: "rahul@demo.focusflow",
      subjects: ["Physics", "Maths", "DSA", "Chemistry"],
      goal: "Clear the Physics unit test with 85%+",
      preferredHour: 20, defaultFocus: 45, defaultBreak: 8,
    },
    sessions: makeDemoSessions(),
  };
}

/* ────────────────────────────────────────────────────────────────
   UI PRIMITIVES
   ──────────────────────────────────────────────────────────────── */

function useFonts() {
  useEffect(() => {
    const id = "ff-fonts";
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
  }, []);
}
const FONT = { fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" };

function Card({ children, className = "", style = {}, onClick, hover }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl ${className}`}
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        boxShadow: "0 1px 2px rgba(18,23,43,.04), 0 8px 24px -18px rgba(18,23,43,.35)",
        cursor: onClick ? "pointer" : undefined,
        transition: hover ? "transform .18s ease, box-shadow .18s ease" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", full, disabled, type, style = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1, transition: "all .16s ease", whiteSpace: "nowrap",
    width: full ? "100%" : undefined, border: "1px solid transparent",
    padding: size === "sm" ? "7px 13px" : size === "lg" ? "14px 26px" : "10px 18px",
    fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
  };
  const skins = {
    primary: { background: C.accent, color: "#fff", boxShadow: "0 6px 18px -8px rgba(67,56,202,.75)" },
    soft: { background: C.accentSoft, color: C.accent, borderColor: "#DDDFFB" },
    ghost: { background: "transparent", color: C.ink2, borderColor: C.line },
    danger: { background: "#FDECEC", color: C.bad, borderColor: "#F6D5D5" },
    dark: { background: C.ink, color: "#fff" },
    plain: { background: "transparent", color: C.ink2 },
  };
  return (
    <button type={type || "button"} onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...base, ...skins[variant], ...style }}>
      {children}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink2, marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{hint}</div>}
    </label>
  );
}
const inputStyle = {
  width: "100%", padding: "10px 13px", borderRadius: 11, border: `1px solid ${C.line}`,
  fontSize: 14, color: C.ink, background: "#FCFCFE", outline: "none", ...FONT,
};
function Input(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function Select({ children, ...p }) { return <select {...p} style={{ ...inputStyle, ...(p.style || {}) }}>{children}</select>; }

function Toggle({ on, onChange, label, desc }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
        {desc && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2, maxWidth: 460 }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!on)} aria-pressed={on}
        style={{
          flexShrink: 0, width: 46, height: 26, borderRadius: 999, position: "relative",
          background: on ? C.accent : "#D7DAE8", transition: "background .18s ease", border: "none", cursor: "pointer",
        }}>
        <span style={{
          position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: 999,
          background: "#fff", transition: "left .18s ease", boxShadow: "0 1px 3px rgba(0,0,0,.25)",
        }} />
      </button>
    </div>
  );
}

function Slider({ value, onChange, min = 0, max = 100, step = 1, suffix = "" }) {
  return (
    <div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: C.accent }} />
      <div style={{ fontSize: 13, color: C.ink2, fontWeight: 600, marginTop: 2 }}>{value}{suffix}</div>
    </div>
  );
}

function Pill({ children, color = C.accent, bg = C.accentSoft }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
      color, background: bg, padding: "4px 10px", borderRadius: 999,
    }}>{children}</span>
  );
}

function Stat({ label, value, sub, color = C.ink, icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 12.5, fontWeight: 600 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, marginTop: 6, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function Empty({ title, body, action }) {
  return (
    <Card className="p-8 text-center">
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</div>
      <div style={{ fontSize: 14, color: C.muted, marginTop: 6, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>{body}</div>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(18,23,43,.45)", zIndex: 90,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: width, padding: 24,
        boxShadow: "0 30px 70px -20px rgba(18,23,43,.5)", maxHeight: "88vh", overflowY: "auto", ...FONT,
      }}>
        <div className="flex items-start justify-between mb-4">
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Ring({ pct, size = 190, stroke = 14, label, sub, color = C.accent }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDEFF7" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - clamp(pct, 0, 100) / 100)}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: size > 160 ? 38 : 26, fontWeight: 700, color: C.ink, letterSpacing: "-0.03em" }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SplitBar({ parts, height = 10 }) {
  const total = sum(parts.map((p) => p.value)) || 1;
  return (
    <div style={{ display: "flex", height, borderRadius: 999, overflow: "hidden", background: "#F0F1F6" }}>
      {parts.map((p, i) => (
        <div key={i} title={`${p.label}: ${fmtDur(p.value)}`}
          style={{ width: `${(p.value / total) * 100}%`, background: p.color, transition: "width .4s ease" }} />
      ))}
    </div>
  );
}

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: seen ? 1 : 0,
      transform: seen ? "none" : "translateY(18px)",
      transition: `opacity .6s ease ${delay}ms, transform .6s cubic-bezier(.2,.7,.3,1) ${delay}ms`,
    }}>{children}</div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 120,
      background: C.ink, color: "#fff", padding: "11px 18px", borderRadius: 999, fontSize: 13.5,
      fontWeight: 600, boxShadow: "0 12px 30px -12px rgba(0,0,0,.6)", ...FONT,
    }}>{msg}</div>
  );
}

function ChartBox({ children, height = 220 }) {
  return <div style={{ width: "100%", height }}>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>;
}
const tipStyle = {
  contentStyle: { borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 12.5, boxShadow: "0 10px 30px -12px rgba(18,23,43,.4)" },
  labelStyle: { color: C.ink, fontWeight: 700 },
};

/* ────────────────────────────────────────────────────────────────
   LANDING
   ──────────────────────────────────────────────────────────────── */

const LAYERS = [
  {
    icon: <Activity size={20} />, title: "Behaviour tracking",
    body: "What you actually did during the block: applications, switches, idle gaps, how long real focus lasted before it broke.",
    detail: ["Application and duration", "App switches per hour", "Idle and break timing"],
  },
  {
    icon: <Compass size={20} />, title: "Context understanding",
    body: "The same app means different things. A lecture on YouTube is study. Highlights on YouTube is not. You decide, once, and FocusFlow remembers.",
    detail: ["You classify activity", "Subject and task attached", "Phone and music conditions"],
  },
  {
    icon: <Brain size={20} />, title: "Personal performance model",
    body: "Your own numbers, not averages from strangers: peak window, effective session length, the minute your focus gives way.",
    detail: ["Best and worst windows", "Break length that works", "Point where focus fails"],
  },
  {
    icon: <Target size={20} />, title: "Predictive study planner",
    body: "A schedule built from what has already worked for you, weighted towards the topics you are weakest on.",
    detail: ["Weak topics first", "Blocks sized to your limit", "Placed in your best hours"],
  },
];

function Landing({ onSignup, onLogin, onDemo }) {
  const howRef = useRef(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 2600); return () => clearInterval(t); }, []);

  const heroData = useMemo(() => {
    const base = [38, 44, 41, 52, 47, 62, 71, 83, 88, 79, 64];
    return base.map((v, i) => ({
      h: 10 + i, focus: clamp(v + Math.sin((tick + i) / 2) * 4, 10, 98),
    }));
  }, [tick]);

  return (
    <div style={{ background: C.surface, ...FONT }}>
      {/* nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(255,255,255,.86)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}` }}>
        <div className="mx-auto flex items-center justify-between px-5 py-3" style={{ maxWidth: 1120 }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(140deg, ${C.accent}, #6D28D9)`, display: "grid", placeItems: "center" }}>
              <Zap size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: C.ink, letterSpacing: "-0.02em" }}>FocusFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="plain" size="sm" onClick={() => howRef.current?.scrollIntoView({ behavior: "smooth" })}>How it works</Btn>
            <Btn variant="ghost" size="sm" onClick={onLogin}>Log in</Btn>
            <Btn size="sm" onClick={onSignup}>Start free</Btn>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="px-5" style={{ background: "linear-gradient(180deg,#FBFBFF 0%, #FFFFFF 70%)" }}>
        <div className="mx-auto grid gap-10 py-16 md:grid-cols-2 md:py-24" style={{ maxWidth: 1120, alignItems: "center" }}>
          <div>
            <Pill><Sparkles size={13} /> Personal performance intelligence</Pill>
            <h1 style={{ fontSize: "clamp(34px,5.4vw,54px)", lineHeight: 1.06, fontWeight: 800, color: C.ink, letterSpacing: "-0.035em", marginTop: 18 }}>
              Stop measuring study time. Start understanding how you study.
            </h1>
            <p style={{ fontSize: 17, color: C.ink2, lineHeight: 1.6, marginTop: 18, maxWidth: 480 }}>
              FocusFlow learns your study patterns, identifies why your performance drops, and predicts the conditions in which you learn best.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Btn size="lg" onClick={onSignup}>Start free</Btn>
              <Btn size="lg" variant="dark" onClick={onDemo}><Play size={16} /> Launch demo</Btn>
              <Btn size="lg" variant="ghost" onClick={() => howRef.current?.scrollIntoView({ behavior: "smooth" })}>How it works</Btn>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 14 }}>
              The demo loads a fictional student with three weeks of study data. Nothing to install.
            </div>
          </div>

          {/* live-ish hero panel */}
          <Card className="p-5" style={{ boxShadow: "0 30px 80px -40px rgba(18,23,43,.55)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Focus through the day</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>Peak window 8–10 PM</div>
              </div>
              <Pill color={C.good} bg="#E8F6F0"><TrendingUp size={13} /> +31%</Pill>
            </div>
            <div className="mt-3">
              <ChartBox height={170}>
                <AreaChart data={heroData}>
                  <defs>
                    <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="h" tickFormatter={hourLabel} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Area type="monotone" dataKey="focus" stroke={C.accent} strokeWidth={2.5} fill="url(#hg)" isAnimationActive={false} />
                </AreaChart>
              </ChartBox>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[["Effective session", "44 min"], ["Focus limit", "~52 min"], ["Top distraction", "YouTube"]].map(([a, b]) => (
                <div key={a} style={{ background: "#FAFAFE", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{a}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{b}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* four layers */}
      <section ref={howRef} className="px-5 py-16" style={{ background: C.page, borderTop: `1px solid ${C.line}` }}>
        <div className="mx-auto" style={{ maxWidth: 1120 }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,36px)", fontWeight: 800, color: C.ink, letterSpacing: "-0.03em" }}>
              Four layers between raw activity and a better exam result
            </h2>
            <p style={{ fontSize: 16, color: C.ink2, marginTop: 10, maxWidth: 620 }}>
              Each layer feeds the next. Behaviour becomes context, context becomes a model of you, and the model writes your schedule.
            </p>
          </Reveal>
          <div className="grid gap-4 mt-10 md:grid-cols-2">
            {LAYERS.map((l, i) => (
              <Reveal key={l.title} delay={i * 80}>
                <Card className="p-6" style={{ height: "100%" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: C.accentSoft, color: C.accent, display: "grid", placeItems: "center" }}>{l.icon}</div>
                    <div>
                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>Layer {i + 1}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>{l.title}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.6, marginTop: 12 }}>{l.body}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {l.detail.map((d) => (
                      <span key={d} style={{ fontSize: 12, color: C.ink2, background: "#F3F4FA", padding: "5px 10px", borderRadius: 8 }}>{d}</span>
                    ))}
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* contrast strip */}
      <section className="px-5 py-16">
        <div className="mx-auto grid gap-6 md:grid-cols-2" style={{ maxWidth: 1120 }}>
          <Reveal>
            <Card className="p-7" style={{ background: "#FBFBFD" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>A timer tells you</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.ink2, marginTop: 8, letterSpacing: "-0.02em" }}>
                “You studied for 2 hours 10 minutes.”
              </div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 10 }}>Then it stops, and nothing changes tomorrow.</div>
            </Card>
          </Reveal>
          <Reveal delay={100}>
            <Card className="p-7" style={{ background: `linear-gradient(150deg, ${C.ink} 0%, #23305C 100%)`, border: "none" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#A7B0D8" }}>FocusFlow tells you</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginTop: 8, letterSpacing: "-0.02em", lineHeight: 1.35 }}>
                “Your focus broke at 47 minutes, mostly to your phone, and this hour is your weakest. Move DSA to 8 PM in 45 minute blocks.”
              </div>
              <div style={{ fontSize: 14, color: "#A7B0D8", marginTop: 10 }}>Built from your last {MIN_SESSIONS}+ sessions.</div>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto text-center" style={{ maxWidth: 640 }}>
          <Reveal>
            <h3 style={{ fontSize: 28, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em" }}>Find out what makes you study well</h3>
            <p style={{ fontSize: 15.5, color: C.ink2, marginTop: 10 }}>
              Four sessions is enough to unlock your first personal model.
            </p>
            <div className="flex justify-center gap-3 mt-6 flex-wrap">
              <Btn size="lg" onClick={onSignup}>Start free</Btn>
              <Btn size="lg" variant="ghost" onClick={onDemo}>Launch demo</Btn>
            </div>
          </Reveal>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.line}`, padding: "22px 20px" }}>
        <div className="mx-auto flex flex-wrap items-center justify-between gap-3" style={{ maxWidth: 1120, fontSize: 13, color: C.muted }}>
          <span>FocusFlow — prototype build. Behaviour tracking is simulated in the browser.</span>
          <span>Local processing first. Statistics leave the device, activity does not.</span>
        </div>
      </footer>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   AUTH + ONBOARDING
   ──────────────────────────────────────────────────────────────── */

function Auth({ mode, onMode, onDone, users, onBack, toast }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    setErr("");
    if (mode === "signup") {
      if (!name.trim()) return setErr("Enter your name so the dashboard can greet you properly.");
      if (!email.includes("@")) return setErr("That email address is missing an @.");
      if (pw.length < 4) return setErr("Use at least 4 characters for the password.");
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return setErr("An account already exists with this email. Log in instead.");
      onDone({ id: uid(), name: name.trim(), email: email.trim(), password: pw }, true);
    } else {
      const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      if (!u) return setErr("No account with that email on this device. Sign up to create one.");
      if (u.password !== pw) return setErr("Wrong password.");
      onDone(u, false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.page, display: "grid", placeItems: "center", padding: 20, ...FONT }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button onClick={onBack} style={{ border: "none", background: "transparent", color: C.muted, fontSize: 13.5, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", gap: 6, ...FONT }}>
          <ArrowLeft size={15} /> Back to home
        </button>
        <Card className="p-7">
          <div className="flex items-center gap-2 mb-5">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(140deg, ${C.accent}, #6D28D9)`, display: "grid", placeItems: "center" }}>
              <Zap size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: C.ink }}>FocusFlow</span>
          </div>
          <h2 style={{ fontSize: 23, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p style={{ fontSize: 13.5, color: C.muted, marginTop: 5 }}>
            {mode === "signup" ? "Accounts live on this device only in the prototype." : "Log in with the account you created here."}
          </p>

          <div className="grid gap-3 mt-5">
            {mode === "signup" && (
              <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ananya Rao" /></Field>
            )}
            <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" /></Field>
            <Field label="Password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" /></Field>
          </div>

          {err && (
            <div style={{ marginTop: 12, background: "#FDECEC", color: C.bad, fontSize: 13, padding: "9px 12px", borderRadius: 10, fontWeight: 600 }}>{err}</div>
          )}

          <div className="mt-5">
            <Btn full size="lg" onClick={submit}>{mode === "signup" ? "Create account" : "Log in"}</Btn>
          </div>
          <div className="text-center mt-4" style={{ fontSize: 13.5, color: C.muted }}>
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button onClick={() => { setErr(""); onMode(mode === "signup" ? "login" : "signup"); }}
              style={{ border: "none", background: "transparent", color: C.accent, fontWeight: 700, cursor: "pointer", ...FONT }}>
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

const SUBJECT_SUGGESTIONS = ["Physics", "Maths", "Chemistry", "DSA", "Engineering Mechanics", "Electronics", "Economics", "Biology"];

function Onboarding({ user, onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user.name);
  const [subjects, setSubjects] = useState(["Physics", "Maths"]);
  const [draft, setDraft] = useState("");
  const [goal, setGoal] = useState("");
  const [hour, setHour] = useState(20);
  const [focus, setFocus] = useState(45);
  const [brk, setBrk] = useState(8);

  const addSubject = (s) => {
    const v = (s || draft).trim();
    if (!v) return;
    if (subjects.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setSubjects([...subjects, v]); setDraft("");
  };
  const steps = ["You", "Subjects", "Goals", "Rhythm"];
  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? subjects.length > 0 : true;

  return (
    <div style={{ minHeight: "100vh", background: C.page, display: "grid", placeItems: "center", padding: 20, ...FONT }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div className="flex gap-2 mb-4">
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 4, borderRadius: 999, background: i <= step ? C.accent : "#E3E5F0", transition: "background .3s" }} />
              <div style={{ fontSize: 11.5, color: i <= step ? C.accent : C.muted, marginTop: 6, fontWeight: 600 }}>{s}</div>
            </div>
          ))}
        </div>
        <Card className="p-7">
          {step === 0 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>What should we call you?</h2>
              <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>This only appears in your own dashboard.</p>
              <div className="mt-5"><Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>Which subjects are you tracking?</h2>
              <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Sessions, quizzes and plans are grouped by subject. Add or remove any time.</p>
              <div className="flex gap-2 mt-5">
                <Input value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubject()} placeholder="Add a subject" />
                <Btn onClick={() => addSubject()}><Plus size={15} /> Add</Btn>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {subjects.map((s) => (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.accentSoft, color: C.accent, padding: "6px 8px 6px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600 }}>
                    {s}
                    <button onClick={() => setSubjects(subjects.filter((x) => x !== s))}
                      style={{ border: "none", background: "rgba(67,56,202,.12)", borderRadius: 999, width: 18, height: 18, display: "grid", placeItems: "center", cursor: "pointer", color: C.accent }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {!subjects.length && <span style={{ fontSize: 13, color: C.muted }}>Add at least one subject to continue.</span>}
              </div>
              <div className="mt-5" style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>Common ones</div>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_SUGGESTIONS.filter((s) => !subjects.includes(s)).map((s) => (
                  <button key={s} onClick={() => addSubject(s)}
                    style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 13, color: C.ink2, cursor: "pointer", ...FONT }}>+ {s}</button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>What are you working towards?</h2>
              <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Used to frame your insights and planner. One line is enough.</p>
              <div className="mt-5">
                <Field label="Study goal" hint="For example: clear the Physics unit test with 85%+">
                  <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Finish DSA revision before placements" />
                </Field>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>When do you study best right now?</h2>
              <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>A starting point only. FocusFlow replaces these with measured values once you have {MIN_SESSIONS} sessions.</p>
              <div className="grid gap-4 mt-5">
                <Field label="Preferred study time">
                  <Select value={hour} onChange={(e) => setHour(+e.target.value)}>
                    {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => <option key={h} value={h}>{windowLabel(h)}</option>)}
                  </Select>
                </Field>
                <Field label={`Preferred session length — ${focus} min`}>
                  <Slider value={focus} onChange={setFocus} min={15} max={90} step={5} suffix=" min" />
                </Field>
                <Field label={`Preferred break — ${brk} min`}>
                  <Slider value={brk} onChange={setBrk} min={3} max={20} suffix=" min" />
                </Field>
              </div>
            </>
          )}

          <div className="flex justify-between mt-7">
            <Btn variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Btn>
            {step < 3 ? (
              <Btn onClick={() => setStep(step + 1)} disabled={!canNext}>Continue <ArrowRight size={15} /></Btn>
            ) : (
              <Btn onClick={() => onDone({
                id: user.id, name: name.trim(), email: user.email, subjects, goal,
                preferredHour: hour, defaultFocus: focus, defaultBreak: brk,
              })}>Open my dashboard</Btn>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   APP SHELL
   ──────────────────────────────────────────────────────────────── */

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: <Home size={17} /> },
  { key: "session", label: "Study session", icon: <Play size={17} /> },
  { key: "performance", label: "My performance", icon: <Gauge size={17} /> },
  { key: "predict", label: "Prediction", icon: <Sparkles size={17} /> },
  { key: "planner", label: "Study planner", icon: <Calendar size={17} /> },
  { key: "history", label: "History", icon: <Layers size={17} /> },
  { key: "insights", label: "Insights", icon: <LineIcon size={17} /> },
  { key: "privacy", label: "Privacy", icon: <Shield size={17} /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon size={17} /> },
  { key: "pricing", label: "Plans", icon: <CreditCard size={17} /> },
];

function Shell({ page, setPage, profile, isDemo, view, setView, onExit, children }) {
  const [open, setOpen] = useState(false);
  const NavList = ({ onPick }) => (
    <nav className="grid gap-1">
      {NAV.map((n) => {
        const active = page === n.key;
        return (
          <button key={n.key} onClick={() => { setPage(n.key); onPick && onPick(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 11,
              border: "none", cursor: "pointer", textAlign: "left", width: "100%",
              background: active ? C.accentSoft : "transparent",
              color: active ? C.accent : C.ink2, fontWeight: active ? 700 : 500, fontSize: 14, ...FONT,
            }}>
            {n.icon}{n.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.page, ...FONT }}>
      {/* top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(255,255,255,.9)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ gap: 12 }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(!open)}
              style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 10, padding: 7, cursor: "pointer", color: C.ink2 }}>
              <Layers size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(140deg, ${C.accent}, #6D28D9)`, display: "grid", placeItems: "center" }}>
                <Zap size={15} color="#fff" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.ink, letterSpacing: "-0.02em" }}>FocusFlow</span>
            </div>
            {isDemo && <Pill color="#7C3AED" bg="#F3EDFF">Demo data</Pill>}
          </div>

          <div className="flex items-center gap-3">
            <div style={{ display: "flex", background: "#F1F2F8", borderRadius: 999, padding: 3 }}>
              {[["student", "Student view"], ["institution", "Institution view"]].map(([k, l]) => (
                <button key={k} onClick={() => setView(k)}
                  style={{
                    border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 700,
                    background: view === k ? "#fff" : "transparent", color: view === k ? C.ink : C.muted,
                    boxShadow: view === k ? "0 1px 4px rgba(18,23,43,.14)" : "none", ...FONT,
                  }}>{l}</button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div style={{ width: 30, height: 30, borderRadius: 999, background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>
                {(profile?.name || "?").slice(0, 1).toUpperCase()}
              </div>
              <button onClick={onExit} title="Sign out"
                style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 10, padding: 7, cursor: "pointer", color: C.muted }}>
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* desktop rail */}
        <aside className="hidden lg:block" style={{ width: 226, flexShrink: 0, padding: "18px 12px", borderRight: `1px solid ${C.line}`, background: "#fff", minHeight: "calc(100vh - 57px)", position: "sticky", top: 57, alignSelf: "flex-start" }}>
          <NavList />
        </aside>

        {/* mobile drawer */}
        {open && (
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(18,23,43,.4)", zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: 250, background: "#fff", height: "100%", padding: 16, ...FONT }}>
              <div style={{ fontWeight: 800, color: C.ink, marginBottom: 12 }}>Menu</div>
              <NavList onPick={() => setOpen(false)} />
              <div className="mt-4"><Btn variant="ghost" full onClick={onExit}><LogOut size={15} /> Sign out</Btn></div>
            </div>
          </div>
        )}

        <main style={{ flex: 1, minWidth: 0, padding: "22px 18px 60px" }}>
          <div className="mx-auto" style={{ maxWidth: 1080 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

function PageHead({ title, sub, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 style={{ fontSize: 25, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em" }}>{title}</h1>
        {sub && <p style={{ fontSize: 14, color: C.muted, marginTop: 4, maxWidth: 620 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   DASHBOARD
   ──────────────────────────────────────────────────────────────── */

function Dashboard({ state, model, insights, go }) {
  const sessions = state.sessions;
  const today = sessions.filter((s) => dayKey(s.startedAt) === todayKey());
  const scope = today.length ? today : sessions.slice(-6);
  const agg = aggregate(today);
  const usingToday = today.length > 0;

  const graph = useMemo(() => {
    const src = usingToday ? today : sessions;
    const byHour = {};
    src.forEach((s) => {
      const h = new Date(s.startedAt).getHours();
      const st = statsOf(s);
      byHour[h] = byHour[h] || { focus: [], mins: 0 };
      byHour[h].focus.push(st.productivity);
      byHour[h].mins += st.total / 60;
    });
    const hours = Object.keys(byHour).map(Number).sort((a, b) => a - b);
    if (!hours.length) return [];
    const lo = Math.max(0, hours[0] - 1), hi = Math.min(23, hours[hours.length - 1] + 1);
    const out = [];
    for (let h = lo; h <= hi; h++) {
      out.push({
        hour: h, label: hourLabel(h),
        productivity: byHour[h] ? round(mean(byHour[h].focus)) : null,
        minutes: byHour[h] ? round(byHour[h].mins) : 0,
      });
    }
    return out;
  }, [sessions, usingToday]);

  const lastInsight = insights[0];

  return (
    <>
      <PageHead
        title={`${new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}, ${state.profile.name}`}
        sub={state.profile.goal ? `Working towards: ${state.profile.goal}` : "Start a session and FocusFlow begins building your model."}
        right={<Btn onClick={() => go("session")}><Play size={16} /> Start a session</Btn>}
      />

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))" }}>
        <Stat label="Total study time" value={fmtDur(agg.total)} icon={<Clock size={14} />} sub={usingToday ? `${today.length} session${today.length > 1 ? "s" : ""} today` : "No sessions yet today"} />
        <Stat label="Focused" value={fmtDur(agg.focused)} color={C.good} icon={<Target size={14} />} />
        <Stat label="Distracted" value={fmtDur(agg.distracted)} color={C.bad} icon={<AlertCircle size={14} />} />
        <Stat label="Idle" value={fmtDur(agg.idle)} color={C.idle} icon={<Coffee size={14} />} />
        <Stat label="Productivity" value={`${agg.productivity}%`} color={agg.productivity >= 70 ? C.good : agg.productivity >= 45 ? C.maybe : C.bad} icon={<Flame size={14} />} />
      </div>

      {agg.total > 0 && (
        <div className="mt-3">
          <Card className="p-4">
            <SplitBar parts={[
              { label: "Focused", value: agg.focused, color: C.good },
              { label: "Distracted", value: agg.distracted, color: C.bad },
              { label: "Idle", value: agg.idle, color: C.idle },
            ]} />
            <div className="flex flex-wrap gap-4 mt-3" style={{ fontSize: 12.5, color: C.muted }}>
              {[["Focused", C.good, agg.focused], ["Distracted", C.bad, agg.distracted], ["Idle", C.idle, agg.idle]].map(([l, c, v]) => (
                <span key={l} className="flex items-center gap-2">
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: "inline-block" }} />{l} · {fmtDur(v)}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)" }}>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Focus through the day</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                {usingToday ? "Today's productivity by hour." : "No session today — showing every session by hour."}
              </div>
            </div>
            {model.best && <Pill color={C.good} bg="#E8F6F0">Peak {windowLabel(model.best.hour)}</Pill>}
          </div>
          <div className="mt-3">
            {graph.length ? (
              <ChartBox height={230}>
                <AreaChart data={graph}>
                  <defs>
                    <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip {...tipStyle} formatter={(v, n) => [n === "productivity" ? `${v}%` : `${v} min`, n === "productivity" ? "Productivity" : "Time"]} />
                  <Area type="monotone" dataKey="productivity" stroke={C.accent} strokeWidth={2.5} fill="url(#dg)" connectNulls />
                </AreaChart>
              </ChartBox>
            ) : (
              <div style={{ padding: "44px 10px", textAlign: "center", color: C.muted, fontSize: 14 }}>
                No tracked hours yet. Your first session draws this curve.
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4" style={{ alignContent: "start" }}>
          <Card className="p-5">
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Best study window</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 4, letterSpacing: "-0.02em" }}>
              {model.ready && model.best ? windowLabel(model.best.hour) : "—"}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
              {model.ready && model.best ? `${model.best.score}% average productivity across ${model.best.n} readings` : `Needs ${MIN_SESSIONS} sessions`}
            </div>
          </Card>
          <Card className="p-5">
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Average effective session</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 4, letterSpacing: "-0.02em" }}>
              {model.avgFocus ? `${model.avgFocus} minutes` : "—"}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>Focused minutes per session, averaged.</div>
          </Card>
          <Card className="p-5">
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Most common distraction</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 4, letterSpacing: "-0.02em" }}>
              {model.topDistraction ? model.topDistraction.app : "—"}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
              {model.topDistraction ? `${fmtDur(model.topDistraction.sec)} of off-task time` : "Nothing classified as off-task yet"}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <Card className="p-5" style={{ background: `linear-gradient(150deg, ${C.ink} 0%, #26325C 100%)`, border: "none" }}>
          <div className="flex items-center gap-2" style={{ color: "#A7B0D8", fontSize: 12.5, fontWeight: 700 }}>
            <Sparkles size={14} /> Latest insight
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 8, lineHeight: 1.45, letterSpacing: "-0.01em" }}>
            {lastInsight ? lastInsight.text : `Complete ${Math.max(0, MIN_SESSIONS - sessions.length)} more session${MIN_SESSIONS - sessions.length === 1 ? "" : "s"} to unlock personalised insights.`}
          </div>
          {lastInsight && <div style={{ fontSize: 12.5, color: "#A7B0D8", marginTop: 8 }}>{lastInsight.basis}</div>}
          <div className="mt-4"><Btn variant="soft" size="sm" onClick={() => go("insights")}>See all insights</Btn></div>
        </Card>

        <Card className="p-5">
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Recent sessions</div>
          {scope.length ? (
            <div className="grid gap-2 mt-3">
              {[...scope].reverse().slice(0, 4).map((s) => {
                const st = statsOf(s);
                return (
                  <button key={s.id} onClick={() => go("history")}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: `1px solid ${C.line}`, background: "#FCFCFE", borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "left", ...FONT }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.task}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{s.subject} · {prettyDate(s.startedAt)} · {fmtDur(st.total)}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: st.productivity >= 70 ? C.good : st.productivity >= 45 ? C.maybe : C.bad }}>{st.productivity}%</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: C.muted, marginTop: 10 }}>Nothing recorded yet. Start a session to fill this in.</div>
          )}
        </Card>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   ACTIVITY TABLE (behaviour tracking demo — editable classification)
   ──────────────────────────────────────────────────────────────── */

function ActivityTable({ activities, onChange, compact }) {
  const total = sum(activities.map((a) => a.sec)) || 1;
  return (
    <div>
      <div className="hidden sm:grid sm:grid-cols-4" style={{ gap: 8, padding: "0 12px 8px", fontSize: 12, color: C.muted, fontWeight: 700 }}>
        <span>Application</span><span>What it was</span><span>Time</span><span>Classification</span>
      </div>
      <div className="grid gap-2">
        {activities.length === 0 && (
          <div style={{ fontSize: 13.5, color: C.muted, padding: "10px 4px" }}>Nothing tracked yet — activity appears as the session runs.</div>
        )}
        {[...activities].sort((a, b) => b.sec - a.sec).map((a) => {
          const meta = CLASS_META[a.cls];
          return (
            <div key={a.id} className="grid gap-2 sm:grid-cols-4" style={{ gridTemplateColumns: undefined, alignItems: "center", background: "#FCFCFE", border: `1px solid ${C.line}`, borderRadius: 12, padding: "9px 11px" }}>
              <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: meta.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.app}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                {onChange ? (
                  <input value={a.note} onChange={(e) => onChange(a.id, { note: e.target.value })}
                    style={{ ...inputStyle, padding: "6px 9px", fontSize: 12.5, background: "#fff" }} />
                ) : (
                  <span style={{ fontSize: 12.5, color: C.ink2 }}>{a.note}</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>{fmtDur(a.sec)}</div>
              <div className="flex items-center gap-2">
                {onChange ? (
                  <select value={a.cls} onChange={(e) => onChange(a.id, { cls: e.target.value })}
                    style={{ ...inputStyle, padding: "6px 9px", fontSize: 12.5, color: meta.color, fontWeight: 700, background: meta.tint, border: `1px solid ${meta.color}22` }}>
                    {CLASS_ORDER.map((c) => <option key={c} value={c}>{CLASS_META[c].label}</option>)}
                  </select>
                ) : <Pill color={meta.color} bg={meta.tint}>{meta.label}</Pill>}
              </div>
              {!compact && (
                <div className="sm:col-span-4" style={{ gridColumn: "1 / -1" }}>
                  <div style={{ height: 4, borderRadius: 999, background: "#EEF0F6", overflow: "hidden" }}>
                    <div style={{ width: `${(a.sec / total) * 100}%`, height: "100%", background: meta.color, transition: "width .3s" }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {onChange && (
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          Change a classification and every number on this page — and your dashboard — recalculates immediately.
          A lecture on YouTube is productive; highlights are not. You decide which is which.
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   SESSION FLOW: setup → live → summary → quiz → analysis
   ──────────────────────────────────────────────────────────────── */

function pickApp(cfg, elapsedMin, model) {
  const limit = model.failurePoint || 50;
  const fatigue = clamp((elapsedMin - limit * 0.55) / (limit * 0.9), 0, 1);
  const w = [
    { app: cfg.subject.toLowerCase().includes("dsa") || cfg.subject.toLowerCase().includes("comp") ? "VS Code" : "PDF Reader", note: `${cfg.task} — working set`, cls: "productive", w: 46 - fatigue * 24 },
    { app: "Notion", note: "Revision notes", cls: "productive", w: 12 - fatigue * 4 },
    { app: "Chrome", note: "Reference lookup", cls: "contextual", w: 14 },
    { app: "WhatsApp", note: "Class assignment discussion", cls: "maybe", w: (cfg.phoneAway ? 3 : 9) + fatigue * 5 },
    { app: "WhatsApp", note: "Random conversation", cls: "distraction", w: (cfg.phoneAway ? 2 : 7) + fatigue * 7 },
    { app: "YouTube", note: `${cfg.task} lecture`, cls: "distraction", w: 6 + fatigue * 3 },
    { app: "YouTube", note: "Champions League highlights", cls: "distraction", w: (cfg.music ? 4 : 6) + fatigue * 9 },
    { app: "Instagram", note: "Reels", cls: "distraction", w: (cfg.phoneAway ? 1 : 5) + fatigue * 6 },
    { app: "Idle", note: "Away from device", cls: "idle", w: 5 + fatigue * 6 },
  ].map((x) => ({ ...x, w: Math.max(0.5, x.w) }));
  const tot = sum(w.map((x) => x.w));
  let r = Math.random() * tot;
  for (const x of w) { r -= x.w; if (r <= 0) return x; }
  return w[0];
}

function SessionFlow({ state, model, onCreate, onPatch, go, toast }) {
  const p = state.profile;
  const [stage, setStage] = useState("setup");
  const [cfg, setCfg] = useState({
    subject: p.subjects[0] || "General",
    task: "",
    focusMin: p.defaultFocus || 45,
    breakMin: p.defaultBreak || 8,
    phoneAway: true,
    music: false,
  });
  const [live, setLive] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  const [confidence, setConfidence] = useState(65);
  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const speedRef = useRef(speed); speedRef.current = speed;

  const suggestion = model.ready && model.best
    ? `Your model puts your peak at ${windowLabel(model.best.hour)} with ${model.avgFocus} minute blocks.`
    : `Defaults come from onboarding until you have ${MIN_SESSIONS} sessions.`;

  /* ── ticking clock ── */
  useEffect(() => {
    if (stage !== "live") return;
    const id = setInterval(() => {
      const step = speedRef.current;
      setLive((prev) => {
        if (!prev || prev.paused) return prev;
        const c = cfgRef.current;
        if (prev.breakLeft > 0) {
          const bl = Math.max(0, prev.breakLeft - step);
          return { ...prev, breakLeft: bl, breakSec: prev.breakSec + step };
        }
        const elapsed = prev.elapsed + step;
        let acts = prev.activities;
        let current = prev.current;
        let since = prev.since + step;
        let switches = prev.appSwitches;
        if (!current || since >= prev.dwell) {
          const next = pickApp(c, elapsed / 60, model);
          if (!current || next.app !== current.app || next.note !== current.note) switches += 1;
          current = next; since = 0;
        }
        const key = (x) => `${x.app}|${x.note}`;
        const idx = acts.findIndex((a) => key(a) === key(current));
        if (idx >= 0) {
          acts = acts.map((a, i) => (i === idx ? { ...a, sec: a.sec + step } : a));
        } else {
          acts = [...acts, { id: uid(), app: current.app, note: current.note, cls: current.cls, sec: step }];
        }
        const done = elapsed >= c.focusMin * 60;
        return {
          ...prev, elapsed, activities: acts, current, since,
          dwell: since === 0 ? 45 + Math.random() * 150 : prev.dwell,
          appSwitches: switches, finished: done,
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage, model]);

  const start = () => {
    if (!cfg.task.trim()) { toast("Name the task first — it is what the quiz and analysis attach to."); return; }
    setLive({
      startedAt: new Date().toISOString(), elapsed: 0, activities: [], current: null,
      since: 999, dwell: 60, appSwitches: 0, paused: false, breakLeft: 0, breakSec: 0, breaks: 0, finished: false,
    });
    setStage("live");
  };

  const patchActivity = (id, patch) =>
    setLive((prev) => ({ ...prev, activities: prev.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

  const endSession = () => {
    const rec = {
      id: uid(),
      startedAt: live.startedAt,
      endedAt: new Date().toISOString(),
      subject: cfg.subject, task: cfg.task.trim(),
      plannedMin: cfg.focusMin, breakMin: cfg.breakMin,
      phoneAway: cfg.phoneAway, music: cfg.music,
      actualSec: Math.round(live.elapsed),
      appSwitches: live.appSwitches,
      breaksTaken: live.breaks,
      activities: live.activities,
      confidence: null, quiz: null,
    };
    onCreate(rec);
    setSessionId(rec.id);
    setStage("summary");
  };

  const session = state.sessions.find((s) => s.id === sessionId);

  /* ── setup ── */
  if (stage === "setup") {
    return (
      <>
        <PageHead title="Start a study session" sub={suggestion} />
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
          <Card className="p-5">
            <div className="grid gap-4">
              <Field label="Subject">
                <Select value={cfg.subject} onChange={(e) => setCfg({ ...cfg, subject: e.target.value })}>
                  {p.subjects.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Task" hint="Specific beats vague: “Graph traversal — BFS and DFS” rather than “DSA”.">
                <Input value={cfg.task} onChange={(e) => setCfg({ ...cfg, task: e.target.value })} placeholder="Lami's theorem — numericals" />
              </Field>
              <Field label={`Focus duration — ${cfg.focusMin} min`}>
                <Slider value={cfg.focusMin} onChange={(v) => setCfg({ ...cfg, focusMin: v })} min={10} max={120} step={5} suffix=" min" />
              </Field>
              <Field label={`Break duration — ${cfg.breakMin} min`}>
                <Slider value={cfg.breakMin} onChange={(v) => setCfg({ ...cfg, breakMin: v })} min={3} max={20} suffix=" min" />
              </Field>
            </div>
          </Card>

          <div className="grid gap-4" style={{ alignContent: "start" }}>
            <Card className="p-5">
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Conditions</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>These become variables in your performance model.</div>
              <Toggle on={cfg.phoneAway} onChange={(v) => setCfg({ ...cfg, phoneAway: v })}
                label="Phone away" desc="Phone out of reach for the whole block." />
              <div style={{ height: 1, background: C.line }} />
              <Toggle on={cfg.music} onChange={(v) => setCfg({ ...cfg, music: v })}
                label="Music" desc="Anything playing in the background." />
            </Card>

            {model.ready && (
              <Card className="p-5" style={{ background: C.accentSoft, border: `1px solid #DDDFFB` }}>
                <div className="flex items-center gap-2" style={{ color: C.accent, fontSize: 12.5, fontWeight: 700 }}>
                  <Sparkles size={14} /> Predicted efficiency for this setup
                </div>
                <div style={{ fontSize: 34, fontWeight: 800, color: C.accent, letterSpacing: "-0.03em", marginTop: 4 }}>
                  {predictEfficiency({
                    focus: cfg.focusMin, brk: cfg.breakMin, hour: new Date().getHours(),
                    phoneAway: cfg.phoneAway, music: cfg.music, switches: model.switchesPerHour || 8,
                  }, model).score}%
                </div>
                <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 4 }}>
                  Starting now, at {hourLabel(new Date().getHours())}. Adjust the sliders and watch it move.
                </div>
              </Card>
            )}

            <Btn size="lg" full onClick={start}><Play size={17} /> Start session</Btn>
          </div>
        </div>
      </>
    );
  }

  /* ── live ── */
  if (stage === "live") {
    const st = statsOf({ activities: live.activities, actualSec: live.elapsed });
    const remaining = Math.max(0, cfg.focusMin * 60 - live.elapsed);
    const pct = (live.elapsed / (cfg.focusMin * 60)) * 100;
    const onBreak = live.breakLeft > 0;
    return (
      <>
        <PageHead
          title={cfg.task}
          sub={`${cfg.subject} · planned ${cfg.focusMin} min · ${cfg.phoneAway ? "phone away" : "phone nearby"}${cfg.music ? " · music on" : ""}`}
          right={
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Demo speed</span>
              <div style={{ display: "flex", background: "#F1F2F8", borderRadius: 999, padding: 3 }}>
                {[1, 10, 60].map((s) => (
                  <button key={s} onClick={() => setSpeed(s)}
                    style={{
                      border: "none", cursor: "pointer", borderRadius: 999, padding: "5px 11px", fontSize: 12.5, fontWeight: 700,
                      background: speed === s ? "#fff" : "transparent", color: speed === s ? C.ink : C.muted, ...FONT,
                    }}>×{s}</button>
                ))}
              </div>
            </div>
          }
        />

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
          <Card className="p-6 flex flex-col items-center justify-center">
            <Ring
              pct={onBreak ? ((cfg.breakMin * 60 - live.breakLeft) / (cfg.breakMin * 60)) * 100 : pct}
              color={onBreak ? C.maybe : live.paused ? C.idle : C.accent}
              label={onBreak ? fmtClock(live.breakLeft) : fmtClock(remaining)}
              sub={onBreak ? "break remaining" : live.paused ? "paused" : live.finished ? "planned time reached" : "remaining"}
            />
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {live.paused
                ? <Btn onClick={() => setLive({ ...live, paused: false })}><Play size={15} /> Resume</Btn>
                : <Btn variant="ghost" onClick={() => setLive({ ...live, paused: true })}><Pause size={15} /> Pause</Btn>}
              <Btn variant="ghost" disabled={onBreak}
                onClick={() => setLive({ ...live, breakLeft: cfg.breakMin * 60, breaks: live.breaks + 1 })}>
                <Coffee size={15} /> Take break
              </Btn>
              <Btn variant="danger" onClick={endSession}>End session</Btn>
            </div>
            {live.finished && !onBreak && (
              <div style={{ marginTop: 14, fontSize: 13, color: C.good, fontWeight: 700 }}>
                Planned time reached. End the session, or keep going and see what overtime costs you.
              </div>
            )}
          </Card>

          <div className="grid gap-3" style={{ alignContent: "start" }}>
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Stat label="Focused" value={fmtDur(st.focused)} color={C.good} />
              <Stat label="Distracted" value={fmtDur(st.distracted)} color={C.bad} />
              <Stat label="Idle" value={fmtDur(st.idle)} color={C.idle} />
              <Stat label="App switches" value={live.appSwitches} />
            </div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2" style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>
                <span>Live productivity</span>
                <span style={{ color: st.productivity >= 70 ? C.good : st.productivity >= 45 ? C.maybe : C.bad, fontWeight: 800, fontSize: 15 }}>{st.productivity}%</span>
              </div>
              <SplitBar parts={[
                { label: "Focused", value: st.focused, color: C.good },
                { label: "Distracted", value: st.distracted, color: C.bad },
                { label: "Idle", value: st.idle, color: C.idle },
              ]} />
              {live.current && !onBreak && !live.paused && (
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 10 }}>
                  Now in <strong style={{ color: C.ink }}>{live.current.app}</strong> — {live.current.note}
                </div>
              )}
            </Card>
          </div>
        </div>

        <Card className="p-5 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Behaviour tracking</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                Simulated in the browser, because a web page cannot see your desktop apps. On a real device this comes from a local agent.
              </div>
            </div>
            <Pill color={C.accent}>{live.activities.length} activities</Pill>
          </div>
          <div className="mt-4"><ActivityTable activities={live.activities} onChange={patchActivity} /></div>
        </Card>
      </>
    );
  }

  /* ── summary ── */
  if (stage === "summary" && session) {
    const st = statsOf(session);
    return (
      <>
        <PageHead title="Session complete" sub={`${session.subject} · ${session.task}`} />
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
          <Card className="p-6">
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {[
                ["Planned time", `${session.plannedMin} min`, C.ink],
                ["Actual time", fmtDur(st.total), C.ink],
                ["Focused", fmtDur(st.focused), C.good],
                ["Distracted", fmtDur(st.distracted), C.bad],
                ["Idle", fmtDur(st.idle), C.idle],
                ["Productivity", `${st.productivity}%`, st.productivity >= 70 ? C.good : st.productivity >= 45 ? C.maybe : C.bad],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: "#FAFAFE", borderRadius: 12, padding: "11px 13px" }}>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{l}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: c, letterSpacing: "-0.02em" }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>How confident are you about what you learned?</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
              Your own estimate. FocusFlow compares it against the quiz to see whether the feeling matches the recall.
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, color: C.accent, letterSpacing: "-0.03em", marginTop: 14 }}>{confidence}%</div>
            <Slider value={confidence} onChange={setConfidence} min={0} max={100} suffix="%" />
            <div className="flex flex-wrap gap-2 mt-5">
              <Btn onClick={() => { onPatch(session.id, { confidence }); setStage("quiz"); }}>
                <ListChecks size={16} /> Take 5-question quiz
              </Btn>
              <Btn variant="ghost" onClick={() => { onPatch(session.id, { confidence }); setStage("analysis"); }}>Skip the quiz</Btn>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (stage === "quiz" && session) {
    return <Quiz session={session} onFinish={(score, total) => { onPatch(session.id, { quiz: { score, total } }); setStage("analysis"); }} />;
  }

  if (stage === "analysis" && session) {
    return (
      <>
        <PageHead title="Session analysis" sub={`${session.subject} · ${session.task} · ${prettyDate(session.startedAt)}`}
          right={<div className="flex gap-2">
            <Btn variant="ghost" onClick={() => go("dashboard")}>Back to dashboard</Btn>
            <Btn onClick={() => { setStage("setup"); setCfg({ ...cfg, task: "" }); }}>New session</Btn>
          </div>} />
        <SessionAnalysis session={session} model={model} sessions={state.sessions} onPatchActivity={(aid, patch) =>
          onPatch(session.id, { activities: session.activities.map((a) => (a.id === aid ? { ...a, ...patch } : a)) })} />
      </>
    );
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────
   QUIZ
   ──────────────────────────────────────────────────────────────── */

function Quiz({ session, onFinish }) {
  const qs = useMemo(() => quizFor(session.subject), [session.subject]);
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState([]);
  const [done, setDone] = useState(false);

  const score = picks.filter((p, idx) => p === qs[idx].a).length;

  if (done) {
    const pct = round((score / qs.length) * 100);
    return (
      <>
        <PageHead title="Quiz result" sub={`${session.subject} · ${session.task}`} />
        <Card className="p-8 text-center">
          <div style={{ fontSize: 46, fontWeight: 800, color: pct >= 60 ? C.good : C.maybe, letterSpacing: "-0.04em" }}>
            {score}/{qs.length} — {pct}%
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
            Saved against this session, so FocusFlow can compare behaviour against what you actually retained.
          </div>
          <div className="grid gap-2 mt-6 text-left" style={{ maxWidth: 620, margin: "24px auto 0" }}>
            {qs.map((q, idx) => {
              const ok = picks[idx] === q.a;
              return (
                <div key={idx} style={{ border: `1px solid ${ok ? "#CDEBDF" : "#F6D5D5"}`, background: ok ? "#F3FBF7" : "#FEF6F6", borderRadius: 12, padding: "10px 13px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{q.q}</div>
                  <div style={{ fontSize: 12.5, color: ok ? C.good : C.bad, marginTop: 3 }}>
                    {ok ? `Correct — ${q.o[q.a]}` : `You chose ${picks[idx] != null ? q.o[picks[idx]] : "nothing"} · correct: ${q.o[q.a]}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6"><Btn size="lg" onClick={() => onFinish(score, qs.length)}>Continue to analysis</Btn></div>
        </Card>
      </>
    );
  }

  const q = qs[i];
  return (
    <>
      <PageHead title={`Question ${i + 1} of ${qs.length}`} sub={`${session.subject} · ${session.task}`} />
      <Card className="p-6" style={{ maxWidth: 680 }}>
        <div style={{ height: 4, borderRadius: 999, background: "#EEF0F6", marginBottom: 20 }}>
          <div style={{ width: `${((i) / qs.length) * 100}%`, height: "100%", borderRadius: 999, background: C.accent, transition: "width .3s" }} />
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, lineHeight: 1.4, letterSpacing: "-0.01em" }}>{q.q}</div>
        <div className="grid gap-2 mt-5">
          {q.o.map((opt, oi) => {
            const chosen = picks[i] === oi;
            return (
              <button key={oi} onClick={() => { const n = [...picks]; n[i] = oi; setPicks(n); }}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer", fontSize: 14.5,
                  border: `1px solid ${chosen ? C.accent : C.line}`, background: chosen ? C.accentSoft : "#fff",
                  color: chosen ? C.accent : C.ink2, fontWeight: chosen ? 700 : 500, ...FONT,
                }}>{opt}</button>
            );
          })}
        </div>
        <div className="flex justify-between mt-6">
          <Btn variant="ghost" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Back</Btn>
          {i < qs.length - 1
            ? <Btn onClick={() => setI(i + 1)} disabled={picks[i] == null}>Next</Btn>
            : <Btn onClick={() => setDone(true)} disabled={picks[i] == null}>See result</Btn>}
        </div>
      </Card>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   SESSION ANALYSIS — "Why did I fail?"
   ──────────────────────────────────────────────────────────────── */

const LOSS_COLORS = ["#D64545", "#E4713C", "#D9930B", "#7C6CE4", "#4338CA", "#9AA1B9"];

function SessionAnalysis({ session, model, sessions, onPatchActivity }) {
  const st = statsOf(session);
  const { loss, parts } = attributeLoss(session, model);
  const rec = recommendationFor(session, model, sessions);
  const [active, setActive] = useState(null);
  const goalMet = session.actualSec >= session.plannedMin * 60 * 0.9;

  const chartData = parts.map((p, i) => ({ name: p.key, value: p.pct, hint: p.hint, fill: LOSS_COLORS[i % LOSS_COLORS.length] }));

  return (
    <>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <Stat label="Planned" value={`${session.plannedMin} min`} />
        <Stat label="Actual" value={fmtDur(st.total)} />
        <Stat label="Focused" value={fmtDur(st.focused)} color={C.good} />
        <Stat label="Off task" value={fmtDur(st.distracted)} color={C.bad} />
        <Stat label="Productivity" value={`${st.productivity}%`} color={st.productivity >= 70 ? C.good : st.productivity >= 45 ? C.maybe : C.bad} />
        <Stat label="Quiz" value={session.quiz ? `${session.quiz.score}/${session.quiz.total}` : "—"}
          sub={session.confidence != null ? `felt ${session.confidence}% confident` : "no quiz taken"} />
      </div>

      <Card className="p-6 mt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>Why did I fail?</div>
            <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4, maxWidth: 560 }}>
              {goalMet
                ? "You reached the planned time. This is where the rest of the block went."
                : "The block fell short of its planned time. Here is what the lost productivity is made of."}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Productivity loss</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.bad, letterSpacing: "-0.03em" }}>{loss}%</div>
          </div>
        </div>

        {parts.length ? (
          <>
            <div className="mt-5">
              <ChartBox height={Math.max(180, parts.length * 46)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 26 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 12, fill: C.ink2 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tipStyle} formatter={(v) => [`${v}% of total`, "Loss"]} cursor={{ fill: "#F6F7FB" }} />
                  <Bar dataKey="value" radius={[0, 7, 7, 0]} onClick={(d) => setActive(d.name === active ? null : d.name)}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.fill} opacity={active && active !== d.name ? 0.35 : 1} cursor="pointer" />)}
                  </Bar>
                </BarChart>
              </ChartBox>
            </div>
            <div className="grid gap-2 mt-2">
              {parts.map((p, i) => (
                <button key={p.key} onClick={() => setActive(active === p.key ? null : p.key)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textAlign: "left",
                    border: `1px solid ${active === p.key ? LOSS_COLORS[i % LOSS_COLORS.length] + "55" : C.line}`,
                    background: active === p.key ? "#FCFCFE" : "#fff", borderRadius: 12, padding: "10px 13px", cursor: "pointer", ...FONT,
                  }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{p.key}</span>
                    <span style={{ display: "block", fontSize: 12.5, color: C.muted }}>{p.hint}</span>
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: LOSS_COLORS[i % LOSS_COLORS.length] }}>{p.pct}%</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ marginTop: 16, fontSize: 14, color: C.good, fontWeight: 600 }}>
            Nothing was lost in this session — every tracked minute was classified as focused work.
          </div>
        )}

        <div className="mt-5" style={{ background: C.accentSoft, borderRadius: 14, padding: "14px 16px" }}>
          <div className="flex items-center gap-2" style={{ color: C.accent, fontSize: 12.5, fontWeight: 700 }}>
            <Sparkles size={14} /> What to change next time
          </div>
          <div style={{ fontSize: 15, color: C.ink, marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>{rec}</div>
        </div>
      </Card>

      <Card className="p-6 mt-4">
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Where the time went</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, marginBottom: 14 }}>
          Reclassify anything that was misread. The numbers above update with it.
        </div>
        <ActivityTable activities={session.activities} onChange={onPatchActivity} />
      </Card>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   MY PERFORMANCE
   ──────────────────────────────────────────────────────────────── */

function Performance({ state, model, go }) {
  const sessions = state.sessions;
  if (!model.ready) {
    return (
      <>
        <PageHead title="My performance" sub="Your model is built from your own sessions, not from averages." />
        <Empty
          title={`Complete ${MIN_SESSIONS - sessions.length} more session${MIN_SESSIONS - sessions.length === 1 ? "" : "s"} to unlock personalised insights`}
          body={`FocusFlow needs at least ${MIN_SESSIONS} tracked sessions before it will claim to know anything about you. You have ${sessions.length}.`}
          action={<Btn onClick={() => go("session")}><Play size={16} /> Start a session</Btn>}
        />
      </>
    );
  }

  const cards = [
    { label: "Average focus duration", value: `${model.avgFocus} min`, note: "Focused minutes per session." },
    { label: "Best focus window", value: model.best ? windowLabel(model.best.hour) : "—", note: model.best ? `${model.best.score}% average productivity` : "" },
    { label: "Worst focus window", value: model.worst ? windowLabel(model.worst.hour) : "—", note: model.worst ? `${model.worst.score}% average productivity` : "" },
    { label: "Best break duration", value: model.bestBreak ? `${model.bestBreak.min - 1}–${model.bestBreak.min + 1} min` : "—", note: model.bestBreak ? `${model.bestBreak.score}% average across ${model.bestBreak.n} sessions` : "" },
    { label: "Most common distraction", value: model.topDistraction ? model.topDistraction.app : "—", note: model.topDistraction ? `${fmtDur(model.topDistraction.sec)} logged off task` : "" },
    { label: "Best study environment", value: model.env ? model.env.env : "—", note: model.env ? `${model.env.score}% average productivity` : "" },
    { label: "Long-session failure point", value: `~${model.failurePoint} min`, note: "Focus rarely holds past this." },
    { label: "Average quiz score", value: model.avgQuiz != null ? `${model.avgQuiz}%` : "—", note: model.avgConfidence != null ? `Felt ${model.avgConfidence}% confident on average` : "No quizzes yet" },
  ];

  const windowData = model.windows.map((w) => ({ label: windowLabel(w.hour), score: w.score, hour: w.hour }));
  const trend = sessions.slice(-14).map((s) => ({
    d: prettyDate(s.startedAt),
    productivity: statsOf(s).productivity,
    quiz: s.quiz ? round((s.quiz.score / s.quiz.total) * 100) : null,
  }));

  return (
    <>
      <PageHead title="My performance"
        sub={`Built from ${model.n} sessions. Every figure below is measured, not assumed.`}
        right={<Pill color={C.good} bg="#E8F6F0">Model active</Pill>} />

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))" }}>
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: C.ink, marginTop: 5, letterSpacing: "-0.02em" }}>{c.value}</div>
            {c.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{c.note}</div>}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <Card className="p-5">
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Productivity by two-hour window</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, marginBottom: 10 }}>Every window you have actually studied in.</div>
          <ChartBox height={230}>
            <BarChart data={windowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: C.muted }} axisLine={false} tickLine={false} interval={0} angle={-18} height={44} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...tipStyle} formatter={(v) => [`${v}%`, "Productivity"]} cursor={{ fill: "#F6F7FB" }} />
              <Bar dataKey="score" radius={[7, 7, 0, 0]}>
                {windowData.map((d, i) => (
                  <Cell key={i} fill={model.best && d.hour === model.best.hour ? C.good : model.worst && d.hour === model.worst.hour ? C.bad : "#C7CBE6"} />
                ))}
              </Bar>
            </BarChart>
          </ChartBox>
        </Card>

        <Card className="p-5">
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Behaviour against learning outcome</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, marginBottom: 10 }}>Session productivity plotted against the quiz that followed it.</div>
          <ChartBox height={230}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F6" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10.5, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...tipStyle} />
              <Line type="monotone" dataKey="productivity" name="Productivity" stroke={C.accent} strokeWidth={2.5} dot={{ r: 2.5 }} />
              <Line type="monotone" dataKey="quiz" name="Quiz score" stroke={C.good} strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
            </LineChart>
          </ChartBox>
          <div className="flex gap-4 mt-1" style={{ fontSize: 12, color: C.muted }}>
            <span className="flex items-center gap-2"><span style={{ width: 10, height: 3, background: C.accent, display: "inline-block", borderRadius: 2 }} />Productivity</span>
            <span className="flex items-center gap-2"><span style={{ width: 10, height: 3, background: C.good, display: "inline-block", borderRadius: 2 }} />Quiz score</span>
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>How these are calculated</div>
        <div className="grid gap-2 mt-3" style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
          <div>Average focus duration — the mean of focused minutes per session, where focused means productive plus contextual activity.</div>
          <div>Failure point — the 75th percentile of your focused minutes, the length beyond which sustained focus becomes rare.</div>
          <div>Best window — every two-hour window you have studied in, ranked by average session productivity.</div>
          <div>Best environment — your phone and music settings grouped and ranked by the productivity that followed.</div>
        </div>
      </Card>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   PERFORMANCE PREDICTION
   ──────────────────────────────────────────────────────────────── */

function Predictor({ model, state }) {
  const [inp, setInp] = useState({
    focus: model.avgFocus || state.profile.defaultFocus || 45,
    brk: model.bestBreak ? model.bestBreak.min : state.profile.defaultBreak || 8,
    hour: model.best ? model.best.hour : state.profile.preferredHour || 20,
    phoneAway: true, music: false, switches: model.switchesPerHour || 8,
  });
  const { score, rows } = predictEfficiency(inp, model);
  const curve = useMemo(() => {
    const out = [];
    for (let h = 6; h <= 23; h++) out.push({ label: hourLabel(h), hour: h, score: predictEfficiency({ ...inp, hour: h }, model).score });
    return out;
  }, [inp, model]);

  return (
    <>
      <PageHead title="Your performance equation"
        sub="A transparent rule-based estimate, not machine learning. Every term is listed, and the constants come from your own model once you have enough sessions." />

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <Card className="p-6">
          <div className="grid gap-4">
            <Field label={`Focus duration — ${inp.focus} min`}>
              <Slider value={inp.focus} onChange={(v) => setInp({ ...inp, focus: v })} min={10} max={120} step={5} suffix=" min" />
            </Field>
            <Field label={`Break duration — ${inp.brk} min`}>
              <Slider value={inp.brk} onChange={(v) => setInp({ ...inp, brk: v })} min={0} max={25} suffix=" min" />
            </Field>
            <Field label={`Start time — ${hourLabel(inp.hour)}`}>
              <Slider value={inp.hour} onChange={(v) => setInp({ ...inp, hour: v })} min={5} max={23} suffix=":00" />
            </Field>
            <Field label={`App switches per hour — ${inp.switches}`}>
              <Slider value={inp.switches} onChange={(v) => setInp({ ...inp, switches: v })} min={0} max={40} />
            </Field>
            <div style={{ borderTop: `1px solid ${C.line}` }}>
              <Toggle on={inp.phoneAway} onChange={(v) => setInp({ ...inp, phoneAway: v })} label="Phone away" />
              <Toggle on={inp.music} onChange={(v) => setInp({ ...inp, music: v })} label="Music" />
            </div>
          </div>
        </Card>

        <div className="grid gap-4" style={{ alignContent: "start" }}>
          <Card className="p-6 flex flex-col items-center">
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600, marginBottom: 12 }}>Predicted learning efficiency</div>
            <Ring pct={score} label={`${score}%`} sub={score >= 80 ? "strong conditions" : score >= 60 ? "workable" : "expect a drop"}
              color={score >= 80 ? C.good : score >= 60 ? C.maybe : C.bad} />
            {!model.ready && (
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 14, textAlign: "center", maxWidth: 320 }}>
                Running on defaults. After {MIN_SESSIONS} sessions the constants are replaced by your measured norms.
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 8 }}>The arithmetic</div>
            <div className="grid gap-1">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3" style={{ fontSize: 13, padding: "5px 0", borderBottom: i < rows.length - 1 ? `1px dashed ${C.line}` : "none" }}>
                  <span style={{ color: C.ink2 }}>{r.label}</span>
                  <span style={{ fontWeight: 700, color: r.val > 0 ? C.good : r.val < 0 ? C.bad : C.muted }}>
                    {r.val > 0 ? "+" : ""}{r.val}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between mt-2" style={{ fontSize: 14.5, fontWeight: 800, color: C.ink }}>
                <span>Predicted efficiency</span><span>{score}%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5 mt-4">
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Same setup, every hour of the day</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, marginBottom: 10 }}>Keep the sliders fixed and move only the start time.</div>
        <ChartBox height={210}>
          <AreaChart data={curve}>
            <defs>
              <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: C.muted }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={30} />
            <Tooltip {...tipStyle} formatter={(v) => [`${v}%`, "Predicted"]} />
            <ReferenceLine x={hourLabel(inp.hour)} stroke={C.ink} strokeDasharray="4 4" />
            <Area type="monotone" dataKey="score" stroke={C.accent} strokeWidth={2.5} fill="url(#pg)" />
          </AreaChart>
        </ChartBox>
      </Card>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   PREDICTIVE STUDY PLANNER
   ──────────────────────────────────────────────────────────────── */

const SAMPLE_TOPICS = ["Lami's theorem", "Varignon's theorem", "Parallel axis theorem", "Perpendicular axis theorem", "Momentum"];

function buildPlan({ exam, examDate, subject, minutesPerDay, topics, model, profile }) {
  const focus = clamp(model.avgFocus || profile.defaultFocus || 45, 20, 75);
  const brk = model.bestBreak ? model.bestBreak.min : profile.defaultBreak || 8;
  const startHour = model.best ? model.best.hour : profile.preferredHour || 20;

  const ranked = [...topics].sort((a, b) =>
    (b.difficulty * 20 + (100 - b.confidence)) - (a.difficulty * 20 + (100 - a.confidence)));
  // weakest topics get more blocks
  const queue = [];
  ranked.forEach((t) => {
    const weight = t.difficulty * 20 + (100 - t.confidence);
    const reps = weight > 130 ? 2 : 1;
    for (let i = 0; i < reps; i++) queue.push({ ...t, rep: i });
  });

  const daysLeft = Math.max(1, Math.ceil((new Date(examDate) - new Date()) / 86400000));
  const days = [];
  let di = 0;
  let cursor = 0;

  while (cursor < queue.length && di < Math.min(daysLeft, 14)) {
    const date = new Date(); date.setDate(date.getDate() + di);
    let used = 0;
    const blocks = [];
    let t = startHour * 60;
    while (cursor < queue.length && used + focus + brk <= minutesPerDay) {
      const topic = queue[cursor++];
      blocks.push({ id: uid(), type: "study", label: topic.name, mins: focus, start: t, done: false, why: `Difficulty ${topic.difficulty}/5 · confidence ${topic.confidence}%` });
      t += focus; used += focus;
      blocks.push({ id: uid(), type: "break", label: "Break", mins: brk, start: t, done: false, why: `Your best sessions use ${brk} minute breaks` });
      t += brk; used += brk;
    }
    if (blocks.length) {
      const qm = Math.min(20, Math.max(10, minutesPerDay - used));
      blocks.push({ id: uid(), type: "quiz", label: `Quiz — ${blocks[0].label}`, mins: qm, start: t, done: false, why: "Retrieval practice closes the day" });
      days.push({ date: dayKey(date), blocks });
    }
    di++;
  }

  const avgConf = mean(topics.map((t) => t.confidence));
  const avgDiff = mean(topics.map((t) => t.difficulty)) * 20;
  const base = model.ready ? model.overall.productivity : 60;
  const coverage = clamp((days.length / Math.max(1, Math.min(daysLeft, 7))) * 40, 0, 40);
  const success = clamp(round(base * 0.45 + avgConf * 0.25 + (100 - avgDiff) * 0.12 + coverage * 0.6), 20, 96);

  return {
    id: uid(), exam, examDate, subject, minutesPerDay, createdAt: new Date().toISOString(),
    topics, days, success, focus, brk, startHour,
  };
}

function Planner({ state, model, onSavePlan, onUpdatePlan, toast }) {
  const p = state.profile;
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState(p.subjects[0] || "General");
  const [examDate, setExamDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return dayKey(d); });
  const [mins, setMins] = useState(120);
  const [topics, setTopics] = useState([{ id: uid(), name: SAMPLE_TOPICS[0], difficulty: 4, confidence: 35 }]);
  const [draft, setDraft] = useState("");
  const plan = state.plans[state.plans.length - 1];

  const addTopic = (name) => {
    const v = (name || draft).trim(); if (!v) return;
    setTopics([...topics, { id: uid(), name: v, difficulty: 3, confidence: 50 }]); setDraft("");
  };
  const patchTopic = (id, patch) => setTopics(topics.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const generate = () => {
    if (!exam.trim()) return toast("Give the exam a name so the plan has a title.");
    if (!topics.length) return toast("Add at least one topic to schedule.");
    const pl = buildPlan({ exam: exam.trim(), examDate, subject, minutesPerDay: mins, topics, model, profile: p });
    if (!pl.days.length) return toast("Not enough daily time for one block plus a break. Raise the available time.");
    onSavePlan(pl);
    toast("Plan generated from your model.");
  };

  const mutate = (dayIdx, fn) => {
    const days = plan.days.map((d, i) => (i === dayIdx ? { ...d, blocks: fn([...d.blocks]) } : d));
    // recompute start times in order
    days.forEach((d) => {
      let t = plan.startHour * 60;
      d.blocks.forEach((b) => { b.start = t; t += b.mins; });
    });
    onUpdatePlan(plan.id, { days });
  };

  return (
    <>
      <PageHead title="Predictive study planner"
        sub={model.ready
          ? `Blocks sized to your ${model.avgFocus} minute norm, breaks at ${model.bestBreak ? model.bestBreak.min : p.defaultBreak} minutes, placed from ${hourLabel(model.best ? model.best.hour : p.preferredHour)}.`
          : `Using your onboarding preferences until the model has ${MIN_SESSIONS} sessions.`} />

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))" }}>
        <Card className="p-5">
          <div className="grid gap-4">
            <Field label="Exam"><Input value={exam} onChange={(e) => setExam(e.target.value)} placeholder="Engineering Mechanics — Unit test 2" /></Field>
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Subject">
                <Select value={subject} onChange={(e) => setSubject(e.target.value)}>{p.subjects.map((s) => <option key={s}>{s}</option>)}</Select>
              </Field>
              <Field label="Exam date"><Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></Field>
            </div>
            <Field label={`Available study time each day — ${Math.floor(mins / 60)}h ${mins % 60}m`}>
              <Slider value={mins} onChange={setMins} min={30} max={360} step={15} suffix=" min" />
            </Field>
            <div className="flex gap-2">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTopic()} placeholder="Add a topic" />
              <Btn onClick={() => addTopic()}><Plus size={15} /> Add</Btn>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TOPICS.filter((s) => !topics.some((t) => t.name === s)).map((s) => (
                <button key={s} onClick={() => addTopic(s)}
                  style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 999, padding: "5px 11px", fontSize: 12.5, color: C.ink2, cursor: "pointer", ...FONT }}>+ {s}</button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Topics — difficulty and confidence</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>Weak and hard topics are scheduled first, and repeated.</div>
          <div className="grid gap-3 mt-4">
            {topics.map((t) => (
              <div key={t.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 13px", background: "#FCFCFE" }}>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{t.name}</span>
                  <button onClick={() => setTopics(topics.filter((x) => x.id !== t.id))}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted }}><Trash2 size={15} /></button>
                </div>
                <div className="grid gap-3 mt-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>Difficulty {t.difficulty}/5</div>
                    <Slider value={t.difficulty} onChange={(v) => patchTopic(t.id, { difficulty: v })} min={1} max={5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>Confidence {t.confidence}%</div>
                    <Slider value={t.confidence} onChange={(v) => patchTopic(t.id, { confidence: v })} min={0} max={100} step={5} suffix="%" />
                  </div>
                </div>
              </div>
            ))}
            {!topics.length && <div style={{ fontSize: 13, color: C.muted }}>No topics yet. Add one above.</div>}
          </div>
          <div className="mt-4"><Btn full size="lg" onClick={generate}><Calendar size={16} /> Generate plan</Btn></div>
        </Card>
      </div>

      {plan && (
        <Card className="p-5 mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>{plan.exam}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
                {plan.subject} · exam {prettyDate(plan.examDate)} · {plan.days.length} scheduled day{plan.days.length > 1 ? "s" : ""} · {plan.focus} min blocks
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>Predicted success probability</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: plan.success >= 75 ? C.good : C.maybe, letterSpacing: "-0.03em" }}>{plan.success}%</div>
            </div>
          </div>

          <div className="grid gap-4 mt-5">
            {plan.days.map((d, di) => {
              const doneCount = d.blocks.filter((b) => b.done).length;
              return (
                <div key={d.date}>
                  <div className="flex items-center justify-between mb-2">
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                      {new Date(d.date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>{doneCount}/{d.blocks.length} done</div>
                  </div>
                  <div className="grid gap-2">
                    {d.blocks.map((b, bi) => {
                      const tint = b.type === "break" ? "#FCF3E0" : b.type === "quiz" ? "#EEF0FF" : "#fff";
                      const col = b.type === "break" ? C.maybe : b.type === "quiz" ? C.accent : C.ink;
                      return (
                        <div key={b.id} className="flex items-center gap-3"
                          style={{ border: `1px solid ${C.line}`, background: b.done ? "#F5F6FA" : tint, borderRadius: 12, padding: "10px 12px", opacity: b.done ? 0.65 : 1 }}>
                          <button onClick={() => mutate(di, (bl) => bl.map((x) => (x.id === b.id ? { ...x, done: !x.done } : x)))}
                            style={{
                              width: 22, height: 22, borderRadius: 7, flexShrink: 0, cursor: "pointer",
                              border: `1.5px solid ${b.done ? C.good : "#CFD3E4"}`, background: b.done ? C.good : "#fff",
                              display: "grid", placeItems: "center",
                            }}>
                            {b.done && <Check size={13} color="#fff" />}
                          </button>
                          <div style={{ width: 118, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: C.ink2 }}>
                            {minutesToTime(b.start)} – {minutesToTime(b.start + b.mins)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: col, textDecoration: b.done ? "line-through" : "none" }}>{b.label}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>{b.why}</div>
                          </div>
                          <div className="flex gap-1">
                            <button disabled={bi === 0} onClick={() => mutate(di, (bl) => { const t = bl[bi - 1]; bl[bi - 1] = bl[bi]; bl[bi] = t; return bl; })}
                              style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, padding: 5, cursor: bi === 0 ? "not-allowed" : "pointer", color: C.muted, opacity: bi === 0 ? 0.4 : 1 }}><ChevronUp size={14} /></button>
                            <button disabled={bi === d.blocks.length - 1} onClick={() => mutate(di, (bl) => { const t = bl[bi + 1]; bl[bi + 1] = bl[bi]; bl[bi] = t; return bl; })}
                              style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, padding: 5, cursor: "pointer", color: C.muted, opacity: bi === d.blocks.length - 1 ? 0.4 : 1 }}><ChevronDown size={14} /></button>
                            <button onClick={() => mutate(di, (bl) => bl.filter((x) => x.id !== b.id))}
                              style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, padding: 5, cursor: "pointer", color: C.muted }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   HISTORY
   ──────────────────────────────────────────────────────────────── */

function History({ state, model, onPatch }) {
  const [subject, setSubject] = useState("all");
  const [range, setRange] = useState("all");
  const [prod, setProd] = useState("all");
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => {
    const now = Date.now();
    return state.sessions
      .filter((s) => subject === "all" || s.subject === subject)
      .filter((s) => {
        if (range === "all") return true;
        const days = range === "7" ? 7 : range === "30" ? 30 : 1;
        return now - new Date(s.startedAt).getTime() <= days * 86400000;
      })
      .filter((s) => {
        const p = statsOf(s).productivity;
        return prod === "all" || (prod === "high" ? p >= 70 : prod === "mid" ? p >= 45 && p < 70 : p < 45);
      })
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }, [state.sessions, subject, range, prod]);

  const open = state.sessions.find((s) => s.id === openId);
  if (open) {
    return (
      <>
        <PageHead title={open.task} sub={`${open.subject} · ${new Date(open.startedAt).toLocaleString()}`}
          right={<Btn variant="ghost" onClick={() => setOpenId(null)}><ArrowLeft size={15} /> Back to history</Btn>} />
        <SessionAnalysis session={open} model={model} sessions={state.sessions}
          onPatchActivity={(aid, patch) => onPatch(open.id, { activities: open.activities.map((a) => (a.id === aid ? { ...a, ...patch } : a)) })} />
      </>
    );
  }

  return (
    <>
      <PageHead title="Study history" sub={`${state.sessions.length} recorded session${state.sessions.length === 1 ? "" : "s"}. Open any one for its full analysis.`} />
      <Card className="p-4 mb-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <Field label="Subject">
            <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="all">All subjects</option>
              {[...new Set(state.sessions.map((s) => s.subject))].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Date">
            <Select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">All time</option><option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option><option value="30">Last 30 days</option>
            </Select>
          </Field>
          <Field label="Productivity">
            <Select value={prod} onChange={(e) => setProd(e.target.value)}>
              <option value="all">Any</option><option value="high">70% and above</option>
              <option value="mid">45–69%</option><option value="low">Below 45%</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Btn variant="ghost" full onClick={() => { setSubject("all"); setRange("all"); setProd("all"); }}>Clear filters</Btn>
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Empty title="Nothing matches these filters"
          body={state.sessions.length ? "Widen the date range or productivity band to see more sessions." : "Once you finish a session it appears here with its full breakdown."} />
      ) : (
        <div className="grid gap-2">
          {rows.map((s) => {
            const st = statsOf(s);
            return (
              <Card key={s.id} className="p-4" onClick={() => setOpenId(s.id)} hover>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div style={{ minWidth: 190, flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{s.task}</div>
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                      {s.subject} · {new Date(s.startedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} at {hourLabel(new Date(s.startedAt).getHours())}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4" style={{ fontSize: 12.5 }}>
                    {[["Planned", `${s.plannedMin}m`], ["Actual", fmtDur(st.total)], ["Focused", fmtDur(st.focused)],
                      ["Quiz", s.quiz ? `${s.quiz.score}/${s.quiz.total}` : "—"]].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ color: C.muted }}>{l}</div>
                        <div style={{ fontWeight: 700, color: C.ink }}>{v}</div>
                      </div>
                    ))}
                    <div>
                      <div style={{ color: C.muted }}>Productivity</div>
                      <div style={{ fontWeight: 800, color: st.productivity >= 70 ? C.good : st.productivity >= 45 ? C.maybe : C.bad }}>{st.productivity}%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <SplitBar height={6} parts={[
                    { label: "Focused", value: st.focused, color: C.good },
                    { label: "Distracted", value: st.distracted, color: C.bad },
                    { label: "Idle", value: st.idle, color: C.idle },
                  ]} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   INSIGHTS
   ──────────────────────────────────────────────────────────────── */

function Insights({ state, model, insights, go }) {
  const toneColor = { good: C.good, warn: C.maybe, bad: C.bad };
  const toneTint = { good: "#E8F6F0", warn: "#FCF3E0", bad: "#FBEAEA" };
  return (
    <>
      <PageHead title="Insights" sub="Statements FocusFlow can support with your own data. Nothing here is generic advice." />
      {!model.ready || !insights.length ? (
        <Empty
          title={`More sessions required`}
          body={`FocusFlow has ${state.sessions.length} of the ${MIN_SESSIONS} sessions it needs before making claims about how you study. Until then it will not guess.`}
          action={<Btn onClick={() => go("session")}><Play size={16} /> Start a session</Btn>}
        />
      ) : (
        <div className="grid gap-3">
          {insights.map((ins, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-3">
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: toneTint[ins.tone], color: toneColor[ins.tone], display: "grid", placeItems: "center" }}>
                  {ins.tone === "good" ? <TrendingUp size={17} /> : ins.tone === "warn" ? <AlertCircle size={17} /> : <Flame size={17} />}
                </div>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, lineHeight: 1.45 }}>{ins.text}</div>
                  <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Based on: {ins.basis}</div>
                </div>
              </div>
            </Card>
          ))}
          <Card className="p-5" style={{ background: "#FAFAFE" }}>
            <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6 }}>
              These update after every session. If a pattern weakens, the statement disappears rather than being kept for encouragement.
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   PRIVACY
   ──────────────────────────────────────────────────────────────── */

function Privacy({ state, setPrivacy }) {
  const never = ["WhatsApp messages", "Passwords", "Personal files", "Keystrokes", "Private conversations", "Screenshots", "Browsing URLs"];
  const needed = ["Application name", "Duration", "App switches", "Idle time", "Session duration", "Break duration", "Subject", "Task completion"];
  const flow = [
    { t: "Student device", d: "Raw activity stays here. Nothing else ever sees it." },
    { t: "Local processing", d: "Durations and switches are counted on the device." },
    { t: "Necessary statistics", d: "Only aggregate numbers leave: minutes, counts, classifications." },
    { t: "Cloud", d: "Stores the statistics so your model survives a lost device." },
  ];
  return (
    <>
      <PageHead title="Privacy" sub="What FocusFlow needs, what it refuses to take, and where each of them lives." />
      <Card className="p-7" style={{ background: `linear-gradient(150deg, ${C.ink} 0%, #26325C 100%)`, border: "none" }}>
        <div style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.25, maxWidth: 620 }}>
          We optimise your productivity without reading your life.
        </div>
        <div style={{ fontSize: 14.5, color: "#A7B0D8", marginTop: 10, maxWidth: 620, lineHeight: 1.6 }}>
          A study tool needs to know that you spent eleven minutes in a messaging app. It does not need to know what you typed there.
        </div>
      </Card>

      <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <Card className="p-5">
          <div className="flex items-center gap-2" style={{ color: C.bad, fontSize: 13, fontWeight: 700 }}><Lock size={15} /> Never collected</div>
          <div className="grid gap-2 mt-3">
            {never.map((n) => (
              <div key={n} className="flex items-center gap-2" style={{ fontSize: 13.5, color: C.ink2 }}>
                <X size={14} color={C.bad} /> {n}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2" style={{ color: C.good, fontSize: 13, fontWeight: 700 }}><Eye size={15} /> Behavioural data it does use</div>
          <div className="grid gap-2 mt-3">
            {needed.map((n) => (
              <div key={n} className="flex items-center gap-2" style={{ fontSize: 13.5, color: C.ink2 }}>
                <Check size={14} color={C.good} /> {n}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>How data moves</div>
        <div className="flex flex-wrap items-stretch gap-2 mt-4">
          {flow.map((f, i) => (
            <React.Fragment key={f.t}>
              <div style={{ flex: "1 1 190px", background: i === 3 ? C.accentSoft : "#FAFAFE", border: `1px solid ${i === 3 ? "#DDDFFB" : C.line}`, borderRadius: 14, padding: "13px 15px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: i === 3 ? C.accent : C.ink }}>{f.t}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{f.d}</div>
              </div>
              {i < flow.length - 1 && (
                <div className="hidden md:flex" style={{ alignItems: "center", color: C.muted }}><ArrowRight size={16} /></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <Card className="p-5 mt-4">
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Your settings</div>
        <Toggle on={state.privacy.localProcessing} onChange={(v) => setPrivacy({ localProcessing: v })}
          label="Local processing" desc="Classify and count on the device. Turning this off is not available in the prototype — everything here already runs locally." />
        <div style={{ height: 1, background: C.line }} />
        <Toggle on={state.privacy.cloudSync} onChange={(v) => setPrivacy({ cloudSync: v })}
          label="Cloud sync" desc="Send derived statistics only, so your model follows you across devices." />
        <div style={{ height: 1, background: C.line }} />
        <Toggle on={state.privacy.anonAnalytics} onChange={(v) => setPrivacy({ anonAnalytics: v })}
          label="Anonymous analytics" desc="Contribute to cohort-level numbers in the institution view. Never linked back to you." />
        {!state.privacy.anonAnalytics && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: C.maybe, fontWeight: 600 }}>
            With this off, your sessions are excluded from the institution view entirely.
          </div>
        )}
      </Card>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   SETTINGS
   ──────────────────────────────────────────────────────────────── */

function Section({ title, desc, children }) {
  return (
    <Card className="p-5">
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{desc}</div>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Settings({ state, setProfile, setPrefs, setPrivacy, onResetModel, onDeleteAll, toast }) {
  const p = state.profile;
  const [name, setName] = useState(p.name);
  const [email, setEmail] = useState(p.email || "");
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState(null);

  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `focusflow-${todayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast("Exported your data as JSON.");
    } catch (e) { toast("Export blocked by the browser."); }
  };

  return (
    <>
      <PageHead title="Settings" />
      <div className="grid gap-4">
        <Section title="Profile">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { setProfile({ name: name.trim() || p.name }); toast("Profile updated."); }} />
            </Field>
            <Field label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setProfile({ email })} />
            </Field>
          </div>
          <div className="mt-4">
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink2, marginBottom: 6 }}>Subjects</div>
            <div className="flex gap-2">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a subject"
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || !draft.trim()) return;
                  if (p.subjects.some((s) => s.toLowerCase() === draft.trim().toLowerCase())) return setDraft("");
                  setProfile({ subjects: [...p.subjects, draft.trim()] }); setDraft("");
                }} />
              <Btn onClick={() => {
                if (!draft.trim() || p.subjects.some((s) => s.toLowerCase() === draft.trim().toLowerCase())) return;
                setProfile({ subjects: [...p.subjects, draft.trim()] }); setDraft("");
              }}><Plus size={15} /> Add</Btn>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {p.subjects.map((s) => (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.accentSoft, color: C.accent, padding: "6px 8px 6px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600 }}>
                  {s}
                  <button onClick={() => setProfile({ subjects: p.subjects.filter((x) => x !== s) })}
                    style={{ border: "none", background: "rgba(67,56,202,.12)", borderRadius: 999, width: 18, height: 18, display: "grid", placeItems: "center", cursor: "pointer", color: C.accent }}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Study defaults" desc="Used to pre-fill new sessions and to seed the planner before your model has enough data.">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
            <Field label="Preferred study time">
              <Select value={p.preferredHour} onChange={(e) => setProfile({ preferredHour: +e.target.value })}>
                {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => <option key={h} value={h}>{windowLabel(h)}</option>)}
              </Select>
            </Field>
            <Field label={`Default session — ${p.defaultFocus} min`}>
              <Slider value={p.defaultFocus} onChange={(v) => setProfile({ defaultFocus: v })} min={15} max={120} step={5} suffix=" min" />
            </Field>
            <Field label={`Default break — ${p.defaultBreak} min`}>
              <Slider value={p.defaultBreak} onChange={(v) => setProfile({ defaultBreak: v })} min={3} max={25} suffix=" min" />
            </Field>
          </div>
        </Section>

        <Section title="Notifications">
          <Toggle on={state.prefs.notifSession} onChange={(v) => setPrefs({ notifSession: v })} label="Session reminders" desc="A nudge at your best window if no session has started." />
          <div style={{ height: 1, background: C.line }} />
          <Toggle on={state.prefs.notifBreak} onChange={(v) => setPrefs({ notifBreak: v })} label="Break reminders" desc="Prompt a break as you approach your focus limit." />
          <div style={{ height: 1, background: C.line }} />
          <Toggle on={state.prefs.notifRecs} onChange={(v) => setPrefs({ notifRecs: v })} label="Recommendations" desc="Tell me when the model finds something new." />
        </Section>

        <Section title="Privacy">
          <Toggle on={state.privacy.localProcessing} onChange={(v) => setPrivacy({ localProcessing: v })} label="Local processing" />
          <div style={{ height: 1, background: C.line }} />
          <Toggle on={state.privacy.cloudSync} onChange={(v) => setPrivacy({ cloudSync: v })} label="Cloud sync" />
          <div style={{ height: 1, background: C.line }} />
          <Toggle on={state.privacy.anonAnalytics} onChange={(v) => setPrivacy({ anonAnalytics: v })} label="Anonymous analytics" />
        </Section>

        <Section title="Data" desc={`${state.sessions.length} sessions and ${state.plans.length} plans are stored on this device.`}>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={exportData}><Download size={15} /> Export data</Btn>
            <Btn variant="ghost" onClick={() => setConfirm("model")}><RotateCcw size={15} /> Reset performance model</Btn>
            <Btn variant="danger" onClick={() => setConfirm("all")}><Trash2 size={15} /> Delete all data</Btn>
          </div>
        </Section>
      </div>

      <Modal open={confirm === "model"} onClose={() => setConfirm(null)} title="Reset the performance model?">
        <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>
          This deletes all {state.sessions.length} sessions and every plan built from them. Your account, subjects and preferences stay.
          The model returns to its unlocked state and will need {MIN_SESSIONS} new sessions.
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setConfirm(null)}>Keep my data</Btn>
          <Btn variant="danger" onClick={() => { onResetModel(); setConfirm(null); }}>Reset model</Btn>
        </div>
      </Modal>

      <Modal open={confirm === "all"} onClose={() => setConfirm(null)} title="Delete everything?">
        <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>
          Accounts, sessions, quizzes, plans and settings are removed from this device and cannot be recovered. You will be returned to the landing page.
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => { onDeleteAll(); setConfirm(null); }}>Delete all data</Btn>
        </div>
      </Modal>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   PRICING
   ──────────────────────────────────────────────────────────────── */

function Pricing({ toast }) {
  const [pay, setPay] = useState(false);
  const [paid, setPaid] = useState(false);
  const free = ["Focus tracking", "Basic analytics", "Manual sessions", "Basic recommendations"];
  const prem = ["Personal performance model", "Predictive scheduling", "Learning outcome analysis", "Advanced analytics", "AI recommendations", "Cross-device syncing"];
  return (
    <>
      <PageHead title="Plans" sub="Proposed prototype pricing. No payment is processed anywhere in this build." />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <Card className="p-6">
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Free</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", marginTop: 6 }}>₹0</div>
          <div style={{ fontSize: 12.5, color: C.muted }}>Everything you need to start measuring.</div>
          <div className="grid gap-2 mt-5">
            {free.map((f) => <div key={f} className="flex items-center gap-2" style={{ fontSize: 13.5, color: C.ink2 }}><Check size={15} color={C.good} /> {f}</div>)}
          </div>
          <div className="mt-6"><Btn variant="ghost" full disabled>Your current plan</Btn></div>
        </Card>

        <Card className="p-6" style={{ borderColor: "#DDDFFB", boxShadow: "0 16px 44px -26px rgba(67,56,202,.6)" }}>
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Premium</div>
            <Pill>Most useful after 2 weeks</Pill>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", marginTop: 6 }}>
            ₹99<span style={{ fontSize: 15, color: C.muted, fontWeight: 600 }}> – ₹149 / month</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.muted }}>Once there is enough data to model you properly.</div>
          <div className="grid gap-2 mt-5">
            {prem.map((f) => <div key={f} className="flex items-center gap-2" style={{ fontSize: 13.5, color: C.ink2 }}><Check size={15} color={C.accent} /> {f}</div>)}
          </div>
          <div className="mt-6">
            <Btn full onClick={() => setPay(true)}>{paid ? "Demo upgrade active" : "Upgrade"}</Btn>
          </div>
        </Card>
      </div>

      <Modal open={pay} onClose={() => setPay(false)} title="Demo payment">
        <div style={{ background: "#FCF3E0", color: "#8A5A05", fontSize: 13, padding: "10px 13px", borderRadius: 11, fontWeight: 600 }}>
          This is a demo checkout. No card is collected and no charge is made.
        </div>
        <div className="grid gap-3 mt-4">
          <Field label="Card number"><Input value="4242 4242 4242 4242" readOnly /></Field>
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Expiry"><Input value="04 / 29" readOnly /></Field>
            <Field label="CVC"><Input value="•••" readOnly /></Field>
          </div>
          <Field label="Plan"><Input value="Premium — ₹99 per month" readOnly /></Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setPay(false)}>Cancel</Btn>
          <Btn onClick={() => { setPaid(true); setPay(false); toast("Demo upgrade applied. Nothing was charged."); }}>Complete demo payment</Btn>
        </div>
      </Modal>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   INSTITUTION VIEW (anonymised aggregate only)
   ──────────────────────────────────────────────────────────────── */

const COHORT_TOPICS = [
  { topic: "Rotational Mechanics", struggling: 37 },
  { topic: "Thermodynamics", struggling: 29 },
  { topic: "Calculus", struggling: 22 },
  { topic: "Graph algorithms", struggling: 19 },
  { topic: "Organic reactions", struggling: 16 },
];

function Institution({ state, model }) {
  const contributes = state.privacy.anonAnalytics;
  const cohort = 5000;
  const yourEff = model.ready ? model.overall.productivity : null;
  const efficiency = 72;
  const hours = [
    { label: "6 AM", v: 34 }, { label: "9 AM", v: 51 }, { label: "12 PM", v: 58 }, { label: "3 PM", v: 47 },
    { label: "6 PM", v: 66 }, { label: "9 PM", v: 79 }, { label: "12 AM", v: 41 },
  ];
  return (
    <>
      <PageHead title="Institution view"
        sub="Aggregate figures for a cohort of 5,000 students. Individual activity, applications and browsing never appear here."
        right={<Pill color={C.good} bg="#E8F6F0"><Shield size={13} /> Anonymised</Pill>} />

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
        <Stat label="Students" value={cohort.toLocaleString()} icon={<Users size={14} />} sub="Contributing anonymous statistics" />
        <Stat label="Average study efficiency" value={`${efficiency}%`} color={C.good} icon={<Gauge size={14} />} />
        <Stat label="Assignment completion" value="81%" icon={<ListChecks size={14} />} />
        <Stat label="Students needing support" value="14%" color={C.bad} icon={<AlertCircle size={14} />} sub="Efficiency under 45% for two weeks" />
      </div>

      <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <Card className="p-5">
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Topics students struggle with</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, marginBottom: 12 }}>
            Share of the cohort with low confidence and low quiz recall on the topic.
          </div>
          <ChartBox height={230}>
            <BarChart data={COHORT_TOPICS} layout="vertical" margin={{ left: 4, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F6" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="topic" width={140} tick={{ fontSize: 11.5, fill: C.ink2 }} axisLine={false} tickLine={false} />
              <Tooltip {...tipStyle} formatter={(v) => [`${v}% struggling`, "Cohort"]} cursor={{ fill: "#F6F7FB" }} />
              <Bar dataKey="struggling" radius={[0, 7, 7, 0]}>
                {COHORT_TOPICS.map((t, i) => <Cell key={i} fill={t.struggling >= 30 ? C.bad : t.struggling >= 20 ? C.maybe : "#C7CBE6"} />)}
              </Bar>
            </BarChart>
          </ChartBox>
        </Card>

        <Card className="p-5">
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>When the cohort actually studies well</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, marginBottom: 12 }}>Average efficiency by time of day, all students pooled.</div>
          <ChartBox height={230}>
            <AreaChart data={hours}>
              <defs>
                <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...tipStyle} formatter={(v) => [`${v}%`, "Efficiency"]} />
              <Area type="monotone" dataKey="v" stroke={C.accent} strokeWidth={2.5} fill="url(#ig)" />
            </AreaChart>
          </ChartBox>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <div className="flex items-start gap-3">
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.accentSoft, color: C.accent, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Building2 size={17} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>What a department can and cannot see</div>
            <div style={{ fontSize: 13.5, color: C.ink2, marginTop: 6, lineHeight: 1.6, maxWidth: 720 }}>
              Staff see cohort percentages and topic-level difficulty, which is enough to schedule a revision class for Rotational Mechanics.
              They cannot open a student, see an application list, or read a single session. There is no drill-down, by design.
            </div>
            <div style={{ fontSize: 13, color: contributes ? C.good : C.maybe, marginTop: 10, fontWeight: 700 }}>
              {contributes
                ? `Your sessions are pooled into these figures anonymously${yourEff != null ? ` — your own efficiency is ${yourEff}%, visible only to you.` : "."}`
                : "Anonymous analytics is off, so none of your sessions are counted here."}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   DEMO STORY (three weeks of Rahul, computed from the demo data)
   ──────────────────────────────────────────────────────────────── */

function DemoStory({ state, model, onBuildPlan, onDismiss }) {
  const now = Date.now();
  const weeks = [0, 1, 2].map((i) => {
    const from = now - (21 - i * 7) * 86400000, to = now - (14 - i * 7) * 86400000;
    return state.sessions.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= from && t < to;
    });
  });
  const w = weeks.map((ws) => ({ n: ws.length, prod: aggregate(ws).productivity }));

  return (
    <Card className="p-5 mb-4" style={{ background: "linear-gradient(140deg,#F7F5FF 0%, #FFFFFF 60%)", borderColor: "#E4E2FB" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2" style={{ color: "#7C3AED", fontSize: 12.5, fontWeight: 700 }}>
            <Play size={14} /> Demo — three weeks with Rahul
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 5, letterSpacing: "-0.02em" }}>
            Watch the model form, then watch it schedule an exam
          </div>
        </div>
        <Btn variant="plain" size="sm" onClick={onDismiss}>Hide</Btn>
      </div>

      <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "13px 15px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>Week 1 — data collection</div>
          <div style={{ fontSize: 13.5, color: C.ink2, marginTop: 6, lineHeight: 1.55 }}>
            {w[0].n} sessions logged at {w[0].prod}% average productivity. FocusFlow makes no claims yet.
          </div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "13px 15px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>Week 2 — the model appears</div>
          <div style={{ fontSize: 13.5, color: C.ink2, marginTop: 6, lineHeight: 1.55 }}>
            Best focus {model.best ? windowLabel(model.best.hour) : "—"} · average effective session {model.avgFocus} min · biggest distraction {model.topDistraction ? model.topDistraction.app : "—"}.
          </div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "13px 15px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>Week 3 — a Physics exam</div>
          <div style={{ fontSize: 13.5, color: C.ink2, marginTop: 6, lineHeight: 1.55 }}>
            Optics and Semiconductors are weakest. FocusFlow schedules them inside the peak window, in {model.avgFocus} minute blocks.
          </div>
          <div className="mt-3"><Btn size="sm" onClick={onBuildPlan}>Build Rahul's exam plan</Btn></div>
        </div>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────
   ROOT
   ──────────────────────────────────────────────────────────────── */

export default function FocusFlow() {
  useFonts();
  const [state, setState] = useState(null);
  const [screen, setScreen] = useState("landing");   // landing | auth | onboard | app
  const [authMode, setAuthMode] = useState("signup");
  const [pendingUser, setPendingUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [view, setView] = useState("student");
  const [toastMsg, setToastMsg] = useState("");
  const [showDemoStory, setShowDemoStory] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      loaded.current = true;
      if (s.currentUserId && s.profile) setScreen("app");
    });
  }, []);

  useEffect(() => { if (state && loaded.current) saveState(state); }, [state]);

  const toast = useCallback((m) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg((cur) => (cur === m ? "" : cur)), 2600);
  }, []);

  const model = useMemo(() => buildModel(state ? state.sessions : []), [state]);
  const insights = useMemo(() => (state ? buildInsights(state.sessions, model) : []), [state, model]);

  if (!state) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.page, color: C.muted, ...FONT }}>Loading FocusFlow…</div>;
  }

  /* ── mutations ── */
  const patch = (fn) => setState((s) => fn(s));
  const createSession = (rec) => patch((s) => ({ ...s, sessions: [...s.sessions, rec] }));
  const patchSession = (id, p) => patch((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const setProfile = (p) => patch((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  const setPrefs = (p) => patch((s) => ({ ...s, prefs: { ...s.prefs, ...p } }));
  const setPrivacy = (p) => patch((s) => ({ ...s, privacy: { ...s.privacy, ...p } }));
  const savePlan = (pl) => patch((s) => ({ ...s, plans: [...s.plans, pl] }));
  const updatePlan = (id, p) => patch((s) => ({ ...s, plans: s.plans.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  const launchDemo = () => {
    const d = demoState();
    setState(d); setShowDemoStory(true); setPage("dashboard"); setView("student"); setScreen("app");
    toast("Demo loaded — Rahul, three weeks of sessions.");
  };

  const buildDemoPlan = () => {
    const topics = [
      { id: uid(), name: "Optics", difficulty: 4, confidence: 35 },
      { id: uid(), name: "Semiconductors", difficulty: 5, confidence: 30 },
      { id: uid(), name: "Momentum", difficulty: 3, confidence: 60 },
      { id: uid(), name: "Rotational Mechanics", difficulty: 4, confidence: 45 },
    ];
    const d = new Date(); d.setDate(d.getDate() + 4);
    const pl = buildPlan({
      exam: "Physics unit test", examDate: dayKey(d), subject: "Physics",
      minutesPerDay: 120, topics, model, profile: state.profile,
    });
    savePlan(pl); setPage("planner");
    toast(`Plan built — predicted success ${pl.success}%.`);
  };

  const exitAccount = () => {
    patch((s) => ({ ...s, currentUserId: null }));
    setScreen("landing"); setPage("dashboard");
  };

  const deleteAll = async () => {
    const fresh = emptyState();
    setState(fresh);
    try { await window.storage.delete(STORE_KEY); } catch (e) { /* ignore */ }
    setScreen("landing"); setPage("dashboard");
    toast("All data deleted from this device.");
  };

  /* ── screens ── */
  if (screen === "landing") {
    return (
      <>
        <Landing
          onSignup={() => { setAuthMode("signup"); setScreen("auth"); }}
          onLogin={() => { setAuthMode("login"); setScreen("auth"); }}
          onDemo={launchDemo}
        />
        <Toast msg={toastMsg} />
      </>
    );
  }

  if (screen === "auth") {
    return (
      <>
        <Auth
          mode={authMode} onMode={setAuthMode} users={state.users} onBack={() => setScreen("landing")}
          onDone={(user, isNew) => {
            if (isNew) {
              patch((s) => ({ ...s, users: [...s.users, user], currentUserId: user.id, isDemo: false }));
              setPendingUser(user); setScreen("onboard");
            } else {
              patch((s) => ({ ...s, currentUserId: user.id }));
              if (state.profile && state.profile.id === user.id) { setScreen("app"); setPage("dashboard"); }
              else { setPendingUser(user); setScreen("onboard"); }
            }
          }}
        />
        <Toast msg={toastMsg} />
      </>
    );
  }

  if (screen === "onboard") {
    return (
      <>
        <Onboarding user={pendingUser} onDone={(profile) => {
          patch((s) => ({ ...s, profile }));
          setScreen("app"); setPage("dashboard");
          toast(`Welcome, ${profile.name}.`);
        }} />
        <Toast msg={toastMsg} />
      </>
    );
  }

  const body = view === "institution"
    ? <Institution state={state} model={model} />
    : page === "dashboard" ? (
      <>
        {state.isDemo && showDemoStory && (
          <DemoStory state={state} model={model} onBuildPlan={buildDemoPlan} onDismiss={() => setShowDemoStory(false)} />
        )}
        <Dashboard state={state} model={model} insights={insights} go={setPage} />
      </>
    )
    : page === "session" ? <SessionFlow state={state} model={model} onCreate={createSession} onPatch={patchSession} go={setPage} toast={toast} />
    : page === "performance" ? <Performance state={state} model={model} go={setPage} />
    : page === "predict" ? <Predictor model={model} state={state} />
    : page === "planner" ? <Planner state={state} model={model} onSavePlan={savePlan} onUpdatePlan={updatePlan} toast={toast} />
    : page === "history" ? <History state={state} model={model} onPatch={patchSession} />
    : page === "insights" ? <Insights state={state} model={model} insights={insights} go={setPage} />
    : page === "privacy" ? <Privacy state={state} setPrivacy={setPrivacy} />
    : page === "settings" ? <Settings state={state} setProfile={setProfile} setPrefs={setPrefs} setPrivacy={setPrivacy}
        onResetModel={() => { patch((s) => ({ ...s, sessions: [], plans: [] })); toast("Performance model reset."); }}
        onDeleteAll={deleteAll} toast={toast} />
    : page === "pricing" ? <Pricing toast={toast} />
    : null;

  return (
    <>
      <Shell page={page} setPage={setPage} profile={state.profile} isDemo={state.isDemo}
        view={view} setView={setView} onExit={exitAccount}>
        {body}
      </Shell>
      <Toast msg={toastMsg} />
    </>
  );
}
