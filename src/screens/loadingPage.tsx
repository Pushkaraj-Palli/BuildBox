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

export function LoadingPage() {
  return (
    <div className="system-center loading-page">
      <span className="loading-logo">
        <Blocks size={28} />
      </span>
      <h2>Building your project</h2>
      <AnimatePresence mode="wait">
        <motion.p
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Installing dependencies and preparing your preview…
        </motion.p>
      </AnimatePresence>
      <div className="loading-line">
        <i />
      </div>
    </div>
  );
}

export function ErrorPage({ notFound = false }: { notFound?: boolean }) {
  return (
    <div className="system-center error-page">
      <Logo />
      {notFound ? (
        <>
          <strong>404</strong>
          <h1>This page couldn’t be found.</h1>
          <p>The route may have moved, or perhaps it never existed.</p>
          <code>
            $ cd /page-not-found<span>▋</span>
          </code>
        </>
      ) : (
        <>
          <AlertCircle size={32} />
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Digest: BBX-8F2A91</p>
        </>
      )}
      <div>
        <Button onClick={() => navigate("/dashboard")}>
          {notFound ? "Back to dashboard" : "Try again"}
        </Button>
        {!notFound && <Button variant="secondary">Report issue</Button>}
      </div>
    </div>
  );
}

export default LoadingPage;
