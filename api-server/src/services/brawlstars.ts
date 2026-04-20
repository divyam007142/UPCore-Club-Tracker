import { logger } from "../lib/logger";

const BRAWLTOOLS_BASE = "https://api.brawltools.net";

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

interface BrawlToolsResponse {
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

export async function getClub(tag: string): Promise<BSClub> {
  const encoded = encodeTag(tag);
  const url = `${BRAWLTOOLS_BASE}/clubs/${encoded}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    logger.warn({ status: res.status, url, body: text }, "BrawlTools API error");
    throw new Error(`BrawlTools API returned ${res.status}`);
  }
  const raw = await res.json() as BrawlToolsResponse;
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

export async function getClubMembers(tag: string): Promise<BSMember[]> {
  const club = await getClub(tag);
  return club.members ?? [];
}
