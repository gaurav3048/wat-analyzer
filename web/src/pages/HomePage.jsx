import React from 'react';
import { useNavigate } from 'react-router-dom';

const MODULE_CONFIG = {
  ssb: {
    title: 'Defence & SSB WAT Coach',
    subtitle: 'Prepare for Officer Like Qualities (OLQ) assessment',
    icon: '🎖️',
    gradient: 'from-amber-600 to-orange-600',
    shadow: 'shadow-amber-500/20',
    description: 'Practice Word Association Tests modelled after SSB interview psychology. Evaluates initiative, leadership, composure, and cooperation.',
    timer: 15,
    count: 15,
  },
  interview: {
    title: 'Job Interview & Campus Coach',
    subtitle: 'Sharpen communication & behavioral mindset',
    icon: '💼',
    gradient: 'from-blue-600 to-cyan-600',
    shadow: 'shadow-blue-500/20',
    description: 'Rapid-fire word association drills tailored for behavioral job interviews. Tests proactive ownership, communication clarity, and teamwork.',
    timer: 15,
    count: 15,
  },
  student: {
    title: 'Student Mindset Coach',
    subtitle: 'Cultivate resilience & growth mindset',
    icon: '🎓',
    gradient: 'from-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-500/20',
    description: 'Develop self-discipline, optimism, and emotional resilience through timed psychological association exercises.',
    timer: 20,
    count: 12,
  },
  workplace: {
    title: 'Workplace Communication Analyzer',
    subtitle: 'Master professional presence & empathy',
    icon: '🏢',
    gradient: 'from-purple-600 to-pink-600',
    shadow: 'shadow-purple-500/20',
    description: 'Evaluate your spontaneous reactions, assertiveness, and leadership instincts in professional workplace settings.',
    timer: 20,
    count: 12,
  }
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            AI-Powered Personality & Communication Assessment
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 animate-slide-up tracking-tight">
            AI Word Association Test
            <br />
            <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
              Evaluator & Coach
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Transform your subconscious communication patterns. Take timed psychological WAT drills,
            receive explainable AI trait breakdowns, and learn high-impact phrasing with the Gemini Rewrite Coach.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 text-white/50 text-sm bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-emerald-400 text-lg">⚡</span>
              Timed Rapid Response Drills
            </div>
            <div className="flex items-center gap-2 text-white/50 text-sm bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-blue-400 text-lg">🧠</span>
              Transformer Trait Embeddings
            </div>
            <div className="flex items-center gap-2 text-white/50 text-sm bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-purple-400 text-lg">🔍</span>
              Explainable Token Highlights
            </div>
            <div className="flex items-center gap-2 text-white/50 text-sm bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-amber-400 text-lg">✍️</span>
              Gemini AI Rewrite Coach
            </div>
          </div>
        </div>
      </section>

      {/* Module Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 pb-20">
        <h2 className="font-display text-2xl font-bold text-white mb-6">Select a Practice Track</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(MODULE_CONFIG).map(([key, config], idx) => (
            <ModuleCard key={key} moduleKey={key} config={config} index={idx} />
          ))}
        </div>
      </section>

      {/* Architecture Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="font-display text-3xl font-bold text-center mb-12">
          <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            How The System Works
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              icon: '⏱️',
              title: 'Timed WAT Simulation',
              desc: 'Candidates are given 15-20 seconds per word to respond spontaneously without overthinking, capturing raw psychological intent.'
            },
            {
              step: '02',
              icon: '📊',
              title: 'Multi-Trait Scoring',
              desc: 'Analyzes response embeddings and sentiment against 7 key dimensions: Optimism, Emotional Stability, Agency, Leadership, and Responsibility.'
            },
            {
              step: '03',
              icon: '🔍',
              title: 'Explainable AI Highlights',
              desc: 'Perturbation analysis isolates individual tokens, showing candidates precisely which words positively or negatively shifted their scores.'
            },
            {
              step: '04',
              icon: '✍️',
              title: 'AI Rewrite Coaching',
              desc: 'Leverages Google Gemini to rephrase weak responses into authentic, action-oriented answers demonstrating high leadership presence.'
            },
          ].map((f, i) => (
            <div key={i} className="glass-card p-6 relative overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="absolute top-4 right-4 text-xs font-mono font-bold text-white/20">{f.step}</span>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display font-semibold text-lg mb-2 text-white">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ moduleKey, config, index }) {
  const navigate = useNavigate();

  return (
    <div
      className="glass-card-hover p-8 cursor-pointer group animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={() => navigate(`/test/${moduleKey}`)}
    >
      <div className="flex items-start gap-5">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform duration-300 ${config.shadow} shadow-lg`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-xl mb-1 text-white group-hover:text-primary-300 transition-colors">
            {config.title}
          </h3>
          <p className="text-white/40 text-sm mb-3">{config.subtitle}</p>
          <p className="text-white/50 text-sm leading-relaxed">{config.description}</p>
          <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
            <span>⏱ {config.timer}s per word</span>
            <span>📝 {config.count} prompts</span>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r ${config.gradient} text-white opacity-90 group-hover:opacity-100 transition-opacity`}>
          Start Practice Track →
        </span>
      </div>
    </div>
  );
}
