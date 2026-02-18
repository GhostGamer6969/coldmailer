const API_BASE = "/api";

export interface ResumeUploadResponse {
  id: string;
  originalName: string;
  status: string;
}

export interface ResumeStatus {
  id: string;
  originalName: string;
  status: string;
  currentStep: number;
  error: string | null;
  skillProfile: {
    skills: string[];
    tools: string[];
    techStack: string[];
    domains: string[];
    experienceLevel: string;
  } | null;
  jobRoles: string[];
  counts: {
    companies: number;
    people: number;
    leads: number;
  };
}

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const formData = new FormData();
  formData.append("resume", file);

  const res = await fetch(`${API_BASE}/resumes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(data.error || "Upload failed");
  }

  return res.json();
}

export async function processResume(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/resumes/${id}/process`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Processing failed" }));
    throw new Error(data.error || "Processing failed");
  }
}

export async function getResumeStatus(id: string): Promise<ResumeStatus> {
  const res = await fetch(`${API_BASE}/resumes/${id}/status`);

  if (!res.ok) {
    throw new Error("Failed to fetch status");
  }

  return res.json();
}

export function getCsvDownloadUrl(id: string): string {
  return `${API_BASE}/resumes/${id}/csv`;
}
