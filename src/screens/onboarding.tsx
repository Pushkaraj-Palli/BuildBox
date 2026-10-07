"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, AlertCircle, BarChart3, Blocks, Bot, Check, CheckCircle2,
  ChevronDown, CircleCheck, Code2, Copy, CreditCard, ExternalLink, Eye,
  FileCode2, FolderKanban, GitFork, Grid2X2, Globe2, History, KeyRound,
  LayoutTemplate, Menu, Monitor, MoreHorizontal, PanelLeftClose, Plug, Plus,
  Rocket, Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles,
  TerminalSquare, Trash2, User, Users, WandSparkles, X, Zap,
} from "lucide-react";
import { Badge, Button, Logo, ThemeToggle, AppHeader, routeToLogin, navigate, PromptBox, WorkspacePreview, SectionTitle, ProductShell, StatusBadge, examples, features, plans, faqs, fadeUp } from "../components/shared";

export function Onboarding() {
  const [step, setStep] = useState(0);
  return (
    <div className="system-center">
      <Logo />
      <div className="onboarding-card">
        <div className="onboarding-progress">
          <i style={{ width: `${(step + 1) * 33.33}%` }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {step === 0 ? (
              <>
                <Badge>STEP 1 OF 3</Badge>
                <h1>What do you build?</h1>
                <p>Choose all that apply. This helps tailor your experience.</p>
                <div className="choice-grid">
                  {[
                    "Client sites",
                    "SaaS products",
                    "Internal tools",
                    "Personal projects",
                  ].map((x) => (
                    <button key={x}>{x}</button>
                  ))}
                </div>
              </>
            ) : step === 1 ? (
              <>
                <Badge>STEP 2 OF 3</Badge>
                <h1>Choose your stack</h1>
                <p>You can change this for every project.</p>
                <div className="choice-grid">
                  {["Next.js", "React", "Vite"].map((x) => (
                    <button key={x}>{x}</button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Badge>YOU’RE READY</Badge>
                <h1>What will you build first?</h1>
                <p>Start with an idea. BuildBox will help with the rest.</p>
                <div className="onboarding-prompt">
                  <textarea placeholder="Build a customer portal for..." />
                  <Send size={17} />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="onboarding-actions">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button
            onClick={() =>
              step < 2 ? setStep(step + 1) : navigate("/workspace/new")
            }
          >
            {step < 2 ? "Continue" : "Start building"} <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}


export default Onboarding;
