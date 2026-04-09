// ============================================================
//  CARAIDIZ 💎 — Daily Cara PWA
//  /src/App.jsx
// ============================================================
//
//  HOW TO ADD A TIKTOK EMBED URL
//  ─────────────────────────────
//  1. On TikTok, copy a video link: https://www.tiktok.com/@user/video/7123456789
//  2. Convert to embed: https://www.tiktok.com/embed/v2/7123456789
//  3. Paste into videoUrl field below. Leave null for placeholder.
//
//  HOW TO ADD NEW CARAS
//  ─────────────────────────────
//  Add objects to the CARAS array. Daily Cara = daysSinceEpoch % CARAS.length
//  Fields: category · answer · wordCount · hint · videoUrl
// ============================================================

import { useState, useEffect, useRef } from "react";

// ─── CARA LIBRARY ─────────────────────────────────────────────
const CARAS = [
  { category: "Brand",   answer: "Nike",             wordCount: 1, hint: "Sporting goods giant. Just do it. 👟",                    videoUrl: null },
  { category: "Film",    answer: "Titanic",           wordCount: 1, hint: "1997. Leonardo DiCaprio. 'I'm the king of the world.' 🚢", videoUrl: null },
  { category: "Song",    answer: "Thriller",          wordCount: 1, hint: "Michael Jackson. Zombies. 1982. 🕺",                       videoUrl: null },
  { category: "Sport",   answer: "Tennis",            wordCount: 1, hint: "Racket. Net. Love means zero. 🎾",                        videoUrl: null },
  { category: "TV Show", answer: "Friends",           wordCount: 1, hint: "Could it BE any more iconic? ☕",                         videoUrl: null },
  { category: "Brand",   answer: "Apple",             wordCount: 1, hint: "Think different. The bitten fruit. 🍎",                   videoUrl: null },
  { category: "Phrase",  answer: "Break a leg",       wordCount: 3, hint: "What you say before someone goes on stage. 🎭",           videoUrl: null },
  { category: "Film",    answer: "The Lion King",     wordCount: 3, hint: "Hakuna Matata. African savanna. 1994. 🦁",                videoUrl: null },
  { category: "TV Show", answer: "Stranger Things",   wordCount: 2, hint: "Upside Down. Hawkins Indiana. 1980s. 👾",                 videoUrl: null },
  { category: "Song",    answer: "Bohemian Rhapsody", wordCount: 2, hint: "Queen. Is this the real life? 🎸",                        videoUrl: null },
];

// ─── CONSTANTS ────────────────────────────────────────────────
const LS_NAME    = "crz_name";
const LS_STREAK  = "crz_streak";
const LS_LAST    = "crz_last_date";
const LS_SCORES  = "crz_scores";

const CAT_COLORS = {
  Brand:    "#80DEEA",
  Film:     "#FF8A65",
  Song:     "#C084FC",
  Sport:    "#4ADE80",
  "TV Show":"#FACC15",
  Phrase:   "#FB7185",
};

// ─── HELPERS ──────────────────────────────────────────────────
const todayStr    = () => new Date().toISOString().slice(0, 10);
const normalize   = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const loadJSON    = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const saveJSON    = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function getDailyIndex() {
  return Math.floor(Date.now() / 86400000) % CARAS.length;
}

function tomorrowLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

// ─── STYLES ───────────────────────────────────────────────────
const G = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: 100%; background: #0A0A0F; }
  body {
    min-height: 100%;
    font-family: 'DM Sans', Calibri, sans-serif;
    color: #fff;
    background: #0A0A0F;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
  }
  input::placeholder { color: #8888AA; }

  .crz-root {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 20px calc(40px + env(safe-area-inset-bottom));
    position: relative;
  }
  .crz-root::before {
    content: '';
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 500px; height: 500px;
    background: radial-gradient(ellipse at center, rgba(128,222,234,0.06) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }

  .crz-card {
    background: #1E1E2E;
    border-radius: 24px;
    padding: 32px 24px 28px;
    width: 100%; max-width: 420px;
    position: relative; z-index: 1;
    border: 1px solid rgba(255,255,255,0.07);
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: fadeUp .3s ease-out;
  }

  .crz-logo {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 20px; font-weight: 900;
    letter-spacing: .07em; text-align: center;
    margin-bottom: 3px;
  }
  .crz-logo span { color: #80DEEA; }
  .crz-tagline {
    text-align: center; color: #8888AA;
    font-size: 11px; letter-spacing: .12em;
    text-transform: uppercase; margin-bottom: 28px;
  }

  .crz-h1 {
    font-family: 'Arial Black', Arial, sans-serif;
    font-weight: 900; font-size: 24px;
    line-height: 1.15; margin-bottom: 8px;
  }
  .crz-sub { color: #8888AA; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }

  .crz-input {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    padding: 13px 16px; color: #fff;
    font-size: 16px; font-family: inherit;
    outline: none; transition: border-color .2s;
    caret-color: #80DEEA;
  }
  .crz-input:focus { border-color: #80DEEA; }

  .crz-btn {
    width: 100%; padding: 14px;
    border-radius: 12px; border: none;
    font-family: 'Arial Black', Arial, sans-serif;
    font-weight: 900; font-size: 14px;
    letter-spacing: .04em; cursor: pointer;
    transition: transform .1s, opacity .15s;
    margin-top: 10px;
  }
  .crz-btn:active { transform: scale(.97); }
  .crz-btn-primary { background: #80DEEA; color: #0A0A0F; }
  .crz-btn-primary:disabled { opacity: .3; cursor: default; }
  .crz-btn-ghost {
    background: transparent;
    border: 1.5px solid rgba(255,255,255,0.13) !important;
    color: #8888AA; font-family: 'DM Sans', sans-serif;
    font-weight: 600; font-size: 13px;
  }

  .crz-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 11px; border-radius: 20px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    margin-bottom: 16px;
  }

  .crz-dots { display: flex; gap: 6px; margin: 12px 0 20px; flex-wrap: wrap; }
  .crz-dot {
    width: 11px; height: 11px; border-radius: 50%;
    border: 2px solid #80DEEA; background: transparent;
    transition: background .2s;
  }
  .crz-dot.on { background: #80DEEA; }

  .crz-hint {
    background: rgba(128,222,234,0.07);
    border: 1px solid rgba(128,222,234,0.2);
    border-radius: 10px; padding: 10px 13px;
    font-size: 13px; color: #80DEEA;
    margin-bottom: 16px; line-height: 1.5;
  }
  .crz-wrong {
    display: inline-block;
    background: rgba(255,138,101,0.12);
    border: 1px solid rgba(255,138,101,0.3);
    border-radius: 20px; padding: 2px 11px;
    font-size: 12px; color: #FF8A65;
    margin: 3px 3px 3px 0;
  }

  .crz-video {
    width: 100%; aspect-ratio: 9/16;
    border-radius: 14px; overflow: hidden;
    background: #111122; margin-bottom: 16px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .crz-video iframe { width: 100%; height: 100%; border: none; display: block; }
  .crz-vph {
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px; color: #8888AA; font-size: 12px;
  }

  .crz-stat-row { display: flex; gap: 10px; margin-bottom: 20px; }
  .crz-stat {
    flex: 1;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px; padding: 14px 10px; text-align: center;
  }
  .crz-stat-n {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 26px; font-weight: 900; line-height: 1; margin-bottom: 3px;
  }
  .crz-stat-l { font-size: 10px; color: #8888AA; letter-spacing: .08em; text-transform: uppercase; }

  .crz-next {
    background: rgba(255,138,101,0.08);
    border: 1px solid rgba(255,138,101,0.2);
    border-radius: 12px; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
  }
  .crz-next-date {
    font-family: 'Arial Black', Arial, sans-serif;
    font-weight: 900; font-size: 14px; color: #FF8A65;
  }

  .crz-reveal-ans {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 30px; font-weight: 900;
    text-align: center; padding: 20px 0 6px; line-height: 1.1;
  }
  .crz-ok  { text-align: center; color: #4ADE80; font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 3px; }
  .crz-err { text-align: center; color: #FF8A65; font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 3px; }

  .crz-div { height: 1px; background: rgba(255,255,255,0.07); margin: 20px 0; }

  /* Install banner */
  .crz-install {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #1E1E2E;
    border-top: 1px solid rgba(128,222,234,0.2);
    padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
    display: flex; align-items: center; gap: 12px;
    z-index: 100; animation: slideUp .3s ease-out;
  }
  .crz-install-text { flex: 1; }
  .crz-install-text strong { display: block; font-size: 13px; margin-bottom: 1px; }
  .crz-install-text span { font-size: 11px; color: #8888AA; }
  .crz-install-btn {
    background: #80DEEA; color: #0A0A0F;
    border: none; border-radius: 10px;
    padding: 9px 16px; font-weight: 800;
    font-size: 13px; cursor: pointer;
    white-space: nowrap;
  }
  .crz-install-x {
    background: none; border: none; color: #8888AA;
    font-size: 18px; cursor: pointer; padding: 4px;
  }

  .crz-already {
    background: rgba(128,222,234,0.08);
    border: 1px solid rgba(128,222,234,0.2);
    border-radius: 10px; padding: 10px 14px;
    font-size: 13px; color: #80DEEA;
    text-align: center; margin-bottom: 18px;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  @media (max-width: 400px) {
    .crz-card { padding: 24px 18px 24px; border-radius: 18px; }
    .crz-h1 { font-size: 21px; }
  }
`;

// ─── LOGO ─────────────────────────────────────────────────────
function Logo() {
  return (
    <>
      <div className="crz-logo">CARAI<span>DIZ</span> 💎</div>
      <div className="crz-tagline">watching becomes playing</div>
    </>
  );
}

// ─── WORD DOTS ────────────────────────────────────────────────
function Dots({ count, filled }) {
  return (
    <div className="crz-dots">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`crz-dot${filled ? " on" : ""}`} />
      ))}
    </div>
  );
}

// ─── VIDEO ────────────────────────────────────────────────────
function VideoBlock({ url }) {
  return (
    <div className="crz-video">
      {url ? (
        <iframe src={url} allow="autoplay; fullscreen" allowFullScreen title="Cara" />
      ) : (
        <div className="crz-vph">
          <span style={{ fontSize: 34, opacity: .45 }}>🎬</span>
          <span>Video coming soon</span>
          <span style={{ fontSize: 10, opacity: .5, textAlign: "center", padding: "0 16px" }}>
            Add a TikTok embed URL to show the Cara here
          </span>
        </div>
      )}
    </div>
  );
}

// ─── INSTALL BANNER ───────────────────────────────────────────
function InstallBanner({ prompt, onDismiss }) {
  if (!prompt) return null;
  function install() {
    prompt.prompt();
    prompt.userChoice.then(() => onDismiss());
  }
  return (
    <div className="crz-install">
      <span style={{ fontSize: 26 }}>💎</span>
      <div className="crz-install-text">
        <strong>Add to Home Screen</strong>
        <span>Play Caraidiz like an app — offline ready</span>
      </div>
      <button className="crz-install-btn" onClick={install}>Install</button>
      <button className="crz-install-x" onClick={onDismiss}>✕</button>
    </div>
  );
}

// ─── SCREEN 1 — NAME ──────────────────────────────────────────
function ScreenName({ onDone }) {
  const [val, setVal] = useState("");
  function submit() {
    const n = val.trim();
    if (!n) return;
    localStorage.setItem(LS_NAME, n);
    onDone(n);
  }
  return (
    <div className="crz-card">
      <Logo />
      <div className="crz-h1">Hey, what's your name?</div>
      <div className="crz-sub">We'll track your streak and tell you when the next Cara drops. No sign-up needed.</div>
      <input
        className="crz-input"
        placeholder="Your first name"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        autoFocus maxLength={30}
      />
      <button className="crz-btn crz-btn-primary" onClick={submit} disabled={!val.trim()}>
        Let's Play →
      </button>
    </div>
  );
}

// ─── SCREEN 2 — CARA ──────────────────────────────────────────
function ScreenCara({ cara, onResult }) {
  const [guess, setGuess]       = useState("");
  const [attempts, setAttempts] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const ref = useRef(null);
  const color = CAT_COLORS[cara.category] || "#80DEEA";

  function submit() {
    if (!guess.trim()) return;
    const ok = normalize(guess) === normalize(cara.answer);
    const next = [...attempts, { text: guess.trim(), ok }];
    setAttempts(next);
    setGuess("");
    if (ok) { onResult({ correct: true, score: 100 }); return; }
    if (next.length >= 2) setShowHint(true);
    ref.current?.focus();
  }

  useEffect(() => {
    setGuess(""); setAttempts([]); setShowHint(false);
    setTimeout(() => ref.current?.focus(), 250);
  }, [cara]);

  return (
    <div className="crz-card">
      <Logo />
      <div className="crz-badge" style={{ background: `${color}18`, border: `1px solid ${color}44`, color }}>
        ● {cara.category}
      </div>
      <VideoBlock url={cara.videoUrl} />
      <div style={{ color: "#8888AA", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>
        {cara.wordCount === 1 ? "1 word" : `${cara.wordCount} words`}
      </div>
      <Dots count={cara.wordCount} filled={false} />
      {showHint && <div className="crz-hint">💡 {cara.hint}</div>}
      {attempts.map((a, i) => <span key={i} className="crz-wrong">✗ {a.text}</span>)}
      <input
        ref={ref}
        className="crz-input"
        style={{ marginTop: attempts.length ? 12 : 0 }}
        placeholder="Type your guess…"
        value={guess}
        onChange={e => setGuess(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        autoFocus
      />
      <button className="crz-btn crz-btn-primary" onClick={submit} disabled={!guess.trim()}>
        Submit Guess
      </button>
      <button className="crz-btn crz-btn-ghost" style={{ marginTop: 8 }} onClick={() => onResult({ correct: false, score: 0 })}>
        Skip — I don't know this one
      </button>
    </div>
  );
}

// ─── SCREEN 3 — REVEAL ────────────────────────────────────────
function ScreenReveal({ cara, result, onNext }) {
  const color = CAT_COLORS[cara.category] || "#80DEEA";
  return (
    <div className="crz-card">
      <Logo />
      {result.correct
        ? <div className="crz-ok">🎉 Correct!</div>
        : <div className="crz-err">Not quite…</div>
      }
      <div className="crz-reveal-ans">{cara.answer}</div>
      <div className="crz-badge" style={{ background: `${color}18`, border: `1px solid ${color}44`, color, marginTop: 10, marginBottom: 16 }}>
        ● {cara.category}
      </div>
      <Dots count={cara.wordCount} filled={true} />
      <div className="crz-hint">💡 {cara.hint}</div>
      <div className="crz-div" />
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#8888AA", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 5 }}>Today's score</div>
        <div style={{ fontFamily: "'Arial Black', Arial", fontWeight: 900, fontSize: 44, color: result.correct ? "#4ADE80" : "#FF8A65" }}>
          {result.score}
        </div>
        <div style={{ fontSize: 11, color: "#8888AA" }}>/ 100</div>
      </div>
      <button className="crz-btn crz-btn-primary" onClick={onNext}>See My Stats →</button>
    </div>
  );
}

// ─── SCREEN 4 — STATS ─────────────────────────────────────────
function ScreenStats({ userName, streak, todayScore, alreadyPlayed }) {
  const [copied, setCopied] = useState(false);
  const scores    = loadJSON(LS_SCORES, {});
  const allScores = Object.values(scores);
  const avg       = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  function copy() {
    const msg = `💎 CARAIDIZ Daily Cara\nCan you guess today's Cara?\nhttps://caraidiz.com\n\n${userName}'s streak: ${streak} 🔥`;
    navigator.clipboard.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });
  }

  return (
    <div className="crz-card">
      <Logo />
      {alreadyPlayed && (
        <div className="crz-already">✓ Already played today — come back tomorrow!</div>
      )}
      <div className="crz-h1">{userName ? `${userName}'s stats` : "Your stats"}</div>
      <div className="crz-stat-row" style={{ marginTop: 16 }}>
        <div className="crz-stat">
          <div className="crz-stat-n" style={{ color: "#FF8A65" }}>{streak}</div>
          <div className="crz-stat-l">🔥 Streak</div>
        </div>
        <div className="crz-stat">
          <div className="crz-stat-n" style={{ color: "#80DEEA" }}>{todayScore ?? "—"}</div>
          <div className="crz-stat-l">Today</div>
        </div>
        <div className="crz-stat">
          <div className="crz-stat-n">{allScores.length}</div>
          <div className="crz-stat-l">Played</div>
        </div>
      </div>
      {allScores.length > 1 && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "11px 14px", display: "flex", justifyContent: "space-between", marginBottom: 18, fontSize: 13 }}>
          <span style={{ color: "#8888AA" }}>Average score</span>
          <span style={{ fontFamily: "'Arial Black', Arial", fontWeight: 900 }}>{avg} / 100</span>
        </div>
      )}
      <div className="crz-next">
        <span style={{ fontSize: 22 }}>🗓</span>
        <div>
          <div style={{ fontSize: 10, color: "#8888AA", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Next Cara drops</div>
          <div className="crz-next-date">{tomorrowLabel()}</div>
        </div>
      </div>
      <button className="crz-btn crz-btn-primary" onClick={copy}>Copy Challenge Link 📋</button>
      <div style={{ textAlign: "center", fontSize: 12, color: "#4ADE80", marginTop: 8, minHeight: 18 }}>
        {copied ? "✓ Copied!" : ""}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const cara  = CARAS[getDailyIndex()];
  const today = todayStr();

  function initialScreen() {
    const name = localStorage.getItem(LS_NAME);
    if (!name) return "name";
    if (localStorage.getItem(LS_LAST) === today) return "stats";
    return "cara";
  }

  const [screen,     setScreen]     = useState(initialScreen);
  const [userName,   setUserName]   = useState(localStorage.getItem(LS_NAME) || "");
  const [streak,     setStreak]     = useState(() => loadJSON(LS_STREAK, 0));
  const [result,     setResult]     = useState(null);
  const [todayScore, setTodayScore] = useState(() => loadJSON(LS_SCORES, {})[today] ?? null);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall,   setShowInstall]   = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function computeStreak() {
    const last = localStorage.getItem(LS_LAST);
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().slice(0, 10);
    if (!last)       return 1;
    if (last === yStr) return (loadJSON(LS_STREAK, 0) || 0) + 1;
    if (last === today) return loadJSON(LS_STREAK, 1);
    return 1;
  }

  function handleName(name) { setUserName(name); setScreen("cara"); }
  function handleResult(res) { setResult(res); setScreen("reveal"); }

  function handleNext() {
    const s = computeStreak();
    setStreak(s); saveJSON(LS_STREAK, s);
    const scores = loadJSON(LS_SCORES, {});
    scores[today] = result.score;
    saveJSON(LS_SCORES, scores);
    localStorage.setItem(LS_LAST, today);
    setTodayScore(result.score);
    setScreen("stats");
  }

  const alreadyPlayed = localStorage.getItem(LS_LAST) === today && screen === "stats" && result === null;

  return (
    <>
      <style>{G}</style>
      <div className="crz-root">
        {screen === "name"   && <ScreenName onDone={handleName} />}
        {screen === "cara"   && <ScreenCara cara={cara} onResult={handleResult} />}
        {screen === "reveal" && result && <ScreenReveal cara={cara} result={result} onNext={handleNext} />}
        {screen === "stats"  && <ScreenStats userName={userName} streak={streak} todayScore={todayScore} alreadyPlayed={alreadyPlayed} />}
      </div>
      <InstallBanner
        prompt={installPrompt}
        onDismiss={() => setShowInstall(false)}
      />
    </>
  );
}
