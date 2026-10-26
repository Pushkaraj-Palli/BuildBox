"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const prompt = sessionStorage.getItem("buildbox-prompt");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
      const destination = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: destination,
      });

      if (result?.error || !result?.url) {
        setError("Email or password is incorrect.");
        return;
      }

      window.location.assign(result.url);
    } catch {
      setError("We couldn’t sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
          <Button variant="secondary" disabled>
            <GitFork size={17} /> Continue with GitHub
          </Button>
          <Button variant="secondary" disabled>
            <Globe2 size={17} /> Continue with Google
          </Button>
          <div className="divider">
            <span>or continue with email</span>
          </div>
          <form className="auth-fields" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password <a href="/forgot-password">Forgot password?</a>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"} <ArrowRight size={16} />
            </Button>
          </form>
          <p className="auth-switch">
            Don’t have an account? <a href="/signup">Sign up</a>
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
