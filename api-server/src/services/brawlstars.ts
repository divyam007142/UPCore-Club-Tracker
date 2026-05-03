import { logger } from "../lib/logger";

const BRAWLTOOLS_BASE = "https://api.brawltools.net";
const BS_API_BASE     = "https://api.brawlstars.com/v1";

function encodeTag(tag: string): string {
  const normalized = tag.startsWith("#") ? tag : `#${tag}`;
  return encodeURIComponent(normalized);
}

export interface BSMemberMegaPig {
  wins: number;
  ticketsLeft: number;
}

export interface BSMember {
  tag: string;
  name: string;
  role: string;
  trophies: number;
  nameColor?: string;
  icon?: { id: number };
  megaPig?: BSMemberMegaPig;
  brawlPass?: number;
}

export interface BSClubMegaPig {
  id: number;
  totalWins: number;
  totalPlayed: number;
}

export interface BSClub {
  tag: string;
  name: string;
  description?: string;
  type?: string;
  trophies: number;
  requiredTrophies?: number;
  badgeId?: number;
  memberCount?: number;
  online?: number;
  regionName?: string;
  megaPig?: BSClubMegaPig;
  members: BSMember[];
}

export interface BSBrawler {
  id: number;
  name: string;
  power: number;
  rank: number;
  trophies: number;
  highestTrophies: number;
  gears?: Array<{ id: number; name: string; level: number }>;
  starPowers?: Array<{ id: number; name: string }>;
  gadgets?: Array<{ id: number; name: string }>;
}

export interface BSPlayer {
  tag: string;
  name: string;
  nameColor?: string;
  icon?: { id: number };
  trophies: number;
  highestTrophies?: number;
  expLevel?: number;
  expPoints?: number;
  soloVictories?: number;
  duoVictories?: number;
  trioVictories?: number;
  bestRoboRumbleTime?: number;
  bestTimeAsBigBrawler?: number;
  brawlers?: BSBrawler[];
  brawlersUnlocked?: number;
  club?: { tag: string; name: string };
}

interface BrawlToolsClubResponse {
  tag: string;
  timestamp: number;
  data: {
    name: string;
    description?: string;
    type?: string;
    trophies: number;
    requiredTrophies?: number;
    badgeId?: number;
    memberCount?: number;
    online?: number;
    regionName?: string;
    megaPig?: BSClubMegaPig;
    members?: BSMember[];
  };
}

interface BrawlToolsPlayerResponse {
  tag: string;
  timestamp: number;
  data: {
    name: string;
    nameColor?: string;
    icon?: { id: number };
    trophies: number;
    highestTrophies?: number;
    expLevel?: number;
    expPoints?: number;
    soloVictories?: number;
    duoVictories?: number;
    "3vs3Victories"?: number;
    bestRoboRumbleTime?: number;
    bestTimeAsBigBrawler?: number;
    brawlers?: Array<{
      id: number;
      name: string;
      power: number;
      rank: number;
      trophies: number;
      highestTrophies: number;
      gears?: Array<{ id: number; name: string; level: number }>;
      starPowers?: Array<{ id: number; name: string }>;
      gadgets?: Array<{ id: number; name: string }>;
    }>;
    club?: { tag: string; name: string };
  };
}

export async function getClub(tag: string): Promise<BSClub> {
  const encoded = encodeTag(tag);
  const url = `${BRAWLTOOLS_BASE}/clubs/${encoded}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    logger.warn({ status: res.status, url, body: text }, "BrawlTools API error");
    throw new Error(`BrawlTools API returned ${res.status}`);
  }
  const raw = (await res.json()) as BrawlToolsClubResponse;
  return {
    tag: raw.tag,
    name: raw.data.name,
    description: raw.data.description,
    type: raw.data.type,
    trophies: raw.data.trophies,
    requiredTrophies: raw.data.requiredTrophies,
    badgeId: raw.data.badgeId,
    memberCount: raw.data.memberCount,
    online: raw.data.online,
    regionName: raw.data.regionName,
    megaPig: raw.data.megaPig,
    members: raw.data.members ?? [],
  };
}

export class BrawlToolsRateLimitError extends Error {
  constructor() { super("BrawlTools API daily limit reached"); }
}

/** Fetch a single player's info. Returns null if not found. Throws BrawlToolsRateLimitError on 429. */
export async function getPlayer(tag: string): Promise<BSPlayer | null> {
  try {
    const encoded = encodeTag(tag);
    const url = `${BRAWLTOOLS_BASE}/players/${encoded}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 429) {
      logger.warn({ url }, "BrawlTools player rate limited (429)");
      throw new BrawlToolsRateLimitError();
    }
    if (!res.ok) return null;
    const raw = (await res.json()) as BrawlToolsPlayerResponse;
    const d = raw.data;
    const brawlers = d.brawlers?.map((b) => ({
      id: b.id,
      name: b.name,
      power: b.power,
      rank: b.rank,
      trophies: b.trophies,
      highestTrophies: b.highestTrophies,
      gears: b.gears,
      starPowers: b.starPowers,
      gadgets: b.gadgets,
    }));
    return {
      tag: raw.tag,
      name: d.name,
      nameColor: d.nameColor,
      icon: d.icon,
      trophies: d.trophies,
      highestTrophies: d.highestTrophies,
      expLevel: d.expLevel,
      expPoints: d.expPoints,
      soloVictories: d.soloVictories,
      duoVictories: d.duoVictories,
      trioVictories: d["3vs3Victories"],
      bestRoboRumbleTime: d.bestRoboRumbleTime,
      bestTimeAsBigBrawler: d.bestTimeAsBigBrawler,
      brawlers,
      brawlersUnlocked: brawlers?.length,
      club: d.club,
    };
  } catch (err) {
    if (err instanceof BrawlToolsRateLimitError) throw err;
    logger.warn({ err, tag }, "Failed to fetch player from BrawlTools");
    return null;
  }
}

export async function getClubMembers(tag: string): Promise<BSMember[]> {
  const club = await getClub(tag);
  return club.members ?? [];
}

/**
 * Fetch basic club info (trophies, badge, members) directly from the official
 * Brawl Stars API. Requires BRAWL_STARS_API_KEY in env.
 * Returns null on any error so callers can fall back gracefully.
 */
export async function getClubFromOfficialAPI(tag: string): Promise<BSClub | null> {
  const apiKey = process.env.BRAWL_STARS_API_KEY;
  if (!apiKey) return null;
  const encoded = encodeTag(tag);
  const url = `${BS_API_BASE}/clubs/${encoded}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) {
      logger.warn({ status: res.status, url }, "Official BS API error");
      return null;
    }
    const raw = (await res.json()) as {
      tag: string;
      name: string;
      description?: string;
      type?: string;
      badgeId?: number;
      requiredTrophies?: number;
      trophies: number;
      members?: Array<{
        tag: string;
        name: string;
        role: string;
        trophies: number;
        nameColor?: string;
        icon?: { id: number };
      }>;
    };
    return {
      tag: raw.tag,
      name: raw.name,
      description: raw.description,
      type: raw.type,
      trophies: raw.trophies,
      requiredTrophies: raw.requiredTrophies,
      badgeId: raw.badgeId,
      memberCount: raw.members?.length,
      online: 0,
      members: (raw.members ?? []).map(m => ({
        tag: m.tag,
        name: m.name,
        role: m.role,
        trophies: m.trophies,
        nameColor: m.nameColor,
        icon: m.icon,
      })),
    };
  } catch (err) {
    logger.warn({ err, tag }, "Failed to fetch club from official BS API");
    return null;
  }
}
