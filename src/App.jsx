// ============================================================
//  CARAIDIZ 💎 — Full Social Loop v5
//  Watch → Guess → Reveal → React → Continue
// ============================================================

import { useState, useEffect, useRef } from "react";

// ─── MIXPANEL ─────────────────────────────────────────────────
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
    window.mixpanel.track(event, { ...props, app: "caraidiz", ts: new Date().toISOString() });
  }
};

// ─── HELPERS ──────────────────────────────────────────────────
const CDN      = "https://pub-cb42555aad7844b7ac02e5cf231188e1.r2.dev";
const norm     = s => s.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
const saveJSON = (k,v) => localStorage.setItem(k,JSON.stringify(v));
const loadJSON = (k,fb) => { try { return JSON.parse(localStorage.getItem(k))??fb; } catch { return fb; } };

// ─── AUDIO + HAPTICS ──────────────────────────────────────────
const SFX = {
  _ctx: null, _on: false,
  init()  { if (this._ctx) return; try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} },
  get on(){ return this._on; },
  enable(){ this.init(); this._on = true;  saveJSON("crz_sfx", true); },
  disable(){ this._on = false; saveJSON("crz_sfx", false); },
  load()  { this._on = loadJSON("crz_sfx", false); },
  _tone(freq, type, dur, vol) {
    if (!this._ctx) return;
    try {
      const o = this._ctx.createOscillator(), g = this._ctx.createGain();
      o.connect(g); g.connect(this._ctx.destination);
      o.type = type; o.frequency.setValueAtTime(freq, this._ctx.currentTime);
      g.gain.setValueAtTime(vol, this._ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + dur);
      o.start(); o.stop(this._ctx.currentTime + dur);
    } catch(e) {}
  },
  _vibe(ms) { try { navigator.vibrate?.(ms); } catch(e) {} },
  tap()     { this._tone(800, "sine",     0.06, 0.08); this._vibe(8);   },
  correct() { [523,659,784].forEach((f,i)=>setTimeout(()=>this._tone(f,"sine",0.18,0.12),i*80)); this._vibe(60); },
  wrong()   { this._tone(200, "square",   0.12, 0.07); this._vibe(30);  },
  tick()    { this._tone(440, "sine",     0.05, 0.05); },
  timeUp()  { this._tone(180, "sawtooth", 0.3,  0.08); this._vibe(100); },
  del()     { this._tone(300, "sine",     0.07, 0.05); },
};

// ─── SHUFFLE ──────────────────────────────────────────────────
const DISTRACT = "BCDFGHJKLMNPQRSTVWXYZ";
function fy(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function hasRun(tiles, answer, minRun=3) {
  const clean=answer.toUpperCase().replace(/[^A-Z]/g,""), letters=tiles.map(t=>t.letter);
  if(clean.length<minRun) return false;
  for(let s=0;s<=clean.length-minRun;s++){
    const run=clean.slice(s,s+minRun).split(""); let ri=0;
    for(let i=0;i<letters.length&&ri<run.length;i++) if(letters[i]===run[ri]) ri++;
    if(ri===run.length) return true;
  }
  return false;
}
function buildTiles(answer) {
  const clean=answer.toUpperCase().replace(/[^A-Z ]/g,"");
  const aLetters=clean.replace(/ /g,"").split("");
  const uniq=[...new Set(aLetters)];
  const pool=DISTRACT.split("").filter(c=>!uniq.includes(c));
  const dist=fy(pool).slice(0,5);
  const all=[...aLetters.map(l=>({letter:l,isAnswer:true})),...dist.map(l=>({letter:l,isAnswer:false}))];
  const minRun=aLetters.length>10?4:3;
  let tiles; let att=0;
  do { tiles=fy(all).map((t,i)=>({...t,id:i,used:false})); att++; } while(att<50&&hasRun(tiles,answer,minRun));
  return tiles;
}

// ─── DATA ─────────────────────────────────────────────────────
const CARAS = [
  { id:1, category:"Song",               answer:"Thriller",            wordCount:1, difficulty:"easy",   hint:"Michael Jackson. Zombies. 🕺",          videoUrl:`${CDN}/thriller.mp4.mp4`,   firstGuessRate:61, egoLine:"Only 39% get this on first try" },
  { id:2, category:"Phrase",             answer:"I break up with you", wordCount:5, difficulty:"medium", hint:"End of a relationship 💔",               videoUrl:`${CDN}/i-break-up.mp4.mp4`, firstGuessRate:43, egoLine:"You're doing better than 70% 🔥" },
  { id:3, category:"Brand",              answer:"Revlon",              wordCount:1, difficulty:"medium", hint:"Iconic American beauty brand 💄",         videoUrl:`${CDN}/revlon.mp4.mp4`,     firstGuessRate:68, egoLine:"Only 32% get this first try" },
  { id:4, category:"TV Show Character", answer:"JR Ewing",            wordCount:2, difficulty:"hard",   hint:"Dallas. The ultimate villain. 🤠",        videoUrl:`${CDN}/jr-ewing.mp4.mp4`,   firstGuessRate:28, egoLine:"Less than 30% get this 👑" },
  { id:5, category:"Phrase",             answer:"Would you marry me",  wordCount:4, difficulty:"hard",   hint:"The most important question 💍",          videoUrl:`${CDN}/marry-me.mp4.mp4`,   firstGuessRate:55, egoLine:"Top 20% if you got this 🔥" },
  { id:6, category:"Bonus",              answer:"Coldplay Kiss Cam",   wordCount:3, difficulty:"expert", hint:"A stadium moment + British band 🎸",      videoUrl:`${CDN}/coldplay.mp4.mp4`,   firstGuessRate:22, egoLine:"TOP 5% — only legends get this 💎" },
];

const MAX_ATTEMPTS   = 3;
const TIMER_DURATION = 30;

const CAT_COLORS = { Song:"#C084FC", Brand:"#FF6B9D", Phrase:"#FF8A65", "TV Show Character":"#F472B6", Bonus:"#FACC15", Sport:"#4ADE80", Film:"#60A5FA", "TV Show":"#FACC15" };
const CAT_EMOJI  = { Song:"🎵", Brand:"✨", Phrase:"💬", "TV Show Character":"📺", Bonus:"💎", Sport:"🏆", Film:"🎬", "TV Show":"📺" };
const DIFF_COLORS= { easy:"#4ADE80", medium:"#FACC15", hard:"#FF8A65", expert:"#F472B6" };

// ─── DYNAMIC COMMENTS ─────────────────────────────────────────
const CARA_FLAVOR = {
  1:{correct:"THRILLER omg i screamed 🕺",       wrong:"😭 I said beat it wtf"},
  2:{correct:"i break up with you LMAOOO 💔",    wrong:"wait is it we need to talk??"},
  3:{correct:"REVLON instantly knew 💅",          wrong:"loreal?? maybelline?? 😭"},
  4:{correct:"JR EWING DALLAS ERA 🤠",            wrong:"no idea who this is ngl 😅"},
  5:{correct:"WOULD YOU MARRY ME crying rn 💍",  wrong:"is it a proposal phrase??"},
  6:{correct:"COLDPLAY KISS CAM iconic 🎸😂",    wrong:"coldplay concert?? something with coldplay"},
};
const TEASE_COMMENTS = [
  "nah this one is hard…",
  "I got it instantly",
  "ok I give up lmao",
  "wait wait wait…",
  "this is so obvious omg",
];

function getComments(caraId, correct, timedOut, speedBonus, timeLeft) {
  const f = CARA_FLAVOR[caraId];
  if (timedOut) return [
    {avatar:"⏱", text:"the clock got you 💀", type:"wrong"},
    {avatar:"😅", text:"bro was thinking too hard", type:"wrong"},
  ];
  if (correct) {
    const perf = (speedBonus||timeLeft>20)
      ? [{avatar:"😳",text:"you're fast omg",type:"correct"},{avatar:"🔥",text:"1 try?? crazy",type:"correct"}]
      : timeLeft>10
      ? [{avatar:"🔥",text:"first try?? insane",type:"correct"},{avatar:"😭",text:"ok genius relax 😭",type:"correct"}]
      : [{avatar:"👀",text:"took you long enough 😅",type:"neutral"},{avatar:"😅",text:"still got it though 🔥",type:"correct"}];
    return [...perf.slice(0,1), {avatar:"🧑",text:f?.correct||"got it! 🔥",type:"correct"}];
  }
  return [
    {avatar:"😭",text:"nah this one was easy",type:"wrong"},
    {avatar:"😬",text:f?.wrong||"tough one",type:"wrong"},
  ];
}

function scoreFor(attempt, streak, speed) {
  return (attempt===1?100:attempt===2?60:30)+(streak>=3?50:0)+(speed?25:0);
}

// ─── STYLES ───────────────────────────────────────────────────
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#0A0A0F;font-family:'DM Sans',sans-serif;color:#fff;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
  input::placeholder{color:#8888AA}

  /* ── APP SHELL ── */
  .app{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 0 32px;background:#0A0A0F}
  .card{width:100%;max-width:420px;background:#121220;display:flex;flex-direction:column;min-height:100svh;position:relative;overflow:hidden}

  /* ── START ── */
  .start-card{background:#1A1A2E;border-radius:28px;width:calc(100% - 32px);max-width:420px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);box-shadow:0 32px 80px rgba(0,0,0,0.7);animation:fadeUp .3s ease-out;margin:16px}
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

  /* ── TOP BAR ── */
  .topbar{padding:12px 16px 6px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .logo-s{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:.1em}
  .logo-s span{color:#80DEEA}
  .score-pill{background:rgba(255,255,255,0.08);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px}
  .streak-n{color:#FF6B35;font-weight:800;font-size:13px}

  /* ── PROGRESS ── */
  .prog{padding:0 16px 6px;flex-shrink:0}
  .prog-lbl{display:flex;justify-content:space-between;font-size:10px;color:#8888AA;margin-bottom:4px;letter-spacing:.06em;text-transform:uppercase}
  .prog-track{height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:6px}
  .prog-fill{height:100%;background:linear-gradient(90deg,#80DEEA,#C084FC);transition:width .6s ease}
  .pips{display:flex;gap:3px}
  .pip{flex:1;height:4px;border-radius:2px;transition:background .4s}

  /* ── VIDEO ── */
  .vid-wrap{position:relative;flex-shrink:0;overflow:hidden;background:#000}
  .vid-wrap video{width:100%;height:100%;object-fit:cover;display:block}
  .vid-wrap .vid-ph{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#8888AA;font-size:11px;position:absolute;top:0;left:0}
  .vid-gradient{position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(to top,rgba(18,18,32,1) 0%,transparent 100%);pointer-events:none}

  /* ── VIDEO OVERLAYS ── */
  .cat-badge{position:absolute;top:10px;left:10px;z-index:5;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(8px);white-space:nowrap;background:rgba(0,0,0,0.55)}
  .hint-badge{position:absolute;top:10px;right:10px;z-index:5;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;color:#fff;backdrop-filter:blur(4px)}
  .mute-btn{position:absolute;bottom:14px;right:12px;z-index:5;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;backdrop-filter:blur(4px)}

  /* ── TIMER ── */
  .timer-bar{padding:4px 16px 2px;flex-shrink:0}
  .timer-row{display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;color:#8888AA}
  .timer-secs{font-weight:800;font-size:11px;transition:color .3s}
  .timer-secs.urgent{animation:timerPulse .5s ease-in-out infinite}
  .timer-track{height:4px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden}
  .timer-fill{height:100%;border-radius:3px;transition:width 1s linear,background .5s}
  @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:.4}}

  /* ── COMMENTS LOCKED ── */
  .comments-locked{padding:8px 16px 4px;flex-shrink:0}
  .lock-label{font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
  .blur-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;opacity:0.6}
  .blur-avatar{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.07);flex-shrink:0}
  .blur-line{height:10px;border-radius:5px;background:rgba(255,255,255,0.07);filter:blur(3px)}
  .lock-cta{text-align:center;font-size:11px;color:rgba(128,222,234,0.7);font-weight:700;padding:2px 0 4px;letter-spacing:.03em}

  /* ── COMMENTS REVEALED ── */
  .comments-revealed{padding:10px 16px 8px;flex-shrink:0;animation:slideUp .3s ease-out}
  .comments-header{font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;display:flex;align-items:center;gap:5px}
  .cmt-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px}
  .cmt-avatar{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.09);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px}
  .cmt-bubble{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-radius:0 12px 12px 12px;padding:7px 11px;flex:1}
  .cmt-text{font-size:12px;font-weight:500;line-height:1.4}
  .cmt-text.correct{color:#4ADE80}
  .cmt-text.wrong{color:rgba(255,255,255,0.7)}
  .cmt-text.neutral{color:#FF8A65}
  .cmt-add{margin-top:4px;width:100%;background:rgba(255,255,255,0.05);border:1.5px solid rgba(128,222,234,0.25);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:8px;cursor:pointer;transition:border-color .2s}
  .cmt-add:active{border-color:rgba(128,222,234,0.5)}
  .cmt-add-text{font-size:13px;color:#8888AA;flex:1}
  .cmt-input-active{width:100%;background:rgba(255,255,255,0.06);border:1.5px solid #80DEEA;border-radius:12px;padding:10px 14px;color:#fff;font-size:14px;font-family:inherit;outline:none;caret-color:#80DEEA;margin-top:4px}

  /* ── ANSWER SLOTS ── */
  .slots-wrap{padding:6px 16px 4px;flex-shrink:0}
  .slots-row{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;min-height:42px}
  .slot{width:30px;height:34px;border-radius:8px;border:2px solid rgba(128,222,234,0.3);background:rgba(128,222,234,0.04);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:17px;color:#80DEEA;cursor:pointer;transition:all .12s;user-select:none}
  .slot.filled{background:rgba(128,222,234,0.13);border-color:#80DEEA;color:#fff;animation:slotPop .12s ease-out}
  .slot.correct{background:rgba(74,222,128,0.18);border-color:#4ADE80;color:#4ADE80}
  .slot.wrong{background:rgba(255,138,101,0.18);border-color:#FF8A65;color:#FF8A65;animation:shake .3s ease}
  .word-gap{width:10px}
  @keyframes slotPop{0%{transform:scale(.75)}100%{transform:scale(1)}}

  /* ── TILE GRID ── */
  .tiles-wrap{padding:4px 12px 8px;flex-shrink:0}
  .tiles-grid{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:7px}
  .tile{width:34px;height:38px;border-radius:10px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:18px;color:#fff;cursor:pointer;transition:transform .1s,opacity .15s;user-select:none;-webkit-user-select:none}
  .tile:active{transform:scale(.85)}
  .tile.used{opacity:.15;pointer-events:none}
  .tile.dist{color:rgba(255,255,255,0.6);border-color:rgba(255,255,255,0.1)}
  .tile-actions{display:flex;gap:7px;justify-content:center}
  .t-btn{height:34px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.13);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.65);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all .1s}
  .t-btn:active{transform:scale(.95)}
  .t-btn.del{border-color:rgba(255,138,101,0.3);color:#FF8A65;background:rgba(255,138,101,0.07)}
  .t-btn.skip{color:#8888AA;font-size:11px}

  /* ── REVEAL OVERLAY ── */
  .reveal-bar{padding:10px 16px 8px;text-align:center;flex-shrink:0;animation:slideUp .25s ease-out}
  .reveal-label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:2px}
  .reveal-label.ok{color:#4ADE80}
  .reveal-label.no{color:#FF8A65}
  .reveal-answer{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.06em;color:#fff;text-shadow:0 0 20px rgba(255,255,255,0.15);margin-bottom:2px}
  .reveal-sub{font-size:11px;color:#8888AA;margin-bottom:8px}

  /* ── SCORE ROW ── */
  .score-row{display:flex;gap:8px;padding:0 16px 8px;flex-shrink:0;animation:countUp .4s ease-out}
  .sc{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:10px 6px;text-align:center}
  .sc-n{font-family:'Bebas Neue',sans-serif;font-size:22px;line-height:1;margin-bottom:1px}
  .sc-l{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.06em}

  /* ── STREAK BANNER ── */
  .streak-banner{margin:0 16px 8px;background:linear-gradient(135deg,#FF4500,#FF8A65);border-radius:12px;padding:9px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;animation:slideDown .3s ease-out}

  /* ── NEXT CTA ── */
  .next-wrap{padding:0 16px 4px;flex-shrink:0}
  .next-btn{width:100%;background:#80DEEA;color:#0A0A0F;border:none;border-radius:14px;padding:14px;font-family:'Bebas Neue',sans-serif;font-size:19px;letter-spacing:.06em;cursor:pointer;animation:pulseCTA 1.5s ease-in-out 1s infinite}
  .next-btn:active{transform:scale(.97)}
  .next-tease{text-align:center;font-size:11px;color:#8888AA;margin-top:6px}

  /* ── PAUSE ── */
  .pause-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;text-align:center;padding:32px 20px}
  .pause-frac{font-family:'Bebas Neue',sans-serif;font-size:72px;letter-spacing:.04em;line-height:1;background:linear-gradient(135deg,#80DEEA,#C084FC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px}
  .pause-lbl{font-size:11px;color:#8888AA;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
  .pause-streak{display:inline-flex;align-items:center;gap:8px;background:rgba(255,107,53,0.12);border:1px solid rgba(255,107,53,0.3);border-radius:20px;padding:7px 18px;font-size:14px;font-weight:800;color:#FF6B35;margin-bottom:14px}
  .level-up{background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.3);border-radius:12px;padding:11px 16px;font-size:13px;font-weight:700;color:#FACC15}

  /* ── END ── */
  .end-screen{display:flex;flex-direction:column;align-items:center;padding:28px 20px 24px;text-align:center;overflow-y:auto}
  .etrophy{font-size:52px;margin-bottom:6px;animation:float 3s ease-in-out infinite}
  .etitle{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.08em;margin-bottom:4px}
  .erank{display:inline-block;background:linear-gradient(135deg,#FACC15,#FF8A65);color:#0A0A0F;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:.08em;margin-bottom:16px}
  .egrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;width:100%;margin-bottom:14px}
  .ebox{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:13px 8px}
  .en{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.04em;line-height:1;margin-bottom:2px}
  .el{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.07em}

  /* ── ANIMATIONS ── */
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  @keyframes pulseCTA{0%,100%{box-shadow:0 0 0 0 rgba(128,222,234,0.4)}50%{box-shadow:0 0 0 10px rgba(128,222,234,0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slotPop{0%{transform:scale(.75)}100%{transform:scale(1)}}
`;

// ─── VIDEO BLOCK ──────────────────────────────────────────────
function VideoBlock({ cara, height="58vh", frozen=false }) {
  const [muted, setMuted] = useState(true);
  const ref = useRef(null);
  const cc  = CAT_COLORS[cara.category]||"#80DEEA";
  const em  = CAT_EMOJI[cara.category]||"💎";

  useEffect(() => {
    setMuted(true);
    if (ref.current) { ref.current.muted=true; ref.current.play().catch(()=>{}); }
    if (frozen&&ref.current) ref.current.pause();
  }, [cara.id, frozen]);

  function toggle() {
    SFX.init();
    const n=!muted; setMuted(n); SFX._on=n; saveJSON("crz_sfx",n);
    if (ref.current) ref.current.muted=n;
  }

  return (
    <div className="vid-wrap" style={{height,flexShrink:0}}>
      {cara.videoUrl
        ? <video ref={ref} src={cara.videoUrl} autoPlay muted loop playsInline style={{height:"100%"}}/>
        : <div className="vid-ph"><span style={{fontSize:40,opacity:.12}}>🎬</span><span>Video loading...</span></div>
      }
      <div className="vid-gradient"/>
      <div className="cat-badge" style={{border:`1px solid ${cc}44`,color:cc}}>
        <span>{em}</span>
        <span>{cara.category.toUpperCase()} · {cara.wordCount===1?"1 WORD":`${cara.wordCount} WORDS`}</span>
      </div>
      <div className="hint-badge">Only {cara.firstGuessRate}% get this 👀</div>
      <button className="mute-btn" onClick={toggle}>{muted?"🔇":"🔊"}</button>
    </div>
  );
}

// ─── COMMENTS LOCKED ──────────────────────────────────────────
function CommentsLocked() {
  const teases = [TEASE_COMMENTS[Math.floor(Math.random()*3)], TEASE_COMMENTS[3+Math.floor(Math.random()*2)]];
  return (
    <div className="comments-locked">
      <div className="lock-label">Comments</div>
      {teases.map((t,i) => (
        <div key={i} className="blur-row">
          <div className="blur-avatar"/>
          <div className="blur-line" style={{width:`${50+i*20}%`}}/>
        </div>
      ))}
      <div className="lock-cta">🔒 Guess to reveal what others said</div>
    </div>
  );
}

// ─── COMMENTS REVEALED ────────────────────────────────────────
function CommentsRevealed({ caraId, result }) {
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const inputRef = useRef(null);
  const comments = getComments(caraId, result.correct, result.timedOut, result.speedBonus, result.timeLeft||0);
  const prefill  = result.correct ? "Got it 😎 — " : `I thought it was ___ 😂 — `;

  function openComment() {
    setCommenting(true);
    setComment(prefill);
    setTimeout(()=>inputRef.current?.focus(),100);
  }

  return (
    <div className="comments-revealed">
      <div className="comments-header"><span>💬</span><span>What others said</span></div>
      {comments.map((c,i)=>(
        <div key={i} className="cmt-row" style={{animationDelay:`${i*80}ms`,animation:"slideUp .25s ease-out both"}}>
          <div className="cmt-avatar">{c.avatar}</div>
          <div className="cmt-bubble"><div className={`cmt-text ${c.type}`}>{c.text}</div></div>
        </div>
      ))}
      {!commenting
        ? <div className="cmt-add" onClick={openComment}>
            <span style={{fontSize:16}}>💬</span>
            <span className="cmt-add-text">Add your reaction…</span>
          </div>
        : <input ref={inputRef} className="cmt-input-active" value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&setCommenting(false)} placeholder="Your reaction…"/>
      }
    </div>
  );
}

// ─── TILE INPUT ───────────────────────────────────────────────
function TileInput({ cara, onResult, onSkip, attempts, setAttempts, timeLeft, setTimeLeft }) {
  const answer      = cara.answer.toUpperCase();
  const answerClean = answer.replace(/[^A-Z ]/g,"");
  const words       = answerClean.split(" ");
  const totalL      = answerClean.replace(/ /g,"").length;

  const [tiles,    setTiles]    = useState(()=>buildTiles(cara.answer));
  const [selected, setSelected] = useState([]);
  const [slotState,setSlotState]= useState(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(()=>{ setTiles(buildTiles(cara.answer)); setSelected([]); setSlotState(null); setShowHint(false); },[cara.id]);
  useEffect(()=>{ if(attempts>=MAX_ATTEMPTS-1) setShowHint(true); },[attempts]);

  function tap(tile) {
    if (tile.used||selected.length>=totalL) return;
    SFX.tap();
    const ns=[...selected,{tileId:tile.id,letter:tile.letter}];
    setSelected(ns);
    setTiles(p=>p.map(t=>t.id===tile.id?{...t,used:true}:t));
    if (ns.length===totalL) check(ns);
  }

  function tapSlot(idx) {
    if (idx>=selected.length) return;
    const rem=selected[idx];
    setSelected(selected.filter((_,i)=>i!==idx));
    setTiles(p=>p.map(t=>t.id===rem.tileId?{...t,used:false}:t));
    setSlotState(null);
  }

  function del() {
    if (!selected.length) return;
    SFX.del();
    const rem=selected[selected.length-1];
    setSelected(p=>p.slice(0,-1));
    setTiles(p=>p.map(t=>t.id===rem.tileId?{...t,used:false}:t));
    setSlotState(null);
  }

  function shuffle() { setSelected([]); setTiles(buildTiles(cara.answer)); setSlotState(null); }

  function check(sel) {
    const guess=sel.map(s=>s.letter).join("").toLowerCase();
    const ok=norm(guess)===norm(cara.answer);
    const speed=ok&&timeLeft>20;
    const na=attempts+1; setAttempts(na);
    setSlotState(ok?"correct":"wrong");
    mp.track("guess_submitted",{cara_id:cara.id,is_correct:ok,attempt_number:na,time_left:timeLeft});
    if (ok) {
      SFX.correct();
      setTimeout(()=>onResult({correct:true,attempts:na,speedBonus:speed,timeLeft,lastGuess:sel.map(s=>s.letter).join("")}),500);
    } else if (na>=MAX_ATTEMPTS) {
      SFX.wrong();
      setTimeout(()=>onResult({correct:false,attempts:na,speedBonus:false,timeLeft,lastGuess:sel.map(s=>s.letter).join("")}),600);
    } else {
      SFX.wrong();
      setTimeout(()=>{ setSelected([]); setTiles(buildTiles(cara.answer)); setSlotState(null); },700);
    }
  }

  // Build word slots
  let si=0;
  const wordSlots=words.map(w=>w.split("").map(()=>{ const s=selected[si]||null; si++; return s; }));

  return (
    <>
      {showHint&&<div style={{margin:"0 16px 4px",padding:"6px 12px",background:"rgba(255,138,101,0.08)",border:"1px solid rgba(255,138,101,0.2)",borderRadius:10,fontSize:12,color:"#FF8A65",flexShrink:0}}>💡 {cara.hint}</div>}

      {/* SLOTS */}
      <div className="slots-wrap">
        <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",marginBottom:5}}>
          <div style={{fontSize:10,color:"#8888AA",textTransform:"uppercase",letterSpacing:".08em"}}>
            {attempts>0?`Attempt ${attempts+1} of ${MAX_ATTEMPTS}`:`${cara.wordCount===1?"1 word":`${cara.wordCount} words`}`}
          </div>
          <div style={{display:"flex",gap:4}}>{Array.from({length:MAX_ATTEMPTS}).map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<attempts?"#FF8A65":"rgba(255,255,255,0.12)"}}/>)}</div>
        </div>
        <div className="slots-row">
          {wordSlots.map((w,wi)=>(
            <div key={wi} style={{display:"flex",alignItems:"center",gap:5}}>
              {w.map((fill,li)=>{
                const absIdx=wordSlots.slice(0,wi).reduce((a,x)=>a+x.length,0)+li;
                return <div key={li} className={`slot ${fill?"filled":""} ${slotState&&fill?slotState:""}`} onClick={()=>fill&&tapSlot(absIdx)}>{fill?fill.letter:""}</div>;
              })}
              {wi<wordSlots.length-1&&<div className="word-gap"/>}
            </div>
          ))}
        </div>
      </div>

      {/* TILES */}
      <div className="tiles-wrap">
        <div className="tiles-grid">
          {tiles.map(t=>(
            <div key={t.id} className={`tile ${t.used?"used":""} ${!t.isAnswer?"dist":""}`} onClick={()=>tap(t)}>{t.letter}</div>
          ))}
        </div>
        <div className="tile-actions">
          <button className="t-btn" onClick={shuffle}>🔀 Shuffle</button>
          <button className="t-btn del" onClick={del}>⌫ Delete</button>
          <button className="t-btn skip" onClick={onSkip}>Skip</button>
        </div>
      </div>
    </>
  );
}

// ─── START ────────────────────────────────────────────────────
function StartScreen({ onStart }) {
  const best=loadJSON("crz_best",0);

  // Deep link detection: ?c=correct-total-score
  const params=new URLSearchParams(window.location.search);
  const challenge=params.get("c");
  let challenger=null;
  if(challenge){
    const [fc,ft,fs]=challenge.split("-").map(Number);
    if(!isNaN(fc)&&!isNaN(ft)&&!isNaN(fs)) challenger={correct:fc,total:ft,score:fs};
  }

  return (
    <div className="app" style={{justifyContent:"center",padding:"16px"}}>
      <div className="start-card">
        {challenger&&(
          <div style={{background:"linear-gradient(135deg,rgba(255,107,53,0.15),rgba(255,138,101,0.08))",border:"1px solid rgba(255,107,53,0.4)",borderRadius:"20px 20px 0 0",padding:"14px 20px",textAlign:"center",borderBottom:"1px solid rgba(255,107,53,0.2)"}}>
            <div style={{fontSize:20,marginBottom:4}}>🔥</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:".06em",color:"#FF8A65",marginBottom:3}}>YOUR FRIEND GOT {challenger.correct}/{challenger.total}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:600}}>Beat {challenger.correct}/{challenger.total} to win 👊</div>
          </div>
        )}
        <div className="start-bg" style={challenger?{borderRadius:0}:{}}>
          <div className="start-glow"/>
          <div className="start-gem">💎</div>
          <div className="start-logo">CARAIDIZ</div>
          <div className="start-tag">watching becomes playing</div>
          {!challenger&&<div className="start-badge">💎 6 Caras to beat</div>}
          {!challenger&&<div className="start-count" style={{marginTop:6}}>Can you beat them all?</div>}
          {!challenger&&best>0&&<div style={{marginTop:8,fontSize:11,color:"rgba(128,222,234,0.6)"}}>Your best: {best} pts</div>}
        </div>
        <div className="start-body">
          <button className="start-btn" onClick={onStart} style={challenger?{background:"linear-gradient(135deg,#FF6B35,#FF8A65)",color:"#fff",boxShadow:"0 8px 32px rgba(255,107,53,0.4)"}:{}}>{challenger?"ACCEPT THE CHALLENGE →":"START PLAYING →"}</button>
          <div style={{textAlign:"center",fontSize:11,color:"#8888AA",marginTop:10}}>No signup · Free · ~3 min</div>
        </div>
      </div>
    </div>
  );
}

// ─── PAUSE ────────────────────────────────────────────────────
function PauseScreen({ index, total, streak, correct, onNext }) {
  useEffect(()=>{ const t=setTimeout(onNext,1200); return()=>clearTimeout(t); },[]);
  return (
    <div className="card">
      <div className="pause-screen">
        <div className="pause-frac">{correct}/{total}</div>
        <div className="pause-lbl">Caras completed</div>
        {streak>=2&&<div className="pause-streak"><span>🔥</span><span>Streak: {streak}</span></div>}
        {index===3&&<div className="level-up">🔥 You're doing better than 80% of players</div>}
        <div style={{fontSize:11,color:"#8888AA",marginTop:10}}>Next Cara loading...</div>
      </div>
    </div>
  );
}

// ─── END ──────────────────────────────────────────────────────
function EndScreen({ totalScore, correct, bestStreak, sessionStart, onReplay }) {
  const [copied,setCopied]=useState(false);
  const [isNew,setIsNew]=useState(false);
  const pct=Math.round(correct/CARAS.length*100);
  const ts=Math.round((Date.now()-sessionStart)/1000);
  const ego=pct===100?"Less than 5% get a perfect score.":pct>=80?"Better than 80% of players.":pct>=60?"Most players don't make it this far.":bestStreak>=3?`That ${bestStreak}-streak though 🔥`:"Each play makes you sharper.";

  useEffect(()=>{
    const prev=loadJSON("crz_best",0);
    if(totalScore>prev){saveJSON("crz_best",totalScore);setIsNew(true);}
    mp.track("session_complete",{total_score:totalScore,correct_count:correct,best_streak:bestStreak,time_spent_seconds:ts,accuracy_pct:pct});
    const s=loadJSON("crz_sessions",[]);
    s.push({date:new Date().toISOString(),score:totalScore,correct,streak:bestStreak,time:ts});
    saveJSON("crz_sessions",s.slice(-100));
  },[]);

  function share(){
    const link=`https://caraidiz-pwa.vercel.app/?c=${correct}-${CARAS.length}-${totalScore}`;
    const text=`I got ${correct}/6 on Caraidiz 💎 Think you can beat me?\n${link}`;
    mp.track("score_shared",{correct,score:totalScore,streak:bestStreak});
    if(navigator.share){
      navigator.share({text}).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
    }
  }

  return (
    <div className="card">
      <div className="end-screen">
        <div className="etrophy">{pct===100?"👑":pct>=80?"🏆":pct>=60?"⭐":"💎"}</div>
        <div className="etitle">YOU FINISHED 🔥</div>
        <div className="erank">{pct===100?"PERFECT 👑":pct>=80?"TOP PLAYER 🏆":pct>=60?"WELL PLAYED ⭐":"KEEP GOING 💪"}</div>
        {isNew&&<div style={{background:"rgba(250,204,21,0.1)",border:"1px solid rgba(250,204,21,0.3)",borderRadius:12,padding:"9px 14px",textAlign:"center",fontSize:13,color:"#FACC15",fontWeight:800,marginBottom:12}}>🏆 New personal best!</div>}
        <div className="egrid" style={{marginBottom:10}}>
          <div className="ebox"><div className="en" style={{color:"#80DEEA"}}>{totalScore}</div><div className="el">pts</div></div>
          <div className="ebox"><div className="en" style={{color:"#4ADE80"}}>{correct}/6</div><div className="el">correct</div></div>
          <div className="ebox"><div className="en" style={{color:"#FF6B35"}}>🔥{bestStreak}</div><div className="el">streak</div></div>
        </div>
        <div style={{fontSize:13,color:"#8888AA",textAlign:"center",marginBottom:12}}>{ego}</div>
        <div style={{fontSize:12,fontWeight:800,color:"#80DEEA",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,textShadow:"0 0 20px rgba(128,222,234,0.4)"}}>ONLY 5% FINISH THIS 💎</div>
        <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:10}}>I got {correct}/6 — can you beat me?</div>
        <button style={{width:"100%",background:"linear-gradient(135deg,#FF6B35,#FF8A65)",color:"#fff",border:"none",borderRadius:16,padding:"17px 16px",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:".08em",cursor:"pointer",marginBottom:7,boxShadow:"0 8px 32px rgba(255,107,53,0.4)",animation:"pulseCTA 1.8s ease-in-out infinite"}} onClick={share}>
          {copied?"✓ LINK COPIED! 🔥":"🔥 CHALLENGE A FRIEND"}
        </button>
        <div style={{textAlign:"center",fontSize:12,color:"#8888AA",marginBottom:16}}>They won't beat your score 😏</div>
        <button style={{width:"100%",background:"transparent",border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:14,padding:13,color:"rgba(255,255,255,0.7)",fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:".06em",cursor:"pointer",marginBottom:8}} onClick={onReplay}>🔁 PLAY AGAIN</button>
        <div style={{textAlign:"center",fontSize:11,color:"#8888AA"}}>Most players don't improve their score 😈</div>
      </div>
    </div>
  );
}

// ─── GAME SCREEN ──────────────────────────────────────────────
function GameScreen({ cara, totalScore, streak, index, total, attempts, setAttempts, onResult, onSkip }) {
  const [timeLeft,  setTimeLeft]  = useState(TIMER_DURATION);
  const [phase,     setPhase]     = useState("playing"); // playing | revealed
  const [result,    setResult]    = useState(null);

  useEffect(()=>{ setTimeLeft(TIMER_DURATION); setPhase("playing"); setResult(null); },[cara.id]);

  // Timer
  useEffect(()=>{
    if (phase!=="playing") return;
    if (timeLeft<=0) {
      SFX.timeUp();
      mp.track("timer_expired",{cara_id:cara.id});
      const r={correct:false,attempts:attempts||1,speedBonus:false,timedOut:true,timeLeft:0,lastGuess:""};
      setResult(r); setPhase("revealed");
      return;
    }
    if (timeLeft<=5) SFX.tick();
    const t=setTimeout(()=>setTimeLeft(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timeLeft,phase]);

  function handleResult(res) { setResult(res); setPhase("revealed"); }

  const pct   = (timeLeft/TIMER_DURATION)*100;
  const tCol  = timeLeft>15?"#80DEEA":timeLeft>8?"#FACC15":"#FF8A65";
  const urgent= timeLeft<=8;

  const isLast    = index===total-1;
  const nextDiff  = CARAS[index+1]?.difficulty;
  const nextLabel = isLast?"SEE MY RESULTS 🏆":result?.correct&&streak>=3?"KEEP THE STREAK 🔥→":!result?.correct?"REDEMPTION ROUND →":"NEXT CHALLENGE 🔥";
  const tease     = isLast?"":nextDiff==="hard"?"⚠️ Next one is harder":nextDiff==="expert"?"🔥 EXPERT LEVEL — final Cara":"💎 Next loading...";

  const showScore = result&&phase==="revealed";

  return (
    <div className="card">
      {/* TOP BAR */}
      <div className="topbar">
        <div className="logo-s">CARAI<span>DIZ</span> 💎</div>
        <div className="score-pill">
          {streak>=2&&<span className="streak-n">🔥 {streak}</span>}
          <span>{totalScore} pts</span>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="prog">
        <div className="prog-lbl"><span>Cara {index+1} of {total}</span><span>{Math.round(index/total*100)}% done</span></div>
        <div className="prog-track"><div className="prog-fill" style={{width:`${index/total*100}%`}}/></div>
        <div className="pips">{CARAS.map((_,i)=><div key={i} className="pip" style={{background:i<index?"#80DEEA":i===index?"rgba(128,222,234,0.4)":"rgba(255,255,255,0.08)"}}/>)}</div>
      </div>

      {/* VIDEO */}
      <VideoBlock cara={cara} height="52vh" frozen={phase==="revealed"}/>

      {/* TIMER */}
      {phase==="playing"&&(
        <div className="timer-bar">
          <div className="timer-row">
            <span style={{fontSize:10,color:"#8888AA",textTransform:"uppercase",letterSpacing:".08em"}}>Time to guess</span>
            <span className={`timer-secs${urgent?" urgent":""}`} style={{color:tCol}}>{urgent?"⚡ ":""}{timeLeft}s</span>
          </div>
          <div className="timer-track"><div className="timer-fill" style={{width:`${pct}%`,background:tCol}}/></div>
        </div>
      )}

      {/* GAMEPLAY MODE */}
      {phase==="playing"&&(
        <>
          <CommentsLocked/>
          <TileInput cara={cara} onResult={handleResult} onSkip={onSkip} attempts={attempts} setAttempts={setAttempts} timeLeft={timeLeft} setTimeLeft={setTimeLeft}/>
        </>
      )}

      {/* REVEAL MODE */}
      {phase==="revealed"&&result&&(
        <>
          {/* RESULT */}
          <div className="reveal-bar">
            {result.lastGuess&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"6px 12px",background:result.correct?"rgba(74,222,128,0.08)":"rgba(255,138,101,0.08)",border:`1px solid ${result.correct?"rgba(74,222,128,0.25)":"rgba(255,138,101,0.25)"}`,borderRadius:10}}>
                <span style={{fontSize:10,fontWeight:800,color:result.correct?"#4ADE80":"#FF8A65",letterSpacing:".1em",textTransform:"uppercase",flexShrink:0}}>YOU:</span>
                <span style={{fontSize:13,fontWeight:700,color:result.correct?"#4ADE80":"#FF8A65"}}>{result.lastGuess}</span>
                <span style={{marginLeft:"auto"}}>{result.correct?"✅":"❌"}</span>
              </div>
            )}
            <div className={`reveal-label ${result.correct?"ok":"no"}`}>{result.correct?"🎉 CORRECT!":result.timedOut?"⏱ TIME'S UP":"😅 THE ANSWER WAS…"}</div>
            <div className="reveal-answer">{cara.answer}</div>
            <div className="reveal-sub">{result.correct?(result.speedBonus?"⚡ Lightning fast!":`Got it in ${result.attempts} ${result.attempts===1?"try":"tries"}`):result.timedOut?"The clock got you this time":"Most players miss this one"}</div>
          </div>

          {/* SCORES */}
          {showScore&&(
            <div className="score-row">
              <div className="sc"><div className="sc-n" style={{color:result.correct?"#4ADE80":"#FF8A65"}}>+{result.correct?scoreFor(result.attempts,streak,result.speedBonus):0}</div><div className="sc-l">Points</div></div>
              <div className="sc"><div className="sc-n" style={{color:"#80DEEA"}}>{totalScore}</div><div className="sc-l">Total</div></div>
              <div className="sc"><div className="sc-n" style={{color:"#FF6B35"}}>{streak}</div><div className="sc-l">🔥 Streak</div></div>
            </div>
          )}

          {/* STREAK BANNER */}
          {streak>=3&&(
            <div className="streak-banner">
              <span style={{fontSize:22}}>🔥</span>
              <div><div style={{fontWeight:800,fontSize:13}}>{streak} in a row!</div><div style={{fontSize:11,opacity:.85}}>Don't stop now</div></div>
            </div>
          )}

          {/* SOCIAL MODE — COMMENTS UNLOCKED */}
          <CommentsRevealed caraId={cara.id} result={result}/>

          {/* NEXT CTA */}
          <div className="next-wrap">
            <button className="next-btn" onClick={()=>onResult(result)}>{nextLabel}</button>
            {tease&&<div className="next-tease">{tease}</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [screen,  setScreen]  = useState("start");
  const [index,   setIndex]   = useState(0);
  const [attempts,setAttempts]= useState(0);
  const [total,   setTotal]   = useState(0);
  const [streak,  setStreak]  = useState(0);
  const [best,    setBest]    = useState(0);
  const [correct, setCorrect] = useState(0);
  const [sessionStart]        = useState(Date.now());

  useEffect(()=>{ mp.init(); SFX.load(); },[]);

  const cara   = CARAS[index];
  const isLast = index===CARAS.length-1;

  function start() { mp.track("session_start",{caras:CARAS.length}); setScreen("game"); }

  function handleResult(res) {
    const ns  = res.correct ? streak+1 : 0;
    const pts = res.correct ? scoreFor(res.attempts,ns,res.speedBonus) : 0;
    setStreak(ns); setBest(b=>Math.max(b,ns));
    setTotal(t=>t+pts);
    if (res.correct) setCorrect(c=>c+1);
    mp.track("video_watched",{cara_id:cara.id,correct:res.correct,difficulty:cara.difficulty});
    if (isLast) { setScreen("end"); return; }
    if ((index+1)%2===0) { setIndex(i=>i+1); setAttempts(0); setScreen("pause"); }
    else { setIndex(i=>i+1); setAttempts(0); }
  }

  function handleSkip() {
    setStreak(0);
    mp.track("video_skipped",{cara_id:cara.id});
    handleResult({correct:false,attempts:0,speedBonus:false,timedOut:false,timeLeft:TIMER_DURATION,lastGuess:""});
  }

  function handleReplay() { setIndex(0); setScreen("start"); setAttempts(0); setTotal(0); setStreak(0); setCorrect(0); }

  if (screen==="start")  return <><style>{G}</style><StartScreen onStart={start}/></>;
  if (screen==="pause")  return <><style>{G}</style><PauseScreen index={index} total={CARAS.length} streak={streak} correct={correct} onNext={()=>setScreen("game")}/></>;
  if (screen==="end")    return <><style>{G}</style><EndScreen totalScore={total} correct={correct} bestStreak={best} sessionStart={sessionStart} onReplay={handleReplay}/></>;

  return (
    <>
      <style>{G}</style>
      <div className="app">
        <GameScreen
          key={index}
          cara={cara}
          totalScore={total}
          streak={streak}
          index={index}
          total={CARAS.length}
          attempts={attempts}
          setAttempts={setAttempts}
          onResult={handleResult}
          onSkip={handleSkip}
        />
      </div>
    </>
  );
}
