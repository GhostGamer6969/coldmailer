# JobRole — Resume → Roles → Companies → Contacts (CSV)

JobRole is a small end-to-end tool that takes a resume and turns it into an outreach-ready CSV:

1. **Upload resume** (PDF/DOCX)  
2. **Extract skills & domains** (local LLM via Ollama)  
3. **Map to suitable job roles**  
4. **Find companies hiring for those roles**  
5. **Generate hiring contacts per company** (LLM-based, approximate)  
6. **Infer work emails** (pattern + optional Hunter.io)  
7. **Download everything as CSV**

The whole stack runs **locally** except for optional email enrichment that depends on public APIs.

---

## Tech Stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **LLM:** Local model via **Ollama** (default: `llama3.2`)
- **Uploads:** Multer (PDF + DOCX, parsed with `pdf-parse` + `mammoth`)
- **Queue:** Simple in-process job queue (no Redis)
- **CSV:** `csv-stringify`

---

## Architecture

```text
Frontend (React + Vite)
    ↓
Backend API (Express + TypeScript)
    ↓
PostgreSQL (Prisma)
    ↓
7-Step Processing Pipeline (in-process queue)
  1. Resume text extraction (PDF/DOCX → plain text)
  2. Skill extraction (local LLM)
  3. Job role mapping (local LLM)
  4. Company discovery (local LLM)
  5. People/contact discovery (local LLM)
  6. Email enrichment (pattern + optional Hunter.io)
  7. CSV generation & download
```

> **Note on people data**  
> The \"People\" step uses the local LLM's knowledge of typical hiring roles and public web data from its training set. It **cannot guarantee real, current individuals** without a paid data source. Treat people rows as a starting point you manually verify, not as a ground truth directory.

---

## Prerequisites

- **Node.js** ≥ 18  
- **PostgreSQL** running locally (or any reachable Postgres instance)  
- **Ollama** installed with a chat-capable model, e.g. `llama3.2`

### Install Ollama & model (one-time)

```bash
# Install Ollama (macOS): see https://ollama.com
# Then pull a suitable model (already done once on your machine):
ollama pull llama3.2
```

Make sure the Ollama server is running when you use this app:

```bash
ollama serve
```

By default the backend talks to Ollama at `http://127.0.0.1:11434` and uses the `llama3.2` model.

---

## Setup & Run

From the repo root (`jobrole/`):

### 1. Install dependencies

```bash
npm run install:all
```

- Installs backend deps in `backend/`
- Installs frontend deps in `frontend/`

### 2. Configure environment

Edit `backend/.env` (already created, but adjust as needed):

```env
# Database
DATABASE_URL="postgresql://piyush@localhost:5432/jobrole?schema=public"  # change user/host if needed

# Ollama (local LLM)
OLLAMA_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="llama3.2"

# Server
PORT=4000
FRONTEND_URL="http://localhost:3000"

# Optional: Email enrichment API (Hunter.io, etc.)
HUNTER_API_KEY=""  # if set, used before pattern-based inference

# Upload limits
MAX_FILE_SIZE_MB=10
```

Adjust `DATABASE_URL` for your local Postgres user/host/port if different.

### 3. Create database & push schema

```bash
# Create DB (if not already created)
createdb jobrole

# Push Prisma schema to the DB
npm run db:push
```

This creates all tables described in `backend/prisma/schema.prisma`.

### 4. Start backend & frontend

You need three things running:

1. **Ollama server** (LLM)
   ```bash
   ollama serve
   ```

2. **Backend** (Express API on port 4000)
   ```bash
   npm run dev:backend
   ```

3. **Frontend** (React app on port 3000)
   ```bash
   npm run dev:frontend
   ```

Then open the UI at:

- http://localhost:3000

---

## Using the App

1. **Upload** a resume (PDF or DOCX) via the UI.  
2. Click **“Process Resume”**.  
3. Watch the **7-step progress** widget as the pipeline runs:
   - Extract Text  
   - Extract Skills  
   - Map Job Roles  
   - Find Companies  
   - Find People  
   - Enrich Emails  
   - Generate CSV  
4. When status is **COMPLETED**, click **“Download CSV”** to get:

   | Name | Job Title | Company | Company Website | Role Hiring For | Email | Email Confidence | LinkedIn URL |
   |------|-----------|---------|-----------------|-----------------|-------|------------------|-------------|

5. Use the CSV as a starting point for outreach. **Manually verify** people, emails, and domains before sending bulk email.

---

## Backend API

All routes are prefixed with `/api` (front-end Vite dev server proxies to `localhost:4000`).

| Method | Path                        | Description                                     |
|--------|-----------------------------|-------------------------------------------------|
| GET    | `/api/health`              | Health check                                    |
| POST   | `/api/resumes/upload`      | Upload a resume file (PDF/DOCX)                 |
| POST   | `/api/resumes/:id/process` | Start the asynchronous processing pipeline      |
| GET    | `/api/resumes/:id/status`  | Check pipeline status + summary (skills, roles) |
| GET    | `/api/resumes/:id/csv`     | Download outreach CSV for a processed resume    |
| GET    | `/api/resumes`             | List all resumes in the system                  |

### Pipeline Status

`GET /api/resumes/:id/status` returns (simplified):

```json
{
  "id": "…",
  "originalName": "piyush-resume.pdf",
  "status": "COMPLETED",
  "currentStep": 7,
  "error": null,
  "skillProfile": {
    "skills": ["Node.js", "React", "PostgreSQL"],
    "tools": ["Git", "Docker"],
    "techStack": ["TypeScript", "Express"],
    "domains": ["backend", "full-stack"],
    "experienceLevel": "mid"
  },
  "jobRoles": [
    "Backend Engineer",
    "Full-Stack Engineer"
  ],
  "counts": {
    "companies": 10,
    "people": 25,
    "leads": 20
  }
}
```

---

## Data Model (Prisma)

- **User** — simple user record (for now just an owner of resumes)  
- **Resume** — uploaded file metadata + extracted text + pipeline status  
- **SkillProfile** — arrays of skills, tools, tech stack, domains, experience level  
- **JobRole** — recommended job titles derived from skills/domains  
- **Company** — companies discovered for each role  
- **Person** — hiring/recruiting/manager contacts per company (LLM-derived)  
- **OutreachLead** — flattened person + company + inferred email, used for CSV

See full schema in `backend/prisma/schema.prisma`.

---

## Email Enrichment

The email enrichment step builds leads from `Person` + `Company`:

1. **If `HUNTER_API_KEY` is set** (optional, paid):  
   - Calls Hunter.io Email Finder API per person/domain.  
   - Uses returned email + score as confidence.

2. **If not set (default)**:  
   - Infers common patterns from `fullName` + company domain:  
     - `firstname.lastname@domain`  
     - `firstnamelastname@domain`  
     - `flastname@domain`  
     - `firstname@domain`  
   - Assigns a heuristic confidence score.

The CSV includes an **Email Confidence** column to help you prioritize which emails to trust or verify.

---

## Project Structure

```text
jobrole/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── index.ts               # Express server entry
│   │   ├── routes/
│   │   │   └── resume.ts          # API routes
│   │   ├── services/
│   │   │   ├── resumeIngestion.ts   # PDF/DOCX text extraction
│   │   │   ├── skillExtraction.ts   # LLM skill extraction (Ollama)
│   │   │   ├── roleRecommendation.ts# LLM role mapping (Ollama)
│   │   │   ├── companyDiscovery.ts  # LLM company discovery (Ollama)
│   │   │   ├── peopleDiscovery.ts   # LLM people discovery (Ollama)
│   │   │   ├── emailEnrichment.ts   # Email inference/enrichment
│   │   │   └── csvGenerator.ts      # CSV export builder
│   │   ├── jobs/
│   │   │   ├── pipeline.ts          # 7-step pipeline orchestrator
│   │   │   └── queue.ts             # Simple in-process job queue
│   │   ├── middleware/
│   │   │   └── upload.ts            # Multer upload config
│   │   └── utils/
│   │       ├── prisma.ts            # Prisma client singleton
│   │       ├── openai.ts            # Ollama-backed LLM wrapper
│   │       └── logger.ts            # Structured logger
│   ├── uploads/                     # Uploaded resume files
│   ├── .env                         # Backend configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Main app: upload, progress, results, CSV
│   │   ├── main.tsx                 # React entry
│   │   ├── api/
│   │   │   └── client.ts            # API client functions
│   │   └── components/
│   │       ├── FileUpload.tsx       # Drag & drop resume upload
│   │       ├── ProgressTracker.tsx  # 7-step status indicator
│   │       └── ResultsSummary.tsx   # Skills, roles, counts overview
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── package.json                     # Root scripts
└── README.md
```

---

## Known Limitations

- **People data is approximate.**  
  Without paid data sources, the LLM can only suggest plausible hiring contacts. Treat them as hints, not verified contacts.\n- **Company discovery is LLM-based.**  
  It uses general job market knowledge from training data, not live job board APIs.\n- **No authentication.**  
  This is a single-user dev tool; add auth before exposing it publicly.\n\nDespite these limits, the tool gives you a fast, automated **first pass** from resume → roles → companies → leads, which you can then refine manually.
