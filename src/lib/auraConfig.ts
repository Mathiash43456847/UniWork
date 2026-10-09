import { useState, useEffect, useCallback } from 'react';

export interface AuraStrokes {
  bloom: number;
  halo: number;
  core: number;
}

export interface AuraBlurs {
  bloom: number;
  halo: number;
  core: number;
}

export interface AuraConfig {
  auraScalePercent: number;  // e.g. 80 (meaning 80% / 0.8x of baseline)
  opacityPercent: number;    // 20% - 100% (how bold or faint the aura is)
  blurRadiusPercent: number; // 20% - 150% (spread / softness)
  showOutline: boolean;      // toggle crisp outline ring around button
  placement: 'behind' | 'overlay'; // aura placed behind button vs overlay
  factor: number;            // e.g. 0.8
  strokes: {
    button: AuraStrokes;
    card: AuraStrokes;
  };
  blurs: {
    button: AuraBlurs;
    card: AuraBlurs;
  };
  pad: number;
}

// Default balanced Google AI style aura config
export const DEFAULT_AURA_CONFIG: AuraConfig = {
  auraScalePercent: 75,
  opacityPercent: 85,
  blurRadiusPercent: 80,
  showOutline: false,
  placement: 'behind',
  factor: 0.75,
  strokes: {
    button: { bloom: 18, halo: 10, core: 5 },
    card: { bloom: 28, halo: 16, core: 8 },
  },
  blurs: {
    button: { bloom: 7, halo: 3, core: 1 },
    card: { bloom: 12, halo: 5, core: 2 },
  },
  pad: 14,
};

const cachedAuraConfigs: Record<string, AuraConfig> = {};

export function getCachedAuraConfig(id: string): AuraConfig {
  if (cachedAuraConfigs[id]) return cachedAuraConfigs[id];
  try {
    const saved = localStorage.getItem(`uniwork_aura_config_${id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.auraScalePercent === 'number') {
        const config = {
          ...DEFAULT_AURA_CONFIG,
          ...parsed,
        };
        cachedAuraConfigs[id] = config;
        return config;
      }
    }
  } catch (e) {
    // Ignore localStorage parse errors
  }
  return DEFAULT_AURA_CONFIG;
}

const listenersById: Record<string, Set<(config: AuraConfig) => void>> = {};

function getListeners(id: string): Set<(config: AuraConfig) => void> {
  if (!listenersById[id]) {
    listenersById[id] = new Set();
  }
  return listenersById[id];
}

function notifyListeners(id: string, config: AuraConfig) {
  cachedAuraConfigs[id] = config;
  try {
    localStorage.setItem(`uniwork_aura_config_${id}`, JSON.stringify(config));
  } catch (e) {
    // Ignore localStorage quota errors
  }
  getListeners(id).forEach(fn => fn(config));
}

export function computeAuraConfig(
  params: {
    auraScalePercent?: number;
    opacityPercent?: number;
    blurRadiusPercent?: number;
    showOutline?: boolean;
    placement?: 'behind' | 'overlay';
  },
  baseConfig: AuraConfig = DEFAULT_AURA_CONFIG
): AuraConfig {
  const scale = typeof params.auraScalePercent === 'number' ? params.auraScalePercent : baseConfig.auraScalePercent;
  const opacity = typeof params.opacityPercent === 'number' ? params.opacityPercent : baseConfig.opacityPercent;
  const blur = typeof params.blurRadiusPercent === 'number' ? params.blurRadiusPercent : baseConfig.blurRadiusPercent;
  const showOutline = typeof params.showOutline === 'boolean' ? params.showOutline : baseConfig.showOutline;
  const placement = params.placement || baseConfig.placement || 'behind';

  const factor = scale / 100;
  const blurFactor = blur / 100;

  return {
    auraScalePercent: scale,
    opacityPercent: opacity,
    blurRadiusPercent: blur,
    showOutline,
    placement,
    factor,
    strokes: {
      button: {
        bloom: Math.max(8, Math.round(24 * factor)),
        halo: Math.max(5, Math.round(14 * factor)),
        core: Math.max(3, Math.round(7 * factor)),
      },
      card: {
        bloom: Math.max(14, Math.round(40 * factor)),
        halo: Math.max(8, Math.round(22 * factor)),
        core: Math.max(5, Math.round(11 * factor)),
      },
    },
    blurs: {
      button: {
        bloom: Math.max(2, Math.round(9 * factor * blurFactor)),
        halo: Math.max(1, Math.round(4 * factor * blurFactor)),
        core: Math.max(1, Math.round(1 * factor * blurFactor)),
      },
      card: {
        bloom: Math.max(3, Math.round(15 * factor * blurFactor)),
        halo: Math.max(2, Math.round(7 * factor * blurFactor)),
        core: Math.max(1, Math.round(2 * factor * blurFactor)),
      },
    },
    pad: Math.max(12, Math.round(18 * factor)),
  };
}

export function applyLocalAuraConfig(
  id: string,
  params: {
    auraScalePercent?: number;
    opacityPercent?: number;
    blurRadiusPercent?: number;
    showOutline?: boolean;
    placement?: 'behind' | 'overlay';
  }
) {
  const base = getCachedAuraConfig(id);
  const config = computeAuraConfig(params, base);
  cachedAuraConfigs[id] = config;
  try {
    localStorage.setItem(`uniwork_aura_config_${id}`, JSON.stringify(config));
  } catch (e) {}
  notifyListeners(id, config);
}

// Fetch aura config from Postgres database
export async function fetchAuraConfigFromDb(id: string = 'global'): Promise<AuraConfig> {
  try {
    const res = await fetch(`/api/aura-config?userId=${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && typeof data.auraScalePercent === 'number') {
        const config = computeAuraConfig({
          auraScalePercent: data.auraScalePercent,
          opacityPercent: data.opacityPercent ?? 85,
          blurRadiusPercent: data.blurRadiusPercent ?? 80,
          showOutline: data.showOutline ?? false,
          placement: data.placement ?? 'behind',
        }, DEFAULT_AURA_CONFIG);
        cachedAuraConfigs[id] = config;
        try {
          localStorage.setItem(`uniwork_aura_config_${id}`, JSON.stringify(config));
        } catch (e) {}
        notifyListeners(id, config);
        return config;
      }
    }
  } catch (err) {
    console.warn(`Failed to load aura config from DB for ${id}:`, err);
  }
  return getCachedAuraConfig(id);
}

// Save all aura settings to Neon Postgres database
export async function saveAuraSettingsToDb(
  id: string,
  params: {
    auraScalePercent: number;
    opacityPercent: number;
    blurRadiusPercent: number;
    showOutline: boolean;
    placement: 'behind' | 'overlay';
  }
): Promise<boolean> {
  const base = getCachedAuraConfig(id);
  const optimConfig = computeAuraConfig(params, base);

  // Immediate optimistic update for seamless UI reaction
  notifyListeners(id, optimConfig);

  try {
    const res = await fetch('/api/aura-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: id,
        auraScalePercent: params.auraScalePercent,
        opacityPercent: params.opacityPercent,
        blurRadiusPercent: params.blurRadiusPercent,
        showOutline: params.showOutline,
        placement: params.placement,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        const updated = computeAuraConfig({
          auraScalePercent: data.auraScalePercent,
          opacityPercent: data.opacityPercent,
          blurRadiusPercent: data.blurRadiusPercent,
          showOutline: data.showOutline,
          placement: data.placement,
        }, DEFAULT_AURA_CONFIG);
        notifyListeners(id, updated);
        return true;
      }
    }
  } catch (err) {
    console.error(`Failed to save aura config to DB for ${id}:`, err);
  }
  return false;
}

// Register SSE listener for real-time multi-tab synchronization
if (typeof window !== 'undefined' && 'EventSource' in window) {
  try {
    const es = new EventSource('/api/events-stream');
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update' || data.type === 'aura_update') {
          fetchAuraConfigFromDb('global');
          fetchAuraConfigFromDb('guide');
          fetchAuraConfigFromDb('about');
        }
      } catch (e) {}
    };
  } catch (e) {}
}

export function useAuraConfig(id: string = 'global') {
  const [config, setConfig] = useState<AuraConfig>(() => getCachedAuraConfig(id));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const activeListeners = getListeners(id);
    activeListeners.add(setConfig);
    fetchAuraConfigFromDb(id);

    return () => {
      activeListeners.delete(setConfig);
    };
  }, [id]);

  const updateAuraSettings = useCallback(async (params: {
    auraScalePercent: number;
    opacityPercent: number;
    blurRadiusPercent: number;
    showOutline: boolean;
    placement: 'behind' | 'overlay';
  }) => {
    setIsSaving(true);
    const success = await saveAuraSettingsToDb(id, params);
    setIsSaving(false);
    return success;
  }, [id]);

  return {
    config,
    auraScalePercent: config.auraScalePercent,
    opacityPercent: config.opacityPercent,
    blurRadiusPercent: config.blurRadiusPercent,
    showOutline: config.showOutline,
    placement: config.placement,
    factor: config.factor,
    strokes: config.strokes,
    blurs: config.blurs,
    pad: config.pad,
    updateAuraSettings,
    applyLocalAuraConfig: (params: any) => applyLocalAuraConfig(id, params),
    isSaving,
  };
}
