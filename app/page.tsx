"use client";

import { useState, useEffect, useRef } from "react";

type Task = {
  id: number;
  text: string;
  completed: boolean;
};

type DeletedTask = {
  task: Task;
  index: number;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [deletedTask, setDeletedTask] = useState<DeletedTask | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoaded = useRef(false);

  const addTask = () => {
    if (input.trim() === "") return;
    setTasks((prev) => [...prev, { id: Date.now(), text: input.trim(), completed: false }]);
    setInput("");
  };

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: number) => {
    const index = tasks.findIndex((t) => t.id === id);
    const task = tasks[index];
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeletedTask({ task, index });

    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setDeletedTask(null);
    }, 5000);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addTask();
  };

  // 初回マウント時に localStorage から復元
  useEffect(() => {
    const stored = localStorage.getItem("todos");
    if (stored) {
      setTasks(JSON.parse(stored));
    }
    isLoaded.current = true;
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // tasks が変わるたびに localStorage へ保存（読み込み完了後のみ）
  useEffect(() => {
    if (!isLoaded.current) return;
    localStorage.setItem("todos", JSON.stringify(tasks));
  }, [tasks]);

  return (
    <main className="min-h-screen bg-[#0F1B3D] px-4 py-16 sm:py-20">
      <div className="max-w-lg mx-auto">

        {/* ── ヘッダー ── */}
        <header className="flex flex-col items-center mb-14">
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

        {/* ── 入力エリア ── */}
        <section className="bg-[#162040] border border-[#243360] rounded-t-[2rem] rounded-b-2xl p-6 mb-10 shadow-[0_4px_40px_rgba(0,0,0,0.4)]">
          <p className="text-[#D4A537]/70 text-[0.6rem] tracking-[0.4em] uppercase mb-4">
            ✦ &nbsp; New Task
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="タスクを入力..."
              className="flex-1 bg-[#0F1B3D] border border-[#243360] focus:border-[#D4A537]/70 rounded-xl px-4 py-3 text-[#F5F0E6] placeholder-[#3A4F7A] text-sm outline-none transition-colors duration-200"
            />
            <button
              onClick={addTask}
              className="bg-[#D4A537] hover:bg-[#C49228] active:scale-95 text-[#0F1B3D] font-semibold px-6 py-3 rounded-xl text-sm tracking-widest transition-all duration-200 whitespace-nowrap shadow-md"
            >
              追加
            </button>
          </div>
        </section>

        {/* ── タスクセクションラベル ── */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-4 mb-5 px-1">
            <div className="flex-1 h-px bg-[#243360]" />
            <span className="text-[#3A4F7A] text-[0.6rem] tracking-[0.4em] uppercase">
              Tasks
            </span>
            <div className="flex-1 h-px bg-[#243360]" />
          </div>
        )}

        {/* ── タスクリスト ── */}
        {tasks.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[#243360] text-3xl mb-6 tracking-widest">✦</p>
            <p className="text-[#3A4F7A] text-xs tracking-[0.4em] uppercase">
              最初のタスクを追加しよう
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className={`group bg-[#162040] border rounded-t-2xl rounded-b-xl px-5 py-4 flex items-center gap-4 transition-all duration-200 ${
                    task.completed
                      ? "border-[#1A2850] opacity-45"
                      : "border-[#243360] hover:border-[#D4A537]/35 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
                  }`}
                >
                  {/* ゴールド チェックボックス */}
                  <label className="relative flex-shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="peer sr-only"
                    />
                    <div className="w-[1.1rem] h-[1.1rem] rounded-sm border border-[#D4A537] bg-transparent peer-checked:bg-[#D4A537] peer-checked:scale-105 transition-all duration-200 flex items-center justify-center">
                      <svg
                        className="w-2.5 h-2.5 text-[#0F1B3D]"
                        viewBox="0 0 12 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="1 5 4.5 8.5 11 1" />
                      </svg>
                    </div>
                  </label>

                  <span
                    className={`flex-1 text-sm leading-relaxed break-all ${
                      task.completed
                        ? "line-through text-[#7B8FB3]"
                        : "text-[#D6CEBE]"
                    }`}
                  >
                    {task.text}
                  </span>

                  {/* 削除ボタン（SVGアイコン） */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    aria-label="タスクを削除"
                    className="flex-shrink-0 text-[#7A8FAF] hover:text-[#D4A537] transition-colors duration-200"
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            {/* ── 件数バッジ ── */}
            <div className="flex justify-center mt-8">
              <span className="inline-flex items-center gap-2.5 border border-[#243360] text-[#3A4F7A] text-[0.6rem] tracking-[0.3em] uppercase px-5 py-2 rounded-full">
                <span className="text-[#D4A537]/60">✦</span>
                {tasks.filter((t) => !t.completed).length} remaining
                <span className="text-[#243360]">·</span>
                {tasks.length} total
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── トースト通知 ── */}
      {deletedTask && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#162040] border border-[#D4A537]/30 text-[#F5F0E6] px-6 py-4 rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.6)] whitespace-nowrap">
          <span className="text-[#6B7FA3] text-xs tracking-wider">
            タスクを削除しました
          </span>
          <div className="w-px h-3.5 bg-[#243360]" />
          <button
            onClick={restoreTask}
            className="text-xs font-semibold text-[#D4A537] hover:text-[#F5C842] tracking-[0.2em] uppercase transition-colors"
          >
            元に戻す
          </button>
        </div>
      )}
    </main>
  );
}
