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
import { Badge, Button, Logo, ThemeToggle, AppHeader, routeToLogin, navigate, PromptBox, WorkspacePreview, SectionTitle, ProductShell, StatusBadge, examples, features, plans, faqs, fadeUp, templates } from "../components/shared";

export function Templates() {
  const categories = [
    "All",
    "Landing page",
    "Dashboard",
    "E-commerce",
    "Portfolio",
    "Blog",
    "SaaS",
  ];
  const [active, setActive] = useState("All");
  const [selected, setSelected] = useState<(typeof templates)[number] | null>(
    null,
  );
  const list =
    active === "All"
      ? templates
      : templates.filter((item) => item[2] === active);
  return (
    <ProductShell title="Templates">
      <div className="product-content">
        <div className="page-intro">
          <div>
            <h2>Start with a strong foundation</h2>
            <p>
              Production-ready templates, designed to be customized with a
              prompt.
            </p>
          </div>
          <div className="search-field">
            <Search size={15} />
            <input placeholder="Search templates..." />
          </div>
        </div>
        <div className="filter-row">
          {categories.map((category) => (
            <button
              className={active === category ? "active" : ""}
              onClick={() => setActive(category)}
              key={category}
            >
              {category}
            </button>
          ))}
        </div>
        <motion.div className="template-grid" layout>
          <AnimatePresence mode="popLayout">
            {list.map((template, index) => (
              <motion.article
                className="template-card"
                key={template[0]}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => setSelected(template)}
              >
                <div className={`template-preview template-${index % 4}`}>
                  <span className="template-mini-nav" />
                  <strong>{template[0]}</strong>
                  <i />
                  <i />
                  <i />
                </div>
                <div>
                  <Badge>{template[2]}</Badge>
                  <h3>{template[0]}</h3>
                  <p>{template[1]}</p>
                  <Button>Use template</Button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
      <AnimatePresence>
        {selected && (
          <>
            <motion.button
              className="drawer-backdrop"
              aria-label="Close drawer"
              onClick={() => setSelected(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="template-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
            >
              <button
                className="icon-button drawer-close"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
              <div className="drawer-preview">
                <strong>{selected[0]}</strong>
                <span />
              </div>
              <Badge>{selected[2]}</Badge>
              <h2>{selected[0]}</h2>
              <p>
                {selected[1]} Fully responsive, accessible, and ready for your
                content.
              </p>
              <h4>Built with</h4>
              <div className="tech-row">
                <span>React</span>
                <span>TypeScript</span>
                <span>Tailwind CSS</span>
              </div>
              <Button onClick={() => navigate("/workspace/new")}>
                Use this template <ArrowRight size={15} />
              </Button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </ProductShell>
  );
}


export default Templates;
