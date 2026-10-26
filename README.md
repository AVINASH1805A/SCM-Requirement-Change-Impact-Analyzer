# Requirement Change Impact Analyzer with Version Control using Bazaar (Bzr)

An automated Software Configuration Management (SCM) tool designed to trace, analyze, and visualize the impact of requirement changes on software artifacts (Design Docs, Source Code, Database Schemas, Test Suites) while maintaining complete version history in Bazaar (`bzr`).

---

## 🌟 Key Features
- **Requirements Traceability Matrix (RTM)**: Bi-directional link mapping between Requirements $\leftrightarrow$ Design $\leftrightarrow$ Code $\leftrightarrow$ Database $\leftrightarrow$ Test Suites.
- **Automated Impact Analysis Engine**: Graph traversal (BFS) computing direct impacts, indirect ripple effects, and risk severity scoring (Critical, High, Medium, Low).
- **Bazaar (Bzr) SCM Integration**: Full version control support tracking requirement revisions ($r1, r2, \dots$), branch isolation, commit history, and unified diff viewer.
- **🔗 Requirement-to-Requirement Dependency Flow & Cascade Walkthrough (NEW post-Review 2)**:
  - Traces requirement dependencies across upstream & downstream chains (Hop 0 Origin $\rightarrow$ Hop 1 Direct $\rightarrow$ Hop 2+ Ripple).
  - Graph view switcher: `🔗 Req-to-Req Flow` vs `🌐 Full Traceability`.
  - Animated `✨ Showcase Req Propagation Demo` demonstrating ripple effect propagation.
  - Dedicated **Req Dependencies** tab with real-time dependency creation.
- **⚡ Smart Test Pruning & CI/CD Optimizer (NEW post-Review 2)**:
  - Innovative feature rarely found in standard SCM tools (Git/SVN).
  - Analyzes the change impact path and selects only the necessary test suites (**Must Run** vs **Safely Pruned**).
  - Calculates real-time time savings (% Time Saved, Speedup multiplier, Seconds saved).
  - Dedicated full-page **Test Pruning (CI)** tab with live animated CI test execution console.
- **⚖️ SCM Architecture Arena: Bazaar (.bzr) vs. Darcs (_darcs) Comparison (NEW)**:
  - Isolated comparative study section comparing **Snapshot DAG Model (Bazaar)** vs. **Mathematical Theory of Patches (Darcs)**.
  - Side-by-side live repository inspection: `.bzr` revisions vs. `_darcs` patch units.
  - Interactive **Patch Commutation Simulator** demonstrating conflict-free cherry-picking ($P \cdot Q \leftrightarrow Q' \cdot P'$).
  - Zero side effects on the rest of the application.
- **Interactive Glassmorphism Web Dashboard**: Responsive dark mode interface with interactive dependency canvas graph, contained impact panels, and 1-click printable Review report exporter.

---

## 📁 Directory Structure
```
req_change_impact_analyzer/
├── server.py              # Python REST API & Static HTTP Server (No external libraries required)
├── scm_bazaar.py          # Primary Bazaar SCM Engine (CLI & Python fallback adapter)
├── scm_darcs.py           # Isolated Darcs SCM Engine (Theory of Patches & Commutation)
├── impact_engine.py       # Graph Traversal, Propagation Cascade & Test Pruning Engine
├── sample_data.py         # Sample Enterprise Requirements, Traceability Links & Test Suites
├── bzr_repository/        # Bazaar SCM metadata & revision storage (.bzr)
├── darcs_repository/      # Darcs SCM patch inventory & metadata storage (_darcs)
├── web/                   # Web Application Dashboard
│   ├── index.html         # Main Dashboard Layout with Pruning, Deps & Darcs tabs
│   ├── styles.css         # Glassmorphism Dark CSS Styling
│   ├── login.html         # Clean Auth Page
│   └── app.js             # API Integration, Canvas Graph, CI Runner, Darcs Commutation & UI Logic
└── docs/
    └── REVIEW_2_GUIDE.md  # Presentation Script & Project Walkthrough
```

---

## 🚦 Quick Start Guide

### Prerequisites
- Python 3.7+ installed (Uses Python Standard Library only; **no `pip install` required**).

### Starting the Project
1. **Extract the ZIP file**:
   Extract `req_change_impact_analyzer.zip` to any folder on your laptop.

2. **Open Terminal / Command Prompt** inside the extracted folder:
   ```bash
   cd req_change_impact_analyzer
   ```

3. **Start the Server**:
   - On **Mac / Linux**:
     ```bash
     python3 server.py
     ```
   - On **Windows**:
     ```cmd
     python server.py
     ```
   *(The server will start on `http://localhost:8080`. If 8080 is occupied, it automatically falls back to 8081)*.

4. **Open in Browser**:
   Navigate to:
   ```
   http://localhost:8080
   ```
   *(Or `http://localhost:8081` if indicated in the terminal output)*.
