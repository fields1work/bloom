import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "bloom-data-v1";
const TASK_OPTIONS = [
  { id: "drink-water", label: "💧 Drink water" },
  { id: "gym-workout", label: "🏋️ Move your body (even 10 min counts)" },
  { id: "study-read", label: "📚 Study / read" },
  { id: "meal-prep", label: "🍳 Meal prep" },
  { id: "walk-outside", label: "🚶 Step outside for 5 min" },
  { id: "sleep-on-time", label: "😴 Sleep on time" },
  { id: "no-phone-30", label: "📵 No phone first 30 min" },
  { id: "meditate", label: "🧘 Breathe for 2 minutes" },
  { id: "journal", label: "📝 Journal" },
  { id: "plan-tomorrow", label: "✅ Write tomorrow's one task (30 sec)" },
];

const FOCUS_TASK_IDS = {
  gym: ["gym-workout", "walk-outside", "drink-water", "meditate"],
  school: ["study-read", "journal", "plan-tomorrow", "drink-water"],
  life: ["meal-prep", "sleep-on-time", "meditate", "journal", "no-phone-30", "plan-tomorrow"],
};

const TASK_FEEDBACK_MESSAGES = [
  "Nice. Your plant liked that.",
  "That counted.",
  "Keep going.",
];

function isTaskHighlightedForFocus(taskId, focusArea) {
  if (!focusArea || !FOCUS_TASK_IDS[focusArea]) return false;
  return FOCUS_TASK_IDS[focusArea].includes(taskId);
}

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

const getHomeGreeting = (hour, failStruggle) => {
  if (failStruggle === "sleep") {
    if (hour >= 5 && hour < 12) return "You got up. That's already the hardest part. Check in. 🌱";
    if (hour >= 12 && hour < 17) return "Afternoon. Set your stop time tonight and stick to it.";
    if (hour >= 17 && hour < 21) return "Wind down on time tonight. Your streak starts in the morning.";
    return "Log today before you sleep. One less reason to break the chain.";
  }
  if (failStruggle === "phone") {
    if (hour >= 5 && hour < 12) return "Phone down. Bloom first. Scroll later. 📵";
    if (hour >= 12 && hour < 17) return "Midday check-in before the scroll takes over.";
    if (hour >= 17 && hour < 21) return "Two minutes here beats two hours on your phone.";
    return "Last thing before you scroll — check in. Keep the streak.";
  }
  if (failStruggle === "consistency") {
    if (hour >= 5 && hour < 12) return "Consistent people check in every morning. You're consistent. 🌱";
    if (hour >= 12 && hour < 17) return "Consistency isn't a feeling. It's a choice. Make it now.";
    if (hour >= 17 && hour < 21) return "You showed up yesterday. Show up today. That's all it is.";
    return "Streak on the line. One check-in. Two minutes. Do it.";
  }
  if (failStruggle === "focus") {
    if (hour >= 5 && hour < 12) return "One screen. One task. Everything else waits. 🎯";
    if (hour >= 12 && hour < 17) return "Halfway through. What's the one thing still left today?";
    if (hour >= 17 && hour < 21) return "Evening reset. What did you actually finish?";
    return "Close the tabs. Check in. Ship tomorrow.";
  }
  if (hour >= 5 && hour < 12) return "Good morning. Let's not waste today. 🌱";
  if (hour >= 12 && hour < 17) return "Still time to make today count.";
  if (hour >= 17 && hour < 21) return "Evening. Did you water your plant today?";
  return "Don't break your streak. Quick check-in before midnight.";
};

function formatCountdownToMidnightShort(date) {
  const midnight = new Date(date);
  midnight.setHours(24, 0, 0, 0);
  let ms = midnight.getTime() - date.getTime();
  if (ms < 0) ms = 0;
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const WILT_COLORS = [
  { stem: "#22c55e", leaf: "#22c55e", petal: "#86efac" },
  { stem: "#65a30d", leaf: "#84cc16", petal: "#bef264" },
  { stem: "#ca8a04", leaf: "#eab308", petal: "#fbbf24" },
  { stem: "#a16207", leaf: "#b45309", petal: "#d97706" },
];

function PlantSvg({ stage, wiltLevel = 0, className = "" }) {
  const colors = WILT_COLORS[Math.min(wiltLevel, 3)];
  const droopDeg = wiltLevel * 5;
  return (
    <svg
      viewBox="0 0 200 200"
      className={`plant-sway mx-auto block h-auto w-full max-w-[min(100%,280px)] ${className}`}
      role="img"
      aria-label={`Plant stage: ${stage.label}${wiltLevel > 0 ? `, wilting level ${wiltLevel}` : ""}`}
    >
      <ellipse cx="100" cy="166" rx="52" ry="11" fill="#111827" />
      <ellipse cx="100" cy="160" rx="38" ry="20" fill="#1f2937" />
      <g transform={droopDeg > 0 ? `rotate(${droopDeg}, 100, 152)` : undefined}>
        {stage.key === "day0" && <ellipse cx="100" cy="132" rx="14" ry="10" fill="#7c4a23" />}

        {stage.key === "day1" && (
          <>
            <ellipse cx="100" cy="132" rx="14" ry="10" fill="#7c4a23" />
            <rect x="99" y="122" width="2" height="10" rx="1" fill={colors.stem} />
          </>
        )}

        {stage.key === "day2" && (
          <>
            <ellipse cx="100" cy="134" rx="13" ry="9" fill="#7c4a23" />
            <rect x="98.8" y="112" width="2.4" height="22" rx="1.2" fill={colors.stem} />
            <path d="M100 118 C93 114, 90 106, 96 102 C101 104, 103 112, 100 118" fill={colors.leaf} />
          </>
        )}

        {(stage.key === "sprout" || stage.key === "small" || stage.key === "bloom") && (
          <rect x="98" y="100" width="4" height="52" rx="2" fill={colors.stem} />
        )}

        {stage.key === "sprout" && (
          <path d="M100 108 C88 102, 82 88, 91 82 C101 85, 105 99, 100 108" fill={colors.leaf} />
        )}

        {(stage.key === "sprout" || stage.key === "small" || stage.key === "bloom") && (
          <>
            <path d="M100 124 C88 116, 84 102, 94 95 C102 98, 106 112, 100 124" fill={colors.leaf} />
            <path d="M100 121 C112 113, 116 99, 106 92 C98 95, 94 110, 100 121" fill={colors.leaf} />
          </>
        )}

        {(stage.key === "small" || stage.key === "bloom") && (
          <>
            <path d="M100 112 C86 106, 80 90, 90 83 C101 86, 106 98, 100 112" fill={colors.leaf} />
            <path d="M100 110 C114 103, 120 87, 110 80 C99 84, 94 96, 100 110" fill={colors.leaf} />
          </>
        )}

        {stage.key === "bloom" && (
          <g className="petal-pulse" transform="translate(100 84)">
            <ellipse cx="0" cy="-16" rx="8" ry="13" fill={colors.petal} />
            <ellipse cx="13" cy="-7" rx="8" ry="13" transform="rotate(55)" fill={colors.petal} />
            <ellipse cx="13" cy="7" rx="8" ry="13" transform="rotate(115)" fill={colors.petal} />
            <ellipse cx="0" cy="16" rx="8" ry="13" fill={colors.petal} />
            <ellipse cx="-13" cy="7" rx="8" ry="13" transform="rotate(-115)" fill={colors.petal} />
            <ellipse cx="-13" cy="-7" rx="8" ry="13" transform="rotate(-55)" fill={colors.petal} />
            <circle cx="0" cy="0" r="7" fill={colors.stem} />
          </g>
        )}
      </g>
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
    hasCompletedStruggleQuestion: false,
    hasCompletedFocusOnboarding: false,
    failStruggle: null,
    focusArea: null,
    theme: "dark",
    celebratedStreak30: false,
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

    if (safe.hasCompletedFocusOnboarding === undefined) {
      safe.hasCompletedFocusOnboarding = true;
    }
    // Existing users who already finished onboarding skip the new struggle question
    if (safe.hasCompletedFocusOnboarding && safe.hasCompletedStruggleQuestion === false) {
      safe.hasCompletedStruggleQuestion = true;
    }

    return safe;
  } catch {
    return fallback;
  }
};

const PARTICLE_CONFIG = [
  { left: "12%", delay: "0s",    dur: "4.2s", drift: "8px"  },
  { left: "26%", delay: "1.1s",  dur: "5.0s", drift: "-6px" },
  { left: "42%", delay: "0.4s",  dur: "3.8s", drift: "10px" },
  { left: "58%", delay: "2.0s",  dur: "4.6s", drift: "-8px" },
  { left: "73%", delay: "0.8s",  dur: "5.3s", drift: "5px"  },
  { left: "87%", delay: "1.6s",  dur: "4.0s", drift: "-10px"},
];

function PlantParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
      {PARTICLE_CONFIG.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            bottom: "20%",
            left: p.left,
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 7px rgba(34,197,94,0.55)",
            animation: `particleFloat ${p.dur} ease-in-out ${p.delay} infinite`,
            "--drift": p.drift,
          }}
        />
      ))}
    </div>
  );
}

const CONFETTI_COLORS = ["#22c55e","#4ade80","#86efac","#fbbf24","#ffffff","#34d399","#a3e635"];

function Confetti({ onClose }) {
  const pieces = useMemo(() =>
    Array.from({ length: 38 }, (_, i) => ({
      id: i,
      left: `${(i / 38) * 100 + (Math.sin(i) * 8)}%`,
      delay: `${(i * 0.07) % 2}s`,
      dur: `${2.4 + (i % 7) * 0.3}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: `${5 + (i % 5) * 2}px`,
      round: i % 3 === 0,
    })),
  []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece pointer-events-none absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
          aria-hidden="true"
        />
      ))}
      <div className="relative z-10 mx-5 w-full max-w-xs rounded-2xl border border-[#22c55e]/40 bg-slate-900/98 p-8 text-center shadow-2xl">
        <div className="mb-3 text-4xl" aria-hidden="true">🌸</div>
        <h2 className="text-xl font-bold tracking-tight text-slate-100">30 days.</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          You&apos;re not the same person who started.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-[#4ade80]"
        >
          Keep going
        </button>
      </div>
    </div>
  );
}

function CheckInCalendar({ entries }) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const isToday = i === 0;
    const isFuture = false; // loop only goes to today
    days.push({ key, checked: Boolean(entries[key]), isToday, isFuture });
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  // Pad start so the first day falls on the right column
  const firstDayOfWeek = new Date(days[0].key).getDay();
  const padded = [...Array(firstDayOfWeek).fill(null), ...days];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {dayLabels.map((l, i) => (
          <span key={i} className="text-center text-[10px] text-slate-500">{l}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {padded.map((day, i) =>
          day === null ? (
            <div key={`pad-${i}`} />
          ) : (
            <div
              key={day.key}
              title={day.key}
              className={`aspect-square w-full rounded-sm ${
                day.checked
                  ? "bg-[#22c55e]"
                  : day.isToday
                    ? "border border-[#22c55e]/50 bg-transparent"
                    : "bg-slate-300/40 dark:bg-slate-700/50"
              }`}
            />
          )
        )}
      </div>
    </div>
  );
}

function App() {
  const today = dayKey();
  const [data, setData] = useState(getInitialData);
  const [showAbout, setShowAbout] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [taskFeedback, setTaskFeedback] = useState(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const feedbackRotateRef = useRef(0);
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
  const homeGreeting = useMemo(
    () => getHomeGreeting(clock.getHours(), data.failStruggle),
    [clock, data.failStruggle],
  );
  const midnightCountdownShort = useMemo(
    () => formatCountdownToMidnightShort(clock),
    [clock],
  );
  const showWaterWarning = !completedToday && clock.getHours() >= 21;
  const isLateNight = clock.getHours() >= 22;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    // 60s interval — countdown shows Xh Ym precision, greeting uses hours only
    const id = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!justCompleted) return;
    const t = setTimeout(() => setJustCompleted(false), 1400);
    return () => clearTimeout(t);
  }, [justCompleted]);

  const handleTaskToggle = (task) => {
    setForm((prev) => {
      const exists = prev.selectedTasks.includes(task);
      if (!exists) {
        const i = feedbackRotateRef.current % TASK_FEEDBACK_MESSAGES.length;
        feedbackRotateRef.current += 1;
        setTaskFeedback(TASK_FEEDBACK_MESSAGES[i]);
      }
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

      return {
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
    });
    setJustCompleted(true);
  };

  const handleStartJourney = () => {
    setData((prev) => ({
      ...prev,
      hasOnboarded: true,
    }));
  };

  const handleCloseConfetti = () => {
    setData((prev) => ({ ...prev, celebratedStreak30: true }));
  };

  const handleStruggleSelect = (struggle) => {
    setData((prev) => ({
      ...prev,
      failStruggle: struggle,
      hasCompletedStruggleQuestion: true,
    }));
  };

  const handleFocusSelect = (focus) => {
    setData((prev) => ({
      ...prev,
      focusArea: focus,
      hasCompletedFocusOnboarding: true,
    }));
  };

  const toggleTheme = () => {
    setData((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  };

  const handleShareToTwitter = () => {
    const text = `Day ${data.streak} on Bloom 🌱 ${plant.label}. Showing up daily. bloom-rust.vercel.app #focuswithfields`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer,width=550,height=420"
    );
  };

  const handleShareProgress = async () => {
    const shareText = `Day ${data.streak} on Bloom 🌱 Showing up daily and watching myself grow. Check it out: https://bloom-rust.vercel.app`;

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
          <PlantSvg stage={buildPlantStage(0)} wiltLevel={0} className="max-w-[220px]" />
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

  if (data.hasOnboarded && !data.hasCompletedStruggleQuestion) {
    const STRUGGLE_OPTIONS = [
      { id: "sleep", label: "😴 Sleep schedule" },
      { id: "phone", label: "📵 Phone addiction" },
      { id: "consistency", label: "🔁 Consistency" },
      { id: "focus", label: "🎯 Focus" },
    ];
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
          <PlantSvg stage={buildPlantStage(1)} wiltLevel={0} className="max-w-[180px]" />
          <h2 className={`mt-3 text-xl font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            What's the one thing you keep failing at?
          </h2>
          <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Be honest. That's where we'll focus first.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {STRUGGLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleStruggleSelect(opt.id)}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  isDarkMode
                    ? "border-slate-600 bg-slate-800 text-slate-200 hover:border-[#22c55e]/60 hover:bg-[#22c55e]/15 hover:text-[#bbf7d0]"
                    : "border-slate-300 bg-white text-slate-800 hover:border-[#22c55e]/50 hover:bg-[#22c55e]/10 hover:text-[#166534]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (data.hasOnboarded && data.hasCompletedStruggleQuestion && !data.hasCompletedFocusOnboarding) {
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
          <PlantSvg stage={buildPlantStage(0)} wiltLevel={0} className="max-w-[200px]" />
          <h2 className={`mt-2 text-xl font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            What do you want to focus on right now?
          </h2>
          <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            We&apos;ll highlight tasks that match your focus.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleFocusSelect("gym")}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition ${
                isDarkMode
                  ? "border-[#22c55e]/40 bg-[#22c55e]/15 text-[#bbf7d0] hover:bg-[#22c55e]/25"
                  : "border-[#22c55e]/35 bg-[#22c55e]/10 text-[#166534] hover:bg-[#22c55e]/20"
              }`}
            >
              Gym
            </button>
            <button
              type="button"
              onClick={() => handleFocusSelect("school")}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition ${
                isDarkMode
                  ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              School
            </button>
            <button
              type="button"
              onClick={() => handleFocusSelect("life")}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition ${
                isDarkMode
                  ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              Life reset
            </button>
          </div>
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

        <p className={`mb-2 text-center text-sm font-medium leading-snug ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
          {homeGreeting}
        </p>
        {showWaterWarning && (
          <p className="mb-3 text-center text-xs text-amber-400/95">
            ⚠️ Your plant is starting to wilt. Check in before midnight.
          </p>
        )}

        <div
          className={`relative mb-6 flex min-h-[min(64vh,540px)] flex-col overflow-hidden rounded-2xl border p-4 text-center shadow-[0_0_30px_rgba(34,197,94,0.18)] ${
            isDarkMode
              ? "border-[#22c55e]/25 bg-slate-800/60"
              : "border-[#22c55e]/30 bg-emerald-50/80"
          }`}
        >
          <PlantParticles />
          <div className="flex min-h-[min(42vh,320px)] flex-[1_1_40%] items-center justify-center py-3">
            <PlantSvg stage={plant} wiltLevel={data.plantWiltLevel} className="max-h-[min(48vh,340px)] max-w-[min(100%,340px)]" />
          </div>
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
          <div className="mt-3 px-2">
            {(() => {
              const wilt = data.plantWiltLevel;
              const healthPct = data.streak > 0 ? Math.max(8, 100 - wilt * 30) : Math.max(8, 33 - wilt * 11);
              const healthColor = wilt === 0 ? "#22c55e" : wilt === 1 ? "#eab308" : "#f87171";
              const healthLabel = wilt === 0 && data.streak > 0 ? "Healthy" : wilt === 0 ? "New" : wilt === 1 ? "Wilting" : wilt === 2 ? "Struggling" : "Critical";
              return (
                <>
                  <div className={`mb-1 flex items-center justify-between text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    <span>Plant health</span>
                    <span style={{ color: healthColor }}>{healthLabel}</span>
                  </div>
                  <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDarkMode ? "bg-slate-700/50" : "bg-slate-200"}`}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${healthPct}%`, background: healthColor }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
          <div className="mt-4 px-1">
            <p className={`mb-2 text-xs uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
              Last 4 weeks
            </p>
            <CheckInCalendar entries={data.entries} />
          </div>
        </div>

        <section>
          <h2 className={`text-lg font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>Today's check-in</h2>
          <p className={`mb-4 mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            The streak doesn&apos;t build itself. Two minutes. Let&apos;s go.
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
                <div className="flex min-h-[min(36vh,320px)] items-center justify-center py-2">
                  <PlantSvg
                    stage={plant}
                    wiltLevel={data.plantWiltLevel}
                    className={`max-h-[min(36vh,280px)] max-w-[min(100%,300px)]${justCompleted ? " plant-bloom-burst" : ""}`}
                  />
                </div>
                <p className="text-sm text-[#86efac]">
                  Check-in complete. Current streak:{" "}
                  <strong className="text-[#22c55e]">{data.streak}</strong>
                </p>
                <p className={`mt-2 text-sm font-medium ${isDarkMode ? "text-[#bbf7d0]" : "text-[#166534]"}`}>
                  Your plant is counting on you tomorrow. 🌱
                </p>
                <p className={`mt-3 tabular-nums transition-all ${
                  isLateNight
                    ? "text-base font-semibold text-amber-400"
                    : `text-sm ${isDarkMode ? "text-slate-200" : "text-slate-800"}`
                }`}>
                  Resets in: {midnightCountdownShort}{isLateNight ? " ⚠️" : " — Don't lose today"}
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
                <div className="mt-4 text-left">
                  <p className={`mb-2 text-xs uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
                    Last 4 weeks
                  </p>
                  <CheckInCalendar entries={data.entries} />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleShareProgress}
                    className={`flex-1 rounded-lg border border-[#22c55e]/50 bg-gradient-to-r from-[#22c55e]/25 to-[#4ade80]/25 px-3 py-2 text-sm font-semibold transition hover:from-[#22c55e]/35 hover:to-[#4ade80]/35 ${
                      isDarkMode ? "text-[#bbf7d0]" : "text-[#166534]"
                    }`}
                  >
                    Share 🌱
                  </button>
                  <button
                    type="button"
                    onClick={handleShareToTwitter}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-slate-100"
                        : "border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Post on X
                  </button>
                </div>
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
              <p className={`text-center text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                You&apos;re someone who shows up.
              </p>
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
                {taskFeedback && (
                  <p className={`mb-2 text-center text-xs ${isDarkMode ? "text-[#86efac]" : "text-[#166534]"}`}>
                    {taskFeedback}
                  </p>
                )}
                <div className="flex flex-wrap items-start gap-2">
                  {TASK_OPTIONS.map((task) => {
                    const selected = form.selectedTasks.includes(task.id);
                    const highlighted = isTaskHighlightedForFocus(task.id, data.focusArea);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleTaskToggle(task.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          selected
                            ? "border-[#22c55e] bg-[#22c55e]/20 text-[#86efac]"
                            : highlighted
                              ? isDarkMode
                                ? "border-[#22c55e]/70 bg-[#22c55e]/10 text-[#bbf7d0] ring-1 ring-[#22c55e]/40"
                                : "border-[#22c55e]/60 bg-[#22c55e]/10 text-[#166534] ring-1 ring-[#22c55e]/35"
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
      {data.streak >= 30 && !data.celebratedStreak30 && (
        <Confetti onClose={handleCloseConfetti} />
      )}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className={`w-full max-w-sm overflow-y-auto rounded-2xl border p-5 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`} style={{ maxHeight: "90dvh" }}>
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
            <a
              href="https://fields1work.github.io"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-[#22c55e] underline underline-offset-2"
            >
              All my links →
            </a>
            <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-slate-50"}`}>
              <p className={`mb-2 text-xs uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                Recommended tools
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://www.amazon.com/dp/0735211299?tag=focuswithfiel-20"
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-700/50 text-slate-300 hover:text-slate-100"
                      : "border-slate-300 bg-white text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <span>📖</span>
                  <span>Atomic Habits — James Clear</span>
                </a>
                <a
                  href="https://www.amazon.com/dp/B00JGFQTD2?tag=focuswithfiel-20"
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-700/50 text-slate-300 hover:text-slate-100"
                      : "border-slate-300 bg-white text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <span>📵</span>
                  <span>Phone lock box (kSafe)</span>
                </a>
                <a
                  href="https://www.amazon.com/dp/B001NCDE44?tag=focuswithfiel-20"
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-700/50 text-slate-300 hover:text-slate-100"
                      : "border-slate-300 bg-white text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <span>💧</span>
                  <span>32 oz water bottle (Nalgene)</span>
                </a>
              </div>
            </div>
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
