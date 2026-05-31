import React from "react";
const { useState, useEffect, useCallback } = React;

const API = "http://localhost:5000/api";
const TOK_KEY = "tf_token";
const USR_KEY = "tf_user";

const CATS = ["All","Work","Personal","Health","Learning","Other"];
const PRIS = ["low","medium","high"];

const PRI_COLOR = { low: "#34d399", medium: "#fbbf24", high: "#f87171" };
const PRI_BG    = { low: "rgba(52,211,153,.12)", medium: "rgba(251,191,36,.12)", high: "rgba(248,113,113,.12)" };

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

const CheckSVG = () => (
  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
    <path d="M1 3.5L3.8 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── TaskForm ────────────────────────────────────────────────── */
function TaskForm({ task, setTask, onSubmit, onCancel, submitLabel, loading, error }) {
  return (
    <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div>
        <div className="label">Title *</div>
        <input placeholder="What needs to be done?" value={task.title}
          onChange={e => setTask(t => ({ ...t, title: e.target.value }))} autoFocus />
      </div>
      <div>
        <div className="label">Description</div>
        <textarea placeholder="Add some details (optional)…" value={task.description || ""}
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
      {error && <p style={{ color:"var(--red)", fontSize:12, marginTop:-4 }}>{error}</p>}
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", paddingTop:4, borderTop:"1px solid var(--border)", marginTop:4 }}>
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
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      padding:"2rem", background:"var(--bg)",
      backgroundImage:"radial-gradient(ellipse 60% 50% at 50% -10%, rgba(124,106,247,.12), transparent)"
    }}>
      <div style={{ width:"100%", maxWidth:360 }}>
        {/* Brand */}
        <div style={{ marginBottom:"2.5rem", textAlign:"center" }}>
          <div style={{
            fontFamily:"'Instrument Serif', serif", fontSize:42, fontWeight:400,
            color:"var(--text)", letterSpacing:"-1px", lineHeight:1
          }}>
            To-Do Application
          </div>
          <div style={{ marginTop:10, fontSize:11, color:"var(--text-hint)", letterSpacing:".12em", textTransform:"uppercase", fontWeight:600 }}>
            Personal task manager
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:14, padding:28, boxShadow:"0 8px 40px rgba(0,0,0,.4)"
        }}>
          {/* Tab toggle */}
          <div style={{ display:"flex", background:"var(--bg2)", borderRadius:8, padding:3, marginBottom:22, gap:3 }}>
            {["login","register"].map(v => (
              <button key={v} onClick={() => { setMode(v); setError(""); setForm({username:"",password:"",confirm:""}); }}
                style={{
                  flex:1, padding:"8px", border:"none", borderRadius:6, cursor:"pointer",
                  fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".06em",
                  textTransform:"uppercase", transition:"all .18s",
                  background: v===mode ? "var(--accent)" : "transparent",
                  color: v===mode ? "#fff" : "var(--text-hint)",
                  boxShadow: v===mode ? "0 2px 8px var(--accent-glow)" : "none"
                }}>
                {v === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <div className="label">Username</div>
              <input placeholder="your_username" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username" />
            </div>
            <div>
              <div className="label">Password</div>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete={mode==="login" ? "current-password" : "new-password"} />
            </div>
            {mode === "register" && (
              <div>
                <div className="label">Confirm password</div>
                <input type="password" placeholder="••••••••" value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  autoComplete="new-password" />
              </div>
            )}
            {error && <p style={{ color:"var(--red)", fontSize:12 }}>{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ marginTop:6, justifyContent:"center", width:"100%", padding:"10px" }}>
              {loading ? "Please wait…" : (mode==="login" ? "Sign In" : "Create Account")}
            </button>
          </form>
        </div>

      
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
      toast$("Task updated ✓");
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
      const { deleted } = await api("/tasks/completed/all", { method:"DELETE" });
      setTasks(ts => ts.filter(t => !t.completed));
      toast$(`${deleted} task${deleted!==1?"s":""} cleared`);
    } catch(err) { toast$(err.message, "err"); }
  }

  if (!user) return <AuthScreen onAuth={u => setUser(u)} />;

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

      {/* ── Header ── */}
      <header style={{
        background:"var(--bg2)", borderBottom:"1px solid var(--border)",
        padding:"0 2rem", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:50,
        backdropFilter:"blur(10px)"
      }}>
        <span style={{
          fontFamily:"'Instrument Serif', serif", fontSize:22, fontWeight:400,
          color:"var(--text)", letterSpacing:"-0.3px"
        }}>
          To-Do Application
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:11, color:"var(--text-hint)", fontFamily:"'JetBrains Mono', monospace", letterSpacing:".03em" }}>
            {user}
          </span>
          <button className="btn btn-ghost" onClick={logout}
            style={{ fontSize:10, padding:"5px 12px", letterSpacing:".08em" }}>
            Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth:820, margin:"0 auto", padding:"2rem 1.5rem 6rem" }}>

        {/* ── Stats ── */}
        <div style={{ display:"flex", gap:10, marginBottom:28, flexWrap:"wrap" }}>
          {[
            { label:"Total",     val: stats.total, color:"var(--text)",  sub: "tasks" },
            { label:"Done",      val: stats.done,  color:"var(--green)", sub: "completed" },
            { label:"Remaining", val: stats.rem,   color:"var(--amber)", sub: "active" },
            { label:"Overdue",   val: stats.over,  color: stats.over>0 ? "var(--red)" : "var(--text-hint)", sub: "overdue" },
          ].map(s => (
            <div key={s.label} className="stat" style={{ flex:"1 1 80px" }}>
              <div className="label">{s.label}</div>
              <div style={{ fontSize:32, fontFamily:"'Instrument Serif', serif", color:s.color, lineHeight:1.1, marginTop:2 }}>
                {s.val}
              </div>
              <div style={{ fontSize:10, color:"var(--text-hint)", marginTop:3, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ position:"relative", flex:1, minWidth:160 }}>
            <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"var(--text-hint)" }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input placeholder="Search tasks…" value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
              style={{ paddingLeft:30 }}/>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width:"auto", minWidth:120 }}>
            <option value="created">Newest first</option>
            <option value="priority">By priority</option>
            <option value="due">By due date</option>
            <option value="alpha">Alphabetical</option>
          </select>
          <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(""); }}
            style={{ whiteSpace:"nowrap", gap:5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add Task
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:22, alignItems:"center" }}>
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

        {/* ── Task list ── */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"4rem", color:"var(--text-hint)" }}>
            <div style={{ fontSize:12, letterSpacing:".1em", textTransform:"uppercase", fontWeight:600 }}>Loading…</div>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign:"center", padding:"5rem 2rem", color:"var(--text-hint)" }}>
            <div style={{ fontFamily:"'Instrument Serif', serif", fontSize:48, marginBottom:12, opacity:.3 }}>
              {tasks.length===0 ? "✦" : "∅"}
            </div>
            <div style={{ fontSize:14, color:"var(--text-muted)", marginBottom:6, fontWeight:600 }}>
              {tasks.length===0 ? "No tasks yet" : "Nothing matches"}
            </div>
            <div style={{ fontSize:12, color:"var(--text-hint)" }}>
              {tasks.length===0 ? "Add your first task to get started." : "Try adjusting your filters."}
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {visible.map(task => (
              <div key={task.id} className={`card${task.completed?" done":""}${isOverdue(task)?" overdue":""}`}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  {/* Checkbox */}
                  <button className={`chk${task.completed?" checked":""}`}
                    onClick={() => toggleComplete(task)} aria-label="Toggle complete">
                    {task.completed && <CheckSVG/>}
                  </button>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:5, marginBottom: task.description?5:0 }}>
                      <span style={{
                        fontWeight:600, fontSize:13.5, color:"var(--text)",
                        textDecoration: task.completed?"line-through":"none",
                        wordBreak:"break-word", opacity: task.completed ? .6 : 1
                      }}>
                        {task.title}
                      </span>
                      <span className="badge" style={{ background:PRI_BG[task.priority], color:PRI_COLOR[task.priority] }}>
                        {task.priority}
                      </span>
                      <span className="badge" style={{ background:"var(--surface2)", color:"var(--text-muted)" }}>
                        {task.category}
                      </span>
                      {isOverdue(task) &&
                        <span className="badge" style={{ background:"var(--red-bg)", color:"var(--red)" }}>
                          overdue
                        </span>}
                    </div>
                    {task.description &&
                      <p style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:6 }}>
                        {task.description}
                      </p>}
                    <div style={{ fontSize:11, color:"var(--text-hint)", display:"flex", gap:14, fontFamily:"'JetBrains Mono', monospace" }}>
                      {task.dueDate &&
                        <span>due {new Date(task.dueDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>}
                      <span>added {new Date(task.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                    <button className="ibtn" aria-label="Edit"
                      onClick={() => { setEditing({...task}); setFormError(""); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="ibtn del" aria-label="Delete"
                      onClick={() => setDeleting(task)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clear completed */}
        {stats.done > 0 && (
          <div style={{ marginTop:20, textAlign:"center" }}>
            <button className="btn btn-ghost" onClick={clearCompleted}
              style={{ fontSize:11, color:"var(--text-hint)" }}>
              Clear {stats.done} completed task{stats.done!==1?"s":""}
            </button>
          </div>
        )}
      </main>

      {/* ── Add modal ── */}
      {showAdd && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:"'Instrument Serif', serif", fontSize:22, color:"var(--text)" }}>New Task</div>
              <div style={{ fontSize:11, color:"var(--text-hint)", marginTop:3 }}>Fill in the details below</div>
            </div>
            <TaskForm task={newTask} setTask={setNewTask}
              onSubmit={addTask} onCancel={() => { setShowAdd(false); setFormError(""); }}
              submitLabel="Add Task" loading={formLoading} error={formError}/>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editing && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:"'Instrument Serif', serif", fontSize:22, color:"var(--text)" }}>Edit Task</div>
              <div style={{ fontSize:11, color:"var(--text-hint)", marginTop:3 }}>Update the task details</div>
            </div>
            <TaskForm task={editing} setTask={setEditing}
              onSubmit={updateTask} onCancel={() => { setEditing(null); setFormError(""); }}
              submitLabel="Save Changes" loading={formLoading} error={formError}/>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleting && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setDeleting(null)}>
          <div className="modal" style={{ maxWidth:380, textAlign:"center" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--red-bg)", border:"1px solid var(--red)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <div style={{ fontFamily:"'Instrument Serif', serif", fontSize:20, marginBottom:8, color:"var(--text)" }}>
              Delete task?
            </div>
            <p style={{ color:"var(--text-muted)", fontSize:13, marginBottom:24, lineHeight:1.5 }}>
              <span style={{ color:"var(--text)", fontWeight:600 }}>"{deleting.title}"</span> will be permanently removed.
            </p>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteTask(deleting.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast${toast.type==="err"?" err":""}`}>{toast.msg}</div>}
    </div>
  );
}