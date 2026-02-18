import React from "react";
import { ResumeStatus } from "../api/client";

interface ResultsSummaryProps {
  data: ResumeStatus;
}

export default function ResultsSummary({ data }: ResultsSummaryProps) {
  const { skillProfile, jobRoles, counts } = data;

  return (
    <div style={{ margin: "24px 0" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Results</h3>

      {skillProfile && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#374151" }}>
            Skill Profile
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {skillProfile.skills.map((s, i) => (
              <span
                key={i}
                style={{
                  padding: "2px 10px",
                  background: "#e0e7ff",
                  color: "#3730a3",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              >
                {s}
              </span>
            ))}
          </div>
          {skillProfile.tools.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {skillProfile.tools.map((t, i) => (
                <span
                  key={i}
                  style={{
                    padding: "2px 10px",
                    background: "#dcfce7",
                    color: "#166534",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Level: <strong>{skillProfile.experienceLevel}</strong> &middot;
            Domains: {skillProfile.domains.join(", ")}
          </div>
        </div>
      )}

      {jobRoles.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#374151" }}>
            Suggested Roles
          </h4>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {jobRoles.map((role, i) => (
              <li key={i} style={{ fontSize: 14, marginBottom: 4 }}>
                {role}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: 16,
            background: "#f0f9ff",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0369a1" }}>
            {counts.companies}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Companies</div>
        </div>
        <div
          style={{
            padding: 16,
            background: "#fdf4ff",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "#a21caf" }}>
            {counts.people}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Contacts</div>
        </div>
        <div
          style={{
            padding: 16,
            background: "#f0fdf4",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "#15803d" }}>
            {counts.leads}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Outreach Leads</div>
        </div>
      </div>
    </div>
  );
}
