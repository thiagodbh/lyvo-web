import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Lock,
  CreditCard,
  Calendar,
  BarChart3,
  ChevronDown,
} from "lucide-react";

type LandingPageProps = {
  /** Se você já tem auth no app, passe true quando o usuário estiver logado */
  isAuthenticated?: boolean;
};

const CHECKOUT_ANUAL = "https://lastlink.com/p/CA05DE2CE/checkout-payment/";
const CHECKOUT_MENSAL = "https://lastlink.com/p/CE5BD085C/checkout-payment/";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const LandingPage: React.FC<LandingPageProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const actions = useMemo(() => {
    const goAppOrLogin = () => {
      if (isAuthenticated) navigate("/app");
      else navigate("/login?next=/app");
    };

    const startTrial = () => {
      // opcional: use isso no signup para mostrar UI de trial
      sessionStorage.setItem("lyvo_trial_intent", "1");
      navigate("/signup?trial=1&next=/app");
    };

    const goLogin = () => navigate("/login?next=/app");

    const buyAnnual = () => window.location.assign(CHECKOUT_ANUAL);
    const buyMonthly = () => window.location.assign(CHECKOUT_MENSAL);

    return { goAppOrLogin, startTrial, goLogin, buyAnnual, buyMonthly };
  }, [isAuthenticated, navigate]);

  const losses = [
    "Perder a noção do seu saldo real",
    "Descobrir tarde demais que estourou o orçamento",
    "Não saber como vai fechar o mês",
    "Esquecer contas, faturas e compromissos",
    "Viver apagando incêndios financeiros",
    "Voltar para planilhas, anotações soltas e desorganização mental",
  ];

  const gains = [
    "Saldo real em tempo real",
    "Previsão clara de fechamento do mês",
    "Gastos organizados por categoria",
    "Controle de cartões, faturas e limites",
    "Contas fixas e receitas previstas sob controle",
    "Agenda e compromissos integrados à sua vida financeira",
    "Tudo em um só lugar: finanças + agenda",
  ];

  const faqs = [
    {
      q: "E se eu não gostar?",
      a: "Você pode cancelar quando quiser. Sem fidelidade.",
    },
    {
      q: "É complicado?",
      a: "Você já usou. Sabe que é simples, rápido e prático. O LYVO registra por comando (texto/voz) e organiza automaticamente.",
    },
    {
      q: "Vale o preço?",
      a: "Quanto custa não ter controle do seu dinheiro? O anual sai por menos de R$ 12,50/mês e te entrega previsibilidade real do mês.",
    },
    {
      q: "É seguro?",
      a: "Seus dados são protegidos e sua privacidade é prioridade. Nada de vender dados. Nada de uso indevido.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-30 bg-gradient-to-br from-sky-400 to-emerald-300" />
        <div className="absolute -bottom-56 -right-40 h-[560px] w-[560px] rounded-full blur-3xl opacity-25 bg-gradient-to-br from-indigo-400 to-fuchsia-300" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100"
            aria-label="Voltar ao topo"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-extrabold tracking-tight">LYVO</span>
              <span className="text-[11px] text-slate-500">finanças + agenda</span>
            </div>
          </button>

          <nav className="hidden items-center gap-6 md:flex text-sm text-slate-600">
            <a className="hover:text-slate-900" href="#perde">O que perde</a>
            <a className="hover:text-slate-900" href="#ganha">O que ganha</a>
            <a className="hover:text-slate-900" href="#diferente">Por que é diferente</a>
            <a className="hover:text-slate-900" href="#seguranca">Segurança</a>
            <a className="hover:text-slate-900" href="#planos">Planos</a>
            <a className="hover:text-slate-900" href="#faq">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={actions.goLogin}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Entrar <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={actions.startTrial}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              Começar no trial <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 md:pt-20 md:pb-14">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
                <Lock className="h-4 w-4" /> Privacidade e segurança em primeiro lugar
              </div>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                Controle absoluto da sua vida financeira.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-500">
                  Sem planilhas.
                </span>{" "}
                Sem esforço.
              </h1>

              <p className="mt-4 text-lg text-slate-600 md:text-xl">
                Menos estresse, mais clareza e decisão.
              </p>

              <p className="mt-5 max-w-xl text-slate-600">
                O <span className="font-semibold text-slate-900">LYVO</span> organiza seu dinheiro, sua agenda e sua vida financeira em um só lugar — com{" "}
                <span className="font-semibold text-slate-900">previsibilidade real</span> para fechar o mês com tranquilidade.
              </p>

              <p className="mt-4 max-w-xl text-slate-600">
                Você já sentiu como é viver com tudo sob controle. <br />
                <span className="font-semibold text-slate-900">Agora é hora de continuar no comando.</span>
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={actions.goAppOrLogin}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-base font-bold text-white shadow-sm hover:opacity-95"
                >
                  Quero continuar com o LYVO <ArrowRight className="h-5 w-5" />
                </button>

                <button
                  onClick={actions.startTrial}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/70 px-6 py-3 text-base font-bold text-slate-900 backdrop-blur hover:bg-white"
                >
                  Garantir meu controle financeiro agora <Sparkles className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 border border-slate-200">
                  <ShieldCheck className="h-4 w-4" /> Dados protegidos
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 border border-slate-200">
                  <MessageCircle className="h-4 w-4" /> Registre por chat (texto/voz)
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 border border-slate-200">
                  <Calendar className="h-4 w-4" /> Agenda integrada
                </span>
              </div>
            </div>

            {/* Right “device” mock */}
            <div className="md:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">Resumo do mês</div>
                  <div className="text-xs text-slate-500">em tempo real</div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">Saldo real</div>
                      <BarChart3 className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black">R$ 2.839,90</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Previsão de fechamento: <span className="font-semibold text-slate-900">R$ 1.920,10</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Comandos (exemplos)</div>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        “Gastei <span className="font-semibold">500</span> no supermercado”
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        “Paguei o <span className="font-semibold">cartão</span> hoje”
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        “Recebi <span className="font-semibold">3000</span> de salário”
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={actions.startTrial}
                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-500 px-5 py-3 text-sm font-extrabold text-white hover:opacity-95"
                  >
                    Começar agora (trial) <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">
                Você não organiza o LYVO. <span className="font-semibold text-slate-900">O LYVO organiza sua vida financeira.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🔴 O QUE VOCÊ PERDE */}
      <section id="perde" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-100">
                <XCircle className="h-4 w-4" /> O QUE VOCÊ PERDE SE PARAR AGORA
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Se você sair do LYVO, você volta para o{" "}
                <span className="text-red-600">modo improviso</span>.
              </h2>
              <p className="mt-3 text-slate-600">
                Você já sabe como é ter clareza. Abrir mão disso é voltar para o caos financeiro disfarçado de “controle”.
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">
                  Controle não é saber quanto você tem hoje.
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Controle é saber como o seu mês vai terminar.
                </p>
              </div>

              <button
                onClick={actions.goAppOrLogin}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-base font-extrabold text-white hover:opacity-95 md:w-auto"
              >
                Não quero perder meu controle financeiro <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            <div className="md:col-span-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {losses.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-red-50 p-1.5 border border-red-100">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{item}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 O QUE VOCÊ GANHA */}
      <section id="ganha" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-12 md:items-start">
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="h-4 w-4" /> O QUE VOCÊ GANHA CONTINUANDO
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Menos estresse. Mais clareza.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-500">
                  Melhores decisões.
                </span>
              </h2>

              <p className="mt-3 text-slate-600">
                Você para de reagir aos problemas e começa a antecipar o seu futuro financeiro.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {gains.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-emerald-50 p-1.5 border border-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{item}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={actions.goAppOrLogin}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-3 text-base font-extrabold text-white hover:opacity-95 md:w-auto"
              >
                Quero manter essa tranquilidade <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            <div className="md:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-900 p-2 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">O principal</div>
                    <div className="text-xs text-slate-500">o que muda no seu dia</div>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      Você sabe o saldo <span className="font-semibold text-slate-900">real</span>, não “achado”.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      Você enxerga a <span className="font-semibold text-slate-900">previsão do mês</span> antes do susto.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      Você volta a decidir com <span className="font-semibold text-slate-900">clareza</span>.
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                    <CreditCard className="mx-auto h-5 w-5 text-slate-700" />
                    <div className="mt-2 text-[11px] font-semibold text-slate-700">Cartões</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                    <Calendar className="mx-auto h-5 w-5 text-slate-700" />
                    <div className="mt-2 text-[11px] font-semibold text-slate-700">Agenda</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
                    <BarChart3 className="mx-auto h-5 w-5 text-slate-700" />
                    <div className="mt-2 text-[11px] font-semibold text-slate-700">Previsão</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 POR QUE O LYVO É DIFERENTE */}
      <section id="diferente" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 md:p-10 backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
              <MessageCircle className="h-4 w-4" /> POR QUE O LYVO É DIFERENTE DE TUDO
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              O LYVO não é um app de planilha.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-500">
                É um assistente inteligente.
              </span>
            </h2>

            <p className="mt-3 max-w-3xl text-slate-600">
              Você simplesmente escreve ou fala. O LYVO entende, classifica, registra no lugar certo e atualiza saldo, categorias e previsões.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-sm font-bold text-slate-900">Você diz:</div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      “Gastei 500 no supermercado”
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      “Paguei o cartão hoje”
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      “Recebi 3000 de salário”
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Entende o que você disse",
                    "Classifica automaticamente",
                    "Registra no lugar certo",
                    "Atualiza saldo, categorias e previsões",
                    "Sem fricção",
                    "Sem complexidade",
                    "Sem perder tempo",
                    "Tudo automático",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-emerald-50 p-1.5 border border-emerald-100">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="text-sm font-semibold text-slate-800">{item}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={actions.goAppOrLogin}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-base font-extrabold text-white hover:opacity-95"
                  >
                    Continuar com o assistente mais inteligente do mercado <ArrowRight className="h-5 w-5" />
                  </button>

                  <button
                    onClick={actions.startTrial}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-extrabold text-slate-900 hover:bg-slate-50"
                  >
                    Testar no trial <Sparkles className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-8 text-sm text-slate-600">
              Você não organiza o LYVO. <span className="font-semibold text-slate-900">O LYVO organiza sua vida financeira.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 🔒 SEGURANÇA */}
      <section id="seguranca" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-12 md:items-center">
            <div className="md:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                <ShieldCheck className="h-4 w-4" /> SEGURANÇA, PRIVACIDADE E CONFIANÇA
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Seu dinheiro exige respeito.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-500">
                  Seus dados também.
                </span>
              </h2>

              <p className="mt-3 text-slate-600">
                O LYVO foi feito para ser seu aliado — não um risco. Controle, clareza e tranquilidade com segurança de verdade.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  "Seus dados são protegidos",
                  "Sua privacidade é prioridade",
                  "Suas informações são tratadas com segurança",
                  "Nada de vender dados. Nada de uso indevido.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur">
                    <div className="mt-0.5 rounded-full bg-emerald-50 p-1.5 border border-emerald-100">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800">{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-900 p-2 text-white">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Confiança que sustenta o controle</div>
                    <div className="text-xs text-slate-500">segurança + privacidade</div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-5 border border-slate-200">
                  <p className="text-sm text-slate-700">
                    “Quando eu sei que meus dados estão protegidos, eu consigo focar no que importa:{" "}
                    <span className="font-semibold text-slate-900">decidir melhor</span>.”
                  </p>
                  <p className="mt-2 text-xs text-slate-500">— Experiência típica de quem continua no LYVO</p>
                </div>

                <button
                  onClick={actions.startTrial}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-3 text-base font-extrabold text-white hover:opacity-95"
                >
                  Começar com segurança (trial) <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 💳 PLANOS */}
      <section id="planos" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
              <CreditCard className="h-4 w-4" /> PLANOS
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              Escolha como quer{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-500">
                continuar no controle
              </span>
            </h2>
            <p className="mt-2 text-slate-600">
              Sem fidelidade — cancele quando quiser.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {/* Annual (highlight) */}
            <div className="relative rounded-3xl border border-emerald-200 bg-white/70 p-6 shadow-sm backdrop-blur">
              <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-emerald-500 px-3 py-1 text-xs font-black text-white">
                ⭐ Plano Anual — O mais vantajoso
              </div>

              <div className="mt-3">
                <div className="text-sm font-bold text-slate-700">Plano Anual</div>
                <div className="mt-2 text-4xl font-black tracking-tight">R$ 149,90 <span className="text-base font-bold text-slate-500">/ ano</span></div>
                <div className="mt-1 text-sm text-slate-600">
                  ou até <span className="font-bold text-slate-900">5x de R$ 33,66</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  "Menos de R$ 12,50 por mês",
                  "Economia real em relação ao plano mensal",
                  "Acesso completo a todas as funções",
                  "Previsibilidade, controle e tranquilidade o ano inteiro",
                  "Sem fidelidade — cancele quando quiser",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div className="text-sm font-semibold text-slate-800">{item}</div>
                  </div>
                ))}
              </div>

              <div className="mt-7 grid gap-3">
                <button
                  onClick={actions.buyAnnual}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-3 text-base font-extrabold text-white hover:opacity-95"
                >
                  Quero garantir o Plano Anual (Melhor escolha) <ArrowRight className="h-5 w-5" />
                </button>

                <button
                  onClick={actions.startTrial}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-extrabold text-slate-900 hover:bg-slate-50"
                >
                  Quero começar pelo trial <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Monthly */}
            <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-slate-700">Plano Mensal</div>
              <div className="mt-2 text-4xl font-black tracking-tight">
                R$ 24,90 <span className="text-base font-bold text-slate-500">/ mês</span>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  "Mesmo acesso completo",
                  "Pode cancelar quando quiser",
                  "Custa mais no longo prazo",
                ].map((item, idx) => (
                  <div key={item} className="flex items-start gap-3">
                    {idx < 2 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    )}
                    <div className="text-sm font-semibold text-slate-800">{item}</div>
                  </div>
                ))}
              </div>

              <div className="mt-7 grid gap-3">
                <button
                  onClick={actions.buyMonthly}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-base font-extrabold text-white hover:opacity-95"
                >
                  Quero o Plano Mensal <ArrowRight className="h-5 w-5" />
                </button>

                <button
                  onClick={actions.goAppOrLogin}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-extrabold text-slate-900 hover:bg-slate-50"
                >
                  Já tenho acesso — entrar <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Dica: se você quer previsibilidade e economia, o anual é o caminho.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🧠 QUEBRA DE OBJEÇÕES + FAQ */}
      <section id="faq" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <h3 className="text-2xl font-black tracking-tight md:text-3xl">
                Objeções comuns — respondidas de forma direta
              </h3>
              <p className="mt-2 text-slate-600">
                Texto natural, sem “enfeite”. Só o que importa para decidir com segurança.
              </p>

              <div className="mt-6 space-y-3 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur">
                  <span className="font-bold text-slate-900">“E se eu não gostar?”</span>{" "}
                  → Você pode cancelar quando quiser. Sem fidelidade.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur">
                  <span className="font-bold text-slate-900">“É complicado?”</span>{" "}
                  → Você já usou. Sabe que é simples, rápido e prático.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur">
                  <span className="font-bold text-slate-900">“Vale o preço?”</span>{" "}
                  → Quanto custa não ter controle do seu dinheiro?
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur">
                  <span className="font-bold text-slate-900">“É seguro?”</span>{" "}
                  → Seus dados são protegidos e sua privacidade é prioridade.
                </div>
              </div>
            </div>

            <div className="md:col-span-7">
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-2 backdrop-blur">
                {faqs.map((item, idx) => {
                  const open = faqOpen === idx;
                  return (
                    <div key={item.q} className={cx("rounded-2xl", open ? "bg-white" : "bg-transparent")}>
                      <button
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                        onClick={() => setFaqOpen(open ? null : idx)}
                        aria-expanded={open}
                      >
                        <div className="text-sm font-extrabold text-slate-900">{item.q}</div>
                        <ChevronDown className={cx("h-5 w-5 text-slate-500 transition-transform", open && "rotate-180")} />
                      </button>
                      {open && (
                        <div className="px-4 pb-4 text-sm text-slate-600">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={actions.buyAnnual}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-3 text-base font-extrabold text-white hover:opacity-95"
                >
                  Escolher o Plano Anual e economizar <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={actions.startTrial}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-extrabold text-slate-900 hover:bg-slate-50"
                >
                  Começar pelo trial <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🏁 CTA FINAL */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white md:p-12">
            <h3 className="text-3xl font-black tracking-tight md:text-4xl">
              Você já provou como é viver com controle.{" "}
              <span className="text-emerald-300">Não volte para o improviso.</span>
            </h3>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                "Controle absoluto da sua vida financeira",
                "Previsibilidade real para fechar o mês com tranquilidade",
                "Menos estresse, mais clareza e poder de decisão",
                "Seu dinheiro sob controle, sem planilhas e sem complicação",
                "Tudo em um só lugar: finanças + agenda",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300 mt-0.5" />
                  <div className="text-sm font-semibold">{item}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={actions.goAppOrLogin}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-base font-extrabold text-slate-900 hover:opacity-95"
              >
                Garantir meu acesso agora <ArrowRight className="h-5 w-5" />
              </button>

              <button
                onClick={actions.buyAnnual}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-3 text-base font-extrabold text-white hover:opacity-95"
              >
                Escolher o Plano Anual e economizar <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-5 text-xs text-white/70">
              Sem fidelidade. Cancele quando quiser.
            </p>
          </div>

          <footer className="mt-10 flex flex-col items-center justify-between gap-3 text-xs text-slate-500 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400" />
              <span>© {new Date().getFullYear()} LYVO</span>
            </div>
            <div className="flex items-center gap-4">
              <a className="hover:text-slate-700" href="#seguranca">Privacidade</a>
              <a className="hover:text-slate-700" href="#planos">Planos</a>
              <button onClick={actions.goLogin} className="hover:text-slate-700">
                Entrar
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
