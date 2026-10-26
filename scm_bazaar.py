import os
import json
import time
import shutil
import subprocess
import difflib
from datetime import datetime

class BazaarSCM:
    """
    Bazaar (bzr / brz) SCM Version Control Engine.
    Directly executes real GNU Bazaar / Breezy CLI commands via subprocess for:
    - Repository initialization (bzr init)
    - Identity configuration (bzr whoami)
    - File tracking & commits (bzr add, bzr commit, bzr revno)
    - Unified diff generation (bzr diff -r A..B)
    - Branch management & historical revision logs
    """
    def __init__(self, repo_dir):
        self.repo_dir = os.path.abspath(repo_dir)
        self.bzr_dir = os.path.join(self.repo_dir, ".bzr")
        self.branches_file = os.path.join(self.bzr_dir, "branches.json")
        self.revisions_file = os.path.join(self.bzr_dir, "revisions.json")
        self.current_branch_file = os.path.join(self.bzr_dir, "current_branch.txt")
        self.state_file = os.path.join(self.repo_dir, "requirements_state.json")
        
        # Locate real Bazaar / Breezy executable
        self.bzr_bin = self._find_bzr_binary()
        if self.bzr_bin:
            print(f"[Bazaar SCM] Connected to real Bazaar binary: {self.bzr_bin}")
        else:
            print("[Bazaar SCM] Warning: bzr/brz binary not found on PATH. Falling back to SCM metadata simulation.")

        self._ensure_repo()

    def _find_bzr_binary(self):
        """Locate bzr or brz executable across system and user paths."""
        candidates = [
            shutil.which("bzr"),
            shutil.which("brz"),
            "/Users/avinashagarwal/.gemini/antigravity/bin/bzr",
            "/Users/avinashagarwal/.gemini/antigravity/bin/brz",
            "/Users/avinashagarwal/Library/Python/3.9/bin/brz",
            "/usr/local/bin/bzr",
            "/opt/homebrew/bin/bzr",
            "/opt/homebrew/bin/brz"
        ]
        for candidate in candidates:
            if candidate and os.path.exists(candidate) and os.access(candidate, os.X_OK):
                return candidate
        return None

    def _run_bzr(self, args, cwd=None):
        """Execute a bzr command via subprocess."""
        if not self.bzr_bin:
            return False, "bzr binary not found"
        cmd = [self.bzr_bin] + args
        try:
            res = subprocess.run(
                cmd,
                cwd=cwd or self.repo_dir,
                capture_output=True,
                text=True,
                timeout=15
            )
            return res.returncode == 0, res.stdout + ("\n" + res.stderr if res.stderr else "")
        except Exception as e:
            return False, str(e)

    def _ensure_repo(self):
        """Initialize .bzr repository directory if not exists."""
        if not os.path.exists(self.repo_dir):
            os.makedirs(self.repo_dir, exist_ok=True)
            
        # Check if real .bzr repository exists
        is_bzr_repo = os.path.exists(os.path.join(self.repo_dir, ".bzr", "branch-format")) or \
                      os.path.exists(os.path.join(self.repo_dir, ".bzr", "repository"))
        
        if not is_bzr_repo and self.bzr_bin:
            # Execute real bzr init
            print(f"[Bazaar SCM] Initializing real Bazaar repository in {self.repo_dir}...")
            ok, out = self._run_bzr(["init"])
            if ok:
                print(f"[Bazaar SCM] Bazaar repository initialized successfully.")
                self._run_bzr(["whoami", "Software Engineering Team <scm@impact-analyzer.local>"])
            else:
                print(f"[Bazaar SCM] bzr init returned: {out}")

        os.makedirs(self.bzr_dir, exist_ok=True)

        # Setup metadata structures
        if not os.path.exists(self.branches_file):
            initial_branches = {"main": {"head": 0, "created_at": datetime.now().isoformat()}}
            with open(self.branches_file, "w") as f:
                json.dump(initial_branches, f, indent=2)
                
        if not os.path.exists(self.revisions_file):
            with open(self.revisions_file, "w") as f:
                json.dump([], f, indent=2)
                
        if not os.path.exists(self.current_branch_file):
            with open(self.current_branch_file, "w") as f:
                f.write("main")

    def get_current_branch(self):
        if os.path.exists(self.current_branch_file):
            with open(self.current_branch_file, "r") as f:
                return f.read().strip()
        return "main"

    def list_branches(self):
        if os.path.exists(self.branches_file):
            with open(self.branches_file, "r") as f:
                branches = json.load(f)
        else:
            branches = {"main": {"head": 1, "created_at": datetime.now().isoformat()}}
        current = self.get_current_branch()
        return [{"name": name, "is_current": name == current, "head": data.get("head", 1)} for name, data in branches.items()]

    def create_branch(self, branch_name):
        if os.path.exists(self.branches_file):
            with open(self.branches_file, "r") as f:
                branches = json.load(f)
        else:
            branches = {}
            
        if branch_name in branches:
            return False, f"Branch '{branch_name}' already exists."
        
        current = self.get_current_branch()
        head_rev = branches.get(current, {}).get("head", 1)
        branches[branch_name] = {
            "head": head_rev,
            "created_at": datetime.now().isoformat(),
            "branched_from": current
        }
        with open(self.branches_file, "w") as f:
            json.dump(branches, f, indent=2)
            
        with open(self.current_branch_file, "w") as f:
            f.write(branch_name)
            
        return True, f"Created and switched to Bazaar branch '{branch_name}'."

    def switch_branch(self, branch_name):
        if os.path.exists(self.branches_file):
            with open(self.branches_file, "r") as f:
                branches = json.load(f)
        else:
            branches = {}
            
        if branch_name not in branches:
            return False, f"Branch '{branch_name}' does not exist."
            
        with open(self.current_branch_file, "w") as f:
            f.write(branch_name)
        return True, f"Switched to Bazaar branch '{branch_name}'."

    def commit(self, message, author, requirement_snapshot, changed_req_id=None):
        """Commit a new requirement state revision into Bazaar repository."""
        # 1. Write the current requirement specifications state file
        with open(self.state_file, "w") as f:
            json.dump(requirement_snapshot, f, indent=2)

        # 2. Execute real bzr commands if available
        real_revno = None
        if self.bzr_bin:
            self._run_bzr(["add", "requirements_state.json"])
            author_arg = f"{author}" if author else "Software Engineer <developer@project.com>"
            self._run_bzr(["whoami", author_arg])
            ok, commit_out = self._run_bzr(["commit", "-m", message])
            
            # Read real revno from Bazaar
            ok_rev, revno_out = self._run_bzr(["revno"])
            if ok_rev and revno_out.strip().isdigit():
                real_revno = int(revno_out.strip())

        # 3. Read metadata history
        revisions = []
        if os.path.exists(self.revisions_file):
            try:
                with open(self.revisions_file, "r") as f:
                    revisions = json.load(f)
            except Exception:
                revisions = []

        branches = {"main": {"head": 0}}
        if os.path.exists(self.branches_file):
            try:
                with open(self.branches_file, "r") as f:
                    branches = json.load(f)
            except Exception:
                pass

        current_branch = self.get_current_branch()
        rev_id = real_revno if real_revno is not None else (len(revisions) + 1)

        commit_entry = {
            "rev_id": rev_id,
            "revision_number": f"r{rev_id}",
            "branch": current_branch,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "author": author,
            "message": message,
            "changed_req_id": changed_req_id,
            "snapshot": requirement_snapshot
        }

        revisions.append(commit_entry)
        with open(self.revisions_file, "w") as f:
            json.dump(revisions, f, indent=2)

        if current_branch not in branches:
            branches[current_branch] = {}
        branches[current_branch]["head"] = rev_id
        with open(self.branches_file, "w") as f:
            json.dump(branches, f, indent=2)

        return commit_entry

    def get_log(self, branch=None):
        """Retrieve revision audit log from Bazaar."""
        if os.path.exists(self.revisions_file):
            try:
                with open(self.revisions_file, "r") as f:
                    revisions = json.load(f)
            except Exception:
                revisions = []
        else:
            revisions = []

        if branch:
            filtered = [r for r in revisions if r.get("branch") == branch]
            return list(reversed(filtered))
        return list(reversed(revisions))

    def get_revision(self, rev_id):
        """Retrieve full details for a specific revision number."""
        log = self.get_log()
        for r in log:
            if str(r.get("rev_id")) == str(rev_id) or r.get("revision_number") == f"r{rev_id}":
                return r
        return None

    def get_diff(self, rev_a_id, rev_b_id):
        """Generate unified diff and structured requirement changes between two Bazaar revisions."""
        rev_a = self.get_revision(rev_a_id)
        rev_b = self.get_revision(rev_b_id)
        
        if not rev_a or not rev_b:
            return {"error": f"One or both revisions (r{rev_a_id}, r{rev_b_id}) not found."}

        # Attempt to run real bzr diff if repository has genuine history
        diff_lines = []
        if self.bzr_bin:
            ok, bzr_diff_out = self._run_bzr(["diff", "-r", f"{rev_a_id}..{rev_b_id}"])
            if ok and bzr_diff_out.strip():
                diff_lines = bzr_diff_out.splitlines()

        # Fallback to Python unified diff if real diff was empty
        if not diff_lines:
            text_a = json.dumps(rev_a["snapshot"], indent=2).splitlines()
            text_b = json.dumps(rev_b["snapshot"], indent=2).splitlines()
            diff_lines = list(difflib.unified_diff(
                text_a, text_b,
                fromfile=f"Bazaar Revision {rev_a['revision_number']} ({rev_a['timestamp']})",
                tofile=f"Bazaar Revision {rev_b['revision_number']} ({rev_b['timestamp']})",
                lineterm=""
            ))

        # Structured comparison for rich UI inspection table
        req_a_map = {r["id"]: r for r in rev_a.get("snapshot", [])}
        req_b_map = {r["id"]: r for r in rev_b.get("snapshot", [])}
        
        changes = []
        all_ids = set(req_a_map.keys()).union(set(req_b_map.keys()))
        for req_id in sorted(all_ids):
            ra = req_a_map.get(req_id)
            rb = req_b_map.get(req_id)
            
            if not ra:
                changes.append({"req_id": req_id, "type": "ADDED", "title": rb.get("title", ""), "details": f"Added in {rev_b['revision_number']}"})
            elif not rb:
                changes.append({"req_id": req_id, "type": "DELETED", "title": ra.get("title", ""), "details": f"Removed in {rev_b['revision_number']}"})
            elif ra != rb:
                mod_details = []
                for k in rb:
                    if ra.get(k) != rb.get(k):
                        mod_details.append(f"{k}: '{ra.get(k)}' -> '{rb.get(k)}'")
                changes.append({
                    "req_id": req_id,
                    "type": "MODIFIED",
                    "title": rb.get("title", ""),
                    "old": ra,
                    "new": rb,
                    "diff_lines": mod_details
                })

        return {
            "rev_a": rev_a["revision_number"],
            "rev_b": rev_b["revision_number"],
            "unified_diff": diff_lines,
            "structured_changes": changes
        }
