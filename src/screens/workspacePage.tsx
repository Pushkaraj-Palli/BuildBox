"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
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

type WorkspaceProject = { id: string; name: string; description: string | null; framework: string | null };
type WorkspaceFile = { id: string; path: string; content: string; language: string | null; version: number; updatedAt: string };
type GenerationInfo = { id: string; prompt?: string; status: string; errorMessage?: string | null };

export function WorkspacePage() {
  const params = useParams<{ project: string }>();
  const projectId = params.project;
  const [overlay, setOverlay] = useState<"deploy" | "share" | "history" | null>(
    null,
  );
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [draft, setDraft] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [generation, setGeneration] = useState<GenerationInfo | null>(null);
  const [generationLogs, setGenerationLogs] = useState<Array<{ id: string; stage: string; level: string; message: string }>>([]);
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const queuedPrompt = useRef<string | null>(null);
  const autoGenerationStarted = useRef(false);
  const statusPollTimer = useRef<number | null>(null);

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const hasUnsavedChanges = selectedFile !== null && selectedFile.content !== editorContent;

  const loadWorkspace = async () => {
    const [projectResponse, filesResponse, generationsResponse] = await Promise.all([
      fetch(`/api/projects/${projectId}`),
      fetch(`/api/projects/${projectId}/files`),
      fetch(`/api/projects/${projectId}/generations`),
    ]);
    const [projectResult, filesResult, generationsResult] = await Promise.all([
      projectResponse.json(), filesResponse.json(), generationsResponse.json(),
    ]);
    if (!projectResponse.ok) throw new Error(projectResult.error?.message || "Could not load this project.");
    if (!filesResponse.ok) throw new Error(filesResult.error?.message || "Could not load project files.");
    if (!generationsResponse.ok) throw new Error(generationsResult.error?.message || "Could not load generation status.");

    setProject(projectResult.data);
    setFiles(filesResult.data);
    const latestGeneration = generationsResult.data[0] ?? null;
    setGeneration(latestGeneration);
    if (filesResult.data.length > 0) {
      const currentId = filesResult.data.some((file: WorkspaceFile) => file.id === selectedFileId)
        ? selectedFileId
        : filesResult.data[0].id;
      setSelectedFileId(currentId);
      const currentFile = filesResult.data.find((file: WorkspaceFile) => file.id === currentId);
      if (currentFile && (!selectedFile || currentFile.id !== selectedFile.id)) setEditorContent(currentFile.content);
    }
    return { project: projectResult.data as WorkspaceProject, files: filesResult.data as WorkspaceFile[], generation: latestGeneration as GenerationInfo | null };
  };

  const loadGenerationLogs = async (generationId: string) => {
    const response = await fetch(`/api/projects/${projectId}/generations/${generationId}`);
    const result = await response.json();
    if (response.ok) setGenerationLogs(result.data.logs);
  };

  const runGeneration = async (prompt: string) => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || isGenerating) return;
    setIsGenerating(true);
    setError("");
    setSaveMessage("");
    setLastPrompt(normalizedPrompt);
    setDraft("");

    try {
      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: normalizedPrompt }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Project generation failed.");
      const generationId = result.data.id as string;
      setGeneration({ id: generationId, status: result.data.status });

      // Generation runs as a persisted server job, so the browser can poll safely
      // without holding the POST open for a multi-minute Gemini response.
      while (true) {
        const statusResponse = await fetch(`/api/projects/${projectId}/generations/${generationId}`);
        const statusResult = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusResult.error?.message || "Could not check generation status.");
        const latest = statusResult.data as GenerationInfo & { logs?: Array<{ id: string; stage: string; level: string; message: string }> };
        setGeneration(latest);
        setGenerationLogs(latest.logs ?? []);
        if (latest.status === "FAILED") throw new Error(latest.errorMessage || "Project generation failed.");
        if (latest.status === "COMPLETED") break;
        await new Promise((resolve) => window.setTimeout(resolve, 1800));
      }

      await loadWorkspace();
      setActiveView("code");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Project generation failed.");
      setDraft(normalizedPrompt);
      try { await loadWorkspace(); } catch { /* Preserve the generation error for the user. */ }
    } finally {
      if (statusPollTimer.current !== null) window.clearInterval(statusPollTimer.current);
      statusPollTimer.current = null;
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    queuedPrompt.current = sessionStorage.getItem("buildbox-prompt");
    sessionStorage.removeItem("buildbox-prompt");
    const bootstrap = async () => {
      try {
        const data = await loadWorkspace();
        if (data.files.length === 0 && ["PENDING", "PLANNING", "GENERATING", "VALIDATING"].includes(data.generation?.status ?? "")) {
          setIsGenerating(true);
          statusPollTimer.current = window.setInterval(() => {
            void loadWorkspace().then((latest) => {
              if (["COMPLETED", "FAILED"].includes(latest.generation?.status ?? "")) {
                if (statusPollTimer.current !== null) window.clearInterval(statusPollTimer.current);
                statusPollTimer.current = null;
                setIsGenerating(false);
                if (latest.generation?.status === "COMPLETED") setFiles(latest.files);
              }
            }).catch(() => undefined);
          }, 1800);
          return;
        }
        const prompt = queuedPrompt.current || data.project.description || "";
        if (data.files.length === 0 && data.generation?.status === "FAILED") {
          setDraft(data.generation.prompt || prompt);
          return;
        }
        if (data.files.length === 0 && data.generation?.status !== "FAILED" && prompt && !autoGenerationStarted.current) {
          autoGenerationStarted.current = true;
          setDraft(prompt);
          void runGeneration(prompt);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load this project.");
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
    // Load once for the project route; workspace updates use explicit refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => () => {
    if (statusPollTimer.current !== null) window.clearInterval(statusPollTimer.current);
  }, []);

  const saveSelectedFile = async () => {
    if (!selectedFile || !hasUnsavedChanges || isSaving) return;
    setIsSaving(true);
    setError("");
    setSaveMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/files/${selectedFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editorContent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not save this file.");
      setFiles((current) => current.map((file) => file.id === result.data.id ? result.data : file));
      setEditorContent(result.data.content);
      setSaveMessage("Saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this file.");
    } finally {
      setIsSaving(false);
    }
  };

  const statusLabel: Record<string, string> = {
    PENDING: "Queued",
    PLANNING: "Planning application",
    GENERATING: "Generating files",
    VALIDATING: "Checking project files",
    COMPLETED: "Files saved",
    FAILED: "Generation failed",
  };

  return (
    <div className="workspace-page builder-workspace">
      <header>
        <div className="builder-brand"><button className="builder-back" onClick={() => navigate("/dashboard")} aria-label="Back to projects"><ArrowRight size={16} /></button><Logo /></div>
        <div className="workspace-name">{project?.name ?? "Loading project…"} <span>{isGenerating ? "Building" : hasUnsavedChanges ? "Unsaved changes" : "Saved"}</span></div>
        <div><Button variant="secondary" onClick={() => setOverlay("history")}><History size={15} /> History</Button></div>
      </header>
      <div className="builder-layout">
        <aside className="builder-sidebar">
          <h2>Build with BuildBox</h2>
          {lastPrompt && <div className="message user-message">{lastPrompt}</div>}
          {isGenerating ? (
            <div className="builder-progress" role="status" aria-live="polite">
              <span className="pulse-dot" />
              <div><strong>{statusLabel[generation?.status ?? "PENDING"] || "Preparing your project"}</strong><small>{generationLogs.at(-1)?.message || "BuildBox is working through your project plan."}</small></div>
            </div>
          ) : generation?.status === "COMPLETED" ? (
            <div className="builder-progress completed"><CheckCircle2 size={16} /><div><strong>Project files are ready</strong><small>{files.length} files saved to this project.</small></div></div>
          ) : null}
          {generationLogs.length > 0 && <details className="builder-logs"><summary>Build steps</summary>{generationLogs.map((log) => <p key={log.id}><Check size={13} /> {log.message}</p>)}</details>}
          {error && <p className="builder-error" role="alert"><AlertCircle size={14} /> {error}</p>}
          {files.length === 0 && !isLoading ? (
            <form className="workspace-composer" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void runGeneration(draft); }}>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Describe the app you want to build..." disabled={isGenerating} />
              <button type="submit" aria-label="Generate project" disabled={isGenerating || draft.trim().length < 10}>{isGenerating ? <span className="pulse-dot" /> : <Send size={16} />}</button>
            </form>
          ) : files.length > 0 ? <p className="iteration-note">You can edit and save generated files here. AI changes to existing projects are coming in the next iteration phase.</p> : null}
        </aside>
        <main className="builder-main">
          <div className="builder-toolbar">
            <div className="builder-view-tabs">
              <button className={activeView === "preview" ? "active" : ""} onClick={() => setActiveView("preview")}><Eye size={14} /> Preview</button>
              <button className={activeView === "code" ? "active" : ""} onClick={() => setActiveView("code")}><Code2 size={14} /> Code</button>
            </div>
            {activeView === "code" && <div className="editor-actions"><span>{saveMessage || (hasUnsavedChanges ? "Unsaved changes" : selectedFile ? `v${selectedFile.version}` : "")}</span><Button variant="secondary" onClick={() => void saveSelectedFile()} disabled={!hasUnsavedChanges || isSaving}>{isSaving ? "Saving..." : "Save file"}</Button></div>}
          </div>
          {isLoading ? <div className="builder-empty"><span className="pulse-dot" /> Loading project…</div> : activeView === "preview" ? (
            <div className="builder-empty"><Monitor size={28} /><h2>{files.length ? "Preview is the next step" : isGenerating ? "Generating your app" : "Your preview will appear here"}</h2><p>{files.length ? "Your source files are saved. Live preview will be added in the next roadmap phase." : "Describe your idea in the panel to start generating project files."}</p></div>
          ) : (
            <div className="builder-code-workspace">
              <nav className="builder-file-tree" aria-label="Project files">
                <div className="file-tree-heading"><FolderKanban size={14} /> Files <span>{files.length}</span></div>
                {files.map((file) => <button key={file.id} className={selectedFileId === file.id ? "selected" : ""} onClick={() => { setSelectedFileId(file.id); setEditorContent(file.content); setSaveMessage(""); }}><FileCode2 size={13} /><span>{file.path}</span></button>)}
                {files.length === 0 && <p>No files generated yet.</p>}
              </nav>
              <section className="builder-editor" aria-label="Code editor">
                {selectedFile ? <><div className="editor-file-title"><FileCode2 size={14} /> {selectedFile.path}</div><textarea spellCheck={false} aria-label={`Edit ${selectedFile.path}`} value={editorContent} onChange={(event) => { setEditorContent(event.target.value); setSaveMessage(""); }} /></> : <div className="builder-empty"><Code2 size={24} /><p>Select a file to view its contents.</p></div>}
              </section>
            </div>
          )}
        </main>
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
