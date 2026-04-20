// ============================================================
//  CARAIDIZ 💎 — v6
//  Fixed video layout · Big timer · +15s · Uniform tiles · Brand mode
// ============================================================

import { useState, useEffect, useRef } from "react";

// ─── MIXPANEL ─────────────────────────────────────────────────
const MIXPANEL_TOKEN = "2b1e84ea597387914b63c3662f751e5b";

// ── Anonymous user identity ───────────────────────────────────
function _genId() { return Math.random().toString(36).slice(2,10)+Date.now().toString(36); }
let _uid = (() => { try { let v=localStorage.getItem("crz_uid"); if(!v){v=_genId();localStorage.setItem("crz_uid",v);} return v; } catch { return _genId(); } })();
let _sid = _genId();

// ── Default properties on every event ────────────────────────
function _defaults() {
  const ua = navigator.userAgent;
  const p  = new URLSearchParams(window.location.search);
  return {
    session_id:   _sid,
    user_id:      _uid,
    app:          "caraidiz",
    ts:           new Date().toISOString(),
    device_type:  /iPhone|iPad/.test(ua)?"ios":/Android/.test(ua)?"android":"desktop",
    browser:      /Chrome/.test(ua)?"Chrome":/Safari/.test(ua)?"Safari":/Firefox/.test(ua)?"Firefox":"Other",
    referrer:     document.referrer||"direct",
    source:       p.get("utm_source")||"organic",
    medium:       p.get("utm_medium")||"none",
    campaign:     p.get("utm_campaign")||"none",
    page_name:    "caraidiz_pwa",
  };
}

const mp = {
  _q:      [],
  _ready:  false,
  _loading: false,
  init() {
    if (!MIXPANEL_TOKEN) return;
    if (this._ready || this._loading) return;
    // If already loaded by service worker cache, use it directly
    if (typeof window.mixpanel !== "undefined" && window.mixpanel.track) {
      this._ready = true;
      this._q.forEach(([ev,pr]) => window.mixpanel.track(ev, pr));
      this._q = [];
      return;
    }
    this._loading = true;
    const s = document.createElement("script");
    s.src = "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";
    s.onload = () => {
      if (typeof window.mixpanel !== "undefined" && !window.mixpanel.__loaded) {
        window.mixpanel.init(MIXPANEL_TOKEN, { track_pageview: false });
        window.mixpanel.__loaded = true;
      }
      this._ready = true;
      this._q.forEach(([ev,pr]) => window.mixpanel.track(ev, pr));
      this._q = [];
    };
    document.head.appendChild(s);
  },
  track(event, props = {}) {
    const payload = { ..._defaults(), ...props };
    if (this._ready && typeof window.mixpanel !== "undefined") {
      window.mixpanel.track(event, payload);
    } else {
      this._q.push([event, payload]);
    }
  },
  newSession() { _sid = _genId(); },
};

// ─── HELPERS ──────────────────────────────────────────────────
const CDN      = "https://pub-cb42555aad7844b7ac02e5cf231188e1.r2.dev";
const norm     = s => s.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
const saveJSON = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };
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
  const dist=fy(pool).slice(0,8);
  const all=[...aLetters.map(l=>({letter:l})),...dist.map(l=>({letter:l}))];
  const minRun=aLetters.length>10?4:3;
  let tiles; let att=0;
  do { tiles=fy(all).map((t,i)=>({...t,id:i,used:false})); att++; } while(att<50&&hasRun(tiles,answer,minRun));
  return tiles;
}

// ─── BRAND TILE BUILDER ───────────────────────────────────────
function buildBrandTiles(competitors) {
  const counts = {};
  competitors.forEach(brand => {
    brand.toUpperCase().replace(/[^A-Z]/g,"").split("").forEach(l => {
      counts[l] = Math.min((counts[l]||0)+1, 2);
    });
  });
  let pool = [];
  Object.entries(counts).forEach(([l,n]) => { for(let i=0;i<n;i++) pool.push(l); });
  const used = new Set(pool);
  const dist = fy("BCDFGHJKLMNPQRSTVWXYZ".split("").filter(c=>!used.has(c)));
  pool = [...pool, ...dist.slice(0, Math.max(0, 16 - pool.length))];
  return fy(pool).map((letter,i) => ({id:i, letter, used:false}));
}
function isBrandCorrect(guess, cara) {
  if (!cara.competitors) return norm(guess)===norm(cara.answer);
  return cara.competitors.some(c => norm(guess)===norm(c));
}
function getAcceptedBrand(guess, cara) {
  if (!cara.competitors) return cara.answer;
  return cara.competitors.find(c => norm(guess)===norm(c)) || cara.answer;
}

// ─── DATA ─────────────────────────────────────────────────────
const CARAS = [
  { id:1, category:"Song",              answer:"Thriller",            wordCount:1, difficulty:"easy",   hint:"Michael Jackson. Zombies. 🕺",          videoUrl:`${CDN}/thriller.mp4.mp4`,    firstGuessRate:58, stats:{views:"4.2k",comments:"134"} },
  { id:3, category:"Brand",             answer:"Gillette",            wordCount:1, difficulty:"easy",   hint:"The best a man can get 🪒",              videoUrl:`${CDN}/gillette.mp4.mp4`,    firstGuessRate:44, stats:{views:"5.8k",comments:"167"}, competitors:["GILLETTE","SCHICK","BIC","HARRY'S"] },
  { id:2, category:"Song",              answer:"Umbrella",            wordCount:1, difficulty:"easy",   hint:"Rihanna. Rain. ☂️",                     videoUrl:`${CDN}/umbrella.mp4.mp4`,    firstGuessRate:58, stats:{views:"3.1k",comments:"89"} },
  { id:5, category:"Phrase",            answer:"I break up with you", wordCount:5, difficulty:"medium", hint:"End of a relationship 💔",               videoUrl:`${CDN}/i-break-up.mp4.mp4`,  firstGuessRate:11, stats:{views:"7.4k",comments:"203"} },
  { id:4, category:"Brand",             answer:"Revlon",              wordCount:1, difficulty:"medium", hint:"Iconic American beauty brand 💄",         videoUrl:`${CDN}/revlon.mp4.mp4`,      firstGuessRate:33, stats:{views:"6.2k",comments:"212"}, competitors:["REVLON","LOREAL","MAYBELLINE","FENTY","MAC"] },
  { id:6, category:"TV Show Character", answer:"JR Ewing",            wordCount:2, difficulty:"hard",   hint:"Dallas. The ultimate villain. 🤠",        videoUrl:`${CDN}/jr-ewing.mp4.mp4`,    firstGuessRate:4,  stats:{views:"2.9k",comments:"58"} },
  { id:7, category:"Phrase",            answer:"Would you marry me",  wordCount:4, difficulty:"hard",   hint:"The most important question 💍",          videoUrl:`${CDN}/marry-me.mp4.mp4`,    firstGuessRate:11, stats:{views:"9.1k",comments:"289"} },
  { id:8, category:"TV Show Character", answer:"Olivia Pope",         wordCount:2, difficulty:"expert", hint:"Scandal. Fixer extraordinaire. 👗",        videoUrl:`${CDN}/olivia-pope.mp4.mp4`, firstGuessRate:4,  stats:{views:"3.4k",comments:"94"} },
  { id:9, category:"Bonus",             answer:"Coldplay Kiss Cam",   wordCount:3, difficulty:"expert", hint:"A stadium moment + British band 🎸",      videoUrl:`${CDN}/coldplay.mp4.mp4`,    firstGuessRate:11, stats:{views:"11.2k",comments:"412"} },
];

// ─── TRACKING HELPERS ─────────────────────────────────────────
function caraProps(cara, index, score=0, streak=0) {
  return {
    cara_index:    index + 1,
    cara_id:       cara.id,
    cara_type:     cara.category,
    round_total:   CARAS.length,
    current_score: score,
    streak_count:  streak,
    difficulty:    cara.difficulty,
  };
}

// ─── TIKTOK COMMENTS ──────────────────────────────────────────
const TIKTOK_COMMENTS = {
  1:[
    {user:"1nso",              text:"Movie of the zombie",           correct:false},
    {user:"dounia",            text:"Thriller - Michael Jackson",    correct:true},
    {user:"Net&Bien",          text:"Thriller",                       correct:true},
  ],
  2:[
    {user:"1nso",              text:"Umbrella",                       correct:true},
    {user:"Net&Bien",          text:"mais ouiiii Umbrella",           correct:true},
    {user:"dounia",            text:"Umbrella",                       correct:true},
    {user:"victoiredecavalie", text:"too easy! Rihanna !!!!!",       correct:true},
  ],
  3:[
    {user:"dounia",            text:"Gilette",                        correct:true},
    {user:"dimija",            text:"shave",                           correct:false},
    {user:"Yoro.thai",         text:"May be Wilkinson ?",             correct:false},
    {user:"Suza3",             text:"Gillette",                       correct:true},
  ],
  4:[
    {user:"Valentina",         text:"L'Oréal!",                        correct:false},
    {user:"G",                 text:"Loreal",                          correct:false},
    {user:"dounia",            text:"Huda Beauty",                     correct:false},
    {user:"Devanee",           text:"Maybelline !",                   correct:false},
    {user:"Suza3",             text:"Revlon 😇",                       correct:true},
  ],
  5:[
    {user:"victoiredecavalie", text:"are we in a breakup situation? 😂", correct:null},
    {user:"Devanee",           text:"You broke my heart !",           correct:false},
    {user:"TheRealRicMaye",    text:"I don't want you to",            correct:false},
    {user:"gtwhatyouwant",     text:"WE WERE ON BREAK !",              correct:false},
  ],
  6:[
    {user:"player_1156",       text:"JR EWING 🤠 iconic",             correct:true},
    {user:"guesser_99",        text:"no idea who this is ngl",        correct:false},
    {user:"player_3308",       text:"DALLAS ERA omg yes",             correct:true},
  ],
  7:[
    {user:"player_6624",       text:"WOULD YOU MARRY ME 💍",          correct:true},
    {user:"guesser_180",       text:"crying rn fr 😭",                 correct:null},
    {user:"player_2291",       text:"is it a proposal phrase?",       correct:false},
  ],
  8:[
    {user:"victoiredecavalie", text:"Kimmie Bellarie",                correct:false},
    {user:"Suza3",             text:"Samantha Jones???",              correct:false},
    {user:"NassyDiaby",        text:"Wonder women",                    correct:false},
  ],
  9:[
    {user:"player_5549",       text:"COLDPLAY KISS CAM 🎸",           correct:true},
    {user:"guesser_331",       text:"concert something??",            correct:false},
    {user:"player_7720",       text:"TOP 5% 💎 legend",                correct:null},
  ],
};

const MAX_ATTEMPTS   = 3;
const TIMER_DURATION = 45;
const EXTEND_SECS    = 15;
const EXTEND_PENALTY = 20;

const CAT_COLORS = { Song:"#C084FC", Brand:"#FF6B9D", Phrase:"#FF8A65", "TV Show Character":"#F472B6", Bonus:"#FACC15", Sport:"#4ADE80", Film:"#60A5FA", "TV Show":"#FACC15" };
const CAT_EMOJI  = { Song:"🎵", Brand:"✨", Phrase:"💬", "TV Show Character":"📺", Bonus:"💎", Sport:"🏆", Film:"🎬", "TV Show":"📺" };

// ─── COMMENTS ─────────────────────────────────────────────────
const CARA_FLAVOR = {
  1:{correct:"THRILLER omg i screamed 🕺",         wrong:"😭 I said beat it wtf"},
  2:{correct:"UMBRELLA ☂️ rihanna era unlocked",   wrong:"wait is it rain on me??"},
  5:{correct:"i break up with you LMAOOO 💔",      wrong:"wait is it we need to talk??"},
  6:{correct:"JR EWING DALLAS ERA 🤠",             wrong:"no idea who this is ngl 😅"},
  7:{correct:"WOULD YOU MARRY ME crying rn 💍",    wrong:"is it a proposal phrase??"},
  8:{correct:"OLIVIA POPE SCANDAL ERA 👗🔥",       wrong:"grey's anatomy?? suits?? idk 😭"},
  9:{correct:"COLDPLAY KISS CAM iconic 🎸😂",      wrong:"coldplay concert?? something with coldplay"},
};
const TEASE_COMMENTS = ["nah this one is hard…","I got it instantly","ok I give up lmao","wait wait wait…","this is so obvious omg"];
const BRAND_FEEDS = {
  3:[
    {avatar:"🪒", text:"gillette ✓",         type:"correct"},
    {avatar:"😂", text:"schick??",            type:"wrong"},
    {avatar:"👀", text:"harry's omg ✓",      type:"correct"},
    {avatar:"😭", text:"i said dollar shave 💀", type:"wrong"},
    {avatar:"✨", text:"bic ✓",              type:"correct"},
    {avatar:"🤷", text:"venus??",            type:"wrong"},
  ],
  4:[
    {avatar:"💅", text:"loreal ✓",           type:"correct"},
    {avatar:"😂", text:"maybelline??",        type:"wrong"},
    {avatar:"👀", text:"fenty beauty omg ✓", type:"correct"},
    {avatar:"😭", text:"i said sephora 💀",  type:"wrong"},
    {avatar:"✨", text:"mac ✓",              type:"correct"},
    {avatar:"🤷", text:"nyx??",              type:"wrong"},
  ]
};

function getComments(caraId, correct, timedOut, speedBonus, timeLeft, acceptedAnswer) {
  if (BRAND_FEEDS[caraId]) {
    const base = fy(BRAND_FEEDS[caraId]).slice(0,3);
    if (correct && acceptedAnswer) base.unshift({avatar:"🧑",text:`${acceptedAnswer.toLowerCase()} ✓`,type:"correct"});
    else base.unshift({avatar:"😬",text:"this one had me 💀",type:"wrong"});
    return base.slice(0,4);
  }
  const f = CARA_FLAVOR[caraId];
  if (timedOut) return [{avatar:"⏱",text:"the clock got you 💀",type:"wrong"},{avatar:"😅",text:"bro was thinking too hard",type:"wrong"}];
  if (correct) {
    const perf = (speedBonus||timeLeft>20)
      ? [{avatar:"😳",text:"you're fast omg",type:"correct"},{avatar:"🔥",text:"1 try?? crazy",type:"correct"}]
      : timeLeft>10
      ? [{avatar:"🔥",text:"first try?? insane",type:"correct"},{avatar:"😭",text:"ok genius relax 😭",type:"correct"}]
      : [{avatar:"👀",text:"took you long enough 😅",type:"neutral"},{avatar:"😅",text:"still got it though 🔥",type:"correct"}];
    return [...perf.slice(0,1),{avatar:"🧑",text:f?.correct||"got it! 🔥",type:"correct"}];
  }
  return [{avatar:"😭",text:"nah this one was easy",type:"wrong"},{avatar:"😬",text:f?.wrong||"tough one",type:"wrong"}];
}

function scoreFor(attempt, streak, speed, extended) {
  const base = (attempt===1?100:attempt===2?60:30)+(streak>=3?50:0)+(speed?25:0);
  return Math.max(0, base-(extended?EXTEND_PENALTY:0));
}

// ─── STYLES ───────────────────────────────────────────────────
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#0A0A0F;font-family:'DM Sans',sans-serif;color:#fff;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
  input::placeholder{color:#8888AA}

  .app{height:100svh;display:flex;flex-direction:column;align-items:center;background:#0A0A0F;overflow:hidden}
  .card{width:100%;max-width:420px;background:#121220;display:flex;flex-direction:column;height:100svh;overflow:hidden}

  /* ── GAME LAYOUT: fixed top + scrollable bottom ── */
  .game-top{flex-shrink:0;display:flex;flex-direction:column}
  .game-scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;padding-bottom:12px}
  .game-scroll::-webkit-scrollbar{display:none}

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
  .topbar{padding:10px 16px 4px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .logo-s{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:.1em}
  .logo-s span{color:#80DEEA}
  .score-pill{background:rgba(255,255,255,0.08);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px}
  .streak-n{color:#FF6B35;font-weight:800;font-size:13px}

  /* ── PROGRESS ── */
  .prog{padding:0 16px 4px;flex-shrink:0}
  .prog-lbl{display:flex;justify-content:space-between;font-size:10px;color:#8888AA;margin-bottom:3px;letter-spacing:.06em;text-transform:uppercase}
  .prog-track{height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:5px}
  .prog-fill{height:100%;background:linear-gradient(90deg,#80DEEA,#C084FC);transition:width .6s ease}
  .pips{display:flex;gap:3px}
  .pip{flex:1;height:4px;border-radius:2px;transition:background .4s}

  /* ── VIDEO ── */
  .vid-wrap{position:relative;overflow:hidden;background:#000}
  .vid-wrap video{width:100%;height:100%;object-fit:cover;display:block}
  .vid-wrap .vid-ph{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#8888AA;font-size:11px;position:absolute;top:0;left:0}
  .vid-gradient{position:absolute;bottom:0;left:0;right:0;height:45%;background:linear-gradient(to top,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.2) 40%,rgba(0,0,0,0) 100%);pointer-events:none}
  .cat-badge{position:absolute;top:10px;left:10px;z-index:5;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(8px);white-space:nowrap;background:rgba(0,0,0,0.55)}
  .hint-badge{position:absolute;top:10px;right:10px;z-index:5;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;color:#fff;backdrop-filter:blur(4px)}
  .mute-btn{position:absolute;bottom:32%;right:12px;z-index:5;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;backdrop-filter:blur(4px)}

  /* ── BIG TIMER ── */
  .timer-overlay{position:absolute;bottom:auto;top:58%;left:14px;z-index:6;display:flex;align-items:center;gap:8px}
  .timer-circle{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.02em;border:3px solid;backdrop-filter:blur(8px);transition:color .4s,border-color .4s,background .4s;box-shadow:0 4px 16px rgba(0,0,0,0.4)}
  .timer-circle.ok{color:#80DEEA;border-color:#80DEEA;background:rgba(10,10,15,0.6)}
  .timer-circle.warn{color:#FACC15;border-color:#FACC15;background:rgba(10,10,15,0.6)}
  .timer-circle.danger{color:#FF8A65;border-color:#FF8A65;background:rgba(10,10,15,0.75);animation:timerPulse .5s ease-in-out infinite}
  .timer-track{height:3px;background:rgba(255,255,255,0.08);flex-shrink:0;overflow:hidden}
  .timer-fill-bar{height:100%;transition:width 1s linear,background .5s}
  @keyframes timerPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.08)}}

  /* ── +15s BUTTON ── */
  .extend-btn{margin:5px 16px 0;padding:9px 16px;background:rgba(250,204,21,0.1);border:1.5px solid rgba(250,204,21,0.6);border-radius:14px;color:#FACC15;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.08em;cursor:pointer;width:calc(100% - 32px);display:flex;align-items:center;justify-content:center;gap:8px;animation:extendPulse .8s ease-in-out infinite;flex-shrink:0}
  .extend-btn:active{transform:scale(.97)}
  @keyframes extendPulse{0%,100%{box-shadow:0 0 0 0 rgba(250,204,21,0.35)}50%{box-shadow:0 0 0 8px rgba(250,204,21,0)}}

  /* ── COMMENTS LOCKED ── */
  .comments-locked{padding:8px 16px 4px;flex-shrink:0}
  .lock-label{font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}
  .blur-row{display:flex;align-items:center;gap:8px;margin-bottom:4px;opacity:0.6}
  .blur-avatar{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.07);flex-shrink:0}
  .blur-line{height:10px;border-radius:5px;background:rgba(255,255,255,0.07)}
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
  .cmt-add{margin-top:4px;width:100%;background:rgba(255,255,255,0.05);border:1.5px solid rgba(128,222,234,0.25);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:8px;cursor:pointer}
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
  @keyframes slotPop{0%{transform:scale(.75);opacity:.5}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
  @keyframes slotWrong{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
  @keyframes slotCorrect{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}

  /* ── TILES (all uniform — no .dist differentiation) ── */
  .tiles-wrap{padding:4px 12px 8px;flex-shrink:0}
  .tiles-grid{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:7px}
  .tile{width:34px;height:38px;border-radius:10px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:18px;color:#fff;cursor:pointer;transition:transform .1s,opacity .15s;user-select:none;-webkit-user-select:none}
  .tile:active{transform:scale(.85)}
  .tile.used{opacity:.15;pointer-events:none}
  .tile-actions{display:flex;gap:7px;justify-content:center}
  .t-btn{height:34px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.13);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.65);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all .15s}
  .t-btn:active{transform:scale(.95)}
  .t-btn.del{border-color:rgba(255,138,101,0.3);color:#FF8A65;background:rgba(255,138,101,0.07)}
  .t-btn.skip{color:#8888AA;font-size:11px}

  /* ── BRAND GUESS BAR ── */
  .brand-bar{margin:6px 16px 4px;padding:10px 14px;min-height:46px;background:rgba(255,255,255,0.04);border-radius:14px;display:flex;align-items:center;flex-shrink:0;transition:border-color .2s}

  /* ── REVEAL ── */
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
  @keyframes pulseCTA{0%,100%{box-shadow:0 0 0 0 rgba(128,222,234,0.4)}50%{box-shadow:0 0 0 10px rgba(128,222,234,0)}}

  /* ── PAUSE ── */
  .pause-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;text-align:center;padding:32px 20px}
  .pause-frac{font-family:'Bebas Neue',sans-serif;font-size:72px;letter-spacing:.04em;line-height:1;background:linear-gradient(135deg,#80DEEA,#C084FC);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px}
  .pause-lbl{font-size:11px;color:#8888AA;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
  .pause-streak{display:inline-flex;align-items:center;gap:8px;background:rgba(255,107,53,0.12);border:1px solid rgba(255,107,53,0.3);border-radius:20px;padding:7px 18px;font-size:14px;font-weight:800;color:#FF6B35;margin-bottom:14px}
  .level-up{background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.3);border-radius:12px;padding:11px 16px;font-size:13px;font-weight:700;color:#FACC15}

  /* ── END ── */
  .end-screen{display:flex;flex-direction:column;align-items:center;padding:28px 20px 24px;text-align:center;overflow-y:auto;flex:1}
  .etrophy{font-size:52px;margin-bottom:6px;animation:float 3s ease-in-out infinite}
  .etitle{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.08em;margin-bottom:4px}
  .erank{display:inline-block;background:linear-gradient(135deg,#FACC15,#FF8A65);color:#0A0A0F;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:.08em;margin-bottom:16px}
  .egrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;width:100%;margin-bottom:14px}
  .ebox{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:13px 8px}
  .en{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.04em;line-height:1;margin-bottom:2px}
  .el{font-size:9px;color:#8888AA;text-transform:uppercase;letter-spacing:.07em}

  /* ── COMMENTS OVERLAY (TikTok style on video) ── */
  .comments-overlay{position:absolute;bottom:48px;left:0;right:0;z-index:6;padding:8px 14px 6px;background:linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 100%)}
  .cmt-ov-row{display:flex;align-items:center;gap:7px;margin-bottom:5px}
  .cmt-ov-avatar{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.15);flex-shrink:0}
  .cmt-ov-line{height:9px;border-radius:5px;background:rgba(255,255,255,0.18)}
  .cmt-ov-lock{display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(128,222,234,0.9);font-weight:700;letter-spacing:.04em;margin-top:2px}

  /* ── TIKTOK REVEAL OVERLAY ── */
  .tiktok-overlay{position:absolute;inset:0;z-index:7;pointer-events:none;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:280px}
  .tiktok-result{padding:8px 14px 4px;background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 100%)}
  .tiktok-answer{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.08em;color:#fff;text-shadow:0 0 20px rgba(255,255,255,0.3);margin-bottom:2px}
  .tiktok-label{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px}
  .tiktok-label.ok{color:#4ADE80}
  .tiktok-label.no{color:#FF8A65}
  .tiktok-cmts{padding:0 14px 10px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
  .tiktok-cmt{display:flex;align-items:center;gap:6px;animation:slideUp .3s ease-out both;background:rgba(0,0,0,0.62);padding:6px 11px;border-radius:14px;max-width:90%}
  .tiktok-cmt-user{font-size:11px;font-weight:800;color:rgba(255,255,255,0.85);flex-shrink:0}
  .tiktok-cmt-text{font-size:12px;font-weight:500;color:#fff}
  .tiktok-cmt-text.correct{color:#4ADE80}
  .tiktok-cmt-text.wrong{color:#fff}
  .tiktok-cmt-text.neutral{color:#fff}
  .tiktok-sidebar{position:absolute;right:10px;bottom:80px;display:flex;flex-direction:column;align-items:center;gap:14px}
  .tiktok-stat{display:flex;flex-direction:column;align-items:center;gap:2px}
  .tiktok-stat-icon{font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))}
  .tiktok-stat-num{font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.8)}

  /* ── ANIMATIONS ── */
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
`;

// ─── VIDEO PRELOADER ─────────────────────────────────────────
function VideoPreloader({ currentIndex }) {
  // Preload next 2 videos silently in background
  const toPreload = [1,2].map(i=>CARAS[currentIndex+i]).filter(Boolean);
  return (
    <div style={{display:"none"}} aria-hidden="true">
      {toPreload.map(c=>(
        <video key={c.id} src={c.videoUrl} preload="auto" muted playsInline/>
      ))}
    </div>
  );
}

// ─── VIDEO BLOCK ──────────────────────────────────────────────
function VideoBlock({ cara, height="60vh", frozen=false }) {
  const [muted, setMuted] = useState(true);
  const ref = useRef(null);
  const cc  = CAT_COLORS[cara.category]||"#80DEEA";
  const em  = CAT_EMOJI[cara.category]||"💎";
  useEffect(() => {
    setMuted(true);
    if (ref.current) { ref.current.muted=true; ref.current.play().catch(()=>{}); }
    if (frozen&&ref.current) ref.current.pause();
  }, [cara.id, frozen]);
  useEffect(() => {
    if (frozen) return;
    const t = setTimeout(() => {
      mp.track("video_watched", {
        cara_id:    cara.id,
        cara_index: (cara._index||0) + 1,
        category:   cara.category,
        difficulty: cara.difficulty,
      });
    }, 3000);
    return () => clearTimeout(t);
  }, [cara.id, frozen]);
  function toggle() {
    SFX.init();
    const n=!muted; setMuted(n); SFX._on=n; saveJSON("crz_sfx",n);
    if (ref.current) ref.current.muted=n;
  }
  return (
    <div className="vid-wrap" style={{height}}>
      {cara.videoUrl
        ? <video ref={ref} src={cara.videoUrl} autoPlay muted loop playsInline preload="auto" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center center"}}/>
        : <div className="vid-ph"><span style={{fontSize:40,opacity:.12}}>🎬</span><span>Video loading...</span></div>
      }
      <div className="vid-gradient"/>
      <div className="cat-badge" style={{background:cc,color:"#000",border:"none",fontSize:13,fontWeight:900,padding:"7px 14px",top:72,left:12}}>
        <span>{em}</span>
        <span>{cara.category.toUpperCase()} · {cara.wordCount===1?"1 WORD":`${cara.wordCount} WORDS`}</span>
      </div>
      <button className="mute-btn" onClick={toggle}>{muted?"🔇":"🔊"}</button>
    </div>
  );
}

// ─── TIMER OVERLAY (on video) ─────────────────────────────────
function TimerOverlay({ timeLeft, maxTime }) {
  const cls  = timeLeft>15?"ok":timeLeft>8?"warn":"danger";
  const tCol = timeLeft>15?"#80DEEA":timeLeft>8?"#FACC15":"#FF8A65";
  const pct  = Math.min(100,(timeLeft/maxTime)*100);
  return (
    <div className="timer-overlay">
      <div className={`timer-circle ${cls}`}>{timeLeft}</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".08em"}}>sec</div>
    </div>
  );
}

// ─── TIKTOK REVEAL OVERLAY ───────────────────────────────────
function TikTokReveal({ cara, result }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const cmts = TIKTOK_COMMENTS[cara.id] || [];
  const stats = cara.stats || {likes:"1.2k", comments:"47"};

  useEffect(() => {
    setVisibleCount(0);
    const t = setInterval(() => setVisibleCount(v => v < cmts.length ? v+1 : v), 700);
    return () => clearInterval(t);
  }, [cara.id]);

  return (
    <div className="tiktok-overlay">
      {/* SIDEBAR — same as during gameplay */}
      <div className="tiktok-sidebar">
        <div className="tiktok-stat">
          <span style={{fontSize:18,fontWeight:800,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>▶</span>
          <span className="tiktok-stat-num">{stats.views||"1.2k"}</span>
        </div>
        <div className="tiktok-stat">
          <span style={{fontSize:13,fontWeight:900,color:"#4ADE80",textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>✓</span>
          <span className="tiktok-stat-num" style={{color:"#4ADE80"}}>{cara.firstGuessRate}%</span>
        </div>
        <div className="tiktok-stat">
          <span style={{fontSize:13,fontWeight:900,color:"#FF8A65",textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>✗</span>
          <span className="tiktok-stat-num" style={{color:"#FF8A65"}}>{100-cara.firstGuessRate}%</span>
        </div>
      </div>

      {/* COMMENTS + RESULT */}
      <div>
        <div className="tiktok-cmts">
          {cmts.slice(0, visibleCount).map((c,i)=>(
            <div key={i} className="tiktok-cmt" style={{animationDelay:`${i*0.1}s`}}>
              <span className="tiktok-cmt-user">@{c.user}</span>
              <span className={`tiktok-cmt-text ${c.correct===true?"correct":c.correct===false?"wrong":"neutral"}`}>{c.text}</span>
            </div>
          ))}
        </div>
        <div className="tiktok-result">
          <div className={`tiktok-label ${result.correct?"ok":"no"}`}>
            {result.correct?"🎉 CORRECT!":result.timedOut?"⏱ TIME'S UP":"😅 THE ANSWER WAS…"}
          </div>
          <div className="tiktok-answer">{result.acceptedAnswer||cara.answer}</div>
        </div>
      </div>
    </div>
  );
}

// ─── STATS SIDEBAR (always visible during play) ──────────────
function StatsSidebar({ cara }) {
  const stats = cara.stats || {views:"1.2k"};
  return (
    <div className="tiktok-sidebar">
      <div className="tiktok-stat">
        <span style={{fontSize:18,fontWeight:800,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>▶</span>
        <span className="tiktok-stat-num">{stats.views}</span>
      </div>
      <div className="tiktok-stat">
        <span style={{fontSize:13,fontWeight:900,color:"#4ADE80",textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>✓</span>
        <span className="tiktok-stat-num" style={{color:"#4ADE80"}}>{cara.firstGuessRate}%</span>
      </div>
      <div className="tiktok-stat">
        <span style={{fontSize:13,fontWeight:900,color:"#FF8A65",textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>✗</span>
        <span className="tiktok-stat-num" style={{color:"#FF8A65"}}>{100-cara.firstGuessRate}%</span>
      </div>
    </div>
  );
}

// ─── BLURRED COMMENTS SCROLL (during gameplay) ───────────────
function BlurredCommentsScroll() {
  return (
    <div style={{position:"absolute",bottom:"28%",left:0,right:0,zIndex:6,display:"flex",alignItems:"center",justifyContent:"center",gap:5,pointerEvents:"none"}}>
      <span style={{fontSize:10}}>🔒</span>
      <span style={{fontSize:11,color:"rgba(255,255,255,0.92)",fontWeight:700,letterSpacing:".04em",textShadow:"0 1px 2px rgba(0,0,0,0.6)"}}>Guess to reveal comments</span>
    </div>
  );
}

// ─── COMMENTS LOCKED ──────────────────────────────────────────
function CommentsLocked() {
  const teases = [TEASE_COMMENTS[Math.floor(Math.random()*3)], TEASE_COMMENTS[3+Math.floor(Math.random()*2)]];
  return (
    <div className="comments-locked">
      <div className="lock-label">Comments</div>
      {teases.map((t,i)=>(
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
  const comments = getComments(caraId, result.correct, result.timedOut, result.speedBonus, result.timeLeft||0, result.acceptedAnswer);
  const prefill  = result.correct ? "Got it 😎 — " : "I thought it was ___ 😂 — ";
  function openComment() { setCommenting(true); setComment(prefill); setTimeout(()=>inputRef.current?.focus(),100); }
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
        ? <div className="cmt-add" onClick={openComment}><span style={{fontSize:16}}>💬</span><span className="cmt-add-text">Add your reaction…</span></div>
        : <input ref={inputRef} className="cmt-input-active" value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&setCommenting(false)} placeholder="Your reaction…"/>
      }
    </div>
  );
}

// ─── BRAND TILE INPUT ─────────────────────────────────────────
function BrandTileInput({ cara, onResult, onSkip, attempts, setAttempts, timeLeft }) {
  const [tiles,    setTiles]    = useState(()=>buildBrandTiles(cara.competitors));
  const [selected, setSelected] = useState([]);
  const [flash,    setFlash]    = useState(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(()=>{ setTiles(buildBrandTiles(cara.competitors)); setSelected([]); setFlash(null); setShowHint(false); },[cara.id]);
  useEffect(()=>{ if(attempts>=MAX_ATTEMPTS-1){ setShowHint(true); mp.track("hint_shown",{...caraProps(cara, cara._index||0)}); } },[attempts]);

  function tap(tile) {
    if (tile.used||selected.length>=12) return; SFX.tap();
    setSelected(p=>[...p,{tileId:tile.id,letter:tile.letter}]);
    setTiles(p=>p.map(t=>t.id===tile.id?{...t,used:true}:t));
  }
  function del() {
    if (!selected.length) return; SFX.del();
    const rem=selected[selected.length-1];
    setSelected(p=>p.slice(0,-1));
    setTiles(p=>p.map(t=>t.id===rem.tileId?{...t,used:false}:t));
  }
  function shuffle() { setSelected([]); setTiles(buildBrandTiles(cara.competitors)); }
  function submit() {
    if (selected.length<2) return;
    const guess=selected.map(s=>s.letter).join("");
    const ok=isBrandCorrect(guess, cara);
    const accepted=ok?getAcceptedBrand(guess,cara):null;
    const speed=ok&&timeLeft>20;
    const na=attempts+1; setAttempts(na);
    mp.track("guess_submitted",{cara_id:cara.id,is_correct:ok,attempt_number:na,guess:guess.toLowerCase()});
    if (ok) {
      SFX.correct();
      setTimeout(()=>onResult({correct:true,attempts:na,speedBonus:speed,timeLeft,lastGuess:guess,acceptedAnswer:accepted}),500);
    } else if (na>=MAX_ATTEMPTS) {
      SFX.wrong(); setFlash("wrong");
      setTimeout(()=>onResult({correct:false,attempts:na,speedBonus:false,timeLeft,lastGuess:guess}),600);
    } else {
      SFX.wrong(); setFlash("wrong");
      setTimeout(()=>{ setSelected([]); setTiles(buildBrandTiles(cara.competitors)); setFlash(null); },700);
    }
  }
  const guess=selected.map(s=>s.letter).join("");
  return (
    <>
      {showHint&&<div style={{margin:"6px 16px 4px",padding:"6px 12px",background:"rgba(255,138,101,0.08)",border:"1px solid rgba(255,138,101,0.2)",borderRadius:10,fontSize:12,color:"#FF8A65",flexShrink:0}}>💡 {cara.hint}</div>}
      <div className="brand-bar" style={{border:`1.5px solid ${flash==="wrong"?"rgba(255,138,101,0.6)":"rgba(128,222,234,0.2)"}`,animation:flash==="wrong"?"shake .3s ease":undefined}}>
        {guess
          ? <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:".12em",color:flash==="wrong"?"#FF8A65":"#80DEEA"}}>{guess}</span>
          : <span style={{fontSize:12,color:"#8888AA"}}>Tap letters to guess a brand…</span>
        }
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"2px 16px 4px",flexShrink:0}}>
        <div style={{fontSize:10,color:"#8888AA",textTransform:"uppercase",letterSpacing:".08em"}}>{attempts>0?`Attempt ${attempts+1} of ${MAX_ATTEMPTS}`:"Tap letters to guess…"}</div>
        <div style={{display:"flex",gap:4}}>{Array.from({length:MAX_ATTEMPTS}).map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<attempts?"#FF8A65":"rgba(255,255,255,0.12)"}}/>)}</div>
      </div>
      <div className="tiles-wrap">
        <div className="tiles-grid">
          {tiles.map(t=><div key={t.id} className={`tile${t.used?" used":""}`} onClick={()=>tap(t)}>{t.letter}</div>)}
        </div>
        <div className="tile-actions">
          <button className="t-btn" onClick={shuffle}>🔀 Shuffle</button>
          <button className="t-btn del" onClick={del}>⌫ Delete</button>
          <button className="t-btn" style={{background:selected.length>=2?"rgba(128,222,234,0.15)":"rgba(255,255,255,0.03)",borderColor:selected.length>=2?"rgba(128,222,234,0.5)":"rgba(255,255,255,0.1)",color:selected.length>=2?"#80DEEA":"#8888AA"}} onClick={submit}>✓ Guess</button>
          <button className="t-btn skip" onClick={onSkip}>Skip</button>
        </div>
      </div>
    </>
  );
}

// ─── TILE INPUT ───────────────────────────────────────────────
function TileInput({ cara, onResult, onSkip, attempts, setAttempts, timeLeft }) {
  const answer      = cara.answer.toUpperCase();
  const answerClean = answer.replace(/[^A-Z ]/g,"");
  const words       = answerClean.split(" ");
  const totalL      = answerClean.replace(/ /g,"").length;
  const [tiles,    setTiles]    = useState(()=>cara.competitors?buildBrandTiles(cara.competitors):buildTiles(cara.answer));
  const [selected, setSelected] = useState([]);
  const [slotState,setSlotState]= useState(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(()=>{ setTiles(cara.competitors?buildBrandTiles(cara.competitors):buildTiles(cara.answer)); setSelected([]); setSlotState(null); setShowHint(false); },[cara.id]);
  useEffect(()=>{ if(attempts>=MAX_ATTEMPTS-1){ setShowHint(true); mp.track("hint_shown",{...caraProps(cara, cara._index||0)}); } },[attempts]);

  function tap(tile) {
    if (tile.used||selected.length>=totalL) return; SFX.tap();
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
    if (!selected.length) return; SFX.del();
    const rem=selected[selected.length-1];
    setSelected(p=>p.slice(0,-1));
    setTiles(p=>p.map(t=>t.id===rem.tileId?{...t,used:false}:t));
    setSlotState(null);
  }
  function shuffle() { setSelected([]); setTiles(cara.competitors?buildBrandTiles(cara.competitors):buildTiles(cara.answer)); setSlotState(null); }
  function check(sel) {
    const guess=sel.map(s=>s.letter).join("").toLowerCase();
    const ok=cara.competitors ? isBrandCorrect(guess,cara) : norm(guess)===norm(cara.answer);
    const accepted=ok?(cara.competitors?getAcceptedBrand(guess,cara):cara.answer):null;
    const speed=ok&&timeLeft>20;
    const na=attempts+1; setAttempts(na);
    setSlotState(ok?"correct":"wrong");
    mp.track("guess_submitted",{cara_id:cara.id,is_correct:ok,attempt_number:na,time_left:timeLeft,difficulty:cara.difficulty,category:cara.category,answer_length:totalL,typed_length:guess.length});
    if (ok) {
      SFX.correct();
      setTimeout(()=>onResult({correct:true,attempts:na,speedBonus:speed,timeLeft,lastGuess:sel.map(s=>s.letter).join(""),acceptedAnswer:accepted}),500);
    } else if (na>=MAX_ATTEMPTS) {
      SFX.wrong();
      setTimeout(()=>onResult({correct:false,attempts:na,speedBonus:false,timeLeft,lastGuess:sel.map(s=>s.letter).join("")}),600);
    } else {
      SFX.wrong();
      setTimeout(()=>{ setSelected([]); setTiles(cara.competitors?buildBrandTiles(cara.competitors):buildTiles(cara.answer)); setSlotState(null); },700);
    }
  }
  let si=0;
  const wordSlots=words.map(w=>w.split("").map(()=>{ const s=selected[si]||null; si++; return s; }));
  return (
    <>
      {showHint&&<div style={{margin:"6px 16px 4px",padding:"6px 12px",background:"rgba(255,138,101,0.08)",border:"1px solid rgba(255,138,101,0.2)",borderRadius:10,fontSize:12,color:"#FF8A65",flexShrink:0}}>💡 {cara.hint}</div>}
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
      <div className="tiles-wrap">
        <div className="tiles-grid">
          {tiles.map(t=><div key={t.id} className={`tile${t.used?" used":""}`} onClick={()=>tap(t)}>{t.letter}</div>)}
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

// ─── HYBRID INPUT — Unified tile system (all Cara types) ──────
function HybridInput({ cara, onResult, onSkip, attempts, setAttempts, timeLeft }) {
  const isBrand     = !!cara.competitors;
  const answerClean = cara.answer.toUpperCase().replace(/[^A-Z ]/g,"");
  const words       = answerClean.split(" ");
  const totalL      = answerClean.replace(/ /g,"").length;
  const BRAND_MAX   = 10;
  const maxLen      = isBrand ? BRAND_MAX : totalL;

  const [typed,    setTyped]    = useState([]);   // array of uppercase chars
  const [flash,    setFlash]    = useState(null);  // null | 'wrong' | 'correct'
  const [popping,  setPopping]  = useState(null);  // index of tile currently animating
  const [showHint, setShowHint] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const inputRef = useRef(null);

  // visualViewport keyboard detection (iOS/Android)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function onResize() { setKbHeight(Math.max(0, window.innerHeight - vv.height - vv.offsetTop)); }
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => { vv.removeEventListener("resize", onResize); vv.removeEventListener("scroll", onResize); };
  }, []);

  useEffect(()=>{ setTyped([]); setFlash(null); setPopping(null); setShowHint(false); },[cara.id]);
  useEffect(()=>{ if(attempts>=MAX_ATTEMPTS-1){ setShowHint(true); mp.track("hint_shown",{...caraProps(cara, cara._index||0)}); } },[attempts]);
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(),350); },[cara.id]);

  // Auto-submit when last tile filled (all types)
  useEffect(()=>{
    if (typed.length===totalL && typed.length>0) {
      const t = setTimeout(()=>checkGuess(typed.join("")), 150);
      return ()=>clearTimeout(t);
    }
  },[typed]);

  function addLetter(key) {
    if (typed.length>=maxLen || flash) return;
    SFX.tap();
    if (typed.length===0) {
      mp.track("guess_input_started", {
        ...caraProps(cara, cara._index||0),
        input_mode: "keyboard",
        time_from_cara_start_seconds: Math.round((Date.now() - (cara._startTs||Date.now())) / 1000),
      });
    }
    const idx = typed.length;
    setTyped(prev=>[...prev, key]);
    setPopping(idx);
    setTimeout(()=>setPopping(null), 150);
  }

  function deleteLetter() {
    if (!typed.length) return;
    SFX.del();
    setTyped(prev=>prev.slice(0,-1));
  }

  function checkGuess(guess) {
    const ok       = isBrand ? isBrandCorrect(guess,cara) : norm(guess)===norm(cara.answer);
    const accepted = ok ? (isBrand ? getAcceptedBrand(guess,cara) : cara.answer) : null;
    const speed    = ok && timeLeft>20;
    const na       = attempts+1; setAttempts(na);
    const timeToGuess = Math.round((Date.now() - (cara._startTs||Date.now())) / 1000);
    setFlash(ok?"correct":"wrong");

    const baseGuessProps = {
      ...caraProps(cara, cara._index||0),
      input_mode:               "keyboard",
      answer_length:            totalL,
      submitted_length:         guess.length,
      time_to_guess_seconds:    timeToGuess,
      submitted_before_timeout: timeLeft > 0,
      guess_text_normalized:    norm(guess),
      is_correct:               ok,
      attempt_number:           na,
      time_left:                timeLeft,
    };

    mp.track("guess_submitted", baseGuessProps);

    if (ok) {
      mp.track("guess_correct", {
        ...baseGuessProps,
        score_awarded: 0, // calculated in parent
        streak_after:  0, // calculated in parent
      });
      SFX.correct();
      setTimeout(()=>onResult({correct:true,attempts:na,speedBonus:speed,timeLeft,lastGuess:guess,acceptedAnswer:accepted}),500);
    } else if (na>=MAX_ATTEMPTS) {
      mp.track("guess_wrong", baseGuessProps);
      SFX.wrong();
      setTimeout(()=>onResult({correct:false,attempts:na,speedBonus:false,timeLeft,lastGuess:guess}),600);
    } else {
      mp.track("guess_wrong", baseGuessProps);
      SFX.wrong();
      setTimeout(()=>{ setTyped([]); setFlash(null); setPopping(null); inputRef.current?.focus(); },700);
    }
  }

  function submit() { if (typed.length>=2) checkGuess(typed.join("")); }

  // ── Tile renderer — transparent border-only ─────────────────
  function renderTile(idx) {
    const isFilled = idx < typed.length;
    const isActive = idx === typed.length;
    const letter   = isFilled ? typed[idx] : "";
    const isPop    = popping===idx;

    let bg, border, shadow="none", color, anim;

    if (flash==="wrong") {
      bg     = "transparent";
      border = isFilled ? "rgba(255,80,80,0.95)" : "rgba(255,80,80,0.35)";
      color  = isFilled ? "#FF6060"              : "rgba(255,80,80,0.3)";
      anim   = isFilled ? "slotWrong .35s ease"  : undefined;
    } else if (flash==="correct") {
      bg     = "transparent";
      border = isFilled ? "rgba(74,222,128,0.95)" : "rgba(74,222,128,0.3)";
      color  = isFilled ? "#4ADE80"               : "rgba(74,222,128,0.25)";
      anim   = isFilled ? "slotCorrect .3s ease"  : undefined;
    } else if (isFilled) {
      // Filled: transparent + blue border + very subtle tint so letter pops
      bg     = "rgba(37,99,235,0.1)";
      border = "#3B82F6";
      color  = "#fff";
      anim   = isPop ? "slotPop .13s ease-out" : undefined;
    } else if (isActive) {
      // Active: fully transparent + blue border + soft glow
      bg     = "transparent";
      border = "#60A5FA";
      color  = "#fff";
      shadow = "0 0 0 2px rgba(96,165,250,0.2)";
    } else {
      // Empty: transparent + white border (readable on any bg)
      bg     = "transparent";
      border = "rgba(255,255,255,0.6)";
      color  = "transparent";
    }

    return (
      <div key={idx} style={{
        width:34, height:42, borderRadius:8,
        border:`2.5px solid ${border}`,
        background:bg, boxShadow:shadow,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Bebas Neue',sans-serif", fontSize:20, fontWeight:700,
        color, letterSpacing:".04em",
        // Strong text shadow so letters are always readable over video
        textShadow: isFilled
          ? "0 0 8px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.8)"
          : "none",
        animation:anim,
        transition:"border-color .12s, background .1s, box-shadow .12s",
        userSelect:"none", flexShrink:0,
      }}>
        {letter}
      </div>
    );
  }

  // ── Build tile rows ──────────────────────────────────────────
  // Non-brand: follow word structure, wrap at 9 per row
  // Brand: single dynamic row (grows with input, max BRAND_MAX)
  const tileRows = [];

  if (!isBrand) {
    let gi = 0;
    const wordTiles = words.map(w=>w.split("").map(()=>({ idx:gi++, gap:false })));
    const MAX_PER_ROW = 9;
    let line = [], count = 0;
    wordTiles.forEach((word, wi) => {
      if (count+word.length>MAX_PER_ROW && line.length>0) {
        tileRows.push(line); line=[]; count=0;
      }
      if (line.length>0) line.push({ gap:true, key:`g${wi}` });
      line.push(...word);
      count += word.length;
    });
    if (line.length>0) tileRows.push(line);
  } else {
    // Brand: exact answer length, same as non-brand
    tileRows.push(Array.from({length:totalL},(_,i)=>({idx:i,gap:false})));
  }

  return (
    <div style={{
      position:"fixed", bottom:kbHeight, left:0, right:0,
      maxWidth:420, margin:"0 auto",
      background:"transparent",
      padding:"10px 16px 16px",
      zIndex:50,
      transition:"bottom .15s ease-out",
    }} onClick={()=>inputRef.current?.focus()}>

      {/* Ghost input — captures native keyboard on iOS/Android */}
      <input
        ref={inputRef}
        style={{position:"absolute",opacity:0,pointerEvents:"none",width:1,height:1,top:0}}
        value=""
        onChange={()=>{}}
        onKeyDown={e=>{
          if (e.key==="Backspace")          { e.preventDefault(); deleteLetter(); }
          else if (e.key==="Enter")          { submit(); }
          else if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); addLetter(e.key.toUpperCase()); }
        }}
        onInput={e=>{
          // Handles composition on Android GBoard
          const v = e.target.value;
          if (v) {
            v.toUpperCase().split("").filter(c=>/[A-Z]/.test(c)).forEach(c=>addLetter(c));
            e.target.value="";
          }
        }}
        autoComplete="off" autoCorrect="off" autoCapitalize="characters"
        spellCheck={false} inputMode="text"
      />

      {showHint&&(
        <div style={{marginBottom:8,padding:"6px 12px",background:"rgba(255,138,101,0.1)",border:"1px solid rgba(255,138,101,0.3)",borderRadius:10,fontSize:12,color:"#FF8A65"}}>
          💡 {cara.hint}
        </div>
      )}

      {/* Attempt counter */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".08em"}}>
          {attempts>0 ? `Attempt ${attempts+1} of ${MAX_ATTEMPTS}` : isBrand ? "Type a brand…" : cara.wordCount===1?"1 word":`${cara.wordCount} words`}
        </div>
        <div style={{display:"flex",gap:5}}>
          {Array.from({length:MAX_ATTEMPTS}).map((_,i)=>(
            <div key={i} style={{width:8,height:8,borderRadius:"50%",background:i<attempts?"#FF8A65":i===attempts?"rgba(96,165,250,0.7)":"rgba(255,255,255,0.12)",transition:"background .3s"}}/>
          ))}
        </div>
      </div>

      {/* ── TILES — identical design for all Cara types ── */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:12}}>
        {tileRows.map((row,ri)=>(
          <div key={ri} style={{display:"flex",alignItems:"center",gap:5}}>
            {row.map(item=>{
              if (item.gap) return (
                <div key={item.key} style={{width:8,height:3,borderRadius:2,background:"rgba(255,255,255,0.18)",margin:"0 1px",flexShrink:0}}/>
              );
              return renderTile(item.idx);
            })}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{display:"flex",gap:8}}>
        <button style={{
          flex:1,
          background:"rgba(255,255,255,0.05)",
          border:"1.5px solid rgba(255,255,255,0.15)",
          borderRadius:12, padding:"13px 18px",
          color:"rgba(255,255,255,0.5)",
          fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer",
        }} onClick={onSkip}>Skip</button>
      </div>
    </div>
  );
}

// ─── START ────────────────────────────────────────────────────
function StartScreen({ onStart }) {
  const best=loadJSON("crz_best",0);
  const params=new URLSearchParams(window.location.search);
  const challenge=params.get("c");
  let challenger=null;
  if(challenge){
    const [fc,ft,fs]=challenge.split("-").map(Number);
    if(!isNaN(fc)&&!isNaN(ft)&&!isNaN(fs)) challenger={correct:fc,total:ft,score:fs};
  }
  useEffect(()=>{
    mp.track("landing_page_viewed",{
      hero_version:     challenger ? "challenge" : "default",
      cta_text:         challenger ? "ACCEPT THE CHALLENGE →" : "PLAY NOW — PROVE IT →",
      best_score_shown: best > 0,
      has_challenger:   !!challenger,
    });
  },[]);
  function handleStartClick() {
    mp.track("start_playing_clicked",{
      cta_text:     challenger ? "ACCEPT THE CHALLENGE →" : "PLAY NOW — PROVE IT →",
      hero_version: challenger ? "challenge" : "default",
    });
    onStart();
  }
  const steps=[
    {emoji:"🎬", label:"Watch", desc:"Short charade video"},
    {emoji:"⌨️", label:"Guess", desc:"What it means"},
    {emoji:"🏆", label:"Win",   desc:"Beat the clock"},
  ];
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
        <div className="start-bg" style={challenger?{borderRadius:0,aspectRatio:"unset",paddingTop:28,paddingBottom:24}:{}}>
          <div className="start-glow"/>
          <div className="start-gem">💎</div>
          <div className="start-logo">CARAIDIZ</div>
          <div className="start-tag">The modern charades game</div>

          {/* 3 steps */}
          <div style={{display:"flex",gap:12,marginTop:20,position:"relative",zIndex:1}}>
            {steps.map((s,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:1}}>
                <div style={{width:44,height:44,borderRadius:14,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{s.emoji}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:".08em",color:"#fff"}}>{s.label}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:600,textAlign:"center",lineHeight:1.3}}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Session pills */}
          <div style={{display:"flex",gap:8,marginTop:16,position:"relative",zIndex:1,flexWrap:"wrap",justifyContent:"center"}}>
            <div style={{background:"rgba(128,222,234,0.1)",border:"1px solid rgba(128,222,234,0.2)",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:"#80DEEA",letterSpacing:".06em"}}>💎 {CARAS.length} rounds</div>
            <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:".06em"}}>⏱ ~3 min</div>
            <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:".06em"}}>🔓 No signup</div>
          </div>

          {/* Tension hook */}
          <div style={{marginTop:14,padding:"8px 16px",background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.25)",borderRadius:12,position:"relative",zIndex:1}}>
            <div style={{fontSize:12,fontWeight:800,color:"#FF8A65",letterSpacing:".04em",textAlign:"center"}}>Only 34% reach round 9 👀</div>
          </div>

          {best>0&&<div style={{marginTop:10,fontSize:11,color:"rgba(128,222,234,0.6)",position:"relative",zIndex:1}}>Your best: {best} pts — can you beat it?</div>}
        </div>

        <div className="start-body">
          <button className="start-btn" onClick={handleStartClick} style={challenger?{background:"linear-gradient(135deg,#FF6B35,#FF8A65)",color:"#fff",boxShadow:"0 8px 32px rgba(255,107,53,0.4)"}:{}}>{challenger?"ACCEPT THE CHALLENGE →":"PLAY NOW — PROVE IT →"}</button>
          <div style={{textAlign:"center",fontSize:11,color:"#FF8A65",marginTop:8,fontWeight:700}}>🔥 People are playing this right now</div>
        </div>
        <div style={{display:"none"}}>
          {CARAS.slice(0,3).map(c=><video key={c.id} src={c.videoUrl} preload="auto" muted playsInline/>)}
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
        {index===5&&<div className="level-up">🔥 You're halfway — better than 80% of players</div>}
        <div style={{fontSize:11,color:"#8888AA",marginTop:10}}>Next Cara loading...</div>
      </div>
    </div>
  );
}

// ─── END ──────────────────────────────────────────────────────
const PROLIFIC_COMPLETION_URL = "https://app.prolific.com/submissions/complete?cc=C6K8IAAK";

function EndScreen({ totalScore, correct, bestStreak, sessionStart, onReplay }) {
  const [copied,       setCopied]      = useState(false);
  const [isNew,        setIsNew]       = useState(false);
  const [surveyStep,   setSurveyStep]  = useState(0);
  const [surveyDone,   setSurveyDone]  = useState(false);
  const [answers,      setAnswers]     = useState({});
  const total = CARAS.length;
  const pct   = Math.round(correct / total * 100);
  const ts    = Math.round((Date.now() - sessionStart) / 1000);

  // Detect if user comes from Prolific
  const isProlific = new URLSearchParams(window.location.search).get("utm_source") === "prolific"
    || !!new URLSearchParams(window.location.search).get("PROLIFIC_PID");

  function answerQ(key, value) {
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);
    if (surveyStep < 3) {
      setSurveyStep(s => s + 1);
    } else {
      // All done — track and reveal CTAs
      mp.track("survey_completed", {
        total_score:   totalScore,
        correct_count: correct,
        ...newAnswers,
      });
      setSurveyDone(true);
    }
  }

  const SURVEY_QUESTIONS = [
    {
      key: "enjoyment",
      q: "How enjoyable was it?",
      options: [
        { label: "😕 Not really",  value: 1 },
        { label: "😐 It's ok",     value: 3 },
        { label: "😍 Loved it",    value: 5 },
      ],
    },
    {
      key: "replay_intent",
      q: "Would you play again?",
      options: [
        { label: "No",    value: "no"    },
        { label: "Maybe", value: "maybe" },
        { label: "Yes 🔥", value: "yes"  },
      ],
    },
    {
      key: "attention",
      q: "Did it keep your attention?",
      options: [
        { label: "Not really", value: "no"  },
        { label: "Yes",        value: "yes" },
      ],
    },
    {
      key: "difficulty",
      q: "How was the difficulty?",
      options: [
        { label: "Too easy",  value: "easy"  },
        { label: "Just right", value: "right" },
        { label: "Too hard",  value: "hard"  },
      ],
    },
  ];

  // ── Dynamic content based on score ──────────────────────────
  const isZero    = correct === 0;
  const isMid     = correct >= 1 && correct <= 6;
  const isHigh    = correct >= 7;
  const isPerfect = correct === total;

  const HEADLINES = {
    zero:    ["That was brutal 😅", "Harder than it looks"],
    mid:     ["Not bad 👀",         "You can do better"],
    high:    ["Almost perfect 😤",  "That's strong"],
    perfect: ["Perfect run 👑",     "Untouchable 💎"],
  };
  const headlinePool = isPerfect ? HEADLINES.perfect : isHigh ? HEADLINES.high : isMid ? HEADLINES.mid : HEADLINES.zero;
  const headline     = headlinePool[Math.floor(Math.random() * headlinePool.length)];

  const shareMsg = isZero
    ? `I tried Caraidiz 💎 — it's harder than it looks. Can you do better?\nhttps://caracaraidiz.app/?c=${correct}-${total}-${totalScore}`
    : isHigh
    ? `I got ${correct}/${total} on Caraidiz 😤 beat that.\nhttps://caracaraidiz.app/?c=${correct}-${total}-${totalScore}`
    : `I got ${correct}/${total} on Caraidiz 💎 — can you beat me?\nhttps://caracaraidiz.app/?c=${correct}-${total}-${totalScore}`;

  const dynamicMsg = isZero
    ? "Try this — it's harder than you think"
    : isHigh
    ? `I got ${correct}/${total} 😤 beat that`
    : `I got ${correct}/${total} — can you beat me?`;

  const trophy = isPerfect ? "👑" : isHigh ? "🏆" : isMid ? "⭐" : "💎";

  const socialProof = correct <= 5
    ? "Most players don't get past 5 👀"
    : "Only 5% finish this 💎";

  useEffect(() => {
    const prev = loadJSON("crz_best", 0);
    if (totalScore > prev) { saveJSON("crz_best", totalScore); setIsNew(true); }
    const s = loadJSON("crz_sessions", []);
    s.push({ date: new Date().toISOString(), score: totalScore, correct, streak: bestStreak, time: ts });
    saveJSON("crz_sessions", s.slice(-100));
    mp.track("end_screen_viewed", {
      total_score:     totalScore,
      accuracy_pct:    pct,
      correct_count:   correct,
      best_streak:     bestStreak,
      time_spent_secs: ts,
      is_new_best:     totalScore > prev,
      score_tier:      isZero ? "zero" : isHigh ? "high" : "mid",
    });
  }, []);

  function share() {
    mp.track("share_clicked", { placement: "end_screen", score: totalScore, correct_count: correct });
    if (navigator.share) {
      navigator.share({ text: shareMsg })
        .then(() => mp.track("share_completed", { placement: "end_screen", score: totalScore }))
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareMsg).then(() => {
        mp.track("share_completed", { placement: "end_screen", score: totalScore });
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  return (
    <div className="card">
      <div className="end-screen">

        {/* Logo */}
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:".14em",color:"rgba(255,255,255,0.35)",marginBottom:16}}>CARAIDIZ 💎</div>

        {/* Trophy + Dynamic headline */}
        <div style={{fontSize:48,marginBottom:8,animation:"float 3s ease-in-out infinite"}}>{trophy}</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:".06em",color:"#fff",textAlign:"center",lineHeight:1.1,marginBottom:6,padding:"0 16px"}}>{headline}</div>

        {/* New best badge */}
        {isNew && (
          <div style={{background:"rgba(250,204,21,0.1)",border:"1px solid rgba(250,204,21,0.3)",borderRadius:20,padding:"5px 14px",fontSize:12,color:"#FACC15",fontWeight:800,letterSpacing:".06em",marginBottom:12}}>🏆 NEW PERSONAL BEST</div>
        )}

        {/* Score block */}
        <div className="egrid" style={{width:"100%",marginBottom:16}}>
          <div className="ebox"><div className="en" style={{color:"#80DEEA"}}>{totalScore}</div><div className="el">pts</div></div>
          <div className="ebox"><div className="en" style={{color:"#4ADE80"}}>{correct}/{total}</div><div className="el">correct</div></div>
          <div className="ebox"><div className="en" style={{color:"#FF6B35"}}>🔥{bestStreak}</div><div className="el">streak</div></div>
        </div>

        {/* ── SURVEY — shown before CTAs ── */}
        {!surveyDone ? (
          <div style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"16px",marginBottom:16,animation:"fadeUp .25s ease-out"}}>
            {/* Progress dots */}
            <div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:12}}>
              {SURVEY_QUESTIONS.map((_,i)=>(
                <div key={i} style={{width:6,height:6,borderRadius:"50%",background:i<surveyStep?"#80DEEA":i===surveyStep?"rgba(128,222,234,0.6)":"rgba(255,255,255,0.15)",transition:"background .3s"}}/>
              ))}
            </div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",textAlign:"center",marginBottom:12}}>
              {SURVEY_QUESTIONS[surveyStep].q}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              {SURVEY_QUESTIONS[surveyStep].options.map(opt=>(
                <button key={opt.value} onClick={()=>answerQ(SURVEY_QUESTIONS[surveyStep].key, opt.value)} style={{
                  background:"rgba(255,255,255,0.07)",
                  border:"1.5px solid rgba(255,255,255,0.15)",
                  borderRadius:12, padding:"10px 16px",
                  color:"#fff", fontSize:13, fontWeight:700,
                  cursor:"pointer", transition:"all .15s",
                  fontFamily:"inherit",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Prolific completion button — shown only for Prolific users */}
            {isProlific && (
              <button
                style={{width:"100%",background:"linear-gradient(135deg,#4ADE80,#22C55E)",color:"#000",border:"none",borderRadius:16,padding:"18px 16px",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:".08em",cursor:"pointer",marginBottom:12,boxShadow:"0 8px 32px rgba(74,222,128,0.4)"}}
                onClick={()=>{
                  mp.track("prolific_completion_clicked", { total_score: totalScore, correct_count: correct });
                  window.location.href = PROLIFIC_COMPLETION_URL;
                }}
              >
                ✓ COMPLETE & GET PAID
              </button>
            )}

            {/* Social proof + share msg — shown after survey */}
            <div style={{fontSize:12,fontWeight:800,color:"#80DEEA",letterSpacing:".08em",textTransform:"uppercase",textAlign:"center",marginBottom:12,textShadow:"0 0 20px rgba(128,222,234,0.3)"}}>{socialProof}</div>
            <div style={{fontSize:15,fontWeight:700,color:"#fff",textAlign:"center",marginBottom:16,padding:"0 8px"}}>{dynamicMsg}</div>

            {/* PRIMARY CTA — Share */}
            <button
              style={{width:"100%",background:"linear-gradient(135deg,#FF6B35,#FF8A65)",color:"#fff",border:"none",borderRadius:16,padding:"18px 16px",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:".08em",cursor:"pointer",marginBottom:6,boxShadow:"0 8px 32px rgba(255,107,53,0.4)",animation:"pulseCTA 1.8s ease-in-out infinite"}}
              onClick={share}
            >
              {copied ? "✓ LINK COPIED! 🔥" : "🔥 SEND THIS CHALLENGE"}
            </button>
            <div style={{textAlign:"center",fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:20}}>
              {isZero ? "Make them suffer too 😈" : isHigh ? "They won't beat that 😤" : "They won't beat your score 😏"}
            </div>

            {/* SECONDARY CTA — Play again */}
            <button
              style={{width:"100%",background:"transparent",border:"1.5px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"12px 16px",color:"rgba(255,255,255,0.45)",fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:".06em",cursor:"pointer"}}
              onClick={() => onReplay(totalScore)}
            >
              🔁 PLAY AGAIN
            </button>
          </>
        )}

      </div>
    </div>
  );
}

// ─── GAME SCREEN ──────────────────────────────────────────────
function GameScreen({ cara, totalScore, streak, index, total, attempts, setAttempts, onResult, onSkip }) {
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [phase,    setPhase]    = useState("playing");
  const [result,   setResult]   = useState(null);
  const [extended, setExtended] = useState(false);
  const maxTime = extended ? TIMER_DURATION + EXTEND_SECS : TIMER_DURATION;

  const caraStartTsRef = useRef(Date.now());
  useEffect(()=>{
    setTimeLeft(TIMER_DURATION); setPhase("playing"); setResult(null); setExtended(false);
    caraStartTsRef.current = Date.now();
    // Attach index and startTs to cara object for child components
    cara._index   = index;
    cara._startTs = caraStartTsRef.current;
    mp.track("cara_started", {
      ...caraProps(cara, index, totalScore, streak),
      answer_length:   cara.answer.replace(/[^A-Za-z]/g,"").length,
      has_timer:       true,
      timer_seconds:   TIMER_DURATION,
      difficulty_label: cara.difficulty,
    });
  },[cara.id]);

  useEffect(()=>{
    if (phase!=="playing") return;
    if (timeLeft<=0) {
      SFX.timeUp();
      const timeSpentSecs = Math.round((Date.now() - caraStartTsRef.current) / 1000);
      mp.track("timer_expired", {
        ...caraProps(cara, index, totalScore, streak),
        had_partial_input:          attempts > 0,
        input_length_before_timeout: 0,
        extended,
        time_spent_seconds: timeSpentSecs,
      });
      mp.track("cara_completed", {
        ...caraProps(cara, index, totalScore, streak),
        completion_type:    "timeout",
        score_after:        totalScore,
        streak_after:       0,
        time_spent_seconds: timeSpentSecs,
        guesses_count:      attempts,
      });
      const r={correct:false,attempts:attempts||1,speedBonus:false,timedOut:true,timeLeft:0,lastGuess:"",extended};
      setResult(r); setPhase("revealed"); return;
    }
    if (timeLeft<=5) SFX.tick();
    const t=setTimeout(()=>setTimeLeft(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timeLeft,phase]);

  function handleResult(res) {
    const timeSpentSecs = Math.round((Date.now() - caraStartTsRef.current) / 1000);
    const completionType = res.timedOut ? "timeout" : res.correct ? "correct" : attempts >= MAX_ATTEMPTS ? "wrong" : "skipped";
    const newStreak = res.correct ? streak + 1 : 0;
    mp.track("cara_completed", {
      ...caraProps(cara, index, totalScore, streak),
      completion_type:    completionType,
      score_after:        totalScore,
      streak_after:       newStreak,
      time_spent_seconds: timeSpentSecs,
      guesses_count:      res.attempts || 0,
    });
    mp.track("result_screen_viewed", {
      ...caraProps(cara, index, totalScore, streak),
      completion_type: completionType,
      score_after:     totalScore,
      streak_after:    newStreak,
    });
    setResult({...res,extended}); setPhase("revealed");
  }

  function handleExtend() {
    mp.track("timer_extended",{cara_id:cara.id,time_left:timeLeft});
    setExtended(true);
    setTimeLeft(t=>t+EXTEND_SECS);
  }

  const showExtend = phase==="playing" && timeLeft<=5 && !extended;
  const isLast     = index===total-1;
  const nextDiff   = CARAS[index+1]?.difficulty;
  const nextLabel  = isLast?"SEE MY RESULTS 🏆":result?.correct&&streak>=3?"KEEP THE STREAK 🔥→":!result?.correct?"REDEMPTION ROUND →":"NEXT CHALLENGE 🔥";
  const tease      = isLast?"":nextDiff==="hard"?"⚠️ Next one is harder":nextDiff==="expert"?"🔥 EXPERT LEVEL — final Cara":"💎 Next loading...";
  const showScore  = result&&phase==="revealed";

  return (
    <div className="card">

      {/* ══ FULLSCREEN VIDEO BASE ══ */}
      <div style={{position:"relative", height:"100svh", overflow:"hidden"}}>
        <VideoBlock cara={cara} height="100svh"/>

        {/* TOPBAR — floating top gradient */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, zIndex:20,
          background:"linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
          padding:"10px 16px 24px",
        }}>
          <div className="topbar" style={{padding:0, marginBottom:6}}>
            <div className="logo-s">CARAI<span>DIZ</span> 💎</div>
            <div className="score-pill">
              {streak>=2&&<span className="streak-n">🔥 {streak}</span>}
              <span>{totalScore} pts</span>
            </div>
          </div>
          <div className="prog" style={{padding:0}}>
            <div className="prog-lbl"><span>Cara {index+1} of {total}</span><span>{Math.round(index/total*100)}% done</span></div>
            <div className="prog-track"><div className="prog-fill" style={{width:`${index/total*100}%`}}/></div>
            <div className="pips">{CARAS.map((_,i)=><div key={i} className="pip" style={{background:i<index?"#80DEEA":i===index?"rgba(128,222,234,0.4)":"rgba(255,255,255,0.08)"}}/>)}</div>
          </div>
        </div>

        {/* FLOATING OVERLAYS */}
        {phase==="playing"&&<TimerOverlay timeLeft={timeLeft} maxTime={maxTime}/>}
        {phase==="playing"&&<BlurredCommentsScroll/>}
        {phase==="playing"&&<StatsSidebar cara={cara}/>}
        {phase==="revealed"&&result&&<TikTokReveal cara={cara} result={result}/>}

        {/* +15s BUTTON — floating bottom */}
        {showExtend&&(
          <div style={{position:"absolute", bottom:180, left:0, right:0, zIndex:30, padding:"0 16px"}}>
            <button className="extend-btn" style={{margin:0,width:"100%"}} onClick={handleExtend}>
              ⏱ +15 secondes
              <span style={{fontSize:11,opacity:.75,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>(-{EXTEND_PENALTY} pts)</span>
            </button>
          </div>
        )}

        {/* REVEALED bottom panel — floating */}
        {phase==="revealed"&&result&&(
          <div style={{
            position:"absolute", bottom:0, left:0, right:0, zIndex:30,
            background:"linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.82) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0.18) 85%, transparent 100%)",
            padding:"40px 16px 32px",
          }}>
            {showScore&&(
              <div className="score-row" style={{padding:0, marginBottom:8}}>
                <div className="sc"><div className="sc-n" style={{color:result.correct?"#4ADE80":"#FF8A65"}}>+{result.correct?scoreFor(result.attempts,streak,result.speedBonus,result.extended):0}</div><div className="sc-l">Points</div></div>
                <div className="sc"><div className="sc-n" style={{color:"#80DEEA"}}>{totalScore}</div><div className="sc-l">Total</div></div>
                <div className="sc"><div className="sc-n" style={{color:"#FF6B35"}}>{streak}</div><div className="sc-l">🔥 Streak</div></div>
              </div>
            )}
            {streak>=3&&(
              <div className="streak-banner" style={{margin:"0 0 8px"}}>
                <span style={{fontSize:22}}>🔥</span>
                <div><div style={{fontWeight:800,fontSize:13}}>{streak} in a row!</div><div style={{fontSize:11,opacity:.85}}>Don't stop now</div></div>
              </div>
            )}
            <div className="next-wrap" style={{marginTop:8, padding:0}}>
              <button className="next-btn" onClick={()=>{
                mp.track("next_challenge_clicked",{
                  ...caraProps(cara, index, totalScore, streak),
                  completion_type: result?.timedOut?"timeout":result?.correct?"correct":"wrong",
                  score_after: totalScore,
                });
                onResult(result);
              }}>{nextLabel}</button>
              {tease&&<div className="next-tease">{tease}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Preload next videos silently */}
      <VideoPreloader currentIndex={index}/>

      {/* INPUT — fixed overlay, transparent */}
      {phase==="playing"&&(
        <HybridInput cara={cara} onResult={handleResult} onSkip={onSkip} attempts={attempts} setAttempts={setAttempts} timeLeft={timeLeft}/>
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

  function start() {
    mp.newSession(); // new session_id for each play
    const sessionNum = loadJSON("crz_session_count", 0) + 1;
    saveJSON("crz_session_count", sessionNum);
    const params = new URLSearchParams(window.location.search);
    const hasChallenge = !!params.get("c");
    mp.track("session_started", {
      round_total:       CARAS.length,
      session_number:    sessionNum,
      is_returning_user: sessionNum > 1,
      entry_point:       hasChallenge ? "shared_link" : sessionNum > 1 ? "replay" : "landing",
    });
    setScreen("game");
  }

  function handleResult(res) {
    const ns  = res.correct ? streak+1 : 0;
    const pts = res.correct ? scoreFor(res.attempts,ns,res.speedBonus,res.extended) : 0;
    const newTotal = total + pts;
    setStreak(ns); setBest(b=>Math.max(b,ns));
    setTotal(t=>t+pts);
    if (res.correct) setCorrect(c=>c+1);
    if (isLast) {
      const totalCorrect = correct + (res.correct?1:0);
      const ts = Math.round((Date.now() - sessionStart) / 1000);
      mp.track("session_complete", {
        total_score:              newTotal,
        caras_completed:          CARAS.length,
        correct_count:            totalCorrect,
        wrong_count:              CARAS.length - totalCorrect,
        timeout_count:            0,
        final_streak:             ns,
        session_duration_seconds: ts,
      });
      setScreen("end");
      return;
    }
    if ((index+1)%2===0) { setIndex(i=>i+1); setAttempts(0); setScreen("pause"); }
    else { setIndex(i=>i+1); setAttempts(0); }
  }

  function handleSkip() {
    setStreak(0);
    mp.track("guess_skipped", {
      ...caraProps(cara, index, total, streak),
      time_from_cara_start_seconds: 0,
    });
    handleResult({correct:false,attempts:0,speedBonus:false,timedOut:false,timeLeft:TIMER_DURATION,lastGuess:"",extended:false});
  }

  function handleReplay(prevScore) {
    mp.track("replay_clicked", {
      previous_score:             prevScore || total,
      previous_completion_status: "completed",
    });
    setIndex(0); setScreen("start"); setAttempts(0); setTotal(0); setStreak(0); setCorrect(0);
  }

  if (screen==="start") return <><style>{G}</style><StartScreen onStart={start}/></>;
  if (screen==="pause") return <><style>{G}</style><PauseScreen index={index} total={CARAS.length} streak={streak} correct={correct} onNext={()=>setScreen("game")}/></>;
  if (screen==="end")   return <><style>{G}</style><EndScreen totalScore={total} correct={correct} bestStreak={best} sessionStart={sessionStart} onReplay={handleReplay}/></>;

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
