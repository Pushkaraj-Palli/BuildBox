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

export const projects = [
  ["Atlas Analytics", "Ready", "Edited 18m ago", "analytics"],
  ["Bramble Coffee", "Deployed", "Edited 2h ago", "coffee"],
  ["Northstar CRM", "Building", "Edited 4h ago", "crm"],
  ["Mono Portfolio", "Ready", "Edited yesterday", "portfolio"],
  ["Parcel Tracker", "Failed", "Edited yesterday", "parcel"],
  ["Studio Journal", "Ready", "Edited 3d ago", "journal"],
  ["Finley Finance", "Deployed", "Edited 5d ago", "finance"],
  ["Launchpad", "Ready", "Edited 1w ago", "launch"],
];

export const templates = [
  ["SaaS Launch", "A crisp conversion-focused landing page.", "Landing page"],
  ["Metric", "A dense but readable analytics workspace.", "Dashboard"],
  ["Editorial", "A thoughtful home for long-form writing.", "Blog"],
  [
    "Commerce One",
    "A minimal storefront with strong product focus.",
    "E-commerce",
  ],
  ["Studio", "A flexible portfolio for creative teams.", "Portfolio"],
  ["Clientbase", "A calm CRM for growing service businesses.", "SaaS"],
];

export const sidebarItems = [
  ["/dashboard/new", Plus, "New project"],
  ["/dashboard", FolderKanban, "Projects"],
  ["/templates", LayoutTemplate, "Templates"],
  ["/settings/usage", BarChart3, "Usage"],
  ["/settings", Settings, "Settings"],
];


export const examples = [
  "Build a task manager for a remote design team",
  "Create a minimal portfolio for a product designer",
  "Make an analytics dashboard for a SaaS product",
  "Design an editorial blog with a calm visual style",
];

export const features = [
  {
    icon: Monitor,
    title: "Live preview",
    copy: "See every change the moment it happens in a fast, isolated preview.",
  },
  {
    icon: ShieldCheck,
    title: "Self-healing builds",
    copy: "BuildBox detects errors, reasons about them, and fixes the code automatically.",
  },
  {
    icon: Code2,
    title: "Real code you own",
    copy: "Production-ready React code with clean components and no platform lock-in.",
  },
  {
    icon: History,
    title: "Version history",
    copy: "Explore every iteration, compare changes, and restore any version in a click.",
  },
  {
    icon: Rocket,
    title: "One-click deploy",
    copy: "Ship to a global edge network with domains and environment variables built in.",
  },
  {
    icon: GitFork,
    title: "GitHub export",
    copy: "Sync your project to a repository and continue working with your own tools.",
  },
];

export const plans = [
  {
    name: "Free",
    price: "$0",
    copy: "For exploring ideas.",
    action: "Start building",
    items: [
      "5 builds per day",
      "Public projects",
      "Live preview",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$20",
    copy: "For shipping products.",
    action: "Start 14-day trial",
    popular: true,
    items: [
      "Unlimited projects",
      "Private projects",
      "Custom domains",
      "Priority builds",
    ],
  },
  {
    name: "Team",
    price: "$50",
    suffix: "/seat",
    copy: "For teams that move fast.",
    action: "Contact sales",
    items: [
      "Shared workspace",
      "Roles and permissions",
      "Central billing",
      "Priority support",
    ],
  },
];

export const faqs = [
  [
    "What can I build with BuildBox?",
    "Anything from a focused landing page to a full product dashboard. Describe the outcome, and BuildBox creates editable, production-ready React code.",
  ],
  [
    "Do I own the generated code?",
    "Yes. Export to GitHub at any time and use, modify, or deploy the code wherever you choose.",
  ],
  [
    "What happens when a build fails?",
    "BuildBox reads the error, identifies the likely source, applies a focused fix, and runs the build again automatically.",
  ],
  [
    "Can I use my own domain?",
    "Pro and Team plans support custom domains with managed SSL and simple DNS instructions.",
  ],
  [
    "Can my team collaborate?",
    "Team workspaces include shared projects, roles, version history, and centralized billing.",
  ],
];

export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function Logo() {
  return (
    <a className="logo" href="#" aria-label="BuildBox home">
      <span className="logo-mark">
        <Blocks size={18} strokeWidth={2.4} />
      </span>
      <span>BuildBox</span>
    </a>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <motion.button
      type={type}
      className={`button button-${variant} ${className}`}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);
  return (
    <button
      className="theme-toggle"
      onClick={() => setLight((value) => !value)}
      aria-label="Toggle theme"
    >
      <span className={`theme-dot ${light ? "is-light" : ""}`} />
      {light ? "Light" : "Dark"}
    </button>
  );
}

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`header ${scrolled ? "header-scrolled" : ""}`}>
      <div className="nav shell">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#how">Docs</a>
          <a href="#demo">Changelog</a>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="desktop-only"
            onClick={() => routeToLogin()}
          >
            Log in
          </Button>
          <Button
            className="desktop-only"
            onClick={() =>
              document
                .querySelector<HTMLTextAreaElement>("#main-prompt")
                ?.focus()
            }
          >
            Get started
          </Button>
          <button
            className="menu-button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Open menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {["Features", "Pricing", "Docs", "Changelog"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setOpen(false)}
              >
                {item}
              </a>
            ))}
            <Button onClick={() => routeToLogin()}>Get started</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function routeToLogin(prompt = "") {
  if (prompt) sessionStorage.setItem("buildbox-prompt", prompt);
  navigate("/login");
}

export function navigate(path: string) {
  window.location.assign(path);
}

export function PromptBox({
  onSubmit,
}: {
  onSubmit?: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  useEffect(() => {
    if (focused || prompt) return;
    const timer = window.setInterval(
      () => setPlaceholderIndex((value) => (value + 1) % examples.length),
      2800,
    );
    return () => window.clearInterval(timer);
  }, [focused, prompt]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const submittedPrompt = prompt || examples[placeholderIndex];
    if (onSubmit) onSubmit(submittedPrompt);
    else routeToLogin(submittedPrompt);
  };
  return (
    <form className="prompt-box" onSubmit={submit}>
      <textarea
        id="main-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={examples[placeholderIndex]}
        aria-label="Describe what you want to build"
      />
      <div className="prompt-footer">
        <button type="button" className="model-chip">
          <Sparkles size={14} /> BuildBox 1.5 <ChevronDown size={13} />
        </button>
        <button
          className="send-button"
          type="submit"
          aria-label="Build project"
        >
          <Send size={17} />
        </button>
      </div>
    </form>
  );
}

export function WorkspacePreview() {
  const [tab, setTab] = useState("Preview");
  return (
    <motion.div
      className="workspace"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={fadeUp}
      transition={{ duration: 0.4 }}
    >
      <div className="workspace-top">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>
        <div className="project-title">
          <span className="status-dot" /> Coffee House <span>/</span> main
        </div>
        <Button variant="secondary">
          <Rocket size={14} /> Deploy
        </Button>
      </div>
      <div className="workspace-body">
        <div className="chat-panel">
          <div className="panel-label">BUILD</div>
          <div className="message user-message">
            Create a warm, editorial landing page for a neighborhood coffee
            shop.
          </div>
          <div className="message ai-message">
            <span className="bot-avatar">
              <Bot size={14} />
            </span>
            <div>
              <p>
                I’ll build a refined one-page site with an inviting hero and
                menu highlights.
              </p>
              <div className="build-step">
                <CircleCheck size={14} /> Created page structure
              </div>
              <div className="build-step">
                <CircleCheck size={14} /> Added responsive styles
              </div>
              <div className="build-step active">
                <span className="pulse-dot" /> Running final checks
              </div>
            </div>
          </div>
          <div className="mini-prompt">
            Ask BuildBox to make a change <Send size={14} />
          </div>
        </div>
        <div className="preview-panel">
          <div className="preview-tabs">
            {["Preview", "Code", "Logs"].map((item) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => setTab(item)}
              >
                {item}
                {tab === item && <motion.span layoutId="preview-tab" />}
              </button>
            ))}
            <div className="preview-url">
              <Globe2 size={12} /> preview.buildbox.app
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              className="site-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {tab === "Preview" ? (
                <>
                  <div className="site-nav">
                    <b>Fieldnote</b>
                    <span>
                      Menu&nbsp;&nbsp;&nbsp; Our story&nbsp;&nbsp;&nbsp; Visit
                    </span>
                  </div>
                  <div className="coffee-art" aria-hidden="true">
                    <span>F</span>
                  </div>
                  <div className="site-copy">
                    <small>ROASTED WITH INTENTION</small>
                    <strong>
                      Good coffee.
                      <br />
                      Made slowly.
                    </strong>
                    <p>
                      Thoughtful coffee, warm light, and a place to stay awhile.
                    </p>
                    <button>
                      Explore our menu <ArrowRight size={12} />
                    </button>
                  </div>
                </>
              ) : tab === "Code" ? (
                <pre className="code-preview">
                  <code>{`export default function Hero() {\n  return (\n    <main className="hero">\n      <p>Roasted with intention</p>\n      <h1>Good coffee. Made slowly.</h1>\n    </main>\n  )\n}`}</code>
                </pre>
              ) : (
                <pre className="code-preview logs">
                  <code>{`✓ Sandbox ready\n✓ Dependencies installed\n✓ Components generated\n✓ Build passed in 1.8s\n\nPreview is ready.`}</code>
                </pre>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <motion.div
      className="section-title"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
    >
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </motion.div>
  );
}

export function ProductShell({
  children,
  title,
  onNewProject,
  newProjectActive = false,
}: {
  children: React.ReactNode;
  title: string;
  onNewProject?: () => void;
  newProjectActive?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`product-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-top">
          <Logo />
          <button
            className="icon-button collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button className="workspace-switch">
          <span className="workspace-avatar">AC</span>
          <span>
            Acme Studio<small>Pro workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <nav className="side-nav">
          {sidebarItems.map(([path, Icon, label]) => (
            <button
              key={path as string}
              className={
                ((!newProjectActive && window.location.pathname === path) ||
                (path === "/dashboard/new" && newProjectActive))
                  ? "active"
                  : ""
              }
              onClick={() => {
                if (path === "/dashboard/new") {
                  if (onNewProject) onNewProject();
                  else navigate("/dashboard?newProject=1");
                  return;
                }
                navigate(path as string);
              }}
            >
              <Icon size={17} />
              <span>{label as string}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="upgrade-card">
            <Badge>FREE</Badge>
            <b>Unlock more builds</b>
            <p>Upgrade for unlimited projects and private sharing.</p>
            <Button onClick={() => navigate("/pricing")}>Upgrade</Button>
          </div>
          <button className="user-menu">
            <span className="avatar">AM</span>
            <span>
              Avery Morgan<small>avery@acme.co</small>
            </span>
            <MoreHorizontal size={15} />
          </button>
        </div>
      </aside>
      <div className="product-main">
        <header className="product-header">
          <h1>{title}</h1>
          <div>
            <ThemeToggle />
            <Button variant="secondary" onClick={() => navigate("/")}>
              View site
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status === "Building" && <span />} {status}
    </span>
  );
}

