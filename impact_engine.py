from collections import deque

class ImpactAnalysisEngine:
    """
    Graph-based Requirement Change Impact Analyzer Engine.
    Traces dependencies between Requirements, Design Artifacts, Code Files, DB Schemas, and Test Cases.
    Calculates direct and indirect impact propagation, risk scores, and affected test suites.
    """
    def __init__(self, trace_links=None, artifacts=None):
        self.trace_links = trace_links or []
        self.artifacts = artifacts or {}
        self._build_graph()

    def update_data(self, trace_links, artifacts):
        self.trace_links = trace_links
        self.artifacts = artifacts
        self._build_graph()

    def _build_graph(self):
        """Construct forward impact graph for change ripple propagation."""
        self.adj = {}
        self.reverse_adj = {}
        
        for art_id in self.artifacts:
            self.adj[art_id] = set()
            self.reverse_adj[art_id] = set()

        req_ids = {a for a in self.artifacts if a.startswith("REQ-") or self.artifacts[a].get("type") == "REQUIREMENT"}

        for link in self.trace_links:
            source = link.get("source")
            target = link.get("target")
            link_type = link.get("type", "DEPENDS_ON")
            
            if source not in self.adj:
                self.adj[source] = set()
            if target not in self.adj:
                self.adj[target] = set()
            if source not in self.reverse_adj:
                self.reverse_adj[source] = set()
            if target not in self.reverse_adj:
                self.reverse_adj[target] = set()
                
            # Requirement-to-Requirement dependency:
            # If source depends on target (e.g. Cart REQ-103 REQUIRES_AUTH Auth REQ-101),
            # modifying target (REQ-101) propagates impact downstream to source (REQ-103).
            if source in req_ids and target in req_ids:
                self.adj[target].add((source, f"RIPPLES_TO_{link_type}"))
                self.reverse_adj[source].add((target, link_type))
            elif source in req_ids:
                # Requirement impacts technical artifact (Code, DB, Test, Design)
                self.adj[source].add((target, link_type))
                self.reverse_adj[target].add((source, "VERIFIES_OR_IMPLEMENTS"))
            elif target in req_ids:
                # Technical artifact tied to requirement
                self.adj[target].add((source, link_type))
                self.reverse_adj[source].add((target, "TIED_TO"))
            else:
                self.adj[source].add((target, link_type))
                self.adj[target].add((source, "CONNECTED_TO"))

    def analyze_change(self, target_req_id, proposed_change_description=None, change_severity="MEDIUM"):
        """
        Analyze the impact of changing a specific requirement.
        Returns direct impacts, indirect impacts, impacted test suites, risk score, and graph viz data.
        """
        if target_req_id and ":" in target_req_id:
            target_req_id = target_req_id.split(":")[0].strip()

        if target_req_id not in self.artifacts:
            return {"error": f"Requirement '{target_req_id}' not found in artifact database."}

        visited = {}
        queue = deque([(target_req_id, 0)])  # (artifact_id, distance)
        visited[target_req_id] = 0

        impact_tree = []
        direct_impacts = []
        indirect_impacts = []
        affected_requirements = []
        affected_test_cases = []
        affected_code_files = []
        affected_db_schemas = []
        affected_design_docs = []

        # Track predecessors for path reconstruction
        parent_map = {target_req_id: None}

        while queue:
            curr_id, dist = queue.popleft()
            curr_art = self.artifacts.get(curr_id, {
                "id": curr_id,
                "name": curr_id,
                "type": "UNKNOWN",
                "criticality": "MEDIUM"
            })

            impact_entry = {
                "id": curr_id,
                "name": curr_art.get("name", curr_id),
                "type": curr_art.get("type", "CODE"),
                "criticality": curr_art.get("criticality", "MEDIUM"),
                "path": curr_art.get("path", ""),
                "distance": dist,
                "impact_level": "ORIGIN" if dist == 0 else ("DIRECT" if dist == 1 else "INDIRECT")
            }

            if dist > 0:
                impact_tree.append(impact_entry)
                if dist == 1:
                    direct_impacts.append(impact_entry)
                else:
                    indirect_impacts.append(impact_entry)

                # Categorize by artifact type
                art_type = curr_art.get("type", "").upper()
                if curr_id.startswith("REQ-") or art_type == "REQUIREMENT":
                    affected_requirements.append(impact_entry)
                elif "TEST" in art_type or curr_id.startswith("TEST-"):
                    affected_test_cases.append(impact_entry)
                elif "CODE" in art_type or curr_id.startswith("CODE-") or ".py" in curr_art.get("path", ""):
                    affected_code_files.append(impact_entry)
                elif "DB" in art_type or "SCHEMA" in art_type or curr_id.startswith("DB-"):
                    affected_db_schemas.append(impact_entry)
                elif "DESIGN" in art_type or "ARCH" in art_type or curr_id.startswith("ARCH-"):
                    affected_design_docs.append(impact_entry)

            # Traverse neighbors
            for neighbor, link_type in self.adj.get(curr_id, []):
                if neighbor not in visited:
                    visited[neighbor] = dist + 1
                    parent_map[neighbor] = curr_id
                    queue.append((neighbor, dist + 1))

        # Dynamic Risk Assessment Scoring:
        # 1. Scope percentage of total repository affected
        # 2. Criticality weights of impacted components
        # 3. Downstream requirements ripple penalty
        # 4. Proposed change scope/severity multiplier (HIGH, MEDIUM, LOW)
        total_artifacts_count = max(1, len(self.artifacts))
        scope_pct = (len(impact_tree) / total_artifacts_count) * 65.0
        crit_weights = {"CRITICAL": 12, "HIGH": 8, "MEDIUM": 5, "LOW": 2}
        crit_score = sum(crit_weights.get(item["criticality"], 5) for item in impact_tree)
        crit_factor = min(18.0, crit_score / 4.5)
        req_ripple_bonus = len(affected_requirements) * 4.5
        sev_multiplier = {"HIGH": 1.25, "MEDIUM": 1.0, "LOW": 0.75}.get(change_severity.upper(), 1.0)

        raw_score = int((scope_pct + crit_factor + req_ripple_bonus) * sev_multiplier)
        risk_score = min(98, max(12, raw_score))

        if risk_score >= 75:
            risk_category = "CRITICAL"
            recommendation = "High risk change! Multi-requirement propagation detected. Comprehensive regression testing and peer review required before merging in Bazaar."
        elif risk_score >= 50:
            risk_category = "HIGH"
            recommendation = "Significant impact. Downstream requirements affected. Update design documentation and verify linked test suites."
        elif risk_score >= 30:
            risk_category = "MEDIUM"
            recommendation = "Moderate impact. Component-level implementation and linked test suites must be verified."
        else:
            risk_category = "LOW"
            recommendation = "Low impact change. Isolated modification with minimal downstream ripple."

        # Build Full Graph Data for Visual Canvas
        nodes = []
        edges = []
        added_edges = set()

        for art_id, dist in visited.items():
            art = self.artifacts.get(art_id, {"name": art_id, "type": "UNKNOWN"})
            nodes.append({
                "id": art_id,
                "label": f"{art_id}: {art.get('name', art_id)}",
                "type": art.get("type", "CODE"),
                "distance": dist,
                "is_target": (art_id == target_req_id),
                "criticality": art.get("criticality", "MEDIUM")
            })

        for src in visited:
            for tgt, link_type in self.adj.get(src, []):
                if tgt in visited:
                    edge_key = tuple(sorted([src, tgt]))
                    if edge_key not in added_edges:
                        added_edges.add(edge_key)
                        edges.append({
                            "source": src,
                            "target": tgt,
                            "label": link_type
                        })

        # Build Dedicated Requirement-to-Requirement Dependency Graph (Req-to-Req Flow)
        all_req_ids = [aid for aid in self.artifacts if aid.startswith("REQ-") or self.artifacts[aid].get("type") == "REQUIREMENT"]
        req_nodes = []
        for req_id in all_req_ids:
            art = self.artifacts.get(req_id, {})
            dist = visited.get(req_id, None)
            is_target = (req_id == target_req_id)
            if is_target:
                impact_level = "ORIGIN"
            elif dist == 1:
                impact_level = "DIRECT"
            elif dist and dist > 1:
                impact_level = "INDIRECT"
            else:
                impact_level = "UNAFFECTED"

            req_nodes.append({
                "id": req_id,
                "name": art.get("name", req_id),
                "label": f"{req_id}: {art.get('name', req_id)}",
                "type": "REQUIREMENT",
                "distance": dist if dist is not None else -1,
                "is_target": is_target,
                "impact_level": impact_level,
                "criticality": art.get("criticality", "HIGH")
            })

        # Identify requirement-to-requirement links from trace_links
        req_edges = []
        for link in self.trace_links:
            src = link.get("source")
            tgt = link.get("target")
            l_type = link.get("type", "DEPENDS_ON")
            if (src in all_req_ids) and (tgt in all_req_ids):
                # Is this edge part of active propagation?
                is_active = (src in visited and tgt in visited)
                req_edges.append({
                    "source": src,
                    "target": tgt,
                    "label": l_type,
                    "is_active_propagation": is_active
                })

        # Build Step-by-Step Requirement Propagation Cascade
        # Group requirements by distance from target
        req_propagation_steps = []
        # Step 0: Origin
        target_art = self.artifacts.get(target_req_id, {})
        req_propagation_steps.append({
            "hop": 0,
            "stage": "Origin of Requirement Change",
            "requirement_id": target_req_id,
            "requirement_name": target_art.get("name", target_req_id),
            "propagation_type": "ORIGIN",
            "impact_reason": f"Baseline requirement changed: {proposed_change_description or 'Scope/Logic modification'}"
        })

        # Hops 1, 2, 3...
        sorted_affected_reqs = sorted(affected_requirements, key=lambda x: x["distance"])
        for req in sorted_affected_reqs:
            rid = req["id"]
            hop = req["distance"]
            # Find which link connected it
            rel_label = "DEPENDENCY_LINK"
            for edge in req_edges:
                if (edge["source"] == rid and edge["target"] in visited) or (edge["target"] == rid and edge["source"] in visited):
                    rel_label = edge["label"]
                    break

            req_propagation_steps.append({
                "hop": hop,
                "stage": f"Hop {hop} ({'Direct' if hop == 1 else 'Indirect Ripple'})",
                "requirement_id": rid,
                "requirement_name": req["name"],
                "propagation_type": req["impact_level"],
                "impact_reason": f"Propagated via '{rel_label}' link from upstream requirements"
            })

        # ── Smart Test Pruning (Dynamic Test Suite Selection & Optimization) ──
        all_test_artifacts = [
            (aid, a) for aid, a in self.artifacts.items() 
            if a.get("type") == "TEST" or aid.startswith("TEST-")
        ]
        
        selected_test_ids = {t["id"] for t in affected_test_cases}
        selected_tests = []
        skipped_tests = []
        
        total_repo_tests = 0
        total_repo_duration = 0
        pruned_selected_tests_count = 0
        pruned_selected_duration = 0
        
        for tid, tart in all_test_artifacts:
            t_count = tart.get("test_count", 25)
            t_dur = tart.get("duration_sec", 15)
            total_repo_tests += t_count
            total_repo_duration += t_dur
            
            t_info = {
                "id": tid,
                "name": tart.get("name", tid),
                "path": tart.get("path", ""),
                "test_count": t_count,
                "duration_sec": t_dur,
                "criticality": tart.get("criticality", "MEDIUM")
            }
            
            if tid in selected_test_ids:
                pruned_selected_tests_count += t_count
                pruned_selected_duration += t_dur
                entry = next((item for item in affected_test_cases if item["id"] == tid), None)
                t_info["selection_reason"] = f"Directly verifies impacted component (Hop {entry['distance'] if entry else 1})"
                t_info["status"] = "MUST_EXECUTE"
                selected_tests.append(t_info)
            else:
                t_info["skip_reason"] = "Safely pruned — zero dependency link to modified requirement"
                t_info["status"] = "SAFELY_SKIPPED"
                skipped_tests.append(t_info)
                
        time_saved_sec = max(0, total_repo_duration - pruned_selected_duration)
        time_saved_pct = round((time_saved_sec / max(1, total_repo_duration)) * 100, 1)
        tests_skipped_count = total_repo_tests - pruned_selected_tests_count
        
        test_pruning_report = {
            "total_test_suites_in_repo": len(all_test_artifacts),
            "selected_test_suites_count": len(selected_tests),
            "skipped_test_suites_count": len(skipped_tests),
            "total_test_cases": total_repo_tests,
            "selected_test_cases": pruned_selected_tests_count,
            "skipped_test_cases": tests_skipped_count,
            "full_suite_duration_sec": total_repo_duration,
            "pruned_suite_duration_sec": pruned_selected_duration,
            "time_saved_sec": time_saved_sec,
            "time_saved_percent": time_saved_pct,
            "efficiency_gain": f"{round(total_repo_duration / max(1, pruned_selected_duration), 1)}x faster",
            "selected_tests": selected_tests,
            "skipped_tests": skipped_tests
        }

        return {
            "target_req": target_req_id,
            "change_description": proposed_change_description,
            "change_severity": change_severity,
            "summary": {
                "total_affected_artifacts": len(impact_tree),
                "affected_requirement_count": len(affected_requirements),
                "direct_impact_count": len(direct_impacts),
                "indirect_impact_count": len(indirect_impacts),
                "affected_code_count": len(affected_code_files),
                "affected_test_count": len(affected_test_cases),
                "affected_db_count": len(affected_db_schemas),
                "risk_score": risk_score,
                "risk_category": risk_category,
                "recommendation": recommendation
            },
            "affected_requirements": affected_requirements,
            "direct_impacts": direct_impacts,
            "indirect_impacts": indirect_impacts,
            "affected_test_cases": affected_test_cases,
            "affected_code_files": affected_code_files,
            "affected_db_schemas": affected_db_schemas,
            "affected_design_docs": affected_design_docs,
            "graph": {
                "nodes": nodes,
                "edges": edges
            },
            "req_graph": {
                "nodes": req_nodes,
                "edges": req_edges
            },
            "req_propagation_steps": req_propagation_steps,
            "test_pruning": test_pruning_report
        }
