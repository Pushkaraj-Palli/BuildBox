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

export function WorkspacePage() {
  const [overlay, setOverlay] = useState<"deploy" | "share" | "history" | null>(
    null,
  );
  return (
    <div className="workspace-page">
      <header>
        <Logo />
        <div className="workspace-name">
          Atlas Analytics <span>Saved</span>
        </div>
        <div>
          <Button variant="ghost" onClick={() => setOverlay("history")}>
            <History size={15} /> History
          </Button>
          <Button variant="secondary" onClick={() => setOverlay("share")}>
            <Users size={15} /> Share
          </Button>
          <Button onClick={() => setOverlay("deploy")}>
            <Rocket size={15} /> Deploy
          </Button>
        </div>
      </header>
      <div className="full-workspace">
        <div className="workspace-chat">
          <button className="back-link" onClick={() => navigate("/dashboard")}>
            <ArrowRight size={14} /> Projects
          </button>
          <h2>Build with BuildBox</h2>
          <div className="message user-message">
            Create a focused analytics dashboard with revenue, activation, and
            retention.
          </div>
          <div className="message ai-message">
            <span className="bot-avatar">
              <Bot size={14} />
            </span>
            <div>
              <p>
                I’ve created the dashboard shell and connected realistic data.
              </p>
              <div className="build-step">
                <CircleCheck size={14} /> Dashboard layout
              </div>
              <div className="build-step">
                <CircleCheck size={14} /> Responsive charts
              </div>
              <div className="build-step active">
                <span className="pulse-dot" /> Preview ready
              </div>
            </div>
          </div>
          <div className="workspace-composer">
            <textarea placeholder="Ask BuildBox to make a change..." />
            <button>
              <Send size={16} />
            </button>
          </div>
        </div>
        <div className="workspace-canvas">
          <div className="canvas-toolbar">
            <span>
              <Monitor size={14} /> Preview
            </span>
            <div>
              <button>
                <Monitor size={14} />
              </button>
              <button>
                <Eye size={14} />
              </button>
            </div>
          </div>
          <div className="dashboard-mock">
            <div className="mock-side">
              <b>atlas</b>
              {["Overview", "Analytics", "Customers", "Reports"].map((x, i) => (
                <span className={i === 0 ? "active" : ""} key={x}>
                  {x}
                </span>
              ))}
            </div>
            <div className="mock-main">
              <small>OVERVIEW</small>
              <h1>Good morning, Avery</h1>
              <div className="mock-stats">
                {["Revenue", "Active users", "Conversion"].map((x, i) => (
                  <div key={x}>
                    <span>{x}</span>
                    <strong>
                      {i === 0 ? "$84,240" : i === 1 ? "12,849" : "8.42%"}
                    </strong>
                    <small>↑ 12.4%</small>
                  </div>
                ))}
              </div>
              <div className="mock-chart">
                <div className="chart-line" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {overlay && (
          <WorkspaceOverlay type={overlay} close={() => setOverlay(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkspaceOverlay({
  type,
  close,
}: {
  type: "deploy" | "share" | "history";
  close: () => void;
}) {
  const drawer = type === "history";
  return (
    <>
      <motion.button
        className="drawer-backdrop"
        onClick={close}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className={drawer ? "history-drawer" : "dialog"}
        initial={drawer ? { x: "100%" } : { opacity: 0, scale: 0.96 }}
        animate={drawer ? { x: 0 } : { opacity: 1, scale: 1 }}
        exit={drawer ? { x: "100%" } : { opacity: 0, scale: 0.96 }}
      >
        <button className="icon-button drawer-close" onClick={close}>
          <X size={18} />
        </button>
        {type === "deploy" ? (
          <>
            <div className="dialog-icon">
              <Rocket size={20} />
            </div>
            <h2>Deploy your project</h2>
            <p>BuildBox will run a production build and publish it globally.</p>
            <div className="deploy-steps">
              {["Build", "Upload", "Deploy"].map((x, i) => (
                <span className={i === 0 ? "active" : ""} key={x}>
                  <i>{i === 0 ? <Check size={13} /> : i + 1}</i>
                  {x}
                </span>
              ))}
            </div>
            <label>
              Custom domain
              <input placeholder="app.yourdomain.com" />
            </label>
            <label>
              Environment variables
              <div className="env-row">
                <input placeholder="KEY" />
                <input placeholder="VALUE" />
                <button>
                  <Trash2 size={14} />
                </button>
              </div>
            </label>
            <Button>
              Deploy now <ArrowRight size={14} />
            </Button>
          </>
        ) : type === "share" ? (
          <>
            <div className="dialog-icon">
              <Users size={20} />
            </div>
            <h2>Share project</h2>
            <p>Invite collaborators or share a public preview.</p>
            <div className="toggle-row">
              <span>
                <b>Public preview link</b>
                <small>Anyone with the link can view</small>
              </span>
              <button className="switch active">
                <i />
              </button>
            </div>
            <div className="copy-field">
              <input value="buildbox.app/p/atlas-8f2" readOnly />
              <Button variant="secondary">
                <Copy size={14} /> Copy
              </Button>
            </div>
            <label>
              Invite by email
              <div className="copy-field">
                <input placeholder="teammate@company.com" />
                <Button>Invite</Button>
              </div>
            </label>
            <div className="collaborator">
              <span className="avatar">AM</span>
              <span>
                Avery Morgan<small>Owner</small>
              </span>
            </div>
          </>
        ) : (
          <>
            <h2>Version history</h2>
            <p>Browse and restore previous versions.</p>
            <div className="version-list">
              {[
                "Added revenue chart",
                "Refined dashboard layout",
                "Initial generation",
              ].map((x, i) => (
                <div key={x}>
                  <i />
                  <span>
                    <b>{x}</b>
                    <small>
                      {i === 0 ? "12 minutes ago" : `${i + 1} hours ago`}
                    </small>
                    <p>“Make the analytics more focused and easier to scan.”</p>
                  </span>
                  <Button variant="secondary">Restore</Button>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}


export default WorkspacePage;
