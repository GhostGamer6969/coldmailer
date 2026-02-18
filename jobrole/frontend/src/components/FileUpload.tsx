import React, { useRef, useState } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export default function FileUpload({ onFileSelected, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert("Please upload a PDF or DOCX file.");
      return;
    }
    setFileName(file.name);
    onFileSelected(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? "#4f46e5" : "#d1d5db"}`,
        borderRadius: 8,
        padding: "40px 20px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragOver ? "#eef2ff" : "#f9fafb",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={onChange}
        disabled={disabled}
        style={{ display: "none" }}
      />
      {fileName ? (
        <div>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 600 }}>{fileName}</div>
          <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
            Click or drag to replace
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📤</div>
          <div style={{ fontWeight: 600 }}>Drop your resume here</div>
          <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
            or click to browse (PDF, DOCX)
          </div>
        </div>
      )}
    </div>
  );
}
