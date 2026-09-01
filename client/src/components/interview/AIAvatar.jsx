import React, { useEffect, useRef } from 'react';
import interviewerImg from '../../assets/ai_interviewer2.jpg';

/**
 * AIAvatar — Professional Human-Style Interviewer Avatar
 *
 * States:
 *   idle        → calm, slightly subtle breathing animation
 *   listening   → attentive pulse ring, green border accent
 *   thinking    → rotating ring overlay, warm amber tint
 *   speaking    → blue ring pulses, subtle scale bounce
 *   acknowledging → brief nod (opacity transition)
 *   coding      → calm neutral state (purple accent)
 *   completed   → green accent, soft glow
 */

const stateConfig = {
  idle: {
    ring: 'ring-white/10',
    glow: 'shadow-[0_0_30px_rgba(99,102,241,0.15)]',
    label: '',
    labelClass: '',
    containerClass: 'breathe',
  },
  listening: {
    ring: 'ring-emerald-400/70',
    glow: 'shadow-[0_0_35px_rgba(52,211,153,0.35)]',
    label: 'Listening',
    labelClass: 'bg-emerald-500/90 text-white',
    containerClass: '',
  },
  thinking: {
    ring: 'ring-amber-400/60',
    glow: 'shadow-[0_0_35px_rgba(251,191,36,0.25)]',
    label: 'Thinking',
    labelClass: 'bg-amber-500/90 text-white',
    containerClass: '',
  },
  speaking: {
    ring: 'ring-indigo-400/80',
    glow: 'shadow-[0_0_40px_rgba(99,102,241,0.4)]',
    label: 'Speaking',
    labelClass: 'bg-indigo-500/90 text-white',
    containerClass: 'speak-bounce',
  },
  acknowledging: {
    ring: 'ring-sky-400/60',
    glow: 'shadow-[0_0_30px_rgba(56,189,248,0.3)]',
    label: 'Acknowledging',
    labelClass: 'bg-sky-500/90 text-white',
    containerClass: '',
  },
  coding: {
    ring: 'ring-violet-400/60',
    glow: 'shadow-[0_0_35px_rgba(139,92,246,0.25)]',
    label: 'Reviewing Code',
    labelClass: 'bg-violet-500/90 text-white',
    containerClass: '',
  },
  completed: {
    ring: 'ring-emerald-400/80',
    glow: 'shadow-[0_0_40px_rgba(52,211,153,0.4)]',
    label: 'Interview Complete',
    labelClass: 'bg-emerald-600/90 text-white',
    containerClass: '',
  },
};

// Listening ring component — concentric animated rings
function ListeningRings() {
  return (
    <>
      <div
        className="absolute inset-[-8px] rounded-full border-2 border-emerald-400/50 animate-ping"
        style={{ animationDuration: '1.8s' }}
      />
      <div
        className="absolute inset-[-18px] rounded-full border border-emerald-400/25 animate-ping"
        style={{ animationDuration: '1.8s', animationDelay: '0.4s' }}
      />
    </>
  );
}

// Speaking ring component — blue concentric pulses
function SpeakingRings() {
  return (
    <>
      <div
        className="absolute inset-[-6px] rounded-full border-2 border-indigo-400/60 animate-ping"
        style={{ animationDuration: '1.2s' }}
      />
      <div
        className="absolute inset-[-16px] rounded-full border border-indigo-400/30 animate-ping"
        style={{ animationDuration: '1.2s', animationDelay: '0.25s' }}
      />
      <div
        className="absolute inset-[-26px] rounded-full border border-indigo-400/15 animate-ping"
        style={{ animationDuration: '1.2s', animationDelay: '0.5s' }}
      />
    </>
  );
}

// Thinking spinner
function ThinkingSpinner() {
  return (
    <>
      <div
        className="absolute inset-[-8px] rounded-full border-2 border-t-amber-400/70 border-r-amber-400/70 border-b-transparent border-l-transparent animate-spin"
        style={{ animationDuration: '1.5s' }}
      />
      <div
        className="absolute inset-[-20px] rounded-full border border-t-amber-300/40 border-r-transparent border-b-amber-300/40 border-l-transparent animate-spin"
        style={{ animationDuration: '2.5s', animationDirection: 'reverse' }}
      />
    </>
  );
}

export default function AIAvatar({ state = 'idle', className = '', showLabel = true }) {
  const config = stateConfig[state] || stateConfig.idle;

  return (
    <div className={`relative flex flex-col items-center gap-3 select-none ${className}`}>
      {/* Glow backdrop */}
      <div
        className={`absolute inset-[-50px] rounded-full blur-2xl transition-all duration-700 pointer-events-none ${state === 'speaking' ? 'bg-indigo-500/10' :
          state === 'listening' ? 'bg-emerald-500/10' :
            state === 'thinking' ? 'bg-amber-500/8' :
              state === 'coding' ? 'bg-violet-500/8' :
                state === 'completed' ? 'bg-emerald-500/12' :
                  'bg-indigo-500/5'
          }`}
      />

      {/* Avatar container */}
      <div className={`relative flex items-center justify-center ${config.containerClass}`}>
        {/* State-specific rings */}
        {state === 'listening' && <ListeningRings />}
        {state === 'speaking' && <SpeakingRings />}
        {state === 'thinking' && <ThinkingSpinner />}

        {/* Avatar image with ring */}
        <div
          className={`
            relative w-28 h-28 rounded-full overflow-hidden
            ring-4 transition-all duration-500
            ${config.ring} ${config.glow}
          `}
        >
          {/* Background gradient for image frame */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />

          {/* Interviewer image */}
          <img
            src={interviewerImg}
            alt="AI Interviewer"
            className="absolute inset-0 w-full h-full object-cover object-top"
            draggable={false}
          />

          {/* State-specific overlay tints */}
          {state === 'thinking' && (
            <div className="absolute inset-0 bg-amber-500/8 pointer-events-none" />
          )}
          {state === 'speaking' && (
            <div className="absolute inset-0 bg-indigo-500/8 pointer-events-none" />
          )}
        </div>

        {/* Online indicator dot */}
        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-900 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
      </div>

      {/* Name badge */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white tracking-wide">Aliha Chen</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-semibold uppercase tracking-wider">AI</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Senior Technical Interviewer</span>
      </div>

      {/* State label pill */}
      {showLabel && config.label && (
        <div
          className={`
            text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full
            transition-all duration-300 backdrop-blur-sm
            ${config.labelClass}
          `}
        >
          {config.label}
        </div>
      )}
    </div>
  );
}
