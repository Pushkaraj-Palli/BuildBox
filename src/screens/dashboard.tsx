"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  AlertCircle,
  BarChart3,
  Blocks,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  Code2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileCode2,
  FolderKanban,
  GitFork,
  Grid2X2,
  Globe2,
  History,
  KeyRound,
  LayoutTemplate,
  Menu,
  Monitor,
  MoreHorizontal,
  PanelLeftClose,
  Plug,
  Plus,
  Rocket,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  Trash2,
  User,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Logo,
  ThemeToggle,
  AppHeader,
  routeToLogin,
  navigate,
  PromptBox,
  WorkspacePreview,
  SectionTitle,
  ProductShell,
  StatusBadge,
  examples,
  features,
  plans,
  faqs,
  fadeUp,
  projects,
  templates,
  sidebarItems,
} from "../components/shared";

export function Dashboard() {
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(() =>
    window.location.search.includes("newProject=1"),
  );
  const visible = projects.filter(([name]) =>
    name.toLowerCase().includes(query.toLowerCase()),
  );
  const startProject = (prompt: string) => {
    sessionStorage.setItem("buildbox-prompt", prompt);
    navigate("/workspace/new");
  };
  return (
    <ProductShell
      title={isCreating ? "New project" : "Projects"}
      onNewProject={() => setIsCreating(true)}
      newProjectActive={isCreating}
    >
      {isCreating ? (
        <main className="new-project-screen dot-grid">
          <div className="new-project-content">
            <Badge>
              <WandSparkles size={13} /> Now with auto-fix builds <ArrowRight size={13} />
            </Badge>
            <h2>
              Describe it. Build it.
              <br />
              <span>Ship it.</span>
            </h2>
            <p>
              Turn a sentence into a production-ready website. BuildBox writes
              the code, fixes the errors, and gets you live.
            </p>
            <div className="new-project-prompt">
              <PromptBox onSubmit={startProject} />
            </div>
          </div>
        </main>
      ) : (
      <div className="product-content">
        <form
          className="dashboard-prompt"
          onSubmit={(event) => {
            event.preventDefault();
            navigate("/workspace/new");
          }}
        >
          <WandSparkles size={18} />
          <input
            placeholder="What do you want to build?"
            aria-label="New project prompt"
          />
          <Button type="submit">
            Build it <ArrowRight size={14} />
          </Button>
        </form>
        <div className="toolbar">
          <div className="search-field">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects..."
            />
            <kbd>⌘ K</kbd>
          </div>
          <Button variant="secondary">
            <SlidersHorizontal size={14} /> Last edited
          </Button>
          <div className="view-toggle">
            <button className="active">
              <Grid2X2 size={15} />
            </button>
            <button>
              <Menu size={15} />
            </button>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus size={15} /> New project
          </Button>
        </div>
        <motion.div className="project-grid" layout>
          <AnimatePresence mode="popLayout">
            {visible.map(([name, status, edited, kind], index) => (
              <motion.article
                className="project-card"
                key={name}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => navigate(`/workspace/${kind}`)}
              >
                <div className={`project-thumb thumb-${kind}`}>
                  <div className="thumb-nav">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="thumb-content">
                    <span />
                    <b>{name}</b>
                    <small>Thoughtfully built for the web.</small>
                    <em />
                  </div>
                </div>
                <div className="project-meta">
                  <div>
                    <h3>{name}</h3>
                    <p>{edited}</p>
                  </div>
                  <StatusBadge status={status} />
                  <button className="more-button">
                    <MoreHorizontal size={17} />
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
      )}
    </ProductShell>
  );
}

export default Dashboard;
