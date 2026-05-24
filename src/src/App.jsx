import { useState, useRef } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);
const makeTask = (text = "", children = []) => ({ id: uid(), text, done: false, collapsed: false, children });

const INIT = [
  makeTask("Proje Planı", [
    makeTask("Araştırma", [
      makeTask("Rakip analizi"),
      makeTask("Kullanıcı görüşmeleri"),
    ]),
    makeTask("Tasarım"),
    makeTask("Geliştirme"),
  ]),
];

function updateNode(tasks, id, fn) {
  return tasks.map((t) => t.id === id ? fn(t) : { ...t, children: updateNode(t.children, id, fn) });
}
function deleteNode(tasks, id) {
  return tasks.filter((t) => t.id !== id).map((t) => ({ ...t, children: deleteNode(t.children, id) }));
}
function addChild(tasks, parentId, newTask) {
  return tasks.map((t) => t.id === parentId ? { ...t, collapsed: false, children: [...t.children, newTask] } : { ...t, children: addChild(t.children, parentId, newTask) });
}
function addSibling(tasks, siblingId, newTask) {
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id === siblingId) { const next = [...tasks]; next.splice(i + 1, 0, newTask); return next; }
  }
  return tasks.map((t) => ({ ...t, children: addSibling(t.children, siblingId, newTask) }));
}

function TaskNode({ task, depth, setTasks }) {
  const [hovered, setHovered] = useState(false);
  const toggle = () => setTasks((t) => updateNode(t, task.id, (n) => ({ ...n, done: !n.done })));
  const collapse = () => setTasks((t) => updateNode(t, task.id, (n) => ({ ...n, collapsed: !n.collapsed })));
  const del = () => setTasks((t) => deleteNode(t, task.id));
  const addChildTask = () => { const nt = makeTask(""); setTasks((t) => addChild(t, task.id, nt)); setTimeout(() => document.getElementById("node-" + nt.id)?.focus(), 50); };
  const addSiblingTask = () => { const nt = makeTask(""); setTasks((t) => addSibling(t, task.id, nt)); setTimeout(() => document.getElementById("node-" + nt.id)?.focus(), 50); };
  const indentPx = depth * 20;
  const hasChildren = task.children.length > 0;

  return (
    <div>
      <div style={{ ...s.row, paddingLeft: indentPx }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <button onClick={collapse} style={{ ...s.collapseBtn, opacity: hasChildren ? 1 : 0, pointerEvents: hasChildren ? "auto" : "none", transform: task.collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</button>
        <button onClick={toggle} style={{ ...s.check, ...(task.done ? s.checkDone : {}) }}>
          {task.done && <svg width="9" height="7" viewBox="0 0 9 7"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
        </button>
        <span id={"node-" + task.id} contentEditable suppressContentEditableWarning
          onBlur={(e) => setTasks((t) => updateNode(t, task.id, (n) => ({ ...n, text: e.currentTarget.textContent.trim() })))}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addSiblingTask(); }
            if (e.key === "Tab") { e.preventDefault(); addChildTask(); }
            if (e.key === "Backspace" && e.currentTarget.textContent === "") { e.preventDefault(); del(); }
          }}
          style={{ ...s.text, textDecoration: task.done ? "line-through" : "none", color: task.done ? "#aaa9a0" : depth === 0 ? "#18180f" : "#3a3a30", fontWeight: depth === 0 ? "500" : "400", fontSize: depth === 0 ? "14px" : depth === 1 ? "13px" : "12.5px" }}
        >{task.text}</span>
        <div style={{ ...s.actions, opacity: hovered ? 1 : 0 }}>
          <button onClick={addChildTask} style={s.actionBtn}>↳</button>
          <button onClick={addSiblingTask} style={s.actionBtn}>+</button>
          <button onClick={del} style={{ ...s.actionBtn, color: "#d4a0a0" }}>×</button>
        </div>
      </div>
      {hasChildren && !task.collapsed && (
        <div style={{ position: "relative" }}>
          <div style={{ ...s.line, left: indentPx + 9 }} />
          {task.children.map((child) => <TaskNode key={child.id} task={child} depth={depth + 1} setTasks={setTasks} />)}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(() => {
    try { const saved = localStorage.getItem("todo-tasks"); return saved ? JSON.parse(saved) : INIT; }
    catch { return INIT; }
  });

  const setAndSave = (fn) => {
    setTasks((prev) => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      try { localStorage.setItem("todo-tasks", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const addRoot = () => { const nt = makeTask(""); setAndSave((t) => [...t, nt]); setTimeout(() => document.getElementById("node-" + nt.id)?.focus(), 50); };
  const total = (list) => list.reduce((a, t) => a + 1 + total(t.children), 0);
  const done = (list) => list.reduce((a, t) => a + (t.done ? 1 : 0) + done(t.children), 0);
  const tot = total(tasks), dn = done(tasks);

  return (
    <div style={s.page}>
      <style>{css}</style>
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>yapılacaklar</h1>
            <p style={s.sub}>{dn}/{tot} tamamlandı
              {tot > 0 && <span style={s.bar}><span style={{ ...s.barFill, width: `${(dn / tot) * 100}%` }} /></span>}
            </p>
          </div>
          <button onClick={addRoot} style={s.addRoot} className="add-root">yeni konu +</button>
        </div>
        <div style={s.hint}><span>↳ alt görev</span><span style={s.dot}>·</span><span>Enter → aynı seviye</span><span style={s.dot}>·</span><span>Tab → alt seviye</span></div>
        <div style={s.list}>
          {tasks.length === 0 && <p style={s.empty}>henüz hiçbir şey yok.</p>}
          {tasks.map((task) => <TaskNode key={task.id} task={task} depth={0} setTasks={setAndSave} />)}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "#f2f0eb", fontFamily: "'DM Mono', monospace", padding: "48px 24px" },
  card: { width: "100%", maxWidth: "560px", background: "#fafaf8", border: "1px solid #e4e1d8", borderRadius: "3px", padding: "36px 32px 32px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6px" },
  title: { fontSize: "22px", fontWeight: "400", color: "#18180f", margin: "0 0 6px", letterSpacing: "-0.4px" },
  sub: { fontSize: "11px", color: "#a8a59c", margin: 0, display: "flex", alignItems: "center", gap: "10px", letterSpacing: "0.02em" },
  bar: { display: "inline-block", width: "80px", height: "2px", background: "#e4e1d8", borderRadius: "2px", position: "relative", overflow: "hidden", verticalAlign: "middle" },
  barFill: { position: "absolute", top: 0, left: 0, height: "100%", background: "#18180f", borderRadius: "2px", transition: "width 0.3s ease" },
  addRoot: { background: "none", border: "1px solid #dedad3", borderRadius: "2px", padding: "6px 12px", fontSize: "11px", color: "#a8a59c", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em", transition: "all 0.15s", flexShrink: 0 },
  hint: { fontSize: "10px", color: "#c4c0b8", display: "flex", gap: "6px", alignItems: "center", marginBottom: "24px", letterSpacing: "0.02em" },
  dot: { opacity: 0.5 },
  list: { display: "flex", flexDirection: "column" },
  empty: { fontSize: "12px", color: "#b0ada4", padding: "12px 0" },
  row: { display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", minHeight: "32px", position: "relative" },
  collapseBtn: { background: "none", border: "none", color: "#c4c0b8", fontSize: "11px", cursor: "pointer", padding: "0", width: "14px", flexShrink: 0, transition: "transform 0.15s", lineHeight: 1 },
  check: { width: "16px", height: "16px", borderRadius: "2px", border: "1.5px solid #c8c5bc", background: "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "all 0.12s" },
  checkDone: { background: "#18180f", borderColor: "#18180f" },
  text: { flex: 1, outline: "none", minWidth: 0, wordBreak: "break-word", lineHeight: 1.5, letterSpacing: "0.01em", caretColor: "#18180f" },
  actions: { display: "flex", gap: "2px", transition: "opacity 0.15s", flexShrink: 0 },
  actionBtn: { background: "none", border: "none", color: "#b0ada4", fontSize: "14px", cursor: "pointer", padding: "2px 5px", borderRadius: "2px", fontFamily: "inherit", lineHeight: 1 },
  line: { position: "absolute", top: 0, bottom: 0, width: "1px", background: "#e8e5de", pointerEvents: "none" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500&display=swap');
  [contenteditable]:focus { background: #f5f3ee; border-radius: 2px; }
  .add-root:hover { color: #18180f !important; border-color: #18180f !important; }
  button:hover { opacity: 0.75; }
`;
