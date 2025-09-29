import { requireSession, wireSignOut } from "./auth_guard_v58.js";
import supabase from "./supabase_client_v58.js";
import { OutputPanel } from "./output_panel_v1.js";

/**
 * Manager dashboard controller (v60)
 * - Enforces "manager" access (admins can view via guard rules)
 * - Approvals list rendered into the unified Output Panel
 * - Approve/Reject via RPCs (security definer on the DB)
 */

await requireSession("manager");
wireSignOut();

/* ---------- Data fetchers ---------- */

async function fetchApplicants(){
  const { data, error } = await supabase.rpc("manager_list_applicants");
  if (error){
    return {
      ok:false,
      html:`<p class="op-muted">Error loading applicants: ${escapeHtml(error.message)}</p>`
    };
  }
  if (!data || !data.length){
    return { ok:true, html:`<p class="op-muted">No pending applicants.</p>` };
  }

  const rows = data.map(r=>`
    <tr>
      <td>${escapeHtml(r.email||"")}</td>
      <td>${escapeHtml(r.role||"")}</td>
      <td>${escapeHtml(r.status||"")}</td>
      <td>${r.created_at ? new Date(r.created_at).toLocaleString() : ""}</td>
      <td>
        <button data-approve="${r.id}" class="btn">Approve</button>
        <button data-reject="${r.id}" class="btn ghost">Reject</button>
      </td>
    </tr>
  `).join("");

  const html = `
    <div style="overflow:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:.6rem" class="op-muted">
      Only <strong>Manager</strong> can approve/reject. Admins can view.
    </div>
  `;
  return { ok:true, html };
}

async function approve(applicantId, targetRole="lsp"){
  const { error } = await supabase.rpc("manager_approve", {
    applicant_id: applicantId,
    target_role : targetRole
  });
  if (error) return `Error: ${error.message}`;
  return "Approved.";
}

async function reject(applicantId){
  const { error } = await supabase.rpc("manager_reject", { applicant_id: applicantId });
  if (error) return `Error: ${error.message}`;
  return "Rejected.";
}

/* ---------- UI wiring ---------- */

async function openApprovals(){
  OutputPanel.set({ title:"Approvals", html:`<div class="op-muted">Loading…</div>` });

  const res = await fetchApplicants();
  OutputPanel.set({ title:"Approvals", html: res.html });

  const body = document.querySelector("#opBody");
  if (!body) return;

  // Delegate click events for Approve/Reject buttons inside the panel
  body.addEventListener("click", async (e)=>{
    const approveBtn = e.target.closest("[data-approve]");
    const rejectBtn  = e.target.closest("[data-reject]");

    if (approveBtn){
      const id = approveBtn.getAttribute("data-approve");
      approveBtn.disabled = true; approveBtn.textContent = "…";
      await approve(id);
      await openApprovals(); // refresh list
    } else if (rejectBtn){
      const id = rejectBtn.getAttribute("data-reject");
      rejectBtn.disabled = true; rejectBtn.textContent = "…";
      await reject(id);
      await openApprovals(); // refresh list
    }
  }, { once:true });
}

/* ---------- Helpers ---------- */

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

/* ---------- Entry ---------- */

document.getElementById("btnOpenApprovals")?.addEventListener("click", openApprovals);

// You can add more card handlers here as needed, e.g.:
// document.querySelector('.cards .card h3:contains("LSP Hours (All)")')...
