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

export function Home() {
  const reducedMotion = useReducedMotion();
  const [openFaq, setOpenFaq] = useState(0);
  return (
    <div>
      <AppHeader />
      <main>
        <section className="hero dot-grid">
          <motion.div
            className="hero-content shell"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.div variants={fadeUp}>
              <Badge>
                <WandSparkles size={13} /> Now with auto-fix builds{" "}
                <ArrowRight size={13} />
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp}>
              Describe it. Build it.
              <br />
              <span>Ship it.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="hero-copy">
              Turn a sentence into a production-ready website. BuildBox writes
              the code, fixes the errors, and gets you live.
            </motion.p>
            <motion.div variants={fadeUp} className="prompt-wrap">
              <PromptBox />
              <div className="example-row">
                <span>Try an example</span>
                {["Todo app", "Portfolio", "Dashboard", "Blog"].map(
                  (item, index) => (
                    <button
                      key={item}
                      onClick={() => {
                        const area =
                          document.querySelector<HTMLTextAreaElement>(
                            "#main-prompt",
                          );
                        if (area) {
                          area.value = examples[index];
                          area.dispatchEvent(
                            new Event("input", { bubbles: true }),
                          );
                          area.focus();
                        }
                      }}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="preview-section shell">
          <WorkspacePreview />
        </section>

        <section className="section shell" id="how">
          <SectionTitle
            eyebrow="HOW IT WORKS"
            title="From idea to live site in minutes"
            copy="Skip the setup. Start with what you want to make and iterate from there."
          />
          <div className="steps">
            {[
              [
                WandSparkles,
                "01",
                "Describe your idea",
                "Start with a sentence. Add context, references, or requirements when you need to.",
              ],
              [
                Zap,
                "02",
                "Build and auto-fix",
                "BuildBox plans, codes, and resolves build errors while you watch progress in real time.",
              ],
              [
                Globe2,
                "03",
                "Preview and iterate",
                "Review a live preview, request changes in plain language, then deploy when it feels right.",
              ],
            ].map(([Icon, number, title, copy], index) => (
              <motion.article
                className="step"
                key={String(title)}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: reducedMotion ? 0 : index * 0.08 }}
              >
                <div className="step-icon">
                  <Icon size={18} />
                </div>
                <span>{number as string}</span>
                <h3>{title as string}</h3>
                <p>{copy as string}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="section features-section" id="features">
          <div className="shell">
            <SectionTitle
              eyebrow="EVERYTHING YOU NEED"
              title="A complete building environment"
              copy="Idea, code, preview, and deployment—all in one focused workspace."
            />
            <div className="feature-grid">
              {features.map(({ icon: Icon, title, copy }, index) => (
                <motion.article
                  className="feature-card"
                  key={title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  transition={{ delay: reducedMotion ? 0 : index * 0.05 }}
                >
                  <Icon size={20} />
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="section shell" id="demo">
          <div className="demo-strip">
            <div className="demo-copy">
              <Badge>
                <TerminalSquare size={13} /> BUILT TO RECOVER
              </Badge>
              <h2>Errors don’t stop the build.</h2>
              <p>
                BuildBox reads the terminal, finds the source, and keeps moving.
              </p>
            </div>
            <div className="terminal">
              <div className="terminal-head">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <small>buildbox — zsh</small>
              </div>
              <div className="terminal-body">
                <p>
                  <b>$</b> npm run build
                </p>
                <p className="muted-log">
                  Creating an optimized production build...
                </p>
                <p className="error-log">
                  × Module not found: Can't resolve './PricingCard'
                </p>
                <p className="fix-log">
                  <Sparkles size={13} /> BuildBox is fixing the import path...
                </p>
                <p className="success-log">
                  <Check size={13} /> Build passed in 2.4s
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section shell" id="pricing">
          <SectionTitle
            eyebrow="SIMPLE PRICING"
            title="Start free. Scale when you’re ready."
            copy="No hidden fees. Export your code and leave whenever you want."
          />
          <div className="pricing-grid">
            {plans.map((plan, index) => (
              <motion.article
                className={`price-card ${plan.popular ? "price-popular" : ""}`}
                key={plan.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: reducedMotion ? 0 : index * 0.07 }}
              >
                {plan.popular && <Badge>MOST POPULAR</Badge>}
                <h3>{plan.name}</h3>
                <p>{plan.copy}</p>
                <div className="price">
                  {plan.price}
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
              </motion.article>
            ))}
          </div>
        </section>

        <section className="section shell faq-section">
          <SectionTitle
            eyebrow="FAQ"
            title="Questions, answered."
            copy="Everything you need to know before you start building."
          />
          <div className="faq-list">
            {faqs.map(([question, answer], index) => (
              <div className="faq-item" key={question}>
                <button
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  aria-expanded={openFaq === index}
                >
                  {question}
                  <ChevronDown
                    size={18}
                    className={openFaq === index ? "rotate" : ""}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <p>{answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-section shell">
          <div>
            <Badge>
              <Sparkles size={13} /> START BUILDING FOR FREE
            </Badge>
            <h2>Your next idea deserves to exist.</h2>
            <p>Describe it in a sentence. BuildBox will take it from there.</p>
            <Button
              onClick={() =>
                document
                  .querySelector<HTMLTextAreaElement>("#main-prompt")
                  ?.focus()
              }
            >
              Build your first project <ArrowRight size={16} />
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>From first prompt to production.</p>
          <span>© 2025 BuildBox, Inc.</span>
        </div>
        {[
          ["Product", "Features", "Templates", "Pricing", "Changelog"],
          ["Resources", "Documentation", "Guides", "API", "Status"],
          ["Company", "About", "Blog", "Careers", "Contact"],
          ["Legal", "Privacy", "Terms", "Security", "DPA"],
        ].map(([title, ...links]) => (
          <div className="footer-col" key={title}>
            <b>{title}</b>
            {links.map((link) => (
              <a href="#" key={link}>
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}


export default Home;
