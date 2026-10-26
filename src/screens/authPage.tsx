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

export function AuthPage({ mode }: { mode: "signup" | "forgot" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message ?? "We couldn’t create your account.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: "/dashboard",
      });

      if (signInResult?.error || !signInResult?.url) {
        setError("Your account was created. Please log in to continue.");
        return;
      }

      window.location.assign(signInResult.url);
    } catch {
      setError("We couldn’t create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
                : "Reset your password"}
            </h1>
            <p>
              {mode === "signup"
                ? "Start building your first project for free."
                : "Password reset isn’t available yet."}
            </p>
          </div>
          {mode === "forgot" ? (
            <Button variant="secondary" onClick={() => navigate("/login")}>
              Back to login
            </Button>
          ) : (
            <>
              <form className="auth-fields" onSubmit={handleSignup}>
                <label>
                  Name
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                  />
                </label>
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
                    Password
                    <input
                      type="password"
                      name="new-password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
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
                {error && <p className="auth-error" role="alert">{error}</p>}
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating account…" : "Create account"} <ArrowRight size={15} />
                </Button>
              </form>
              <p className="auth-switch">
                Already have an account? <button onClick={() => navigate("/login")}>Log in</button>
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
