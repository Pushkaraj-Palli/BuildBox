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
  templates,
  sidebarItems,
} from "../components/shared";

export function Dashboard() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string; description: string | null; status: string; updatedAt: string }>>([]);
  const [projectsError, setProjectsError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [openProjectMenu, setOpenProjectMenu] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState<{ mode: "rename" | "delete"; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [projectActionError, setProjectActionError] = useState("");
  const [isSavingProjectAction, setIsSavingProjectAction] = useState(false);
  const [isCreating, setIsCreating] = useState(() =>
    window.location.search.includes("newProject=1"),
  );
  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/projects");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not load projects.");
      setProjects(result.data);
      setProjectsError("");
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : "Could not load projects.");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { void loadProjects(); }, []);

  const visible = projects.filter((project) =>
    project.name.toLowerCase().includes(query.toLowerCase()),
  );
  const startProject = async (prompt: string) => {
    setIsCreatingProject(true);
    setProjectsError("");
    try {
      const name = prompt.trim().split(/\s+/).slice(0, 6).join(" ").replace(/[.,!?]+$/, "") || "Untitled project";
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.slice(0, 100), description: prompt }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not create project.");
      sessionStorage.setItem("buildbox-prompt", prompt);
      navigate(`/workspace/${result.data.id}`);
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : "Could not create project.");
      setIsCreatingProject(false);
    }
  };
  const updateProject = async (id: string, method: string, path = "", body?: object) => {
    const response = await fetch(`/api/projects/${id}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(result?.error?.message || "Could not update project.");
    await loadProjects();
    return result?.data;
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
              <PromptBox onSubmit={(prompt) => void startProject(prompt)} />
            </div>
          </div>
        </main>
      ) : (
      <div className="product-content">
        <form
          className="dashboard-prompt"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const input = form.querySelector("input");
            if (input?.value.trim()) void startProject(input.value.trim());
          }}
        >
          <WandSparkles size={18} />
          <input
            placeholder="What do you want to build?"
            aria-label="New project prompt"
          />
          <Button type="submit" disabled={isCreatingProject}>
            {isCreatingProject ? "Creating..." : <>Build it <ArrowRight size={14} /></>}
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
        {projectsError && <p role="alert" className="error-message">{projectsError}</p>}
        {isLoading ? <p className="empty-state">Loading your projects...</p> : visible.length === 0 ? (
          <div className="empty-state">
            <FolderKanban size={26} />
            <h2>{query ? "No matching projects" : "Your projects will appear here"}</h2>
            <p>{query ? "Try another search." : "Describe an idea above to create your first project."}</p>
          </div>
        ) : <motion.div className="project-grid" layout>
          <AnimatePresence mode="popLayout">
            {visible.map((project, index) => {
              const kind = "analytics";
              const edited = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
                -Math.max(0, Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / 86400000)), "day",
              );
              return (
              <motion.article
                className="project-card"
                key={project.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => navigate(`/workspace/${project.id}`)}
              >
                <div className="project-actions" onClick={(event) => event.stopPropagation()}>
                  <button
                    className="more-button"
                    aria-label={`Project actions for ${project.name}`}
                    aria-expanded={openProjectMenu === project.id}
                    aria-haspopup="menu"
                    onClick={() => setOpenProjectMenu((current) => current === project.id ? null : project.id)}
                  >
                    <MoreHorizontal size={17} />
                  </button>
                  {openProjectMenu === project.id && (
                    <div className="project-action-menu" role="menu" aria-label={`${project.name} actions`}>
                      <button role="menuitem" onClick={() => {
                        setOpenProjectMenu(null);
                        setRenameValue(project.name);
                        setProjectActionError("");
                        setProjectDialog({ mode: "rename", id: project.id, name: project.name });
                      }}>Rename</button>
                      <button role="menuitem" onClick={() => {
                        setOpenProjectMenu(null);
                        void updateProject(project.id, "POST", "/duplicate").catch((error) => setProjectsError(error.message));
                      }}>Duplicate</button>
                      <button className="destructive" role="menuitem" onClick={() => {
                        setOpenProjectMenu(null);
                        setDeleteConfirmation("");
                        setProjectActionError("");
                        setProjectDialog({ mode: "delete", id: project.id, name: project.name });
                      }}>Delete</button>
                    </div>
                  )}
                </div>
                <div className={`project-thumb thumb-${kind}`}>
                  <div className="thumb-nav">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="thumb-content">
                    <span />
                    <b>{project.name}</b>
                    <small>Thoughtfully built for the web.</small>
                    <em />
                  </div>
                </div>
                <div className="project-meta">
                  <div>
                    <h3>{project.name}</h3>
                    <p>Edited {edited}</p>
                  </div>
                  <StatusBadge status={project.status === "ARCHIVED" ? "Archived" : "Ready"} />
                </div>
              </motion.article>
            );})}
          </AnimatePresence>
        </motion.div>}
      </div>
      )}
      {projectDialog && (
        <div className="project-confirm-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSavingProjectAction) setProjectDialog(null);
        }}>
          <section
            className="project-confirm-card"
            role={projectDialog.mode === "delete" ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby="project-dialog-title"
            aria-describedby="project-dialog-description"
          >
            {projectDialog.mode === "rename" ? (
              <form onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const name = renameValue.trim();
                if (!name || name === projectDialog.name) return;
                setIsSavingProjectAction(true);
                setProjectActionError("");
                try {
                  await updateProject(projectDialog.id, "PATCH", "", { name });
                  setProjectDialog(null);
                } catch (error) {
                  setProjectActionError(error instanceof Error ? error.message : "Could not rename project.");
                } finally {
                  setIsSavingProjectAction(false);
                }
              }}>
                <h2 id="project-dialog-title">Rename project</h2>
                <p id="project-dialog-description">Choose a new name for “{projectDialog.name}”.</p>
                <label className="project-dialog-label" htmlFor="rename-project-input">Project name</label>
                <input
                  id="rename-project-input"
                  className="project-dialog-input"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  maxLength={100}
                  autoFocus
                />
                {projectActionError && <p className="project-dialog-error" role="alert">{projectActionError}</p>}
                <div className="project-confirm-actions">
                  <Button variant="secondary" onClick={() => setProjectDialog(null)} disabled={isSavingProjectAction}>Cancel</Button>
                  <Button type="submit" disabled={isSavingProjectAction || !renameValue.trim() || renameValue.trim() === projectDialog.name}>
                    {isSavingProjectAction ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                if (deleteConfirmation.trim().toLowerCase() !== "delete") return;
                setIsSavingProjectAction(true);
                setProjectActionError("");
                try {
                  await updateProject(projectDialog.id, "DELETE");
                  setProjectDialog(null);
                } catch (error) {
                  setProjectActionError(error instanceof Error ? error.message : "Could not delete project.");
                } finally {
                  setIsSavingProjectAction(false);
                }
              }}>
                <h2 id="project-dialog-title">Delete project?</h2>
                <p id="project-dialog-description">
                  “{projectDialog.name}” will be removed from your projects. This action cannot be undone.
                </p>
                <label className="project-dialog-label" htmlFor="delete-project-input">
                  Type <strong className="delete-keyword">delete</strong> to confirm
                </label>
                <input
                  id="delete-project-input"
                  className="project-dialog-input"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  autoComplete="off"
                  autoFocus
                />
                {projectActionError && <p className="project-dialog-error" role="alert">{projectActionError}</p>}
                <div className="project-confirm-actions">
                  <Button variant="secondary" onClick={() => setProjectDialog(null)} disabled={isSavingProjectAction}>Cancel</Button>
                  <button
                    className="delete-project-confirm"
                    type="submit"
                    disabled={isSavingProjectAction || deleteConfirmation.trim().toLowerCase() !== "delete"}
                  >
                    {isSavingProjectAction ? "Deleting..." : "Delete project"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </ProductShell>
  );
}

export default Dashboard;
