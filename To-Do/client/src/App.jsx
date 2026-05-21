import React from "react";
import ReactDOM from "react-dom/client";
const { useState, useEffect, useCallback, useRef } = React;

const API = "http://localhost:5000/api";
const TOK_KEY = "tf_token";
const USR_KEY = "tf_user";

const CATS = ["All","Work","Personal","Health","Learning","Other"];
const PRIS = ["low","medium","high"];
const PRI_COLOR = { low: "#1D9E75", medium: "#BA7517", high: "#993C1D" };
const PRI_BG    = { low: "#E1F5EE", medium: "#FAEEDA", high: "#FAECE7" };

/* ── helpers ─────────────────────────────────────────────────── */
function getToken() { return localStorage.getItem(TOK_KEY); }
function getUser()  { return localStorage.getItem(USR_KEY); }
function saveAuth(token, user) {
  localStorage.setItem(TOK_KEY, token);
  localStorage.setItem(USR_KEY, user);
}
function clearAuth() {
  localStorage.removeItem(TOK_KEY);
  localStorage.removeItem(USR_KEY);
}

async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const isOverdue = t =>
  !t.completed && t.dueDate && new Date(t.dueDate + "T00:00:00") < new Date();

/* ── CheckSVG ────────────────────────────────────────────────── */
const CheckSVG = () => (
  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
    <path d="M1 3.5L3.8 6.5L9 1" stroke="#F5F2EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── TaskForm ────────────────────────────────────────────────── */
function TaskForm({ task, setTask, onSubmit, onCancel, submitLabel, loading, error }) {
  return (
    <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div>
        <div className="label">Title *</div>
        <input placeholder="What needs doing?" value={task.title}
          onChange={e => setTask(t => ({ ...t, title: e.target.value }))} autoFocus />
      </div>
      <div>
        <div className="label">Description</div>
        <textarea placeholder="Optional details…" value={task.description || ""}
          onChange={e => setTask(t => ({ ...t, description: e.target.value }))} />
      </div>
      <div className="form-grid">
        <div>
          <div className="label">Category</div>
          <select value={task.category} onChange={e => setTask(t => ({ ...t, category: e.target.value }))}>
            {CATS.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="label">Priority</div>
          <select value={task.priority} onChange={e => setTask(t => ({ ...t, priority: e.target.value }))}>
            {PRIS.map(p => <option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <div className="label">Due date</div>
          <input type="date" value={task.dueDate || ""}
            onChange={e => setTask(t => ({ ...t, dueDate: e.target.value }))} />
        </div>
      </div>
      {error && <p style={{ color:"var(--red)", fontSize:12 }}>{error}</p>}
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ── AuthScreen ──────────────────────────────────────────────── */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username:"", password:"", confirm:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password) return setError("Please fill in all fields.");
    if (mode === "register") {
      if (form.password.length < 6) return setError("Password must be at least 6 characters.");
      if (form.password !== form.confirm) return setError("Passwords do not match.");
    }
    setLoading(true);
    try {
      const data = await api("/auth/" + mode, {
        method: "POST",
        body: JSON.stringify({ username: form.username.trim(), password: form.password }),
      });
      saveAuth(data.token, data.username);
      onAuth(data.username);
    } catch(err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        {/* brand */}
        <div style={{ marginBottom:"2.5rem", textAlign:"center" }}>
          <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:32, fontWeight:700, letterSpacing:"-1px", color:"var(--text)" }}>
            TaskFlow
          </div>
          <div style={{ marginTop:8, fontSize:12, color:"var(--text-hint)", letterSpacing:".06em", textTransform:"uppercase" }}>
            Personal task manager
          </div>
          <div style={{ width:32, height:2, background:"var(--text)", margin:"16px auto 0" }}/>
        </div>

        {/* tab toggle */}
        <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:3, marginBottom:20, gap:3 }}>
          {["login","register"].map(v => (
            <button key={v} className="btn" onClick={() => { setMode(v); setError(""); setForm({username:"",password:"",confirm:""}); }}
              style={{ flex:1, justifyContent:"center", fontSize:12, letterSpacing:".04em",
                background: v===mode ? "var(--accent)" : "transparent",
                color: v===mode ? "var(--accent-inv)" : "var(--text-muted)",
                border: "none", padding:"8px" }}>
              {v === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* form */}
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <input placeholder="Username" value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            autoComplete="username" />
          <input type="password" placeholder="Password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            autoComplete={mode==="login" ? "current-password" : "new-password"} />
          {mode === "register" &&
            <input type="password" placeholder="Confirm password" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              autoComplete="new-password" />}
          {error && <p style={{ color:"var(--red)", fontSize:12 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ marginTop:4, justifyContent:"center", fontSize:13 }}>
            {loading ? "Please wait…" : (mode==="login" ? "Sign in" : "Create account")}
          </button>
        </form>

        <p style={{ textAlign:"center", color:"var(--text-hint)", fontSize:11, marginTop:24, letterSpacing:".03em" }}>
          Data saved to your server's SQLite database
        </p>
      </div>
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(getUser);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ category:"All", priority:"all", status:"all", search:"" });
  const [sortBy, setSortBy] = useState("created");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [newTask, setNewTask]  = useState({ title:"", description:"", category:"Personal", priority:"medium", dueDate:"" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const toast$ = useCallback((msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await api("/tasks");
      setTasks(data);
    } catch(err) {
      if (err.message.includes("token") || err.message.includes("Token")) {
        clearAuth(); setUser(null);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { if (user) loadTasks(); }, [user]);

  function logout() { clearAuth(); setUser(null); setTasks([]); }

  async function addTask(e) {
    e.preventDefault();
    if (!newTask.title.trim()) return setFormError("Title is required.");
    setFormLoading(true); setFormError("");
    try {
      const t = await api("/tasks", { method:"POST", body: JSON.stringify(newTask) });
      setTasks(ts => [t, ...ts]);
      setNewTask({ title:"", description:"", category:"Personal", priority:"medium", dueDate:"" });
      setShowAdd(false);
      toast$("Task added ✓");
    } catch(err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function updateTask(e) {
    e.preventDefault();
    if (!editing.title.trim()) return setFormError("Title is required.");
    setFormLoading(true); setFormError("");
    try {
      const updated = await api(`/tasks/${editing.id}`, { method:"PUT", body: JSON.stringify({
        title: editing.title, description: editing.description,
        category: editing.category, priority: editing.priority, dueDate: editing.dueDate,
      })});
      setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
      setEditing(null);
      toast$("Task updated");
    } catch(err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  }

  async function toggleComplete(task) {
    try {
      const updated = await api(`/tasks/${task.id}`, {
        method:"PUT", body: JSON.stringify({ completed: !task.completed }),
      });
      setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
      toast$(updated.completed ? "Completed ✓" : "Marked active");
    } catch(err) { toast$(err.message, "err"); }
  }

  async function deleteTask(id) {
    try {
      await api(`/tasks/${id}`, { method:"DELETE" });
      setTasks(ts => ts.filter(t => t.id !== id));
      setDeleting(null);
      toast$("Task deleted", "err");
    } catch(err) { toast$(err.message, "err"); }
  }

  async function clearCompleted() {
    try {
      const { deleted } = await api("/tasks/completed", { method:"DELETE" });
      setTasks(ts => ts.filter(t => !t.completed));
      toast$(`${deleted} task${deleted!==1?"s":""} cleared`);
    } catch(err) { toast$(err.message, "err"); }
  }

  if (!user) return <AuthScreen onAuth={u => { setUser(u); }} />;

  /* ── filtered + sorted ── */
  const visible = tasks
    .filter(t => {
      if (filter.category !== "All" && t.category !== filter.category) return false;
      if (filter.priority !== "all" && t.priority !== filter.priority) return false;
      if (filter.status === "active" && t.completed) return false;
      if (filter.status === "done"   && !t.completed) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.description||"").toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a,b) => {
      if (sortBy === "created")  return b.createdAt - a.createdAt;
      if (sortBy === "priority") return PRIS.indexOf(b.priority) - PRIS.indexOf(a.priority);
      if (sortBy === "due")      return (a.dueDate||"9999") < (b.dueDate||"9999") ? -1 : 1;
      if (sortBy === "alpha")    return a.title.localeCompare(b.title);
      return 0;
    });

  const stats = {
    total: tasks.length,
    done:  tasks.filter(t => t.completed).length,
    rem:   tasks.filter(t => !t.completed).length,
    over:  tasks.filter(isOverdue).length,
  };

  const Divider = () => <div className="div-v" style={{ alignSelf:"stretch" }}/>;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>

      {/* header */}
      <header style={{ background:"var(--text)", padding:"0 2rem", height:54,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:50 }}>
        <span style={{ fontFamily:"'Libre Baskerville', serif", fontSize:20, fontWeight:700,
          color:"var(--accent-inv)", letterSpacing:"-0.5px" }}>
          TaskFlow
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <span style={{ fontSize:12, color:"rgba(245,242,235,.5)", fontFamily:"'DM Mono', monospace" }}>
            <span style={{ color:"rgba(245,242,235,.8)" }}>{user}</span>
          </span>
          <button className="btn btn-ghost" onClick={logout}
            style={{ fontSize:12, padding:"6px 12px", color:"rgba(245,242,235,.6)",
              borderColor:"rgba(245,242,235,.2)" }}>
            Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth:800, margin:"0 auto", padding:"2rem 1.5rem 5rem" }}>

        {/* stats */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
          {[
            { label:"Total",     val: stats.total, color:"var(--text)" },
            { label:"Completed", val: stats.done,  color:"var(--green)" },
            { label:"Remaining", val: stats.rem,   color:"var(--amber)" },
            { label:"Overdue",   val: stats.over,  color: stats.over>0 ? "var(--red)" : "var(--text-hint)" },
          ].map(s => (
            <div key={s.label} className="stat">
              <div className="label">{s.label}</div>
              <div style={{ fontSize:30, fontFamily:"'Libre Baskerville', serif", fontWeight:700, color:s.color }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {/* toolbar */}
        <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
          <input placeholder="Search…" value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            style={{ flex:1, minWidth:140 }}/>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width:"auto" }}>
            <option value="created">Newest</option>
            <option value="priority">Priority</option>
            <option value="due">Due date</option>
            <option value="alpha">A → Z</option>
          </select>
          <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(""); }}
            style={{ whiteSpace:"nowrap" }}>
            + Add task
          </button>
        </div>

        {/* filter pills */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
          {["all","active","done"].map(s => (
            <button key={s} className={`pill${filter.status===s?" on":""}`}
              onClick={() => setFilter(f => ({ ...f, status:s }))}>
              {s==="all"?"All":s==="active"?"Active":"Done"}
            </button>
          ))}
          <Divider/>
          {["all",...PRIS].map(p => (
            <button key={p} className={`pill${filter.priority===p?" on":""}`}
              onClick={() => setFilter(f => ({ ...f, priority:p }))}>
              {p==="all"?"All pri":p}
            </button>
          ))}
          <Divider/>
          {CATS.map(c => (
            <button key={c} className={`pill${filter.category===c?" on":""}`}
              onClick={() => setFilter(f => ({ ...f, category:c }))}>
              {c}
            </button>
          ))}
        </div>

        {/* task list */}
        {loading ? (
          <p style={{ color:"var(--text-hint)", textAlign:"center", padding:"3rem" }}>Loading…</p>
        ) : visible.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem 2rem", color:"var(--text-hint)" }}>
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:36, marginBottom:12 }}>
              {tasks.length===0 ? "✦" : "∅"}
            </div>
            <div style={{ fontSize:16, color:"var(--text-muted)", marginBottom:6 }}>
              {tasks.length===0 ? "No tasks yet" : "Nothing matches"}
            </div>
            <div style={{ fontSize:13 }}>
              {tasks.length===0 ? "Add your first task above." : "Try adjusting your filters."}
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {visible.map(task => (
              <div key={task.id}
                className={`card${task.completed?" done":""}${isOverdue(task)?" overdue":""}`}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  {/* checkbox */}
                  <button className={`chk${task.completed?" checked":""}`}
                    onClick={() => toggleComplete(task)} aria-label="Toggle complete">
                    {task.completed && <CheckSVG/>}
                  </button>

                  {/* content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:6, marginBottom: task.description?6:0 }}>
                      <span style={{ fontWeight:500, fontSize:14, color:"var(--text)",
                        textDecoration: task.completed?"line-through":"none", wordBreak:"break-word" }}>
                        {task.title}
                      </span>
                      <span className="badge"
                        style={{ background:PRI_BG[task.priority], color:PRI_COLOR[task.priority] }}>
                        {task.priority}
                      </span>
                      <span className="badge"
                        style={{ background:"var(--bg)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>
                        {task.category}
                      </span>
                      {isOverdue(task) &&
                        <span className="badge" style={{ background:"var(--red-bg)", color:"var(--red)" }}>
                          overdue
                        </span>}
                    </div>
                    {task.description &&
                      <p style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.55, marginBottom:6 }}>
                        {task.description}
                      </p>}
                    <div style={{ fontSize:11, color:"var(--text-hint)", display:"flex", gap:14 }}>
                      {task.dueDate &&
                        <span>due {new Date(task.dueDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>}
                      <span>added {new Date(task.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                    </div>
                  </div>

                  {/* actions */}
                  <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                    <button className="ibtn" aria-label="Edit"
                      onClick={() => { setEditing({...task}); setFormError(""); }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="ibtn del" aria-label="Delete"
                      onClick={() => setDeleting(task)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* clear completed */}
        {stats.done > 0 && (
          <div style={{ marginTop:24, textAlign:"center" }}>
            <button className="btn btn-ghost" onClick={clearCompleted}
              style={{ fontSize:12, color:"var(--text-hint)" }}>
              Clear {stats.done} completed task{stats.done!==1?"s":""}
            </button>
          </div>
        )}
      </main>

      {/* ── Add modal ── */}
      {showAdd && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:18, fontWeight:700, marginBottom:18, color:"var(--text)" }}>
              New task
            </div>
            <TaskForm task={newTask} setTask={setNewTask}
              onSubmit={addTask} onCancel={() => { setShowAdd(false); setFormError(""); }}
              submitLabel="Add task" loading={formLoading} error={formError}/>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editing && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:18, fontWeight:700, marginBottom:18, color:"var(--text)" }}>
              Edit task
            </div>
            <TaskForm task={editing} setTask={setEditing}
              onSubmit={updateTask} onCancel={() => { setEditing(null); setFormError(""); }}
              submitLabel="Save changes" loading={formLoading} error={formError}/>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleting && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setDeleting(null)}>
          <div className="modal" style={{ maxWidth:360, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>⚠</div>
            <div style={{ fontFamily:"'Libre Baskerville', serif", fontSize:18, fontWeight:700, marginBottom:8 }}>
              Delete task?
            </div>
            <p style={{ color:"var(--text-muted)", fontSize:13, marginBottom:20 }}>
              "{deleting.title}" will be permanently removed.
            </p>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteTask(deleting.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && <div className={`toast${toast.type==="err"?" err":""}`}>{toast.msg}</div>}
    </div>
  );
}
