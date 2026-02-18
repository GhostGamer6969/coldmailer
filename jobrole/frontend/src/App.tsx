import React, { useState, useRef, useCallback, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import ProgressTracker from "./components/ProgressTracker";
import ResultsSummary from "./components/ResultsSummary";
import {
  uploadResume,
  processResume,
  getResumeStatus,
  getCsvDownloadUrl,
  ResumeStatus,
} from "./api/client";

type AppState = "idle" | "uploading" | "processing" | "completed" | "error";

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [status, setStatus] = useState<ResumeStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const s = await getResumeStatus(id);
          setStatus(s);

          if (s.status === "COMPLETED") {
            setAppState("completed");
            stopPolling();
          } else if (s.status === "FAILED") {
            setAppState("error");
            setErrorMsg(s.error || "Processing failed");
            stopPolling();
          }
        } catch {
          // Silently retry
        }
      }, 2000);
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  async function handleProcess() {
    if (!selectedFile) return;

    try {
      setErrorMsg(null);
      setAppState("uploading");

      // Upload
      const uploadResult = await uploadResume(selectedFile);
      setResumeId(uploadResult.id);

      // Start processing
      setAppState("processing");
      await processResume(uploadResult.id);

      // Poll for status
      startPolling(uploadResult.id);
    } catch (err) {
      setAppState("error");
      setErrorMsg((err as Error).message);
    }
  }

  async function handleRetry() {
    if (!resumeId) return;

    try {
      setErrorMsg(null);
      setAppState("processing");
      await processResume(resumeId);
      startPolling(resumeId);
    } catch (err) {
      setAppState("error");
      setErrorMsg((err as Error).message);
    }
  }

  function handleReset() {
    stopPolling();
    setAppState("idle");
    setSelectedFile(null);
    setResumeId(null);
    setStatus(null);
    setErrorMsg(null);
  }

  const isProcessing = appState === "uploading" || appState === "processing";

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#111827",
      }}
    >
      <header style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          JobRole
        </h1>
        <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 15 }}>
          Upload your resume &rarr; Get outreach leads with emails
        </p>
      </header>

      {/* Step 1: Upload */}
      <FileUpload
        onFileSelected={setSelectedFile}
        disabled={isProcessing}
      />

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 20,
          justifyContent: "center",
        }}
      >
        {appState === "idle" || appState === "error" ? (
          <>
            <button
              onClick={handleProcess}
              disabled={!selectedFile || isProcessing}
              style={{
                padding: "10px 28px",
                background: selectedFile ? "#4f46e5" : "#d1d5db",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: selectedFile ? "pointer" : "not-allowed",
              }}
            >
              Process Resume
            </button>
            {appState === "error" && resumeId && (
              <button
                onClick={handleRetry}
                style={{
                  padding: "10px 28px",
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            )}
          </>
        ) : null}

        {appState === "completed" && resumeId && (
          <>
            <a
              href={getCsvDownloadUrl(resumeId)}
              download
              style={{
                padding: "10px 28px",
                background: "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Download CSV
            </a>
            <button
              onClick={handleReset}
              style={{
                padding: "10px 28px",
                background: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Start Over
            </button>
          </>
        )}
      </div>

      {/* Progress */}
      {(isProcessing || appState === "completed" || appState === "error") &&
        status && (
          <ProgressTracker
            currentStep={status.currentStep}
            processingStatus={status.status}
            error={status.error}
          />
        )}

      {/* Uploading indicator */}
      {appState === "uploading" && !status && (
        <div style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
          Uploading resume...
        </div>
      )}

      {/* Results */}
      {appState === "completed" && status && <ResultsSummary data={status} />}

      {/* Error without status */}
      {appState === "error" && errorMsg && !status && (
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            color: "#b91c1c",
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
