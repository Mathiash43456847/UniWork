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
}

/**
 * Deterministic human study simulation engine.
 * Computes exact state for a given timestamp so that all clients worldwide see identical bot states.
 */
export function getSimulatedBotState(bot: StudyBot, timestampMs: number = Date.now()): SimulatedPeerState | null {
  const d = new Date(timestampMs);
  const hourUTC = d.getUTCHours();
  const minuteUTC = d.getUTCMinutes();
  const secondUTC = d.getUTCSeconds();
  const totalSecondsInDay = hourUTC * 3600 + minuteUTC * 60 + secondUTC;

  // Active hours definition per archetype (expressed in 24h UTC scale)
  // Early Bird: 05:00 - 15:00 UTC
  // Afternoon Grinder: 11:00 - 20:00 UTC
  // Night Owl: 17:00 - 04:00 UTC (crosses midnight)
  // Pomodoro Sprinter: 08:00 - 18:00 UTC
  // Deep Work: 09:00 - 19:00 UTC
  let isWithinDailyActiveWindow = false;

  switch (bot.archetype) {
    case 'early_bird':
      isWithinDailyActiveWindow = hourUTC >= 5 && hourUTC < 15;
      break;
    case 'afternoon_grinder':
      isWithinDailyActiveWindow = hourUTC >= 11 && hourUTC < 20;
      break;
    case 'night_owl':
      isWithinDailyActiveWindow = hourUTC >= 17 || hourUTC < 4;
      break;
    case 'pomodoro_sprinter':
      isWithinDailyActiveWindow = hourUTC >= 8 && hourUTC < 18;
      break;
    case 'deep_work':
      isWithinDailyActiveWindow = hourUTC >= 9 && hourUTC < 19;
      break;
  }

  if (!isWithinDailyActiveWindow) {
    return null; // Bot is currently offline/sleeping
  }

  // Check for Human Lunch Break (12:00 - 13:00 for daytime students, 19:30 - 20:30 for night owls)
  const isLunchHour =
    bot.archetype === 'night_owl'
      ? (hourUTC === 19 && minuteUTC >= 30) || (hourUTC === 20 && minuteUTC < 30)
      : hourUTC === 12 && minuteUTC >= 10 && minuteUTC <= 50;

  if (isLunchHour) {
    const lunchMinutesLeft = Math.max(1, 50 - minuteUTC);
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
    };
  }

  // Micro-cycle calculation (Pomodoro or 50m block + 10m break)
  // We offset by bot.phaseOffsetSec to distribute the breaks across different minutes!
  const cycleLengthSec = bot.archetype === 'pomodoro_sprinter' ? 1800 : 3600; // 30m vs 60m
  const studyPortionSec = bot.archetype === 'pomodoro_sprinter' ? 1500 : 3000; // 25m vs 50m
  const adjustedSeconds = (totalSecondsInDay + bot.phaseOffsetSec) % cycleLengthSec;

  if (adjustedSeconds < studyPortionSec) {
    // Actively studying
    const elapsedInCycle = adjustedSeconds;
    const remainingInCycle = studyPortionSec - elapsedInCycle;
    const timeLeftMinutes = Math.max(1, Math.ceil(remainingInCycle / 60));
    const elapsedMinutes = Math.floor(elapsedInCycle / 60);

    // Realistic study session duration displayed (e.g. 45m or 1h 20m)
    const cumulativeHoursToday = Math.floor(((totalSecondsInDay % 14400) / 3600) + 1);
    const studyDurationFormatted =
      cumulativeHoursToday > 1
        ? `${cumulativeHoursToday - 1}h ${String(elapsedMinutes).padStart(2, '0')}m`
        : `${Math.max(15, elapsedMinutes)}m`;

    // Dynamic points progression: slight points gain as day progresses
    const pointsProgress = bot.basePoints + Math.floor((totalSecondsInDay % 10000) / 1000);

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
    };
  } else {
    // On a short rest/coffee break
    const breakElapsed = adjustedSeconds - studyPortionSec;
    const breakTotal = cycleLengthSec - studyPortionSec;
    const breakRemainingMinutes = Math.max(1, Math.ceil((breakTotal - breakElapsed) / 60));

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
