"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Blocks } from "lucide-react";

type TheAnimationProps = { stage: number; steps: string[]; progress: number; statusText?: string; showStatus?: boolean };

export default function TheAnimation({ stage, steps, progress, statusText, showStatus = true }: TheAnimationProps) {
  const reducedMotion = useReducedMotion();
  const currentStage = Math.max(0, Math.min(stage, steps.length - 1));
  const boundedProgress = Math.max(0, Math.min(progress, 99));

  return (
    <div className="generation-state" role="status" aria-live="polite">
      <div className="generation-visual" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <motion.span className="loading-logo"
          animate={reducedMotion ? undefined : { scale: [1, 1.06, 1], rotate: [0, 3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <Blocks size={29} />
        </motion.span>
        <div className="generation-card card-one"><span /><span /><span /></div>
        <div className="generation-card card-two"><span /><span /></div>
      </div>
      {showStatus && <>
        <AnimatePresence mode="wait">
          <motion.div className="workspace-generation-copy" key={currentStage}
            initial={reducedMotion ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}>
            <strong>{statusText || steps[currentStage]}</strong><span>{Math.round(boundedProgress)}% complete</span>
          </motion.div>
        </AnimatePresence>
        <div className="generation-progress" aria-label={`${Math.round(boundedProgress)}% complete`}>
          <motion.i animate={{ width: `${boundedProgress}%` }} transition={{ duration: reducedMotion ? 0 : 0.7, ease: "easeOut" }} />
        </div>
      </>}
    </div>
  );
}
