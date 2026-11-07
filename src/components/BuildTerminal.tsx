"use client";

import { useEffect, useRef } from "react";

export function BuildTerminal({ output, status }: { output: string; status: string }) {
  const outputRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const outputElement = outputRef.current;
    if (outputElement) outputElement.scrollTop = outputElement.scrollHeight;
  }, [output]);

  return (
    <section className="build-terminal" aria-label="Read-only build terminal">
      <div className="build-terminal-header">
        <span className="build-terminal-lights" aria-hidden="true"><i /><i /><i /></span>
        <strong>Build terminal</strong>
        <span className={`build-terminal-status ${status.toLowerCase()}`}>{status}</span>
      </div>
      <pre ref={outputRef} className="build-terminal-output" role="log" aria-live="polite" aria-readonly="true" aria-label="Build and validation output">
        <code>{output || "Waiting for build output…"}</code>
      </pre>
      <div className="build-terminal-footer"><span>READ ONLY</span><span>BuildBox</span></div>
    </section>
  );
}
