import os
import json
import time
import shutil
import hashlib
import subprocess
import difflib
from datetime import datetime

class DarcsSCM:
    """
    Darcs Version Control Engine (Theory of Patches).
    Manages Darcs repository (_darcs/), recording patches (darcs record),
    patch inventory history (darcs log), patch diffs (darcs diff), and branches.
    """
    def __init__(self, repo_dir):
        self.repo_dir = repo_dir
        self.darcs_dir = os.path.join(repo_dir, "_darcs")
        self.patches_file = os.path.join(self.darcs_dir, "patches.json")
        self.inventory_file = os.path.join(self.darcs_dir, "inventory.json")
        self._ensure_repo()

    def _ensure_repo(self):
        """Initialize _darcs repository directory structure."""
        if not os.path.exists(self.repo_dir):
            os.makedirs(self.repo_dir, exist_ok=True)
            
        if not os.path.exists(self.darcs_dir):
            os.makedirs(self.darcs_dir, exist_ok=True)
            
            # Check if system darcs CLI is available
            has_darcs = shutil.which("darcs") is not None
            if has_darcs:
                try:
                    subprocess.run(["darcs", "init", "--repodir", self.repo_dir], capture_output=True, text=True)
                except Exception:
                    pass

            with open(self.patches_file, "w") as f:
                json.dump([], f, indent=2)
                
            with open(self.inventory_file, "w") as f:
                json.dump({"active_branch": "main", "branches": ["main"]}, f, indent=2)

    def record_patch(self, patch_name, author, requirement_snapshot, changed_req_id=None):
        """
        Record a new patch into the Darcs repository ('darcs record').
        Follows Darcs Theory of Patches: each change is a distinct patch unit.
        """
        with open(self.patches_file, "r") as f:
            patches = json.load(f)
            
        patch_num = len(patches) + 1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Calculate Darcs patch hash
        hash_input = f"{patch_num}:{patch_name}:{author}:{timestamp}"
        patch_hash = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:12]
        
        patch_entry = {
            "patch_id": f"patch-{patch_num}",
            "patch_hash": patch_hash,
            "patch_name": patch_name,
            "author": author,
            "timestamp": timestamp,
            "changed_req_id": changed_req_id,
            "snapshot": requirement_snapshot
        }
        
        patches.append(patch_entry)
        with open(self.patches_file, "w") as f:
            json.dump(patches, f, indent=2)
            
        return patch_entry

    def get_log(self):
        """Get Darcs patch log history ('darcs log')."""
        with open(self.patches_file, "r") as f:
            patches = json.load(f)
        return list(reversed(patches))

    def get_patch(self, patch_id):
        with open(self.patches_file, "r") as f:
            patches = json.load(f)
        for p in patches:
            if p["patch_id"] == patch_id or p["patch_hash"] == patch_id or p.get("patch_id") == f"patch-{patch_id}":
                return p
        return None

    def get_diff(self, patch_a_id, patch_b_id):
        """Generate patch unified diff ('darcs diff')."""
        patch_a = self.get_patch(patch_a_id)
        patch_b = self.get_patch(patch_b_id)
        
        if not patch_a or not patch_b:
            return {"error": "One or both Darcs patches not found."}
            
        text_a = json.dumps(patch_a["snapshot"], indent=2).splitlines()
        text_b = json.dumps(patch_b["snapshot"], indent=2).splitlines()
        
        diff = list(difflib.unified_diff(
            text_a, text_b,
            fromfile=f"Darcs Patch {patch_a['patch_id']} [{patch_a['patch_hash']}] ({patch_a['timestamp']})",
            tofile=f"Darcs Patch {patch_b['patch_id']} [{patch_b['patch_hash']}] ({patch_b['timestamp']})",
            lineterm=""
        ))
        
        return {
            "patch_a": patch_a["patch_id"],
            "patch_b": patch_b["patch_id"],
            "unified_diff": diff
        }

    def simulate_commute(self, patch_a_id, patch_b_id):
        """
        Simulate Darcs Theory of Patches Commutation:
        Given patches A and B, compute if A · B can commute to B' · A'.
        If A and B target different requirements, they commute cleanly (0 conflicts).
        """
        patch_a = self.get_patch(patch_a_id)
        patch_b = self.get_patch(patch_b_id)

        if not patch_a or not patch_b:
            return {"error": "Patches not found for commutation."}

        target_a = patch_a.get("changed_req_id")
        target_b = patch_b.get("changed_req_id")

        is_independent = (target_a != target_b) or (target_a is None or target_b is None)

        if is_independent:
            return {
                "can_commute": True,
                "algebra_equation": f"{patch_a['patch_id']} · {patch_b['patch_id']}  ⟷  {patch_b['patch_id']} · {patch_a['patch_id']}",
                "status": "COMMUTATION_SUCCESS",
                "explanation": (
                    f"Patches affect disjoint requirements ({target_a or 'Baseline'} vs {target_b or 'Baseline'}). "
                    "In Darcs Patch Algebra, these patches commute cleanly with 0 merge conflicts. "
                    "A developer can cherry-pick, invert, or reorder them freely without touching ancestor commits!"
                ),
                "darcs_advantage_over_bazaar": (
                    "Bazaar (and Git) treats history as a rigid DAG of snapshots (r1 -> r2). "
                    "Reordering commits requires an interactive rebase with potential false merge conflicts. "
                    "Darcs treats history as a set of commutable patches where independent changes never conflict."
                )
            }
        else:
            return {
                "can_commute": False,
                "algebra_equation": f"{patch_a['patch_id']} · {patch_b['patch_id']}  ⇏  CONFLICT",
                "status": "COMMUTATION_CONFLICT",
                "explanation": (
                    f"Both patches modify the same requirement ({target_a}). "
                    "Darcs detects a mathematical dependency between these patches. "
                    "Commutation requires an explicit conflict-resolution patch."
                ),
                "darcs_advantage_over_bazaar": (
                    "In Bazaar, this triggers a 3-way text merge conflict on files. "
                    "In Darcs, this generates a first-class Conflict Patch that can be reasoned about mathematically."
                )
            }

