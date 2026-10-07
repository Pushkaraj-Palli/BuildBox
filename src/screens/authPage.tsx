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

export function AuthPage({ mode }: { mode: "signup" | "forgot" }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="auth-page">
      <div className="auth-form-panel">
        <motion.div
          className="auth-form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Logo />
          <div className="auth-heading">
            <h1>
              {mode === "signup"
                ? "Create your account"
                : sent
                  ? "Check your inbox"
                  : "Reset your password"}
            </h1>
            <p>
              {mode === "signup"
                ? "Start building your first project for free."
                : sent
                  ? "We sent a reset link to you@company.com."
                  : "We’ll send you a secure reset link."}
            </p>
          </div>
          {sent ? (
            <div className="success-state">
              <CheckCircle2 size={28} />
              <p>Didn’t receive it? Resend in 30s</p>
              <Button variant="secondary" onClick={() => navigate("/login")}>
                Back to login
              </Button>
            </div>
          ) : (
            <>
              {mode === "signup" && (
                <label>
                  Name
                  <input placeholder="Your name" />
                </label>
              )}
              <label>
                Email
                <input type="email" placeholder="you@company.com" />
              </label>
              {mode === "signup" && (
                <>
                  <label>
                    Password
                    <input
                      type="password"
                      placeholder="At least 8 characters"
                    />
                  </label>
                  <div className="strength">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <p className="password-rules">
                    <Check size={12} /> 8+ characters &nbsp; <Check size={12} />{" "}
                    One number
                  </p>
                </>
              )}
              <Button
                onClick={() =>
                  mode === "forgot" ? setSent(true) : navigate("/dashboard")
                }
              >
                {mode === "signup" ? "Create account" : "Send reset link"}{" "}
                <ArrowRight size={15} />
              </Button>
              <p className="auth-switch">
                <button onClick={() => navigate("/login")}>
                  Back to login
                </button>
              </p>
            </>
          )}
        </motion.div>
      </div>
      <div className="auth-art">
        <WorkspacePreview />
      </div>
    </div>
  );
}


export default AuthPage;
