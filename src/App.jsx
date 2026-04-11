// ============================================================
//  CARAIDIZ 💎 — Final Clean Version
// ============================================================

import { useState, useEffect, useRef } from "react";

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

const CDN = "https://pub-cb42555aad7844b7ac02e5cf231188e1.r2.dev";

const CARAS = [
  { id:1, category:"Song",               answer:"Thriller",            wordCount:1, difficulty:"easy",   hint:"Michael Jackson. Zombies. 1982. 🕺",          videoUrl:`${CDN}/thriller.mp4.mp4`,   firstGuessRate:61, egoLine:"Only 39% of players miss this one" },
  { id:2, category:"Phrase",             answer:"I break up with you", wordCount:5, difficulty:"medium", hint:"What you say at the end of a relationship 💔", videoUrl:`${CDN}/i-break-up.mp4.mp4`, firstGuessRate:43, egoLine:"You're doing better than 70% of players 🔥" },
  { id:3, category:"Brand",              answer:"Revlon",               wordCount:1, difficulty:"medium", hint:"Iconic American beauty brand 💄",              videoUrl:`${CDN}/revlon.mp4.mp4`,     firstGuessRate:68, egoLine:"Only 32% get this on first try" },
  { id:4, category:"TV Show Character", answer:"JR Ewing",             wordCount:2, difficulty:"hard",   hint:"Dallas. The ultimate villain. 🤠",             videoUrl:`${CDN}/jr-ewing.mp4.mp4`,   firstGuessRate:28, egoLine:"Elite level — less than 30% get this 👑" },
  { id:5, category:"Phrase",             answer:"Would you marry me",  wordCount:4, difficulty:"hard",   hint:"The most important question 💍",               videoUrl:`${CDN}/marry-me.mp4.mp4`,   firstGuessRate:55, egoLine:"Top 20% if you got this 🔥" },
  { id:6, category:"Bonus",              answer:"Coldplay Kiss Cam",   wordCount:3, difficulty:"expert", hint:"A stadium moment + a British band 🎸",         videoUrl:`${CDN}/coldplay.mp4.mp4`,   firstGuessRate:22, egoLine:"TOP 5% — only legends get this 💎" },
];

const MAX_ATTEMPTS = 3;
const TIMER_DURATION = 30;

const CAT_COLORS = { Song:"#C084FC", Brand:"#FF6B9D", Phrase:"#FF8A65", "TV Show Character":"#F472B6", Bonus:"#FACC15", Sport:"#4ADE80", Film:"#60A5FA", "TV Show":"#FACC15" };
const CAT_EMOJI  = { Song:"🎵", Brand:"✨", Phrase:"💬", "TV Show Character":"📺", Bonus:"💎", Sport:"🏆", Film:"🎬", "TV Show":"📺" };
const DIFF_COLORS = { easy:"#4ADE80", medium:"#FACC15", hard:"#FF8A65", expert:"#F472B6" };

const norm     = s => s.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
const saveJSON = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const loadJSON = (k,fb) => { try { return JSON.parse(localStorage.getItem(k))??fb; } catch { return fb; } };

function scoreFor(attempt, streak, speed) {
  const base = attempt===1?100:attempt===2?60:30;
  return base + (streak>=3?50:0) + (speed?25:0);
}

// ─── DYNAMIC COMMENTS ─────────────────────────────────────────
const CARA_FLAVOR = {
  1: { correct:"THRILLER omg i screamed 🕺", wrong:"😭 I said beat it wtf" },
  2: { correct:"i break up with you LMAOOO 💔", wrong:"wait is it we need to talk??" },
  3: { correct:"REVLON instantly knew 💅", wrong:"loreal?? maybelline?? 😭" },
  4: { correct:"JR EWING DALLAS ERA 🤠", wrong:"no idea who this is ngl 😅" },
  5: { correct:"WOULD YOU MARRY ME crying rn 💍", wrong:"is it a proposal phrase??" },
  6: { correct:"COLDPLAY KISS CAM iconic 🎸😂", wrong:"coldplay concert?? something with coldplay" },
};

function getComments(caraId, correct, timedOut, speedBonus, timeLeft) {
  const f = CARA_FLAVOR[caraId];
  if (timedOut) return [
    { avatar:"⏱", text:"the clock got you 💀" },
    { avatar:"😅", text:"bro was thinking too hard" },
  ];
  if (correct) {
    const perf = (speedBonus || timeLeft > 20)
      ? [{ avatar:"😳", text:"you're fast omg" }, { avatar:"🔥", text:"1 try?? crazy" }]
      : timeLeft > 10
      ? [{ avatar:"🔥", text:"first try?? insane" }, { avatar:"😭", text:"ok genius relax 😭" }]
      : [{ avatar:"👀", text:"took you long enough 😅" }, { avatar:"😅", text:"still got it though 🔥" }];
    return [...perf.slice(0,1), { avatar:"🧑", text: f?.correct || "got it! 🔥" }];
  }
  return [
    { avatar:"😭", text:"nah this one was easy" },
    { avatar:"😬", text: f?.wrong || "tough one" },
  ];
}

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

  /* TOPBAR */
  .topbar{padding:14px 20px 8px;display:flex;align-items:center;justify-content:space-between}
  .logo-s{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.1em}
  .logo-s span{color:#80DEEA}
  .score-pill{background:rgba(255,255,255,0.08);border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px}
  .streak-n{color:#FF6B35;font-weight:800;font-size:13px}

  /* PROGRESS */
  .prog{padding:0 20px 8px}
  .prog-lbl{display:flex;justify-content:space-between;font-size:10px;color:#8888AA;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase}
  .prog-track{height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:7px}
  .prog-fill{height:100%;background:linear-gradient(90deg,#80DEEA,#C084FC);transition:width .6s ease}
  .pips{display:flex;gap:3px}
  .pip{flex:1;height:4px;border-radius:2px;transition:background .4s}

  /* HOOK */
  .hook-wrap{padding:8px 20px 6px;text-align:center}
  .hook-main{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.06em;color:#fff;line-height:1;text-shadow:0 0 20px rgba(255,255,255,0.3),0 0 40px rgba(128,222,234,0.2);margin-bottom:2px}
  .hook-sub{font-size:11px;color:rgba(255,255,255,0.45);font-weight:600;letter-spacing:.08em}

  /* VIDEO */
  .vid{margin:0 16px;border-radius:18px;overflow:hidden;position:relative;background:#0D0D1A;border:1px solid rgba(255,255,255,0.06)}
  .vid::before{content:'';display:block;padding-top:133%}
  .vid video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block}
  .vid-ph{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#8888AA;font-size:11px}
  .cat-badge-overlay{position:absolute;top:10px;left:10px;z-index:10;animation:catFadeIn .2s ease-out}
  .cat-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(8px);white-space:nowrap;opacity:0.9}
  .mute-btn{position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;backdrop-filter:blur(4px);z-index:10}
  @keyframes catFadeIn{from{opacity:0}to{opacity:0.9}}

  /* TIMER */
  .timer-wrap{padding:6px 16px 2px}
  .timer-lbl{display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px}
  .timer-time{font-weight:800;font-size:12px;transition:color .3s}
  .timer-time.urgent{animation:timerPulse .5s ease-in-out infinite}
  .timer-track{height:4px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden}
  .timer-fill{height:100%;border-radius:3px;transition:width 1s linear,background .5s}
  @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:.4}}

  /* PLAY BODY */
  .pbody{padding:10px 16px 14px}
  .meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
  .cat-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  .adots{display:flex;gap:4px}
  .adot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.12);transition:background .2s}
  .adot.used{background:#FF8A65}
  .wlbl{font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
  .wdots{display:flex;gap:4px;margin-bottom:10px}
  .wdot{width:10px;height:10px;border-radius:50%;border:2px solid #80DEEA}
  .hint-box{background:rgba(255,138,101,0.08);border:1px solid rgba(255,138,101,0.2);border-radius:10px;padding:7px 12px;font-size:12px;color:#FF8A65;margin-bottom:9px}
  .irow{display:flex;gap:7px;margin-bottom:6px}
  .ginput{flex:1;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px;color:#fff;font-size:15px;font-family:inherit;outline:none;caret-color:#80DEEA;transition:border-color .2s}
  .ginput:focus{border-color:#80DEEA}
  .ginput.shake{animation:shake .3s ease;border-color:#FF8A65}
  .gbtn{background:#80DEEA;color:#0A0A0F;border:none;border-radius:12px;width:48px;font-size:18px;font-weight:900;cursor:pointer;transition:transform .1s}
  .gbtn:active{transform:scale(.95)}
  .gbtn:disabled{opacity:.3;cursor:default}
  .skip{width:100%;background:transparent;border:1px solid rgba(255,255,255,0.09);border-radius:12px;padding:9px;color:#8888AA;font-size:12px;font-family:inherit;cursor:pointer}

  /* ANSWER SCREEN */
  .answer-screen{padding:16px 16px 14px}
  .abig{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.06em;text-align:center;line-height:1;margin-bottom:2px;animation:popIn .3s ease-out;color:#fff;text-shadow:0 0 20px rgba(255,255,255,0.15)}
  .asub{text-align:center;font-size:11px;color:#8888AA;margin-bottom:10px}
  .strio{display:flex;gap:8px;margin-bottom:10px}
  .sbox{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 6px;text-align:center}
  .snum{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.04em;line-height:1;margin-bottom:1px}
  .slbl{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.06em}
  .streak-banner{background:linear-gradient(135deg,#FF4500,#FF8A65);border-radius:12px;padding:8px 14px;display:flex;align-items:center;gap:10px;margin-bottom:10px;animation:slideDown .3s ease-out}
  .ego-box{background:rgba(128,222,234,0.07);border:1px solid rgba(128,222,234,0.18);border-radius:10px;padding:8px 14px;text-align:center;font-size:12px;color:#80DEEA;margin-bottom:10px}
  .next-big{width:100%;background:#80DEEA;color:#0A0A0F;border:none;border-radius:14px;padding:14px;font-family:'Bebas Neue',sans-serif;font-size:19px;letter-spacing:.06em;cursor:pointer;animation:pulseCTA 1.5s ease-in-out 1s infinite}
  .next-big:active{transform:scale(.97)}
  .tease{text-align:center;font-size:11px;color:#8888AA;margin-top:6px}

  /* COMMENTS */
  .comments-section{padding:6px 16px 4px}
  .comments-label{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px;display:flex;align-items:center;gap:5px}
  .comments-revealed .cmt-row{animation:cmtSlide .25s ease-out both}
  @keyframes cmtSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .cmt-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:7px}
  .cmt-avatar{width:27px;height:27px;border-radius:50%;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px}
  .cmt-bubble{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-radius:0 12px 12px 12px;padding:6px 11px;flex:1}
  .cmt-text{font-size:12px;font-weight:500;color:rgba(255,255,255,0.82);line-height:1.4}
  .guess-to-reveal{text-align:center;font-size:11px;color:rgba(128,222,234,0.7);font-weight:600;letter-spacing:.04em;padding:2px 0 6px}

  /* PAUSE */
  .pause{padding:32px 20px;text-align:center}
  .pause-frac{font-family:'Bebas Neue',sans-serif;font-size:72px;letter-spacing:.04em;line-height:1;background:linear-gradient(135deg,#80DEEA,#C084FC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px}
  .pause-lbl{font-size:11px;color:#8888AA;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
  .pause-streak{display:inline-flex;align-items:center;gap:8px;background:rgba(255,107,53,0.12);border:1px solid rgba(255,107,53,0.3);border-radius:20px;padding:7px 18px;font-size:14px;font-weight:800;color:#FF6B35;margin-bottom:14px}
  .level-up{background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.3);border-radius:12px;padding:11px 16px;font-size:13px;font-weight:700;color:#FACC15}

  /* END */
  .end{padding:24px 18px 22px;text-align:center}
  .etrophy{font-size:52px;margin-bottom:6px;animation:float 3s ease-in-out infinite}
  .etitle{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.08em;margin-bottom:4px}
  .erank{display:inline-block;background:linear-gradient(135deg,#FACC15,#FF8A65);color:#0A0A0F;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:.08em;margin-bottom:16px}
  .egrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
  .ebox{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:13px 8px}
  .en{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.04em;line-height:1;margin-bottom:2px}
  .el{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.07em}

  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  @keyframes popIn{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes slideDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pulseCTA{0%,100%{box-shadow:0 0 0 0 rgba(128,222,234,0.4)}50%{box-shadow:0 0 0 10px rgba(128,222,234,0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
`;

// ─── VIDEO BLOCK ──────────────────────────────────────────────
function VideoBlock({ cara }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);
  const cc    = CAT_COLORS[cara.category] || "#80DEEA";
  const emoji = CAT_EMOJI[cara.category] || "💎";
  const words = cara.wordCount === 1 ? "1 WORD" : `${cara.wordCount} WORDS`;

  useEffect(() => {
    setMuted(true);
    if (videoRef.current) { videoRef.current.muted = true; videoRef.current.play().catch(() => {}); }
  }, [cara.id]);

  function toggleMute() {
    const n = !muted; setMuted(n);
    if (videoRef.current) videoRef.current.muted = n;
  }

  return (
    <div className="vid">
      {cara.videoUrl
        ? <video ref={videoRef} src={cara.videoUrl} autoPlay muted loop playsInline />
        : <div className="vid-ph"><span style={{fontSize:40,opacity:.12}}>🎬</span><span>Video loading...</span></div>
      }
      <div className="cat-badge-overlay">
        <div className="cat-pill" style={{ background:"rgba(0,0,0,0.55)", border:`1px solid ${cc}44`, color:cc }}>
          <span style={{fontSize:11}}>{emoji}</span>
          <span>{cara.category.toUpperCase()} · {words}</span>
        </div>
      </div>
      <button className="mute-btn" onClick={toggleMute}>{muted ? "🔇" : "🔊"}</button>
    </div>
  );
}

// ─── COMMENTS BLOCK ───────────────────────────────────────────
function CommentsBlock({ caraId, revealed, result }) {
  const comments = revealed && result
    ? getComments(caraId, result.correct, result.timedOut, result.speedBonus, result.timeLeft || 0)
    : [];

  if (!revealed) {
    return (
      <div className="comments-section">
        {[70,50,85].map((w,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
            <div style={{width:27,height:27,borderRadius:"50%",background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{height:11,width:`${w}%`,borderRadius:6,background:"rgba(255,255,255,0.06)",filter:"blur(3px)"}}/>
          </div>
        ))}
        <div className="guess-to-reveal">🔒 Guess to reveal what others said</div>
      </div>
    );
  }

  return (
    <div className="comments-section comments-revealed">
      <div className="comments-label"><span>💬</span><span>What others said</span></div>
      {comments.map((c,i) => (
        <div key={i} className="cmt-row" style={{animationDelay:`${i*80}ms`}}>
          <div className="cmt-avatar">{c.avatar}</div>
          <div className="cmt-bubble"><div className="cmt-text">{c.text}</div></div>
        </div>
      ))}
    </div>
  );
}

// ─── START SCREEN ─────────────────────────────────────────────
function StartScreen({ onStart }) {
  const best = loadJSON("crz_best", 0);
  return (
    <div className="card">
      <div className="start-bg">
        <div className="start-glow"/>
        <div className="start-gem">💎</div>
        <div className="start-logo">CARAIDIZ</div>
        <div className="start-tag">watching becomes playing</div>
        <div className="start-badge">💎 6 Caras to beat</div>
        <div className="start-count" style={{marginTop:6}}>Can you beat them all?</div>
        {best > 0 && <div style={{marginTop:8,fontSize:11,color:"rgba(128,222,234,0.6)"}}>Your best: {best} pts</div>}
      </div>
      <div className="start-body">
        <button className="start-btn" onClick={onStart}>START PLAYING →</button>
        <div style={{textAlign:"center",fontSize:11,color:"#8888AA",marginTop:10}}>No signup · Free · ~3 min to complete</div>
      </div>
    </div>
  );
}

// ─── PLAY SCREEN ──────────────────────────────────────────────
function PlayScreen({ cara, onResult, onSkip, attempts, setAttempts }) {
  const [guess,    setGuess]    = useState("");
  const [shaking,  setShaking]  = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const ref = useRef(null);
  const cc  = CAT_COLORS[cara.category] || "#80DEEA";

  useEffect(() => { setGuess(""); setTimeLeft(TIMER_DURATION); setTimeout(() => ref.current?.focus(), 200); }, [cara.id]);

  useEffect(() => {
    if (timeLeft <= 0) { mp.track("timer_expired",{cara_id:cara.id}); onResult({correct:false,attempts:attempts||1,speedBonus:false,timedOut:true,timeLeft:0,lastGuess:null}); return; }
    const t = setTimeout(() => setTimeLeft(s => s-1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const pct     = (timeLeft/TIMER_DURATION)*100;
  const tColor  = timeLeft>15?"#80DEEA":timeLeft>8?"#FACC15":"#FF8A65";
  const urgent  = timeLeft<=8;

  function submit() {
    if (!guess.trim()) return;
    const ok    = norm(guess)===norm(cara.answer);
    const speed = ok && timeLeft > 20;
    const na    = attempts+1;
    setAttempts(na);
    mp.track("guess_submitted",{cara_id:cara.id,category:cara.category,is_correct:ok,attempt_number:na,time_left:timeLeft});
    if (ok)           { onResult({correct:true,  attempts:na,speedBonus:speed,timeLeft,lastGuess:guess.trim()}); return; }
    if (na>=MAX_ATTEMPTS) { onResult({correct:false,attempts:na,speedBonus:false,timeLeft,lastGuess:guess.trim()}); return; }
    setShaking(true); setGuess("");
    setTimeout(()=>setShaking(false),400);
    ref.current?.focus();
  }

  return (
    <>
      <div className="timer-wrap">
        <div className="timer-lbl">
          <span style={{fontSize:10,color:"#8888AA",textTransform:"uppercase",letterSpacing:".08em"}}>Time to guess</span>
          <span className={`timer-time${urgent?" urgent":""}`} style={{color:tColor}}>{urgent?"⚡ ":""}{timeLeft}s</span>
        </div>
        <div className="timer-track"><div className="timer-fill" style={{width:`${pct}%`,background:tColor}}/></div>
      </div>
      <div className="pbody">
        <div className="meta">
          <div className="cat-tag" style={{background:`${cc}18`,border:`1px solid ${cc}44`,color:cc}}>● {cara.category}</div>
          <div className="adots">{Array.from({length:MAX_ATTEMPTS}).map((_,i)=><div key={i} className={`adot${i<attempts?" used":""}`}/>)}</div>
        </div>
        <div className="wlbl">{cara.wordCount===1?"1 word":`${cara.wordCount} words`}</div>
        <div className="wdots">{Array.from({length:cara.wordCount}).map((_,i)=><div key={i} className="wdot"/>)}</div>
        {attempts===MAX_ATTEMPTS-1&&<div className="hint-box">💡 {cara.hint}</div>}
        <div className="irow">
          <input ref={ref} className={`ginput${shaking?" shake":""}`} placeholder="Type your guess…" value={guess} onChange={e=>setGuess(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoFocus/>
          <button className="gbtn" onClick={submit} disabled={!guess.trim()}>→</button>
        </div>
        <button className="skip" onClick={onSkip}>Skip — I don't know</button>
      </div>
    </>
  );
}

// ─── ANSWER SCREEN ────────────────────────────────────────────
function AnswerScreen({ cara, result, score, streak, totalScore, onContinue, isLast }) {
  const [s1,setS1]=useState(false);
  const [s2,setS2]=useState(false);
  const [s3,setS3]=useState(false);
  const [s4,setS4]=useState(false);
  useEffect(()=>{
    setTimeout(()=>setS1(true),300);
    setTimeout(()=>setS2(true),600);
    setTimeout(()=>setS3(true),900);
    setTimeout(()=>setS4(true),1200);
  },[]);

  const nextIdx  = CARAS.findIndex(c=>c.id===cara.id)+1;
  const nextDiff = CARAS[nextIdx]?.difficulty;
  const label    = isLast?"SEE MY RESULTS 🏆":result.correct&&streak>=3?"KEEP THE STREAK 🔥→":!result.correct?"REDEMPTION ROUND →":"NEXT CHALLENGE 🔥";
  const tease    = isLast?"":nextDiff==="hard"?"⚠️ Next one is harder":nextDiff==="expert"?"🔥 EXPERT LEVEL — final Cara":"💎 Next Cara loading...";

  return (
    <div className="answer-screen">

      {/* USER ANSWER */}
      {result.lastGuess && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"7px 12px",background:result.correct?"rgba(74,222,128,0.08)":"rgba(255,138,101,0.08)",border:`1px solid ${result.correct?"rgba(74,222,128,0.25)":"rgba(255,138,101,0.25)"}`,borderRadius:10}}>
          <span style={{fontSize:10,fontWeight:800,color:result.correct?"#4ADE80":"#FF8A65",letterSpacing:".1em",textTransform:"uppercase",flexShrink:0}}>YOU:</span>
          <span style={{fontSize:14,fontWeight:700,color:result.correct?"#4ADE80":"#FF8A65"}}>{result.lastGuess}</span>
          <span style={{marginLeft:"auto",fontSize:16}}>{result.correct?"✅":"❌"}</span>
        </div>
      )}

      {/* CORRECT ANSWER */}
      <div style={{textAlign:"center",marginBottom:4}}>
        <div style={{fontSize:10,color:"#8888AA",textTransform:"uppercase",letterSpacing:".1em",marginBottom:2}}>
          {result.correct?"🎉 Correct!":result.timedOut?"⏱ Time's up":"The answer was"}
        </div>
        <div className="abig">{cara.answer}</div>
      </div>

      <div className="asub">{result.correct?(result.speedBonus?"⚡ Speed bonus! Lightning fast":`Got it in ${result.attempts} ${result.attempts===1?"try":"tries"}`):result.timedOut?"The clock got you this time":"Most players miss this one"}</div>

      {s1&&<div className="strio" style={{animation:"countUp .4s ease-out"}}>
        <div className="sbox"><div className="snum" style={{color:result.correct?"#4ADE80":"#FF8A65"}}>+{score}</div><div className="slbl">Points</div></div>
        <div className="sbox"><div className="snum" style={{color:"#80DEEA"}}>{totalScore}</div><div className="slbl">Total</div></div>
        <div className="sbox"><div className="snum" style={{color:"#FF6B35"}}>{streak}</div><div className="slbl">🔥 Streak</div></div>
      </div>}

      {s2&&streak>=3&&<div className="streak-banner"><span style={{fontSize:22}}>🔥</span><div><div style={{fontWeight:800,fontSize:13}}>{streak} in a row!</div><div style={{fontSize:11,opacity:.85}}>Don't stop now</div></div></div>}
      {s3&&<div className="ego-box">{cara.egoLine}</div>}
      {s4&&<><button className="next-big" onClick={onContinue}>{label}</button>{tease&&<div className="tease">{tease}</div>}</>}
    </div>
  );
}

// ─── MICRO PAUSE ──────────────────────────────────────────────
function MicroPause({ index, total, streak, correct, onNext }) {
  useEffect(()=>{ const t=setTimeout(onNext,1200); return ()=>clearTimeout(t); },[]);
  return (
    <div className="pause">
      <div className="pause-frac">{correct}/{total}</div>
      <div className="pause-lbl">Caras completed</div>
      {streak>=2&&<div className="pause-streak"><span>🔥</span><span>Streak: {streak}</span></div>}
      {index===3&&<div className="level-up">🔥 You're doing better than 80% of players</div>}
      <div style={{fontSize:11,color:"#8888AA",marginTop:10}}>Next Cara loading...</div>
    </div>
  );
}

// ─── END SCREEN ───────────────────────────────────────────────
function EndScreen({ totalScore, correct, bestStreak, sessionStart, onReplay }) {
  const [copied,   setCopied]   = useState(false);
  const [isNewBest,setIsNewBest]= useState(false);
  const pct      = Math.round(correct/CARAS.length*100);
  const timeSpent= Math.round((Date.now()-sessionStart)/1000);
  const egoLine  = pct===100?"Less than 5% of players get a perfect score.":pct>=80?"You're better than 80% of players.":pct>=60?"Most players don't make it this far.":bestStreak>=3?`That ${bestStreak}-streak though 🔥`:"Each play makes you sharper.";

  useEffect(()=>{
    const prev=loadJSON("crz_best",0);
    if(totalScore>prev){saveJSON("crz_best",totalScore);setIsNewBest(true);}
    mp.track("session_complete",{total_score:totalScore,correct_count:correct,caras_played:CARAS.length,best_streak:bestStreak,time_spent_seconds:timeSpent,accuracy_pct:pct});
    const sessions=loadJSON("crz_sessions",[]);
    sessions.push({date:new Date().toISOString(),score:totalScore,correct,streak:bestStreak,time:timeSpent});
    saveJSON("crz_sessions",sessions.slice(-100));
  },[]);

  function share(){
    navigator.clipboard.writeText(`💎 CARAIDIZ\n\nI got ${correct}/6 — can you beat me?\n${totalScore} pts · 🔥${bestStreak} streak\n\ncaraidiz-pwa.vercel.app`).then(()=>{setCopied(true);mp.track("score_shared",{total_score:totalScore});setTimeout(()=>setCopied(false),2500);});
  }

  return (
    <div className="end">
      <div className="etrophy">{pct===100?"👑":pct>=80?"🏆":pct>=60?"⭐":"💎"}</div>
      <div className="etitle">YOU FINISHED 🔥</div>
      <div className="erank">{pct===100?"PERFECT SCORE 👑":pct>=80?"TOP PLAYER 🏆":pct>=60?"WELL PLAYED ⭐":"KEEP GOING 💪"}</div>

      {isNewBest&&<div style={{background:"rgba(250,204,21,0.1)",border:"1px solid rgba(250,204,21,0.3)",borderRadius:12,padding:"9px 14px",textAlign:"center",fontSize:13,color:"#FACC15",fontWeight:800,marginBottom:12,animation:"slideDown .4s ease-out"}}>🏆 New personal best!</div>}

      {/* HERO NUMBERS */}
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:1,background:"rgba(128,222,234,0.08)",border:"1px solid rgba(128,222,234,0.2)",borderRadius:16,padding:"16px 8px",textAlign:"center"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,color:"#80DEEA",lineHeight:1,marginBottom:3}}>{totalScore}</div>
          <div style={{fontSize:9,color:"#8888AA",textTransform:"uppercase",letterSpacing:".1em"}}>pts</div>
        </div>
        <div style={{flex:1,background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:16,padding:"16px 8px",textAlign:"center"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,color:"#4ADE80",lineHeight:1,marginBottom:3}}>{correct}/6</div>
          <div style={{fontSize:9,color:"#8888AA",textTransform:"uppercase",letterSpacing:".1em"}}>correct</div>
        </div>
        <div style={{flex:1,background:"rgba(255,107,53,0.08)",border:"1px solid rgba(255,107,53,0.2)",borderRadius:16,padding:"16px 8px",textAlign:"center"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,color:"#FF6B35",lineHeight:1,marginBottom:3}}>🔥{bestStreak}</div>
          <div style={{fontSize:9,color:"#8888AA",textTransform:"uppercase",letterSpacing:".1em"}}>streak</div>
        </div>
      </div>

      <div style={{fontSize:13,color:"#8888AA",textAlign:"center",marginBottom:14}}>{egoLine}</div>

      {/* ONLY 5% headline */}
      <div style={{textAlign:"center",fontSize:12,fontWeight:800,color:"#80DEEA",letterSpacing:".1em",textTransform:"uppercase",marginBottom:10,textShadow:"0 0 20px rgba(128,222,234,0.4)"}}>ONLY 5% FINISH THIS 💎</div>

      <div style={{textAlign:"center",fontSize:14,fontWeight:700,color:"#fff",marginBottom:10}}>I got {correct}/6 — can you beat me?</div>

      {/* PRIMARY CTA */}
      <button style={{width:"100%",background:"linear-gradient(135deg,#FF6B35,#FF8A65)",color:"#fff",border:"none",borderRadius:16,padding:"17px 16px",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:".08em",cursor:"pointer",marginBottom:7,display:"block",textAlign:"center",boxShadow:"0 8px 32px rgba(255,107,53,0.45), 0 0 0 1px rgba(255,138,101,0.2)",animation:"pulseCTA 1.8s ease-in-out infinite"}} onClick={share}>
        {copied?"✓ LINK COPIED! 🔥":"🔥 CHALLENGE A FRIEND"}
      </button>
      <div style={{textAlign:"center",fontSize:12,color:"#8888AA",marginBottom:16}}>They won't beat your score 😏</div>

      {/* SECONDARY */}
      <button style={{width:"100%",background:"transparent",border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:14,padding:13,color:"rgba(255,255,255,0.7)",fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:".06em",cursor:"pointer",marginBottom:8,display:"block",textAlign:"center"}} onClick={onReplay}>🔁 PLAY AGAIN</button>
      <div style={{textAlign:"center",fontSize:11,color:"#8888AA"}}>Most players don't improve their score 😈</div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [phase,        setPhase]        = useState("start");
  const [index,        setIndex]        = useState(0);
  const [attempts,     setAttempts]     = useState(0);
  const [result,       setResult]       = useState(null);
  const [score,        setScore]        = useState(0);
  const [total,        setTotal]        = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [best,         setBest]         = useState(0);
  const [correct,      setCorrect]      = useState(0);
  const [sessionStart, setSessionStart] = useState(Date.now());

  useEffect(()=>{ mp.init(); },[]);

  const cara   = CARAS[index];
  const isLast = index===CARAS.length-1;

  function start() { setSessionStart(Date.now()); mp.track("session_start",{caras_count:CARAS.length}); setPhase("play"); }

  function handleResult(res) {
    const ns  = res.correct ? streak+1 : 0;
    const pts = res.correct ? scoreFor(res.attempts,ns,res.speedBonus) : 0;
    setStreak(ns); setBest(b=>Math.max(b,ns));
    setScore(pts); setTotal(t=>t+pts);
    if (res.correct) setCorrect(c=>c+1);
    setResult(res);
    mp.track("video_watched",{cara_id:cara.id,category:cara.category,difficulty:cara.difficulty,correct:res.correct});
    setPhase("answer");
  }

  function handleSkip() {
    setStreak(0); setScore(0);
    setResult({correct:false,attempts:0,speedBonus:false,lastGuess:null,timeLeft:TIMER_DURATION});
    mp.track("video_skipped",{cara_id:cara.id});
    setPhase("answer");
  }

  function handleContinue() {
    if (isLast) { setPhase("end"); return; }
    if ((index+1)%2===0) { setPhase("pause"); }
    else { advanceNext(); }
  }

  function advanceNext() { setIndex(i=>i+1); setAttempts(0); setPhase("play"); }

  function handleReplay() { setIndex(0); setPhase("start"); setAttempts(0); setScore(0); setTotal(0); setStreak(0); setCorrect(0); }

  const showTop  = phase==="play"||phase==="answer";
  const showProg = phase==="play"||phase==="answer";
  const showVid  = phase==="play"||phase==="answer";

  return (
    <>
      <style>{G}</style>
      <div className="app">
        {phase==="start"&&<StartScreen onStart={start}/>}

        {phase!=="start"&&phase!=="end"&&(
          <div className="card">
            {showTop&&(
              <div className="topbar">
                <div className="logo-s">CARAI<span>DIZ</span> 💎</div>
                <div className="score-pill">
                  {streak>=2&&<span className="streak-n">🔥 {streak}</span>}
                  <span>{total} pts</span>
                </div>
              </div>
            )}
            {showProg&&(
              <div className="prog">
                <div className="prog-lbl"><span>Cara {index+1} of {CARAS.length}</span><span>{Math.round(index/CARAS.length*100)}% done</span></div>
                <div className="prog-track"><div className="prog-fill" style={{width:`${index/CARAS.length*100}%`}}/></div>
                <div className="pips">{CARAS.map((_,i)=><div key={i} className="pip" style={{background:i<index?"#80DEEA":i===index?"rgba(128,222,234,0.4)":"rgba(255,255,255,0.08)"}}/>)}</div>
              </div>
            )}
            {showVid&&(
              <>
                <div className="hook-wrap">
                  <div className="hook-main">ONLY {cara.firstGuessRate}% GET THIS 👀</div>
                  <div className="hook-sub">Can you?</div>
                </div>
                <VideoBlock cara={cara}/>
                <CommentsBlock caraId={cara.id} revealed={phase==="answer"} result={result}/>
              </>
            )}
            {phase==="play"&&<PlayScreen cara={cara} onResult={handleResult} onSkip={handleSkip} attempts={attempts} setAttempts={setAttempts}/>}
            {phase==="answer"&&result&&<AnswerScreen cara={cara} result={result} score={score} streak={streak} totalScore={total} onContinue={handleContinue} isLast={isLast}/>}
            {phase==="pause"&&<MicroPause index={index+1} total={CARAS.length} streak={streak} correct={correct} onNext={advanceNext}/>}
          </div>
        )}

        {phase==="end"&&(
          <div className="card">
            <EndScreen totalScore={total} correct={correct} bestStreak={best} sessionStart={sessionStart} onReplay={handleReplay}/>
          </div>
        )}
      </div>
    </>
  );
}
