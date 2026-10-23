import { useCallback, useEffect, useState } from 'react';
import { narrator, sfx } from './audio';
import { AudioBar } from './components/AudioBar';
import { Briefing } from './components/Briefing';
import { FinalReport } from './components/FinalReport';
import { GameScreen, type Tab } from './components/GameScreen';
import { SetupScreen } from './components/SetupScreen';
import { QUIZ } from './content/pedagogy';
import { decodeConfig, defaultConfig } from './engine/config';
import { analyzePeriod, periodSpeech } from './engine/feedback';
import { toSpeech } from './engine/format';
import { randomSeed } from './engine/rng';
import { getScenario } from './engine/scenarios';
import { initState, nextDecisionsFrom, runPeriod } from './engine/simulation';
import type { Decisions, SimConfig, SimState, StudentProfile } from './engine/types';
import {
  clearSave,
  loadAudioPrefs,
  loadSave,
  storeAudioPrefs,
  storeSave,
  type AudioPrefs,
  type Phase,
  type SaveGame,
} from './storage';

function configFromHash(): SimConfig | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.hash.match(/codigo=([A-Za-z0-9-]+)/);
  return m ? decodeConfig(decodeURIComponent(m[1])) : null;
}

const EMPTY_PROFILE: StudentProfile = { name: '', group: '' };

export default function App() {
  const [save, setSave] = useState<SaveGame | null>(() => loadSave());
  const [assignedConfig] = useState<SimConfig | null>(() => configFromHash());
  const [phase, setPhase] = useState<Phase>('setup');
  const [profile, setProfile] = useState<StudentProfile>(() => save?.profile ?? EMPTY_PROFILE);
  const [config, setConfig] = useState<SimConfig>(() => assignedConfig ?? defaultConfig());
  const [sim, setSim] = useState<SimState | null>(null);
  const [draft, setDraft] = useState<Decisions | null>(null);
  const [tab, setTab] = useState<Tab>('decisiones');
  const [reflections, setReflections] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<Record<string, number>>({});
  const [audio, setAudio] = useState<AudioPrefs>(() => loadAudioPrefs());

  // Guarda el progreso en cada cambio relevante.
  useEffect(() => {
    if (phase === 'setup' || !sim || !draft) return;
    storeSave({ phase, profile, config, state: sim, draft, reflections, quiz });
  }, [phase, profile, config, sim, draft, reflections, quiz]);

  useEffect(() => {
    document.title = sim ? `${getScenario(config.scenarioId).company} · ERP Americana` : 'ERP Americana · Simulador gerencial';
  }, [sim, config.scenarioId]);

  const updateAudio = (p: AudioPrefs) => {
    setAudio(p);
    storeAudioPrefs(p);
  };

  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const start = (p: StudentProfile, c: SimConfig) => {
    narrator.stop();
    const s = initState(c);
    setProfile(p);
    setConfig(c);
    setSim(s);
    setDraft(nextDecisionsFrom(s, c));
    setReflections([]);
    setQuiz({});
    setTab('decisiones');
    setPhase('briefing');
    sfx.play('click');
    goTop();
  };

  const resume = () => {
    if (!save) return;
    narrator.stop();
    setProfile(save.profile);
    setConfig(save.config);
    setSim(save.state);
    setDraft(save.draft);
    setReflections(save.reflections);
    setQuiz(save.quiz);
    setTab(save.state.history.length > 0 && !save.state.finished ? 'decisiones' : 'resultados');
    setPhase(save.phase === 'setup' ? 'play' : save.phase);
    goTop();
  };

  const run = useCallback(() => {
    if (!sim || !draft) return;
    const out = runPeriod(sim, draft, config);
    const scenario = getScenario(config.scenarioId);
    setSim(out.state);
    setDraft(nextDecisionsFrom(out.state, config));
    setTab('resultados');
    goTop();

    const r = out.result;
    if (out.state.finished) sfx.play(out.state.bankrupt ? 'error' : 'finish');
    else sfx.play(r.score.total >= 70 ? 'success' : r.score.total >= 50 ? 'warning' : 'error');

    if (audio.autoNarrate) {
      const feedback = analyzePeriod(r, scenario, config, sim.history[sim.history.length - 1]);
      let text = periodSpeech(r, scenario, feedback);
      const next = out.state.pendingEvent;
      if (next) text += ` Atención: para el próximo mes hay un evento. ${next.title}. ${next.description}`;
      if (out.state.finished) text += out.state.bankrupt ? ' La empresa entró en liquidación.' : ' Terminaste la simulación. Abre el informe final.';
      narrator.speak(toSpeech(text), `resumen-${r.period}`);
    }
  }, [sim, draft, config, audio.autoNarrate]);

  const exit = () => {
    narrator.stop();
    setSave(loadSave());
    setPhase('setup');
    goTop();
  };

  const restart = () => {
    narrator.stop();
    clearSave();
    setSave(null);
    setSim(null);
    setDraft(null);
    setConfig((c) => ({ ...c, seed: assignedConfig ? c.seed : randomSeed() }));
    setPhase('setup');
    goTop();
  };

  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header className="app-header no-print">
        <div className="container header-inner">
          <button type="button" className="brand" onClick={() => (phase === 'setup' ? goTop() : exit())} aria-label="ERP Americana, ir al inicio">
            <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="var(--accent)" />
              <path d="M14 46V30h8v16zm14 0V20h8v26zm14 0V12h8v34z" fill="#fff" />
            </svg>
            <span>
              ERP Americana <small>Simulador gerencial</small>
            </span>
          </button>
          <AudioBar prefs={audio} onChange={updateAudio} />
        </div>
      </header>

      {phase === 'setup' ? (
        <SetupScreen
          key={save ? 'with-save' : 'no-save'}
          initialConfig={config}
          initialProfile={profile}
          assigned={Boolean(assignedConfig)}
          save={save}
          onStart={start}
          onResume={resume}
          onDiscard={() => {
            clearSave();
            setSave(null);
          }}
        />
      ) : null}

      {phase === 'briefing' && sim ? (
        <Briefing
          profile={profile}
          config={config}
          state={sim}
          onBack={() => {
            narrator.stop();
            setPhase('setup');
          }}
          onStart={() => {
            narrator.stop();
            setPhase('play');
            setTab('decisiones');
            goTop();
          }}
        />
      ) : null}

      {phase === 'play' && sim && draft ? (
        <GameScreen
          profile={profile}
          config={config}
          state={sim}
          draft={draft}
          tab={tab}
          onTab={setTab}
          onDraft={setDraft}
          onRun={run}
          onFinish={() => {
            narrator.stop();
            setPhase('final');
            goTop();
          }}
          onExit={exit}
        />
      ) : null}

      {phase === 'final' && sim ? (
        <FinalReport
          profile={profile}
          config={config}
          state={sim}
          reflections={reflections}
          quiz={quiz}
          onReflections={setReflections}
          onQuiz={(q) => {
            const id = Object.keys(q).find((k) => quiz[k] === undefined);
            const question = id ? q[id] : undefined;
            setQuiz(q);
            const item = QUIZ.find((x) => x.id === id);
            if (item && question !== undefined) sfx.play(item.answer === question ? 'success' : 'error');
          }}
          onBack={() => {
            setPhase('play');
            setTab('tablero');
            goTop();
          }}
          onRestart={restart}
        />
      ) : null}

      <footer className="app-footer no-print">
        <div className="container">
          <p>
            ERP Americana · Simulador educativo de decisiones gerenciales. Los datos del mercado son ficticios y con fines de aprendizaje. Tu
            progreso se guarda solo en este navegador.
          </p>
        </div>
      </footer>
    </>
  );
}
