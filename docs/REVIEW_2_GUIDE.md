# Review 2 Presentation Script & Live Demonstration Guide

**Project Title**: Requirement Change Impact Analyzer with Version Control using Bazaar (Bzr)  
**Domain**: Software Configuration Management (SCM) & Software Engineering  

---

## 🎤 Presentation Script for Review 2 (Team Roles)

### Member 1 — System Architecture & Workflow Overview (~2 mins)
> *"Good morning ma'am/sir. In Review 1, we introduced the concept of Requirement Change Impact Analysis and the choice of Bazaar (Bzr) as our Version Control System.*
> 
> *For **Review 2**, we have developed the complete working project. Our system consists of three main modules:*
> 1. ***Traceability Matrix & Dependency Engine***: Maps functional requirements to architecture diagrams, source code controllers, database schemas, and test suites.
> 2. ***Automated Impact Analysis Engine***: Uses graph traversal (BFS) to calculate direct and ripple impacts when a requirement changes, computing a Risk Severity Score (Critical, High, Medium, Low).
> 3. ***Bazaar (Bzr) Version Control Module***: Maintains complete revision history (`r1`, `r2`, ...), supports branching (`main`, `feature/otp-login`), and records requirement diffs across revisions.
> 
> *Let us now look at how Bazaar and the Impact Engine work together during development."*

---

### Member 2 — Bazaar Integration & Version Control Capabilities (~2 mins)
> *"Thank you. Bazaar (Bzr) plays a vital role in our project by maintaining requirement evolution as version-controlled commits.*
> 
> *In traditional software development, requirement documents are stored in static files, making it hard to track who modified what and when. In our system:*
> - *Every requirement update is saved as a Bazaar commit (`bzr commit`), generating revision tags like `r1`, `r2`, `r3` with timestamp and author attribution.*
> - *Bazaar **Branching** (`bzr branch`) allows teams to experiment with proposed requirement changes (e.g., adding 2FA OTP login) in an isolated branch before merging into `main`.*
> - *Bazaar **Diff Viewer** (`bzr diff`) provides a side-by-side comparison of requirement text across any two revisions.*
> 
> *This ensures 100% SCM traceability and auditability for all requirement changes."*

---

### Member 3 — Live Demonstration & Impact Analysis Walkthrough (~2 mins)
> *"Now I will demonstrate the live working project dashboard.*
> 
> ***Step 1: Baseline View***  
> *Here in our dashboard, we see 5 pre-loaded enterprise requirements (e.g., User Auth `REQ-101`, Cart Checkout `REQ-103`, Payment Gateway `REQ-104`).*
> 
> ***Step 2: Change Simulation (e.g., Adding OTP 2FA to Auth)***  
> *Suppose the customer asks to change `REQ-101` from simple password sign-in to 2-Factor OTP Authentication (`REQ-102`). We select `REQ-101` and run the Impact Analysis.*
> 
> ***Step 3: Impact Output & Dependency Graph***  
> *The system immediately generates:*
> 1. *A **Risk Score** (e.g., 78/100 - HIGH RISK).*
> 2. *A **Direct Impact List**: Flagging `auth_service.py`, `jwt_handler.py`, and `users` table.*
> 3. *An **Indirect Ripple Impact**: Flagging `otp_verifier.py`, `otp_tokens` table, and `checkout_flow.png` design spec.*
> 4. *The **Affected Test Suites**: Automatically identifying `test_auth_service.py` and `test_otp_flow.py` that must be re-run.*
> 
> ***Step 4: Committing to Bazaar SCM***  
> *We then update the requirement and click **'Commit Change to Bazaar SCM'**. A new revision `r2` is generated in Bazaar, and can be inspected in the Bazaar Revision Timeline and Diff Viewer.*
> 
> *This concludes our presentation. Thank you! We are open to questions."*

---

## 🚀 How to Run the Project for Review 2 Demo

1. Open Terminal and navigate to the project directory:
   ```bash
   cd /Users/avinashagarwal/.gemini/antigravity/scratch/req_change_impact_analyzer
   ```

2. Start the Python REST API & Web Dashboard server:
   ```bash
   python3 server.py
   ```

3. Open your Web Browser and go to:
   ```
   http://localhost:8080
   ```

4. During your presentation review:
   - Show **Tab 1** (Impact Simulator & Canvas Graph).
   - Show **Tab 2** (Make a requirement change and commit to Bazaar).
   - Show **Tab 4** (Inspect Bazaar SCM Log & Diff Viewer).
   - Show **Tab 5** (Print / Export PDF Impact Assessment Report).
