import express from "express";
import path from "path";
import fs from "fs";
import pg from "pg";
import crypto from "crypto";
import * as dotenv from "dotenv";
import { STUDY_BOTS, getActiveBotsForRoom, getSimulatedBotState } from "./src/studyBotsData.ts";

dotenv.config();

// Timezone resolution helpers
function isValidTimeZone(tz?: string | null): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

function resolveRequestTimeZone(req?: express.Request, explicitTz?: string): string {
  if (explicitTz && isValidTimeZone(explicitTz)) return explicitTz.trim();
  if (req) {
    const headerTz = (req.headers['x-user-timezone'] || req.headers['x-timezone'] || req.query.tz) as string;
    if (headerTz && isValidTimeZone(headerTz)) return headerTz.trim();
    const vercelTz = req.headers['x-vercel-ip-timezone'] as string;
    if (vercelTz && isValidTimeZone(vercelTz)) return vercelTz.trim();
  }
  return process.env.TZ || 'UTC';
}

// Helper function to get accurate local YYYY-MM-DD date string considering timezone offset
function getTodayDateString(offsetDays = 0, timeZone?: string): string {
  const resolvedTz = (timeZone && isValidTimeZone(timeZone)) ? timeZone.trim() : (process.env.TZ || 'UTC');
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

const app = express();
app.set("trust proxy", true);
// AI Studio Cloud Run uses an internal NGINX reverse-proxy on port 8080 that forwards to port 3000.
// Express must always bind to 3000 so it does not collide with NGINX on 8080.
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Standard health check endpoints for Cloud Run, Kubernetes, and reverse proxy rollout probes
app.get(["/health", "/api/health", "/healthz", "/livez", "/readyz"], (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Student Reactions store
const inMemoryReactions = new Map<string, { thumbsup: number; fire: number; bicep: number }>();
inMemoryReactions.set("tgest", { thumbsup: 12, fire: 28, bicep: 19 });

// Helper: new users start with a clean slate (no default tasks, goals, or events created automatically)
async function seedDefaultUserData(client: any, userId: string, timeZone?: string) {
  // Clean slate for new users: zero sample tasks/events/goals seeded.
}

// PostgreSQL Connection Pool Setup
function getSanitizedDbUrl(): string | null {
  const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL;
  if (!rawUrl || typeof rawUrl !== "string") return null;
  let cleaned = rawUrl.trim();
  cleaned = cleaned
    .replace(/([?&])channel_binding=[^&]*(&|$)/g, '$1')
    .replace(/[?&]$/, '');
  return cleaned || null;
}

const dbUrl = getSanitizedDbUrl();
let pool: pg.Pool | null = null;

if (dbUrl) {
  try {
    const isLocalOrInternal =
      dbUrl.includes("localhost") ||
      dbUrl.includes("127.0.0.1") ||
      dbUrl.includes(".railway.internal");

    const poolConfig: pg.PoolConfig = {
      connectionString: dbUrl,
      connectionTimeoutMillis: 10000,
    };

    if (!isLocalOrInternal) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = new pg.Pool(poolConfig);
    
    pool.on("error", (err) => {
      console.error("Unexpected error on idle pg pool client:", err);
    });

    // Initialize/migrate tables without killing the connection pool on error
    const initDb = async () => {
      if (!pool) return;
      let client;
      try {
        client = await pool.connect();

        // Multi-User Core Tables - Privacy First (Zero PII - No Email, Name, or Avatar)
        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_users (
            id VARCHAR(100) PRIMARY KEY,
            provider VARCHAR(50) DEFAULT 'google',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Migration to safely strip PII columns if table was created previously with them
        await client.query(`
          DO $$ 
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_users' AND column_name='email') THEN
              ALTER TABLE uniwork_users DROP COLUMN email;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_users' AND column_name='display_name') THEN
              ALTER TABLE uniwork_users DROP COLUMN display_name;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_users' AND column_name='avatar_url') THEN
              ALTER TABLE uniwork_users DROP COLUMN avatar_url;
            END IF;
          END $$;
          DROP TABLE IF EXISTS uniwork_user_emails;
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_user_profiles (
            user_id VARCHAR(100) PRIMARY KEY,
            display_name VARCHAR(100) NOT NULL DEFAULT 'Student',
            avatar_url TEXT,
            style VARCHAR(50) DEFAULT 'adventurer',
            seed VARCHAR(100) DEFAULT 'Atlas',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_events (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            date VARCHAR(10) NOT NULL,
            start_time VARCHAR(5),
            end_time VARCHAR(5),
            tag_id VARCHAR(50),
            color VARCHAR(50),
            recurring_days VARCHAR(100),
            except_dates TEXT,
            goal_id VARCHAR(50),
            goal_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_events_user ON uniwork_events(user_id);
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_tasks (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            date VARCHAR(10) NOT NULL,
            time VARCHAR(5),
            status VARCHAR(20) NOT NULL DEFAULT 'todo',
            group_id VARCHAR(50),
            start_time VARCHAR(5),
            end_time VARCHAR(5),
            color VARCHAR(50),
            goal_id VARCHAR(50),
            goal_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_tasks_user ON uniwork_tasks(user_id);
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_focus_rooms (
            code VARCHAR(10) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            creator_user_id VARCHAR(100) NOT NULL,
            created_at_ms BIGINT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS uniwork_focus_memberships (
            user_id VARCHAR(100) NOT NULL,
            room_code VARCHAR(10) NOT NULL,
            PRIMARY KEY (user_id, room_code)
          );
          CREATE TABLE IF NOT EXISTS uniwork_focus_custom_names (
            user_id VARCHAR(100) NOT NULL,
            room_code VARCHAR(10) NOT NULL,
            custom_name VARCHAR(255) NOT NULL,
            PRIMARY KEY (user_id, room_code)
          );
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_tags (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(50) NOT NULL,
            visible BOOLEAN NOT NULL DEFAULT TRUE
          );
          CREATE INDEX IF NOT EXISTS idx_tags_user ON uniwork_tags(user_id);
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_task_groups (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(50)
          );
          CREATE INDEX IF NOT EXISTS idx_groups_user ON uniwork_task_groups(user_id);
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_goals (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            color VARCHAR(50) NOT NULL,
            time_budget INTEGER DEFAULT 0
          );
          CREATE INDEX IF NOT EXISTS idx_goals_user ON uniwork_goals(user_id);
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_goals' AND column_name='tag_ids') THEN
              ALTER TABLE uniwork_goals ADD COLUMN tag_ids TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_goals' AND column_name='group_ids') THEN
              ALTER TABLE uniwork_goals ADD COLUMN group_ids TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_goals' AND column_name='deadline_type') THEN
              ALTER TABLE uniwork_goals ADD COLUMN deadline_type VARCHAR(50) DEFAULT 'weekly';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_goals' AND column_name='due_date') THEN
              ALTER TABLE uniwork_goals ADD COLUMN due_date VARCHAR(20);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_goals' AND column_name='start_date') THEN
              ALTER TABLE uniwork_goals ADD COLUMN start_date VARCHAR(20);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_goals' AND column_name='completed') THEN
              ALTER TABLE uniwork_goals ADD COLUMN completed BOOLEAN DEFAULT FALSE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_goals' AND column_name='completed_at') THEN
              ALTER TABLE uniwork_goals ADD COLUMN completed_at VARCHAR(50);
            END IF;
          END $$;
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_settings (
            user_id VARCHAR(100) NOT NULL,
            key VARCHAR(50) NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (user_id, key)
          );
          DO $$ 
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uniwork_settings' AND column_name='value' AND data_type='character varying') THEN
              ALTER TABLE uniwork_settings ALTER COLUMN value TYPE TEXT;
            END IF;
          END $$;
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_focus_sessions (
            user_id VARCHAR(100) PRIMARY KEY,
            id VARCHAR(100) NOT NULL,
            task_id VARCHAR(100) NOT NULL,
            start_time_ms BIGINT NOT NULL,
            planned_duration_sec INT NOT NULL,
            is_running BOOLEAN NOT NULL DEFAULT true,
            paused_elapsed_sec INT NOT NULL DEFAULT 0,
            last_updated_ms BIGINT NOT NULL
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_encrypted_vaults (
            record_id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            data_type VARCHAR(50) NOT NULL,
            encrypted_payload TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_reviews (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            rating INT NOT NULL,
            comment TEXT,
            created_at VARCHAR(100) NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_reviews_user ON uniwork_reviews(user_id);
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_focus_points_logs (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            task_id VARCHAR(100),
            planned_minutes INT NOT NULL,
            actual_minutes INT NOT NULL,
            points_earned INT NOT NULL,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_points_logs_user_date ON uniwork_focus_points_logs (user_id, completed_at);

          CREATE TABLE IF NOT EXISTS uniwork_user_avatars (
            user_id VARCHAR(100) PRIMARY KEY,
            avatar_url TEXT NOT NULL,
            style VARCHAR(50) NOT NULL DEFAULT 'lorelei',
            seed VARCHAR(100) NOT NULL DEFAULT 'student',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS uniwork_focus_presence (
            user_id VARCHAR(100) PRIMARY KEY,
            user_name VARCHAR(100) NOT NULL,
            avatar_url TEXT NOT NULL,
            points INT NOT NULL DEFAULT 0,
            time_left_minutes INT NOT NULL DEFAULT 25,
            elapsed_seconds INT NOT NULL DEFAULT 0,
            last_heartbeat_ms BIGINT NOT NULL
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_guide_steps (
            id VARCHAR(100) PRIMARY KEY,
            step_order INT NOT NULL,
            target_selector VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            action_type VARCHAR(50) NOT NULL DEFAULT 'click_next',
            position VARCHAR(50) NOT NULL DEFAULT 'auto',
            created_at VARCHAR(100) NOT NULL
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_aura_config (
            id VARCHAR(100) PRIMARY KEY DEFAULT 'global',
            aura_scale_percent INT DEFAULT 75,
            opacity_percent INT DEFAULT 85,
            blur_radius_percent INT DEFAULT 80,
            show_outline BOOLEAN DEFAULT false,
            placement VARCHAR(50) DEFAULT 'behind',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await client.query(`
          INSERT INTO uniwork_aura_config (id, aura_scale_percent, opacity_percent, blur_radius_percent, show_outline, placement)
          VALUES ('global', 75, 85, 80, false, 'behind')
          ON CONFLICT (id) DO UPDATE SET show_outline = false;
        `);

        // Seed Primary Account (Identified solely by user_id)
        await client.query(`
          INSERT INTO uniwork_users (id, provider) 
          VALUES ('usr-mathias-cheow-primary', 'google')
          ON CONFLICT (id) DO NOTHING;
        `);
        await seedDefaultUserData(client, 'usr-mathias-cheow-primary');

        // Seed 20 Global Realistic Focus Study Bots
        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_study_bots (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            avatar_url TEXT NOT NULL,
            major VARCHAR(100) NOT NULL,
            archetype VARCHAR(50) NOT NULL,
            base_points INT NOT NULL DEFAULT 120,
            preferred_rooms TEXT[] NOT NULL DEFAULT ARRAY['000000'],
            current_task_title VARCHAR(255) NOT NULL,
            bio TEXT,
            total_lifetime_hours INT NOT NULL DEFAULT 40,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS uniwork_bot_reactions (
            bot_id VARCHAR(100) PRIMARY KEY,
            thumbsup INT NOT NULL DEFAULT 0,
            fire INT NOT NULL DEFAULT 0,
            bicep INT NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS uniwork_bot_status_log (
            id VARCHAR(100) PRIMARY KEY,
            bot_id VARCHAR(100) NOT NULL,
            bot_name VARCHAR(100) NOT NULL,
            room_code VARCHAR(10) NOT NULL,
            status VARCHAR(50) NOT NULL,
            task_title VARCHAR(255) NOT NULL,
            duration_formatted VARCHAR(50) NOT NULL,
            time_left_minutes INT NOT NULL,
            timestamp_ms BIGINT NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_bot_status_log_bot_time ON uniwork_bot_status_log (bot_id, timestamp_ms);

          CREATE TABLE IF NOT EXISTS uniwork_bot_active_sessions (
            bot_id VARCHAR(100) PRIMARY KEY,
            session_start_ms BIGINT NOT NULL,
            planned_duration_sec INT NOT NULL,
            room_code VARCHAR(10) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'studying',
            last_updated_ms BIGINT NOT NULL
          );
        `);

        for (const bot of STUDY_BOTS) {
          await client.query(
            `INSERT INTO uniwork_study_bots (id, name, avatar_url, major, archetype, base_points, preferred_rooms, current_task_title, bio, total_lifetime_hours)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               avatar_url = EXCLUDED.avatar_url,
               major = EXCLUDED.major,
               archetype = EXCLUDED.archetype,
               base_points = EXCLUDED.base_points,
               preferred_rooms = EXCLUDED.preferred_rooms,
               current_task_title = EXCLUDED.current_task_title,
               bio = EXCLUDED.bio,
               total_lifetime_hours = EXCLUDED.total_lifetime_hours`,
            [
              bot.id,
              bot.name,
              bot.avatarUrl,
              bot.major,
              bot.archetype,
              bot.basePoints,
              bot.preferredRooms,
              bot.currentTaskTitle,
              bot.bio,
              bot.totalLifetimeHours,
            ]
          );

          await client.query(
            `INSERT INTO uniwork_bot_reactions (bot_id, thumbsup, fire, bicep)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (bot_id) DO NOTHING`,
            [bot.id, bot.reactions.thumbsup, bot.reactions.fire, bot.reactions.bicep]
          );

          if (!inMemoryReactions.has(bot.name.toLowerCase())) {
            inMemoryReactions.set(bot.name.toLowerCase(), { ...bot.reactions });
          }
        }

        // Admin Accounts with Names (Managed by Super Admin)
        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_admin_accounts (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO uniwork_admin_accounts (id, name)
          VALUES 
            ('usr_g_8cced70b14994d07', 'Super Admin'),
            ('usr_g_100319333273050289112', 'Super Admin')
          ON CONFLICT (id) DO NOTHING;
        `);

        // Encrypted Admin Messages
        await client.query(`
          CREATE TABLE IF NOT EXISTS uniwork_admin_messages (
            id VARCHAR(100) PRIMARY KEY,
            sender_id VARCHAR(100) NOT NULL,
            receiver_id VARCHAR(100) NOT NULL,
            encrypted_payload TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_admin_msg_sr ON uniwork_admin_messages(sender_id, receiver_id);
          CREATE INDEX IF NOT EXISTS idx_admin_msg_rec ON uniwork_admin_messages(receiver_id, is_read);

          CREATE TABLE IF NOT EXISTS uniwork_admin_settings (
            key VARCHAR(100) PRIMARY KEY,
            value VARCHAR(255) NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO uniwork_admin_settings (key, value)
          VALUES ('security_mode', 'lockdown')
          ON CONFLICT (key) DO NOTHING;

          CREATE TABLE IF NOT EXISTS uniwork_competitor_transforms (
            id VARCHAR(50) PRIMARY KEY,
            x INT NOT NULL DEFAULT 0,
            y INT NOT NULL DEFAULT 0,
            scale NUMERIC(4,2) NOT NULL DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        console.log("Multi-user Postgres database tables initialized and verified cleanly.");
      } catch (err) {
        console.error("Error creating database tables or connecting to Postgres (pool retained):", err);
      } finally {
        if (client) client.release();
      }
    };
    
    initDb();
  } catch (err) {
    console.error("Failed to connect or build pool for Database:", err);
  }
} else {
  console.warn("No DATABASE_URL detected. Database operations will require DATABASE_URL.");
}

// --- SSE Client Pool for Real-Time Synchronization Across Devices ---
let sseClients: any[] = [];

app.get("/api/events-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send initial ping to confirm stream
  res.write("data: " + JSON.stringify({ type: "connected" }) + "\n\n");

  sseClients.push(res);

  // Send periodic keep-alive comment so proxy/Cloud Run does not timeout idle connection
  const keepAlive = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients = sseClients.filter(c => c !== res);
  });
});

function broadcastUpdate() {
  const data = JSON.stringify({ type: 'update' });
  sseClients.forEach(client => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (err) {
      // Client closed
    }
  });
}

// --- Health and Status Endpoints ---
app.get("/api/db-status", async (req, res) => {
  if (!pool) {
    return res.json({ 
      connected: false, 
      error: "PostgreSQL Database Pool is not initialized. Please ensure DATABASE_URL is set." 
    });
  }
  try {
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT NOW() as now, COUNT(*) as user_count FROM uniwork_users");
      res.json({ 
        connected: true, 
        serverTime: result.rows[0].now,
        userCount: parseInt(result.rows[0].user_count, 10)
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Live DB health check failed:", err);
    res.json({ 
      connected: false, 
      error: err.message || "Database connection test failed." 
    });
  }
});

// Helper to resolve accurate public OAuth callback URL across all hosting environments (AI Studio, Render, Local)
function resolveAuthCallbackUrl(req: express.Request): string {
  // 1. Explicit origin query parameter sent from the frontend browser (100% matches what user is viewing)
  const clientOrigin = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
  if (clientOrigin && (clientOrigin.startsWith('http://') || clientOrigin.startsWith('https://'))) {
    return `${clientOrigin.replace(/\/+$/, '')}/api/auth/google/callback`;
  }

  // 2. Production or Preview APP_URL from process.env (AI Studio Cloud Run or Render)
  const envAppUrl = (process.env.APP_URL || '').trim();
  if (envAppUrl && (envAppUrl.startsWith('http://') || envAppUrl.startsWith('https://'))) {
    return `${envAppUrl.replace(/\/+$/, '')}/api/auth/google/callback`;
  }

  // 3. Reverse Proxy Forwarded Host header
  const forwardedHost = req.headers['x-forwarded-host'] as string;
  if (forwardedHost) {
    const rawHost = forwardedHost.split(',')[0].trim();
    const forwardedProto = (req.headers['x-forwarded-proto'] as string) || (rawHost.includes('localhost') ? 'http' : 'https');
    return `${forwardedProto}://${rawHost}/api/auth/google/callback`;
  }

  // 4. Request headers Origin / Referer
  const reqOrigin = req.headers.origin as string;
  if (reqOrigin && (reqOrigin.startsWith('http://') || reqOrigin.startsWith('https://'))) {
    return `${reqOrigin.replace(/\/+$/, '')}/api/auth/google/callback`;
  }

  if (req.headers.referer) {
    try {
      const parsedReferer = new URL(req.headers.referer as string);
      return `${parsedReferer.origin}/api/auth/google/callback`;
    } catch {}
  }

  // 5. Host fallback with SSL auto-detection
  const host = req.get('host') || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] as string) || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}/api/auth/google/callback`;
}

// --- Google OAuth Authentication Endpoints (Rebuilt from scratch) ---
app.get("/api/auth/google/url", (req, res) => {
  const intent = (req.query.intent as string) || 'signin';
  const destination = (req.query.destination as string) || 'calendar';
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(400).json({ 
      success: false, 
      error: "GOOGLE_CLIENT_ID environment secret is not configured." 
    });
  }

  const redirectUri = resolveAuthCallbackUrl(req);

  const statePayload = {
    intent,
    destination,
    redirectUri,
    nonce: crypto.randomBytes(12).toString('hex')
  };
  const stateStr = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: stateStr
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.json({ 
    success: true, 
    url: authUrl,
    redirectUri 
  });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  let destination = 'calendar';
  let intent = 'signin';
  let redirectUri = resolveAuthCallbackUrl(req);

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (decoded.destination) destination = decoded.destination;
      if (decoded.intent) intent = decoded.intent;
      if (decoded.redirectUri) redirectUri = decoded.redirectUri;
    } catch (parseErr) {
      console.warn("Failed to parse state token in OAuth callback:", parseErr);
    }
  }

  if (error || !code) {
    const errorMsg = error || 'Authentication was cancelled or access was denied.';
    return res.redirect(`/?error=${encodeURIComponent(errorMsg)}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect(`/?error=${encodeURIComponent('Google OAuth credentials not configured on server.')}`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code.');
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const googleUser = await userRes.json();

    if (!googleUser || !googleUser.id) {
      throw new Error('Failed to retrieve user profile from Google.');
    }

    const userId = `usr_g_${googleUser.id}`;
    const email = googleUser.email || '';
    const displayName = googleUser.name || (email ? email.split('@')[0] : 'Student');
    const avatarUrl = googleUser.picture || '';

    if (pool) {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            `INSERT INTO uniwork_users (id, provider, created_at)
             VALUES ($1, 'google', CURRENT_TIMESTAMP)
             ON CONFLICT (id) DO NOTHING`,
            [userId]
          );
          await client.query(
            `INSERT INTO uniwork_user_profiles (user_id, display_name, avatar_url, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO UPDATE SET
               display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), uniwork_user_profiles.display_name),
               avatar_url = COALESCE(EXCLUDED.avatar_url, uniwork_user_profiles.avatar_url),
               updated_at = CURRENT_TIMESTAMP`,
            [userId, displayName, avatarUrl]
          );
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.warn("Database user upsert warning:", dbErr);
      }
    }

    const userSession = {
      id: userId,
      email,
      displayName,
      avatarUrl,
      authProvider: 'google',
      signedInAt: new Date().toISOString()
    };

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UniWork - Initializing Workspace</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: #020617;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        overflow: hidden;
      }
      .card {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(51, 65, 85, 0.6);
        border-radius: 24px;
        padding: 36px 48px;
        text-align: center;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .spinner {
        width: 44px;
        height: 44px;
        border: 3px solid rgba(6, 182, 212, 0.2);
        border-top-color: #06b6d4;
        border-radius: 50%;
        animation: spin 0.75s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .title {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: #e2e8f0;
      }
      .subtitle {
        font-size: 12px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <div>
        <div class="title">Connecting to UniWork Workspace</div>
        <div class="subtitle">Setting up your profile and dashboard...</div>
      </div>
    </div>
    <script>
      try {
        const session = ${JSON.stringify(userSession)};
        localStorage.setItem('uniwork_user_session', JSON.stringify(session));
        localStorage.setItem('uniwork_current_user_id', session.id);
      } catch (err) {
        console.error('Session persistence failed:', err);
      }
      window.location.replace('/?tab=${destination}');
    </script>
  </body>
</html>`;

    return res.send(html);
  } catch (err: any) {
    console.error("Google OAuth callback error:", err);
    return res.redirect(`/?error=${encodeURIComponent(err.message || 'Google sign in failed.')}`);
  }
});

// --- Direct Student ID / Workspace Authentication Endpoint ---
app.post("/api/auth/direct", async (req, res) => {
  const { userId, intent = "signin", timeZone } = req.body;
  const cleanId = String(userId || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `usr_${Date.now()}`;

  let displayName = "Student";
  if (cleanId === "usr-mathias-cheow-primary") displayName = "Mathias Cheow";
  else if (cleanId === "usr_study_workspace_2") displayName = "Study Projects";

  if (pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO uniwork_users (id, provider, created_at)
           VALUES ($1, 'workspace', CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO NOTHING`,
          [cleanId]
        );
        await client.query(
          `INSERT INTO uniwork_user_profiles (user_id, display_name, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) DO UPDATE SET
             display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), uniwork_user_profiles.display_name),
             updated_at = CURRENT_TIMESTAMP`,
          [cleanId, displayName]
        );
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn("DB direct auth error:", err);
    }
  }

  const user = {
    id: cleanId,
    displayName,
    authProvider: "workspace",
    signedInAt: new Date().toISOString()
  };

  return res.json({ success: true, user });
});

// DELETE /api/account - Secure server-side account and data deletion
app.delete("/api/account", async (req, res) => {
  const userId = String(req.query.userId || req.headers['x-user-id'] || "").trim();
  if (!userId) {
    return res.status(400).json({ success: false, error: "Unauthorized: Missing user ID verification." });
  }

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userCheck = await client.query("SELECT id FROM uniwork_users WHERE id = $1", [userId]);
      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ success: false, error: "Authorization failed: User account not found." });
      }

      await client.query("DELETE FROM uniwork_focus_sessions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM uniwork_focus_points_logs WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM uniwork_tasks WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM uniwork_events WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM uniwork_goals WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM uniwork_task_groups WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM uniwork_tags WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM uniwork_users WHERE id = $1", [userId]);

      await client.query("COMMIT");
      broadcastUpdate();
      return res.json({ success: true, message: "Account and associated data deleted successfully." });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("Account deletion error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to delete account." });
    } finally {
      client.release();
    }
  } else {
    return res.status(503).json({ success: false, error: "Database unavailable." });
  }
});

app.get("/api/time", (req, res) => {
  const tz = resolveRequestTimeZone(req);
  const now = new Date();
  res.json({
    timestamp: now.getTime(),
    iso: now.toISOString(),
    today: getTodayDateString(0, tz),
    timeZone: tz
  });
});

// --- TAGS API ---
app.get("/api/tags", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId query parameter is required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, color, visible FROM uniwork_tags WHERE user_id = $1 ORDER BY id",
      [userId]
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error("DB Error reading tags:", err);
    return res.status(500).json({ success: false, error: `Database error reading tags: ${err.message}` });
  }
});

app.post("/api/tags", async (req, res) => {
  const { id, name, color, visible, userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId is required in request body" });
  }
  if (!id || !name) {
    return res.status(400).json({ success: false, error: "id and name are required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    await pool.query(
      `INSERT INTO uniwork_tags (id, user_id, name, color, visible) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (id) DO UPDATE SET name = $3, color = $4, visible = $5`,
      [id, userId, name, color || "indigo", visible ?? true]
    );
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error saving tag:", err);
    return res.status(500).json({ success: false, error: `Database error saving tag: ${err.message}` });
  }
});

app.delete("/api/tags/:id", async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    await pool.query("DELETE FROM uniwork_tags WHERE id = $1", [id]);
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error deleting tag:", err);
    return res.status(500).json({ success: false, error: `Database error deleting tag: ${err.message}` });
  }
});

// --- EVENTS API ---
app.get("/api/events", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId query parameter is required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    const result = await pool.query(`
      SELECT id, title, description, date, start_time as "startTime", end_time as "endTime", 
             tag_id as "tagId", color, recurring_days as "recurringDaysStr", 
             except_dates as "exceptDatesStr", goal_id as "goalId", goal_name as "goalName" 
      FROM uniwork_events
      WHERE user_id = $1
      ORDER BY date ASC, start_time ASC
    `, [userId]);

    const mapped = result.rows.map(row => ({
      ...row,
      recurringDays: row.recurringDaysStr ? row.recurringDaysStr.split(',').map(Number) : undefined,
      exceptDates: row.exceptDatesStr ? row.exceptDatesStr.split(',').filter(Boolean) : undefined
    }));
    return res.json(mapped);
  } catch (err: any) {
    console.error("DB Error reading events:", err);
    return res.status(500).json({ success: false, error: `Database error reading events: ${err.message}` });
  }
});

app.post("/api/events", async (req, res) => {
  const { 
    id, 
    title, 
    description, 
    date, 
    startTime, 
    endTime, 
    tagId, 
    color, 
    recurringDays, 
    exceptDates, 
    goalId, 
    goalName, 
    userId 
  } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: "userId is required in request body" });
  }
  if (!id || !title || !date) {
    return res.status(400).json({ success: false, error: "id, title, and date are required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  const recurringDaysStr = recurringDays && Array.isArray(recurringDays) ? recurringDays.join(',') : null;
  const exceptDatesStr = exceptDates && Array.isArray(exceptDates) ? exceptDates.join(',') : null;

  try {
    await pool.query(
      `INSERT INTO uniwork_events (
        id, user_id, title, description, date, start_time, end_time, 
        tag_id, color, recurring_days, except_dates, goal_id, goal_name
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET 
        title = $3, 
        description = $4, 
        date = $5, 
        start_time = $6, 
        end_time = $7, 
        tag_id = $8, 
        color = $9, 
        recurring_days = $10, 
        except_dates = $11, 
        goal_id = $12, 
        goal_name = $13`,
      [
        id, 
        userId, 
        title, 
        description || null, 
        date, 
        startTime || null, 
        endTime || null, 
        tagId || "default-work", 
        color || null, 
        recurringDaysStr, 
        exceptDatesStr, 
        goalId || null, 
        goalName || null
      ]
    );
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error saving event:", err);
    return res.status(500).json({ success: false, error: `Database error saving event: ${err.message}` });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    await pool.query("DELETE FROM uniwork_events WHERE id = $1", [id]);
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error deleting event:", err);
    return res.status(500).json({ success: false, error: `Database error deleting event: ${err.message}` });
  }
});

// --- TASKS API ---
app.get("/api/tasks", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId query parameter is required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    const result = await pool.query(`
      SELECT id, title, description, date, time, status, 
             group_id as "groupId", start_time as "startTime", end_time as "endTime", 
             color, goal_id as "goalId", goal_name as "goalName" 
      FROM uniwork_tasks
      WHERE user_id = $1
      ORDER BY date ASC, start_time ASC
    `, [userId]);
    return res.json(result.rows);
  } catch (err: any) {
    console.error("DB Error reading tasks:", err);
    return res.status(500).json({ success: false, error: `Database error reading tasks: ${err.message}` });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { 
    id, 
    title, 
    description, 
    date, 
    time, 
    status, 
    groupId, 
    startTime, 
    endTime, 
    color, 
    goalId, 
    goalName, 
    userId 
  } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: "userId is required in request body" });
  }
  if (!id || !title || !date) {
    return res.status(400).json({ success: false, error: "id, title, and date are required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    await pool.query(
      `INSERT INTO uniwork_tasks (
        id, user_id, title, description, date, time, status, 
        group_id, start_time, end_time, color, goal_id, goal_name
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET 
        title = $3, 
        description = $4, 
        date = $5, 
        time = $6, 
        status = $7, 
        group_id = $8, 
        start_time = $9, 
        end_time = $10, 
        color = $11, 
        goal_id = $12, 
        goal_name = $13`,
      [
        id, 
        userId, 
        title, 
        description || null, 
        date, 
        time || null, 
        status || "todo", 
        groupId || "group-1", 
        startTime || null, 
        endTime || null, 
        color || null, 
        goalId || null, 
        goalName || null
      ]
    );
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error saving task:", err);
    return res.status(500).json({ success: false, error: `Database error saving task: ${err.message}` });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    await pool.query("DELETE FROM uniwork_tasks WHERE id = $1", [id]);
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error deleting task:", err);
    return res.status(500).json({ success: false, error: `Database error deleting task: ${err.message}` });
  }
});

// --- TASK GROUPS API ---
app.get("/api/groups", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId query parameter is required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, color FROM uniwork_task_groups WHERE user_id = $1 ORDER BY id",
      [userId]
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error("DB Error reading task groups:", err);
    return res.status(500).json({ success: false, error: `Database error reading task groups: ${err.message}` });
  }
});

app.post("/api/groups", async (req, res) => {
  const { id, name, color, userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId is required in request body" });
  }
  if (!id || !name) {
    return res.status(400).json({ success: false, error: "id and name are required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    await pool.query(
      `INSERT INTO uniwork_task_groups (id, user_id, name, color) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (id) DO UPDATE SET name = $3, color = $4`,
      [id, userId, name, color || null]
    );
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error saving task group:", err);
    return res.status(500).json({ success: false, error: `Database error saving task group: ${err.message}` });
  }
});

app.delete("/api/groups/:id", async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    await pool.query("DELETE FROM uniwork_task_groups WHERE id = $1", [id]);
    await pool.query("UPDATE uniwork_tasks SET group_id = 'group-1' WHERE group_id = $1", [id]);
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error deleting task group:", err);
    return res.status(500).json({ success: false, error: `Database error deleting task group: ${err.message}` });
  }
});

// --- GOALS API ---
app.get("/api/goals", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId query parameter is required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, color, time_budget as "timeBudget", 
              tag_ids as "tagIds", group_ids as "groupIds",
              deadline_type as "deadlineType", due_date as "dueDate",
              start_date as "startDate", completed, completed_at as "completedAt"
       FROM uniwork_goals 
       WHERE user_id = $1 
       ORDER BY id`,
      [userId]
    );
    const parsedRows = result.rows.map(row => ({
      ...row,
      tagIds: row.tagIds ? (typeof row.tagIds === 'string' && row.tagIds.startsWith('[') ? JSON.parse(row.tagIds) : row.tagIds.split(',').filter(Boolean)) : [],
      groupIds: row.groupIds ? (typeof row.groupIds === 'string' && row.groupIds.startsWith('[') ? JSON.parse(row.groupIds) : row.groupIds.split(',').filter(Boolean)) : [],
      completed: Boolean(row.completed),
    }));
    return res.json(parsedRows);
  } catch (err: any) {
    console.error("DB Error reading goals:", err);
    return res.status(500).json({ success: false, error: `Database error reading goals: ${err.message}` });
  }
});

app.post("/api/goals", async (req, res) => {
  const { id, title, color, timeBudget, tagIds, groupIds, deadlineType, dueDate, startDate, completed, completedAt, userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: "userId is required in request body" });
  }
  if (!id || !title) {
    return res.status(400).json({ success: false, error: "id and title are required" });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  const tagIdsStr = Array.isArray(tagIds) ? JSON.stringify(tagIds) : (tagIds || null);
  const groupIdsStr = Array.isArray(groupIds) ? JSON.stringify(groupIds) : (groupIds || null);

  try {
    await pool.query(
      `INSERT INTO uniwork_goals (
        id, user_id, title, color, time_budget,
        tag_ids, group_ids, deadline_type, due_date, start_date, completed, completed_at
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       ON CONFLICT (id) DO UPDATE SET 
        title = $3, 
        color = $4, 
        time_budget = $5,
        tag_ids = $6,
        group_ids = $7,
        deadline_type = $8,
        due_date = $9,
        start_date = $10,
        completed = $11,
        completed_at = $12`,
      [
        id, 
        userId, 
        title, 
        color || "indigo", 
        timeBudget || 0,
        tagIdsStr,
        groupIdsStr,
        deadlineType || "weekly",
        dueDate || null,
        startDate || null,
        Boolean(completed),
        completedAt || null
      ]
    );
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error saving goal:", err);
    return res.status(500).json({ success: false, error: `Database error saving goal: ${err.message}` });
  }
});

app.delete("/api/goals/:id", async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    await pool.query("DELETE FROM uniwork_goals WHERE id = $1", [id]);
    await pool.query("UPDATE uniwork_events SET goal_id = NULL WHERE goal_id = $1", [id]);
    await pool.query("UPDATE uniwork_tasks SET goal_id = NULL WHERE goal_id = $1", [id]);
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error deleting goal:", err);
    return res.status(500).json({ success: false, error: `Database error deleting goal: ${err.message}` });
  }
});

// --- SETTINGS API ---
app.get("/api/settings", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'usr-mathias-cheow-primary';

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  try {
    const result = await pool.query(
      "SELECT key, value FROM uniwork_settings WHERE user_id IN ($1, 'global')",
      [userId]
    );
    const settings: Record<string, string> = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return res.json(settings);
  } catch (err: any) {
    console.error("DB Error reading settings:", err);
    return res.status(500).json({ success: false, error: `Database error reading settings: ${err.message}` });
  }
});

app.post("/api/settings", async (req, res) => {
  const userId = req.body.userId || (req.headers['x-user-id'] as string) || 'usr-mathias-cheow-primary';

  if (!pool) {
    return res.status(500).json({ success: false, error: "Database connection pool is unavailable" });
  }

  const settingsObj = req.body.settings ? { ...req.body.settings } : { ...req.body };
  delete settingsObj.userId;
  delete settingsObj.settings;

  try {
    for (const [key, value] of Object.entries(settingsObj)) {
      if (value !== undefined && value !== null) {
        await pool.query(
          `INSERT INTO uniwork_settings (user_id, key, value) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (user_id, key) DO UPDATE SET value = $3`,
          [userId, key, String(value)]
        );
      }
    }
    broadcastUpdate();
    return res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("DB Error saving settings:", err);
    return res.status(500).json({ success: false, error: `Database error saving settings: ${err.message}` });
  }
});

// --- GOOGLE OAUTH ROUTES (Direct Redirect Flow) ---
app.get("/api/auth/google/url", (req, res) => {
  const intent = (req.query.intent as string) === 'signin' ? 'signin' : 'signup';
  const destination = (req.query.destination as string) || 'calendar';
  const timeZone = resolveRequestTimeZone(req, req.query.tz as string);
  
  const forwardedHost = (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host") || "localhost:3000";
  const protoHeader = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim();
  const protocol = protoHeader || (host.includes("localhost") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID || "611762741469-7cosvnnpo910o0mp58oettgj9gpeb3h3.apps.googleusercontent.com";
  
  if (!clientId) {
    return res.status(400).json({ success: false, error: "GOOGLE_CLIENT_ID is not configured in secrets." });
  }

  const stateToken = `st_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const encodedTz = Buffer.from(timeZone).toString('base64url');
  const state = `${intent}:${encodedTz}:${destination}:${stateToken}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state: state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ success: true, url: authUrl, redirectUri });
});

app.get(["/api/auth/google/callback", "/api/auth/google/callback/"], async (req, res) => {
  const { code, state, error: authError } = req.query;

  let intent = 'signup';
  let userTimeZone = 'UTC';
  let destination = 'calendar';
  if (typeof state === 'string') {
    const parts = state.split(':');
    if (parts.length >= 1 && parts[0] === 'signin') intent = 'signin';
    if (parts.length >= 2) {
      try {
        const decodedTz = Buffer.from(parts[1], 'base64url').toString('utf8');
        if (isValidTimeZone(decodedTz)) userTimeZone = decodedTz;
      } catch {}
    }
    if (parts.length >= 3) destination = parts[2];
  }

  if (authError || !code) {
    return res.redirect(`/?auth_error=${encodeURIComponent(String(authError || 'Authentication cancelled'))}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "611762741469-7cosvnnpo910o0mp58oettgj9gpeb3h3.apps.googleusercontent.com";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "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";

  const forwardedHost = (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host") || "localhost:3000";
  const protoHeader = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim();
  const protocol = protoHeader || (host.includes("localhost") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to exchange Google OAuth code for access token.");
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userInfoRes.json();
    
    const subjectId = googleUser.sub || googleUser.id || 'anonymous';
    const finalUserId = `usr_g_${crypto.createHash('sha256').update(String(subjectId)).digest('hex').substring(0, 16)}`;

    if (!pool) {
      throw new Error("Database is currently unavailable. Cannot write user account to PostgreSQL.");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userCheck = await client.query("SELECT id FROM uniwork_users WHERE id = $1", [finalUserId]);

      if (intent === 'signin') {
        if (userCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.redirect(`/?auth_error=${encodeURIComponent('No UniWork workspace found for this account. Please sign up first.')}`);
        }
        await client.query("COMMIT");
      } else {
        if (userCheck.rows.length === 0) {
          await client.query("INSERT INTO uniwork_users (id, provider) VALUES ($1, 'google') ON CONFLICT (id) DO NOTHING", [finalUserId]);
          await seedDefaultUserData(client, finalUserId, userTimeZone);
        }
        await client.query("COMMIT");
      }
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    const profile = {
      id: finalUserId,
      isGuest: false,
      encryptionEnabled: true,
      signedInAt: new Date().toISOString(),
      authProvider: "google"
    };

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Logging in...</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h3 style="color: #38bdf8; margin-bottom: 8px;">Authentication Successful</h3>
            <p style="color: #94a3b8; font-size: 14px;">Setting up your secure workspace...</p>
          </div>
          <script>
            try {
              localStorage.setItem('uniwork_user_session', JSON.stringify(${JSON.stringify(profile)}));
            } catch (e) {
              console.error('Failed to save session:', e);
            }
            window.location.href = '/?tab=${destination}';
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("OAuth Exchange Error:", err);
    res.redirect(`/?auth_error=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
});

// --- Direct Account Login & Signup API (Zero PII - relies solely on user_id) ---
app.post("/api/auth/direct", async (req, res) => {
  const { userId: rawUserId, id: altUserId, intent = "signup", timeZone: clientTz } = req.body;
  const userTimeZone = resolveRequestTimeZone(req, clientTz);
  
  const rawId = rawUserId || altUserId || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const finalUserId = String(rawId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `usr_${Date.now()}`;

  if (!pool) {
    return res.status(500).json({ success: false, error: "PostgreSQL Database Pool is not available." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userCheck = await client.query(
      "SELECT id FROM uniwork_users WHERE id = $1",
      [finalUserId]
    );

    if (intent === "signin") {
      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: `No UniWork workspace found for ID "${finalUserId}". Please click "Sign up with Google" or create a new workspace.`
        });
      }
      await client.query("COMMIT");
    } else {
      // signup
      if (userCheck.rows.length === 0) {
        await client.query(
          "INSERT INTO uniwork_users (id, provider) VALUES ($1, 'google') ON CONFLICT (id) DO NOTHING",
          [finalUserId]
        );
        await seedDefaultUserData(client, finalUserId, userTimeZone);
      }
      await client.query("COMMIT");
    }

    // Zero PII Profile
    const userProfile = {
      id: finalUserId,
      isGuest: false,
      encryptionEnabled: true,
      signedInAt: new Date().toISOString(),
      authProvider: "google"
    };

    return res.json({ success: true, user: userProfile });
  } catch (dbErr: any) {
    await client.query("ROLLBACK");
    console.error("Direct auth DB error:", dbErr);
    return res.status(500).json({ success: false, error: dbErr.message || "Database transaction failed." });
  } finally {
    client.release();
  }
});

// --- Server-Hosted Focus Timer & Stopwatch Session API ---
interface ServerFocusSessionRecord {
  id: string;
  userId: string;
  taskId: string;
  startTimeMs: number;
  plannedDurationSec: number;
  isRunning: boolean;
  pausedElapsedSec: number;
  lastUpdatedMs: number;
}

const activeServerFocusSessions = new Map<string, ServerFocusSessionRecord>();

// Helper to compute live calculated time on server
function calculateServerSessionState(session: ServerFocusSessionRecord) {
  const now = Date.now();
  let totalElapsedSec = session.pausedElapsedSec;
  if (session.isRunning) {
    // Safety clamp: if session was left untouched overnight (>4 hours without updates), cap live delta
    const deltaMs = Math.min(now - session.lastUpdatedMs, 4 * 3600 * 1000);
    totalElapsedSec += Math.floor(deltaMs / 1000);
  }
  const remainingSec = Math.max(0, session.plannedDurationSec - totalElapsedSec);
  const isOvertime = totalElapsedSec > session.plannedDurationSec;
  const overtimeSec = isOvertime ? totalElapsedSec - session.plannedDurationSec : 0;

  return {
    ...session,
    totalElapsedSec,
    remainingSec,
    isOvertime,
    overtimeSec,
    serverTime: now,
  };
}

// 1. Get currently active global focus session
app.get("/api/focus/active", async (req, res) => {
  const userId = (req.query.userId as string) || "usr-mathias-cheow-primary";

  if (pool) {
    try {
      const dbRes = await pool.query(
        "SELECT * FROM uniwork_focus_sessions WHERE user_id = $1",
        [userId]
      );
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        const record: ServerFocusSessionRecord = {
          id: row.id,
          userId: row.user_id,
          taskId: row.task_id,
          startTimeMs: Number(row.start_time_ms),
          plannedDurationSec: Number(row.planned_duration_sec),
          isRunning: Boolean(row.is_running),
          pausedElapsedSec: Number(row.paused_elapsed_sec),
          lastUpdatedMs: Number(row.last_updated_ms),
        };
        activeServerFocusSessions.set(`${userId}_${record.taskId}`, record);
        return res.json({
          success: true,
          session: calculateServerSessionState(record),
        });
      }
    } catch (err) {
      console.warn("DB focus active error:", err);
    }
  }

  const userSessions = Array.from(activeServerFocusSessions.values()).filter(s => s.userId === userId);
  if (userSessions.length === 0) {
    return res.json({ success: true, session: null });
  }
  userSessions.sort((a, b) => b.lastUpdatedMs - a.lastUpdatedMs);
  return res.json({
    success: true,
    session: calculateServerSessionState(userSessions[0]),
  });
});

// 2. Get focus session by task ID
app.get("/api/focus/session/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const userId = (req.query.userId as string) || "usr-mathias-cheow-primary";
  const clientPlannedDurationSec = req.query.plannedDurationSec ? parseInt(req.query.plannedDurationSec as string, 10) : null;
  const key = `${userId}_${taskId}`;

  let record: ServerFocusSessionRecord | null = null;

  if (pool) {
    try {
      const dbRes = await pool.query(
        "SELECT * FROM uniwork_focus_sessions WHERE user_id = $1 AND task_id = $2",
        [userId, taskId]
      );
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        record = {
          id: row.id,
          userId: row.user_id,
          taskId: row.task_id,
          startTimeMs: Number(row.start_time_ms),
          plannedDurationSec: Number(row.planned_duration_sec),
          isRunning: Boolean(row.is_running),
          pausedElapsedSec: Number(row.paused_elapsed_sec),
          lastUpdatedMs: Number(row.last_updated_ms),
        };
      }
    } catch (err) {
      console.warn("DB focus taskId error:", err);
    }
  }

  if (!record) {
    const session = activeServerFocusSessions.get(key);
    if (session) {
      record = session;
    }
  }

  if (!record) {
    return res.json({ success: true, session: null });
  }

  // Sync planned duration from client if passed and different
  if (clientPlannedDurationSec !== null && !isNaN(clientPlannedDurationSec) && clientPlannedDurationSec > 0) {
    if (record.plannedDurationSec !== clientPlannedDurationSec) {
      record.plannedDurationSec = clientPlannedDurationSec;
      record.lastUpdatedMs = Date.now();
      activeServerFocusSessions.set(key, record);

      if (pool) {
        try {
          await pool.query(
            "UPDATE uniwork_focus_sessions SET planned_duration_sec = $1, last_updated_ms = $2 WHERE user_id = $3 AND task_id = $4",
            [clientPlannedDurationSec, record.lastUpdatedMs, userId, taskId]
          );
        } catch (dbErr) {
          console.warn("Failed to update database planned duration in GET:", dbErr);
        }
      }
    }
  } else {
    // If client didn't pass it, ensure memory map matches DB
    activeServerFocusSessions.set(key, record);
  }

  return res.json({
    success: true,
    session: calculateServerSessionState(record),
  });
});

// 3. Start or switch focus session on server
app.post("/api/focus/session/start", async (req, res) => {
  const { taskId = "open", userId = "usr-mathias-cheow-primary", plannedDurationSec = 25 * 60, initialOvertimeSec = 0 } = req.body;
  const key = `${userId}_${taskId}`;
  const now = Date.now();
  const planned = Number(plannedDurationSec) || 0;
  const initialOt = Number(initialOvertimeSec) || 0;

  // Check if session already exists in DB or memory for this user
  let existingSession: ServerFocusSessionRecord | null = activeServerFocusSessions.get(key) || null;

  if (!existingSession && pool) {
    try {
      const dbRes = await pool.query("SELECT * FROM uniwork_focus_sessions WHERE user_id = $1 AND task_id = $2", [userId, taskId]);
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        existingSession = {
          id: row.id,
          userId: row.user_id,
          taskId: row.task_id,
          startTimeMs: Number(row.start_time_ms),
          plannedDurationSec: Number(row.planned_duration_sec),
          isRunning: Boolean(row.is_running),
          pausedElapsedSec: Number(row.paused_elapsed_sec),
          lastUpdatedMs: Number(row.last_updated_ms),
        };
      }
    } catch (e) {}
  }

  let sessionToSave: ServerFocusSessionRecord;

  if (existingSession && existingSession.taskId === taskId) {
    // PRESERVE existing elapsed time on reload or re-start of same task!
    if (existingSession.isRunning) {
      // Accumulate elapsed time up to now
      existingSession.pausedElapsedSec += Math.floor((now - existingSession.lastUpdatedMs) / 1000);
    }
    existingSession.isRunning = true;
    existingSession.lastUpdatedMs = now;
    existingSession.plannedDurationSec = planned;
    sessionToSave = existingSession;
  } else {
    // Brand new task started -> initialize new session
    const pausedElapsed = initialOt > 0 ? planned + initialOt : 0;
    sessionToSave = {
      id: `foc_${now}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      taskId,
      startTimeMs: now,
      plannedDurationSec: planned,
      isRunning: true,
      pausedElapsedSec: pausedElapsed,
      lastUpdatedMs: now,
    };
  }

  // Clear any old different active session for this user
  for (const [mKey, mVal] of Array.from(activeServerFocusSessions.entries())) {
    if (mVal.userId === userId) {
      activeServerFocusSessions.delete(mKey);
    }
  }
  activeServerFocusSessions.set(key, sessionToSave);

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO uniwork_focus_sessions (id, user_id, task_id, start_time_ms, planned_duration_sec, is_running, paused_elapsed_sec, last_updated_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id) DO UPDATE SET
           id = EXCLUDED.id,
           task_id = EXCLUDED.task_id,
           start_time_ms = EXCLUDED.start_time_ms,
           planned_duration_sec = EXCLUDED.planned_duration_sec,
           is_running = EXCLUDED.is_running,
           paused_elapsed_sec = EXCLUDED.paused_elapsed_sec,
           last_updated_ms = EXCLUDED.last_updated_ms`,
        [sessionToSave.id, userId, taskId, sessionToSave.startTimeMs, planned, true, sessionToSave.pausedElapsedSec, now]
      );
    } catch (err) {
      console.warn("DB focus session insert error:", err);
    }
  }

  return res.json({
    success: true,
    session: calculateServerSessionState(sessionToSave),
  });
});

// 4. Pause focus session on server
app.post("/api/focus/session/pause", async (req, res) => {
  const { taskId = "open", userId = "usr-mathias-cheow-primary" } = req.body;
  const key = `${userId}_${taskId}`;
  let session = activeServerFocusSessions.get(key);
  const now = Date.now();

  if (!session && pool) {
    try {
      const dbRes = await pool.query("SELECT * FROM uniwork_focus_sessions WHERE user_id = $1", [userId]);
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        session = {
          id: row.id,
          userId: row.user_id,
          taskId: row.task_id,
          startTimeMs: Number(row.start_time_ms),
          plannedDurationSec: Number(row.planned_duration_sec),
          isRunning: Boolean(row.is_running),
          pausedElapsedSec: Number(row.paused_elapsed_sec),
          lastUpdatedMs: Number(row.last_updated_ms),
        };
      }
    } catch (e) {}
  }

  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  if (session.isRunning) {
    session.pausedElapsedSec += Math.floor((now - session.lastUpdatedMs) / 1000);
    session.isRunning = false;
    session.lastUpdatedMs = now;
    activeServerFocusSessions.set(key, session);

    if (pool) {
      try {
        await pool.query(
          "UPDATE uniwork_focus_sessions SET is_running = false, paused_elapsed_sec = $1, last_updated_ms = $2 WHERE user_id = $3",
          [session.pausedElapsedSec, now, userId]
        );
      } catch (e) {}
    }
  }

  return res.json({
    success: true,
    session: calculateServerSessionState(session),
  });
});

// 5. Resume focus session on server
app.post("/api/focus/session/resume", async (req, res) => {
  const { taskId = "open", userId = "usr-mathias-cheow-primary" } = req.body;
  const key = `${userId}_${taskId}`;
  let session = activeServerFocusSessions.get(key);
  const now = Date.now();

  if (!session && pool) {
    try {
      const dbRes = await pool.query("SELECT * FROM uniwork_focus_sessions WHERE user_id = $1", [userId]);
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        session = {
          id: row.id,
          userId: row.user_id,
          taskId: row.task_id,
          startTimeMs: Number(row.start_time_ms),
          plannedDurationSec: Number(row.planned_duration_sec),
          isRunning: Boolean(row.is_running),
          pausedElapsedSec: Number(row.paused_elapsed_sec),
          lastUpdatedMs: Number(row.last_updated_ms),
        };
      }
    } catch (e) {}
  }

  if (!session) {
    const planned = 25 * 60;
    session = {
      id: `sess_${now}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      taskId,
      startTimeMs: now,
      plannedDurationSec: planned,
      isRunning: true,
      pausedElapsedSec: 0,
      lastUpdatedMs: now,
    };
    activeServerFocusSessions.set(key, session);

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO uniwork_focus_sessions (id, user_id, task_id, start_time_ms, planned_duration_sec, is_running, paused_elapsed_sec, last_updated_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id) DO UPDATE SET
             id = EXCLUDED.id,
             task_id = EXCLUDED.task_id,
             start_time_ms = EXCLUDED.start_time_ms,
             planned_duration_sec = EXCLUDED.planned_duration_sec,
             is_running = EXCLUDED.is_running,
             paused_elapsed_sec = EXCLUDED.paused_elapsed_sec,
             last_updated_ms = EXCLUDED.last_updated_ms`,
          [session.id, userId, taskId, now, planned, true, 0, now]
        );
      } catch (e) {}
    }
  } else if (!session.isRunning) {
    session.isRunning = true;
    session.lastUpdatedMs = now;
    activeServerFocusSessions.set(key, session);

    if (pool) {
      try {
        await pool.query(
          "UPDATE uniwork_focus_sessions SET is_running = true, last_updated_ms = $1 WHERE user_id = $2",
          [now, userId]
        );
      } catch (e) {}
    }
  }

  return res.json({
    success: true,
    session: calculateServerSessionState(session),
  });
});

// 6. Complete or clear focus session from server
// 6. Complete or clear focus session from server with points calculation
interface FocusPointLog {
  id: string;
  userId: string;
  taskId?: string;
  plannedMinutes: number;
  actualMinutes: number;
  pointsEarned: number;
  completedAt: string;
}

const inMemoryFocusPointsLogs: FocusPointLog[] = [
  { id: 'seed_1', userId: 'usr-mathias-cheow-primary', plannedMinutes: 30, actualMinutes: 30, pointsEarned: 30, completedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'seed_2', userId: 'usr-mathias-cheow-primary', plannedMinutes: 45, actualMinutes: 42, pointsEarned: 47, completedAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 'seed_3', userId: 'usr-mathias-cheow-primary', plannedMinutes: 25, actualMinutes: 25, pointsEarned: 25, completedAt: new Date(Date.now() - 259200000).toISOString() },
];

const userLastIncrementalPointMs = new Map<string, number>();

function calculateUniWorkPoints(plannedMin: number, actualMin: number): number {
  const P = Math.max(1, Math.round(plannedMin || 25));
  const A = Math.max(0, Math.round(actualMin || 0));
  const Z = Math.floor(P * 0.80);

  let points = 0;
  if (A >= Z && A < P) {
    points = P + Math.round((P - A) * 0.5);
  } else if (A === P) {
    points = P;
  } else if (A < Z) {
    points = A;
  } else if (P < A && A <= P + 10) {
    points = P - (A - P);
  } else if (A > P + 10) {
    points = Math.round(P * 0.10);
  }

  return Math.max(0, points);
}

app.post("/api/focus/session/complete", async (req, res) => {
  const { taskId, userId = "usr-mathias-cheow-primary", plannedMinutes = 25, actualMinutes = 25, status, isIncomplete } = req.body;

  // If ended as incomplete or cancelled, clear server session without awarding points
  if (status === 'incomplete' || isIncomplete) {
    if (taskId) {
      activeServerFocusSessions.delete(`${userId}_${taskId}`);
    }
    for (const [mKey, mVal] of Array.from(activeServerFocusSessions.entries())) {
      if (mVal.userId === userId) {
        activeServerFocusSessions.delete(mKey);
      }
    }

    if (pool) {
      try {
        await pool.query("DELETE FROM uniwork_focus_sessions WHERE user_id = $1", [userId]);
      } catch (err) {
        console.warn("DB focus session delete incomplete error:", err);
      }
    }

    broadcastUpdate();
    return res.json({
      success: true,
      pointsEarned: 0,
      message: "Focus session ended as incomplete",
    });
  }

  let finalPlanned = Number(plannedMinutes) || 25;
  let finalActual = Number(actualMinutes) || 25;

  // If in-memory session existed, check its values
  const activeSess = activeServerFocusSessions.get(`${userId}_${taskId}`) || activeServerFocusSessions.get(`${userId}_open`);
  if (activeSess) {
    const calc = calculateServerSessionState(activeSess);
    finalPlanned = Math.max(1, Math.round(calc.plannedDurationSec / 60));
    finalActual = Math.max(0, Math.round(calc.totalElapsedSec / 60));
  }

  const pointsEarned = calculateUniWorkPoints(finalPlanned, finalActual);
  const logId = `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  inMemoryFocusPointsLogs.push({
    id: logId,
    userId,
    taskId,
    plannedMinutes: finalPlanned,
    actualMinutes: finalActual,
    pointsEarned,
    completedAt: nowIso,
  });

  if (taskId) {
    activeServerFocusSessions.delete(`${userId}_${taskId}`);
  }
  for (const [mKey, mVal] of Array.from(activeServerFocusSessions.entries())) {
    if (mVal.userId === userId) {
      activeServerFocusSessions.delete(mKey);
    }
  }

  if (pool) {
    try {
      await pool.query("DELETE FROM uniwork_focus_sessions WHERE user_id = $1", [userId]);
      await pool.query(
        `INSERT INTO uniwork_focus_points_logs (id, user_id, task_id, planned_minutes, actual_minutes, points_earned, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [logId, userId, taskId || null, finalPlanned, finalActual, pointsEarned]
      );
    } catch (err) {
      console.warn("DB focus session delete/points log error:", err);
    }
  }

  broadcastUpdate();
  return res.json({
    success: true,
    pointsEarned,
    message: "Focus session cleared and points logged",
  });
});

// GET /api/focus/points/stats - Get 7-day rolling average & lifetime sessions
app.get("/api/focus/points/stats", async (req, res) => {
  const userId = String(req.query.userId || "usr-mathias-cheow-primary");

  let totalLifetimeSessions = 0;
  let rollingAverage = 0;
  let todayPoints = 0;

  if (pool) {
    try {
      const countRes = await pool.query(
        "SELECT COUNT(*) as count FROM uniwork_focus_points_logs WHERE user_id = $1",
        [userId]
      );
      totalLifetimeSessions = parseInt(countRes.rows[0]?.count || "0", 10);

      const rollRes = await pool.query(
        "SELECT SUM(points_earned) as sum_points FROM uniwork_focus_points_logs WHERE user_id = $1 AND completed_at >= NOW() - INTERVAL '7 days'",
        [userId]
      );
      const sumPoints = parseInt(rollRes.rows[0]?.sum_points || "0", 10);
      rollingAverage = Math.round(sumPoints / 7);

      const totalPtsRes = await pool.query(
        "SELECT SUM(points_earned) as total_points FROM uniwork_focus_points_logs WHERE user_id = $1",
        [userId]
      );
      const totalPoints = parseInt(totalPtsRes.rows[0]?.total_points || "0", 10);

      const todayRes = await pool.query(
        "SELECT SUM(points_earned) as sum_today FROM uniwork_focus_points_logs WHERE user_id = $1 AND completed_at >= (NOW() - INTERVAL '24 hours')",
        [userId]
      );
      todayPoints = parseInt(todayRes.rows[0]?.sum_today || "0", 10);

      return res.json({
        success: true,
        totalPoints,
        rollingAverage: totalPoints > 0 ? totalPoints : rollingAverage,
        totalLifetimeSessions,
        todayPoints,
      });
    } catch (err) {
      console.warn("DB get focus points error, falling back to memory:", err);
    }
  }

  // Memory fallback
  const userLogs = inMemoryFocusPointsLogs.filter((l) => l.userId === userId);
  totalLifetimeSessions = userLogs.length;

  const totalPointsMemory = userLogs.reduce((acc, l) => acc + l.pointsEarned, 0);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentLogs = userLogs.filter((l) => new Date(l.completedAt).getTime() >= sevenDaysAgo);
  const sumPoints = recentLogs.reduce((acc, l) => acc + l.pointsEarned, 0);
  rollingAverage = totalPointsMemory > 0 ? totalPointsMemory : Math.round(sumPoints / 7);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  todayPoints = userLogs
    .filter((l) => new Date(l.completedAt).getTime() >= startOfToday.getTime())
    .reduce((acc, l) => acc + l.pointsEarned, 0);

  return res.json({
    success: true,
    totalPoints: totalPointsMemory,
    rollingAverage,
    totalLifetimeSessions,
    todayPoints,
  });
});

// Presence Heartbeat & Multi-Room Focus System
interface PresenceRecord {
  userId: string;
  userName: string;
  avatarUrl: string;
  points: number;
  timeLeftMinutes: number;
  timeLeftSeconds?: number;
  elapsedSeconds: number;
  lastHeartbeatMs: number;
}

interface FocusRoomRecord {
  code: string;
  name: string;
  creatorUserId: string;
  createdAtMs: number;
}

const inMemoryRooms = new Map<string, FocusRoomRecord>();
inMemoryRooms.set("000000", {
  code: "000000",
  name: "Global Focus Room",
  creatorUserId: "system",
  createdAtMs: Date.now(),
});

const inMemoryMemberships = new Map<string, Set<string>>();
const inMemoryCustomRoomNames = new Map<string, Map<string, string>>();
const inMemoryRoomPresence = new Map<string, Map<string, PresenceRecord>>();

async function getUserRoomCodes(userId: string): Promise<string[]> {
  const codes = new Set<string>(["000000"]);
  if (pool) {
    try {
      const res = await pool.query("SELECT room_code FROM uniwork_focus_memberships WHERE user_id = $1", [userId]);
      res.rows.forEach(r => codes.add(r.room_code));
    } catch (err) {
      console.warn("DB get user room codes error:", err);
    }
  }
  let userSet = inMemoryMemberships.get(userId);
  if (userSet) {
    userSet.forEach(c => codes.add(c));
  }
  return Array.from(codes);
}

// GET /api/focus/rooms - List all rooms joined by the user
app.get("/api/focus/rooms", async (req, res) => {
  const userId = String(req.query.userId || "usr-mathias-cheow-primary");
  const userRoomCodes = await getUserRoomCodes(userId);

  const userNamesMap = new Map<string, string>();
  if (pool) {
    try {
      const resNames = await pool.query("SELECT room_code, custom_name FROM uniwork_focus_custom_names WHERE user_id = $1", [userId]);
      resNames.rows.forEach(r => userNamesMap.set(r.room_code, r.custom_name));
    } catch (e) {}
  }
  const memMap = inMemoryCustomRoomNames.get(userId);
  if (memMap) {
    memMap.forEach((k, v) => userNamesMap.set(v, k));
  }

  if (pool) {
    try {
      const resRooms = await pool.query("SELECT code, name, creator_user_id, created_at_ms FROM uniwork_focus_rooms");
      resRooms.rows.forEach(r => {
        if (!inMemoryRooms.has(r.code)) {
          inMemoryRooms.set(r.code, {
            code: r.code,
            name: r.name,
            creatorUserId: r.creator_user_id,
            createdAtMs: Number(r.created_at_ms),
          });
        }
      });
    } catch (e) {}
  }

  const threshold = Date.now() - 45000;
  const roomsList = [];

  for (const code of userRoomCodes) {
    const r = inMemoryRooms.get(code);
    const roomName = userNamesMap.get(code) || (r ? r.name : code === "000000" ? "Global Focus Room" : "Focus Room");

    let peerCount = 0;
    const roomPresence = inMemoryRoomPresence.get(code);
    if (roomPresence) {
      for (const p of roomPresence.values()) {
        if (p.userId !== userId && p.lastHeartbeatMs >= threshold) {
          peerCount++;
        }
      }
    }

    const activeBots = getActiveBotsForRoom(code);
    peerCount += activeBots.length;

    roomsList.push({
      code,
      name: roomName,
      isGlobal: code === "000000",
      creatorUserId: r ? r.creatorUserId : "system",
      peerCount,
    });
  }

  return res.json({ success: true, rooms: roomsList });
});

// GET /api/focus/rooms/validate - Check if a 6-digit room code is valid
app.get("/api/focus/rooms/validate", async (req, res) => {
  const code = String(req.query.code || "").trim();
  if (!code) {
    return res.json({ success: false, exists: false, error: "Please enter a 6-digit focus room code." });
  }

  let r = inMemoryRooms.get(code);
  if (!r && code !== "000000" && pool) {
    try {
      const dbRes = await pool.query("SELECT code, name, creator_user_id, created_at_ms FROM uniwork_focus_rooms WHERE code = $1", [code]);
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        r = { code: row.code, name: row.name, creatorUserId: row.creator_user_id, createdAtMs: Number(row.created_at_ms) };
        inMemoryRooms.set(code, r);
      }
    } catch (e) {}
  }

  if (r || code === "000000") {
    return res.json({
      success: true,
      exists: true,
      room: {
        code,
        name: r ? r.name : "Global Focus Room",
        isGlobal: code === "000000",
      },
    });
  }

  return res.json({
    success: false,
    exists: false,
    error: "Invalid room code. Please check the 6-digit code and try again.",
  });
});

// POST /api/focus/rooms/create - Create a new room with a unique 6-digit code
app.post("/api/focus/rooms/create", async (req, res) => {
  const { userId = "usr-mathias-cheow-primary", name } = req.body;
  const roomName = (name || "").trim() || "Focus Room";

  let newCode = "";
  let attempts = 0;
  do {
    newCode = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
  } while ((inMemoryRooms.has(newCode) || await roomExistsInDb(newCode)) && attempts < 100);

  async function roomExistsInDb(c: string) {
    if (!pool) return false;
    try {
      const dbRes = await pool.query("SELECT code FROM uniwork_focus_rooms WHERE code = $1", [c]);
      return dbRes.rows.length > 0;
    } catch {
      return false;
    }
  }

  const newRoom: FocusRoomRecord = {
    code: newCode,
    name: roomName,
    creatorUserId: userId,
    createdAtMs: Date.now(),
  };

  inMemoryRooms.set(newCode, newRoom);

  if (pool) {
    try {
      await pool.query(
        "INSERT INTO uniwork_focus_rooms (code, name, creator_user_id, created_at_ms) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name",
        [newCode, roomName, userId, newRoom.createdAtMs]
      );
      await pool.query(
        "INSERT INTO uniwork_focus_memberships (user_id, room_code) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, newCode]
      );
    } catch (err) {
      console.warn("DB create focus room error:", err);
    }
  }

  let userSet = inMemoryMemberships.get(userId);
  if (!userSet) {
    userSet = new Set<string>(["000000"]);
    inMemoryMemberships.set(userId, userSet);
  }
  userSet.add(newCode);

  return res.json({
    success: true,
    room: {
      code: newCode,
      name: roomName,
      isGlobal: false,
      creatorUserId: userId,
      peerCount: 0,
    },
  });
});

// POST /api/focus/rooms/join - Join room by 6-digit code
app.post("/api/focus/rooms/join", async (req, res) => {
  const { userId = "usr-mathias-cheow-primary", roomCode = "" } = req.body;
  const code = String(roomCode).trim();

  if (!code) {
    return res.json({ success: false, error: "Please enter a 6-digit focus room code." });
  }

  let r = inMemoryRooms.get(code);
  if (!r && code !== "000000" && pool) {
    try {
      const dbRes = await pool.query("SELECT code, name, creator_user_id, created_at_ms FROM uniwork_focus_rooms WHERE code = $1", [code]);
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        r = { code: row.code, name: row.name, creatorUserId: row.creator_user_id, createdAtMs: Number(row.created_at_ms) };
        inMemoryRooms.set(code, r);
      }
    } catch (e) {}
  }

  if (!r && code !== "000000") {
    return res.json({
      success: false,
      error: "Invalid room code. Please check the 6-digit code and try again.",
    });
  }

  if (pool) {
    try {
      await pool.query(
        "INSERT INTO uniwork_focus_memberships (user_id, room_code) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, code]
      );
    } catch (err) {
      console.warn("DB join focus room error:", err);
    }
  }

  let userSet = inMemoryMemberships.get(userId);
  if (!userSet) {
    userSet = new Set<string>(["000000"]);
    inMemoryMemberships.set(userId, userSet);
  }
  userSet.add(code);

  const roomName = r ? r.name : "Global Focus Room";

  return res.json({
    success: true,
    room: {
      code,
      name: roomName,
      isGlobal: code === "000000",
      creatorUserId: r ? r.creatorUserId : "system",
      peerCount: 0,
    },
  });
});

// DELETE /api/focus/rooms/:code - Remove/Leave a room
app.delete("/api/focus/rooms/:code", async (req, res) => {
  const code = String(req.params.code || "").trim();
  const userId = String(req.query.userId || "usr-mathias-cheow-primary");

  if (code === "000000") {
    return res.status(400).json({ success: false, error: "The Global Focus Room cannot be deleted." });
  }

  if (pool) {
    try {
      await pool.query("DELETE FROM uniwork_focus_memberships WHERE user_id = $1 AND room_code = $2", [userId, code]);
    } catch (err) {
      console.warn("DB leave focus room error:", err);
    }
  }

  const set = inMemoryMemberships.get(userId);
  if (set) {
    set.delete(code);
  }

  return res.json({ success: true });
});

// POST /api/focus/rooms/rename - Rename a room
app.post("/api/focus/rooms/rename", async (req, res) => {
  const { userId = "usr-mathias-cheow-primary", roomCode = "", newName = "" } = req.body;
  const code = String(roomCode).trim();
  const name = String(newName).trim();

  if (code === "000000") {
    return res.status(400).json({ success: false, error: "The Global Focus Room cannot be renamed." });
  }

  if (!name) {
    return res.status(400).json({ success: false, error: "Room name cannot be empty." });
  }

  const r = inMemoryRooms.get(code);
  if (r) {
    r.name = name;
  }

  if (pool) {
    try {
      await pool.query(
        "INSERT INTO uniwork_focus_custom_names (user_id, room_code, custom_name) VALUES ($1, $2, $3) ON CONFLICT (user_id, room_code) DO UPDATE SET custom_name = EXCLUDED.custom_name",
        [userId, code, name]
      );
      await pool.query(
        "UPDATE uniwork_focus_rooms SET name = $1 WHERE code = $2 AND creator_user_id = $3",
        [name, code, userId]
      );
    } catch (err) {
      console.warn("DB rename focus room error:", err);
    }
  }

  let userMap = inMemoryCustomRoomNames.get(userId);
  if (!userMap) {
    userMap = new Map<string, string>();
    inMemoryCustomRoomNames.set(userId, userMap);
  }
  userMap.set(code, name);

  return res.json({ success: true, name });
});

app.post("/api/focus/presence/heartbeat", async (req, res) => {
  const {
    userId = "usr-mathias-cheow-primary",
    userName = "Student",
    avatarUrl = "https://api.dicebear.com/7.x/adventurer/svg?seed=student&backgroundColor=b6e3f4",
    points = 0,
    timeLeftMinutes = 25,
    timeLeftSeconds = 1500,
    elapsedSeconds = 0,
    roomCode = "000000",
  } = req.body;

  const code = String(roomCode || "000000").trim();
  const now = Date.now();

  // 30-second live incremental points accrual during active study
  if (elapsedSeconds > 0) {
    const lastTick = userLastIncrementalPointMs.get(userId) || 0;
    if (now - lastTick >= 30000) {
      userLastIncrementalPointMs.set(userId, now);
      const pointsEarned = 1;
      const logId = `pt_inc_${now}_${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      inMemoryFocusPointsLogs.push({
        id: logId,
        userId,
        plannedMinutes: 0.5,
        actualMinutes: 0.5,
        pointsEarned,
        completedAt: nowIso,
      });

      if (pool) {
        pool.query(
          `INSERT INTO uniwork_focus_points_logs (id, user_id, task_id, planned_minutes, actual_minutes, points_earned, completed_at)
           VALUES ($1, $2, NULL, 0.5, 0.5, $3, CURRENT_TIMESTAMP)`,
          [logId, userId, pointsEarned]
        ).catch((err) => {
          console.warn("DB incremental points log error:", err);
        });
      }
    }
  }

  const record: PresenceRecord = {
    userId,
    userName,
    avatarUrl,
    points,
    timeLeftMinutes,
    timeLeftSeconds,
    elapsedSeconds,
    lastHeartbeatMs: now,
  };

  let roomPresence = inMemoryRoomPresence.get(code);
  if (!roomPresence) {
    roomPresence = new Map<string, PresenceRecord>();
    inMemoryRoomPresence.set(code, roomPresence);
  }
  roomPresence.set(userId, record);

  return res.json({ success: true });
});

// GET /api/focus/room/peers - Get students actively studying in a Focus Room
app.get("/api/focus/room/peers", async (req, res) => {
  const currentUserId = String(req.query.userId || "usr-mathias-cheow-primary");
  const code = String(req.query.roomCode || "000000").trim();
  const threshold = Date.now() - 45000;

  const peers: any[] = [];
  const roomPresence = inMemoryRoomPresence.get(code);

  if (roomPresence) {
    for (const p of roomPresence.values()) {
      if (p.userId !== currentUserId && p.lastHeartbeatMs >= threshold) {
        const hrs = Math.floor(p.elapsedSeconds / 3600);
        const mins = Math.floor((p.elapsedSeconds % 3600) / 60);
        const durFmt = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

        peers.push({
          id: p.userId,
          name: p.userName,
          avatarUrl: p.avatarUrl,
          points: p.points,
          status: (p.timeLeftSeconds || 0) < 0 ? 'overtime' : 'studying',
          timeLeftMinutes: p.timeLeftMinutes,
          timeLeftSeconds: p.timeLeftSeconds !== undefined ? p.timeLeftSeconds : p.timeLeftMinutes * 60,
          elapsedSeconds: p.elapsedSeconds,
          studyDurationFormatted: durFmt,
        });
      }
    }
  }

  // Include active simulated study bots with persistence
  if (code === '000000') {
    const now = Date.now();
    for (const bot of STUDY_BOTS) {
      if (peers.some(p => p.id === bot.id)) continue;

      // 1. Check Archetype Active Window (UTC)
      const d = new Date(now);
      const h = d.getUTCHours();
      let active = false;
      if (bot.archetype === 'early_bird') active = h >= 5 && h < 15;
      else if (bot.archetype === 'afternoon_grinder') active = h >= 11 && h < 20;
      else if (bot.archetype === 'night_owl') active = h >= 17 || h < 4;
      else if (bot.archetype === 'pomodoro_sprinter') active = h >= 8 && h < 18;
      else if (bot.archetype === 'deep_work') active = h >= 9 && h < 19;

      if (!active) continue;

      // 2. Persistent Session Management
      let botSession: any = null;
      if (pool) {
        try {
          const res = await pool.query("SELECT * FROM uniwork_bot_active_sessions WHERE bot_id = $1", [bot.id]);
          if (res.rows.length > 0) {
            botSession = res.rows[0];
            const elapsed = Math.floor((now - Number(botSession.session_start_ms)) / 1000);
            
            // If session expired (over 4 hours or past planned duration + 15m), reset/re-randomize
            if (elapsed > Number(botSession.planned_duration_sec) + 900 || elapsed > 14400) {
              await pool.query("DELETE FROM uniwork_bot_active_sessions WHERE bot_id = $1", [bot.id]);
              botSession = null;
            }
          }

          if (!botSession) {
            // Create new random persistent session
            // Random start time between 5m and 120m ago
            const jitterStartMs = now - (Math.floor(Math.random() * 115 * 60 * 1000) + 300000);
            const plannedSec = Math.floor(Math.random() * (7200 - 2700 + 1)) + 2700; // 45m to 2h
            await pool.query(
              "INSERT INTO uniwork_bot_active_sessions (bot_id, session_start_ms, planned_duration_sec, room_code, status, last_updated_ms) VALUES ($1, $2, $3, $4, $5, $6)",
              [bot.id, jitterStartMs, plannedSec, '000000', 'studying', now]
            );
            const res2 = await pool.query("SELECT * FROM uniwork_bot_active_sessions WHERE bot_id = $1", [bot.id]);
            botSession = res2.rows[0];
          }
        } catch (err) {
          console.warn("Bot session DB error:", err);
        }
      }

      // 3. Calculate State
      if (botSession) {
        const startMs = Number(botSession.session_start_ms);
        const plannedSec = Number(botSession.planned_duration_sec);
        const elapsedSec = Math.floor((now - startMs) / 1000);
        const remainingSec = plannedSec - elapsedSec;
        
        // Correct planned duration string for UI parsing
        const p_hrs = Math.floor(plannedSec / 3600);
        const p_mins = Math.floor((plannedSec % 3600) / 60);
        const plannedFmt = p_hrs > 0 ? `${p_hrs}h ${p_mins}m` : `${p_mins}m`;

        peers.push({
          id: bot.id,
          name: bot.name,
          avatarUrl: bot.avatarUrl,
          points: bot.basePoints + Math.floor(elapsedSec / 60),
          status: remainingSec < 0 ? 'overtime' : 'studying',
          timeLeftMinutes: Math.max(0, Math.ceil(remainingSec / 60)),
          timeLeftSeconds: remainingSec, // Allow negative here for StudentProfileView to calculate overtime
          elapsedSeconds: elapsedSec,
          plannedDurationSec: plannedSec,
          studyDurationFormatted: plannedFmt, // Should be planned time
          isBot: true,
          major: bot.major,
        });
      }
    }
  }

  return res.json({
    success: true,
    count: peers.length,
    peers,
  });
});

// GET /api/focus/bots/status-log - Get bot status logs from uniwork_bot_status_log table
app.get("/api/focus/bots/status-log", async (req, res) => {
  const botId = String(req.query.botId || "").trim();
  const limit = parseInt(String(req.query.limit || "50"), 10);

  if (pool) {
    try {
      let queryStr = "SELECT id, bot_id, bot_name, room_code, status, task_title, duration_formatted, time_left_minutes, timestamp_ms, recorded_at FROM uniwork_bot_status_log";
      const params: any[] = [];
      if (botId) {
        queryStr += " WHERE bot_id = $1";
        params.push(botId);
        queryStr += " ORDER BY timestamp_ms DESC LIMIT $2";
        params.push(limit);
      } else {
        queryStr += " ORDER BY timestamp_ms DESC LIMIT $1";
        params.push(limit);
      }
      const dbRes = await pool.query(queryStr, params);
      return res.json({ success: true, logs: dbRes.rows });
    } catch (err) {
      console.warn("Error fetching bot status logs:", err);
    }
  }

  return res.json({ success: true, logs: [] });
});

// GET /api/focus/student/profile - Fetch full student profile by handle / username
app.get("/api/focus/student/profile", async (req, res) => {
  const username = String(req.query.username || "tgest").trim();

  // Special case for test profile 'tgest'
  if (username.toLowerCase() === "tgest") {
    return res.json({
      success: true,
      profile: {
        id: "peer_tgest",
        name: "tgest",
        avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=tgest&backgroundColor=b6e3f4",
        points: 42,
        status: "studying",
        timeLeftMinutes: 32,
        studyDurationFormatted: "1h 45m",
        totalLifetimeSeconds: 51600, // 14h 20m
        totalLifetimeFormatted: "14h 20m",
        reactions: inMemoryReactions.get("tgest") || { thumbsup: 12, fire: 28, bicep: 19 },
      },
    });
  }

  // Find in memory presence across rooms
  let foundPresence: any = null;
  for (const roomMap of inMemoryRoomPresence.values()) {
    for (const p of roomMap.values()) {
      if (p.userName && p.userName.toLowerCase() === username.toLowerCase()) {
        foundPresence = p;
        break;
      }
    }
    if (foundPresence) break;
  }

  // Find in DB if pool
  if (!foundPresence && pool) {
    try {
      const dbRes = await pool.query(
        "SELECT * FROM uniwork_focus_presence WHERE LOWER(user_name) = LOWER($1) ORDER BY last_heartbeat_ms DESC LIMIT 1",
        [username]
      );
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        foundPresence = {
          userId: row.user_id,
          userName: row.user_name,
          avatarUrl: row.avatar_url,
          points: Number(row.points),
          timeLeftMinutes: Number(row.time_left_minutes),
          elapsedSeconds: Number(row.elapsed_seconds),
        };
      }
    } catch (e) {}
  }

  if (!foundPresence) {
    return res.json({
      success: true,
      profile: {
        id: `user_${username}`,
        name: username,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4`,
        points: 25,
        status: "studying",
        timeLeftMinutes: 20,
        studyDurationFormatted: "45m",
        totalLifetimeSeconds: 28800, // 8h
        totalLifetimeFormatted: "8h 00m",
        reactions: inMemoryReactions.get(username.toLowerCase()) || { thumbsup: 5, fire: 8, bicep: 4 },
      },
    });
  }

  const elapsedSec = foundPresence.elapsedSeconds || 1800;
  const totalLifetimeSec = Math.max(28800, elapsedSec * 4 + 14400); // realistic total time on UniWork
  const lHrs = Math.floor(totalLifetimeSec / 3600);
  const lMins = Math.floor((totalLifetimeSec % 3600) / 60);

  const eHrs = Math.floor(elapsedSec / 3600);
  const eMins = Math.floor((elapsedSec % 3600) / 60);

  const reactions = inMemoryReactions.get(username.toLowerCase()) || { thumbsup: 3, fire: 6, bicep: 2 };

  return res.json({
    success: true,
    profile: {
      id: foundPresence.userId,
      name: foundPresence.userName,
      avatarUrl: foundPresence.avatarUrl,
      points: foundPresence.points,
      status: "studying",
      timeLeftMinutes: foundPresence.timeLeftMinutes,
      studyDurationFormatted: eHrs > 0 ? `${eHrs}h ${eMins}m` : `${eMins}m`,
      totalLifetimeSeconds: totalLifetimeSec,
      totalLifetimeFormatted: `${lHrs}h ${lMins}m`,
      reactions,
    },
  });
});

// POST /api/focus/student/react - Send live cheer emoji reaction to a student
app.post("/api/focus/student/react", async (req, res) => {
  const { targetUserName = "", reactionType = "thumbsup" } = req.body;
  const key = String(targetUserName).toLowerCase().trim();
  if (!key) {
    return res.status(400).json({ success: false, error: "targetUserName required" });
  }

  const current = inMemoryReactions.get(key) || { thumbsup: 0, fire: 0, bicep: 0 };
  if (reactionType === "thumbsup") current.thumbsup += 1;
  else if (reactionType === "fire") current.fire += 1;
  else if (reactionType === "bicep") current.bicep += 1;

  inMemoryReactions.set(key, current);

  return res.json({
    success: true,
    reactions: current,
  });
});

// User Avatar persistence
const inMemoryAvatars = new Map<string, { avatarUrl: string; style: string; seed: string }>();

app.get("/api/user/avatar", async (req, res) => {
  const userId = String(req.query.userId || "usr-mathias-cheow-primary");
  if (pool) {
    try {
      const dbRes = await pool.query(
        "SELECT avatar_url, style, seed FROM uniwork_user_avatars WHERE user_id = $1",
        [userId]
      );
      if (dbRes.rows.length > 0) {
        return res.json({ success: true, ...dbRes.rows[0], avatarUrl: dbRes.rows[0].avatar_url });
      }
    } catch (err) {
      console.warn("DB get avatar error:", err);
    }
  }

  const mem = inMemoryAvatars.get(userId) || {
    avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=student&backgroundColor=ffd5dc",
    style: "adventurer",
    seed: "student",
  };
  return res.json({ success: true, ...mem });
});

app.post("/api/user/avatar", async (req, res) => {
  const { userId = "usr-mathias-cheow-primary", avatarUrl, style = "adventurer", seed = "student" } = req.body;
  if (!avatarUrl) {
    return res.status(400).json({ success: false, error: "avatarUrl required" });
  }

  inMemoryAvatars.set(userId, { avatarUrl, style, seed });

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO uniwork_user_avatars (user_id, avatar_url, style, seed, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url, style = EXCLUDED.style, seed = EXCLUDED.seed, updated_at = CURRENT_TIMESTAMP`,
        [userId, avatarUrl, style, seed]
      );
    } catch (err) {
      console.warn("DB set avatar error:", err);
    }
  }

  return res.json({ success: true, avatarUrl, style, seed });
});

app.get("/api/user/profile", async (req, res) => {
  const userId = String(req.query.userId || "usr-mathias-cheow-primary");
  let profile = { displayName: 'Student', avatarUrl: '', style: 'adventurer', seed: 'Atlas' };
  if (pool) {
    try {
      const dbRes = await pool.query("SELECT display_name, avatar_url, style, seed FROM uniwork_user_profiles WHERE user_id = $1", [userId]);
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        profile = {
          displayName: row.display_name || 'Student',
          avatarUrl: row.avatar_url || '',
          style: row.style || 'adventurer',
          seed: row.seed || 'Atlas',
        };
      }
    } catch (e) {
      console.warn("DB get user profile error:", e);
    }
  }
  return res.json({ success: true, ...profile });
});

app.post("/api/user/profile", async (req, res) => {
  const { userId = "usr-mathias-cheow-primary", userName, displayName, avatarUrl, style, seed } = req.body;
  const nameToSave = (displayName || userName || "Student").trim();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO uniwork_user_profiles (user_id, display_name, avatar_url, style, seed, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), uniwork_user_profiles.display_name),
           avatar_url = COALESCE(EXCLUDED.avatar_url, uniwork_user_profiles.avatar_url),
           style = COALESCE(EXCLUDED.style, uniwork_user_profiles.style),
           seed = COALESCE(EXCLUDED.seed, uniwork_user_profiles.seed),
           updated_at = CURRENT_TIMESTAMP`,
        [userId, nameToSave, avatarUrl || null, style || 'adventurer', seed || 'Atlas']
      );
    } catch (err) {
      console.warn("DB save user profile error:", err);
    }
  }

  return res.json({ success: true, displayName: nameToSave });
});

// Validate student display name uniqueness
app.post("/api/user/name/validate", async (req, res) => {
  const { userId = "usr-mathias-cheow-primary", userName = "" } = req.body;
  const trimmed = String(userName).trim();
  if (!trimmed) {
    return res.status(400).json({ success: false, error: "Display name cannot be empty." });
  }

  // Reserved fixed system/test names
  if (trimmed.toLowerCase() === "tgest" && userId !== "usr-tgest-fixed") {
    return res.json({ success: false, error: "The name 'tgest' is a reserved profile. Please choose another name." });
  }

  // Check in-memory presence
  for (const roomMap of inMemoryRoomPresence.values()) {
    for (const [pUserId, pData] of roomMap.entries()) {
      if (pUserId !== userId && pData.userName && pData.userName.toLowerCase() === trimmed.toLowerCase()) {
        return res.json({ success: false, error: `The name '${trimmed}' is already taken by another student.` });
      }
    }
  }

  // Check database presence
  if (pool) {
    try {
      const dbRes = await pool.query(
        "SELECT user_id, user_name FROM uniwork_focus_presence WHERE LOWER(user_name) = LOWER($1) AND user_id != $2",
        [trimmed, userId]
      );
      if (dbRes.rows.length > 0) {
        return res.json({ success: false, error: `The name '${trimmed}' is already taken by another student.` });
      }
    } catch (err) {
      console.warn("DB validate name error:", err);
    }
  }

  return res.json({ success: true, available: true });
});

// --- User Reviews & Feedback Endpoints ---
const inMemoryReviews: Array<{ id: string; userId: string; rating: number; comment: string; createdAt: string }> = [];

// --- Reported Names Endpoints for Admin ---
interface ReportedNameRecord {
  id: string;
  reportedUserId: string;
  reportedName: string;
  reporterUserId: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'ignored' | 'cleared';
}

const inMemoryReportedNames: ReportedNameRecord[] = [];

// Helper to generate the next unique student_N display name
async function getNextUniqueStudentName(): Promise<string> {
  const takenNames = new Set<string>();
  takenNames.add("tgest");

  for (const roomMap of inMemoryRoomPresence.values()) {
    for (const pData of roomMap.values()) {
      if (pData.userName) {
        takenNames.add(pData.userName.trim().toLowerCase());
      }
    }
  }

  if (pool) {
    try {
      const dbRes = await pool.query("SELECT user_name FROM uniwork_focus_presence");
      dbRes.rows.forEach((row) => {
        if (row.user_name) takenNames.add(String(row.user_name).trim().toLowerCase());
      });
    } catch (e) {}
  }

  let counter = 1;
  while (takenNames.has(`student_${counter}`)) {
    counter++;
  }
  return `student_${counter}`;
}

// 1. Submit a name report
app.post("/api/reports/name", async (req, res) => {
  const { reportedUserId, reportedName, reporterUserId = "anonymous", reason = "Inappropriate display name" } = req.body;
  if (!reportedUserId || !reportedName) {
    return res.status(400).json({ success: false, error: "reportedUserId and reportedName are required" });
  }

  const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record: ReportedNameRecord = {
    id,
    reportedUserId,
    reportedName: String(reportedName).trim(),
    reporterUserId: String(reporterUserId).trim(),
    reason: String(reason).trim(),
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  inMemoryReportedNames.unshift(record);

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO uniwork_reported_names (id, reported_user_id, reported_name, reporter_user_id, reason, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING`,
        [record.id, record.reportedUserId, record.reportedName, record.reporterUserId, record.reason, record.status]
      );
    } catch (err) {
      console.warn("DB insert reported name error:", err);
    }
  }

  return res.json({ success: true, message: "Report submitted to UniWork Admin." });
});

// 2. Get pending reported names (for Admin)
app.get("/api/admin/reports", async (req, res) => {
  let pendingReports: ReportedNameRecord[] = [];

  if (pool) {
    try {
      const result = await pool.query(
        `SELECT id, reported_user_id as "reportedUserId", reported_name as "reportedName",
                reporter_user_id as "reporterUserId", reason, created_at as "createdAt", status
         FROM uniwork_reported_names WHERE status = 'pending' ORDER BY created_at DESC`
      );
      pendingReports = result.rows;
    } catch (err) {
      console.warn("DB get reports error, using memory fallback:", err);
    }
  }

  if (pendingReports.length === 0) {
    pendingReports = inMemoryReportedNames.filter((r) => r.status === 'pending');
  }

  const grouped = new Map<string, { reportedUserId: string; reportedName: string; reportCount: number; latestReportId: string; latestTimestamp: string; reasons: string[] }>();

  pendingReports.forEach((r) => {
    const existing = grouped.get(r.reportedUserId);
    if (existing) {
      existing.reportCount++;
      if (r.reason && !existing.reasons.includes(r.reason)) {
        existing.reasons.push(r.reason);
      }
    } else {
      grouped.set(r.reportedUserId, {
        reportedUserId: r.reportedUserId,
        reportedName: r.reportedName,
        reportCount: 1,
        latestReportId: r.id,
        latestTimestamp: r.createdAt,
        reasons: r.reason ? [r.reason] : [],
      });
    }
  });

  return res.json({ success: true, reports: Array.from(grouped.values()) });
});

// 3. Ignore report
app.post("/api/admin/reports/ignore", async (req, res) => {
  const { reportedUserId } = req.body;
  if (!reportedUserId) {
    return res.status(400).json({ success: false, error: "reportedUserId is required" });
  }

  inMemoryReportedNames.forEach((r) => {
    if (r.reportedUserId === reportedUserId && r.status === 'pending') {
      r.status = 'ignored';
    }
  });

  if (pool) {
    try {
      await pool.query(
        "UPDATE uniwork_reported_names SET status = 'ignored' WHERE reported_user_id = $1 AND status = 'pending'",
        [reportedUserId]
      );
    } catch (err) {
      console.warn("DB ignore report error:", err);
    }
  }

  return res.json({ success: true });
});

// 4. Clear reported name (Resets user name to next unique student_N)
app.post("/api/admin/reports/clear", async (req, res) => {
  const { reportedUserId } = req.body;
  if (!reportedUserId) {
    return res.status(400).json({ success: false, error: "reportedUserId is required" });
  }

  const newUniqueName = await getNextUniqueStudentName();

  for (const roomMap of inMemoryRoomPresence.values()) {
    const presence = roomMap.get(reportedUserId);
    if (presence) {
      presence.userName = newUniqueName;
    }
  }

  if (pool) {
    try {
      await pool.query(
        "UPDATE uniwork_focus_presence SET user_name = $1 WHERE user_id = $2",
        [newUniqueName, reportedUserId]
      );
      await pool.query(
        "UPDATE uniwork_reported_names SET status = 'cleared' WHERE reported_user_id = $1 AND status = 'pending'",
        [reportedUserId]
      );
    } catch (err) {
      console.warn("DB clear report error:", err);
    }
  }

  inMemoryReportedNames.forEach((r) => {
    if (r.reportedUserId === reportedUserId && r.status === 'pending') {
      r.status = 'cleared';
    }
  });

  return res.json({ success: true, newName: newUniqueName });
});

// GET /api/reviews - Get all reviews
app.get("/api/reviews", async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query(
        "SELECT id, user_id as \"userId\", rating, comment, created_at as \"createdAt\" FROM uniwork_reviews ORDER BY created_at DESC"
      );
      return res.json({ success: true, reviews: result.rows });
    }
  } catch (err) {
    console.warn("DB get reviews error, falling back to memory:", err);
  }
  const sorted = [...inMemoryReviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ success: true, reviews: sorted });
});

// POST /api/reviews - Submit a new review
app.post("/api/reviews", async (req, res) => {
  const { userId = "usr-mathias-cheow-primary", rating = 5, comment = "" } = req.body;
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();
  const numRating = Math.max(1, Math.min(5, Number(rating) || 5));
  const newReview = { id: reviewId, userId, rating: numRating, comment: String(comment || "").trim(), createdAt };

  inMemoryReviews.unshift(newReview);

  if (pool) {
    try {
      await pool.query(
        "INSERT INTO uniwork_reviews (id, user_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5)",
        [reviewId, userId, numRating, comment, createdAt]
      );
    } catch (err) {
      console.warn("DB insert review error:", err);
    }
  }

  return res.json({ success: true, review: newReview });
});

// DELETE /api/reviews/:id - Remove a review
app.delete("/api/reviews/:id", async (req, res) => {
  const { id } = req.params;
  const idx = inMemoryReviews.findIndex((r) => r.id === id);
  if (idx !== -1) {
    inMemoryReviews.splice(idx, 1);
  }

  if (pool) {
    try {
      await pool.query("DELETE FROM uniwork_reviews WHERE id = $1", [id]);
    } catch (err) {
      console.warn("DB delete review error:", err);
    }
  }

  return res.json({ success: true, message: "Review deleted" });
});

// --- UniWork Interactive Guide Steps Endpoints ---
let inMemoryGuideSteps: Array<{
  id: string;
  stepOrder: number;
  targetSelector: string;
  title: string;
  description: string;
  actionType: 'click_target' | 'click_next';
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  createdAt: string;
}> = [
  {
    id: 'step_default_calendar',
    stepOrder: 1,
    targetSelector: '[data-guide-id="calendar-tab"]',
    title: 'Calendar & Schedule Hub',
    description: 'View and organize your classes, assignment deadlines, and time blocks seamlessly in one calendar.',
    actionType: 'click_next',
    position: 'bottom',
    createdAt: new Date().toISOString()
  },
  {
    id: 'step_default_focus',
    stepOrder: 2,
    targetSelector: '[data-guide-id="focus-tab"]',
    title: 'Focus Lock Timer',
    description: 'Lock into deep study sessions with custom focus windows and distractor prevention.',
    actionType: 'click_next',
    position: 'bottom',
    createdAt: new Date().toISOString()
  },
  {
    id: 'step_default_tasks',
    stepOrder: 3,
    targetSelector: '[data-guide-id="tasks-tab"]',
    title: 'Kanban & Task Management',
    description: 'Manage coursework milestones using flexible Kanban boards and custom priority tags.',
    actionType: 'click_next',
    position: 'bottom',
    createdAt: new Date().toISOString()
  }
];

// GET /api/guide-steps
app.get("/api/guide-steps", async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query(
        "SELECT id, step_order as \"stepOrder\", target_selector as \"targetSelector\", title, description, action_type as \"actionType\", position, created_at as \"createdAt\" FROM uniwork_guide_steps ORDER BY step_order ASC"
      );
      if (result.rows.length > 0) {
        return res.json({ success: true, steps: result.rows });
      }
    }
  } catch (err) {
    console.warn("DB get guide steps error, using memory fallback:", err);
  }
  const sorted = [...inMemoryGuideSteps].sort((a, b) => a.stepOrder - b.stepOrder);
  return res.json({ success: true, steps: sorted });
});

// POST /api/guide-steps - Save / Add a step or replace steps array
app.post("/api/guide-steps", async (req, res) => {
  const { steps, step } = req.body;
  const createdAt = new Date().toISOString();

  if (Array.isArray(steps)) {
    // Replace all steps with provided list
    inMemoryGuideSteps = steps.map((s, idx) => ({
      id: String(s.id || `step_${Date.now()}_${idx}`),
      stepOrder: idx + 1,
      targetSelector: String(s.targetSelector || ''),
      title: String(s.title || 'Untitled Step'),
      description: String(s.description || ''),
      actionType: (s.actionType === 'click_target' ? 'click_target' : 'click_next') as 'click_target' | 'click_next',
      position: (s.position || 'auto') as 'top' | 'bottom' | 'left' | 'right' | 'auto',
      createdAt: String(s.createdAt || createdAt)
    }));

    if (pool) {
      try {
        await pool.query("DELETE FROM uniwork_guide_steps");
        for (const s of inMemoryGuideSteps) {
          await pool.query(
            "INSERT INTO uniwork_guide_steps (id, step_order, target_selector, title, description, action_type, position, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [s.id, s.stepOrder, s.targetSelector, s.title, s.description, s.actionType, s.position, s.createdAt]
          );
        }
      } catch (err) {
        console.warn("DB replace guide steps error:", err);
      }
    }
    return res.json({ success: true, steps: inMemoryGuideSteps });
  } else if (step) {
    const actionType: 'click_target' | 'click_next' = step.actionType === 'click_target' ? 'click_target' : 'click_next';
    const position: 'top' | 'bottom' | 'left' | 'right' | 'auto' = step.position || 'auto';

    const newStep = {
      id: String(step.id || `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
      stepOrder: typeof step.stepOrder === 'number' ? step.stepOrder : inMemoryGuideSteps.length + 1,
      targetSelector: String(step.targetSelector || '').trim(),
      title: String(step.title || 'Guide Step').trim(),
      description: String(step.description || '').trim(),
      actionType,
      position,
      createdAt
    };

    inMemoryGuideSteps.push(newStep);

    if (pool) {
      try {
        await pool.query(
          "INSERT INTO uniwork_guide_steps (id, step_order, target_selector, title, description, action_type, position, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [newStep.id, newStep.stepOrder, newStep.targetSelector, newStep.title, newStep.description, newStep.actionType, newStep.position, newStep.createdAt]
        );
      } catch (err) {
        console.warn("DB insert guide step error:", err);
      }
    }

    return res.json({ success: true, step: newStep, steps: inMemoryGuideSteps });
  }

  return res.status(400).json({ success: false, error: "Invalid payload" });
});

// DELETE /api/guide-steps/:id - Remove a single step
app.delete("/api/guide-steps/:id", async (req, res) => {
  const { id } = req.params;
  inMemoryGuideSteps = inMemoryGuideSteps.filter(s => s.id !== id);

  if (pool) {
    try {
      await pool.query("DELETE FROM uniwork_guide_steps WHERE id = $1", [id]);
    } catch (err) {
      console.warn("DB delete guide step error:", err);
    }
  }

  return res.json({ success: true, steps: inMemoryGuideSteps });
});

// --- UniWork Aura Configuration API (Neon Postgres Persisted) ---
let inMemoryAuraConfig = {
  auraScalePercent: 75,
  opacityPercent: 85,
  blurRadiusPercent: 80,
  showOutline: false,
  placement: 'behind'
};

// GET /api/aura-config
app.get("/api/aura-config", async (req, res) => {
  const userId = (req.query.userId as string) || 'global';
  try {
    if (pool) {
      const dbRes = await pool.query(
        "SELECT aura_scale_percent as \"auraScalePercent\", opacity_percent as \"opacityPercent\", blur_radius_percent as \"blurRadiusPercent\", show_outline as \"showOutline\", placement FROM uniwork_aura_config WHERE id = $1",
        [userId === 'global' ? 'global' : userId]
      );
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        inMemoryAuraConfig = {
          auraScalePercent: Number(row.auraScalePercent) || 75,
          opacityPercent: Number(row.opacityPercent) || 85,
          blurRadiusPercent: Number(row.blurRadiusPercent) || 80,
          showOutline: Boolean(row.showOutline),
          placement: (row.placement || 'behind') as 'behind' | 'overlay'
        };
        return res.json({ success: true, ...inMemoryAuraConfig });
      }
    }
  } catch (err) {
    console.warn("DB get aura config error, using in-memory:", err);
  }
  return res.json({ success: true, ...inMemoryAuraConfig });
});

// POST /api/aura-config
app.post("/api/aura-config", async (req, res) => {
  const {
    userId = 'global',
    auraScalePercent = 75,
    opacityPercent = 85,
    blurRadiusPercent = 80,
    showOutline = false,
    placement = 'behind'
  } = req.body;

  const targetId = userId === 'global' ? 'global' : String(userId);
  const scale = Math.max(30, Math.min(300, Number(auraScalePercent) || 75));
  const opacity = Math.max(10, Math.min(100, Number(opacityPercent) || 85));
  const blur = Math.max(10, Math.min(200, Number(blurRadiusPercent) || 80));
  const outline = Boolean(showOutline);
  const place = placement === 'overlay' ? 'overlay' : 'behind';

  inMemoryAuraConfig = {
    auraScalePercent: scale,
    opacityPercent: opacity,
    blurRadiusPercent: blur,
    showOutline: outline,
    placement: place
  };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO uniwork_aura_config (id, aura_scale_percent, opacity_percent, blur_radius_percent, show_outline, placement, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           aura_scale_percent = EXCLUDED.aura_scale_percent,
           opacity_percent = EXCLUDED.opacity_percent,
           blur_radius_percent = EXCLUDED.blur_radius_percent,
           show_outline = EXCLUDED.show_outline,
           placement = EXCLUDED.placement,
           updated_at = CURRENT_TIMESTAMP`,
        [targetId, scale, opacity, blur, outline, place]
      );
    } catch (err) {
      console.warn("DB update aura config error:", err);
    }
  }

  broadcastUpdate();
  return res.json({ success: true, ...inMemoryAuraConfig });
});

// --- UniWork Admin Accounts & Encrypted Chat Endpoints ---
const SUPER_ADMIN_IDS = ["usr_g_8cced70b14994d07", "usr_g_100319333273050289112"];
function isSuperAdmin(id?: string | null): boolean {
  if (!id) return false;
  return SUPER_ADMIN_IDS.includes(id);
}

let inMemoryAdminAccounts = new Map<string, { id: string; name: string; updatedAt: string }>([
  ["usr_g_8cced70b14994d07", { id: "usr_g_8cced70b14994d07", name: "Super Admin", updatedAt: new Date().toISOString() }],
  ["usr_g_100319333273050289112", { id: "usr_g_100319333273050289112", name: "Super Admin", updatedAt: new Date().toISOString() }],
]);

interface EncryptedAdminMessage {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedPayload: string;
  isRead: boolean;
  createdAt: string;
}

let inMemoryAdminMessages: EncryptedAdminMessage[] = [];

// GET /api/admin/accounts - Get list of admin accounts with names
app.get("/api/admin/accounts", async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query(
        'SELECT id, name, updated_at as "updatedAt" FROM uniwork_admin_accounts ORDER BY updated_at ASC'
      );
      if (result.rows.length > 0) {
        result.rows.forEach((r) => {
          inMemoryAdminAccounts.set(r.id, { id: r.id, name: r.name, updatedAt: r.updatedAt });
        });
      }
    }
  } catch (err) {
    console.warn("DB get admin accounts error, using memory fallback:", err);
  }

  // Ensure super admins always exist
  for (const sId of SUPER_ADMIN_IDS) {
    if (!inMemoryAdminAccounts.has(sId)) {
      inMemoryAdminAccounts.set(sId, {
        id: sId,
        name: "Super Admin",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const list = Array.from(inMemoryAdminAccounts.values());
  return res.json({ success: true, accounts: list });
});

// POST /api/admin/accounts - Super Admin can set or rename admin names
app.post("/api/admin/accounts", async (req, res) => {
  const { id, name, callerUserId } = req.body;

  if (!isSuperAdmin(callerUserId)) {
    return res.status(403).json({
      success: false,
      error: "Authorization failed: Only the Super Admin can assign or change admin names.",
    });
  }

  const cleanId = String(id || "").trim();
  const cleanName = String(name || "").trim().slice(0, 60);

  if (!cleanId || !cleanName) {
    return res.status(400).json({ success: false, error: "Valid Admin ID and Name are required." });
  }

  const updatedAt = new Date().toISOString();
  const record = { id: cleanId, name: cleanName, updatedAt };
  inMemoryAdminAccounts.set(cleanId, record);

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO uniwork_admin_accounts (id, name, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP`,
        [cleanId, cleanName]
      );
    } catch (err) {
      console.warn("DB insert/update admin account error:", err);
    }
  }

  broadcastUpdate();
  return res.json({ success: true, account: record });
});

// DELETE /api/admin/accounts/:id - Remove an admin account
app.delete("/api/admin/accounts/:id", async (req, res) => {
  const { id } = req.params;
  const callerUserId = (req.headers["x-caller-user-id"] as string) || (req.query.callerUserId as string);

  if (!isSuperAdmin(callerUserId)) {
    return res.status(403).json({
      success: false,
      error: "Authorization failed: Only the Super Admin can remove admin accounts.",
    });
  }

  if (isSuperAdmin(id)) {
    return res.status(400).json({ success: false, error: "The primary Super Admin cannot be deleted." });
  }

  inMemoryAdminAccounts.delete(id);

  if (pool) {
    try {
      await pool.query("DELETE FROM uniwork_admin_accounts WHERE id = $1", [id]);
    } catch (err) {
      console.warn("DB delete admin account error:", err);
    }
  }

  broadcastUpdate();
  return res.json({ success: true, message: "Admin account removed" });
});

// GET /api/admin/messages - Fetch encrypted messages for a user
app.get("/api/admin/messages", async (req, res) => {
  const userId = (req.query.userId as string) || "";
  const contactId = (req.query.contactId as string) || "";

  if (!userId) {
    return res.status(400).json({ success: false, error: "userId parameter required" });
  }

  let messages: EncryptedAdminMessage[] = [];

  if (pool) {
    try {
      let query = `
        SELECT id, sender_id as "senderId", receiver_id as "receiverId",
               encrypted_payload as "encryptedPayload", is_read as "isRead",
               created_at as "createdAt"
        FROM uniwork_admin_messages
      `;
      let params: any[] = [];

      if (contactId) {
        query += ` WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC`;
        params = [userId, contactId];
      } else {
        query += ` WHERE sender_id = $1 OR receiver_id = $1 ORDER BY created_at ASC`;
        params = [userId];
      }

      const dbRes = await pool.query(query, params);
      messages = dbRes.rows.map((r) => ({
        id: r.id,
        senderId: r.senderId,
        receiverId: r.receiverId,
        encryptedPayload: r.encryptedPayload,
        isRead: Boolean(r.isRead),
        createdAt: r.createdAt,
      }));
    } catch (err) {
      console.warn("DB fetch admin messages error, fallback to memory:", err);
    }
  }

  if (messages.length === 0 && inMemoryAdminMessages.length > 0) {
    if (contactId) {
      messages = inMemoryAdminMessages.filter(
        (m) =>
          (m.senderId === userId && m.receiverId === contactId) ||
          (m.senderId === contactId && m.receiverId === userId)
      );
    } else {
      messages = inMemoryAdminMessages.filter((m) => m.senderId === userId || m.receiverId === userId);
    }
  }

  return res.json({ success: true, messages });
});

// POST /api/admin/messages - Send a new encrypted message
app.post("/api/admin/messages", async (req, res) => {
  const { id, senderId, receiverId, encryptedPayload } = req.body;

  if (!senderId || !receiverId || !encryptedPayload) {
    return res.status(400).json({ success: false, error: "senderId, receiverId, and encryptedPayload are required" });
  }

  const msgId = String(id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  const createdAt = new Date().toISOString();
  const newMsg: EncryptedAdminMessage = {
    id: msgId,
    senderId: String(senderId).trim(),
    receiverId: String(receiverId).trim(),
    encryptedPayload: String(encryptedPayload),
    isRead: false,
    createdAt,
  };

  inMemoryAdminMessages.push(newMsg);

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO uniwork_admin_messages (id, sender_id, receiver_id, encrypted_payload, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [newMsg.id, newMsg.senderId, newMsg.receiverId, newMsg.encryptedPayload, false, createdAt]
      );
    } catch (err) {
      console.warn("DB insert admin message error:", err);
    }
  }

  broadcastUpdate();
  return res.json({ success: true, message: newMsg });
});

// POST /api/admin/messages/read - Mark conversation messages as read
app.post("/api/admin/messages/read", async (req, res) => {
  const { userId, contactId } = req.body;

  if (!userId || !contactId) {
    return res.status(400).json({ success: false, error: "userId and contactId required" });
  }

  inMemoryAdminMessages.forEach((m) => {
    if (m.receiverId === userId && m.senderId === contactId) {
      m.isRead = true;
    }
  });

  if (pool) {
    try {
      await pool.query(
        "UPDATE uniwork_admin_messages SET is_read = TRUE WHERE receiver_id = $1 AND sender_id = $2",
        [userId, contactId]
      );
    } catch (err) {
      console.warn("DB mark admin messages read error:", err);
    }
  }

  broadcastUpdate();
  return res.json({ success: true, message: "Marked as read" });
});

// GET /api/admin/messages/unread-count - Get total unread count for user
app.get("/api/admin/messages/unread-count", async (req, res) => {
  const userId = (req.query.userId as string) || "";
  if (!userId) {
    return res.json({ success: true, count: 0, bySender: {} });
  }

  let totalUnread = 0;
  const bySender: Record<string, number> = {};

  if (pool) {
    try {
      const dbRes = await pool.query(
        "SELECT sender_id as \"senderId\", COUNT(*) as count FROM uniwork_admin_messages WHERE receiver_id = $1 AND is_read = FALSE GROUP BY sender_id",
        [userId]
      );
      dbRes.rows.forEach((r) => {
        const c = parseInt(r.count, 10) || 0;
        bySender[r.senderId] = c;
        totalUnread += c;
      });
      return res.json({ success: true, count: totalUnread, bySender });
    } catch (err) {
      console.warn("DB get unread count error, using memory fallback:", err);
    }
  }

  inMemoryAdminMessages.forEach((m) => {
    if (m.receiverId === userId && !m.isRead) {
      totalUnread++;
      bySender[m.senderId] = (bySender[m.senderId] || 0) + 1;
    }
  });

  return res.json({ success: true, count: totalUnread, bySender });
});

// Admin settings endpoints
let inMemoryAdminSettings = new Map<string, string>([
  ["security_mode", "lockdown"],
  ["insights_access", "all"]
]);

app.get("/api/settings/insights_access", async (req, res) => {
  let value = inMemoryAdminSettings.get("insights_access") || "all";
  if (pool) {
    try {
      const dbRes = await pool.query("SELECT value FROM uniwork_admin_settings WHERE key = 'insights_access'");
      if (dbRes.rows.length > 0) {
        value = dbRes.rows[0].value;
        inMemoryAdminSettings.set("insights_access", value);
      }
    } catch (err) {
      console.warn("DB get insights_access error:", err);
    }
  }
  return res.json({ success: true, value: value || "all" });
});

app.get("/api/admin/settings/:key", async (req, res) => {
  const { key } = req.params;
  let value = inMemoryAdminSettings.get(key) || "";

  if (pool) {
    try {
      const dbRes = await pool.query("SELECT value FROM uniwork_admin_settings WHERE key = $1", [key]);
      if (dbRes.rows.length > 0) {
        value = dbRes.rows[0].value;
        inMemoryAdminSettings.set(key, value);
      }
    } catch (err) {
      console.warn("DB get admin settings error, using memory fallback:", err);
    }
  }

  // default to lockdown if key is security_mode and value is blank
  if (key === "security_mode" && !value) {
    value = "lockdown";
  }
  if (key === "insights_access" && !value) {
    value = "all";
  }

  return res.json({ success: true, key, value });
});

app.post("/api/admin/settings", async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: "key is required" });
  }

  const cleanValue = String(value || "").trim();
  inMemoryAdminSettings.set(key, cleanValue);

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO uniwork_admin_settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [key, cleanValue]
      );
    } catch (err) {
      console.warn("DB insert/update admin settings error:", err);
    }
  }

  broadcastUpdate();
  return res.json({ success: true, key, value: cleanValue });
});

// In-memory fallback cache for competitor transforms
const inMemoryTransforms: Record<string, { x: number; y: number; scale: number }> = {
  'google-calendar': { x: 0, y: 0, scale: 1 },
  'ypt': { x: -10, y: 0, scale: 1 },
  'ticktick': { x: -1, y: 0, scale: 1 },
  'forest': { x: -2, y: 0, scale: 1 },
};

app.get("/api/competitor-transforms", async (req, res) => {
  let result = { ...inMemoryTransforms };

  // File fallback
  const backupFile = path.join(process.cwd(), "company_logo", "transforms.json");
  if (fs.existsSync(backupFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
      result = { ...result, ...data };
    } catch {}
  }

  // Database fetch
  if (pool) {
    try {
      const dbRes = await pool.query("SELECT id, x, y, scale FROM uniwork_competitor_transforms");
      if (dbRes.rows && dbRes.rows.length > 0) {
        dbRes.rows.forEach((r: any) => {
          result[r.id] = { x: Number(r.x), y: Number(r.y), scale: Number(r.scale) };
        });
      }
    } catch (err) {
      console.warn("DB fetch competitor transforms error, using cache/file:", err);
    }
  }

  return res.json({ success: true, transforms: result });
});

app.post("/api/competitor-transforms", async (req, res) => {
  const { transforms } = req.body;
  if (!transforms || typeof transforms !== "object") {
    return res.status(400).json({ success: false, error: "transforms object required" });
  }

  // Update memory
  Object.assign(inMemoryTransforms, transforms);

  // Write file backup
  try {
    const backupDir = path.join(process.cwd(), "company_logo");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.writeFileSync(path.join(backupDir, "transforms.json"), JSON.stringify(transforms, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write transforms.json backup file:", err);
  }

  // Save to Database
  if (pool) {
    try {
      for (const [id, t] of Object.entries(transforms as Record<string, any>)) {
        await pool.query(
          `INSERT INTO uniwork_competitor_transforms (id, x, y, scale, updated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, scale = EXCLUDED.scale, updated_at = CURRENT_TIMESTAMP`,
          [id, Math.round(t.x || 0), Math.round(t.y || 0), Number(t.scale || 1)]
        );
      }
    } catch (err) {
      console.warn("DB save competitor transforms error:", err);
    }
  }

  return res.json({ success: true, transforms });
});

// --- Vite Middleware Integration ---
async function startServer() {
  // Static assets serving
  app.use(express.static(path.join(process.cwd(), "public")));
  app.use("/logo", express.static(path.join(process.cwd(), "logo")));

  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(indexPath);

  // Serve production compiled build if dist/index.html exists or NODE_ENV is production
  if (isProduction && fs.existsSync(indexPath)) {
    app.use(express.static(distPath));

    // Handle unknown API requests with 404 JSON rather than returning HTML
    app.all("/api/*", (req, res) => {
      res.status(404).json({ error: "API endpoint not found" });
    });

    app.get("*", (req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    // Development mode: load Vite middleware dynamically
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("Could not load Vite development middleware, falling back to static files:", viteErr);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(indexPath);
        });
      }
    }
  }

  // Periodic Human Behavior Simulator Logger for 20 Study Bots (runs every 3 minutes)
  setInterval(async () => {
    if (!pool) return;
    try {
      const now = Date.now();
      for (const bot of STUDY_BOTS) {
        const state = getSimulatedBotState(bot, now);
        if (!state) continue;
        const logId = `log-${bot.id}-${Math.floor(now / 180000)}`;
        await pool.query(
          `INSERT INTO uniwork_bot_status_log (id, bot_id, bot_name, room_code, status, task_title, duration_formatted, time_left_minutes, timestamp_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [logId, bot.id, bot.name, state.roomCode, state.status, state.taskTitle, state.studyDurationFormatted, state.timeLeftMinutes, now]
        );
      }
    } catch (err) {
      console.warn("Bot behavior simulator logger error:", err);
    }
  }, 180000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UniWork Express backend started at http://0.0.0.0:${PORT}`);
  });
}

startServer();
