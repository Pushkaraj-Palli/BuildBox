"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, AlertCircle, BarChart3, Blocks, Bot, Check, CheckCircle2,
  ChevronDown, Code2, Copy, CreditCard, Eye,
  FileCode2, FolderKanban, GitFork, Grid2X2, Globe2, History, KeyRound, Maximize2, Minimize2,
  Download, LayoutTemplate, Menu, Monitor, MoreHorizontal, PanelLeftClose, Plug, Plus,
  Rocket, Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles,
  TerminalSquare, Trash2, User, Users, WandSparkles, X, Zap,
} from "lucide-react";
import { Badge, Button, Logo, ThemeToggle, AppHeader, routeToLogin, navigate, PromptBox, WorkspacePreview, SectionTitle, ProductShell, StatusBadge, examples, features, plans, faqs, fadeUp } from "../components/shared";
import { CodeEditor } from "../components/CodeEditor";

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
  const [isExporting, setIsExporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ status: "PASSED" | "FAILED"; message: string; output: string; durationMs: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isStartingPreview, setIsStartingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const queuedPrompt = useRef<string | null>(null);
  const autoGenerationStarted = useRef(false);
  const autoValidationStarted = useRef(false);
  const statusPollTimer = useRef<number | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const hasUnsavedChanges = selectedFile !== null && selectedFile.content !== editorContent;

  useEffect(() => {
    const syncFullscreenState = () => setIsPreviewFullscreen(document.fullscreenElement === previewFrameRef.current);
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const togglePreviewFullscreen = async () => {
    const frame = previewFrameRef.current;
    if (!frame) return;
    try {
      if (document.fullscreenElement === frame) await document.exitFullscreen();
      else await frame.requestFullscreen();
    } catch (fullscreenError) {
      setPreviewError(fullscreenError instanceof Error ? fullscreenError.message : "Could not open the preview fullscreen.");
    }
  };

  const loadWorkspace = async (refreshSelectedContent = false) => {
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
      if (currentFile && (refreshSelectedContent || !selectedFile || currentFile.id !== selectedFile.id)) setEditorContent(currentFile.content);
    }
    return { project: projectResult.data as WorkspaceProject, files: filesResult.data as WorkspaceFile[], generation: latestGeneration as GenerationInfo | null };
  };

  const loadGenerationLogs = async (generationId: string) => {
    const response = await fetch(`/api/projects/${projectId}/generations/${generationId}`);
    const result = await response.json();
    if (response.ok) setGenerationLogs(result.data.logs);
  };

  const validateAndStartPreview = async () => {
    if (autoValidationStarted.current) return;
    autoValidationStarted.current = true;
    setActiveView("preview");
    setPreviewUrl(null);
    setIsValidating(true);
    setIsStartingPreview(false);
    setError("");
    setPreviewError("");
    setValidationResult(null);
    try {
      const validationResponse = await fetch(`/api/projects/${projectId}/validate`, { method: "POST" });
      const validation = await validationResponse.json();
      if (!validationResponse.ok) throw new Error(validation.error?.message || "Could not validate this project.");
      setValidationResult(validation.data);
      if (Array.isArray(validation.data.changedFiles) && validation.data.changedFiles.length > 0) await loadWorkspace(true);
      if (validation.data.status !== "PASSED") {
        setPreviewError("The build did not pass after automatic repair. Review the build output, then make a change and try again.");
        return;
      }

      setIsStartingPreview(true);
      const previewResponse = await fetch(`/api/projects/${projectId}/preview`, { method: "POST" });
      const preview = await previewResponse.json();
      if (!previewResponse.ok) throw new Error(preview.error?.message || "Could not start the live preview.");
      setPreviewUrl(preview.data.url);
      setActiveView("preview");
    } catch (validationError) {
      setPreviewError(validationError instanceof Error ? validationError.message : "Could not prepare the live preview.");
    } finally {
      setIsValidating(false);
      setIsStartingPreview(false);
    }
  };

  const runGeneration = async (prompt: string) => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || isGenerating) return;
    autoValidationStarted.current = false;
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
      await validateAndStartPreview();
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

  const runIteration = async (prompt: string) => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || isGenerating || files.length === 0) return;
    autoValidationStarted.current = false;
    setIsGenerating(true);
    setError("");
    setSaveMessage("");
    setLastPrompt(normalizedPrompt);
    setDraft("");

    try {
      const response = await fetch(`/api/projects/${projectId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: normalizedPrompt }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Project update failed.");
      const generationId = result.data.id as string;
      setGeneration({ id: generationId, status: result.data.status });

      while (true) {
        const statusResponse = await fetch(`/api/projects/${projectId}/generations/${generationId}`);
        const statusResult = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusResult.error?.message || "Could not check project update status.");
        const latest = statusResult.data as GenerationInfo & { logs?: Array<{ id: string; stage: string; level: string; message: string }> };
        setGeneration(latest);
        setGenerationLogs(latest.logs ?? []);
        if (latest.status === "FAILED") throw new Error(latest.errorMessage || "Project update failed.");
        if (latest.status === "COMPLETED") break;
        await new Promise((resolve) => window.setTimeout(resolve, 1800));
      }

      await loadWorkspace();
      await validateAndStartPreview();
    } catch (iterationError) {
      setError(iterationError instanceof Error ? iterationError.message : "Project update failed.");
      setDraft(normalizedPrompt);
      try { await loadWorkspace(); } catch { /* Keep the iteration error visible. */ }
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
        if (["PENDING", "PLANNING", "GENERATING", "VALIDATING", "REPAIRING"].includes(data.generation?.status ?? "")) {
          setIsGenerating(true);
          statusPollTimer.current = window.setInterval(() => {
            void loadWorkspace().then((latest) => {
              if (latest.generation?.id) void loadGenerationLogs(latest.generation.id);
              if (["COMPLETED", "FAILED"].includes(latest.generation?.status ?? "")) {
                if (statusPollTimer.current !== null) window.clearInterval(statusPollTimer.current);
                statusPollTimer.current = null;
                setIsGenerating(false);
                if (latest.generation?.status === "COMPLETED") {
                  setFiles(latest.files);
                  void validateAndStartPreview();
                }
                if (latest.generation?.status === "FAILED") setError(latest.generation.errorMessage || "Project update failed.");
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
          return;
        }
        if (data.files.length > 0 && data.generation?.status === "COMPLETED" && !autoValidationStarted.current) {
          const previewResponse = await fetch(`/api/projects/${projectId}/preview`);
          const previewResult = await previewResponse.json();
          if (previewResponse.ok && previewResult.data?.url) {
            setPreviewUrl(previewResult.data.url);
          } else {
            await validateAndStartPreview();
          }
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
      autoValidationStarted.current = false;
      await validateAndStartPreview();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this file.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportProject = async () => {
    if (isExporting || files.length === 0) return;
    if (hasUnsavedChanges) {
      setError("Save your current file changes before exporting the project.");
      return;
    }
    setIsExporting(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Could not export this project.");
      }
      const archive = await response.blob();
      const url = URL.createObjectURL(archive);
      const downloadLink = document.createElement("a");
      const projectSlug = (project?.name || "buildbox-project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      downloadLink.href = url;
      downloadLink.download = `${projectSlug || "buildbox-project"}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Could not export this project.");
    } finally {
      setIsExporting(false);
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
        <div>
          <Button variant="secondary" onClick={() => void exportProject()} disabled={isExporting || files.length === 0} aria-label="Export project as ZIP">
            <Download size={15} /><span className="workspace-action-label">{isExporting ? "Exporting…" : "Export ZIP"}</span>
          </Button>
          <Button variant="secondary" onClick={() => setOverlay("history")}><History size={15} /><span className="workspace-action-label">History</span></Button>
        </div>
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
          {isValidating && <div className="builder-progress" role="status"><span className="pulse-dot" /><div><strong>Checking your app automatically</strong><small>If the build fails, BuildBox attempts automatic repairs before starting the preview.</small></div></div>}
          {isStartingPreview && <div className="builder-progress" role="status"><span className="pulse-dot" /><div><strong>Starting live preview</strong><small>Preparing an isolated preview container.</small></div></div>}
          {validationResult && <details className={`builder-validation ${validationResult.status === "PASSED" ? "passed" : "failed"}`} open>
            <summary>{validationResult.status === "PASSED" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {validationResult.message} ({(validationResult.durationMs / 1_000).toFixed(1)}s)</summary>
            <pre>{validationResult.output || "No build output."}</pre>
          </details>}
          {error && <p className="builder-error" role="alert"><AlertCircle size={14} /> {error}</p>}
          {!isLoading && (
            <form className="workspace-composer" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void (files.length ? runIteration(draft) : runGeneration(draft)); }}>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={files.length ? "Describe a change to this project..." : "Describe the app you want to build..."} disabled={isGenerating} />
              <button type="submit" aria-label={files.length ? "Update project" : "Generate project"} disabled={isGenerating || draft.trim().length < (files.length ? 3 : 10)}>{isGenerating ? <span className="pulse-dot" /> : <Send size={16} />}</button>
            </form>
          )}
          {files.length > 0 && <p className="iteration-note">Describe a change to update this project. BuildBox saves each successful update as a version.</p>}
        </aside>
        <main className="builder-main">
          <div className="builder-toolbar">
            <div className="builder-view-tabs">
              <button className={activeView === "preview" ? "active" : ""} onClick={() => setActiveView("preview")}><Eye size={14} /> Preview</button>
              <button className={activeView === "code" ? "active" : ""} onClick={() => setActiveView("code")}><Code2 size={14} /> Code</button>
            </div>
            {activeView === "preview" && <div className="preview-actions">
              <button className="icon-button" onClick={togglePreviewFullscreen} disabled={!previewUrl} aria-label={isPreviewFullscreen ? "Exit fullscreen preview" : "Open fullscreen preview"} title={isPreviewFullscreen ? "Exit fullscreen" : "Full screen"}>
                {isPreviewFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>}
            {activeView === "code" && <div className="editor-actions"><span>{saveMessage || (hasUnsavedChanges ? "Unsaved changes" : selectedFile ? `v${selectedFile.version}` : "")}</span><Button variant="secondary" onClick={() => void saveSelectedFile()} disabled={!hasUnsavedChanges || isSaving}>{isSaving ? "Saving..." : "Save file"}</Button></div>}
          </div>
          {isLoading ? <div className="builder-empty"><span className="pulse-dot" /> Loading project…</div> : activeView === "preview" ? (
            previewUrl ? <iframe ref={previewFrameRef} className="builder-live-preview" title={`${project?.name ?? "Project"} live preview`} src={previewUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /> : (
              <div className="builder-empty"><Monitor size={28} /><h2>{isGenerating ? "Generating your app" : isValidating ? "Checking your app" : isStartingPreview ? "Starting live preview" : files.length ? "Preparing your preview" : "Your preview will appear here"}</h2><p>{previewError || (files.length ? "BuildBox validates the generated project and starts its preview automatically." : "Describe your idea in the panel to start generating project files.")}</p></div>
            )
          ) : (
            <div className="builder-code-workspace">
              <nav className="builder-file-tree" aria-label="Project files">
                <div className="file-tree-heading"><FolderKanban size={14} /> Files <span>{files.length}</span></div>
                {files.map((file) => <button key={file.id} className={selectedFileId === file.id ? "selected" : ""} onClick={() => { setSelectedFileId(file.id); setEditorContent(file.content); setSaveMessage(""); }}><FileCode2 size={13} /><span>{file.path}</span></button>)}
                {files.length === 0 && <p>No files generated yet.</p>}
              </nav>
              <section className="builder-editor" aria-label="Code editor">
                {selectedFile ? <><div className="editor-file-title"><FileCode2 size={14} /> {selectedFile.path}<span className="editor-language">{selectedFile.language || "text"}</span></div><CodeEditor key={selectedFile.id} filePath={selectedFile.path} value={editorContent} onChange={(content) => { setEditorContent(content); setSaveMessage(""); }} /></> : <div className="builder-empty"><Code2 size={24} /><p>Select a file to view its contents.</p></div>}
              </section>
            </div>
          )}
        </main>
      </div>
      <AnimatePresence>
        {overlay && (
          <WorkspaceOverlay
            type={overlay}
            projectId={projectId}
            close={() => setOverlay(null)}
            onRestored={async () => { await loadWorkspace(); setActiveView("code"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkspaceOverlay({
  type,
  projectId,
  close,
  onRestored,
}: {
  type: "deploy" | "share" | "history";
  projectId: string;
  close: () => void;
  onRestored: () => Promise<void>;
}) {
  const drawer = type === "history";
  const [versions, setVersions] = useState<Array<{ id: string; versionNumber: number; description: string | null; createdAt: string; files: string[] }>>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [versionError, setVersionError] = useState("");

  useEffect(() => {
    if (type !== "history") return;
    const controller = new AbortController();
    setIsLoadingVersions(true);
    setVersionError("");
    void fetch(`/api/projects/${projectId}/versions`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Could not load version history.");
        setVersions(result.data);
      })
      .catch((error) => { if (!controller.signal.aborted) setVersionError(error instanceof Error ? error.message : "Could not load version history."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingVersions(false); });
    return () => controller.abort();
  }, [projectId, type]);

  const restoreVersion = async (versionId: string) => {
    if (restoringVersionId) return;
    setRestoringVersionId(versionId);
    setVersionError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/versions/${versionId}/restore`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not restore this version.");
      await onRestored();
      close();
    } catch (error) {
      setVersionError(error instanceof Error ? error.message : "Could not restore this version.");
    } finally {
      setRestoringVersionId(null);
    }
  };
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
            <p>Browse saved project snapshots and restore any version.</p>
            {versionError && <p className="builder-error" role="alert">{versionError}</p>}
            <div className="version-list">
              {isLoadingVersions ? <p>Loading saved versions…</p> : versions.length === 0 ? <p>No saved versions yet.</p> : versions.map((version) => (
                <div key={version.id}>
                  <i />
                  <span>
                    <b>Version {version.versionNumber}</b>
                    <small>{new Date(version.createdAt).toLocaleString()}</small>
                    <p>{version.description || "Project snapshot"}</p>
                    <details>
                      <summary>{version.files.length} files in this version</summary>
                      <ul>{version.files.map((filePath) => <li key={filePath}>{filePath}</li>)}</ul>
                    </details>
                  </span>
                  <Button variant="secondary" onClick={() => void restoreVersion(version.id)} disabled={restoringVersionId !== null}>
                    {restoringVersionId === version.id ? "Restoring…" : "Restore"}
                  </Button>
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
