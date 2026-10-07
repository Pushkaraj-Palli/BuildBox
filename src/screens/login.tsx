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

export function Login() {
  const prompt = sessionStorage.getItem("buildbox-prompt");
  return (
    <div className="auth-page">
      <div className="auth-form-panel">
        <div className="auth-form">
          <Logo />
          <div className="auth-heading">
            <h1>Welcome back</h1>
            <p>Log in to continue building.</p>
          </div>
          {prompt && (
            <div className="prompt-banner">
              <Sparkles size={15} />
              <span>
                Sign in to build: <b>{prompt}</b>
              </span>
            </div>
          )}
          <Button variant="secondary">
            <GitFork size={17} /> Continue with GitHub
          </Button>
          <Button variant="secondary">
            <Globe2 size={17} /> Continue with Google
          </Button>
          <div className="divider">
            <span>or continue with email</span>
          </div>
          <label>
            Email
            <input type="email" placeholder="you@company.com" />
          </label>
          <label>
            Password <a href="#">Forgot password?</a>
            <input type="password" placeholder="Enter your password" />
          </label>
          <Button>
            Log in <ArrowRight size={16} />
          </Button>
          <p className="auth-switch">
            Don’t have an account? <a href="#">Sign up</a>
          </p>
        </div>
      </div>
      <div className="auth-art">
        <WorkspacePreview />
      </div>
    </div>
  );
}



export default Login;
