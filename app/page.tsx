"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Task = {
  id: number;
  text: string;
  completed: boolean;
  dueDate: string | null;
  client: string | null;
};

type DeletedTask = {
  task: Task;
  index: number;
};

type Urgency = "overdue" | "warning" | "normal";

type Suggestion = {
  title: string;
  dueDate: string;
  checked: boolean;
};

// ─── Pure helpers ───────────────────────────────────────────────────────────────

function getUrgency(dateStr: string): Urgency {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "overdue";
  if (diffDays <= 3) return "warning";
  return "normal";
}

const URGENCY_STYLES: Record<Urgency, {
  border: string;
  hoverBorder: string;
  hoverShadow: string;
  dotBg: string;
  dateText: string;
}> = {
  overdue: {
    border: "border-[#C85450]",
    hoverBorder: "hover:border-[#D46460]",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(200,84,80,0.25)]",
    dotBg: "bg-[#C85450]",
    dateText: "text-[#E87B5A]",
  },
  warning: {
    border: "border-[#B8792A]",
    hoverBorder: "hover:border-[#D4922A]",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(184,120,42,0.25)]",
    dotBg: "bg-[#D4922A]",
    dateText: "text-[#D4922A]",
  },
  normal: {
    border: "border-[#243360]",
    hoverBorder: "hover:border-[#D4A537]/35",
    hoverShadow: "hover:shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
    dotBg: "bg-[#6B7FA3]",
    dateText: "text-[#D4A537]",
  },
};

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getMonth() + 1}月${date.getDate()}日まで`;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const DAY_LABELS   = ["日","月","火","水","木","金","土"];

// ─── Shared icons ───────────────────────────────────────────────────────────────

function DeleteIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function CheckIcon({ size = "2.5" }: { size?: string }) {
  return (
    <svg className={`w-${size} h-${size} text-[#0F1B3D]`} viewBox="0 0 12 10" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 5 4.5 8.5 11 1" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-[#0F1B3D]" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── Client badge (共有) ────────────────────────────────────────────────────────

function ClientBadge({ name, completed }: { name: string; completed: boolean }) {
  return (
    <span className={`inline-block text-[0.58rem] tracking-[0.18em] uppercase px-2 py-0.5 rounded border ${
      completed
        ? "border-[#243360] text-[#3A4F7A]"
        : "border-[#D4A537]/45 text-[#D4A537]/75"
    }`}>
      {name}
    </span>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function Home() {
  // ── Task state ────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const n = new Date();
    return toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
  });
  const [client, setClient] = useState("");
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [deletedTask, setDeletedTask] = useState<DeletedTask | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoaded = useRef(false);

  // ── Planner state ─────────────────────────────────────────────────────────────
  const [plannerDesc, setPlannerDesc] = useState("");
  const [plannerDeadline, setPlannerDeadline] = useState(() => {
    const n = new Date();
    return toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
  });
  const [plannerClient, setPlannerClient] = useState("");
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // ── Task handlers ─────────────────────────────────────────────────────────────

  const addTask = () => {
    if (input.trim() === "") return;
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: input.trim(),
        completed: false,
        dueDate: dueDate || null,
        client: client.trim() || null,
      },
    ]);
    setInput("");
    const n = new Date();
    setDueDate(toDateStr(n.getFullYear(), n.getMonth(), n.getDate()));
    setClient("");
  };

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  };

  const deleteTask = (id: number) => {
    const index = tasks.findIndex((t) => t.id === id);
    const task = tasks[index];
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeletedTask({ task, index });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setDeletedTask(null), 5000);
  };

  const restoreTask = () => {
    if (!deletedTask) return;
    setTasks((prev) => {
      const next = [...prev];
      next.splice(deletedTask.index, 0, deletedTask.task);
      return next;
    });
    setDeletedTask(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  };

  const prevMonth = () => {
    setCalendarDate((p) =>
      p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 }
    );
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCalendarDate((p) =>
      p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 }
    );
    setSelectedDate(null);
  };

  // ── Planner handlers ──────────────────────────────────────────────────────────

  const generateMilestones = async () => {
    if (!plannerDesc.trim() || !plannerDeadline) return;
    setPlannerLoading(true);
    setPlannerError(null);
    setSuggestions([]);
    try {
      const res = await fetch("/api/suggest-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectDescription: plannerDesc,
          deadline: plannerDeadline,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlannerError(data.error ?? "提案の生成に失敗しました。もう一度お試しください。");
        return;
      }
      setSuggestions(
        (data.milestones as { title: string; dueDate: string }[]).map((m) => ({
          ...m,
          checked: true,
        }))
      );
    } catch {
      setPlannerError("提案の生成に失敗しました。もう一度お試しください。");
    } finally {
      setPlannerLoading(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, checked: !s.checked } : s))
    );
  };

  const addSelectedMilestones = () => {
    const selected = suggestions.filter((s) => s.checked);
    if (selected.length === 0) return;
    const base = Date.now();
    setTasks((prev) => [
      ...prev,
      ...selected.map((s, i) => ({
        id: base + i,
        text: s.title,
        completed: false,
        dueDate: s.dueDate || null,
        client: plannerClient.trim() || null,
      })),
    ]);
    setSuggestions([]);
  };

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = localStorage.getItem("todos");
    if (stored) setTasks(JSON.parse(stored));
    isLoaded.current = true;
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (!isLoaded.current) return;
    localStorage.setItem("todos", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (filterClient && !tasks.some((t) => t.client === filterClient)) {
      setFilterClient(null);
    }
  }, [tasks, filterClient]);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const nowDate = new Date();
  const todayStr = toDateStr(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  const calCells = getCalendarCells(calendarDate.year, calendarDate.month);

  const clients = [...new Set(
    tasks.map((t) => t.client).filter((c): c is string => !!c)
  )];

  const filteredTasks = filterClient
    ? tasks.filter((t) => t.client === filterClient)
    : tasks;

  const selectedDateTasks = selectedDate
    ? filteredTasks.filter((t) => t.dueDate === selectedDate)
    : [];

  // ── タスクカード（リスト・パネル共通） ────────────────────────────────────────

  const renderTaskCard = (task: Task, compact = false) => {
    const urgency = !task.completed && task.dueDate ? getUrgency(task.dueDate) : "normal";
    const us = URGENCY_STYLES[urgency];
    return (
      <li
        key={task.id}
        className={`bg-[#162040] border flex items-center gap-4 transition-all duration-200 ${
          compact
            ? "rounded-xl px-4 py-3 bg-[#0F1B3D]"
            : "rounded-t-2xl rounded-b-xl px-5 py-4"
        } ${
          task.completed
            ? "border-[#1A2850] opacity-45"
            : compact
            ? us.border
            : `${us.border} ${us.hoverBorder} hover:-translate-y-0.5 ${us.hoverShadow}`
        }`}
      >
        <label className="relative flex-shrink-0 cursor-pointer">
          <input type="checkbox" checked={task.completed}
            onChange={() => toggleTask(task.id)} className="peer sr-only" />
          <div className={`rounded-sm border border-[#D4A537] bg-transparent peer-checked:bg-[#D4A537] peer-checked:scale-105 transition-all duration-200 flex items-center justify-center ${
            compact ? "w-4 h-4" : "w-[1.1rem] h-[1.1rem]"
          }`}>
            <CheckIcon size={compact ? "2" : "2.5"} />
          </div>
        </label>

        <div className="flex-1 min-w-0">
          <span className={`text-sm leading-relaxed break-all ${
            task.completed ? "line-through text-[#7B8FB3]" : "text-[#D6CEBE]"
          }`}>
            {task.text}
          </span>
          {(task.client || task.dueDate) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              {task.client && (
                <ClientBadge name={task.client} completed={task.completed} />
              )}
              {task.dueDate && (
                <p className={`flex items-center gap-1.5 text-[0.7rem] tracking-wide ${
                  task.completed ? "text-[#3A4F7A]" : us.dateText
                }`}>
                  {!task.completed && urgency !== "normal" && (
                    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${us.dotBg}`} />
                  )}
                  {formatDueDate(task.dueDate)}
                </p>
              )}
            </div>
          )}
        </div>

        <button type="button" onClick={() => deleteTask(task.id)} aria-label="タスクを削除"
          className="flex-shrink-0 text-[#7A8FAF] hover:text-[#D4A537] transition-colors duration-200">
          <DeleteIcon size={compact ? 15 : 17} />
        </button>
      </li>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0F1B3D] px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-5xl mx-auto">

        {/* ── ヘッダー ── */}
        <header className="flex flex-col items-center mb-10">
          <span className="text-[#D4A537] text-[0.6rem] tracking-[0.5em] uppercase mb-5">
            ✦ &nbsp; Personal &nbsp; ✦
          </span>
          <h1 className="font-[family-name:var(--font-playfair)] text-6xl font-bold text-[#F5F0E6] tracking-[0.15em] text-center leading-none">
            ToDo
          </h1>
          <p className="font-[family-name:var(--font-playfair)] text-base italic text-[#D4A537] tracking-[0.4em] mt-2">
            Journal
          </p>
          <div className="flex items-center gap-3 mt-6 w-full max-w-xs">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#D4A537]/60" />
            <span className="text-[#D4A537]/60 text-xs">✦</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#D4A537]/60" />
          </div>
        </header>

        {/* ── 入力エリア（NEW TASK + PROJECT PLANNER） ── */}
        <div className="max-w-lg mx-auto mb-8 flex flex-col gap-4">

          {/* NEW TASK */}
          <section className="bg-[#162040] border border-[#243360] rounded-t-[2rem] rounded-b-2xl p-6 shadow-[0_4px_40px_rgba(0,0,0,0.4)]">
            <p className="text-[#D4A537]/70 text-[0.6rem] tracking-[0.4em] uppercase mb-4">
              ✦ &nbsp; New Task
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="タスクを入力..."
                className="w-full bg-[#0F1B3D] border border-[#243360] focus:border-[#D4A537]/70 rounded-xl px-4 py-3 text-[#F5F0E6] placeholder-[#3A4F7A] text-sm outline-none transition-colors duration-200"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#3A4F7A] text-[0.55rem] tracking-[0.35em] uppercase pl-1">
                    期限日（任意）
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#0F1B3D] border border-[#243360] focus:border-[#D4A537]/70 rounded-xl px-3 py-3 text-[#F5F0E6] text-sm outline-none transition-colors duration-200 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#3A4F7A] text-[0.55rem] tracking-[0.35em] uppercase pl-1">
                    クライアント名（任意）
                  </label>
                  <input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="例：株式会社A"
                    className="w-full bg-[#0F1B3D] border border-[#243360] focus:border-[#D4A537]/70 rounded-xl px-3 py-3 text-[#F5F0E6] placeholder-[#3A4F7A] text-sm outline-none transition-colors duration-200"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addTask}
                  className="bg-[#D4A537] hover:bg-[#C49228] active:scale-95 text-[#0F1B3D] font-semibold px-8 py-3 rounded-xl text-sm tracking-widest transition-all duration-200 shadow-md"
                >
                  追加
                </button>
              </div>
            </div>
          </section>

          {/* PROJECT PLANNER */}
          <section className="bg-[#162040] border border-[#243360] rounded-t-2xl rounded-b-[2rem] p-6 shadow-[0_4px_40px_rgba(0,0,0,0.4)]">
            <p className="text-[#D4A537]/70 text-[0.6rem] tracking-[0.4em] uppercase mb-4">
              ✦ &nbsp; Project Planner
            </p>
            <div className="flex flex-col gap-3">
              {/* 案件内容 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#3A4F7A] text-[0.55rem] tracking-[0.35em] uppercase pl-1">
                  案件内容
                </label>
                <textarea
                  value={plannerDesc}
                  onChange={(e) => setPlannerDesc(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="例：ECサイトのLP制作（デザイン・コーディング・CMSへの組み込み）"
                  rows={3}
                  className="w-full bg-[#0F1B3D] border border-[#243360] focus:border-[#D4A537]/70 rounded-xl px-4 py-3 text-[#F5F0E6] placeholder-[#3A4F7A] text-sm outline-none transition-colors duration-200 resize-none"
                />
              </div>
              {/* 締め切り日 + クライアント名 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#3A4F7A] text-[0.55rem] tracking-[0.35em] uppercase pl-1">
                    締め切り日
                  </label>
                  <input
                    type="date"
                    value={plannerDeadline}
                    onChange={(e) => setPlannerDeadline(e.target.value)}
                    className="w-full bg-[#0F1B3D] border border-[#243360] focus:border-[#D4A537]/70 rounded-xl px-3 py-3 text-[#F5F0E6] text-sm outline-none transition-colors duration-200 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#3A4F7A] text-[0.55rem] tracking-[0.35em] uppercase pl-1">
                    クライアント名（任意）
                  </label>
                  <input
                    type="text"
                    value={plannerClient}
                    onChange={(e) => setPlannerClient(e.target.value)}
                    placeholder="例：株式会社A"
                    className="w-full bg-[#0F1B3D] border border-[#243360] focus:border-[#D4A537]/70 rounded-xl px-3 py-3 text-[#F5F0E6] placeholder-[#3A4F7A] text-sm outline-none transition-colors duration-200"
                  />
                </div>
              </div>
              {/* 提案ボタン */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={generateMilestones}
                  disabled={plannerLoading || !plannerDesc.trim() || !plannerDeadline}
                  className="flex items-center gap-2 bg-[#D4A537] hover:bg-[#C49228] active:scale-95 text-[#0F1B3D] font-semibold px-8 py-3 rounded-xl text-sm tracking-widest transition-all duration-200 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#D4A537] disabled:active:scale-100"
                >
                  {plannerLoading && <Spinner />}
                  {plannerLoading ? "考え中..." : "提案を生成"}
                </button>
              </div>

              {/* エラー */}
              {plannerError && (
                <p className="text-[#E87B5A] text-xs tracking-wide border border-[#C85450]/30 bg-[#C85450]/10 rounded-xl px-4 py-3 leading-relaxed">
                  {plannerError}
                </p>
              )}

              {/* 提案リスト */}
              {suggestions.length > 0 && (
                <div className="mt-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-[#243360]" />
                    <span className="text-[#3A4F7A] text-[0.55rem] tracking-[0.35em] uppercase">提案</span>
                    <div className="flex-1 h-px bg-[#243360]" />
                  </div>
                  <ul className="flex flex-col gap-2">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-3 border rounded-xl px-4 py-3 transition-all duration-150 cursor-pointer ${
                          s.checked
                            ? "border-[#D4A537]/30 bg-[#0F1B3D] hover:border-[#D4A537]/50"
                            : "border-[#1A2850] bg-[#0F1B3D] opacity-40"
                        }`}
                        onClick={() => toggleSuggestion(i)}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all duration-150 ${
                            s.checked
                              ? "border-[#D4A537] bg-[#D4A537]"
                              : "border-[#3A4F7A] bg-transparent"
                          }`}>
                            {s.checked && <CheckIcon size="2" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#D6CEBE] leading-relaxed">{s.title}</p>
                          <p className="text-[0.7rem] text-[#D4A537]/60 mt-0.5 tracking-wide">
                            {s.dueDate ? formatDueDate(s.dueDate) : "期限なし"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      onClick={addSelectedMilestones}
                      disabled={!suggestions.some((s) => s.checked)}
                      className="border border-[#D4A537]/60 hover:bg-[#D4A537]/10 active:scale-95 text-[#D4A537] font-semibold px-6 py-2.5 rounded-xl text-xs tracking-widest transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      選択したタスクを追加
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── 2カラムレイアウト ── */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">

          {/* ━━━ 左カラム：タスクリスト ━━━ */}
          <div className="order-2 lg:order-1 lg:col-span-3">

            {tasks.length > 0 && (
              <div className="flex items-center gap-4 mb-4 px-1">
                <div className="flex-1 h-px bg-[#243360]" />
                <span className="text-[#3A4F7A] text-[0.6rem] tracking-[0.4em] uppercase">Tasks</span>
                <div className="flex-1 h-px bg-[#243360]" />
              </div>
            )}

            {clients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setFilterClient(null)}
                  className={`text-[0.58rem] tracking-[0.25em] uppercase px-3 py-1.5 rounded-full border transition-all duration-150 ${
                    filterClient === null
                      ? "bg-[#D4A537] border-[#D4A537] text-[#0F1B3D] font-semibold"
                      : "border-[#243360] text-[#3A4F7A] hover:border-[#D4A537]/40 hover:text-[#D4A537]/60"
                  }`}
                >
                  ✦ All
                </button>
                {clients.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setFilterClient(c)}
                    className={`text-[0.58rem] tracking-[0.25em] uppercase px-3 py-1.5 rounded-full border transition-all duration-150 ${
                      filterClient === c
                        ? "bg-[#D4A537] border-[#D4A537] text-[#0F1B3D] font-semibold"
                        : "border-[#243360] text-[#3A4F7A] hover:border-[#D4A537]/40 hover:text-[#D4A537]/60"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {filteredTasks.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#243360] text-3xl mb-6 tracking-widest">✦</p>
                <p className="text-[#3A4F7A] text-xs tracking-[0.4em] uppercase">
                  {tasks.length === 0 ? "最初のタスクを追加しよう" : "該当するタスクなし"}
                </p>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-3 lg:max-h-[32rem] lg:overflow-y-auto lg:[scrollbar-width:thin] lg:[scrollbar-color:#243360_transparent] lg:pr-1">
                  {filteredTasks.map((task) => renderTaskCard(task))}
                </ul>
                <div className="flex justify-center mt-6">
                  <span className="inline-flex items-center gap-2.5 border border-[#243360] text-[#3A4F7A] text-[0.6rem] tracking-[0.3em] uppercase px-5 py-2 rounded-full">
                    <span className="text-[#D4A537]/60">✦</span>
                    {filteredTasks.filter((t) => !t.completed).length} remaining
                    <span className="text-[#243360]">·</span>
                    {filteredTasks.length} total
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ━━━ 右カラム：カレンダー ━━━ */}
          <div className="order-1 lg:order-2 lg:col-span-2">

            <div className="bg-[#162040] border border-[#243360] rounded-t-2xl rounded-b-xl px-4 py-5 shadow-[0_4px_40px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between mb-4 px-1">
                <button type="button" onClick={prevMonth} aria-label="前の月"
                  className="text-[#6B7FA3] hover:text-[#D4A537] transition-colors p-1.5 rounded-lg hover:bg-[#1E2E5A]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="font-[family-name:var(--font-playfair)] text-[#F5F0E6] tracking-[0.1em] text-sm">
                  {calendarDate.year}年 {MONTH_LABELS[calendarDate.month]}
                </span>
                <button type="button" onClick={nextMonth} aria-label="次の月"
                  className="text-[#6B7FA3] hover:text-[#D4A537] transition-colors p-1.5 rounded-lg hover:bg-[#1E2E5A]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_LABELS.map((d, i) => (
                  <div key={d} className={`text-center text-[0.58rem] tracking-[0.15em] py-1 ${
                    i === 0 ? "text-[#E87B5A]/60" : i === 6 ? "text-[#6B97D4]/60" : "text-[#3A4F7A]"
                  }`}>
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calCells.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[2.8rem]" />;

                  const dateStr = toDateStr(calendarDate.year, calendarDate.month, day);
                  const dayTasks = filteredTasks.filter((t) => t.dueDate === dateStr);
                  const incompleteTasks = dayTasks.filter((t) => !t.completed);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const dayOfWeek = i % 7;

                  return (
                    <div
                      key={i}
                      onClick={() => { setSelectedDate(isSelected ? null : dateStr); setDueDate(dateStr); }}
                      className={`relative rounded-lg p-1.5 min-h-[2.8rem] cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-[#1E2E5A] border border-[#D4A537]/60 shadow-[0_0_12px_rgba(212,165,55,0.15)]"
                          : isToday
                          ? "border border-[#D4A537]/50 bg-[#162040] hover:bg-[#1A2850]"
                          : "border border-transparent bg-[#0F1B3D] hover:bg-[#162040]"
                      }`}
                    >
                      <span className={`block text-center text-xs leading-none mb-1.5 ${
                        isToday ? "text-[#D4A537] font-semibold"
                          : dayOfWeek === 0 ? "text-[#E87B5A]/70"
                          : dayOfWeek === 6 ? "text-[#6B97D4]/70"
                          : "text-[#6B7FA3]"
                      }`}>
                        {day}
                      </span>
                      {incompleteTasks.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap justify-center">
                          {incompleteTasks.slice(0, 3).map((t, j) => (
                            <span key={j} className={`inline-block w-1.5 h-1.5 rounded-full ${
                              URGENCY_STYLES[getUrgency(t.dueDate!)].dotBg
                            }`} />
                          ))}
                          {incompleteTasks.length > 3 && (
                            <span className="text-[0.45rem] text-[#6B7FA3] leading-none mt-0.5">
                              +{incompleteTasks.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {incompleteTasks.length === 0 && dayTasks.length > 0 && (
                        <div className="flex justify-center">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#243360]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="mt-3 bg-[#162040] border border-[#243360] rounded-t-2xl rounded-b-xl px-5 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                <p className="text-[#D4A537]/70 text-[0.6rem] tracking-[0.4em] uppercase mb-4">
                  ✦ &nbsp;{(() => {
                    const d = new Date(selectedDate + "T00:00:00");
                    return `${d.getMonth() + 1}月${d.getDate()}日`;
                  })()}
                  {filterClient && (
                    <span className="ml-2 normal-case text-[#D4A537]/50">— {filterClient}</span>
                  )}
                </p>
                {selectedDateTasks.length === 0 ? (
                  <p className="text-[#3A4F7A] text-xs tracking-[0.3em] uppercase text-center py-4">
                    この日のタスクなし
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {selectedDateTasks.map((task) => renderTaskCard(task, true))}
                  </ul>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── トースト通知 ── */}
      {deletedTask && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#162040] border border-[#D4A537]/30 text-[#F5F0E6] px-6 py-4 rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.6)] whitespace-nowrap">
          <span className="text-[#6B7FA3] text-xs tracking-wider">タスクを削除しました</span>
          <div className="w-px h-3.5 bg-[#243360]" />
          <button type="button" onClick={restoreTask}
            className="text-xs font-semibold text-[#D4A537] hover:text-[#F5C842] tracking-[0.2em] uppercase transition-colors">
            元に戻す
          </button>
        </div>
      )}
    </main>
  );
}
