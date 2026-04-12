// ============================================================
//  CARAIDIZ 💎 — v6
//  Fixed video layout · Big timer · +15s · Uniform tiles · Brand mode
// ============================================================

import { useState, useEffect, useRef } from "react";

// ─── MIXPANEL ─────────────────────────────────────────────────
const MIXPANEL_TOKEN = "2b1e84ea597387914b63c3662f751e5b";
const mp = {
  init() {
    if (!MIXPANEL_TOKEN || MIXPANEL_TOKEN === "YOUR_TOKEN_HERE") return;
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
  { id:1, category:"Song",              answer:"Thriller",            wordCount:1, difficulty:"easy",   hint:"Michael Jackson. Zombies. 🕺",          videoUrl:`${CDN}/thriller.mp4.mp4`,    firstGuessRate:61, stats:{likes:"2.8k",comments:"134"} },
  { id:2, category:"Song",              answer:"Umbrella",            wordCount:1, difficulty:"easy",   hint:"Rihanna. Rain. ☂️",                     videoUrl:`${CDN}/umbrella.mp4.mp4`,    firstGuessRate:58, stats:{likes:"1.9k",comments:"89"} },
  { id:3, category:"Brand",             answer:"Gillette",            wordCount:1, difficulty:"easy",   hint:"The best a man can get 🪒",              videoUrl:`${CDN}/gillette.mp4.mp4`,    firstGuessRate:55, stats:{likes:"3.1k",comments:"167"}, competitors:["GILLETTE","SCHICK","BIC","HARRY'S"] },
  { id:4, category:"Brand",             answer:"Revlon",              wordCount:1, difficulty:"medium", hint:"Iconic American beauty brand 💄",         videoUrl:`${CDN}/revlon.mp4.mp4`,      firstGuessRate:48, stats:{likes:"2.4k",comments:"112"}, competitors:["REVLON","LOREAL","MAYBELLINE","FENTY","MAC"] },
  { id:5, category:"Phrase",            answer:"I break up with you", wordCount:5, difficulty:"medium", hint:"End of a relationship 💔",               videoUrl:`${CDN}/i-break-up.mp4.mp4`,  firstGuessRate:43, stats:{likes:"4.2k",comments:"203"} },
  { id:6, category:"TV Show Character", answer:"JR Ewing",            wordCount:2, difficulty:"hard",   hint:"Dallas. The ultimate villain. 🤠",        videoUrl:`${CDN}/jr-ewing.mp4.mp4`,    firstGuessRate:28, stats:{likes:"1.1k",comments:"58"} },
  { id:7, category:"Phrase",            answer:"Would you marry me",  wordCount:4, difficulty:"hard",   hint:"The most important question 💍",          videoUrl:`${CDN}/marry-me.mp4.mp4`,    firstGuessRate:35, stats:{likes:"5.6k",comments:"289"} },
  { id:8, category:"TV Show Character", answer:"Olivia Pope",         wordCount:2, difficulty:"expert", hint:"Scandal. Fixer extraordinaire. 👗",        videoUrl:`${CDN}/olivia-pope.mp4.mp4`, firstGuessRate:18, stats:{likes:"2.0k",comments:"94"} },
  { id:9, category:"Bonus",             answer:"Coldplay Kiss Cam",   wordCount:3, difficulty:"expert", hint:"A stadium moment + British band 🎸",      videoUrl:`${CDN}/coldplay.mp4.mp4`,    firstGuessRate:22, stats:{likes:"7.3k",comments:"412"} },
];

// ─── TIKTOK COMMENTS ──────────────────────────────────────────
const TIKTOK_COMMENTS = {
  1:[
    {user:"moonchild99",  text:"THRILLER 🕺 instantly", correct:true},
    {user:"beats4life",   text:"i said beat it 😭",      correct:false},
    {user:"jxsmine__",    text:"too easy lmaooo 🔥",     correct:true},
    {user:"d4ncing.star", text:"the zombie walk 💀",      correct:null},
  ],
  2:[
    {user:"riri.fan4ever", text:"UMBRELLA ☂️ first try", correct:true},
    {user:"musichead22",   text:"rain on me?? 😭",        correct:false},
    {user:"pop.culture.x", text:"rihanna era unlocked 🔥",correct:true},
    {user:"guessqueen",    text:"this is too obvious omg", correct:null},
  ],
  3:[
    {user:"Yoro.thai",    text:"Maybe Wilkinson?",        correct:false},
    {user:"Suza3",        text:"Gillette ✓",              correct:true},
    {user:"razor.guy",    text:"schick?? idk",            correct:false},
    {user:"gym.bro.x",    text:"harry's for sure",        correct:false},
    {user:"blademaster",  text:"gillette the best 🪒",    correct:true},
  ],
  4:[
    {user:"beautyqueen",  text:"loreal duh ✓",           correct:true},
    {user:"makeupjunkie", text:"maybelline??",            correct:false},
    {user:"fentygang",    text:"fenty beauty omg ✓",     correct:true},
    {user:"glam.era",     text:"i said sephora 💀",       correct:false},
  ],
  5:[
    {user:"dramaqueen__", text:"I BREAK UP WITH YOU 💔",  correct:true},
    {user:"overthinking", text:"we need to talk??",       correct:false},
    {user:"relationshipx", text:"felt that one 😭",       correct:null},
    {user:"xoxo.vibes",   text:"got it first try 🔥",     correct:true},
  ],
  6:[
    {user:"dallasera",    text:"JR EWING 🤠 iconic",      correct:true},
    {user:"tvbuff99",     text:"no idea who this is ngl",  correct:false},
    {user:"soapfan2000",  text:"DALLAS ERA omg yes",       correct:true},
    {user:"classic.tv",   text:"legend of television 👑",  correct:null},
  ],
  7:[
    {user:"romantic.x",   text:"WOULD YOU MARRY ME 💍",   correct:true},
    {user:"proposal.era", text:"crying rn fr 😭",          correct:null},
    {user:"loveisblind",  text:"is it a proposal phrase?", correct:false},
    {user:"yesidoo",      text:"got it instantly 🔥",      correct:true},
  ],
  8:[
    {user:"scandalfan",   text:"OLIVIA POPE 👗🔥",         correct:true},
    {user:"greysfan",     text:"grey's anatomy??",         correct:false},
    {user:"suitsfan",     text:"i said suits person",      correct:false},
    {user:"gladiator_",   text:"it's handled 💎",          correct:null},
  ],
  9:[
    {user:"coldplayfan",  text:"COLDPLAY KISS CAM 🎸",     correct:true},
    {user:"stadiumlove",  text:"concert something??",      correct:false},
    {user:"musicera22",   text:"TOP 5% 💎 legend",         correct:null},
    {user:"yellowvibes",  text:"iconic moment omg",        correct:true},
  ],
};

const MAX_ATTEMPTS   = 3;
const TIMER_DURATION = 30;
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
  .vid-gradient{position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(to top,rgba(18,18,32,1) 0%,transparent 100%);pointer-events:none}
  .cat-badge{position:absolute;top:10px;left:10px;z-index:5;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(8px);white-space:nowrap;background:rgba(0,0,0,0.55)}
  .hint-badge{position:absolute;top:10px;right:10px;z-index:5;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;color:#fff;backdrop-filter:blur(4px)}
  .mute-btn{position:absolute;bottom:14px;right:12px;z-index:5;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;backdrop-filter:blur(4px)}

  /* ── BIG TIMER ── */
  .timer-overlay{position:absolute;bottom:16px;left:14px;z-index:6;display:flex;align-items:center;gap:8px}
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
  @keyframes slotPop{0%{transform:scale(.75)}100%{transform:scale(1)}}

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
  .cmt-ov-line{height:9px;border-radius:5px;background:rgba(255,255,255,0.18);filter:blur(4px)}
  .cmt-ov-lock{display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(128,222,234,0.9);font-weight:700;letter-spacing:.04em;margin-top:2px}

  /* ── TIKTOK REVEAL OVERLAY ── */
  .tiktok-overlay{position:absolute;inset:0;z-index:7;pointer-events:none;display:flex;flex-direction:column;justify-content:flex-end}
  .tiktok-result{padding:8px 14px 4px;background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 100%)}
  .tiktok-answer{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.08em;color:#fff;text-shadow:0 0 20px rgba(255,255,255,0.3);margin-bottom:2px}
  .tiktok-label{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px}
  .tiktok-label.ok{color:#4ADE80}
  .tiktok-label.no{color:#FF8A65}
  .tiktok-cmts{padding:0 14px 10px;display:flex;flex-direction:column;gap:4px}
  .tiktok-cmt{display:flex;align-items:center;gap:6px;animation:slideUp .3s ease-out both}
  .tiktok-cmt-user{font-size:11px;font-weight:800;color:rgba(255,255,255,0.7)}
  .tiktok-cmt-text{font-size:12px;font-weight:500}
  .tiktok-cmt-text.correct{color:#4ADE80}
  .tiktok-cmt-text.wrong{color:rgba(255,255,255,0.65)}
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
  function toggle() {
    SFX.init();
    const n=!muted; setMuted(n); SFX._on=n; saveJSON("crz_sfx",n);
    if (ref.current) ref.current.muted=n;
  }
  return (
    <div className="vid-wrap" style={{height}}>
      {cara.videoUrl
        ? <video ref={ref} src={cara.videoUrl} autoPlay muted loop playsInline style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center center"}}/>
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

// ─── TIMER OVERLAY (on video) ─────────────────────────────────
function TimerOverlay({ timeLeft, maxTime }) {
  const cls  = timeLeft>15?"ok":timeLeft>8?"warn":"danger";
  const tCol = timeLeft>15?"#80DEEA":timeLeft>8?"#FACC15":"#FF8A65";
  const pct  = Math.min(100,(timeLeft/maxTime)*100);
  return (
    <>
      <div className="timer-overlay">
        <div className={`timer-circle ${cls}`}>{timeLeft}</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".08em"}}>sec</div>
      </div>
      <div className="timer-track">
        <div className="timer-fill-bar" style={{width:`${pct}%`,background:tCol}}/>
      </div>
    </>
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
      {/* SIDEBAR */}
      <div className="tiktok-sidebar">
        <div className="tiktok-stat">
          <span className="tiktok-stat-icon">❤️</span>
          <span className="tiktok-stat-num">{stats.likes}</span>
        </div>
        <div className="tiktok-stat">
          <span className="tiktok-stat-icon">💬</span>
          <span className="tiktok-stat-num">{stats.comments}</span>
        </div>
        <div className="tiktok-stat">
          <span className="tiktok-stat-icon">↗️</span>
          <span className="tiktok-stat-num">Share</span>
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
          {cara.competitors&&<div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2}}>Also valid: {cara.competitors.filter(c=>norm(c)!==norm(result.acceptedAnswer||cara.answer)).join(" · ")}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── BLURRED COMMENTS SCROLL (during gameplay) ───────────────
const BLUR_ROWS = [
  {w:"62%"},{w:"44%"},{w:"71%"},{w:"38%"},{w:"55%"},
  {w:"48%"},{w:"66%"},{w:"41%"},{w:"58%"},{w:"35%"},
];
function BlurredCommentsScroll() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const t = setInterval(()=>setOffset(o=>o+1), 1800);
    return ()=>clearInterval(t);
  }, []);
  const visible = [0,1,2].map(i=>BLUR_ROWS[(offset+i)%BLUR_ROWS.length]);
  return (
    <div style={{position:"absolute",bottom:48,left:0,right:0,zIndex:6,padding:"8px 14px 4px",background:"linear-gradient(to top,rgba(0,0,0,0.72) 0%,transparent 100%)"}}>
      {visible.map((r,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,opacity:i===0?0.35:i===1?0.55:0.7,transition:"opacity .4s"}}>
          <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(255,255,255,0.18)",flexShrink:0}}/>
          <div style={{height:9,borderRadius:5,background:"rgba(255,255,255,0.18)",filter:"blur(5px)",width:r.w}}/>
        </div>
      ))}
      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"rgba(128,222,234,0.85)",fontWeight:700,letterSpacing:".03em",marginTop:2}}>
        <span>🔒</span><span>Guess to reveal what others said</span>
      </div>
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
  useEffect(()=>{ if(attempts>=MAX_ATTEMPTS-1) setShowHint(true); },[attempts]);

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
  const [tiles,    setTiles]    = useState(()=>buildTiles(cara.answer));
  const [selected, setSelected] = useState([]);
  const [slotState,setSlotState]= useState(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(()=>{ setTiles(buildTiles(cara.answer)); setSelected([]); setSlotState(null); setShowHint(false); },[cara.id]);
  useEffect(()=>{ if(attempts>=MAX_ATTEMPTS-1) setShowHint(true); },[attempts]);

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
          {!challenger&&<div className="start-badge">💎 {CARAS.length} Caras to beat</div>}
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
        {index===5&&<div className="level-up">🔥 You're halfway — better than 80% of players</div>}
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
    const link=`https://caracaraidiz.app/?c=${correct}-${CARAS.length}-${totalScore}`;
    const text=`I got ${correct}/${CARAS.length} on Caraidiz 💎 Think you can beat me?\n${link}`;
    mp.track("score_shared",{correct,score:totalScore,streak:bestStreak});
    if(navigator.share){ navigator.share({text}).catch(()=>{}); }
    else { navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}); }
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
          <div className="ebox"><div className="en" style={{color:"#4ADE80"}}>{correct}/{CARAS.length}</div><div className="el">correct</div></div>
          <div className="ebox"><div className="en" style={{color:"#FF6B35"}}>🔥{bestStreak}</div><div className="el">streak</div></div>
        </div>
        <div style={{fontSize:13,color:"#8888AA",textAlign:"center",marginBottom:12}}>{ego}</div>
        <div style={{fontSize:12,fontWeight:800,color:"#80DEEA",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,textShadow:"0 0 20px rgba(128,222,234,0.4)"}}>ONLY 5% FINISH THIS 💎</div>
        <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:10}}>I got {correct}/{CARAS.length} — can you beat me?</div>
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
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [phase,    setPhase]    = useState("playing");
  const [result,   setResult]   = useState(null);
  const [extended, setExtended] = useState(false);
  const maxTime = extended ? TIMER_DURATION + EXTEND_SECS : TIMER_DURATION;

  useEffect(()=>{ setTimeLeft(TIMER_DURATION); setPhase("playing"); setResult(null); setExtended(false); },[cara.id]);

  useEffect(()=>{
    if (phase!=="playing") return;
    if (timeLeft<=0) {
      SFX.timeUp();
      mp.track("timer_expired",{cara_id:cara.id});
      const r={correct:false,attempts:attempts||1,speedBonus:false,timedOut:true,timeLeft:0,lastGuess:"",extended};
      setResult(r); setPhase("revealed"); return;
    }
    if (timeLeft<=5) SFX.tick();
    const t=setTimeout(()=>setTimeLeft(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timeLeft,phase]);

  function handleResult(res) { setResult({...res,extended}); setPhase("revealed"); }

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

      {/* ══ TOP — always visible ══ */}
      <div className="game-top">
        <div className="topbar">
          <div className="logo-s">CARAI<span>DIZ</span> 💎</div>
          <div className="score-pill">
            {streak>=2&&<span className="streak-n">🔥 {streak}</span>}
            <span>{totalScore} pts</span>
          </div>
        </div>
        <div className="prog">
          <div className="prog-lbl"><span>Cara {index+1} of {total}</span><span>{Math.round(index/total*100)}% done</span></div>
          <div className="prog-track"><div className="prog-fill" style={{width:`${index/total*100}%`}}/></div>
          <div className="pips">{CARAS.map((_,i)=><div key={i} className="pip" style={{background:i<index?"#80DEEA":i===index?"rgba(128,222,234,0.4)":"rgba(255,255,255,0.08)"}}/>)}</div>
        </div>
        {/* VIDEO + TIMER OVERLAY */}
        <div style={{position:"relative"}}>
          <VideoBlock cara={cara} height="60vh"/>
          {phase==="playing"&&<TimerOverlay timeLeft={timeLeft} maxTime={maxTime}/>}
          {phase==="playing"&&<BlurredCommentsScroll/>}
          {phase==="revealed"&&result&&<TikTokReveal cara={cara} result={result}/>}
        </div>
        {/* +15s BUTTON */}
        {showExtend&&(
          <button className="extend-btn" onClick={handleExtend}>
            ⏱ +15 secondes
            <span style={{fontSize:11,opacity:.75,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>(-{EXTEND_PENALTY} pts)</span>
          </button>
        )}
      </div>

      {/* ══ SCROLL ZONE ══ */}
      <div className="game-scroll">

        {/* PLAYING */}
        {phase==="playing"&&(
          <>
            {cara.category==="Brand"
              ? <BrandTileInput cara={cara} onResult={handleResult} onSkip={onSkip} attempts={attempts} setAttempts={setAttempts} timeLeft={timeLeft}/>
              : <TileInput cara={cara} onResult={handleResult} onSkip={onSkip} attempts={attempts} setAttempts={setAttempts} timeLeft={timeLeft}/>
            }
          </>
        )}

        {/* REVEALED */}
        {phase==="revealed"&&result&&(
          <>
            {showScore&&(
              <div className="score-row">
                <div className="sc"><div className="sc-n" style={{color:result.correct?"#4ADE80":"#FF8A65"}}>+{result.correct?scoreFor(result.attempts,streak,result.speedBonus,result.extended):0}</div><div className="sc-l">Points</div></div>
                <div className="sc"><div className="sc-n" style={{color:"#80DEEA"}}>{totalScore}</div><div className="sc-l">Total</div></div>
                <div className="sc"><div className="sc-n" style={{color:"#FF6B35"}}>{streak}</div><div className="sc-l">🔥 Streak</div></div>
              </div>
            )}

            {streak>=3&&(
              <div className="streak-banner">
                <span style={{fontSize:22}}>🔥</span>
                <div><div style={{fontWeight:800,fontSize:13}}>{streak} in a row!</div><div style={{fontSize:11,opacity:.85}}>Don't stop now</div></div>
              </div>
            )}

            <div className="next-wrap" style={{marginTop:8}}>
              <button className="next-btn" onClick={()=>onResult(result)}>{nextLabel}</button>
              {tease&&<div className="next-tease">{tease}</div>}
            </div>
          </>
        )}
      </div>
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
    const pts = res.correct ? scoreFor(res.attempts,ns,res.speedBonus,res.extended) : 0;
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
    handleResult({correct:false,attempts:0,speedBonus:false,timedOut:false,timeLeft:TIMER_DURATION,lastGuess:"",extended:false});
  }

  function handleReplay() { setIndex(0); setScreen("start"); setAttempts(0); setTotal(0); setStreak(0); setCorrect(0); }

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
