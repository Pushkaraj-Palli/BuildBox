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

export function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const pagePlans = plans.map((plan) => ({
    ...plan,
    display:
      plan.name === "Pro" && yearly
        ? "$16"
        : plan.name === "Team" && yearly
          ? "$40"
          : plan.price,
  }));
  return (
    <div className="standalone-page">
      <div className="simple-nav shell">
        <Logo />
        <div>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Home
          </Button>
          <Button onClick={() => routeToLogin()}>Get started</Button>
        </div>
      </div>
      <main className="pricing-page shell">
        <div className="center-title">
          <Badge>PLANS & PRICING</Badge>
          <h1>Build more. Ship sooner.</h1>
          <p>Start free and upgrade when your ideas become products.</p>
          <div className="billing-toggle">
            <button
              className={!yearly ? "active" : ""}
              onClick={() => setYearly(false)}
            >
              Monthly
            </button>
            <button
              className={yearly ? "active" : ""}
              onClick={() => setYearly(true)}
            >
              Yearly <span>Save 20%</span>
            </button>
          </div>
        </div>
        <div className="pricing-grid">
          {pagePlans.map((plan) => (
            <article
              className={`price-card ${plan.popular ? "price-popular" : ""}`}
              key={plan.name}
            >
              {plan.popular && <Badge>MOST POPULAR</Badge>}
              <h3>{plan.name}</h3>
              <p>{plan.copy}</p>
              <div className="price">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={plan.display}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {plan.display}
                  </motion.span>
                </AnimatePresence>
                <small>
                  {plan.price !== "$0" ? plan.suffix || "/month" : ""}
                </small>
              </div>
              <Button variant={plan.popular ? "primary" : "secondary"}>
                {plan.action}
              </Button>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>
                    <Check size={15} /> {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <section className="comparison">
          <h2>Compare every feature</h2>
          {[
            "Daily builds",
            "Private projects",
            "Custom domains",
            "GitHub export",
            "Team roles",
            "Priority support",
          ].map((feature, index) => (
            <div className="comparison-row" key={feature}>
              <b>{feature}</b>
              <span>{index < 1 ? <Check size={16} /> : "—"}</span>
              <span>
                <Check size={16} />
              </span>
              <span>
                <Check size={16} />
              </span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}




export default PricingPage;
