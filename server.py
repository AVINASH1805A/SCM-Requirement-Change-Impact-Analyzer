import os
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from scm_bazaar import BazaarSCM
from scm_darcs import DarcsSCM
from impact_engine import ImpactAnalysisEngine
import sample_data

# Initialize Repository & Engine
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.join(BASE_DIR, "bzr_repository")
DARCS_DIR = os.path.join(BASE_DIR, "darcs_repository")

bzr = BazaarSCM(REPO_DIR)
darcs = DarcsSCM(DARCS_DIR)
impact_engine = ImpactAnalysisEngine(
    trace_links=sample_data.SAMPLE_TRACE_LINKS,
    artifacts=sample_data.SAMPLE_ARTIFACTS
)

# In-memory requirement data backed by Bazaar SCM
requirements_db = list(sample_data.SAMPLE_REQUIREMENTS)

# Seed baseline commit into Bazaar if empty
if len(bzr.get_log()) == 0:
    bzr.commit(
        message="r1: Baseline initial system requirement specifications",
        author="System Admin <admin@project.com>",
        requirement_snapshot=requirements_db,
        changed_req_id=None
    )

# Seed sample patches into Darcs if empty
if len(darcs.get_log()) <= 1:
    if len(darcs.get_log()) == 0:
        darcs.record_patch(
            patch_name="Patch-1: Baseline initial system requirement specifications",
            author="System Admin <admin@project.com>",
            requirement_snapshot=requirements_db,
            changed_req_id=None
        )
    darcs.record_patch(
        patch_name="Patch-2: Implement Two-Factor OTP Requirement (REQ-102)",
        author="Bob (Security Lead) <bob@project.com>",
        requirement_snapshot=requirements_db,
        changed_req_id="REQ-102"
    )
    darcs.record_patch(
        patch_name="Patch-3: Optimize Checkout & Cart Flow Specification (REQ-103)",
        author="Charlie (PM) <charlie@project.com>",
        requirement_snapshot=requirements_db,
        changed_req_id="REQ-103"
    )
    darcs.record_patch(
        patch_name="Patch-4: Refactor Auth Token Expiration Logic (REQ-101)",
        author="Alice (Identity Lead) <alice@project.com>",
        requirement_snapshot=requirements_db,
        changed_req_id="REQ-101"
    )


class ImpactAnalyzerAPIHandler(SimpleHTTPRequestHandler):
    def log_error(self, format, *args):
        # Catch HTTPS TLS handshake attempts cleanly when user types https:// instead of http://
        if args and "Bad request version" in str(args[0]):
            print("[Info] Detected HTTPS connection attempt. Please use http://localhost:8080 (without 's').")
            return
        super().log_error(format, *args)

    def end_headers(self):
        # Enable CORS & caching headers for responsive web dashboard
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # REST API Routes
        if path == "/api/requirements":
            self.send_json(requirements_db)
        elif path == "/api/artifacts":
            self.send_json(sample_data.SAMPLE_ARTIFACTS)
        elif path == "/api/traceability":
            self.send_json({
                "requirements": requirements_db,
                "artifacts": sample_data.SAMPLE_ARTIFACTS,
                "trace_links": sample_data.SAMPLE_TRACE_LINKS
            })
        elif path == "/api/scm/branches":
            self.send_json(bzr.list_branches())
        elif path == "/api/scm/log":
            branch = query.get("branch", [None])[0]
            self.send_json(bzr.get_log(branch=branch))
        elif path == "/api/scm/diff":
            rev_a = query.get("rev_a", [1])[0]
            rev_b = query.get("rev_b", [2])[0]
            try:
                diff_data = bzr.get_diff(int(rev_a), int(rev_b))
                self.send_json(diff_data)
            except Exception as e:
                self.send_json({"error": str(e)}, status=400)
        elif path == "/api/darcs/log":
            self.send_json(darcs.get_log())
        elif path == "/api/darcs/diff":
            patch_a = query.get("patch_a", ["patch-1"])[0]
            patch_b = query.get("patch_b", ["patch-2"])[0]
            self.send_json(darcs.get_diff(patch_a, patch_b))
        elif path == "/api/scm/compare":
            bzr_log = bzr.get_log()
            darcs_log = darcs.get_log()
            self.send_json({
                "bazaar": {
                    "name": "Bazaar (BZR)",
                    "paradigm": "Snapshot Directed Acyclic Graph (DAG)",
                    "storage_dir": ".bzr/",
                    "total_revisions": len(bzr_log),
                    "branches": bzr.list_branches(),
                    "merge_algorithm": "3-Way Common Ancestor Merge",
                    "history_model": "Rigid linear/DAG snapshot commits (r1 -> r2)",
                    "philosophy": "Every commit is a snapshot of the whole working tree state at that point in time."
                },
                "darcs": {
                    "name": "Darcs",
                    "paradigm": "Theory of Patches (Algebraic Commutation)",
                    "storage_dir": "_darcs/",
                    "total_patches": len(darcs_log),
                    "active_branch": "main",
                    "merge_algorithm": "Patch Commutation (A · B ⟷ B' · A')",
                    "history_model": "Fluid unordered set of commutable patches",
                    "philosophy": "Changes are first-class mathematical transformations that can be cherry-picked and commuted conflict-free."
                },
                "bazaar_log": bzr_log,
                "darcs_log": darcs_log
            })
        elif path == "/api/requirements/dependencies":
            # Filter and return requirement-to-requirement dependency links
            req_ids = {r["id"] for r in requirements_db}
            req_deps = [
                link for link in sample_data.SAMPLE_TRACE_LINKS
                if link.get("source") in req_ids and link.get("target") in req_ids
            ]
            self.send_json({
                "requirements": requirements_db,
                "dependencies": req_deps
            })
        elif path.startswith("/api/impact/analyze"):
            raw_req_id = query.get("req_id", ["REQ-101"])[0]
            req_id = raw_req_id.split(":")[0].strip() if ":" in raw_req_id else raw_req_id.strip()
            severity = query.get("severity", ["MEDIUM"])[0]
            change_desc = query.get("desc", ["Requirement change simulation"])[0]
            res = impact_engine.analyze_change(req_id, proposed_change_description=change_desc, change_severity=severity)
            self.send_json(res)
        else:
            # Fallback to static file server from 'web' directory or root
            web_dir = os.path.join(BASE_DIR, "web")
            file_path = os.path.join(web_dir, path.lstrip("/"))
            if os.path.isfile(file_path):
                self.serve_file(file_path)
            else:
                # Default to login page
                login_path = os.path.join(web_dir, "login.html")
                if os.path.exists(login_path):
                    self.serve_file(login_path)
                else:
                    super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        content_length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b'{}'

        try:
            payload = json.loads(body_bytes.decode('utf-8'))
        except Exception:
            payload = {}

        if path == "/api/requirements/update":
            # Update a requirement and commit to Bazaar SCM
            req_id = payload.get("id")
            new_title = payload.get("title")
            new_desc = payload.get("description")
            new_priority = payload.get("priority", "HIGH")
            author = payload.get("author", "Lead Architect <architect@project.com>")
            commit_msg = payload.get("commit_message", f"Update {req_id}: {new_title}")

            found = False
            for req in requirements_db:
                if req["id"] == req_id:
                    req["title"] = new_title or req["title"]
                    req["description"] = new_desc or req["description"]
                    req["priority"] = new_priority
                    # Bump version
                    try:
                        v = float(req.get("version", "1.0"))
                        req["version"] = f"{v + 0.1:.1f}"
                    except ValueError:
                        req["version"] = "1.1"
                    found = True
                    break
            
            if not found and req_id:
                new_req = {
                    "id": req_id,
                    "title": new_title or "New Requirement",
                    "description": new_desc or "",
                    "priority": new_priority,
                    "status": "PROPOSED",
                    "version": "1.0",
                    "author": author
                }
                requirements_db.append(new_req)

            # Record commit in Bazaar SCM
            commit_res = bzr.commit(
                message=commit_msg,
                author=author,
                requirement_snapshot=requirements_db,
                changed_req_id=req_id
            )

            # Record patch in Darcs SCM for parallel comparison
            try:
                darcs.record_patch(
                    patch_name=f"patch: {commit_msg}",
                    author=author,
                    requirement_snapshot=requirements_db,
                    changed_req_id=req_id
                )
            except Exception:
                pass

            # Run impact analysis on updated requirement
            impact_res = impact_engine.analyze_change(req_id, proposed_change_description=new_desc)

            self.send_json({
                "status": "success",
                "message": f"Requirement '{req_id}' updated and committed to Bazaar SCM.",
                "bazaar_commit": commit_res,
                "impact_analysis": impact_res
            })

        elif path == "/api/scm/branch/create":
            branch_name = payload.get("branch_name")
            if not branch_name:
                self.send_json({"error": "Branch name is required."}, status=400)
                return
            success, msg = bzr.create_branch(branch_name)
            self.send_json({"status": "success" if success else "error", "message": msg})

        elif path == "/api/requirements/dependencies":
            # Add or update a requirement-to-requirement dependency
            src = payload.get("source")
            tgt = payload.get("target")
            rel_type = payload.get("type", "DEPENDS_ON")

            if not src or not tgt:
                self.send_json({"error": "Both 'source' and 'target' requirements are required."}, status=400)
                return

            # Check if link already exists
            existing = False
            for link in sample_data.SAMPLE_TRACE_LINKS:
                if link.get("source") == src and link.get("target") == tgt:
                    link["type"] = rel_type
                    existing = True
                    break

            if not existing:
                sample_data.SAMPLE_TRACE_LINKS.append({
                    "source": src,
                    "target": tgt,
                    "type": rel_type
                })

            # Update impact engine graph
            impact_engine.update_data(sample_data.SAMPLE_TRACE_LINKS, sample_data.SAMPLE_ARTIFACTS)

            # Record in Bazaar SCM
            bzr.commit(
                message=f"SCM: Added dependency link {src} -> {tgt} ({rel_type})",
                author="System Architect <architect@project.com>",
                requirement_snapshot=requirements_db,
                changed_req_id=src
            )

            # Record in Darcs SCM
            try:
                darcs.record_patch(
                    patch_name=f"patch: Added dependency {src} -> {tgt} ({rel_type})",
                    author="System Architect <architect@project.com>",
                    requirement_snapshot=requirements_db,
                    changed_req_id=src
                )
            except Exception:
                pass

            # Re-run analysis on src
            impact_res = impact_engine.analyze_change(src)

            self.send_json({
                "status": "success",
                "message": f"Dependency '{src}' -> '{tgt}' ({rel_type}) registered and committed to Bazaar SCM.",
                "impact_analysis": impact_res
            })

        elif path == "/api/darcs/commute_demo":
            patch_a = payload.get("patch_a", "patch-1")
            patch_b = payload.get("patch_b", "patch-2")
            res = darcs.simulate_commute(patch_a, patch_b)
            self.send_json(res)

        elif path == "/api/project/load_template":
            template_id = payload.get("template", "ecommerce")
            if template_id == "banking":
                # Preset for Core Banking & KYC Platform
                pass
            self.send_json({"status": "success", "template": template_id})

        else:
            self.send_json({"error": "Route not found"}, status=404)

    def serve_file(self, file_path):
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            if file_path.endswith(".html"):
                self.send_header("Content-Type", "text/html; charset=utf-8")
            elif file_path.endswith(".css"):
                self.send_header("Content-Type", "text/css; charset=utf-8")
            elif file_path.endswith(".js"):
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
            elif file_path.endswith(".json"):
                self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_json({"error": f"Failed to serve file: {str(e)}"}, status=500)

    def send_json(self, data, status=200):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run_server(port=8081):
    server_address = ('', port)
    httpd = HTTPServer(server_address, ImpactAnalyzerAPIHandler)
    print(f"===============================================================")
    print(f" Requirement Change Impact Analyzer with Bazaar SCM Engine")
    print(f" Server running at: http://localhost:{port}")
    print(f"===============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
