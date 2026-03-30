import { useEffect, useMemo, useRef, useState } from "react";
import { playTap, playBloom, playStreak } from "./sounds.js";

const STORAGE_KEY = "bloom-data-v1";
const TASK_OPTIONS = [
  { id: "drink-water",   label: "💧 Drink water" },
  { id: "gym-workout",   label: "🏋️ Move your body (even 10 min counts)" },
  { id: "study-read",    label: "📚 Study / read" },
  { id: "meal-prep",     label: "🍳 Meal prep" },
  { id: "walk-outside",  label: "🚶 Step outside for 5 min" },
  { id: "sleep-on-time", label: "😴 Sleep on time" },
  { id: "no-phone-30",   label: "📵 No phone first 30 min" },
  { id: "meditate",      label: "🧘 Breathe for 2 minutes" },
  { id: "journal",       label: "📝 Journal" },
  { id: "plan-tomorrow", label: "✅ Write tomorrow's one task (30 sec)" },
];

const FOCUS_TASK_IDS = {
  gym:    ["gym-workout", "walk-outside", "drink-water", "meditate"],
  school: ["study-read", "journal", "plan-tomorrow", "drink-water"],
  life:   ["meal-prep", "sleep-on-time", "meditate", "journal", "no-phone-30", "plan-tomorrow"],
};

const TASK_FEEDBACK_MESSAGES = [
  "Nice. Your plant liked that.",
  "That counted.",
  "Keep going.",
];

// Phase 4 — identity line cycles by day of week
const IDENTITY_LINES = [
  "You're someone who resets.",
  "You showed up again.",
  "This is how you change your days.",
  "You're still here. That's everything.",
  "Most people quit. You didn't.",
];

// Phase 9 — occasional identity statements (every 3rd day)
const IDENTITY_STATEMENTS = [
  "People who show up daily change their lives.",
  "This is what discipline looks like.",
  "You're building the person you want to be.",
];

// Phase 9 — streak milestone identity unlocks
const MILESTONE_MESSAGES = {
  3:  "You're someone who doesn't skip twice.",
  7:  "You follow through.",
  14: "You're building something real.",
  30: "You're not the same person who started.",
};

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

// Phase 6 — updated thresholds
const buildPlantStage = (streak) => {
  if (streak >= 14) return { key: "bloom",  label: "Full Bloom" };
  if (streak >= 7)  return { key: "small",  label: "Small Plant" };
  if (streak >= 3)  return { key: "sprout", label: "Sprout" };
  if (streak === 2) return { key: "day2",   label: "Small Sprout" };
  if (streak === 1) return { key: "day1",   label: "Seed Awakening" };
  return { key: "day0", label: "Seed" };
};

const getMotivationMessage = (streak) => {
  if (streak >= 14) return `Day ${streak} — you're in full bloom`;
  if (streak >= 7)  return `Day ${streak} — your plant is growing`;
  if (streak >= 1)  return `Day ${streak} — every bloom starts here`;
  return "Day 0 — plant your first check-in";
};

// Phase 4 — updated celebration messages with plantName support
const getCelebrationMessage = (streak, plantName) => {
  const name = plantName || "your plant";
  if (streak >= 14) return "You're not the same person who started.";
  if (streak >= 7)  return "One week. Most people quit by now.";
  if (streak >= 2)  return `Day ${streak}. You're still here.`;
  return "You showed up. That's the whole game.";
};

// Phase 9 — plant name messaging
const getPlantMessage = (plantName, streak) => {
  const name = plantName || "your plant";
  const msgs = [
    `${name} felt that.`,
    `${name} is counting on tomorrow.`,
    `${name} is proud of you.`,
  ];
  return msgs[streak % msgs.length];
};

const getHomeGreeting = (hour, failStruggle) => {
  if (failStruggle === "sleep") {
    if (hour >= 5 && hour < 12) return "You got up. That's already the hardest part. Check in.";
    if (hour >= 12 && hour < 17) return "Afternoon. Set your stop time tonight and stick to it.";
    if (hour >= 17 && hour < 21) return "Wind down on time tonight. Your streak starts in the morning.";
    return "Log today before you sleep. One less reason to break the chain.";
  }
  if (failStruggle === "phone") {
    if (hour >= 5 && hour < 12) return "Phone down. Bloom first. Scroll later.";
    if (hour >= 12 && hour < 17) return "Midday check-in before the scroll takes over.";
    if (hour >= 17 && hour < 21) return "Two minutes here beats two hours on your phone.";
    return "Last thing before you scroll — check in. Keep the streak.";
  }
  if (failStruggle === "consistency") {
    if (hour >= 5 && hour < 12) return "Consistent people check in every morning. You're consistent.";
    if (hour >= 12 && hour < 17) return "Consistency isn't a feeling. It's a choice. Make it now.";
    if (hour >= 17 && hour < 21) return "You showed up yesterday. Show up today. That's all it is.";
    return "Streak on the line. One check-in. Two minutes. Do it.";
  }
  if (failStruggle === "focus") {
    if (hour >= 5 && hour < 12) return "One screen. One task. Everything else waits.";
    if (hour >= 12 && hour < 17) return "Halfway through. What's the one thing still left today?";
    if (hour >= 17 && hour < 21) return "Evening reset. What did you actually finish?";
    return "Close the tabs. Check in. Ship tomorrow.";
  }
  if (hour >= 5 && hour < 12) return "The streak doesn't build itself. Two minutes.";
  if (hour >= 12 && hour < 17) return "Still time to make today count.";
  if (hour >= 17 && hour < 21) return "Evening. Did you water your plant today?";
  return "Don't break your streak. Quick check-in before midnight.";
};

// Phase 9 — every 3rd day replace greeting with identity statement
const getDayOfYear = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
};

const getEffectiveGreeting = (hour, failStruggle, streak) => {
  const doy = getDayOfYear();
  if (streak > 0 && doy % 3 === 0) {
    return IDENTITY_STATEMENTS[Math.floor(doy / 3) % IDENTITY_STATEMENTS.length];
  }
  return getHomeGreeting(hour, failStruggle);
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

// Phase 2 — updated wilt colors (no amber/yellow/brown, green-tinted greys)
const WILT_COLORS = [
  { stem: "#7db84a", leaf: "#7db84a", petal: "#a8d470" },
  { stem: "#5a8a38", leaf: "#6a9f42", petal: "#8fc060" },
  { stem: "#3d6028", leaf: "#4a7030", petal: "#608040" },
  { stem: "#2a4020", leaf: "#334a28", petal: "#435830" },
];

// ── Phase 1 — Plant SVG with face ─────────────────────────────────────────────
function PlantSvg({ stage, wiltLevel = 0, className = "", animClass = "plant-sway" }) {
  const colors = WILT_COLORS[Math.min(wiltLevel, 3)];
  const droopDeg = wiltLevel * 5;
  const isHealthy = wiltLevel === 0;
  const EC = "#1a3a08"; // eye color

  // Inline face renderer — all coords in SVG space
  const Face = ({ lx, rx, ey, er, sy }) => (
    <g>
      <circle cx={lx} cy={ey} r={er} fill={EC} opacity="0.88" />
      <circle cx={rx} cy={ey} r={er} fill={EC} opacity="0.88" />
      {wiltLevel > 0 && (
        <>
          <line x1={lx-2.5} y1={ey-er-1.5} x2={lx+1.5} y2={ey-er-3.5}
            stroke={EC} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <line x1={rx+2.5} y1={ey-er-1.5} x2={rx-1.5} y2={ey-er-3.5}
            stroke={EC} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        </>
      )}
      <path
        d={isHealthy
          ? `M${lx-2} ${sy} Q${(lx+rx)/2} ${sy+3.5} ${rx+2} ${sy}`
          : `M${lx-2} ${sy+3} Q${(lx+rx)/2} ${sy}     ${rx+2} ${sy+3}`
        }
        stroke={EC} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85"
      />
    </g>
  );

  return (
    <svg
      viewBox="0 0 200 200"
      className={`mx-auto block h-auto w-full max-w-[min(100%,280px)] ${animClass} ${className}`}
      role="img"
      aria-label={`Plant: ${stage.label}${wiltLevel > 0 ? `, wilting` : ""}`}
    >
      {/* Pot */}
      <ellipse cx="100" cy="166" rx="52" ry="11" fill="#0e1a0e" />
      <ellipse cx="100" cy="160" rx="38" ry="20" fill="#182818" />

      <g transform={droopDeg > 0 ? `rotate(${droopDeg}, 100, 152)` : undefined}>
        {/* day0 — seed, no face */}
        {stage.key === "day0" && (
          <ellipse cx="100" cy="132" rx="14" ry="10" fill="#5a3820" />
        )}

        {/* day1 — bud with face */}
        {stage.key === "day1" && (
          <>
            <ellipse cx="100" cy="132" rx="14" ry="10" fill="#5a3820" />
            <rect x="99" y="122" width="2" height="10" rx="1" fill={colors.stem} />
            <Face lx={95} rx={105} ey={129} er={1.5} sy={133} />
          </>
        )}

        {/* day2 — small bud + single leaf + face */}
        {stage.key === "day2" && (
          <>
            <ellipse cx="100" cy="134" rx="13" ry="9" fill="#5a3820" />
            <rect x="98.8" y="112" width="2.4" height="22" rx="1.2" fill={colors.stem} />
            <path d="M100 118 C93 114, 90 106, 96 102 C101 104, 103 112, 100 118" fill={colors.leaf} />
            <Face lx={94} rx={106} ey={131} er={1.5} sy={135} />
          </>
        )}

        {/* stem shared by sprout / small / bloom */}
        {(stage.key === "sprout" || stage.key === "small" || stage.key === "bloom") && (
          <rect x="98" y="100" width="4" height="52" rx="2" fill={colors.stem} />
        )}

        {/* sprout-only leaf */}
        {stage.key === "sprout" && (
          <path d="M100 108 C88 102, 82 88, 91 82 C101 85, 105 99, 100 108" fill={colors.leaf} />
        )}

        {/* shared leaves sprout / small / bloom */}
        {(stage.key === "sprout" || stage.key === "small" || stage.key === "bloom") && (
          <>
            <path d="M100 124 C88 116, 84 102, 94 95  C102 98,  106 112, 100 124" fill={colors.leaf} />
            <path d="M100 121 C112 113, 116 99, 106 92 C98  95,  94  110, 100 121" fill={colors.leaf} />
          </>
        )}

        {/* extra leaves small / bloom */}
        {(stage.key === "small" || stage.key === "bloom") && (
          <>
            <path d="M100 112 C86  106, 80  90, 90  83 C101 86, 106 98,  100 112" fill={colors.leaf} />
            <path d="M100 110 C114 103, 120 87, 110 80 C99  84, 94  96,  100 110" fill={colors.leaf} />
          </>
        )}

        {/* sprout head node + face (rendered on top of leaves) */}
        {stage.key === "sprout" && (
          <>
            <circle cx="100" cy="97" r="6.5" fill={colors.stem} />
            <Face lx={96} rx={104} ey={96} er={1.5} sy={99} />
          </>
        )}

        {/* small head node + face */}
        {stage.key === "small" && (
          <>
            <circle cx="100" cy="94" r="7" fill={colors.stem} />
            <Face lx={95.5} rx={104.5} ey={93} er={1.8} sy={96.5} />
          </>
        )}

        {/* bloom — petals + center face (in local group) */}
        {stage.key === "bloom" && (
          <g className="petal-pulse" transform="translate(100 84)">
            <ellipse cx="0"   cy="-16" rx="8" ry="13" fill={colors.petal} />
            <ellipse cx="13"  cy="-7"  rx="8" ry="13" transform="rotate(55)"   fill={colors.petal} />
            <ellipse cx="13"  cy="7"   rx="8" ry="13" transform="rotate(115)"  fill={colors.petal} />
            <ellipse cx="0"   cy="16"  rx="8" ry="13" fill={colors.petal} />
            <ellipse cx="-13" cy="7"   rx="8" ry="13" transform="rotate(-115)" fill={colors.petal} />
            <ellipse cx="-13" cy="-7"  rx="8" ry="13" transform="rotate(-55)"  fill={colors.petal} />
            <circle cx="0" cy="0" r="7" fill={colors.stem} />
            {/* Face in local bloom coords */}
            <circle cx="-3.5" cy="-1" r="1.8" fill={EC} opacity="0.88" />
            <circle cx="3.5"  cy="-1" r="1.8" fill={EC} opacity="0.88" />
            {wiltLevel > 0 ? (
              <>
                <line x1="-6" y1="-4" x2="-2" y2="-6" stroke={EC} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <line x1="6"  y1="-4" x2="2"  y2="-6" stroke={EC} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <path d="M-4 3 Q0 1 4 3"  stroke={EC} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.85" />
              </>
            ) : (
              <path d="M-4 2 Q0 5.5 4 2" stroke={EC} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.85" />
            )}
          </g>
        )}
      </g>
    </svg>
  );
}

// ── getInitialData ────────────────────────────────────────────────────────────
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
    plantName: null,         // Phase 9
    shownMilestones: [],     // Phase 9
  };

  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    const safe = {
      ...fallback,
      ...parsed,
      entries: parsed.entries ?? {},
      shownMilestones: parsed.shownMilestones ?? [],
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
    // Existing users who already finished onboarding skip the struggle question
    if (safe.hasCompletedFocusOnboarding && safe.hasCompletedStruggleQuestion === false) {
      safe.hasCompletedStruggleQuestion = true;
    }

    return safe;
  } catch {
    return fallback;
  }
};

// ── PlantParticles ─────────────────────────────────────────────────────────────
const PARTICLE_CONFIG = [
  { left: "12%", delay: "0s",   dur: "4.2s", drift: "8px"   },
  { left: "26%", delay: "1.1s", dur: "5.0s", drift: "-6px"  },
  { left: "42%", delay: "0.4s", dur: "3.8s", drift: "10px"  },
  { left: "58%", delay: "2.0s", dur: "4.6s", drift: "-8px"  },
  { left: "73%", delay: "0.8s", dur: "5.3s", drift: "5px"   },
  { left: "87%", delay: "1.6s", dur: "4.0s", drift: "-10px" },
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
            background: "#7db84a",
            boxShadow: "0 0 7px rgba(125,184,74,0.55)",
            animation: `particleFloat ${p.dur} ease-in-out ${p.delay} infinite`,
            "--drift": p.drift,
          }}
        />
      ))}
    </div>
  );
}

// ── Confetti (30-day easter egg) ───────────────────────────────────────────────
const CONFETTI_COLORS = ["#7db84a","#a8d470","#c5e8a0","#d4ebb8","#ffffff","#8fd862","#b8e890"];

function Confetti({ onClose }) {
  const pieces = useMemo(() =>
    Array.from({ length: 38 }, (_, i) => ({
      id:    i,
      left:  `${(i / 38) * 100 + Math.sin(i) * 8}%`,
      delay: `${(i * 0.07) % 2}s`,
      dur:   `${2.4 + (i % 7) * 0.3}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size:  `${5 + (i % 5) * 2}px`,
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
            left: p.left, width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: p.delay, animationDuration: p.dur,
          }}
          aria-hidden="true"
        />
      ))}
      <div className="relative z-10 mx-5 w-full max-w-xs rounded-2xl border border-[#7db84a]/40 bg-[#131819]/98 p-8 text-center shadow-2xl">
        <div className="mb-3 text-4xl" aria-hidden="true">🌸</div>
        <h2 className="text-xl font-bold tracking-tight text-[#e8e4dc]">30 days.</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#7a8a80]">
          You&apos;re not the same person who started.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#7db84a] px-4 py-2.5 text-sm font-semibold text-[#0e1112] transition hover:bg-[#a8d470]"
        >
          Keep going
        </button>
      </div>
    </div>
  );
}

// ── CheckInCalendar ────────────────────────────────────────────────────────────
function CheckInCalendar({ entries }) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, checked: Boolean(entries[key]), isToday: i === 0 });
  }

  const dayLabels = ["S","M","T","W","T","F","S"];
  const firstDayOfWeek = new Date(days[0].key).getDay();
  const padded = [...Array(firstDayOfWeek).fill(null), ...days];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {dayLabels.map((l, i) => (
          <span key={i} className="text-center text-[10px] text-[#3a4a40]">{l}</span>
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
                  ? "bg-[#7db84a]"
                  : day.isToday
                    ? "border border-[#7db84a]/50 bg-transparent"
                    : "bg-[#1a2022]"
              }`}
            />
          )
        )}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const today = dayKey();
  const [data, setData]                       = useState(getInitialData);
  const [showAbout, setShowAbout]             = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [clock, setClock]                     = useState(() => new Date());
  const [taskFeedback, setTaskFeedback]       = useState(null);
  const [justCompleted, setJustCompleted]     = useState(false);
  const feedbackRotateRef                     = useRef(0);

  // Phase 1 / 3 — plant animation class (sway default, wiggle on tap/submit)
  const [plantAnimClass, setPlantAnimClass]   = useState("plant-sway");

  // Phase 3 — streak glow ring + growth burst
  const [showStreakGlow, setShowStreakGlow]   = useState(false);
  const [showGrowthBurst, setShowGrowthBurst] = useState(false);

  // Phase 8 — completion ritual
  const [ritualStep, setRitualStep]           = useState(0); // 0=idle 1=overlay 2=text 3=fade

  // Phase 9 — milestone banner
  const [milestoneBanner, setMilestoneBanner] = useState(null);
  const [milestoneFading, setMilestoneFading] = useState(false);
  const milestoneFiredRef                     = useRef(new Set(data.shownMilestones));

  // Phase 7 — "reset starts now" one-time message
  const [showResetMsg, setShowResetMsg]       = useState(false);

  // Plant naming input (Phase 9)
  const [plantNameInput, setPlantNameInput]   = useState("");

  const [form, setForm] = useState({
    drained: "",
    oneTask: "",
    stoppingTime: "",
    selectedTasks: [],
  });

  const todayEntry              = data.entries[today];
  const completedToday          = Boolean(todayEntry);
  const selectedTaskLabelsToday = (todayEntry?.selectedTasks ?? [])
    .map((id) => TASK_OPTIONS.find((o) => o.id === id)?.label)
    .filter(Boolean);
  const isFormReady  = form.drained.trim().length > 0 && form.oneTask.trim().length > 0 && form.stoppingTime.trim().length > 0;
  const isDarkMode   = data.theme !== "light";

  const plant            = useMemo(() => buildPlantStage(data.streak), [data.streak]);
  const motivationMsg    = useMemo(() => getMotivationMessage(data.streak), [data.streak]);
  const celebrationMsg   = useMemo(() => getCelebrationMessage(data.streak, data.plantName), [data.streak, data.plantName]);
  const homeGreeting     = useMemo(() => getEffectiveGreeting(clock.getHours(), data.failStruggle, data.streak), [clock, data.failStruggle, data.streak]);
  const identityLine     = IDENTITY_LINES[new Date().getDay() % 5];
  const plantMsg         = useMemo(() => getPlantMessage(data.plantName, data.streak), [data.plantName, data.streak]);
  const midnightShort    = useMemo(() => formatCountdownToMidnightShort(clock), [clock]);
  const showWaterWarning = !completedToday && clock.getHours() >= 21;
  const isLateNight      = clock.getHours() >= 22;

  // Phase 6 — glow class based on streak
  const streakGlowClass = data.streak >= 30 ? "plant-glow-bloom" : data.streak >= 15 ? "plant-glow-subtle" : "";

  // Phase 7 — breathing speed + saturation when wilting
  const breatheClass = data.plantWiltLevel > 0 ? "plant-breathe-slow" : "plant-breathe";
  const wiltFilter   = data.plantWiltLevel > 0 ? { filter: "saturate(0.6)" } : {};

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // 60s clock
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // justCompleted cleanup
  useEffect(() => {
    if (!justCompleted) return;
    const t = setTimeout(() => setJustCompleted(false), 1400);
    return () => clearTimeout(t);
  }, [justCompleted]);

  // Phase 9 — milestone banner watcher
  useEffect(() => {
    const milestones = [3, 7, 14, 30];
    const hit = milestones.find(
      (m) => data.streak === m && !milestoneFiredRef.current.has(m)
    );
    if (!hit) return;
    milestoneFiredRef.current.add(hit);
    setMilestoneBanner(MILESTONE_MESSAGES[hit]);
    setMilestoneFading(false);
    const fadeT  = setTimeout(() => setMilestoneFading(true), 3000);
    const clearT = setTimeout(() => {
      setMilestoneBanner(null);
      setMilestoneFading(false);
      setData((prev) => ({
        ...prev,
        shownMilestones: [...(prev.shownMilestones || []), hit],
      }));
    }, 3400);
    return () => { clearTimeout(fadeT); clearTimeout(clearT); };
  }, [data.streak]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const triggerWiggle = (big = false) => {
    const cls = big ? "plant-wiggle-big" : "plant-wiggle";
    setPlantAnimClass(cls);
    setTimeout(() => setPlantAnimClass("plant-sway"), big ? 600 : 400);
  };

  const handleTaskToggle = (task) => {
    playTap();
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
    triggerWiggle(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.drained.trim() || !form.oneTask.trim() || !form.stoppingTime) return;

    // Compute next streak / wilt outside setData so we can read values
    const prevDate = data.lastCheckInDate;
    const diff     = prevDate ? isoDiffDays(prevDate, today) : null;
    let nextStreak = data.streak;
    let nextWilt   = data.plantWiltLevel;

    if (!prevDate)     { nextStreak = 1; }
    else if (diff === 0)  { /* same day — no change */ }
    else if (diff === 1)  { nextStreak = data.streak + 1; nextWilt = Math.max(0, data.plantWiltLevel - 1); }
    else if (diff > 1)    { nextStreak = 1; nextWilt = Math.min(3, data.plantWiltLevel + (diff - 1)); }

    const streakWentUp  = nextStreak > data.streak;
    const THRESHOLDS    = [4, 8, 15, 30];
    const crossedGrowth = THRESHOLDS.some((t) => data.streak < t && nextStreak >= t);
    const missedDay     = diff != null && diff > 1;

    setData((prev) => ({
      ...prev,
      entries: { ...prev.entries, [today]: { ...form, createdAt: new Date().toISOString() } },
      streak:         nextStreak,
      bestStreak:     Math.max(prev.bestStreak, nextStreak),
      plantWiltLevel: nextWilt,
      lastCheckInDate: today,
    }));

    // Sound + glow
    playBloom();
    if (streakWentUp) {
      playStreak();
      setShowStreakGlow(true);
      setTimeout(() => setShowStreakGlow(false), 800);
    }
    if (crossedGrowth) {
      setShowGrowthBurst(true);
      setTimeout(() => setShowGrowthBurst(false), 1000);
    }
    if (missedDay) {
      setShowResetMsg(true);
      setTimeout(() => setShowResetMsg(false), 4000);
    }

    // Phase 8 — completion ritual sequence
    setRitualStep(1);
    setTimeout(() => setRitualStep(2), 300);
    setTimeout(() => setRitualStep(3), 1200);
    setTimeout(() => {
      setRitualStep(0);
      setJustCompleted(true);
      triggerWiggle(true);
    }, 1500);
  };

  const handleStartJourney = () => {
    setData((prev) => ({ ...prev, hasOnboarded: true }));
  };

  const handleCloseConfetti = () => {
    setData((prev) => ({ ...prev, celebratedStreak30: true }));
  };

  const handleStruggleSelect = (struggle) => {
    setData((prev) => ({ ...prev, failStruggle: struggle, hasCompletedStruggleQuestion: true }));
  };

  const handleFocusSelect = (focus) => {
    setData((prev) => ({ ...prev, focusArea: focus, hasCompletedFocusOnboarding: true }));
  };

  const handleNamePlant = () => {
    const name = plantNameInput.trim();
    if (!name) return;
    setData((prev) => ({ ...prev, plantName: name }));
  };

  const toggleTheme = () => {
    setData((prev) => ({ ...prev, theme: prev.theme === "light" ? "dark" : "light" }));
  };

  const handleShareToTwitter = () => {
    const text = `Day ${data.streak} on Bloom 🌱 ${plant.label}. Showing up daily. bloom-rust.vercel.app #focuswithfields`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank", "noopener,noreferrer,width=550,height=420"
    );
  };

  const handleShareProgress = async () => {
    const shareText = `Day ${data.streak} on Bloom 🌱 Showing up daily and watching myself grow. Check it out: https://bloom-rust.vercel.app`;
    try {
      if (navigator.share) { await navigator.share({ text: shareText }); return; }
    } catch { /* fall through */ }
    try {
      await navigator.clipboard.writeText(shareText);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 1800);
    } catch {
      window.prompt("Copy your progress text:", shareText);
    }
  };

  // ── Onboarding: welcome ────────────────────────────────────────────────────
  if (!data.hasOnboarded) {
    return (
      <main className={`mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6 sm:px-6 bg-[#0e1112] text-[#e8e4dc]`}>
        <section className="onboarding-fade w-full rounded-3xl border border-[#7db84a]/25 bg-[#131819] p-6 text-center shadow-2xl shadow-black/40">
          <PlantSvg stage={buildPlantStage(0)} wiltLevel={0} className="max-w-[220px]" animClass="onboarding-pulse" />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#e8e4dc]" style={{ letterSpacing: "-0.2px" }}>
            Bloom <span aria-hidden="true">🌱</span>
          </h1>
          <p className="mt-2 text-sm text-[#7a8a80]">Show up daily. Watch yourself grow.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-[#3a4a40] bg-[#1a2022] px-2.5 py-1 text-xs text-[#7a8a80]">🌱 Daily check-ins</span>
            <span className="rounded-full border border-[#3a4a40] bg-[#1a2022] px-2.5 py-1 text-xs text-[#7a8a80]">🔥 Streak tracking</span>
            <span className="rounded-full border border-[#3a4a40] bg-[#1a2022] px-2.5 py-1 text-xs text-[#7a8a80]">📵 Beat phone addiction</span>
          </div>
          <button
            type="button"
            onClick={handleStartJourney}
            className="onboarding-pulse mt-6 w-full rounded-xl bg-[#7db84a] px-4 py-2.5 text-sm font-medium text-[#0e1112] transition hover:bg-[#a8d470]"
          >
            Start my journey
          </button>
          <p className="mt-2 text-xs text-[#3a4a40]">Join others building better habits</p>
        </section>
      </main>
    );
  }

  // ── Onboarding: struggle question ─────────────────────────────────────────
  if (data.hasOnboarded && !data.hasCompletedStruggleQuestion) {
    const STRUGGLE_OPTIONS = [
      { id: "sleep",       label: "😴 Sleep schedule" },
      { id: "phone",       label: "📵 Phone addiction" },
      { id: "consistency", label: "🔁 Consistency" },
      { id: "focus",       label: "🎯 Focus" },
    ];
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6 sm:px-6 bg-[#0e1112] text-[#e8e4dc]">
        <section className="onboarding-fade w-full rounded-3xl border border-[#7db84a]/25 bg-[#131819] p-6 text-center shadow-2xl shadow-black/40">
          <PlantSvg stage={buildPlantStage(1)} wiltLevel={0} className="max-w-[180px]" animClass="onboarding-pulse" />
          <h2 className="mt-3 text-xl font-semibold text-[#e8e4dc]" style={{ letterSpacing: "-0.2px" }}>
            What's the one thing you keep failing at?
          </h2>
          <p className="mt-2 text-sm text-[#7a8a80]">Be honest. That's where we'll focus first.</p>
          <div className="mt-5 flex flex-col gap-2">
            {STRUGGLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleStruggleSelect(opt.id)}
                className="w-full rounded-xl border border-[#3a4a40] bg-[#1a2022] px-4 py-3 text-sm font-medium text-[#7a8a80] transition hover:border-[#7db84a]/60 hover:bg-[#7db84a]/15 hover:text-[#a8d470]"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  // ── Onboarding: focus area ─────────────────────────────────────────────────
  if (data.hasOnboarded && data.hasCompletedStruggleQuestion && !data.hasCompletedFocusOnboarding) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6 sm:px-6 bg-[#0e1112] text-[#e8e4dc]">
        <section className="onboarding-fade w-full rounded-3xl border border-[#7db84a]/25 bg-[#131819] p-6 text-center shadow-2xl shadow-black/40">
          <PlantSvg stage={buildPlantStage(0)} wiltLevel={0} className="max-w-[200px]" animClass="onboarding-pulse" />
          <h2 className="mt-2 text-xl font-semibold text-[#e8e4dc]" style={{ letterSpacing: "-0.2px" }}>
            What do you want to focus on right now?
          </h2>
          <p className="mt-2 text-sm text-[#7a8a80]">We&apos;ll highlight tasks that match your focus.</p>
          <div className="mt-6 flex flex-col gap-2">
            {[
              { id: "gym",    label: "Gym",         accent: true },
              { id: "school", label: "School",       accent: false },
              { id: "life",   label: "Life reset",   accent: false },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFocusSelect(opt.id)}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  opt.accent
                    ? "border-[#7db84a]/40 bg-[#7db84a]/15 text-[#a8d470] hover:bg-[#7db84a]/25"
                    : "border-[#3a4a40] bg-[#1a2022] text-[#7a8a80] hover:bg-[#1a2022]/80"
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

  // ── Onboarding: plant naming (Phase 9 — REQUIRED) ─────────────────────────
  if (data.hasOnboarded && data.hasCompletedStruggleQuestion && data.hasCompletedFocusOnboarding && !data.plantName) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4 py-6 sm:px-6 bg-[#0e1112] text-[#e8e4dc]">
        <section className="onboarding-fade w-full rounded-3xl border border-[#7db84a]/25 bg-[#131819] p-6 text-center shadow-2xl shadow-black/40">
          <PlantSvg stage={buildPlantStage(0)} wiltLevel={0} className="max-w-[200px]" animClass="onboarding-pulse" />
          <h2 className="mt-3 text-xl font-semibold text-[#e8e4dc]" style={{ letterSpacing: "-0.2px" }}>
            Name your plant.
          </h2>
          <p className="mt-2 text-sm text-[#7a8a80]">
            It'll be with you every day. Make it personal.
          </p>
          <input
            type="text"
            value={plantNameInput}
            onChange={(e) => setPlantNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleNamePlant(); }}
            placeholder="e.g. Sprout, Kobe, Rex..."
            maxLength={24}
            autoFocus
            className="mt-5 w-full rounded-xl border border-[#3a4a40] bg-[#1a2022] px-4 py-3 text-center text-sm text-[#e8e4dc] outline-none transition focus:border-[#7db84a]/60 focus:ring-1 focus:ring-[#7db84a]/30"
          />
          <button
            type="button"
            onClick={handleNamePlant}
            disabled={!plantNameInput.trim()}
            className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              plantNameInput.trim()
                ? "bg-[#7db84a] text-[#0e1112] hover:bg-[#a8d470]"
                : "bg-[#1a2022] text-[#3a4a40] cursor-not-allowed"
            }`}
          >
            Let&apos;s grow
          </button>
        </section>
      </main>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <main className={`mx-auto min-h-screen w-full max-w-[390px] px-4 py-6 sm:px-6 ${isDarkMode ? "bg-[#0e1112] text-[#e8e4dc]" : "bg-[#f4f6f4] text-[#1a2a1a]"}`}>

      {/* Phase 8 — completion ritual overlay */}
      {ritualStep > 0 && (
        <div
          className={`fixed inset-0 z-40 flex items-center justify-center ${ritualStep === 3 ? "ritual-overlay-out" : "ritual-overlay-in"}`}
          style={{ background: "rgba(0,0,0,0.3)", pointerEvents: "none" }}
        >
          {ritualStep === 2 && (
            <p className="ritual-text-in" style={{
              color: "#e8e4dc",
              fontSize: "28px",
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.2px",
            }}>
              Day complete.
            </p>
          )}
        </div>
      )}

      <section className={`rounded-3xl border p-6 shadow-2xl ${isDarkMode ? "border-[#7db84a]/20 bg-[#131819] shadow-black/30" : "border-[#7db84a]/30 bg-white/95 shadow-[#7db84a]/10"}`}>

        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7db84a]/80">Bloom</p>
            <h1 className="text-2xl font-semibold text-[#e8e4dc]" style={{ letterSpacing: "-0.2px" }}>
              {data.plantName ? data.plantName : "Bloom"} <span aria-hidden="true">🌱</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full border border-[#7db84a]/30 bg-[#7db84a]/10 px-3 py-1 text-xs text-[#a8d470] transition hover:bg-[#7db84a]/20"
          >
            {isDarkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </header>

        {/* Greeting — Phase 3 load animation, Phase 4 identity line */}
        <p className="greeting-fade-in mb-1 text-center text-sm font-medium leading-snug text-[#e8e4dc]">
          {homeGreeting}
        </p>
        <p className="greeting-fade-in mb-2 text-center text-xs text-[#7a8a80]">
          {identityLine}
        </p>

        {showWaterWarning && (
          <p className="mb-3 text-center text-xs text-[#7a8a80]">
            Your plant is starting to wilt. Check in before midnight.
          </p>
        )}

        {/* Phase 9 — milestone banner */}
        {milestoneBanner && (
          <div className={`mb-3 rounded-xl border border-[#7db84a]/30 bg-[#7db84a]/10 px-4 py-2 text-center text-sm text-[#a8d470] ${milestoneFading ? "milestone-out" : "milestone-in"}`}>
            {milestoneBanner}
          </div>
        )}

        {/* Plant card */}
        <div
          className={`relative mb-6 flex min-h-[min(64vh,540px)] flex-col overflow-hidden rounded-2xl border p-6 text-center ${
            isDarkMode
              ? "border-[#7db84a]/20 bg-[#111618]"
              : "border-[#7db84a]/25 bg-[#f0f4f0]"
          } ${showStreakGlow ? "streak-glow-ring" : ""}`}
          style={{ boxShadow: "0 0 30px rgba(125,184,74,0.12)" }}
        >
          {/* Phase 2 — radial glow behind plant */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(125,184,74,0.12) 0%, transparent 70%)" }}
            aria-hidden="true"
          />

          <PlantParticles />

          {/* Phase 3 — plant load-in + breathing wrapper */}
          <div className={`flex min-h-[min(42vh,320px)] flex-[1_1_40%] items-center justify-center py-3 plant-load-in ${breatheClass}`}>
            <div style={wiltFilter} className="contents">
              <PlantSvg
                stage={plant}
                wiltLevel={data.plantWiltLevel}
                className={`max-h-[min(56vh,380px)] max-w-[380px] ${showGrowthBurst ? "plant-growth-burst" : ""} ${streakGlowClass}`}
                animClass={plantAnimClass}
              />
            </div>
          </div>

          <p className="text-sm text-[#7a8a80]" style={{ letterSpacing: "-0.2px" }}>{plant.label}</p>
          <p className="mt-1 text-sm text-[#a8d470]">{motivationMsg}</p>

          {/* Streak pills */}
          <div className="mt-3 flex justify-center gap-2 text-xs text-[#7a8a80]">
            <span className="rounded-full bg-[#1a2022] px-3 py-1">
              Streak: <strong className="text-[#7db84a]">{data.streak}</strong>
            </span>
            <span className="rounded-full bg-[#1a2022] px-3 py-1">
              Best: <strong className="text-[#7db84a]">{data.bestStreak}</strong>
            </span>
          </div>

          {/* Plant health bar */}
          <div className="mt-3 px-2">
            {(() => {
              const wilt = data.plantWiltLevel;
              const healthPct   = data.streak > 0 ? Math.max(8, 100 - wilt * 30) : Math.max(8, 33 - wilt * 11);
              const healthColor = wilt === 0 ? "#7db84a" : wilt === 1 ? "#5a8a38" : wilt === 2 ? "#3d6028" : "#2a4020";
              const healthLabel = wilt === 0 && data.streak > 0 ? "Healthy" : wilt === 0 ? "New" : wilt === 1 ? "Wilting" : wilt === 2 ? "Struggling" : "Critical";
              return (
                <>
                  <div className="mb-1 flex items-center justify-between text-xs text-[#3a4a40]">
                    <span>Plant health</span>
                    <span style={{ color: healthColor }}>{healthLabel}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a2022]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${healthPct}%`, background: healthColor }} />
                  </div>
                </>
              );
            })()}
          </div>

          {/* Calendar */}
          <div className="mt-4 px-1">
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#3a4a40]">Last 4 weeks</p>
            <CheckInCalendar entries={data.entries} />
          </div>
        </div>

        {/* Check-in section */}
        <section>
          <h2 className="text-lg font-medium text-[#e8e4dc]" style={{ letterSpacing: "-0.2px" }}>Today's check-in</h2>
          <p className="mb-4 mt-1 text-sm text-[#7a8a80]">
            The streak doesn&apos;t build itself. Two minutes.
          </p>

          {completedToday ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#7db84a]/30 bg-[#7db84a]/10 p-4 text-center">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="completion-check inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#7db84a] text-sm font-bold text-[#0e1112]">
                    ✓
                  </span>
                  <p className="text-sm font-medium text-[#a8d470]">{celebrationMsg}</p>
                </div>

                {showResetMsg && (
                  <p className="mb-2 text-xs text-[#7a8a80]">Missed a day. Reset starts now.</p>
                )}

                <div className="flex min-h-[min(36vh,320px)] items-center justify-center py-2">
                  <PlantSvg
                    stage={plant}
                    wiltLevel={data.plantWiltLevel}
                    className={`max-h-[min(36vh,280px)] max-w-[min(100%,300px)]${justCompleted ? " plant-bloom-burst" : ""}`}
                    animClass={plantAnimClass}
                  />
                </div>

                <p className="text-sm text-[#a8d470]">
                  Check-in complete. Current streak:{" "}
                  <strong className="text-[#7db84a]">{data.streak}</strong>
                </p>
                <p className="mt-2 text-sm font-medium text-[#a8d470]">{plantMsg}</p>

                <p className={`mt-3 tabular-nums transition-all ${
                  isLateNight
                    ? "text-base font-semibold text-[#a8d470]"
                    : "text-sm text-[#7a8a80]"
                }`}>
                  Resets in: {midnightShort}{isLateNight ? " — don't lose today" : " — Don't lose today"}
                </p>

                {selectedTaskLabelsToday.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#3a4a40]">Completed tasks today</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {selectedTaskLabelsToday.map((label) => (
                        <span key={label} className="rounded-full border border-[#7db84a]/40 bg-[#7db84a]/15 px-2.5 py-1 text-xs text-[#a8d470]">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 text-left">
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#3a4a40]">Last 4 weeks</p>
                  <CheckInCalendar entries={data.entries} />
                </div>

                {/* Share buttons */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleShareProgress}
                    className="flex-1 rounded-lg border border-[#7db84a]/50 bg-gradient-to-r from-[#7db84a]/25 to-[#a8d470]/25 px-3 py-2 text-sm font-semibold text-[#a8d470] transition hover:from-[#7db84a]/35 hover:to-[#a8d470]/35"
                  >
                    Share 🌱
                  </button>
                  <button
                    type="button"
                    onClick={handleShareToTwitter}
                    className="flex-1 rounded-lg border border-[#3a4a40] bg-[#1a2022] px-3 py-2 text-sm font-semibold text-[#7a8a80] transition hover:border-[#7a8a80] hover:text-[#e8e4dc]"
                  >
                    Post on X
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-[#3a4a40]">Bloom — show up daily. Watch yourself grow.</p>
              </div>

              {/* Settings */}
              <div className="rounded-xl border border-[#3a4a40] bg-[#1a2022] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#3a4a40]">Settings</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAbout(true)}
                    className="w-full rounded-lg border border-[#3a4a40] bg-[#131819] px-3 py-2 text-sm text-[#7a8a80] transition hover:text-[#e8e4dc]"
                  >
                    About Bloom
                  </button>
                  <a
                    href="mailto:fields1work@gmail.com"
                    className="block w-full rounded-lg border border-[#7db84a]/40 bg-[#7db84a]/10 px-3 py-2 text-center text-sm text-[#a8d470] transition hover:bg-[#7db84a]/20"
                  >
                    Give feedback
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <p className="text-center text-xs text-[#3a4a40]">You&apos;re someone who shows up.</p>

              <label className="block">
                <span className="mb-1 block text-sm text-[#7a8a80]">What drained you yesterday?</span>
                <input
                  type="text"
                  value={form.drained}
                  onChange={(e) => setForm((p) => ({ ...p, drained: e.target.value }))}
                  placeholder="e.g. too many meetings"
                  className="w-full rounded-xl border border-[#3a4a40] bg-[#1a2022] px-3 py-2 text-sm text-[#e8e4dc] outline-none transition focus:border-[#7db84a] focus:ring-1 focus:ring-[#7db84a]/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-[#7a8a80]">What's your one task today?</span>
                <input
                  type="text"
                  value={form.oneTask}
                  onChange={(e) => setForm((p) => ({ ...p, oneTask: e.target.value }))}
                  placeholder="e.g. finish project proposal"
                  className="w-full rounded-xl border border-[#3a4a40] bg-[#1a2022] px-3 py-2 text-sm text-[#e8e4dc] outline-none transition focus:border-[#7db84a] focus:ring-1 focus:ring-[#7db84a]/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-[#7a8a80]">What time are you done for the day?</span>
                <input
                  type="time"
                  value={form.stoppingTime}
                  onChange={(e) => setForm((p) => ({ ...p, stoppingTime: e.target.value }))}
                  className="w-full rounded-xl border border-[#3a4a40] bg-[#1a2022] px-3 py-2 text-sm text-[#e8e4dc] outline-none transition focus:border-[#7db84a] focus:ring-1 focus:ring-[#7db84a]/30"
                />
                <span className="mt-1 block text-xs text-[#3a4a40]">
                  Setting a stop time prevents overwork and revenge bedtime scrolling.
                </span>
              </label>

              <div>
                <p className="mb-2 text-sm text-[#7a8a80]">Task menu</p>
                {taskFeedback && (
                  <p className="mb-2 text-center text-xs text-[#a8d470]">{taskFeedback}</p>
                )}
                <div className="flex flex-wrap items-start gap-2">
                  {TASK_OPTIONS.map((task) => {
                    const selected    = form.selectedTasks.includes(task.id);
                    const highlighted = isTaskHighlightedForFocus(task.id, data.focusArea);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleTaskToggle(task.id)}
                        style={selected ? { transition: "box-shadow 0.3s" } : {}}
                        className={`rounded-full border px-3 py-1 text-xs transition active:scale-95 ${
                          selected
                            ? "border-[#7db84a] bg-[#7db84a]/20 text-[#a8d470] shadow-[0_0_12px_rgba(125,184,74,0.4)]"
                            : highlighted
                              ? "border-[#7db84a]/70 bg-[#7db84a]/10 text-[#c5e8a0] ring-1 ring-[#7db84a]/40"
                              : "border-[#3a4a40] bg-[#1a2022] text-[#7a8a80]"
                        }`}
                      >
                        {task.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit button — Phase 3 micro-interactions */}
              <button
                type="submit"
                disabled={!isFormReady}
                className={`mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-[#0e1112] transition active:scale-[0.97] hover:scale-[1.02] ${
                  isFormReady
                    ? "bg-[#7db84a] hover:bg-[#a8d470]"
                    : "cursor-not-allowed bg-[#1a2022] text-[#3a4a40]"
                }`}
              >
                Complete Today's Check-in <span aria-hidden="true">🌱</span>
              </button>
            </form>
          )}
        </section>
      </section>

      {/* 30-day confetti easter egg */}
      {data.streak >= 30 && !data.celebratedStreak30 && (
        <Confetti onClose={handleCloseConfetti} />
      )}

      {/* About modal — affiliate links preserved exactly */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm overflow-y-auto rounded-2xl border border-[#3a4a40] bg-[#131819] p-5 text-[#e8e4dc]" style={{ maxHeight: "90dvh" }}>
            <h3 className="text-lg font-semibold">About Bloom</h3>
            <p className="mt-2 text-sm text-[#7a8a80]">Show up daily. Watch yourself grow.</p>
            <a href="https://www.tiktok.com/@focuswithfields" target="_blank" rel="noreferrer"
              className="mt-3 inline-block text-sm text-[#7db84a] underline underline-offset-2">
              @focuswithfields on TikTok
            </a>
            <a href="https://fields1work.github.io" target="_blank" rel="noreferrer"
              className="mt-2 inline-block text-sm text-[#7db84a] underline underline-offset-2">
              All my links →
            </a>
            <div className="mt-4 rounded-xl border border-[#3a4a40] bg-[#1a2022] p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#3a4a40]">Recommended tools</p>
              <div className="flex flex-col gap-2">
                <a href="https://www.amazon.com/dp/0735211299?tag=focuswithfiel-20" target="_blank" rel="noreferrer noopener"
                  className="flex items-center gap-2 rounded-lg border border-[#3a4a40] bg-[#131819] px-3 py-2 text-xs text-[#7a8a80] transition hover:text-[#e8e4dc]">
                  <span>📖</span><span>Atomic Habits — James Clear</span>
                </a>
                <a href="https://www.amazon.com/dp/B00JGFQTD2?tag=focuswithfiel-20" target="_blank" rel="noreferrer noopener"
                  className="flex items-center gap-2 rounded-lg border border-[#3a4a40] bg-[#131819] px-3 py-2 text-xs text-[#7a8a80] transition hover:text-[#e8e4dc]">
                  <span>📵</span><span>Phone lock box (kSafe)</span>
                </a>
                <a href="https://www.amazon.com/dp/B001NCDE44?tag=focuswithfiel-20" target="_blank" rel="noreferrer noopener"
                  className="flex items-center gap-2 rounded-lg border border-[#3a4a40] bg-[#131819] px-3 py-2 text-xs text-[#7a8a80] transition hover:text-[#e8e4dc]">
                  <span>💧</span><span>32 oz water bottle (Nalgene)</span>
                </a>
              </div>
            </div>
            <button type="button" onClick={() => setShowAbout(false)}
              className="mt-4 w-full rounded-lg bg-[#7db84a] px-3 py-2 text-sm font-medium text-[#0e1112]">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {showCopiedToast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#7db84a]/40 bg-[#131819]/90 px-3 py-1.5 text-xs text-[#a8d470] shadow-lg shadow-black/40">
          Copied!
        </div>
      )}
    </main>
  );
}

export default App;
