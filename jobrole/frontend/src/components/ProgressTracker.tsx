import React from "react";

interface Step {
  label: string;
  status: "pending" | "active" | "completed" | "failed";
}

interface ProgressTrackerProps {
  currentStep: number;
  processingStatus: string;
  error: string | null;
}

const STEPS = [
  "Extract Text",
  "Extract Skills",
  "Map Job Roles",
  "Find Companies",
  "Find People",
  "Enrich Emails",
  "Generate CSV",
];

function getStepStatus(
  index: number,
  currentStep: number,
  processingStatus: string
): Step["status"] {
  if (processingStatus === "FAILED") {
    if (index + 1 < currentStep) return "completed";
    if (index + 1 === currentStep) return "failed";
    return "pending";
  }
  if (processingStatus === "COMPLETED") return "completed";
  if (index + 1 < currentStep) return "completed";
  if (index + 1 === currentStep) return "active";
  return "pending";
}

export default function ProgressTracker({
  currentStep,
  processingStatus,
  error,
}: ProgressTrackerProps) {
  const steps: Step[] = STEPS.map((label, i) => ({
    label,
    status: getStepStatus(i, currentStep, processingStatus),
  }));

  return (
    <div style={{ margin: "24px 0" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Processing Progress</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              borderRadius: 6,
              background:
                step.status === "active"
                  ? "#eef2ff"
                  : step.status === "failed"
                  ? "#fef2f2"
                  : "transparent",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background:
                  step.status === "completed"
                    ? "#22c55e"
                    : step.status === "active"
                    ? "#4f46e5"
                    : step.status === "failed"
                    ? "#ef4444"
                    : "#d1d5db",
                flexShrink: 0,
                transition: "background 0.3s",
              }}
            >
              {step.status === "completed"
                ? "✓"
                : step.status === "failed"
                ? "✕"
                : step.status === "active"
                ? "⟳"
                : i + 1}
            </div>
            <div>
              <div
                style={{
                  fontWeight: step.status === "active" ? 600 : 400,
                  color:
                    step.status === "pending"
                      ? "#9ca3af"
                      : step.status === "failed"
                      ? "#ef4444"
                      : "#111827",
                }}
              >
                Step {i + 1}: {step.label}
              </div>
              {step.status === "active" && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Processing...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            color: "#b91c1c",
            fontSize: 14,
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
