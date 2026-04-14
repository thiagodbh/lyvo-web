import React, { useState, useEffect } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onLogin?: (email: string, password: string) => Promise<void> | void;
  onSignUp?: (email: string, password: string) => Promise<void> | void;
}

const LandingPage: React.FC<LandingPageProps> = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timerText, setTimerText] = useState('00:00:00');

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
            <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer" className="btn-entrar">Entrar</a>
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
          <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer" className="btn-hero-main" onClick={() => setMobileMenuOpen(false)}>Começar — 3 dias grátis</a>
          <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer" className="btn-entrar-mobile">Entrar na minha conta</a>
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
            <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer" className="btn-hero-main">
              Começar Agora — 3 dias grátis
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </a>
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
        <a href="https://meulyvo.com" target="_blank" rel="noopener noreferrer" className="btn-hero-main" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 17, padding: '18px 48px' }}>
          Começar Agora — 3 dias grátis
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </a>
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
    </div>
  );
};

export default LandingPage;
