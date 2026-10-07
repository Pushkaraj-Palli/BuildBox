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
import { Badge, Button, Logo, ThemeToggle, AppHeader, routeToLogin, navigate, PromptBox, WorkspacePreview, SectionTitle, ProductShell, StatusBadge, examples, features, plans, faqs, fadeUp, projects } from "../components/shared";

const settingsSections = [
  ["/settings", User, "Profile"],
  ["/settings/appearance", Eye, "Appearance"],
  ["/settings/usage", BarChart3, "Usage"],
  ["/settings/billing", CreditCard, "Billing"],
  ["/settings/api-keys", KeyRound, "API Keys"],
  ["/settings/integrations", Plug, "Integrations"],
  ["/settings/danger", Trash2, "Danger zone"],
];

export function SettingsPage() {
  const path = window.location.pathname;
  const current =
    settingsSections.find(([route]) => route === path) || settingsSections[0];
  const title = current[2] as string;
  return (
    <ProductShell title="Settings">
      <div className="settings-layout product-content">
        <nav className="settings-nav">
          {settingsSections.map(([route, Icon, label]) => (
            <button
              className={path === route ? "active" : ""}
              key={route as string}
              onClick={() => navigate(route as string)}
            >
              <Icon size={16} />
              {label as string}
            </button>
          ))}
        </nav>
        <motion.section
          className="settings-content"
          key={path}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="settings-heading">
            <h2>{title}</h2>
            <p>
              Manage your {title.toLowerCase()} preferences and account details.
            </p>
          </div>
          <SettingsPanel type={title} />
        </motion.section>
      </div>
    </ProductShell>
  );
}

function SettingsPanel({ type }: { type: string }) {
  if (type === "Profile")
    return (
      <div className="settings-card">
        <div className="avatar-row">
          <span className="avatar avatar-large">AM</span>
          <div>
            <Button variant="secondary">Upload image</Button>
            <p>JPG, GIF or PNG. 2MB max.</p>
          </div>
        </div>
        <label>
          Full name
          <input defaultValue="Avery Morgan" />
        </label>
        <label>
          Email address
          <input defaultValue="avery@acme.co" />
        </label>
        <div className="settings-actions">
          <Button>Save changes</Button>
        </div>
      </div>
    );
  if (type === "Appearance")
    return (
      <>
        <div className="theme-cards">
          {["Dark", "Light", "System"].map((theme, index) => (
            <button className={index === 0 ? "active" : ""} key={theme}>
              <span className={`theme-preview preview-${theme.toLowerCase()}`}>
                <i />
                <i />
              </span>
              <b>{theme}</b>
            </button>
          ))}
        </div>
        <div className="settings-card">
          <label>
            Code font size
            <input type="range" min="12" max="18" defaultValue="14" />
          </label>
        </div>
      </>
    );
  if (type === "Usage")
    return (
      <>
        <div className="usage-grid">
          <div className="settings-card">
            <span>Daily build quota</span>
            <strong>3 of 5</strong>
            <div className="progress">
              <i style={{ width: "60%" }} />
            </div>
            <p>Resets in 8 hours</p>
          </div>
          <div className="settings-card">
            <span>Tokens this month</span>
            <strong>1.8M</strong>
            <div className="mini-chart">
              {[30, 45, 28, 62, 50, 72, 60, 84, 68, 91, 75, 96].map(
                (height, i) => (
                  <i key={i} style={{ height: `${height}%` }} />
                ),
              )}
            </div>
          </div>
        </div>
        <BuildTable />
      </>
    );
  if (type === "Billing")
    return (
      <>
        <div className="settings-card plan-summary">
          <div>
            <Badge>FREE PLAN</Badge>
            <h3>BuildBox Free</h3>
            <p>5 builds per day and unlimited public projects.</p>
          </div>
          <Button onClick={() => navigate("/pricing")}>Upgrade to Pro</Button>
        </div>
        <div className="settings-card">
          <h3>Payment method</h3>
          <p>No payment method on file.</p>
          <Button variant="secondary">Add payment method</Button>
        </div>
      </>
    );
  if (type === "API Keys")
    return (
      <>
        <div className="settings-actions top-action">
          <p>Use API keys to connect external tools to BuildBox.</p>
          <Button>
            <Plus size={14} /> Create key
          </Button>
        </div>
        <div className="settings-card key-row">
          <KeyRound size={18} />
          <div>
            <b>Production</b>
            <code>bb_live_••••••••4f92</code>
          </div>
          <Button variant="secondary">
            <Copy size={14} /> Copy
          </Button>
          <Button variant="ghost">
            <Trash2 size={14} />
          </Button>
        </div>
      </>
    );
  if (type === "Integrations")
    return (
      <div className="integration-grid">
        {[
          ["GitHub", GitFork, "Connected"],
          ["Vercel", Zap, "Connect"],
          ["Supabase", Blocks, "Connect"],
        ].map(([name, Icon, action]) => (
          <div className="settings-card integration" key={name as string}>
            <Icon size={22} />
            <div>
              <h3>{name as string}</h3>
              <p>Connect your account to streamline your workflow.</p>
            </div>
            <Button variant="secondary">{action as string}</Button>
          </div>
        ))}
      </div>
    );
  return (
    <div className="settings-card danger-card">
      <AlertCircle size={22} />
      <div>
        <h3>Delete account</h3>
        <p>
          Permanently delete your account, projects, and all associated data.
          This cannot be undone.
        </p>
      </div>
      <Button variant="secondary">Delete account</Button>
    </div>
  );
}

function BuildTable() {
  return (
    <div className="settings-card build-table">
      <h3>Recent builds</h3>
      {projects.slice(0, 5).map(([name, status, time]) => (
        <div key={name}>
          <span>
            <FileCode2 size={15} />
            {name}
          </span>
          <StatusBadge status={status} />
          <small>{time}</small>
        </div>
      ))}
    </div>
  );
}


export default SettingsPage;
