// ============================================================
//  CARAIDIZ 💎 — Final v4 with real MP4 videos + Mixpanel
// ============================================================

import { useState, useEffect, useRef } from "react";

// ─── MIXPANEL ─────────────────────────────────────────────────
// 1. Go to mixpanel.com → create free account → new project
// 2. Copy your Project Token and replace "YOUR_TOKEN_HERE"
const MIXPANEL_TOKEN = "YOUR_TOKEN_HERE";
const mp = {
  init() {
    if (MIXPANEL_TOKEN === "YOUR_TOKEN_HERE") return;
    const s = document.createElement("script");
    s.src = "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";
    s.onload = () => window.mixpanel.init(MIXPANEL_TOKEN, { track_pageview: true });
    document.head.appendChild(s);
  },
  track(event, props = {}) {
    if (typeof window.mixpanel === "undefined") return;
    window.mixpanel.track(event, { ...props, app: "caraidiz", timestamp: new Date().toISOString() });
  }
};

// ─── CDN BASE URL ─────────────────────────────────────────────
const CDN = "https://pub-cb42555aad7844b7ac02e5cf231188e1.r2.dev";

// ─── 6 CARAS ──────────────────────────────────────────────────
const CARAS = [
  {
    id: 1, category: "Song", answer: "Thriller",
    wordCount: 1, difficulty: "easy",
    hint: "Michael Jackson. Zombies. 1982. 🕺",
    videoUrl: `${CDN}/thriller.mp4.mp4`,
    firstGuessRate: 61,
    egoLine: "Only 39% of players miss this one"
  },
  {
    id: 2, category: "Phrase", answer: "I break up with you",
    wordCount: 5, difficulty: "medium",
    hint: "What you say at the end of a relationship 💔",
    videoUrl: `${CDN}/i-break-up.mp4.mp4`,
    firstGuessRate: 43,
    egoLine: "You're doing better than 70% of players 🔥"
  },
  {
    id: 3, category: "Brand", answer: "Revlon",
    wordCount: 1, difficulty: "medium",
    hint: "Iconic American beauty brand 💄",
    videoUrl: `${CDN}/revlon.mp4.mp4`,
    firstGuessRate: 68,
    egoLine: "Only 32% get this on first try"
  },
  {
    id: 4, category: "TV Show Character", answer: "JR Ewing",
    wordCount: 2, difficulty: "hard",
    hint: "Dallas. The ultimate villain. 🤠",
    videoUrl: `${CDN}/jr-ewing.mp4.mp4`,
    firstGuessRate: 28,
    egoLine: "Elite level — less than 30% get this 👑"
  },
  {
    id: 5, category: "Phrase", answer: "Would you marry me",
    wordCount: 4, difficulty: "hard",
    hint: "The most important question 💍",
    videoUrl: `${CDN}/marry-me.mp4.mp4`,
    firstGuessRate: 55,
    egoLine: "Top 20% if you got this 🔥"
  },
  {
    id: 6, category: "Bonus", answer: "Coldplay Kiss Cam",
    wordCount: 3, difficulty: "expert",
    hint: "A stadium moment + a British band 🎸",
    videoUrl: `${CDN}/coldplay.mp4.mp4`,
    firstGuessRate: 22,
    egoLine: "TOP 5% — only legends get this 💎"
  },
];

const MAX_ATTEMPTS = 3;
const CAT_COLORS = {
  Song: "#C084FC", Brand: "#80DEEA", Phrase: "#FB7185",
  "TV Show Character": "#F472B6", Bonus: "#FACC15",
  Sport: "#4ADE80", Film: "#FF8A65", "TV Show": "#FACC15"
};
const DIFF_COLORS = { easy: "#4ADE80", medium: "#FACC15", hard: "#FF8A65", expert: "#F472B6" };

const norm = s => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const loadJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

function scoreFor(attempt, streak, speed) {
  const base = attempt === 1 ? 100 : attempt === 2 ? 60 : 30;
  return base + (streak >= 3 ? 50 : 0) + (speed ? 25 : 0);
}


// ─── FAKE COMMENTS PER CARA ───────────────────────────────────
const FAKE_COMMENTS = {
  1: [ // Thriller
    { avatar: "🧑", text: "bro got it first try thriller 🕺🕺", wrong: false },
    { avatar: "👩", text: "THRILLER omg i screamed", wrong: false },
    { avatar: "🧔", text: "wait is it beat it??", wrong: true },
    { avatar: "💀", text: "thriller no cap easiest one yet", wrong: false },
    { avatar: "🙋", text: "michael jackson vibes but which song tho", wrong: true },
  ],
  2: [ // I break up with you
    { avatar: "😭", text: "i break up with you LMAOOO the drama", wrong: false },
    { avatar: "🧑", text: "its giving goodbye?? idk", wrong: true },
    { avatar: "💔", text: "i break up with you took me 3 tries ngl", wrong: false },
    { avatar: "👀", text: "wait is it we need to talk", wrong: true },
    { avatar: "😂", text: "i break up with you bestie said it with her chest", wrong: false },
  ],
  3: [ // Revlon
    { avatar: "💄", text: "REVLON instantly knew from the vibe 💅", wrong: false },
    { avatar: "🧑", text: "loreal??? maybelline???", wrong: true },
    { avatar: "👩", text: "revlon she ate this mime fr", wrong: false },
    { avatar: "✨", text: "charlotte tilbury?? idk beauty brands", wrong: true },
    { avatar: "💅", text: "revlon first try let's gooo", wrong: false },
  ],
  4: [ // JR Ewing
    { avatar: "🤠", text: "JR EWING DALLAS ERA 🤠🤠", wrong: false },
    { avatar: "🧑", text: "is this like a cowboy thing??", wrong: true },
    { avatar: "👩", text: "jr ewing my parents would be proud rn", wrong: false },
    { avatar: "😅", text: "no idea who this is ngl", wrong: true },
    { avatar: "📺", text: "JR ewing the villain of villains fr", wrong: false },
  ],
  5: [ // Would you marry me
    { avatar: "💍", text: "WOULD YOU MARRY ME crying rn 😭💍", wrong: false },
    { avatar: "🧑", text: "will you marry me?? same thing??", wrong: false },
    { avatar: "😍", text: "she said the words so elegantly omg", wrong: false },
    { avatar: "🤔", text: "is it like a proposal phrase?", wrong: true },
    { avatar: "💀", text: "would you marry me got it in 1 tryyyy", wrong: false },
  ],
  6: [ // Coldplay Kiss Cam
    { avatar: "🎸", text: "COLDPLAY KISS CAM iconic moment 🎸😂", wrong: false },
    { avatar: "🧑", text: "coldplay concert?? something with coldplay", wrong: true },
    { avatar: "👩", text: "coldplay kiss cam i KNEW it 😭", wrong: false },
    { avatar: "🎶", text: "the way i got this immediately as a swiftie wait wrong band", wrong: true },
    { avatar: "💀", text: "coldplay kiss cam hardest one yet but got it", wrong: false },
  ],
};

// ─── STYLES ───────────────────────────────────────────────────
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#0A0A0F;font-family:'DM Sans',sans-serif;color:#fff;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
  input::placeholder{color:#8888AA}
  .app{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 16px 36px;position:relative}
  .app::before{content:'';position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;background:radial-gradient(ellipse,rgba(128,222,234,0.05) 0%,transparent 70%);pointer-events:none;z-index:0}
  .card{background:#1A1A2E;border-radius:28px;width:100%;max-width:420px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);box-shadow:0 32px 80px rgba(0,0,0,0.7);position:relative;z-index:1;animation:fadeUp .3s ease-out}

  /* START */
  .start-bg{width:100%;aspect-ratio:9/12;background:linear-gradient(160deg,#0D0D1A 0%,#1A0D2E 50%,#0A1520 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
  .start-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px;background:radial-gradient(ellipse,rgba(128,222,234,0.12) 0%,transparent 70%)}
  .start-logo{font-family:'Bebas Neue',sans-serif;font-size:56px;letter-spacing:.12em;background:linear-gradient(135deg,#fff 0%,#80DEEA 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;position:relative;z-index:1;margin-bottom:4px}
  .start-gem{font-size:40px;position:relative;z-index:1;animation:float 3s ease-in-out infinite;margin-bottom:16px}
  .start-tag{font-size:12px;color:#8888AA;letter-spacing:.16em;text-transform:uppercase;position:relative;z-index:1;margin-bottom:28px}
  .start-badge{background:rgba(128,222,234,0.12);border:1px solid rgba(128,222,234,0.3);color:#80DEEA;padding:5px 16px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;position:relative;z-index:1;margin-bottom:6px}
  .start-count{font-size:13px;color:rgba(255,255,255,0.45);position:relative;z-index:1}
  .start-body{padding:20px}
  .start-btn{width:100%;background:#80DEEA;color:#0A0A0F;border:none;border-radius:16px;padding:18px;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.08em;cursor:pointer;box-shadow:0 8px 32px rgba(128,222,234,0.3);transition:transform .1s}
  .start-btn:active{transform:scale(.97)}
  .best-score{text-align:center;font-size:11px;color:#8888AA;margin-top:8px}

  /* TOPBAR */
  .topbar{padding:14px 20px 8px;display:flex;align-items:center;justify-content:space-between}
  .logo-s{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.1em}
  .logo-s span{color:#80DEEA}
  .score-pill{background:rgba(255,255,255,0.08);border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px}
  .streak-n{color:#FF6B35;font-weight:800;font-size:13px}

  /* PROGRESS */
  .prog{padding:0 20px 10px}
  .prog-lbl{display:flex;justify-content:space-between;font-size:10px;color:#8888AA;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase}
  .prog-track{height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:7px}
  .prog-fill{height:100%;background:linear-gradient(90deg,#80DEEA,#C084FC);transition:width .6s ease}
  .pips{display:flex;gap:3px}
  .pip{flex:1;height:4px;border-radius:2px;transition:background .4s}

  /* VIDEO */
  .vid{margin:0 16px;border-radius:18px;overflow:hidden;position:relative;background:#0D0D1A;width:calc(100% - 32px);aspect-ratio:9/16;border:1px solid rgba(255,255,255,0.06);max-height:56vh}
  .vid video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block}
  .vid::before{content:'';display:block;padding-top:177.78%}
  .vid-ph{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#8888AA;font-size:11px}
  .diff-chip{position:absolute;top:10px;left:10px;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
  .tension-chip{position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:4px 10px;font-size:11px;font-weight:700;backdrop-filter:blur(4px)}

  /* PLAY */
  .pbody{padding:14px 20px 18px}
  .meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .cat-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  .adots{display:flex;gap:4px}
  .adot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.12);transition:background .2s}
  .adot.used{background:#FF8A65}
  .wlbl{font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}
  .wdots{display:flex;gap:4px;margin-bottom:12px}
  .wdot{width:10px;height:10px;border-radius:50%;border:2px solid #80DEEA}
  .hint-box{background:rgba(255,138,101,0.08);border:1px solid rgba(255,138,101,0.2);border-radius:10px;padding:8px 12px;font-size:12px;color:#FF8A65;margin-bottom:11px}
  .irow{display:flex;gap:7px;margin-bottom:7px}
  .ginput{flex:1;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.12);border-radius:12px;padding:13px;color:#fff;font-size:15px;font-family:inherit;outline:none;caret-color:#80DEEA;transition:border-color .2s}
  .ginput:focus{border-color:#80DEEA}
  .ginput.shake{animation:shake .3s ease;border-color:#FF8A65}
  .gbtn{background:#80DEEA;color:#0A0A0F;border:none;border-radius:12px;width:50px;font-size:18px;font-weight:900;cursor:pointer;transition:transform .1s}
  .gbtn:active{transform:scale(.95)}
  .gbtn:disabled{opacity:.3;cursor:default}
  .skip{width:100%;background:transparent;border:1px solid rgba(255,255,255,0.09);border-radius:12px;padding:10px;color:#8888AA;font-size:12px;font-family:inherit;cursor:pointer}

  /* ANSWER */
  .answer-screen{padding:20px}
  .rlbl{text-align:center;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:3px}
  .rlbl.ok{color:#4ADE80}
  .rlbl.no{color:#FF8A65}
  .abig{font-family:'Bebas Neue',sans-serif;font-size:38px;letter-spacing:.06em;text-align:center;line-height:1;margin-bottom:4px;animation:popIn .3s ease-out}
  .asub{text-align:center;font-size:12px;color:#8888AA;margin-bottom:14px}
  .strio{display:flex;gap:8px;margin-bottom:12px}
  .sbox{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:11px 6px;text-align:center}
  .snum{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.04em;line-height:1;margin-bottom:1px}
  .slbl{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.06em}
  .streak-banner{background:linear-gradient(135deg,#FF4500,#FF8A65);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;margin-bottom:11px;animation:slideDown .3s ease-out}
  .ego-box{background:rgba(128,222,234,0.07);border:1px solid rgba(128,222,234,0.18);border-radius:10px;padding:9px 14px;text-align:center;font-size:12px;color:#80DEEA;margin-bottom:12px}
  .next-big{width:100%;background:#80DEEA;color:#0A0A0F;border:none;border-radius:14px;padding:16px;font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:.06em;cursor:pointer;animation:pulseCTA 1.5s ease-in-out 1s infinite}
  .next-big:active{transform:scale(.97)}
  .tease{text-align:center;font-size:11px;color:#8888AA;margin-top:8px}

  /* MICRO PAUSE */
  .pause{padding:36px 20px;text-align:center}
  .pause-frac{font-family:'Bebas Neue',sans-serif;font-size:72px;letter-spacing:.04em;line-height:1;background:linear-gradient(135deg,#80DEEA,#C084FC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px}
  .pause-lbl{font-size:11px;color:#8888AA;letter-spacing:.1em;text-transform:uppercase;margin-bottom:18px}
  .pause-streak{display:inline-flex;align-items:center;gap:8px;background:rgba(255,107,53,0.12);border:1px solid rgba(255,107,53,0.3);border-radius:20px;padding:8px 20px;font-size:14px;font-weight:800;color:#FF6B35;margin-bottom:16px}
  .level-up{background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.3);border-radius:12px;padding:12px 16px;font-size:13px;font-weight:700;color:#FACC15}

  /* END */
  .end{padding:28px 20px 24px;text-align:center}
  .etrophy{font-size:54px;margin-bottom:6px;animation:float 3s ease-in-out infinite}
  .etitle{font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:.08em;margin-bottom:4px}
  .erank{display:inline-block;background:linear-gradient(135deg,#FACC15,#FF8A65);color:#0A0A0F;padding:5px 18px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:.08em;margin-bottom:20px}
  .egrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:18px}
  .ebox{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:14px 8px}
  .en{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.04em;line-height:1;margin-bottom:2px}
  .el{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.07em}
  .play-again{width:100%;background:#80DEEA;color:#0A0A0F;border:none;border-radius:14px;padding:16px;font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:.06em;cursor:pointer;margin-bottom:9px;display:block;text-align:center}
  .share-btn{width:100%;background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:13px;color:#fff;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;margin-bottom:14px}
  .comeback{background:rgba(128,222,234,0.07);border:1px solid rgba(128,222,234,0.18);border-radius:12px;padding:12px 16px;font-size:12px;color:#80DEEA}

  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

  /* TIMER */
  .timer-wrap{padding:4px 16px 0;position:relative}
  .timer-track{height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden}
  .timer-fill{height:100%;border-radius:3px;transition:width 1s linear,background .5s}
  .timer-label{display:flex;justify-content:space-between;font-size:10px;margin-top:4px;margin-bottom:2px}
  .timer-secs{font-weight:800;font-size:12px}
  .timer-secs.urgent{color:#FF8A65;animation:timerPulse .5s ease-in-out infinite}
  @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:0.4}}
  /* COMMENTS */
  .comments-section{padding:8px 16px 0}
  .comments-header{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
  .comments-lock{font-size:10px;color:#80DEEA;font-weight:700}
  .cmt-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .cmt-avatar{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.08);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px}
  .cmt-text{font-size:13px;color:rgba(255,255,255,0.75);font-weight:500;transition:filter .5s ease}
  .cmt-text.blurred{filter:blur(5px);user-select:none;pointer-events:none}
  .cmt-text.revealed{filter:blur(0);animation:fadeUp .5s ease-out}
  .cmt-text.wrong-guess{color:#FF8A65}
  .cmt-text.correct-guess{color:#4ADE80}
  .guess-to-reveal{text-align:center;font-size:11px;color:#80DEEA;font-weight:700;letter-spacing:.06em;padding:4px 0 8px;animation:pulse2 2s ease-in-out infinite}
  @keyframes pulse2{0%,100%{opacity:1}50%{opacity:0.5}}

  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  @keyframes popIn{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes slideDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pulseCTA{0%,100%{box-shadow:0 0 0 0 rgba(128,222,234,0.4)}50%{box-shadow:0 0 0 10px rgba(128,222,234,0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
`;

// ─── COMPONENTS ───────────────────────────────────────────────

// ─── COMMENTS BLOCK ───────────────────────────────────────────
function CommentsBlock({ caraId, revealed }) {
  const comments = FAKE_COMMENTS[caraId] || [];
  return (
    <div className="comments-section">
      <div className="comments-header">
        <span>Comments</span>
        {!revealed && <span className="comments-lock">🔒 Guess to reveal</span>}
        {revealed && <span className="comments-lock">🔓 Revealed</span>}
      </div>
      {!revealed && (
        <div className="guess-to-reveal">👆 Submit your guess to see what others said</div>
      )}
      {comments.map((c, i) => (
        <div key={i} className="cmt-row">
          <div className="cmt-avatar">{revealed ? c.avatar : "👤"}</div>
          <div className={`cmt-text ${revealed ? (c.wrong ? "wrong-guess" : "correct-guess") : "blurred"}`}>
            {c.text}
          </div>
        </div>
      ))}
    </div>
  );
}


function VideoBlock({ cara }) {
  const dc = DIFF_COLORS[cara.difficulty] || "#80DEEA";
  const cc = CAT_COLORS[cara.category] || "#80DEEA";
  return (
    <div className="vid">
      {cara.videoUrl
        ? <video src={cara.videoUrl} autoPlay muted loop playsInline />
        : <div className="vid-ph"><span style={{ fontSize: 48, opacity: .12 }}>🎬</span><span>Video loading...</span></div>
      }
      <div className="diff-chip" style={{ background: `${dc}18`, border: `1px solid ${dc}44`, color: dc }}>{cara.difficulty}</div>
      <div className="tension-chip">Only {cara.firstGuessRate}% get this 👀</div>
    </div>
  );
}

function StartScreen({ onStart }) {
  const best = loadJSON("crz_best", 0);
  return (
    <div className="card">
      <div className="start-bg">
        <div className="start-glow" />
        <div className="start-gem">💎</div>
        <div className="start-logo">CARAIDIZ</div>
        <div className="start-tag">watching becomes playing</div>
        <div className="start-badge">💎 6 Caras to beat</div>
        <div className="start-count" style={{ marginTop: 6 }}>Can you beat them all?</div>
        {best > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "rgba(128,222,234,0.6)" }}>Your best: {best} pts</div>}
      </div>
      <div className="start-body">
        <button className="start-btn" onClick={onStart}>START PLAYING →</button>
        <div className="best-score">No signup · Free · ~3 min to complete</div>
      </div>
    </div>
  );
}

const TIMER_DURATION = 30;

function PlayScreen({ cara, onResult, onSkip, attempts, setAttempts, sessionStart }) {
  const [guess, setGuess]   = useState("");
  const [shaking, setShaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const ref = useRef(null);
  const cc = CAT_COLORS[cara.category] || "#80DEEA";

  // Reset timer and input on new Cara
  useEffect(() => {
    setGuess("");
    setTimeLeft(TIMER_DURATION);
    setTimeout(() => ref.current?.focus(), 200);
  }, [cara.id]);

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      // Time's up — auto fail
      mp.track("timer_expired", { cara_id: cara.id });
      onResult({ correct: false, attempts: attempts || 1, speedBonus: false, timedOut: true });
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const pct = (timeLeft / TIMER_DURATION) * 100;
  const timerColor = timeLeft > 15 ? "#80DEEA" : timeLeft > 8 ? "#FACC15" : "#FF8A65";
  const urgent = timeLeft <= 8;

  function submit() {
    if (!guess.trim()) return;
    const ok = norm(guess) === norm(cara.answer);
    const speed = ok && timeLeft > 25;
    const na = attempts + 1;
    setAttempts(na);
    mp.track("guess_submitted", { cara_id: cara.id, category: cara.category, is_correct: ok, attempt_number: na, time_left: timeLeft });
    if (ok) { onResult({ correct: true, attempts: na, speedBonus: speed }); return; }
    if (na >= MAX_ATTEMPTS) { onResult({ correct: false, attempts: na, speedBonus: false }); return; }
    setShaking(true); setGuess("");
    setTimeout(() => setShaking(false), 400);
    ref.current?.focus();
  }

  return (
    <>
      {/* TIMER BAR */}
      <div className="timer-wrap">
        <div className="timer-label">
          <span style={{ fontSize: 10, color: "#8888AA", textTransform: "uppercase", letterSpacing: ".08em" }}>Time to guess</span>
          <span className={`timer-secs${urgent ? " urgent" : ""}`} style={{ color: timerColor }}>
            {urgent ? "⚡ " : ""}{timeLeft}s
          </span>
        </div>
        <div className="timer-track">
          <div className="timer-fill" style={{ width: `${pct}%`, background: timerColor }} />
        </div>
      </div>

      <div className="pbody">
        <div className="meta">
          <div className="cat-tag" style={{ background: `${cc}18`, border: `1px solid ${cc}44`, color: cc }}>● {cara.category}</div>
          <div className="adots">{Array.from({ length: MAX_ATTEMPTS }).map((_, i) => <div key={i} className={`adot${i < attempts ? " used" : ""}`} />)}</div>
        </div>
        <div className="wlbl">{cara.wordCount === 1 ? "1 word" : `${cara.wordCount} words`}</div>
        <div className="wdots">{Array.from({ length: cara.wordCount }).map((_, i) => <div key={i} className="wdot" />)}</div>
        {attempts === MAX_ATTEMPTS - 1 && <div className="hint-box">💡 {cara.hint}</div>}
        <div className="irow">
          <input ref={ref} className={`ginput${shaking ? " shake" : ""}`} placeholder="Type your guess…" value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} autoFocus />
          <button className="gbtn" onClick={submit} disabled={!guess.trim()}>→</button>
        </div>
        <button className="skip" onClick={onSkip}>Skip — I don't know</button>
      </div>
    </>
  );
}

function AnswerScreen({ cara, result, score, streak, totalScore, onContinue, isLast }) {
  const [s1, setS1] = useState(false);
  const [s2, setS2] = useState(false);
  const [s3, setS3] = useState(false);
  const [s4, setS4] = useState(false);

  useEffect(() => {
    setTimeout(() => setS1(true), 300);
    setTimeout(() => setS2(true), 600);
    setTimeout(() => setS3(true), 900);
    setTimeout(() => setS4(true), 1200);
  }, []);

  const nextIdx = CARAS.findIndex(c => c.id === cara.id) + 1;
  const nextDiff = CARAS[nextIdx]?.difficulty;
  const label = isLast ? "SEE MY RESULTS 🏆"
    : result.correct && streak >= 3 ? "KEEP THE STREAK 🔥→"
    : !result.correct ? "REDEMPTION ROUND →"
    : "NEXT CHALLENGE 🔥";
  const tease = isLast ? ""
    : nextDiff === "hard" ? "⚠️ Next one is harder — ready?"
    : nextDiff === "expert" ? "🔥 EXPERT LEVEL — final Cara"
    : "💎 Next Cara loading...";

  return (
    <div className="answer-screen">
      <div className={`rlbl ${result.correct ? "ok" : "no"}`}>{result.correct ? "🎉 CORRECT!" : "😅 The answer was..."}</div>
      <div className="abig">{cara.answer}</div>
      <div className="asub">{result.correct ? (result.speedBonus ? "⚡ Speed bonus! First try lightning fast" : `Got it in ${result.attempts} ${result.attempts === 1 ? "try" : "tries"}`) : result.timedOut ? "⏱ Time's up — the clock got you" : "Most players miss this one"}</div>
      {s1 && <div className="strio" style={{ animation: "countUp .4s ease-out" }}>
        <div className="sbox"><div className="snum" style={{ color: result.correct ? "#4ADE80" : "#FF8A65" }}>+{score}</div><div className="slbl">Points</div></div>
        <div className="sbox"><div className="snum" style={{ color: "#80DEEA" }}>{totalScore}</div><div className="slbl">Total</div></div>
        <div className="sbox"><div className="snum" style={{ color: "#FF6B35" }}>{streak}</div><div className="slbl">🔥 Streak</div></div>
      </div>}
      {s2 && streak >= 3 && <div className="streak-banner"><span style={{ fontSize: 24 }}>🔥</span><div><div style={{ fontWeight: 800, fontSize: 14 }}>{streak} in a row!</div><div style={{ fontSize: 11, opacity: .85 }}>You're on fire — don't stop now</div></div></div>}
      {s3 && <div className="ego-box">{cara.egoLine}</div>}
      {s4 && <><button className="next-big" onClick={onContinue}>{label}</button>{tease && <div className="tease">{tease}</div>}</>}
    </div>
  );
}

function MicroPause({ index, total, streak, correct, onNext }) {
  useEffect(() => { const t = setTimeout(onNext, 1200); return () => clearTimeout(t); }, []);
  return (
    <div className="pause">
      <div className="pause-frac">{correct}/{total}</div>
      <div className="pause-lbl">Caras completed</div>
      {streak >= 2 && <div className="pause-streak"><span>🔥</span><span>Streak: {streak}</span></div>}
      {index === 3 && <div className="level-up">🔥 You're doing better than 80% of players</div>}
      <div style={{ fontSize: 11, color: "#8888AA", marginTop: 10 }}>Next Cara loading...</div>
    </div>
  );
}

function EndScreen({ totalScore, correct, bestStreak, sessionStart, onReplay }) {
  const [copied, setCopied] = useState(false);
  const pct = Math.round(correct / CARAS.length * 100);
  const rank = pct >= 80 ? "TOP 5% 🏆" : pct >= 60 ? "TOP 20% ⭐" : pct >= 40 ? "TOP 50%" : "KEEP GOING 💪";
  const timeSpent = Math.round((Date.now() - sessionStart) / 1000);

  useEffect(() => {
    const prev = loadJSON("crz_best", 0);
    if (totalScore > prev) saveJSON("crz_best", totalScore);
    mp.track("session_complete", {
      total_score: totalScore, correct_count: correct,
      caras_played: CARAS.length, best_streak: bestStreak,
      time_spent_seconds: timeSpent, accuracy_pct: pct
    });
    const sessions = loadJSON("crz_sessions", []);
    sessions.push({ date: new Date().toISOString(), score: totalScore, correct, streak: bestStreak, time: timeSpent });
    saveJSON("crz_sessions", sessions.slice(-100));
  }, []);

  function share() {
    navigator.clipboard.writeText(`💎 CARAIDIZ\nI scored ${totalScore} pts · ${correct}/6 correct\n${rank}\nCan you beat me?\ncaraidiz-pwa.vercel.app`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="end">
      <div className="etrophy">{pct >= 80 ? "🏆" : pct >= 60 ? "⭐" : "💎"}</div>
      <div className="etitle">YOU FINISHED 🔥</div>
      <div className="erank">{rank}</div>
      <div className="egrid">
        <div className="ebox"><div className="en" style={{ color: "#80DEEA" }}>{totalScore}</div><div className="el">Points</div></div>
        <div className="ebox"><div className="en" style={{ color: "#4ADE80" }}>{correct}/6</div><div className="el">Correct</div></div>
        <div className="ebox"><div className="en" style={{ color: "#FF6B35" }}>{bestStreak}</div><div className="el">Best streak</div></div>
        <div className="ebox"><div className="en" style={{ color: "#FACC15" }}>{pct}%</div><div className="el">Accuracy</div></div>
      </div>
      <button className="play-again" onClick={onReplay}>PLAY AGAIN 💎</button>
      <button className="share-btn" onClick={share}>{copied ? "✓ Copied!" : "📋 Share my score"}</button>
      <div className="comeback">💪 Think you can beat your score? Play again.</div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [phase,       setPhase]       = useState("start");
  const [index,       setIndex]       = useState(0);
  const [attempts,    setAttempts]    = useState(0);
  const [result,      setResult]      = useState(null);
  const [score,       setScore]       = useState(0);
  const [total,       setTotal]       = useState(0);
  const [streak,      setStreak]      = useState(0);
  const [best,        setBest]        = useState(0);
  const [correct,     setCorrect]     = useState(0);
  const [sessionStart, setSessionStart] = useState(Date.now());

  useEffect(() => { mp.init(); }, []);

  const cara   = CARAS[index];
  const isLast = index === CARAS.length - 1;

  function start() {
    setSessionStart(Date.now());
    mp.track("session_start", { caras_count: CARAS.length });
    setPhase("play");
  }

  function handleResult(res) {
    const ns  = res.correct ? streak + 1 : 0;
    const pts = res.correct ? scoreFor(res.attempts, ns, res.speedBonus) : 0;
    setStreak(ns); setBest(b => Math.max(b, ns));
    setScore(pts); setTotal(t => t + pts);
    if (res.correct) setCorrect(c => c + 1);
    setResult(res);
    mp.track("video_watched", { cara_id: cara.id, category: cara.category, difficulty: cara.difficulty, correct: res.correct });
    setPhase("answer");
  }

  function handleSkip() {
    setStreak(0); setScore(0);
    setResult({ correct: false, attempts: 0, speedBonus: false });
    mp.track("video_skipped", { cara_id: cara.id });
    setPhase("answer");
  }

  function handleContinue() {
    if (isLast) { setPhase("end"); return; }
    const shouldPause = (index + 1) % 2 === 0;
    if (shouldPause) { setPhase("pause"); }
    else { advanceNext(); }
  }

  function advanceNext() {
    setIndex(i => i + 1);
    setAttempts(0);
    setPhase("play");
  }

  function handleReplay() {
    setIndex(0); setPhase("start"); setAttempts(0);
    setScore(0); setTotal(0); setStreak(0); setCorrect(0);
  }

  const showTop  = phase === "play" || phase === "answer";
  const showProg = phase === "play" || phase === "answer";
  const showVid  = phase === "play" || phase === "answer";

  return (
    <>
      <style>{G}</style>
      <div className="app">
        {phase === "start" && <StartScreen onStart={start} />}

        {phase !== "start" && phase !== "end" && (
          <div className="card">
            {showTop && (
              <div className="topbar">
                <div className="logo-s">CARAI<span>DIZ</span> 💎</div>
                <div className="score-pill">
                  {streak >= 2 && <span className="streak-n">🔥 {streak}</span>}
                  <span>{total} pts</span>
                </div>
              </div>
            )}
            {showProg && (
              <div className="prog">
                <div className="prog-lbl"><span>Cara {index + 1} of {CARAS.length}</span><span>{Math.round(index / CARAS.length * 100)}% done</span></div>
                <div className="prog-track"><div className="prog-fill" style={{ width: `${index / CARAS.length * 100}%` }} /></div>
                <div className="pips">{CARAS.map((_, i) => (
                  <div key={i} className="pip" style={{ background: i < index ? "#80DEEA" : i === index ? "rgba(128,222,234,0.4)" : "rgba(255,255,255,0.08)" }} />
                ))}</div>
              </div>
            )}
            {showVid && <VideoBlock cara={cara} />}
            {showVid && <CommentsBlock caraId={cara.id} revealed={phase==="answer"} />}
            {phase === "play" && <PlayScreen cara={cara} onResult={handleResult} onSkip={handleSkip} attempts={attempts} setAttempts={setAttempts} sessionStart={sessionStart} />}
            {phase === "answer" && result && <AnswerScreen cara={cara} result={result} score={score} streak={streak} totalScore={total} onContinue={handleContinue} isLast={isLast} />}
            {phase === "pause" && <MicroPause index={index + 1} total={CARAS.length} streak={streak} correct={correct} onNext={advanceNext} />}
          </div>
        )}

        {phase === "end" && (
          <div className="card">
            <EndScreen totalScore={total} correct={correct} bestStreak={best} sessionStart={sessionStart} onReplay={handleReplay} />
          </div>
        )}
      </div>
    </>
  );
}
