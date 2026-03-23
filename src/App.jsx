import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "bloom-data-v1";
const TASK_OPTIONS = [
  { id: "drink-water", label: "💧 Drink water" },
  { id: "gym-workout", label: "🏋️ Gym / workout" },
  { id: "study-read", label: "📚 Study / read" },
  { id: "meal-prep", label: "🍳 Meal prep" },
  { id: "walk-outside", label: "🚶 Walk outside" },
  { id: "sleep-on-time", label: "😴 Sleep on time" },
  { id: "no-phone-30", label: "📵 No phone first 30 min" },
  { id: "meditate", label: "🧘 Meditate" },
  { id: "journal", label: "📝 Journal" },
  { id: "plan-tomorrow", label: "✅ Plan tomorrow tonight" },
];

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const isoDiffDays = (older, newer) => {
  const [oy, om, od] = older.split("-").map(Number);
  const [ny, nm, nd] = newer.split("-").map(Number);
  const olderUtc = Date.UTC(oy, om - 1, od);
  const newerUtc = Date.UTC(ny, nm - 1, nd);
  return Math.floor((newerUtc - olderUtc) / 86400000);
};

const buildPlantStage = (streak) => {
  if (streak >= 14) return { key: "bloom", label: "Full Bloom" };
  if (streak >= 7) return { key: "small", label: "Small Plant" };
  if (streak >= 3) return { key: "sprout", label: "Sprout" };
  if (streak === 2) return { key: "day2", label: "Small Sprout" };
  if (streak === 1) return { key: "day1", label: "Seed Awakening" };
  return { key: "day0", label: "Seed" };
};

const getMotivationMessage = (streak) => {
  if (streak >= 14) return `Day ${streak} - you're in full bloom`;
  if (streak >= 7) return `Day ${streak} - your plant is growing`;
  if (streak >= 1) return `Day ${streak} - every bloom starts here`;
  return "Day 0 - plant your first check-in";
};

const getCelebrationMessage = (streak) => {
  if (streak >= 14) return "You're in full bloom, Fields. Don't stop now. 🌸";
  if (streak >= 7) return "One week strong. Most people quit before this. 🪴";
  if (streak >= 2) return `Day ${streak} done. Your plant felt that. 🌿`;
  if (streak === 1) return "You showed up. That's everything. 🌱";
  return "You showed up. That's everything. 🌱";
};

function PlantSvg({ stage }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className="mx-auto h-44 w-44 plant-sway"
      role="img"
      aria-label={`Plant stage: ${stage.label}`}
    >
      <ellipse cx="100" cy="166" rx="52" ry="11" fill="#111827" />
      <ellipse cx="100" cy="160" rx="38" ry="20" fill="#1f2937" />

      {stage.key === "day0" && <ellipse cx="100" cy="132" rx="14" ry="10" fill="#7c4a23" />}

      {stage.key === "day1" && (
        <>
          <ellipse cx="100" cy="132" rx="14" ry="10" fill="#7c4a23" />
          <rect x="99" y="122" width="2" height="10" rx="1" fill="#22c55e" />
        </>
      )}

      {stage.key === "day2" && (
        <>
          <ellipse cx="100" cy="134" rx="13" ry="9" fill="#7c4a23" />
          <rect x="98.8" y="112" width="2.4" height="22" rx="1.2" fill="#22c55e" />
          <path d="M100 118 C93 114, 90 106, 96 102 C101 104, 103 112, 100 118" fill="#22c55e" />
        </>
      )}

      {(stage.key === "sprout" || stage.key === "small" || stage.key === "bloom") && (
        <rect x="98" y="100" width="4" height="52" rx="2" fill="#22c55e" />
      )}

      {stage.key === "sprout" && (
        <path d="M100 108 C88 102, 82 88, 91 82 C101 85, 105 99, 100 108" fill="#22c55e" />
      )}

      {(stage.key === "sprout" || stage.key === "small" || stage.key === "bloom") && (
        <>
          <path d="M100 124 C88 116, 84 102, 94 95 C102 98, 106 112, 100 124" fill="#22c55e" />
          <path d="M100 121 C112 113, 116 99, 106 92 C98 95, 94 110, 100 121" fill="#22c55e" />
        </>
      )}

      {(stage.key === "small" || stage.key === "bloom") && (
        <>
          <path d="M100 112 C86 106, 80 90, 90 83 C101 86, 106 98, 100 112" fill="#22c55e" />
          <path d="M100 110 C114 103, 120 87, 110 80 C99 84, 94 96, 100 110" fill="#22c55e" />
        </>
      )}

      {stage.key === "bloom" && (
        <g className="petal-pulse" transform="translate(100 84)">
          <ellipse cx="0" cy="-16" rx="8" ry="13" fill="#86efac" />
          <ellipse cx="13" cy="-7" rx="8" ry="13" transform="rotate(55)" fill="#86efac" />
          <ellipse cx="13" cy="7" rx="8" ry="13" transform="rotate(115)" fill="#86efac" />
          <ellipse cx="0" cy="16" rx="8" ry="13" fill="#86efac" />
          <ellipse cx="-13" cy="7" rx="8" ry="13" transform="rotate(-115)" fill="#86efac" />
          <ellipse cx="-13" cy="-7" rx="8" ry="13" transform="rotate(-55)" fill="#86efac" />
          <circle cx="0" cy="0" r="7" fill="#22c55e" />
        </g>
      )}
    </svg>
  );
}

const getInitialData = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  const today = dayKey();
  const fallback = {
    entries: {},
    streak: 0,
    bestStreak: 0,
    plantWiltLevel: 0,
    lastCheckInDate: null,
    hasOnboarded: false,
    theme: "dark",
  };

  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    const safe = {
      ...fallback,
      ...parsed,
      entries: parsed.entries ?? {},
    };

    if (safe.lastCheckInDate) {
      const daysMissed = isoDiffDays(safe.lastCheckInDate, today);
      if (daysMissed > 1) {
        safe.streak = 0;
        safe.plantWiltLevel = Math.min(3, safe.plantWiltLevel + (daysMissed - 1));
      }
    }

    return safe;
  } catch {
    return fallback;
  }
};

function App() {
  const today = dayKey();
  const [data, setData] = useState(getInitialData);
  const [showAbout, setShowAbout] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [form, setForm] = useState({
    drained: "",
    oneTask: "",
    stoppingTime: "",
    selectedTasks: [],
  });

  const todayEntry = data.entries[today];
  const completedToday = Boolean(todayEntry);
  const selectedTaskLabelsToday = (todayEntry?.selectedTasks ?? [])
    .map((taskId) => TASK_OPTIONS.find((option) => option.id === taskId)?.label)
    .filter(Boolean);
  const isFormReady =
    form.drained.trim().length > 0 &&
    form.oneTask.trim().length > 0 &&
    form.stoppingTime.trim().length > 0;
  const isDarkMode = data.theme !== "light";

  const plant = useMemo(
    () => buildPlantStage(data.streak),
    [data.streak],
  );
  const motivationMessage = useMemo(() => getMotivationMessage(data.streak), [data.streak]);
  const celebrationMessage = useMemo(() => getCelebrationMessage(data.streak), [data.streak]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleTaskToggle = (task) => {
    setForm((prev) => {
      const exists = prev.selectedTasks.includes(task);
      return {
        ...prev,
        selectedTasks: exists
          ? prev.selectedTasks.filter((item) => item !== task)
          : [...prev.selectedTasks, task],
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.drained.trim() || !form.oneTask.trim() || !form.stoppingTime) return;

    setData((prev) => {
      const prevDate = prev.lastCheckInDate;
      const diff = prevDate ? isoDiffDays(prevDate, today) : null;

      let nextStreak = prev.streak;
      let nextWilt = prev.plantWiltLevel;

      if (!prevDate) {
        nextStreak = 1;
      } else if (diff === 0) {
        nextStreak = prev.streak;
      } else if (diff === 1) {
        nextStreak = prev.streak + 1;
        nextWilt = Math.max(0, prev.plantWiltLevel - 1);
      } else if (diff > 1) {
        nextStreak = 1;
        nextWilt = Math.min(3, prev.plantWiltLevel + (diff - 1));
      }

      const nextData = {
        ...prev,
        entries: {
          ...prev.entries,
          [today]: {
            ...form,
            createdAt: new Date().toISOString(),
          },
        },
        streak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        plantWiltLevel: nextWilt,
        lastCheckInDate: today,
      };

      return nextData;
    });
  };

  const handleStartJourney = () => {
    setData((prev) => ({
      ...prev,
      hasOnboarded: true,
    }));
  };

  const toggleTheme = () => {
    setData((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  };

  const handleShareProgress = async () => {
    const shareText = `Day ${data.streak} on Bloom 🌱 Showing up daily and watching myself grow. Check it out: [URL once deployed]`;

    try {
      if (navigator.share) {
        await navigator.share({
          text: shareText,
        });
        return;
      }
    } catch {
      // If native share is cancelled or fails, fall back to clipboard.
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 1800);
    } catch {
      window.prompt("Copy your progress text:", shareText);
    }
  };

  if (!data.hasOnboarded) {
    return (
      <main
        className={`mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6 sm:px-6 ${
          isDarkMode ? "bg-[#0d0d0d] text-slate-100" : "bg-[#f9fafb] text-slate-900"
        }`}
      >
        <section
          className={`onboarding-fade w-full rounded-3xl border p-6 text-center shadow-2xl ${
            isDarkMode
              ? "border-[#22c55e]/25 bg-slate-900/90 shadow-black/40"
              : "border-[#22c55e]/30 bg-white/95 shadow-emerald-100"
          }`}
        >
          <PlantSvg stage={buildPlantStage(0)} />
          <h1 className={`mt-2 text-3xl font-semibold tracking-tight ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            Bloom <span aria-hidden="true">🌱</span>
          </h1>
          <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            Show up daily. Watch yourself grow.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-300 bg-slate-100 text-slate-700"}`}>🌱 Daily check-ins</span>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-300 bg-slate-100 text-slate-700"}`}>🔥 Streak tracking</span>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-300 bg-slate-100 text-slate-700"}`}>📵 Beat phone addiction</span>
          </div>
          <button
            type="button"
            onClick={handleStartJourney}
            className="onboarding-pulse mt-6 w-full rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-[#4ade80]"
          >
            Start my journey
          </button>
          <p className={`mt-2 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
            Join others building better habits
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`mx-auto min-h-screen w-full max-w-[390px] px-4 py-6 sm:px-6 ${
        isDarkMode ? "bg-[#0d0d0d] text-slate-100" : "bg-[#f9fafb] text-slate-900"
      }`}
    >
      <section
        className={`rounded-3xl border p-6 shadow-2xl ${
          isDarkMode
            ? "border-[#22c55e]/20 bg-slate-900/90 shadow-black/30"
            : "border-[#22c55e]/30 bg-white/95 shadow-emerald-100"
        }`}
      >
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#22c55e]/80">Bloom</p>
            <h1 className={`text-2xl font-semibold tracking-tight ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              Bloom <span aria-hidden="true">🌱</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              isDarkMode
                ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#86efac]"
                : "border-[#22c55e]/40 bg-[#22c55e]/15 text-[#166534]"
            }`}
          >
            {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </header>

        <div
          className={`mb-6 rounded-2xl border p-4 text-center shadow-[0_0_30px_rgba(34,197,94,0.18)] ${
            isDarkMode
              ? "border-[#22c55e]/25 bg-slate-800/60"
              : "border-[#22c55e]/30 bg-emerald-50/80"
          }`}
        >
          <PlantSvg stage={plant} />
          <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{plant.label}</p>
          <p className="mt-1 text-sm text-[#86efac]">{motivationMessage}</p>
          <div className={`mt-3 flex justify-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            <span className={`rounded-full px-3 py-1 ${isDarkMode ? "bg-slate-700/70" : "bg-slate-100"}`}>
              Streak: <strong className="text-[#22c55e]">{data.streak}</strong>
            </span>
            <span className={`rounded-full px-3 py-1 ${isDarkMode ? "bg-slate-700/70" : "bg-slate-100"}`}>
              Best: <strong className="text-[#22c55e]">{data.bestStreak}</strong>
            </span>
          </div>
        </div>

        <section>
          <h2 className={`text-lg font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>Today's check-in</h2>
          <p className={`mb-4 mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Start your day with clarity. Complete this to help your plant grow.
          </p>

          {completedToday ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-4 text-center">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="completion-check inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#22c55e] text-sm font-bold text-slate-950">
                    ✓
                  </span>
                  <p className="text-sm font-medium text-[#bbf7d0]">{celebrationMessage}</p>
                </div>
                <PlantSvg stage={plant} />
                <p className="text-sm text-[#86efac]">
                  Check-in complete. Current streak:{" "}
                  <strong className="text-[#22c55e]">{data.streak}</strong>
                </p>
                <p className={`mt-1 text-xs italic ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Come back tomorrow to keep your plant alive.
                </p>
                {selectedTaskLabelsToday.length > 0 && (
                  <div className="mt-3">
                    <p className={`text-xs uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Completed tasks today
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {selectedTaskLabelsToday.map((taskLabel) => (
                        <span
                          key={taskLabel}
                          className="rounded-full border border-[#22c55e]/40 bg-[#22c55e]/15 px-2.5 py-1 text-xs text-[#86efac]"
                        >
                          {taskLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleShareProgress}
                  className={`mt-4 w-full rounded-lg border border-[#22c55e]/50 bg-gradient-to-r from-[#22c55e]/25 to-[#4ade80]/25 px-3 py-2 text-sm font-semibold transition hover:from-[#22c55e]/35 hover:to-[#4ade80]/35 ${
                    isDarkMode ? "text-[#bbf7d0]" : "text-[#166534]"
                  }`}
                >
                  Share my streak <span aria-hidden="true">🌱</span>
                </button>
                <p className={`mt-3 text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
                  Bloom - show up daily. Watch yourself grow.
                </p>
              </div>

              <div className={`rounded-xl border p-3 ${isDarkMode ? "border-slate-700 bg-slate-800/70" : "border-slate-300 bg-slate-100/70"}`}>
                <p className={`mb-2 text-xs uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Settings</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAbout(true)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm transition ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-700/60 text-slate-200 hover:bg-slate-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    About Bloom
                  </button>
                  <a
                    href="mailto:fields1work@gmail.com"
                    className={`block w-full rounded-lg border px-3 py-2 text-center text-sm transition ${
                      isDarkMode
                        ? "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#86efac] hover:bg-[#22c55e]/20"
                        : "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#166534] hover:bg-[#22c55e]/20"
                    }`}
                  >
                    Give feedback
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block">
                <span className={`mb-1 block text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>What drained you yesterday?</span>
                <input
                  type="text"
                  value={form.drained}
                  onChange={(event) => setForm((prev) => ({ ...prev, drained: event.target.value }))}
                  placeholder="e.g. too many meetings"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ring-[#22c55e] transition focus:border-[#22c55e] focus:ring-2 ${
                    isDarkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                />
              </label>

              <label className="block">
                <span className={`mb-1 block text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>What's your one task today?</span>
                <input
                  type="text"
                  value={form.oneTask}
                  onChange={(event) => setForm((prev) => ({ ...prev, oneTask: event.target.value }))}
                  placeholder="e.g. finish project proposal"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ring-[#22c55e] transition focus:border-[#22c55e] focus:ring-2 ${
                    isDarkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                />
              </label>

              <label className="block">
                <span className={`mb-1 block text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  What time are you done for the day?
                </span>
                <input
                  type="time"
                  value={form.stoppingTime}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stoppingTime: event.target.value }))
                  }
                  placeholder="e.g. 6:00 PM — protect your wind-down time"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ring-[#22c55e] transition focus:border-[#22c55e] focus:ring-2 ${
                    isDarkMode
                      ? "border-slate-700 bg-slate-800 text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                />
                <span className={`mt-1 block text-xs ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
                  Setting a stop time prevents overwork and revenge bedtime scrolling.
                </span>
              </label>

              <div>
                <p className={`mb-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Task menu</p>
                <div className="flex flex-wrap items-start gap-2">
                  {TASK_OPTIONS.map((task) => {
                    const selected = form.selectedTasks.includes(task.id);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleTaskToggle(task.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          selected
                            ? "border-[#22c55e] bg-[#22c55e]/20 text-[#86efac]"
                            : isDarkMode
                              ? "border-slate-600 bg-slate-800 text-slate-300"
                              : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        {task.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!isFormReady}
                className={`mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-950 transition ${
                  isFormReady
                    ? "bg-[#22c55e] hover:bg-[#4ade80]"
                    : "bg-slate-600 text-slate-300 cursor-not-allowed"
                }`}
              >
                Complete Today's Check-in <span aria-hidden="true">🌱</span>
              </button>
            </form>
          )}
        </section>
      </section>
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}>
            <h3 className="text-lg font-semibold">About Bloom</h3>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Show up daily. Watch yourself grow.
            </p>
            <a
              href="https://www.tiktok.com/@focuswithfields"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-[#22c55e] underline underline-offset-2"
            >
              @focuswithfields on TikTok
            </a>
            <button
              type="button"
              onClick={() => setShowAbout(false)}
              className="mt-4 w-full rounded-lg bg-[#22c55e] px-3 py-2 text-sm font-medium text-slate-950"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showCopiedToast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#22c55e]/40 bg-slate-900/90 px-3 py-1.5 text-xs text-[#86efac] shadow-lg shadow-black/40">
          Copied!
        </div>
      )}
    </main>
  );
}

export default App;
