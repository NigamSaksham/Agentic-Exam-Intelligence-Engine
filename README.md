# 🪸 Coral: SQL-Grounded Exam Intelligence Engine

Coral is an interactive platform designed to help students analyze and prioritize syllabus topics by cross-referencing textbook outlines with past exam papers. By linking chapters to actual exam questions, Coral ranks topics by exam occurrence, highlights zero-yield areas ("Safe-to-Skip"), and provides an interactive SQL-grounded chat partner.

It features a dual-architecture setup:
1. **Developer Mode**: A standard React frontend, Express API server, and SQLite database.
2. **Offline Mode**: A single, portable `index.html` file with an in-browser mock SQL engine (`runJsSql`) for 100% serverless execution.

---

## 🚀 Key Features

*   **Dual Execution Modes**:
    *   **Developer Mode**: Powered by a Node.js Express server, SQLite3 database, and React component tree.
    *   **Offline Mode**: A single, standalone `index.html` file using in-browser Babel, Tailwind CSS CDN, and a custom **Dynamic Client-Side JS SQL Compiler** (`runJsSql`) to avoid backend dependencies.
*   **Vector Similarity Alignment**: Utilizes local k-NN cosine vector mapping on `text-embedding-004` to match exam questions to textbook outline sections.
*   **Grounded SQL Chat Partner**: The chat assistant translates student questions into raw SQL SELECT queries, executes them against the active database, and synthesizes clear, conversational study guides.
*   **Developer Trace Panel**: Live trace logs showing the exact compiled SQL statement, execution status, and raw JSON grounding payload for transparent developer debugging.
*   **Multi-Subject Isolation**: Absolute context boundaries between active subjects (e.g., *Computer Networks*, *Operating Systems*, *Database Management Systems*) preventing any data cross-contamination.
*   **Glassmorphic Dark UI**: Clean Outfit/Inter typography, harmonious color styling, responsive grids, and subtle animations.

---

## 🛠️ Technology Stack

*   **Core**: HTML5, Vanilla CSS, React 18, TailwindCSS
*   **Build & Dev Server**: Vite 5
*   **Backend Server**: Node.js, Express (with CORS and Multer file streaming)
*   **Database**: SQLite3 (schema isolation, cascading deletions, index optimized)
*   **AI Model Integrations**: Google Gemini API (`gemini-2.5-flash` and `text-embedding-004`) via official SDK and native REST API fallbacks.
*   **PDF Ingestion**: `pdfjs-dist` on the client; `pdf-parse` on the server.

---

## 💻 Installation & Setup

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18 or higher) installed on your system.

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/coral-exam-intelligence.git
cd coral-exam-intelligence
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Your Gemini API Key
Coral requires a Gemini API Key to embed PDFs and run agentic SQL chat queries.
*   **Server-side (Vite Mode)**:
    1. Copy `.env.example` to a new file named `.env`:
       ```bash
       cp .env.example .env
       ```
    2. Add your Gemini API Key:
       ```env
       GEMINI_API_KEY=AIzaSy...
       ```
*   **Client-side (Offline Mode / UI Settings)**:
    You can also enter your key directly inside the application's sidebar settings block (stored securely in your browser's local storage).

---

## 🏃 Running the Application

### Start Development Server (Vite + Express)
Run the concurrent dev command to boot up both the Express backend API (Port `3001`) and the Vite frontend dev server (Port `5173`):
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser to interact with the application.

### Build and Package (Standalone Production Offline File)
To compile the Vite assets and output/package the standalone portal:
```bash
npm run build
```
This optimizes Vite assets and compiles changes cleanly into `dist/index.html`. You can double-click `dist/index.html` to run the **entire app 100% offline** directly in your browser!

---

## 🔌 withcoral/coral Agent Integration

This project is fully compatible and integrated with [withcoral/coral](https://github.com/withcoral/coral) — the local-first SQL runtime engine that lets AI agents (like Claude Code, Cursor, and VS Code) query local datasets and REST APIs using standard SQL without custom tool glue.

Exposing the knowledge tables of your Exam Intelligence database via `withcoral/coral` allows AI agents to query your syllabus, study files, and yield metrics directly.

### 1. Enable Coral API Server
Ensure the Coral Exam backend server is running locally (defaulting to Port `3001`):
```bash
npm run server
```

### 2. Configure Coral Source Spec
In the repository root, we provide an official custom source specification file: [coral-source.yaml](file:///c:/Users/dell/Documents/Antigravity%20Projects/coral-source.yaml). It exposes five SQL-grounded tables:
*   `coral_exam.documents` (Syllabus TOC and past paper PDFs)
*   `coral_exam.questions` (AI vector-aligned questions)
*   `coral_exam.textbook_chunks` (Textbook outlines and chapters)
*   `coral_exam.chapter_links` (Matches between past questions and textbook sections)
*   `coral_exam.student_performance` (Practice scores and weakness indicators)

### 3. Add Custom Source via Coral CLI
With the `withcoral/coral` CLI installed on your machine, run:
```bash
# Add the local exam intelligence engine as a custom SQL source
coral source add --file ./coral-source.yaml
```

### 4. Query Your Exam Data via SQL
Now, you or your AI agent can query your study database directly from the CLI or within your coding environment!

**Example: Find chapters that have the most past questions matched**
```sql
coral sql "SELECT chapter, count(question_id) as pyq_count FROM coral_exam.textbook_chunks c JOIN coral_exam.chapter_links l ON c.chunk_id = l.chunk_id GROUP BY chapter ORDER BY pyq_count DESC;"
```

**Example: Identify which Operating Systems outline sections you should de-prioritize (Safe skips)**
```sql
coral sql "SELECT chapter, section, main_concept FROM coral_exam.textbook_chunks WHERE source_id IN (SELECT source_id FROM coral_exam.documents WHERE subject = 'Operating Systems') AND chunk_id NOT IN (SELECT chunk_id FROM coral_exam.chapter_links);"
```

### 5. Compulsory SQL Execution Routing (`runCoralSql`)
The backend API server and AI query routing system is configured to prioritize and run all analytical SQL queries through the official `withcoral/coral` CLI engine:
*   **Primary Execution Path**: Analytical queries (from both the AI Study Partner chat and the SQL playground console) are captured and routed directly to the `withcoral/coral` CLI:
    ```bash
    coral sql "[query]" --format json
    ```
*   **Zero-Downtime Fallback**: If the host machine does not have the `withcoral/coral` CLI installed (or it throws an execution error), the backend interceptor catches it and automatically runs the query natively against the local `coral_exam.db` SQLite3 database, ensuring uninterrupted functionality.

---

## 🗺️ Step-by-Step User Guide

### Step 1: Add or Select Your Subject
Use the dropdown in the sidebar to select a subject (e.g., *Operating Systems*) or add a fresh subject in the input bar. All uploads, analytics, and chat histories are **strictly isolated** to your active subject.

### Step 2: Upload Syllabus & Outlines
1. Navigate to the **1. Upload Material** tab.
2. Under **Textbook Contents**, upload your textbook outline/table of contents PDF.
3. The parser will parse, structure, and store chapter sections.

### Step 3: Upload Past Exam Papers (PYQs)
1. In the same tab, under **PYQ Papers**, upload your past exam papers PDF.

### Step 4: Align AI
1. Once both files are uploaded, click the **Align AI** button next to your uploaded PYQ.
2. Coral's background vector engine will chunk the materials, compute text embeddings, calculate local similarity weights, and link questions to sections.

### Step 5: Master High-Yield Insights
Go to the **2. High-Yield Insights** tab to view your dashboard:
*   **Syllabus Yield Rankings**: View chapters ranked dynamically in descending order of past exam matching counts.
*   **Safe-to-Skip Areas**: High-relevance card deck automatically showcasing zero-yield sections that you can safely de-prioritize to save study time.

### Step 6: Query Your AI Study Partner
Go to the **3. AI Study Partner** tab:
*   Ask natural language questions like: *"Which chapters should I study first?"* or *"Tell me the least important chapters in Operating Systems."*
*   Receive highly encouraging, jargon-free, supportive guidance.
*   Click **View AI SQL execution trace** to inspect the raw SQLite query compiled by Gemini and the exact relational grounding rows returned!

---

## 📂 Project Structure

```
├── dist/                     # Optimized standalone production builds
│   └── index.html            # Production portable standalone client
├── src/                      # React source files (Vite client)
│   ├── components/
│   │   ├── ChatInterface.jsx # Multi-subject agent chat UI
│   │   ├── Dashboard.jsx     # High-yield insights & Skip Decks
│   │   └── DocumentConsole.js# Material uploader & schema console
│   ├── App.jsx               # Application shell & state persistence
│   ├── index.css             # Main styling entry point
│   └── main.jsx              # Vite React mounting script
├── uploads/                  # Temporary file stream uploads (git-ignored)
├── agents.js                 # Gemini LLM adapter & backend query agent compiler
├── database.js               # SQLite3 schemas, Indices, and analytics queries
├── server.js                 # Express server endpoints & multi-subject analytics
├── package.json              # Project scripts and dependencies
├── vite.config.js            # Vite build and API server proxy configs
├── .gitignore                # Production git exclude filters
└── README.md                 # This documentation
```

---

## 🤝 Contributing
Contributions, bug reports, and suggestions are welcome!
1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
