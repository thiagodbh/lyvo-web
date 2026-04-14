import React, { useState, useEffect } from 'react';

const LYVO_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap");
/* ═══════════════════════════════════════════
   LYVO v3 — DESIGN SYSTEM
   Paleta: Navy + Teal elétrico + Coral + Cream
═══════════════════════════════════════════ */
:root{
  /* Brand */
  --teal:       #00D9B8;
  --teal-dark:  #00B89C;
  --teal-dim:   #00A98D;
  --teal-glow:  rgba(0,217,184,.18);
  --teal-light: #E6FAF7;
  --teal-text:  #006B5E;

  --coral:      #FF6247;
  --coral-dark: #E8502F;
  --coral-light:#FFF0ED;
  --coral-text: #8B2A18;

  /* Ink (escuro) */
  --ink:        #0B1426;
  --ink2:       #132038;
  --ink3:       #1C2E4A;
  --ink-muted:  rgba(255,255,255,.55);
  --ink-faint:  rgba(255,255,255,.12);

  /* Cream (claro) */
  --cream:      #FAF9F4;
  --cream2:     #F4F3EC;
  --cream3:     #ECEAE0;

  /* Text */
  --text:       #0B1426;
  --text2:      #3C4F6B;
  --text3:      #7A8BA3;
  --text4:      #A8B6C8;

  /* UI */
  --border:     #E4E2D8;
  --border2:    #D4D2C8;
  --chat-bg:    #EDE5D8;
  --white:      #FFFFFF;

  /* Type */
  --display: 'Sora', sans-serif;
  --body:    'DM Sans', -apple-system, sans-serif;

  /* Layout */
  --max: 1320px;
  --r:   18px;
  --r-sm:10px;
  --pill:999px;
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:var(--body);color:var(--text);background:var(--white);overflow-x:hidden;-webkit-font-smoothing:antialiased;line-height:1.6}

/* ── TOPBAR urgência ── */
.topbar{
  background:var(--coral);height:44px;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-size:13px;font-weight:600;
  color:#fff;gap:12px;padding:0 20px;text-align:center;
}
.topbar-timer{
  background:rgba(0,0,0,.2);border-radius:4px;
  padding:2px 10px;font-size:13px;letter-spacing:.04em;
  font-weight:700;min-width:60px;text-align:center;
}
.topbar a{color:#fff;text-decoration:underline;font-weight:700}
@media(max-width:560px){.topbar-text-long{display:none}}

/* ── NAVBAR ── */
header{
  background:var(--white);
  border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:200;
}
nav{
  max-width:var(--max);margin:0 auto;
  padding:0 40px;height:68px;
  display:flex;align-items:center;justify-content:space-between;gap:24px;
}
.logo{
  text-decoration:none;display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.logo-mark{
  width:34px;height:34px;background:var(--ink);border-radius:9px;
  display:flex;align-items:center;justify-content:center;position:relative;
  overflow:hidden;
}
.logo-mark::after{
  content:'';position:absolute;
  width:20px;height:20px;background:var(--teal);
  border-radius:50%;left:-4px;bottom:-4px;opacity:.8;
}
.logo-mark svg{width:16px;height:16px;fill:#fff;position:relative;z-index:1}
.logo-word{
  font-family:var(--display);font-size:21px;font-weight:900;
  color:var(--ink);letter-spacing:-0.04em;
}
.logo-word sup{font-size:10px;font-weight:600;color:var(--text3);vertical-align:super;letter-spacing:0}
.nav-links{display:flex;gap:2px;list-style:none;flex:1;justify-content:center}
.nav-links a{
  font-family:var(--body);font-size:15px;font-weight:400;color:var(--text2);
  text-decoration:none;padding:7px 14px;border-radius:var(--r-sm);
  transition:color .15s,background .15s;
}
.nav-links a:hover{color:var(--ink);background:var(--cream)}
.nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.btn-entrar{
  font-family:var(--body);font-size:14px;font-weight:500;color:var(--text2);
  text-decoration:none;padding:8px 16px;border-radius:var(--r-sm);
  border:1px solid var(--border2);transition:all .15s;
  background:none;cursor:pointer;
}
.btn-entrar:hover{background:var(--cream);color:var(--ink)}
.btn-comprar{
  font-family:var(--display);font-size:14px;font-weight:700;
  color:var(--ink);background:var(--teal);
  padding:9px 22px;border-radius:var(--pill);
  text-decoration:none;transition:all .15s;
  display:flex;align-items:center;gap:6px;
}
.btn-comprar:hover{background:var(--teal-dark);transform:translateY(-1px);box-shadow:0 6px 20px var(--teal-glow)}
@media(max-width:860px){.nav-links{display:none}nav{padding:0 20px}}

/* ── HERO ── */
.hero{
  background:var(--ink);
  padding:80px 24px 0;
  text-align:center;
  overflow:hidden;
  position:relative;
}
.hero::before{
  content:'';position:absolute;
  width:900px;height:900px;
  background:radial-gradient(circle, var(--teal-glow) 0%, transparent 65%);
  top:-300px;left:50%;transform:translateX(-50%);
  pointer-events:none;
}
.hero-inner{max-width:800px;margin:0 auto;position:relative}
.hero-badge{
  display:inline-flex;align-items:center;gap:8px;
  border:1px solid rgba(0,217,184,.3);
  background:rgba(0,217,184,.06);
  color:var(--teal);border-radius:var(--pill);
  font-family:var(--display);font-size:12px;font-weight:600;
  padding:7px 16px;margin-bottom:32px;letter-spacing:.05em;
  text-transform:uppercase;
}
.hero-badge-pulse{
  width:6px;height:6px;background:var(--teal);border-radius:50%;
  animation:pulse 2s ease-in-out infinite;
}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}

.hero h1{
  font-family:var(--display);
  font-size:clamp(38px,6vw,70px);
  font-weight:900;
  line-height:1.05;
  letter-spacing:-0.045em;
  color:#fff;
  margin-bottom:8px;
}
.hero h1 .hl{color:var(--teal)}
.hero h1 .hl-coral{color:var(--coral)}
.hero-reframe{
  font-family:var(--display);
  font-size:clamp(15px,2vw,19px);
  font-weight:500;
  color:rgba(255,255,255,.5);
  margin-bottom:28px;
  letter-spacing:-0.01em;
}
.hero-sub{
  font-size:18px;color:rgba(255,255,255,.65);
  line-height:1.7;max-width:560px;margin:0 auto 44px;
  font-weight:300;
}
.hero-ctas{
  display:flex;flex-direction:column;align-items:center;gap:14px;
  margin-bottom:20px;
}
.btn-hero-main{
  font-family:var(--display);font-size:17px;font-weight:800;
  color:var(--ink);background:var(--teal);
  padding:18px 48px;border-radius:var(--pill);
  text-decoration:none;transition:all .2s;
  display:inline-flex;align-items:center;gap:10px;
  letter-spacing:-0.01em;
  border:none;cursor:pointer;
}
.btn-hero-main:hover{background:var(--teal-dark);transform:translateY(-2px);box-shadow:0 14px 40px var(--teal-glow)}
.btn-hero-main svg{width:18px;height:18px;stroke:var(--ink);stroke-width:2.5;fill:none;transition:transform .2s}
.btn-hero-main:hover svg{transform:translateX(3px)}
.hero-trust{
  display:flex;align-items:center;justify-content:center;
  gap:20px;flex-wrap:wrap;font-size:13px;color:rgba(255,255,255,.35);
}
.hero-trust span{display:flex;align-items:center;gap:5px}

/* Hero mockup phone */
.hero-phone-wrap{
  position:relative;margin-top:60px;display:inline-block;
  max-width:360px;width:100%;
}
.hero-phone{
  background:var(--white);border-radius:32px;
  border:8px solid rgba(255,255,255,.12);
  overflow:hidden;
  box-shadow:0 40px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.06);
}
.hero-phone-topbar{
  background:var(--ink2);padding:12px 16px;
  display:flex;align-items:center;gap:10px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.hpt-avatar{
  width:32px;height:32px;background:var(--teal);border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-size:13px;font-weight:800;color:var(--ink);flex-shrink:0;
}
.hpt-name{font-family:var(--display);font-size:13px;font-weight:700;color:#fff}
.hpt-status{font-size:11px;color:var(--teal);font-weight:500;display:flex;align-items:center;gap:4px}
.hpt-status::before{content:'';width:5px;height:5px;background:var(--teal);border-radius:50%}
.hero-chat-bg{background:var(--chat-bg);padding:16px;min-height:300px;display:flex;flex-direction:column;gap:10px}
.hcm{max-width:84%;padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.5}
.hcm-in{background:#fff;color:var(--text);align-self:flex-start;border-bottom-left-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.hcm-out{background:#D9F7D0;color:var(--text);align-self:flex-end;border-bottom-right-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.hcm-time{font-size:10px;color:var(--text3);margin-top:3px;text-align:right}
.hero-chat-input{
  background:var(--white);padding:10px 14px;
  border-top:1px solid var(--border);
  display:flex;align-items:center;gap:8px;
}
.hci-field{
  flex:1;background:var(--cream2);border:none;border-radius:var(--pill);
  padding:8px 14px;font-size:13px;color:var(--text3);
  font-family:var(--body);outline:none;
}
.hci-ico{width:30px;height:30px;background:var(--cream2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer}
.hci-send{width:30px;height:30px;background:var(--teal);border-radius:50%;display:flex;align-items:center;justify-content:center}
.hci-send svg{width:13px;height:13px;stroke:var(--ink);fill:none;stroke-width:2}
/* bottom nav mockup */
.hero-phone-nav{
  background:var(--white);border-top:1px solid var(--border);
  padding:10px 0 6px;
  display:grid;grid-template-columns:repeat(4,1fr);
}
.hpn-item{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--text3)}
.hpn-item.active{color:var(--ink)}
.hpn-icon{font-size:18px}

/* fade-in animation */
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.hero-inner>*{animation:fadeUp .6s ease both}
.hero-badge{animation-delay:.05s}
.hero h1{animation-delay:.15s}
.hero-reframe{animation-delay:.22s}
.hero-sub{animation-delay:.28s}
.hero-ctas{animation-delay:.34s}
.hero-trust{animation-delay:.4s}
.hero-phone-wrap{animation-delay:.5s}

/* ── 3 STEPS (Miller plan) ── */
.steps-section{
  background:var(--cream);padding:72px 24px;
  border-bottom:1px solid var(--border);
}
.steps-inner{max-width:900px;margin:0 auto;text-align:center}
.steps-eyebrow{
  font-family:var(--display);font-size:12px;font-weight:700;
  color:var(--teal-text);letter-spacing:.1em;text-transform:uppercase;
  margin-bottom:12px;
}
.steps-title{
  font-family:var(--display);font-size:clamp(22px,2.8vw,32px);font-weight:800;
  color:var(--ink);letter-spacing:-0.03em;margin-bottom:48px;
}
.steps-grid{display:flex;gap:0;position:relative}
.steps-grid::before{
  content:'';position:absolute;top:28px;left:calc(16.66% + 16px);right:calc(16.66% + 16px);
  height:1px;background:var(--teal);opacity:.35;
}
.step{flex:1;display:flex;flex-direction:column;align-items:center;gap:14px;padding:0 16px}
.step-num{
  width:56px;height:56px;border-radius:50%;
  background:var(--ink);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-size:20px;font-weight:900;color:var(--teal);
  flex-shrink:0;position:relative;z-index:1;
  border:3px solid var(--cream);
  box-shadow:0 0 0 1px var(--teal);
}
.step-title{font-family:var(--display);font-size:16px;font-weight:800;color:var(--ink)}
.step-desc{font-size:14px;color:var(--text2);line-height:1.55;text-align:center}
@media(max-width:600px){
  .steps-grid{flex-direction:column;align-items:center;gap:32px}
  .steps-grid::before{display:none}
  .step{max-width:280px}
}

/* ── DOR vs SOLUÇÃO ── */
.dor-section{background:var(--white);padding:80px 24px}
.dor-inner{max-width:1060px;margin:0 auto}
.section-eyebrow{
  font-family:var(--display);font-size:12px;font-weight:700;
  color:var(--teal-text);letter-spacing:.1em;text-transform:uppercase;
  display:block;margin-bottom:12px;
}
.section-title{
  font-family:var(--display);font-size:clamp(26px,3.5vw,44px);font-weight:900;
  color:var(--ink);letter-spacing:-0.04em;line-height:1.1;
  margin-bottom:48px;
}
.dor-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}
@media(max-width:700px){.dor-grid{grid-template-columns:1fr}}
.dor-card{border-radius:var(--r);padding:32px}
.dor-card.pain{
  background:var(--cream);border:1px solid var(--border);
}
.dor-card.gain{
  background:var(--ink);border:1px solid transparent;
}
.dor-card-label{
  font-family:var(--display);font-size:13px;font-weight:700;
  margin-bottom:20px;display:flex;align-items:center;gap:8px;
}
.dor-card.pain .dor-card-label{color:var(--text3)}
.dor-card.gain .dor-card-label{color:var(--teal)}
.dor-items{display:flex;flex-direction:column;gap:14px}
.dor-item{display:flex;align-items:flex-start;gap:12px;font-size:15px;line-height:1.5}
.dor-card.pain .dor-item{color:var(--text2)}
.dor-card.gain .dor-item{color:rgba(255,255,255,.75)}
.dor-icon{width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;margin-top:1px}
.dor-icon.x{background:#FFE5E0;color:var(--coral)}
.dor-icon.ok{background:rgba(0,217,184,.15);color:var(--teal)}

/* ── BANNER INTERNO REFRAME ── */
.shame-section{
  background:var(--coral);padding:56px 24px;text-align:center;
}
.shame-section h2{
  font-family:var(--display);font-size:clamp(22px,3.5vw,44px);font-weight:900;
  color:#fff;letter-spacing:-0.035em;line-height:1.15;margin-bottom:14px;
}
.shame-section p{font-size:17px;color:rgba(255,255,255,.82);max-width:600px;margin:0 auto;line-height:1.65}

/* ── CUSTO DA DESORGANIZAÇÃO (Stakes — Kennedy) ── */
.stakes-section{background:var(--cream);padding:80px 24px}
.stakes-inner{max-width:940px;margin:0 auto}
.stakes-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:48px}
@media(max-width:700px){.stakes-grid{grid-template-columns:1fr}}
.stake-card{
  background:var(--white);border:1px solid var(--border);border-radius:var(--r);
  padding:28px 24px;position:relative;overflow:hidden;
}
.stake-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--coral);
}
.stake-val{font-family:var(--display);font-size:36px;font-weight:900;color:var(--coral);letter-spacing:-0.04em;line-height:1;margin-bottom:8px}
.stake-label{font-family:var(--display);font-size:15px;font-weight:700;color:var(--ink);margin-bottom:8px}
.stake-desc{font-size:14px;color:var(--text2);line-height:1.55}

/* ── FEATURES ALTERNADAS ── */
.feat-section{padding:96px 24px}
.feat-section.dark-bg{background:var(--ink)}
.feat-section.cream-bg{background:var(--cream)}
.feat-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.feat-inner.flip{direction:rtl}
.feat-inner.flip>*{direction:ltr}
@media(max-width:840px){
  .feat-inner,.feat-inner.flip{grid-template-columns:1fr;gap:48px;direction:ltr}
  .feat-inner.flip .feat-copy{order:-1}
}
.feat-tag{
  display:inline-block;
  font-family:var(--display);font-size:11px;font-weight:700;
  padding:5px 14px;border-radius:var(--pill);letter-spacing:.08em;text-transform:uppercase;
  margin-bottom:14px;
}
.feat-tag.light{background:var(--teal-light);color:var(--teal-text)}
.feat-tag.dark{background:rgba(0,217,184,.12);color:var(--teal)}
.feat-h3{
  font-family:var(--display);
  font-size:clamp(26px,2.8vw,38px);font-weight:900;
  letter-spacing:-0.035em;line-height:1.1;margin-bottom:16px;
}
.feat-h3.on-dark{color:#fff}
.feat-h3.on-light{color:var(--ink)}
.feat-p{font-size:16px;line-height:1.72;margin-bottom:24px}
.feat-p.on-dark{color:rgba(255,255,255,.6)}
.feat-p.on-light{color:var(--text2)}
.feat-list{display:flex;flex-direction:column;gap:11px}
.feat-li{display:flex;align-items:flex-start;gap:10px;font-size:15px}
.feat-li.on-dark{color:rgba(255,255,255,.7)}
.feat-li.on-light{color:var(--text2)}
.feat-check{
  width:20px;height:20px;flex-shrink:0;margin-top:1px;
  border-radius:50%;display:flex;align-items:center;justify-content:center;
}
.feat-check.teal{background:rgba(0,217,184,.15)}
.feat-check.teal svg{stroke:var(--teal)}
.feat-check.ink{background:var(--teal-light)}
.feat-check.ink svg{stroke:var(--teal-text)}
.feat-check svg{width:10px;height:10px;stroke-width:2.5;fill:none}

/* App frame */
.app-frame{
  border-radius:24px;overflow:hidden;
  box-shadow:0 24px 60px rgba(0,0,0,.2);
  border:1px solid rgba(255,255,255,.08);
}
.app-frame.on-cream{border-color:var(--border);box-shadow:0 12px 40px rgba(11,20,38,.1)}

/* ── SCREEN CHAT ── */
.s-chat{background:var(--chat-bg)}
.s-chat-top{background:var(--white);padding:14px 16px;border-bottom:1px solid var(--border);text-align:center}
.s-chat-top .sct-name{font-family:var(--display);font-size:14px;font-weight:800;color:var(--ink)}
.s-chat-top .sct-status{font-size:11px;color:#25D366;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px}
.s-chat-top .sct-status::before{content:'';width:5px;height:5px;background:#25D366;border-radius:50%}
.s-actions{background:var(--white);padding:10px 12px;border-bottom:1px solid var(--border);display:flex;gap:8px}
.s-act{flex:1;padding:8px 4px;border-radius:8px;text-align:center;font-size:11px;font-weight:700;font-family:var(--display);display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer}
.s-act.red{background:#FFF0F0;color:#E53935}
.s-act.green{background:var(--teal-light);color:var(--teal-text)}
.s-act.blue{background:#EEF2FF;color:#4F46E5}
.s-body{padding:14px;display:flex;flex-direction:column;gap:9px;min-height:240px}
.sm{max-width:82%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5}
.sm-in{background:var(--white);color:var(--text);align-self:flex-start;border-bottom-left-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.sm-out{background:#D9F7D0;color:var(--text);align-self:flex-end;border-bottom-right-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.sm-t{font-size:10px;color:var(--text3);margin-top:2px;text-align:right}
.s-input{background:var(--white);padding:9px 12px;border-top:1px solid var(--border);display:flex;align-items:center;gap:7px}
.si-field{flex:1;background:var(--cream2);border:none;border-radius:var(--pill);padding:7px 12px;font-size:12px;color:var(--text3);outline:none;font-family:var(--body)}
.si-btn{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;background:var(--cream2);flex-shrink:0}
.si-send{background:var(--teal)}
.si-send svg{width:12px;height:12px;stroke:var(--ink);fill:none;stroke-width:2}

/* ── SCREEN FINANCEIRO ── */
.s-fin{background:var(--cream2);padding:16px 14px}
.sf-head h4{font-family:var(--display);font-size:20px;font-weight:900;color:var(--ink)}
.sf-head p{font-size:12px;color:var(--text3);margin-top:1px}
.sf-month{display:inline-flex;align-items:center;gap:7px;background:var(--cream3);border-radius:var(--pill);padding:5px 12px;font-size:12px;font-weight:700;color:#3B82F6;margin-top:8px;margin-bottom:14px}
.sf-cards{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.sf-c{background:var(--white);border-radius:12px;padding:12px 14px;border-left:3px solid transparent;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.sf-c.g{border-color:#22C55E}
.sf-c.r{border-color:#EF4444}
.sf-c.b{border-color:#3B82F6}
.sf-cl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:3px}
.sf-cv{font-family:var(--display);font-size:20px;font-weight:900}
.sf-c.r .sf-cv{color:#EF4444}
.sf-c.b .sf-cv{color:#3B82F6}
.sf-c.g .sf-cv{color:var(--ink)}
.previs{background:var(--white);border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.previs-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
.previs-name{font-family:var(--display);font-size:13px;font-weight:800;color:var(--ink);display:flex;align-items:center;gap:5px}
.previs-tag{font-size:10px;font-weight:800;padding:2px 8px;border-radius:var(--pill)}
.pt-pos{background:var(--teal-light);color:var(--teal-text)}
.pt-neg{background:var(--coral-light);color:var(--coral-text)}
.previs-lbl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.previs-val{font-family:var(--display);font-size:26px;font-weight:900;color:var(--ink);letter-spacing:-0.03em;margin-bottom:10px}
.previs-row{display:flex;gap:8px}
.pm{flex:1;border-radius:8px;padding:9px 10px}
.pm.green{background:var(--teal-light)}
.pm.red{background:var(--coral-light)}
.pm-l{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:3px}
.pm.green .pm-l{color:var(--teal-text)}
.pm.red .pm-l{color:var(--coral-text)}
.pm-v{font-family:var(--display);font-size:13px;font-weight:900}
.pm.green .pm-v{color:var(--teal-text)}
.pm.red .pm-v{color:var(--coral-text)}

/* ── SCREEN CARTÕES ── */
.s-card-bg{background:var(--cream2);padding:14px}
.s-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.s-card-head h4{font-family:var(--display);font-size:16px;font-weight:900;color:var(--ink);display:flex;align-items:center;gap:6px}
.s-card-novo{background:var(--cream3);border-radius:8px;font-size:12px;font-weight:700;color:var(--text2);padding:6px 12px}
.card-strip{
  background:var(--white);border-radius:14px;padding:16px 16px;
  margin-bottom:10px;border:1px solid var(--border);
  box-shadow:0 1px 3px rgba(0,0,0,.05);position:relative;overflow:hidden;
}
.card-strip-accent{position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px 0 0 4px}
.cs-inter{background:#F97316}
.cs-nu{background:#820AD1}
.cs-info{padding-left:14px}
.cs-name{font-family:var(--display);font-size:15px;font-weight:900;color:var(--ink)}
.cs-best{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:8px}
.cs-flabel{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:2px}
.cs-fval{font-family:var(--display);font-size:22px;font-weight:900;color:var(--ink);margin-bottom:8px;letter-spacing:-0.02em}
.cs-limit-row{display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:5px}
.cs-limit-free{font-weight:700;color:var(--text2)}
.cs-bar{height:4px;background:var(--cream2);border-radius:2px;overflow:hidden}
.cs-bar-fill{height:100%;border-radius:2px}

/* ── SCREEN CONTAS FIXAS ── */
.s-cf-bg{background:var(--cream2);padding:14px}
.s-cf-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.s-cf-head h4{font-family:var(--display);font-size:16px;font-weight:900;color:var(--ink);display:flex;align-items:center;gap:6px}
.s-cf-add{background:var(--cream3);border-radius:8px;font-size:12px;font-weight:700;color:var(--text2);padding:6px 12px}
.cf-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border)}
.cf-row:last-child{border-bottom:none}
.cf-icons-g{display:flex;gap:4px}
.cf-ico-btn{width:24px;height:24px;background:var(--cream3);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text4)}
.cf-info-g{flex:1}
.cf-name-g{font-family:var(--display);font-size:13px;font-weight:800;color:var(--ink)}
.cf-meta-g{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-top:1px}
.cf-right-g{display:flex;align-items:center;gap:6px}
.cf-status-g{font-size:10px;font-weight:800;color:#F59E0B;letter-spacing:.04em}
.cf-toggle-g{width:34px;height:20px;background:var(--cream3);border-radius:var(--pill);border:1px solid var(--border);position:relative;flex-shrink:0}
.cf-toggle-g::after{content:'';position:absolute;left:2px;top:2px;width:14px;height:14px;background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.2)}

/* ── MARQUEE ── */
.marquee-wrap{background:var(--ink);padding:56px 0;overflow:hidden}
.marquee-wrap .mq-label{text-align:center;font-family:var(--display);font-size:11px;font-weight:700;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:28px}
.mq-row{overflow:hidden;margin-bottom:12px}
.mq-track{display:flex;gap:12px;width:max-content;animation:mq 32s linear infinite}
.mq-track.rev{animation-direction:reverse}
@keyframes mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.mq-chip{white-space:nowrap;padding:10px 20px;border-radius:var(--pill);font-family:var(--body);font-size:14px;font-weight:500}
.mq-chip.d{background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.1)}
.mq-chip.g{background:rgba(0,217,184,.1);color:var(--teal);border:1px solid rgba(0,217,184,.2)}

/* ── DEPOIMENTOS ── */
.dep-section{background:var(--cream);padding:80px 24px}
.dep-section .section-title{text-align:center;margin-bottom:48px}
.dep-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1060px;margin:0 auto}
@media(max-width:800px){.dep-grid{grid-template-columns:1fr}}
.dep-card{
  background:var(--white);border:1px solid var(--border);border-radius:var(--r);
  padding:28px;display:flex;flex-direction:column;gap:16px;
  box-shadow:0 2px 12px rgba(0,0,0,.05);
}
.dep-stars{color:var(--coral);font-size:15px;letter-spacing:2px}
.dep-text{font-size:15px;color:var(--text2);line-height:1.7;font-style:italic;flex:1}
.dep-text::before{content:'"'}
.dep-text::after{content:'"'}
.dep-author{display:flex;align-items:center;gap:12px}
.dep-avatar{
  width:42px;height:42px;border-radius:50%;
  font-family:var(--display);font-size:14px;font-weight:800;color:#fff;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.da-1{background:var(--coral)}
.da-2{background:var(--teal-text)}
.da-3{background:var(--ink3)}
.dep-name{font-family:var(--display);font-size:14px;font-weight:800;color:var(--ink)}
.dep-role{font-size:13px;color:var(--text3)}
.dep-highlight{
  background:var(--teal-light);border-radius:8px;padding:8px 12px;
  font-size:13px;font-weight:600;color:var(--teal-text);margin-top:4px;
  display:flex;align-items:center;gap:6px;
}

/* ── NÚMEROS ── */
.num-section{background:var(--white);padding:80px 24px;text-align:center}
.num-section .section-title{margin-bottom:48px}
.num-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:20px;max-width:860px;margin:0 auto}
.num-card{
  background:var(--cream);border:1px solid var(--border);border-radius:var(--r);
  padding:32px 28px;flex:1;min-width:180px;max-width:215px;
}
.num-val{font-family:var(--display);font-size:48px;font-weight:900;color:var(--teal-text);line-height:1;letter-spacing:-0.05em}
.num-label{font-size:14px;color:var(--text2);margin-top:10px;line-height:1.45}

/* ── GARANTIA ── */
.garantia-section{background:var(--ink);padding:72px 24px;text-align:center}
.garantia-inner{max-width:660px;margin:0 auto}
.garantia-badge{
  width:90px;height:90px;border-radius:50%;background:var(--teal);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--display);font-size:11px;font-weight:900;color:var(--ink);
  text-align:center;line-height:1.2;letter-spacing:.02em;text-transform:uppercase;
  margin:0 auto 28px;
  box-shadow:0 0 0 8px rgba(0,217,184,.15);
}
.garantia-section h2{
  font-family:var(--display);font-size:clamp(24px,3.5vw,38px);font-weight:900;
  color:#fff;letter-spacing:-0.035em;margin-bottom:16px;line-height:1.15;
}
.garantia-section h2 span{color:var(--teal)}
.garantia-section p{font-size:17px;color:rgba(255,255,255,.55);line-height:1.7;margin-bottom:16px}
.garantia-legal{font-size:13px;color:rgba(255,255,255,.25)}

/* ── PRICING ── */
.pricing-section{background:var(--cream);padding:96px 24px}
.pricing-intro{text-align:center;max-width:620px;margin:0 auto}
.pricing-value-anchor{
  background:var(--white);border:1px solid var(--border);border-radius:var(--r);
  padding:24px 28px;margin:40px auto 48px;max-width:560px;
  display:flex;align-items:center;gap:18px;
  box-shadow:0 2px 12px rgba(0,0,0,.05);
}
.pva-icon{font-size:36px;flex-shrink:0}
.pva-text{font-size:15px;color:var(--text2);line-height:1.6}
.pva-text strong{color:var(--coral);font-weight:800}
.pricing-grid{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;max-width:820px;margin:0 auto}
.plan{
  background:var(--white);border:1.5px solid var(--border);border-radius:24px;
  padding:36px 32px;flex:1;min-width:300px;max-width:380px;position:relative;
}
.plan.feat{border-color:var(--teal);box-shadow:0 0 0 4px var(--teal-glow)}
.plan-star{
  position:absolute;top:-14px;left:50%;transform:translateX(-50%);
  background:var(--teal);color:var(--ink);
  font-family:var(--display);font-size:12px;font-weight:800;
  padding:5px 18px;border-radius:var(--pill);white-space:nowrap;
  letter-spacing:.02em;
}
.plan-name{font-family:var(--display);font-size:15px;font-weight:700;color:var(--text2);margin-bottom:8px}
.plan-p-row{display:flex;align-items:baseline;gap:1px}
.plan-cur{font-family:var(--display);font-size:20px;font-weight:800;color:var(--ink)}
.plan-price{font-family:var(--display);font-size:52px;font-weight:900;color:var(--ink);line-height:1;letter-spacing:-0.05em}
.plan-dec{font-family:var(--display);font-size:24px;font-weight:700;color:var(--ink)}
.plan-period{font-size:13px;color:var(--text3);margin-bottom:6px}
.plan-economy{
  display:inline-block;background:var(--teal-light);color:var(--teal-text);
  font-family:var(--display);font-size:12px;font-weight:700;
  padding:3px 10px;border-radius:var(--pill);margin-bottom:24px;
}
.plan-features{display:flex;flex-direction:column;gap:10px;margin-bottom:28px}
.pf{display:flex;align-items:flex-start;gap:9px;font-size:14px;color:var(--text2)}
.pf-check{color:var(--teal-text);font-weight:700;flex-shrink:0}
.plan-cta{
  display:block;text-align:center;padding:15px;border-radius:var(--pill);
  font-family:var(--display);font-size:15px;font-weight:800;text-decoration:none;
  transition:all .2s;letter-spacing:-.01em;
}
.plan-cta-solid{background:var(--teal);color:var(--ink)}
.plan-cta-solid:hover{background:var(--teal-dark);transform:translateY(-1px);box-shadow:0 8px 28px var(--teal-glow)}
.plan-cta-outline{border:1.5px solid var(--border2);color:var(--text2)}
.plan-cta-outline:hover{border-color:var(--teal);color:var(--teal-text)}
.plan-note{text-align:center;font-size:12px;color:var(--text4);margin-top:10px}

/* ── FAQ ── */
.faq-section{padding:80px 24px;background:var(--white)}
.faq-inner{max-width:660px;margin:0 auto}
.faq-item{border-bottom:1px solid var(--border)}
.faq-q{
  padding:20px 0;display:flex;justify-content:space-between;align-items:center;gap:16px;
  cursor:pointer;user-select:none;font-family:var(--display);font-size:16px;font-weight:700;color:var(--ink);
  transition:color .15s;
}
.faq-q:hover{color:var(--teal-text)}
.faq-icon{
  width:26px;height:26px;flex-shrink:0;background:var(--cream);border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  color:var(--text2);font-size:16px;font-weight:400;transition:transform .3s,background .2s;
}
.faq-item.open .faq-icon{transform:rotate(45deg);background:var(--teal-light);color:var(--teal-text)}
.faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease}
.faq-a-inner{padding:0 0 20px;font-size:15px;color:var(--text2);line-height:1.7}
.faq-item.open .faq-a{max-height:400px}

/* ── CTA FINAL ── */
.cta-final{
  background:var(--ink);padding:100px 24px;text-align:center;
  position:relative;overflow:hidden;
}
.cta-final::before{
  content:'';position:absolute;
  width:700px;height:700px;
  background:radial-gradient(circle, rgba(0,217,184,.1) 0%, transparent 65%);
  top:-200px;left:50%;transform:translateX(-50%);pointer-events:none;
}
.cta-final::after{
  content:'';position:absolute;
  width:400px;height:400px;
  background:radial-gradient(circle, rgba(255,98,71,.08) 0%, transparent 65%);
  bottom:-100px;right:10%;pointer-events:none;
}
.cta-final h2{
  font-family:var(--display);font-size:clamp(30px,5vw,58px);font-weight:900;
  color:#fff;letter-spacing:-0.045em;line-height:1.05;margin-bottom:20px;
  position:relative;
}
.cta-final h2 span{color:var(--teal)}
.cta-final p{
  font-size:18px;color:rgba(255,255,255,.5);max-width:480px;
  margin:0 auto 44px;line-height:1.65;position:relative;
}
.cta-final-note{margin-top:20px;font-size:13px;color:rgba(255,255,255,.25);position:relative}
.cta-final>*{position:relative}

/* ── FOOTER ── */
footer{background:var(--ink2);border-top:1px solid rgba(255,255,255,.05);padding:52px 24px 32px}
.footer-grid{max-width:var(--max);margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:48px}
@media(max-width:700px){.footer-grid{grid-template-columns:1fr;gap:32px}}
.footer-brand .fb-name{
  font-family:var(--display);font-size:22px;font-weight:900;color:#fff;
  letter-spacing:-0.04em;margin-bottom:10px;display:flex;align-items:center;gap:8px;
}
.fb-dot{width:8px;height:8px;background:var(--teal);border-radius:50%}
.footer-brand p{font-size:14px;color:rgba(255,255,255,.3);max-width:260px;line-height:1.65}
.footer-col h5{font-family:var(--display);font-size:11px;font-weight:700;color:rgba(255,255,255,.25);letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
.footer-col a{display:block;font-size:14px;color:rgba(255,255,255,.35);text-decoration:none;margin-bottom:10px;transition:color .15s}
.footer-col a:hover{color:rgba(255,255,255,.75)}
.footer-bottom{border-top:1px solid rgba(255,255,255,.06);padding-top:24px;text-align:center;font-size:13px;color:rgba(255,255,255,.18)}

/* ── COMPARATIVO ── */
.compare-section{padding:80px 24px;background:var(--cream)}
.compare-inner{max-width:800px;margin:0 auto}
table.cmp{width:100%;border-collapse:collapse;font-size:15px}
table.cmp th{font-family:var(--display);font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:13px 20px;text-align:left;color:var(--text3);border-bottom:2px solid var(--border)}
table.cmp th:not(:first-child){text-align:center}
table.cmp td{padding:12px 20px;border-bottom:1px solid var(--border);color:var(--text2)}
table.cmp td:not(:first-child){text-align:center}
table.cmp tr:last-child td{border-bottom:none}
.cmp-lyvo th,.cmp-lyvo td{background:var(--teal-light)}
.cmp-lyvo th{color:var(--teal-text);border-bottom-color:rgba(0,217,184,.25);border-radius:var(--r-sm) var(--r-sm) 0 0}
.ck{color:var(--teal-text);font-size:17px;font-weight:900}
.cx{color:var(--text4);font-size:17px}
/* ══════════════════════════════════════════
   RESPONSIVO COMPLETO
══════════════════════════════════════════ */

/* ── Mobile hamburger menu ── */
.nav-hamburger{
  display:none;
  flex-direction:column;gap:5px;cursor:pointer;
  background:none;border:none;padding:4px;
}
.nav-hamburger span{
  display:block;width:22px;height:2px;
  background:var(--ink);border-radius:2px;
  transition:all .3s;
}
.mobile-menu{
  display:none;
  position:fixed;top:0;left:0;right:0;bottom:0;
  background:var(--white);z-index:300;
  flex-direction:column;padding:24px;
}
.mobile-menu.open{display:flex}
.mobile-menu-head{
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:40px;
}
.mobile-menu-close{
  background:var(--cream2);border:none;border-radius:50%;
  width:36px;height:36px;cursor:pointer;font-size:18px;
  display:flex;align-items:center;justify-content:center;
}
.mobile-menu-links{
  display:flex;flex-direction:column;gap:4px;flex:1;
}
.mobile-menu-links a{
  font-family:var(--display);font-size:22px;font-weight:800;
  color:var(--ink);text-decoration:none;padding:12px 0;
  border-bottom:1px solid var(--border);letter-spacing:-0.02em;
  transition:color .15s;
}
.mobile-menu-links a:hover{color:var(--teal-text)}
.mobile-menu-actions{
  display:flex;flex-direction:column;gap:12px;
  padding-top:32px;
}
.mobile-menu-actions .btn-hero-main{
  display:flex;justify-content:center;
  font-family:var(--display);font-size:16px;font-weight:800;
  color:var(--ink);background:var(--teal);
  padding:16px;border-radius:var(--pill);
  text-decoration:none;
}
.mobile-menu-actions .btn-entrar-mobile{
  display:block;text-align:center;
  font-family:var(--display);font-size:15px;font-weight:700;
  color:var(--text2);border:1.5px solid var(--border2);
  padding:14px;border-radius:var(--pill);text-decoration:none;
  background:none;cursor:pointer;width:100%;
}

/* ── Tablet (≤1024px) ── */
@media(max-width:1024px){
  nav{padding:0 24px}
  .nav-links{gap:0}
  .nav-links a{padding:7px 10px;font-size:14px}
  .feat-inner,.feat-inner.flip{gap:48px}
}

/* ── Mobile landscape / small tablet (≤860px) ── */
@media(max-width:860px){
  .nav-links{display:none}
  .btn-entrar{display:none}
  .nav-hamburger{display:flex}

  .feat-inner,.feat-inner.flip{
    grid-template-columns:1fr;gap:40px;direction:ltr
  }
  .feat-inner.flip .feat-copy{order:-1}

  .stakes-grid{grid-template-columns:1fr}
  .dor-grid{grid-template-columns:1fr}
  .pricing-grid{flex-direction:column;align-items:center}
  .plan{min-width:unset;width:100%;max-width:500px}
}

/* ── Mobile portrait (≤600px) ── */
@media(max-width:600px){
  /* Nav */
  nav{padding:0 16px;height:60px}
  .logo-word{font-size:18px}

  /* Topbar */
  .topbar{font-size:11px;gap:8px;height:auto;padding:8px 12px;flex-wrap:wrap;min-height:40px}
  .topbar-timer{font-size:11px;padding:2px 8px}

  /* Hero */
  .hero{padding:48px 16px 0}
  .hero h1{font-size:clamp(30px,9vw,42px);letter-spacing:-0.04em}
  .hero-sub{font-size:16px;margin-bottom:32px}
  .hero-badge{font-size:11px;padding:6px 12px}
  .btn-hero-main{font-size:15px;padding:15px 28px;width:100%;justify-content:center}
  .hero-trust{font-size:12px;gap:12px}
  .hero-phone-wrap{max-width:100%}

  /* Steps */
  .steps-section{padding:48px 16px}
  .steps-grid{flex-direction:column;align-items:center;gap:28px}
  .steps-grid::before{display:none}
  .step{max-width:100%;padding:0 8px}
  .steps-title{font-size:22px}

  /* Sections */
  .dor-section{padding:48px 16px}
  .shame-section{padding:40px 16px}
  .shame-section h2{font-size:clamp(22px,7vw,36px)}
  .stakes-section{padding:48px 16px}
  .stakes-grid{grid-template-columns:1fr;gap:14px}
  .stake-val{font-size:30px}

  /* Features */
  .feat-section{padding:56px 16px}
  .feat-h3{font-size:clamp(22px,7vw,32px)}
  .feat-desc{font-size:15px}

  /* Marquee */
  .mq-chip{font-size:13px;padding:8px 16px}

  /* Testimonials */
  .dep-section{padding:48px 16px}
  .dep-grid{grid-template-columns:1fr;gap:16px}

  /* Compare */
  .compare-section{padding:48px 16px}
  table.cmp{font-size:13px}
  table.cmp th,table.cmp td{padding:10px 12px}

  /* Numbers */
  .num-section{padding:48px 16px}
  .num-grid{gap:14px}
  .num-card{min-width:calc(50% - 7px);max-width:calc(50% - 7px);padding:24px 16px}
  .num-val{font-size:38px}

  /* Garantia */
  .garantia-section{padding:48px 16px}

  /* Pricing */
  .pricing-section{padding:56px 16px}
  .plan{padding:28px 20px}
  .plan-price{font-size:42px}
  .pricing-value-anchor{flex-direction:column;gap:12px;padding:20px}

  /* FAQ */
  .faq-section{padding:48px 16px}
  .faq-q{font-size:15px}

  /* CTA Final */
  .cta-final{padding:64px 16px}
  .cta-final h2{font-size:clamp(26px,8vw,44px)}
  .cta-final p{font-size:16px}
  .cta-final .btn-hero-main{width:100%;justify-content:center;font-size:15px;padding:16px 24px}
  .cta-final-note{font-size:12px}

  /* Footer */
  footer{padding:40px 16px 24px}
  .footer-grid{grid-template-columns:1fr;gap:28px}

  /* Google Agenda section */
  .feat-section .feat-inner[style*="grid-template-columns"]{
    display:flex!important;flex-direction:column!important;gap:40px!important;
  }
}

/* ── Muito pequeno (≤380px) ── */
@media(max-width:380px){
  .hero h1{font-size:28px}
  .num-card{min-width:100%;max-width:100%}
  .hero-trust{flex-direction:column;gap:8px;align-items:center}
}

/* ── Tabela comparativa responsiva ── */
@media(max-width:640px){
  .compare-inner{overflow-x:auto}
  table.cmp{min-width:480px}
}

/* ── Scroll offset para header fixo ── */
#recursos,#como-funciona,#depoimentos,#planos,#faq{
  scroll-margin-top:72px;
}
@media(max-width:600px){
  #recursos,#como-funciona,#depoimentos,#planos,#faq{
    scroll-margin-top:60px;
  }
}

`;

interface LandingPageProps {
  onLogin: (email: string, password: string) => Promise<void> | void;
  onSignUp: (data: any) => Promise<void> | void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignUp }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timerText, setTimerText] = useState('00:00:00');

  /* ── Modal states ── */
  const [showModal, setShowModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [city, setCity] = useState('');
  const [userState, setUserState] = useState('');
  const [income, setIncome] = useState('');

  const openLoginModal = () => { setIsSignUp(false); setFormError(null); setShowModal(true); };
  const openSignUpModal = () => { setIsSignUp(true); setFormError(null); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEmail(''); setPassword(''); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (isSignUp) {
        await onSignUp({ name, email, password, phone, birthDate, city, state: userState, income });
      } else {
        await onLogin(email, password);
      }
      closeModal();
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao realizar operação.');
    }
  };

  /* ── Inject CSS ── */
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'lyvo-lp-styles';
    if (!document.getElementById('lyvo-lp-styles')) {
      el.innerHTML = LYVO_CSS;
      document.head.appendChild(el);
    }
    return () => { document.getElementById('lyvo-lp-styles')?.remove(); };
  }, []);

  /* ── Countdown ── */
  useEffect(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 0);
    const tick = () => {
      const diff = end.getTime() - Date.now();
      if (diff < 0) { setTimerText('EXPIRANDO'); return; }
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setTimerText(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Active nav ── */
  useEffect(() => {
    const ids = ['recursos', 'como-funciona', 'depoimentos', 'planos', 'faq'];
    const handleScroll = () => {
      let current = '';
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) current = id;
      });
      document.querySelectorAll<HTMLAnchorElement>('.nav-links a').forEach(a => {
        const href = a.getAttribute('href')?.replace('#', '') ?? '';
        a.style.color = href === current ? 'var(--teal-text)' : '';
        a.style.fontWeight = href === current ? '600' : '';
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Close mobile menu on outside click ── */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const menu = document.getElementById('mobileMenu');
      const btn = document.querySelector('.nav-hamburger');
      if (menu && !menu.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [mobileMenuOpen]);

  /* ── Smooth scroll util ── */
  const goTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const offset = window.innerWidth <= 600 ? 60 : 68;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset - 8, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  /* ── Marquee chips ── */
  const mq1 = [
    ['d','gastei 45 no iFood 🍔'], ['g','✅ Lançado — Alimentação'],
    ['d','paguei o boleto de internet'], ['g','✅ Conta fixa confirmada'],
    ['d','comprei no inter 299 reais'], ['g','✅ Fatura maio — R$299'],
    ['d','qual minha previsão esse mês?'], ['g','📊 Saldo previsto: +R$783'],
    ['d','recebi meu salário de 4200'], ['g','✅ Receita registrada'],
  ];
  const mq2 = [
    ['d','vou fechar o mês bem?'], ['g','🎯 Projeção: POSITIVO ✓'],
    ['d','tira foto do meu recibo'], ['g','✅ Registrado em 3 segundos'],
    ['d','quanto gastei em alimentação?'], ['g','🍽 R$860 em 12 lançamentos'],
    ['d','cadastra academia smartfit 110'], ['g','📌 Conta fixa adicionada'],
    ['d','minha fatura do nubank?'], ['g','💳 R$840 · vence dia 22'],
  ];

  const faqItems = [
    { q: 'Como funciona a integração com o Google Agenda?', a: 'O Lyvo se conecta diretamente com o seu Google Agenda. Quando você cadastra um compromisso por mensagem — "reunião amanhã às 14h" — ele é criado automaticamente no seu calendário. Você recebe a notificação no celular como qualquer evento do Google. Os vencimentos das suas contas fixas também podem virar eventos, para você nunca esquecer de pagar.' },
    { q: 'Como funciona o período de 3 dias grátis?', a: 'Você acessa todos os recursos do Lyvo por 3 dias sem precisar informar cartão de crédito. Ao final, escolhe o plano que preferir — ou não contrata nada, sem pressão.' },
    { q: 'Precisa conectar meu WhatsApp?', a: 'Não. O chat do Lyvo é 100% próprio, dentro do site meulyvo.com. A experiência é inspirada no WhatsApp — mas completamente independente. Nenhum acesso ao seu telefone ou aplicativos.' },
    { q: 'Como o Lyvo sabe em qual fatura lançar a compra?', a: 'Ao cadastrar o cartão, você informa o melhor dia de compra, o limite e a data de vencimento. Com esses dados, o Lyvo identifica automaticamente se a compra vai para a fatura atual ou a próxima — sempre com 100% de precisão.' },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim. No plano mensal você cancela quando quiser, sem multa. No plano anual, a cobrança é feita uma vez e você usa por 12 meses. Em ambos, se cancelar nos primeiros 30 dias, reembolsamos 100%.' },
    { q: 'Funciona no celular sem baixar aplicativo?', a: 'Sim. O Lyvo é um app web — você acessa pelo navegador do celular ou do computador, sem instalar nada. Digite meulyvo.com e está dentro.' },
    { q: 'A garantia de 30 dias é real?', a: 'Basta mandar uma mensagem em até 30 dias corridos após a compra. Devolvemos cada centavo sem perguntas, sem ligação de retenção, sem formulário complicado. Só uma mensagem — como tudo no Lyvo.' },
  ];

  return (
    <div>
      {/* ── TOPBAR ── */}
      <div className="topbar">
        <span className="topbar-text-long">⚡ Oferta por tempo limitado — 3 dias grátis +</span>
        <span>30 dias de garantia total.</span>
        <div className="topbar-timer">{timerText}</div>
        <a href="#planos" onClick={goTo('planos')}>Aproveitar →</a>
      </div>

      {/* ── NAVBAR ── */}
      <header>
        <nav>
          <a href="#" className="logo">
            <div className="logo-mark">
              <svg viewBox="0 0 20 20"><path d="M10 2L4 6v7l6 4 6-4V6L10 2z" /></svg>
            </div>
            <span className="logo-word">LYVO<sup>™</sup></span>
          </a>
          <ul className="nav-links">
            <li><a href="#recursos" onClick={goTo('recursos')}>Recursos</a></li>
            <li><a href="#como-funciona" onClick={goTo('como-funciona')}>Como Funciona</a></li>
            <li><a href="#depoimentos" onClick={goTo('depoimentos')}>Depoimentos</a></li>
            <li><a href="#planos" onClick={goTo('planos')}>Preços</a></li>
            <li><a href="#faq" onClick={goTo('faq')}>FAQ</a></li>
          </ul>
          <div className="nav-right">
            <button onClick={openLoginModal} className="btn-entrar">Entrar</button>
            <a href="#planos" onClick={goTo('planos')} className="btn-comprar">Comprar</a>
            <button className="nav-hamburger" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu">
              <span /><span /><span />
            </button>
          </div>
        </nav>
      </header>

      {/* ── MOBILE MENU ── */}
      <div className={`mobile-menu${mobileMenuOpen ? ' open' : ''}`} id="mobileMenu">
        <div className="mobile-menu-head">
          <a href="#" className="logo" onClick={() => setMobileMenuOpen(false)}>
            <div className="logo-mark" style={{ width: 30, height: 30, background: 'var(--ink)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="white"><path d="M10 2L4 6v7l6 4 6-4V6L10 2z" /></svg>
            </div>
            <span className="logo-word">LYVO<sup>™</sup></span>
          </a>
          <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        </div>
        <div className="mobile-menu-links">
          <a href="#recursos" onClick={goTo('recursos')}>Recursos</a>
          <a href="#como-funciona" onClick={goTo('como-funciona')}>Como Funciona</a>
          <a href="#depoimentos" onClick={goTo('depoimentos')}>Depoimentos</a>
          <a href="#planos" onClick={goTo('planos')}>Preços</a>
          <a href="#faq" onClick={goTo('faq')}>FAQ</a>
        </div>
        <div className="mobile-menu-actions">
          <button onClick={() => { openSignUpModal(); setMobileMenuOpen(false); }} className="btn-hero-main">Começar — 3 dias grátis</button>
          <button onClick={() => { openLoginModal(); setMobileMenuOpen(false); }} className="btn-entrar-mobile">Entrar na minha conta</button>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">
            <div className="hero-badge-pulse" />
            único app de finanças por chat do Brasil
          </div>
          <h1>Você não é<br /><span className="hl-coral">ruim com dinheiro.</span><br />O app anterior<br />é que era <span className="hl">chato demais.</span></h1>
          <p className="hero-reframe">E você já sabe disso — por isso abandonou todos.</p>
          <p className="hero-sub">O Lyvo é o único app financeiro que funciona por conversa — como o WhatsApp, mas dentro do próprio site. Registre gastos em 3 segundos. Feche o mês sem angústia.</p>
          <div className="hero-ctas">
            <button onClick={openSignUpModal} className="btn-hero-main">
              Começar Agora — 3 dias grátis
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
            <div className="hero-trust">
              <span>✓ Sem cartão de crédito</span>
              <span>✓ 3 dias grátis para testar</span>
              <span>✓ 30 dias de garantia</span>
            </div>
          </div>
          <div className="hero-phone-wrap">
            <div className="hero-phone">
              <div className="hero-phone-topbar">
                <div className="hpt-avatar">L</div>
                <div>
                  <div className="hpt-name">Lyvo Assistente 🤖</div>
                  <div className="hpt-status">ATIVO</div>
                </div>
              </div>
              <div className="hero-chat-bg">
                <div className="hcm hcm-in">Olá! Sou o Lyvo. Estou pronto para ouvir você ou analisar seus recibos. O que vamos organizar hoje?<div className="hcm-time">19:08</div></div>
                <div className="hcm hcm-out">gastei 89 reais no mercado no cartão inter<div className="hcm-time">19:09</div></div>
                <div className="hcm hcm-in">✅ R$89,00 em Alimentação — Inter.<br />Fatura atual: <strong>R$2.655,67</strong><br />Limite livre: R$344,33<div className="hcm-time">19:09</div></div>
                <div className="hcm hcm-out">como vou fechar o mês?<div className="hcm-time">19:09</div></div>
                <div className="hcm hcm-in">📊 Projeção de Abril:<br />Receitas: R$4.200 · Saídas: R$3.417<br /><strong>Saldo previsto: +R$783 ✅ POSITIVO</strong><div className="hcm-time">19:09</div></div>
              </div>
              <div className="hero-chat-input">
                <input className="hci-field" type="text" placeholder="Digite ou use áudio/câmera" readOnly />
                <div className="hci-ico">📷</div>
                <div className="hci-ico">🎤</div>
                <div className="hci-send"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg></div>
              </div>
              <div className="hero-phone-nav">
                <div className="hpn-item active"><div className="hpn-icon">💬</div>Chat</div>
                <div className="hpn-item"><div className="hpn-icon">📊</div>Finanças</div>
                <div className="hpn-item"><div className="hpn-icon">📅</div>Agenda</div>
                <div className="hpn-item"><div className="hpn-icon">👤</div>Perfil</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 PASSOS ── */}
      <section className="steps-section" id="recursos">
        <div className="steps-inner">
          <div className="steps-eyebrow">Como funciona</div>
          <div className="steps-title">Em 3 passos você já está no controle</div>
          <div className="steps-grid">
            {[
              { n: '1', t: 'Cadastre-se em 30 segundos', d: 'Crie sua conta. Nenhum formulário longo, nenhuma configuração complicada. Pode entrar do celular agora — 3 dias grátis.' },
              { n: '2', t: 'Mande uma mensagem', d: 'Texto, áudio ou foto do comprovante. O Lyvo entende e categoriza automaticamente. Três segundos por gasto.' },
              { n: '3', t: 'Feche o mês no positivo', d: 'Veja a projeção exata antes do dia 30. Sem surpresa na fatura. Sem angústia. Só controle.' },
            ].map(s => (
              <div className="step" key={s.n}>
                <div className="step-num">{s.n}</div>
                <div className="step-title">{s.t}</div>
                <div className="step-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOR vs SOLUÇÃO ── */}
      <section className="dor-section">
        <div className="dor-inner">
          <div className="dor-grid">
            <div className="dor-card pain">
              <div className="dor-card-label">😮‍💨 &nbsp;O que você vivia antes</div>
              <div className="dor-items">
                {['Abria o app, via 20 campos pra preencher, fechava','Fatura chegava sempre como surpresa','Ficava no negativo sem entender onde o dinheiro foi','Abandonava o app em 2 semanas e se sentia culpado','Medo de olhar o extrato bancário'].map((t, i) => (
                  <div className="dor-item" key={i}><div className="dor-icon x">✗</div>{t}</div>
                ))}
              </div>
            </div>
            <div className="dor-card gain">
              <div className="dor-card-label">✦ &nbsp;O que o Lyvo faz por você</div>
              <div className="dor-items">
                {['Registra qualquer gasto em 3 segundos por mensagem','Você sabe o valor da fatura antes de fechar o mês','Projeção de saldo atualizada em tempo real','Interface que você não abandona porque não dá trabalho','Clareza financeira todos os dias'].map((t, i) => (
                  <div className="dor-item" key={i}><div className="dor-icon ok">✓</div>{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REFRAME ── */}
      <section className="shame-section">
        <h2>Você nunca foi ruim com dinheiro.<br />Você só nunca teve<br />o app certo.</h2>
        <p>Disciplina financeira não é falta de vontade — é falta de ferramenta. O Lyvo não exige que você mude. Ele se adapta à forma como você já vive.</p>
      </section>

      {/* ── STAKES ── */}
      <section className="stakes-section">
        <div className="stakes-inner">
          <span className="section-eyebrow" style={{ display: 'block' }}>O custo real de não controlar</span>
          <div className="section-title" style={{ maxWidth: 620 }}>O que a desorganização<br />financeira custa por mês</div>
          <div className="stakes-grid">
            {[
              { v: 'R$380', l: 'Gastos invisíveis', d: 'Média mensal de compras duplicadas, assinaturas esquecidas e taxas evitáveis que passam despercebidas sem controle ativo.' },
              { v: 'R$620', l: 'Juros de fatura', d: 'Quem não tem previsão da fatura paga o mínimo por desconhecimento. Juros do cartão chegam a 400% ao ano.' },
              { v: 'R$1.000', l: 'Total evitável por mês', d: 'Com controle real, a maioria das pessoas identifica e elimina esse vazamento nos primeiros 30 dias de uso.' },
            ].map(s => (
              <div className="stake-card" key={s.l}>
                <div className="stake-val">{s.v}</div>
                <div className="stake-label">{s.l}</div>
                <div className="stake-desc">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE 1: CHAT ── */}
      <section className="feat-section dark-bg" id="como-funciona">
        <div className="feat-inner">
          <div className="feat-copy">
            <div className="feat-tag dark">Chat Inteligente</div>
            <h3 className="feat-h3 on-dark">Fale com o Lyvo.<br />Ele cuida do resto.</h3>
            <p className="feat-p on-dark">Nada de clicar em 10 campos para registrar um gasto. Manda uma mensagem — o Lyvo categoriza, lança no cartão certo e atualiza a previsão do mês no mesmo segundo.</p>
            <div className="feat-list">
              {['Texto, áudio ou foto do comprovante','Chat próprio dentro do app — sem WhatsApp','Categorização automática em tempo real','Funciona no celular pelo navegador, sem baixar nada'].map((t, i) => (
                <div className="feat-li on-dark" key={i}>
                  <div className="feat-check teal"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="2,6 5,9 10,3" /></svg></div>{t}
                </div>
              ))}
            </div>
          </div>
          <div className="app-frame">
            <div className="s-chat">
              <div className="s-chat-top"><div className="sct-name">Lyvo Assistente 🤖</div><div className="sct-status">ATIVO</div></div>
              <div className="s-actions">
                <div className="s-act red"><span>↙</span>DESPESA</div>
                <div className="s-act green"><span>↗</span>RECEITA</div>
                <div className="s-act blue"><span>📅</span>EVENTO</div>
              </div>
              <div className="s-body">
                <div className="sm sm-out">gastei 89 no mercado no cartão inter<div className="sm-t">19:08</div></div>
                <div className="sm sm-in">✅ R$89,00 em Alimentação — Inter.<br />Fatura atual: <strong>R$2.655,67</strong><br />Limite livre: R$344,33<div className="sm-t">19:08</div></div>
                <div className="sm sm-out">paguei o boleto de internet de 200<div className="sm-t">19:09</div></div>
                <div className="sm sm-in">📌 Conta fixa <strong>Internet</strong> confirmada ✓<br />R$200,00 baixado do fluxo geral.<div className="sm-t">19:09</div></div>
                <div className="sm sm-out">como tô no mês?<div className="sm-t">19:10</div></div>
                <div className="sm sm-in">📊 Abril — projeção <strong>POSITIVO</strong><br />Receita: R$4.200 · Saída: R$3.417<br />Saldo previsto: <strong>+R$783</strong> ✅<div className="sm-t">19:10</div></div>
              </div>
              <div className="s-input">
                <input className="si-field" type="text" placeholder="Digite ou use áudio/câmera" readOnly />
                <div className="si-btn">📷</div>
                <div className="si-btn">🎤</div>
                <div className="si-btn si-send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE 2: CARTÃO ── */}
      <section className="feat-section cream-bg">
        <div className="feat-inner flip">
          <div className="feat-copy">
            <div className="feat-tag light">Cartão de Crédito</div>
            <h3 className="feat-h3 on-light">Nunca mais tome<br />susto na fatura.</h3>
            <p className="feat-p on-light">O Lyvo aprende o ciclo de cada cartão: melhor dia de compra, limite e vencimento. Cada compra é identificada para a fatura certa — e você sabe ao centavo quanto vai chegar antes de fechar o mês.</p>
            <div className="feat-list">
              {['Cadastre quantos cartões quiser','Melhor dia de compra definido por você','Limite disponível atualizado após cada compra','Após o pagamento, entra no fluxo geral automaticamente'].map((t, i) => (
                <div className="feat-li on-light" key={i}>
                  <div className="feat-check ink"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="2,6 5,9 10,3" /></svg></div>{t}
                </div>
              ))}
            </div>
          </div>
          <div className="app-frame on-cream">
            <div className="s-card-bg">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 900, color: 'var(--ink)' }}>Financeiro</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Controle sua saúde financeira</div>
                <div className="sf-month"><span style={{ color: 'var(--text3)' }}>‹</span>&nbsp;Abril De 2026&nbsp;<span style={{ color: 'var(--text3)' }}>›</span></div>
              </div>
              <div className="s-card-head">
                <h4>🪪 Meus Cartões</h4>
                <div className="s-card-novo">+ Novo</div>
              </div>
              <div className="card-strip">
                <div className="card-strip-accent cs-inter" />
                <div className="cs-info">
                  <div className="cs-name">Inter</div>
                  <div className="cs-best">MELHOR COMPRA: DIA 8</div>
                  <div className="cs-flabel">FATURA ATUAL</div>
                  <div className="cs-fval">R$ 2.566,67</div>
                  <div className="cs-limit-row"><span>Limite</span><span className="cs-limit-free">R$ 433,33 livres</span></div>
                  <div className="cs-bar"><div className="cs-bar-fill" style={{ width: '86%', background: '#F97316' }} /></div>
                </div>
              </div>
              <div className="card-strip">
                <div className="card-strip-accent cs-nu" />
                <div className="cs-info">
                  <div className="cs-name">Nubank</div>
                  <div className="cs-best">MELHOR COMPRA: DIA 15</div>
                  <div className="cs-flabel">FATURA ATUAL</div>
                  <div className="cs-fval">R$ 840,00</div>
                  <div className="cs-limit-row"><span>Limite</span><span className="cs-limit-free">R$ 2.160,00 livres</span></div>
                  <div className="cs-bar"><div className="cs-bar-fill" style={{ width: '28%', background: '#820AD1' }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE GOOGLE AGENDA ── */}
      <section className="feat-section dark-bg">
        <div className="feat-inner">
          <div className="feat-copy">
            <div className="feat-tag dark" style={{ background: 'rgba(66,133,244,.15)', color: '#93C5FD' }}>🗓 Google Agenda</div>
            <h3 className="feat-h3 on-dark">Seus compromissos e<br />finanças no mesmo lugar.<br /><span className="hl">Com notificação real.</span></h3>
            <p className="feat-p on-dark">O Lyvo se integra diretamente com o Google Agenda. Cadastre um compromisso numa mensagem — ele aparece no seu calendário. E você recebe notificação no celular antes de acontecer.</p>
            <div className="feat-list">
              {['Sincronização automática com seu Google Agenda','Notificação no celular antes de cada compromisso','Cadastro por conversa: "reunião amanhã às 14h com João"','Vencimentos de contas fixas também viram eventos no calendário'].map((t, i) => (
                <div className="feat-li on-dark" key={i}>
                  <div className="feat-check teal"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="2,6 5,9 10,3" /></svg></div>{t}
                </div>
              ))}
            </div>
          </div>
          <div className="app-frame" style={{ background: '#1E293B' }}>
            <div style={{ background: '#1E293B', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#4285F4,#34A853)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📅</div>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 800, color: '#fff' }}>Google Agenda</div>
                  <div style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 600 }}>● Sincronizado com Lyvo</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Abril 2026</div>
            </div>
            <div style={{ background: '#132038', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ background: 'rgba(66,133,244,.12)', border: '1px solid rgba(66,133,244,.25)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#4285F4,#34A853)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🔔</div>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 12, fontWeight: 800, color: '#93C5FD' }}>Lembrete em 15 minutos</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>Consulta médica — Dr. Carlos · 14:00</div>
                </div>
              </div>
            </div>
            <div style={{ background: '#0D1A2D', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Hoje — Terça, 14 de Abril</div>
              {[
                { time: '09:00', title: 'Reunião de projeto', sub: 'Google Meet · 1h', color: '#4285F4', textColor: '#93C5FD' },
                { time: '12:00 — Vencimento', title: '💳 Fatura Inter — R$ 2.566', sub: 'Criado automaticamente pelo Lyvo', color: 'var(--coral)', textColor: '#FCA5A5' },
                { time: '14:00', title: 'Consulta médica — Dr. Carlos', sub: 'Clínica Centro · 🔔 Lembrete ativo', color: '#34A853', textColor: '#86EFAC' },
                { time: '18:30', title: 'Pilates — Studio Flex', sub: 'Recorrente toda terça e quinta', color: 'var(--teal)', textColor: 'var(--teal)' },
              ].map(ev => (
                <div key={ev.time} style={{ background: '#1E293B', borderRadius: 10, padding: '10px 12px', borderLeft: `3px solid ${ev.color}` }}>
                  <div style={{ fontSize: 11, color: ev.textColor, fontWeight: 700, marginBottom: 2 }}>{ev.time}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{ev.sub}</div>
                </div>
              ))}
              <div style={{ marginTop: 4, background: '#132038', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontWeight: 600, marginBottom: 5, letterSpacing: '.05em' }}>ADICIONADO VIA LYVO CHAT</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ background: '#D9F7D0', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text)', alignSelf: 'flex-end' }}>
                    reunião com João sexta às 10h<div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1, textAlign: 'right' }}>19:22</div>
                  </div>
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  <div style={{ background: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}>
                    📅 Adicionado ao Google Agenda!<br /><span style={{ fontWeight: 700 }}>Sexta, 18 Abr · 10:00</span> — Reunião com João
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1, textAlign: 'right' }}>19:22</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE 3: PREVISIBILIDADE ── */}
      <section className="feat-section cream-bg">
        <div className="feat-inner flip">
          <div className="feat-copy">
            <div className="feat-tag light">Previsibilidade</div>
            <h3 className="feat-h3 on-light">Sabe como vai fechar<br />o mês antes do dia 30.</h3>
            <p className="feat-p on-light">O Lyvo soma tudo: receitas previstas, despesas pagas, contas fixas pendentes e faturas a vencer. Te dá um número exato. POSITIVO ou CRÍTICO — sem chute, sem surpresa.</p>
            <div className="feat-list">
              {['PIX, Dinheiro e Cartão separados e rastreados','Receitas e despesas pagas vs. pendentes','Projeção de saldo atualizada em tempo real','Alerta CRÍTICO quando os gastos passam da receita'].map((t, i) => (
                <div className="feat-li on-light" key={i}>
                  <div className="feat-check ink"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="2,6 5,9 10,3" /></svg></div>{t}
                </div>
              ))}
            </div>
          </div>
          <div className="app-frame on-cream">
            <div className="s-fin">
              <div className="sf-head"><h4>Financeiro</h4><p>Controle sua saúde financeira</p><div className="sf-month"><span style={{ color: 'var(--text3)' }}>‹</span>&nbsp;Abril De 2026&nbsp;<span style={{ color: 'var(--text3)' }}>›</span></div></div>
              <div className="sf-cards">
                <div className="sf-c g"><div className="sf-cl">Receitas (mês)</div><div className="sf-cv">R$ 4.200,00</div></div>
                <div className="sf-c r"><div className="sf-cl">Despesas (mês)</div><div className="sf-cv">R$ 3.416,67</div></div>
                <div className="sf-c b"><div className="sf-cl">Saldo Acumulado</div><div className="sf-cv">R$ 783,33</div></div>
              </div>
              <div className="previs">
                <div className="previs-top">
                  <div className="previs-name">📈 Previsibilidade</div>
                  <div className="previs-tag pt-pos">POSITIVO</div>
                </div>
                <div className="previs-lbl">PROJEÇÃO DE SALDO</div>
                <div className="previs-val">R$ 783,33</div>
                <div className="previs-row">
                  <div className="pm green"><div className="pm-l">Prev. Receita</div><div className="pm-v">+R$ 4.200</div></div>
                  <div className="pm red"><div className="pm-l">Prev. Saída</div><div className="pm-v">-R$ 3.417</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE 4: CONTAS FIXAS ── */}
      <section className="feat-section dark-bg">
        <div className="feat-inner">
          <div className="feat-copy">
            <div className="feat-tag dark">Contas Fixas</div>
            <h3 className="feat-h3 on-dark">Suas contas fixas<br />já te esperam<br />todo mês.</h3>
            <p className="feat-p on-dark">Cadastre uma vez. O Lyvo relança automaticamente todo mês. Você só confirma o pagamento quando fizer — sem redigitar, sem esquecer, sem susto no saldo.</p>
            <div className="feat-list">
              {['Internet, aluguel, academia, streaming...','Status "ABERTO" até você confirmar','Aviso no dia do vencimento','Tudo já entra na projeção do mês automaticamente'].map((t, i) => (
                <div className="feat-li on-dark" key={i}>
                  <div className="feat-check teal"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="2,6 5,9 10,3" /></svg></div>{t}
                </div>
              ))}
            </div>
          </div>
          <div className="app-frame">
            <div className="s-cf-bg">
              <div className="s-cf-head">
                <h4>🪪 Contas Fixas</h4>
                <div className="s-cf-add">+ Adicionar</div>
              </div>
              {[{ n: 'Internet', m: 'Vence Dia 3 · R$ 200,00' },{ n: 'Água', m: 'Vence Dia 5 · R$ 100,00' },{ n: 'Inglês', m: 'Vence Dia 8 · R$ 350,00' },{ n: 'Condomínio', m: 'Vence Dia 12 · R$ 400,00' }].map(cf => (
                <div className="cf-row" key={cf.n}>
                  <div className="cf-icons-g"><div className="cf-ico-btn">🗑</div><div className="cf-ico-btn">✏</div></div>
                  <div className="cf-info-g"><div className="cf-name-g">{cf.n}</div><div className="cf-meta-g">{cf.m}</div></div>
                  <div className="cf-right-g"><div className="cf-status-g">ABERTO</div><div className="cf-toggle-g" /></div>
                </div>
              ))}
              <div style={{ textAlign: 'center', padding: '14px 0 4px', fontFamily: 'var(--display)', fontSize: 12, fontWeight: 800, color: 'var(--text2)', letterSpacing: '.06em' }}>VER MAIS</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <section className="marquee-wrap">
        <div className="mq-label">O que os usuários mandam pro Lyvo</div>
        {[mq1, mq2].map((chips, row) => (
          <div className="mq-row" key={row}>
            <div className={`mq-track${row === 1 ? ' rev' : ''}`}>
              {[...chips, ...chips].map(([cls, txt], i) => (
                <div className={`mq-chip ${cls}`} key={i}>{txt}</div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── 6 RECURSOS ── */}
      <section style={{ padding: '80px 24px', background: 'var(--white)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="section-eyebrow" style={{ display: 'block', textAlign: 'center' }}>Recursos que Fazem a Diferença</div>
          <div className="section-title" style={{ textAlign: 'center', marginBottom: 48 }}>Tudo o que você precisa para<br />organizar sua vida financeira</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {[
              { bg: '#EFF6FF', icon: '💬', title: 'Chat Inteligente', desc: 'Converse naturalmente: "gastei 50 reais hoje" e pronto. O sistema entende e organiza automaticamente.' },
              { bg: 'var(--green-light,#E6FAF7)', icon: '📊', title: 'Relatórios Visuais', desc: 'Gráficos fáceis de entender que mostram onde vai seu dinheiro e como está sua evolução.' },
              { bg: 'GOOGLE', icon: '📅', title: 'Google Agenda', desc: 'Sincronizado com seu Google Agenda. Cadastre compromissos por mensagem e receba notificação no celular antes de acontecer.', badge: true },
              { bg: '#FFFBEB', icon: '⚡', title: 'Tempo Real', desc: 'Tudo é salvo instantaneamente. Sem perder dados, sem sincronização complicada. Funciona offline e online.' },
              { bg: '#E6FAF7', icon: '🔒', title: 'Dados Seguros', desc: 'Seus dados são armazenados com criptografia. Privacidade total e controle completo sobre suas informações.' },
              { bg: '#FEF2F2', icon: '👨‍👩‍👧', title: 'Para Toda Família', desc: 'Interface simples que qualquer pessoa consegue usar. Desde adolescentes até pessoas mais experientes.' },
            ].map(f => (
              <div key={f.title} style={{ padding: 24, border: f.badge ? '2px solid rgba(66,133,244,.25)' : '1px solid var(--border)', borderRadius: 'var(--r)', background: f.badge ? '#F0F7FF' : 'var(--white)' }}>
                <div style={{ width: 44, height: 44, background: f.badge ? 'linear-gradient(135deg,#4285F4,#34A853)' : f.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 22 }}>{f.icon}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{f.title}</div>
                  {f.badge && <div style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--pill)', letterSpacing: '.04em' }}>INTEGRADO</div>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="dep-section" id="depoimentos">
        <span className="section-eyebrow" style={{ display: 'block', textAlign: 'center' }}>Depoimentos</span>
        <div className="section-title" style={{ textAlign: 'center' }}>Quem usou, não voltou<br />para planilha.</div>
        <div style={{ height: 48 }} />
        <div className="dep-grid">
          {[
            { ini: 'CM', cls: 'da-1', name: 'Carla Mendes', role: 'Professora, 34 anos · São Paulo', txt: 'Tentei Organizze, Mobills e até planilha do Excel. Abandonei todos em 2 semanas. Com o Lyvo são 47 dias e ainda estou usando todos os dias.', hl: '🔑  "O segredo é não ter formulário. É só mandar mensagem."' },
            { ini: 'RS', cls: 'da-2', name: 'Rafael Sousa', role: 'Autônomo, 28 anos · Belo Horizonte', txt: 'Minha fatura do cartão sempre chegava como surpresa. Agora eu sei o valor exato antes de fechar. Mês passado economizei R$340 só porque vi o estouro antes de acontecer.', hl: '💳  "Não tomo mais susto na fatura. Ponto final."' },
            { ini: 'JO', cls: 'da-3', name: 'Juliana Oliveira', role: 'Empreendedora, 41 anos · Rio de Janeiro', txt: 'O que mais me impressionou: mandei uma foto do recibo do restaurante e ele registrou sozinho, com categoria e tudo. Levei literalmente 3 segundos. Isso é diferente de tudo.', hl: '📷  "Foto do recibo e pronto. Que diferença."' },
          ].map(d => (
            <div className="dep-card" key={d.name}>
              <div className="dep-stars">★★★★★</div>
              <div className="dep-text">{d.txt}</div>
              <div className="dep-author">
                <div className={`dep-avatar ${d.cls}`}>{d.ini}</div>
                <div><div className="dep-name">{d.name}</div><div className="dep-role">{d.role}</div></div>
              </div>
              <div className="dep-highlight">{d.hl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARATIVO ── */}
      <section className="compare-section">
        <div className="compare-inner">
          <span className="section-eyebrow" style={{ display: 'block', textAlign: 'center' }}>Comparativo</span>
          <div className="section-title" style={{ textAlign: 'center', fontSize: 'clamp(24px,3vw,38px)' as any }}>O Lyvo contra<br />tudo que você já tentou</div>
          <table className="cmp">
            <thead>
              <tr><th>Funcionalidade</th><th>Apps comuns</th><th className="cmp-lyvo">LYVO™</th></tr>
            </thead>
            <tbody>
              {[
                ['Registrar por mensagem de texto', false, true],
                ['Registrar por áudio ou foto', false, true],
                ['Fatura prevista automaticamente', false, true],
                ['PIX / Dinheiro / Cartão separados', false, true],
                ['Contas fixas relançadas todo mês', false, true],
                ['Projeção de fechamento do mês', 'parcial', '100%'],
                ['Sincronização com Google Agenda', false, true],
                ['Notificação de compromissos no celular', false, true],
                ['Agenda integrada com finanças', false, true],
              ].map(([feat, others, lyvo]) => (
                <tr key={feat as string}>
                  <td>{feat as string}</td>
                  <td>{others === false ? <span className="cx">✗</span> : <span className="cm">{others as string}</span>}</td>
                  <td className="cmp-lyvo">{lyvo === true ? <span className="ck">✓</span> : <span className="ck">{lyvo as string}</span>}</td>
                </tr>
              ))}
              <tr>
                <td>Tempo para registrar um gasto</td>
                <td style={{ color: 'var(--text3)' }}>45–90 segundos</td>
                <td className="cmp-lyvo" style={{ fontFamily: 'var(--display)', fontWeight: 800, color: 'var(--teal-text)' }}>3–5 segundos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── NÚMEROS ── */}
      <section className="num-section">
        <span className="section-eyebrow" style={{ display: 'block', textAlign: 'center' }}>Resultados</span>
        <div className="section-title" style={{ textAlign: 'center', fontSize: 'clamp(26px,3.5vw,42px)' as any }}>Números que comprovam</div>
        <div className="num-grid">
          {[{ v: '3s', l: 'para registrar qualquer gasto via chat' },{ v: '100%', l: 'previsibilidade no fechamento do mês' },{ v: '∞', l: 'cartões cadastrados sem custo no Pro' },{ v: '0', l: 'formulários para preencher em qualquer momento' }].map(n => (
            <div className="num-card" key={n.v}><div className="num-val">{n.v}</div><div className="num-label">{n.l}</div></div>
          ))}
        </div>
      </section>

      {/* ── GARANTIA ── */}
      <section className="garantia-section">
        <div className="garantia-inner">
          <div className="garantia-badge">30 DIAS<br />GARANTIA<br />TOTAL</div>
          <h2>Risco zero.<br /><span>Você tem 30 dias.</span></h2>
          <p>Se em 30 dias você não sentir que o Lyvo mudou sua relação com o dinheiro, devolvemos cada centavo — sem perguntas, sem ligação de retenção, sem formulário de cancelamento complicado.</p>
          <p>Basta mandar uma mensagem. Como tudo no Lyvo.</p>
          <div className="garantia-legal">* Válido para todos os planos pagos · 30 dias corridos a partir da compra</div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pricing-section" id="planos">
        <div className="pricing-intro">
          <span className="section-eyebrow" style={{ display: 'block', textAlign: 'center' }}>Planos</span>
          <div className="section-title" style={{ textAlign: 'center', fontSize: 'clamp(26px,3.5vw,42px)' as any }}>Simples assim.<br />Sem pegadinha.</div>
        </div>
        <div className="pricing-value-anchor">
          <div className="pva-icon">🧮</div>
          <div className="pva-text">A desorganização financeira custa em média <strong>R$1.000 por mês</strong> em gastos evitáveis e juros de cartão. O Lyvo custa <strong>R$12,49/mês</strong>. Ou seja: você gasta R$12 para não perder R$1.000.</div>
        </div>
        <div className="pricing-grid">
          <div className="plan feat">
            <div className="plan-star">Melhor custo-benefício</div>
            <div className="plan-name">Plano Anual</div>
            <div className="plan-p-row"><span className="plan-cur">R$</span><span className="plan-price">12</span><span className="plan-dec">,49</span></div>
            <div className="plan-period">/mês — cobrado anualmente</div>
            <div className="plan-economy">Equivalente a R$ 149,90/ano · Economia de 50%</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Parcelamos em até 5x de R$29,98 · 3 dias grátis para testar</div>
            <div className="plan-features">
              {['Chat inteligente completo (texto, áudio, foto)','Cartões de crédito ilimitados','Contas fixas ilimitadas','Agenda + Google integrado','Relatórios e gráficos','Suporte prioritário','30 dias de garantia total'].map(f => (
                <div className="pf" key={f}><span className="pf-check">✓</span>{f}</div>
              ))}
            </div>
            <a href="https://lastlink.com/p/CA05DE2CE/checkout-payment/" target="_blank" rel="noopener noreferrer" className="plan-cta plan-cta-solid">Aproveitar Desconto Anual →</a>
            <div className="plan-note">* R$149,90 cobrado uma vez por ano</div>
          </div>
          <div className="plan">
            <div className="plan-name">Plano Mensal</div>
            <div className="plan-p-row"><span className="plan-cur">R$</span><span className="plan-price">24</span><span className="plan-dec">,90</span></div>
            <div className="plan-period">/mês — sem fidelidade</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Cancele quando quiser, sem burocracia</div>
            <div className="plan-features">
              {['Chat inteligente (texto)','Controle financeiro completo','Agenda integrada','Relatórios e gráficos','30 dias de garantia total'].map(f => (
                <div className="pf" key={f}><span className="pf-check">✓</span>{f}</div>
              ))}
            </div>
            <a href="https://lastlink.com/p/CE5BD085C/checkout-payment/" target="_blank" rel="noopener noreferrer" className="plan-cta plan-cta-outline">Assinar Mensal →</a>
            <div className="plan-note">Pagamento mensal recorrente no cartão</div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section" id="faq">
        <div className="faq-inner">
          <span className="section-eyebrow" style={{ display: 'block', textAlign: 'center' }}>FAQ</span>
          <div className="section-title" style={{ textAlign: 'center', fontSize: 'clamp(24px,3vw,36px)' as any }}>Tire suas dúvidas<br />sobre o LYVO™</div>
          {faqItems.map((item, i) => (
            <div className={`faq-item${openFaq === i ? ' open' : ''}`} key={i}>
              <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {item.q}<div className="faq-icon">+</div>
              </div>
              <div className="faq-a"><div className="faq-a-inner">{item.a}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="cta-final">
        <h2>Pronto para organizar<br />sua vida de vez?</h2>
        <p>Junte-se a quem parou de adivinhar onde o dinheiro vai e começou a fechar o mês no positivo.</p>
        <button onClick={openSignUpModal} className="btn-hero-main" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 17, padding: '18px 48px', border: 'none', cursor: 'pointer' }}>
          Começar Agora — 3 dias grátis
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
        <div className="cta-final-note">✓ Sem cartão de crédito &nbsp;·&nbsp; ✓ 30 dias de garantia &nbsp;·&nbsp; ✓ Cancele quando quiser</div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="fb-name">LYVO<sup style={{ fontSize: 10, verticalAlign: 'super', fontWeight: 600, color: 'rgba(255,255,255,.2)' }}>™</sup><div className="fb-dot" /></div>
            <p>Controle financeiro e agenda inteligente em um só lugar. O único app de finanças que funciona por conversa.</p>
          </div>
          <div className="footer-col">
            <h5>Links Úteis</h5>
            <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>
            <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer">Termos de Uso</a>
            <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer">Suporte</a>
            <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer">Blog</a>
          </div>
          <div className="footer-col">
            <h5>Contato</h5>
            <a href="mailto:contato@lyvo.com.br">contato@lyvo.com.br</a>
            <a href="https://www.instagram.com/lyvo_assistente?igsh=MWpyOThrZXo2azZxcg%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer">Instagram @lyvo_assistente</a>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 LYVO™ · CNPJ: 36.989.165/0001-85 · <a href="https://meulyvo.com" style={{ color: 'rgba(255,255,255,.15)', textDecoration: 'none' }}>meulyvo.com</a>
        </div>
      </footer>
      {/* ── MODAL LOGIN / CADASTRO ── */}
      {showModal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,20,38,.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 560, borderRadius: 28, padding: '36px 32px', boxShadow: '0 32px 80px rgba(0,0,0,.3)', position: 'relative', maxHeight: '92vh', overflowY: 'auto' }}>

            {/* Close */}
            <button onClick={closeModal} style={{ position: 'absolute', top: 20, right: 20, background: 'var(--cream2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>✕</button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 52, height: 52, background: 'var(--teal-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>
                {isSignUp ? '🚀' : '👋'}
              </div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em', marginBottom: 6 }}>
                {isSignUp ? 'Crie sua conta grátis' : 'Acesse sua conta'}
              </div>
              <div style={{ fontSize: 15, color: 'var(--text3)' }}>
                {isSignUp ? '3 dias grátis — sem cartão de crédito' : 'Bem-vindo de volta ao Lyvo'}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Signup fields */}
              {isSignUp && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Nome Completo</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Como quer ser chamado?"
                      style={{ width: '100%', padding: '12px 16px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'var(--body)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>WhatsApp</label>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000"
                      style={{ width: '100%', padding: '12px 16px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'var(--body)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Data de Nascimento</label>
                    <input type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'var(--body)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Cidade</label>
                    <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="Sua cidade"
                      style={{ width: '100%', padding: '12px 16px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'var(--body)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>UF</label>
                    <input type="text" maxLength={2} required value={userState} onChange={e => setUserState(e.target.value)} placeholder="MG"
                      style={{ width: '100%', padding: '12px 16px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'var(--body)', color: 'var(--text)', textAlign: 'center' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Renda Mensal Média</label>
                    <select required value={income} onChange={e => setIncome(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'var(--body)', color: income ? 'var(--text)' : 'var(--text3)', appearance: 'none' }}>
                      <option value="">Selecione a faixa...</option>
                      <option value="Até 3k">Até R$ 3.000</option>
                      <option value="3k-7k">R$ 3.001 a R$ 7.000</option>
                      <option value="7k-15k">R$ 7.001 a R$ 15.000</option>
                      <option value="15k-30k">R$ 15.001 a R$ 30.000</option>
                      <option value="Acima 30k">Acima de R$ 30.000</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Email + Senha (ambos login e cadastro) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>E-mail</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'var(--body)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Senha</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'var(--body)', color: 'var(--text)' }} />
                </div>
              </div>

              {!isSignUp && (
                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                  <a href="#" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-text)', textDecoration: 'none' }}>Esqueci minha senha</a>
                </div>
              )}

              {/* Error */}
              {formError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#B91C1C', marginBottom: 16 }}>{formError}</div>
              )}

              {/* Submit */}
              <button type="submit"
                style={{ width: '100%', padding: '15px', background: 'var(--teal)', color: 'var(--ink)', border: 'none', borderRadius: 'var(--pill)', fontFamily: 'var(--display)', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: isSignUp ? 4 : 0, transition: 'background .15s' }}>
                {isSignUp ? 'Criar minha conta — 3 dias grátis' : 'Entrar na minha conta'}
              </button>
            </form>

            {/* Toggle login/signup */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 14, color: 'var(--text3)' }}>
              {isSignUp ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
              <button onClick={() => { setIsSignUp(!isSignUp); setFormError(null); }}
                style={{ background: 'none', border: 'none', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--teal-text)', cursor: 'pointer', fontSize: 14 }}>
                {isSignUp ? 'Entrar' : 'Criar conta grátis'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
