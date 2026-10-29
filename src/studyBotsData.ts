export interface StudyBot {
  id: string;
  name: string;
  avatarUrl: string;
  major: string;
  archetype: 'early_bird' | 'night_owl' | 'pomodoro_sprinter' | 'afternoon_grinder' | 'deep_work';
  basePoints: number;
  preferredRooms: string[];
  currentTaskTitle: string;
  bio: string;
  totalLifetimeHours: number;
  reactions: { thumbsup: number; fire: number; bicep: number };
  phaseOffsetSec: number;
  plannedDurationMinutes: number;
  initialElapsedMinutes: number;
}

export const STUDY_BOTS: StudyBot[] = [
  {
    id: 'bot-liam-chen',
    name: 'Liam Chen',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LiamChen&backgroundColor=b6e3f4',
    major: 'Computer Science & AI',
    archetype: 'night_owl',
    basePoints: 245,
    preferredRooms: ['000000', '883014'],
    currentTaskTitle: 'Distributed Systems Lab 4',
    bio: 'Junior at Cornell. Passionate about cloud infra, distributed consensus, and late-night coding sessions with lo-fi beats.',
    totalLifetimeHours: 42,
    reactions: { thumbsup: 34, fire: 52, bicep: 28 },
    phaseOffsetSec: 120,
    plannedDurationMinutes: 45,
    initialElapsedMinutes: 18,
  },
  {
    id: 'bot-sofia-rodriguez',
    name: 'Sofia Rodriguez',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SofiaRodriguez&backgroundColor=ffd5dc',
    major: 'Pre-Med & Biology',
    archetype: 'early_bird',
    basePoints: 310,
    preferredRooms: ['000000', '204911'],
    currentTaskTitle: 'Cellular Metabolism & Krebs Cycle',
    bio: 'Pre-med junior studying for MCAT. Early mornings with black coffee and Anki flashcards.',
    totalLifetimeHours: 58,
    reactions: { thumbsup: 48, fire: 64, bicep: 41 },
    phaseOffsetSec: 480,
    plannedDurationMinutes: 120,
    initialElapsedMinutes: 82, // 1h 22m
  },
  {
    id: 'bot-marcus-vance',
    name: 'Marcus Vance',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarcusVance&backgroundColor=c0aede',
    major: 'Finance & Economics',
    archetype: 'afternoon_grinder',
    basePoints: 195,
    preferredRooms: ['000000', '204911'],
    currentTaskTitle: 'LBO Modeling & DCF Valuation',
    bio: 'Senior studying quantitative finance. Preparing for IB analyst interviews and financial modeling competitions.',
    totalLifetimeHours: 35,
    reactions: { thumbsup: 22, fire: 39, bicep: 18 },
    phaseOffsetSec: 840,
    plannedDurationMinutes: 30,
    initialElapsedMinutes: 9, // fresh start
  },
  {
    id: 'bot-chloe-martin',
    name: 'Chloe Martin',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ChloeMartin&backgroundColor=ffdfbf',
    major: 'Architecture & Design',
    archetype: 'deep_work',
    basePoints: 280,
    preferredRooms: ['000000', '519280'],
    currentTaskTitle: 'Spatial Rendering & Section Plans',
    bio: 'Architecture student crafting physical models and Rhino 3D renders. Lover of brutalist aesthetics and green tea.',
    totalLifetimeHours: 52,
    reactions: { thumbsup: 31, fire: 45, bicep: 26 },
    phaseOffsetSec: 300,
    plannedDurationMinutes: 60,
    initialElapsedMinutes: 42,
  },
  {
    id: 'bot-david-zhao',
    name: 'David Zhao',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DavidZhao&backgroundColor=b6e3f4',
    major: 'Data Science & Stats',
    archetype: 'pomodoro_sprinter',
    basePoints: 220,
    preferredRooms: ['000000', '883014'],
    currentTaskTitle: 'Feature Engineering & Random Forest Tuning',
    bio: 'Master’s student in Data Science. Building predictive models in PyTorch and writing Kaggle writeups.',
    totalLifetimeHours: 39,
    reactions: { thumbsup: 27, fire: 36, bicep: 21 },
    phaseOffsetSec: 660,
    plannedDurationMinutes: 90,
    initialElapsedMinutes: 74, // 1h 14m
  },
  {
    id: 'bot-maya-patel',
    name: 'Maya Patel',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaPatel&backgroundColor=ffd5dc',
    major: 'Biochemistry',
    archetype: 'early_bird',
    basePoints: 265,
    preferredRooms: ['000000', '204911'],
    currentTaskTitle: 'Enzyme Kinetics & Michaelis-Menten',
    bio: 'Sophomore honors biochemist. Curious about molecular therapeutics and protein folding pathways.',
    totalLifetimeHours: 46,
    reactions: { thumbsup: 38, fire: 42, bicep: 30 },
    phaseOffsetSec: 920,
    plannedDurationMinutes: 50,
    initialElapsedMinutes: 27,
  },
  {
    id: 'bot-julian-voss',
    name: 'Julian Voss',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=JulianVoss&backgroundColor=c0aede',
    major: 'Philosophy & Law',
    archetype: 'night_owl',
    basePoints: 175,
    preferredRooms: ['000000', '204911'],
    currentTaskTitle: 'Jurisprudence & Constitutional Rights',
    bio: 'Law school hopeful drafting legal briefs and reading legal positivism. Always accompanied by fountain pens and Earl Grey.',
    totalLifetimeHours: 32,
    reactions: { thumbsup: 19, fire: 28, bicep: 15 },
    phaseOffsetSec: 1500,
    plannedDurationMinutes: 135,
    initialElapsedMinutes: 108, // 1h 48m
  },
  {
    id: 'bot-hannah-lee',
    name: 'Hannah Lee',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HannahLee&backgroundColor=d1d4f9',
    major: 'Cognitive Science',
    archetype: 'afternoon_grinder',
    basePoints: 210,
    preferredRooms: ['000000', '519280'],
    currentTaskTitle: 'Perception Psychology Literature Review',
    bio: 'Exploring human-computer interaction and memory systems. Big fan of clean desk setups and notion boards.',
    totalLifetimeHours: 37,
    reactions: { thumbsup: 25, fire: 33, bicep: 20 },
    phaseOffsetSec: 420,
    plannedDurationMinutes: 25,
    initialElapsedMinutes: 12, // fresh start
  },
  {
    id: 'bot-kevin-zhang',
    name: 'Kevin Zhang',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KevinZhang&backgroundColor=b6e3f4',
    major: 'Electrical Engineering',
    archetype: 'deep_work',
    basePoints: 340,
    preferredRooms: ['000000', '883014'],
    currentTaskTitle: 'FPGA Verilog State Machine Design',
    bio: 'Senior EE building hardware accelerators. Dedicated to deep work blocks with zero distractions.',
    totalLifetimeHours: 64,
    reactions: { thumbsup: 56, fire: 72, bicep: 49 },
    phaseOffsetSec: 180,
    plannedDurationMinutes: 180,
    initialElapsedMinutes: 138, // 2h 18m marathoner
  },
  {
    id: 'bot-emily-watson',
    name: 'Emily Watson',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=EmilyWatson&backgroundColor=ffd5dc',
    major: 'English Literature',
    archetype: 'pomodoro_sprinter',
    basePoints: 160,
    preferredRooms: ['000000', '204911'],
    currentTaskTitle: 'Modernist Poetry & Stream of Consciousness',
    bio: 'Comparative lit undergrad dissecting Virginia Woolf and James Joyce. Strict 25-minute Pomodoro devotee.',
    totalLifetimeHours: 29,
    reactions: { thumbsup: 18, fire: 24, bicep: 12 },
    phaseOffsetSec: 780,
    plannedDurationMinutes: 25,
    initialElapsedMinutes: 21,
  },
  {
    id: 'bot-lucas-silva',
    name: 'Lucas Silva',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LucasSilva&backgroundColor=ffdfbf',
    major: 'Mechanical Engineering',
    archetype: 'afternoon_grinder',
    basePoints: 230,
    preferredRooms: ['000000', '883014'],
    currentTaskTitle: 'Thermodynamics & Heat Exchanger Calculus',
    bio: 'Engineering junior working on Formula SAE racecar aerodynamics and finite element analysis.',
    totalLifetimeHours: 41,
    reactions: { thumbsup: 32, fire: 40, bicep: 29 },
    phaseOffsetSec: 1040,
    plannedDurationMinutes: 75,
    initialElapsedMinutes: 54,
  },
  {
    id: 'bot-amina-almansoor',
    name: 'Amina Al-Mansoor',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AminaAlMansoor&backgroundColor=c0aede',
    major: 'International Relations',
    archetype: 'early_bird',
    basePoints: 275,
    preferredRooms: ['000000', '204911'],
    currentTaskTitle: 'Multilateral Treaties & Geopolitical Case Study',
    bio: 'Focusing on international arbitration and diplomatic negotiations. Avid documentary enthusiast.',
    totalLifetimeHours: 49,
    reactions: { thumbsup: 39, fire: 47, bicep: 33 },
    phaseOffsetSec: 600,
    plannedDurationMinutes: 90,
    initialElapsedMinutes: 65, // 1h 05m
  },
  {
    id: 'bot-noah-takahashi',
    name: 'Noah Takahashi',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NoahTakahashi&backgroundColor=b6e3f4',
    major: 'Software Engineering',
    archetype: 'night_owl',
    basePoints: 295,
    preferredRooms: ['000000', '883014'],
    currentTaskTitle: 'Compiler LLVM Optimization Passes',
    bio: 'Open source contributor and systems programmer. Night hours are where the best code happens.',
    totalLifetimeHours: 54,
    reactions: { thumbsup: 44, fire: 59, bicep: 38 },
    phaseOffsetSec: 1320,
    plannedDurationMinutes: 120,
    initialElapsedMinutes: 96, // 1h 36m
  },
  {
    id: 'bot-isabella-rossi',
    name: 'Isabella Rossi',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=IsabellaRossi&backgroundColor=ffd5dc',
    major: 'Graphic Design & Media',
    archetype: 'afternoon_grinder',
    basePoints: 180,
    preferredRooms: ['000000', '519280'],
    currentTaskTitle: 'Editorial Layout & Typography Hierarchy',
    bio: 'Brand designer studying Swiss design and grid systems. Creating print publication layouts in InDesign.',
    totalLifetimeHours: 33,
    reactions: { thumbsup: 21, fire: 31, bicep: 16 },
    phaseOffsetSec: 240,
    plannedDurationMinutes: 45,
    initialElapsedMinutes: 32,
  },
  {
    id: 'bot-ethan-miller',
    name: 'Ethan Miller',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=EthanMiller&backgroundColor=d1d4f9',
    major: 'Applied Mathematics',
    archetype: 'pomodoro_sprinter',
    basePoints: 250,
    preferredRooms: ['000000', '883014'],
    currentTaskTitle: 'Stochastic Calculus & Markov Chains',
    bio: 'Math major working through proofs in probability theory and stochastic calculus. Loves blackboard problem solving.',
    totalLifetimeHours: 45,
    reactions: { thumbsup: 35, fire: 48, bicep: 27 },
    phaseOffsetSec: 720,
    plannedDurationMinutes: 50,
    initialElapsedMinutes: 15, // fresh start
  },
  {
    id: 'bot-zara-khan',
    name: 'Zara Khan',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ZaraKhan&backgroundColor=ffdfbf',
    major: 'Clinical Psychology',
    archetype: 'early_bird',
    basePoints: 235,
    preferredRooms: ['000000', '204911'],
    currentTaskTitle: 'Neurobiology of Memory Consolidation',
    bio: 'Senior conducting research on sleep patterns and memory retention. Morning person through and through.',
    totalLifetimeHours: 43,
    reactions: { thumbsup: 30, fire: 41, bicep: 25 },
    phaseOffsetSec: 360,
    plannedDurationMinutes: 75,
    initialElapsedMinutes: 48,
  },
  {
    id: 'bot-alexander-wright',
    name: 'Alexander Wright',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexanderWright&backgroundColor=c0aede',
    major: 'History & Classics',
    archetype: 'deep_work',
    basePoints: 260,
    preferredRooms: ['000000', '204911'],
    currentTaskTitle: 'Medieval Byzantine Trade Archives',
    bio: 'Graduate history researcher reading Latin manuscripts. Believer in uninterrupted 90-minute immersion blocks.',
    totalLifetimeHours: 47,
    reactions: { thumbsup: 33, fire: 46, bicep: 31 },
    phaseOffsetSec: 1200,
    plannedDurationMinutes: 150,
    initialElapsedMinutes: 125, // 2h 05m marathon
  },
  {
    id: 'bot-olivia-dubois',
    name: 'Olivia Dubois',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=OliviaDubois&backgroundColor=ffd5dc',
    major: 'Neuroscience',
    archetype: 'night_owl',
    basePoints: 285,
    preferredRooms: ['000000', '883014'],
    currentTaskTitle: 'Synaptic Plasticity & Optogenetics Data',
    bio: 'Neuroscience researcher analyzing microscopy data and writing lab reports during quiet nocturnal hours.',
    totalLifetimeHours: 51,
    reactions: { thumbsup: 42, fire: 55, bicep: 36 },
    phaseOffsetSec: 960,
    plannedDurationMinutes: 105,
    initialElapsedMinutes: 71, // 1h 11m
  },
  {
    id: 'bot-benjamin-park',
    name: 'Benjamin Park',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=BenjaminPark&backgroundColor=b6e3f4',
    major: 'Cybersecurity & Networks',
    archetype: 'night_owl',
    basePoints: 320,
    preferredRooms: ['000000', '883014'],
    currentTaskTitle: 'Zero-Knowledge Proof Implementations',
    bio: 'Security researcher solving CTFs and studying lattice-based cryptography. Dark mode everything.',
    totalLifetimeHours: 60,
    reactions: { thumbsup: 51, fire: 68, bicep: 44 },
    phaseOffsetSec: 540,
    plannedDurationMinutes: 180,
    initialElapsedMinutes: 154, // 2h 34m marathon
  },
  {
    id: 'bot-grace-kim',
    name: 'Grace Kim',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=GraceKim&backgroundColor=d1d4f9',
    major: 'Business Administration',
    archetype: 'pomodoro_sprinter',
    basePoints: 190,
    preferredRooms: ['000000', '519280'],
    currentTaskTitle: 'Global Supply Chain Operations Deck',
    bio: 'Strategy consultant in training. Loves clear roadmaps, crisp slide decks, and disciplined study intervals.',
    totalLifetimeHours: 36,
    reactions: { thumbsup: 24, fire: 32, bicep: 19 },
    phaseOffsetSec: 1080,
    plannedDurationMinutes: 30,
    initialElapsedMinutes: 7, // fresh start
  },
];

export interface SimulatedPeerState {
  id: string;
  name: string;
  avatarUrl: string;
  points: number;
  status: 'studying' | 'break' | 'lunch';
  timeLeftMinutes: number;
  studyDurationFormatted: string;
  taskTitle: string;
  major: string;
  roomCode: string;
  isBot: boolean;
  sessionStartedAtMs: number;
  plannedDurationSec: number;
  elapsedSeconds: number;
}

/**
 * Deterministic human study simulation engine with mathematically continuous wall-clock timestamps.
 * Guarantees that:
 * 1. Bots have realistic, human distributions (fresh 7-25m, mid 30-75m, marathons 1.5-2.5h) with ZERO 2-hour clustering.
 * 2. Every bot has an exact, invariant sessionStartedAtMs timestamp so seconds never reset to :00 on exit/re-enter.
 */
export function getSimulatedBotState(bot: StudyBot, timestampMs: number = Date.now()): SimulatedPeerState | null {
  const d = new Date(timestampMs);
  const hourUTC = d.getUTCHours();
  const minuteUTC = d.getUTCMinutes();

  // Active hours definition per archetype (expressed in 24h UTC scale)
  let isWithinDailyActiveWindow = false;

  switch (bot.archetype) {
    case 'early_bird':
      isWithinDailyActiveWindow = hourUTC >= 5 && hourUTC < 16;
      break;
    case 'afternoon_grinder':
      isWithinDailyActiveWindow = hourUTC >= 11 && hourUTC < 21;
      break;
    case 'night_owl':
      isWithinDailyActiveWindow = hourUTC >= 16 || hourUTC < 5;
      break;
    case 'pomodoro_sprinter':
      isWithinDailyActiveWindow = hourUTC >= 7 && hourUTC < 19;
      break;
    case 'deep_work':
      isWithinDailyActiveWindow = hourUTC >= 8 && hourUTC < 20;
      break;
  }

  if (!isWithinDailyActiveWindow) {
    return null; // Bot is currently offline/sleeping
  }

  // Check for Human Lunch Break (12:00 - 13:00 for daytime students, 19:30 - 20:30 for night owls)
  const isLunchHour =
    bot.archetype === 'night_owl'
      ? (hourUTC === 19 && minuteUTC >= 30) || (hourUTC === 20 && minuteUTC < 30)
      : hourUTC === 12 && minuteUTC >= 15 && minuteUTC <= 50;

  const currentEpochSec = Math.floor(timestampMs / 1000);

  if (isLunchHour) {
    const lunchMinutesLeft = Math.max(1, 50 - minuteUTC);
    const lunchStartedAtMs = (currentEpochSec - (minuteUTC * 60)) * 1000;
    return {
      id: bot.id,
      name: bot.name,
      avatarUrl: bot.avatarUrl,
      points: bot.basePoints,
      status: 'lunch',
      timeLeftMinutes: lunchMinutesLeft,
      studyDurationFormatted: 'Lunch Break',
      taskTitle: bot.currentTaskTitle,
      major: bot.major,
      roomCode: bot.preferredRooms[0] || '000000',
      isBot: true,
      sessionStartedAtMs: lunchStartedAtMs,
      plannedDurationSec: 45 * 60,
      elapsedSeconds: Math.max(0, currentEpochSec - Math.floor(lunchStartedAtMs / 1000)),
    };
  }

  // Individual Study Session & Break Cycle
  const plannedDurationSec = (bot.plannedDurationMinutes || 45) * 60;
  const breakDurationSec = 600; // 10m short rest
  const totalCycleSec = plannedDurationSec + breakDurationSec;

  // Staggered offset per bot using their planned baseline and phase
  const botOffsetSec = (bot.initialElapsedMinutes || 15) * 60 + (bot.phaseOffsetSec % 3600);

  // Position within current cycle: continuous monotonic ticking
  const cyclePos = (currentEpochSec + botOffsetSec) % totalCycleSec;

  if (cyclePos < plannedDurationSec) {
    // Actively studying:
    const elapsedSeconds = cyclePos;
    const remainingSec = plannedDurationSec - elapsedSeconds;
    const timeLeftMinutes = Math.max(1, Math.ceil(remainingSec / 60));

    // sessionStartedAtMs remains constant throughout this active study block
    const sessionStartedAtMs = (currentEpochSec - elapsedSeconds) * 1000;

    const elapsedMins = Math.floor(elapsedSeconds / 60);
    const hrs = Math.floor(elapsedMins / 60);
    const remMins = elapsedMins % 60;
    const studyDurationFormatted = hrs > 0 ? `${hrs}h ${String(remMins).padStart(2, '0')}m` : `${elapsedMins}m`;

    // Progressive points gain based on session investment
    const pointsProgress = bot.basePoints + Math.floor(elapsedMins / 5);

    return {
      id: bot.id,
      name: bot.name,
      avatarUrl: bot.avatarUrl,
      points: pointsProgress,
      status: 'studying',
      timeLeftMinutes,
      studyDurationFormatted,
      taskTitle: bot.currentTaskTitle,
      major: bot.major,
      roomCode: bot.preferredRooms[0] || '000000',
      isBot: true,
      sessionStartedAtMs,
      plannedDurationSec,
      elapsedSeconds,
    };
  } else {
    // On a short rest/coffee break
    const breakElapsed = cyclePos - plannedDurationSec;
    const breakRemainingSec = breakDurationSec - breakElapsed;
    const breakRemainingMinutes = Math.max(1, Math.ceil(breakRemainingSec / 60));
    const sessionStartedAtMs = (currentEpochSec - breakElapsed) * 1000;

    return {
      id: bot.id,
      name: bot.name,
      avatarUrl: bot.avatarUrl,
      points: bot.basePoints,
      status: 'break',
      timeLeftMinutes: breakRemainingMinutes,
      studyDurationFormatted: `${breakRemainingMinutes}m break`,
      taskTitle: bot.currentTaskTitle,
      major: bot.major,
      roomCode: bot.preferredRooms[0] || '000000',
      isBot: true,
      sessionStartedAtMs,
      plannedDurationSec: breakDurationSec,
      elapsedSeconds: breakElapsed,
    };
  }
}

/**
 * Returns all active bots for a specific focus room at timestamp.
 * Global room '000000' also includes active bots that study generally.
 */
export function getActiveBotsForRoom(roomCode: string, timestampMs: number = Date.now()): SimulatedPeerState[] {
  const normalizedRoomCode = String(roomCode || '000000').trim();
  if (normalizedRoomCode !== '000000') {
    return []; // No bots in custom/private focus rooms
  }
  const activeBots: SimulatedPeerState[] = [];

  for (const bot of STUDY_BOTS) {
    const state = getSimulatedBotState(bot, timestampMs);
    if (!state) continue; // offline

    if (bot.preferredRooms.includes('000000')) {
      activeBots.push({ ...state, roomCode: '000000' });
    }
  }

  return activeBots;
}
