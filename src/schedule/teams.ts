import { getLang } from "../i18n/i18n";

export interface Team {
  id: string;
  name: string;
  nameEn: string;
  logo: string;
}

/** Returns the team name in whichever language is currently active. */
export function teamName(team: Team): string {
  return getLang() === "en" ? team.nameEn : team.name;
}

// Prefix with Vite's BASE_URL so logos resolve correctly whether the app is
// served from "/" (standalone) or from a subpath like "/hapoel-jerusalem/".
const logoPath = (file: string) => `${import.meta.env.BASE_URL}logos/${file}`;

export const TEAMS: Record<string, Team> = {
  jerusalem: {
    id: "jerusalem",
    name: "הפועל ירושלים",
    nameEn: "Hapoel Jerusalem",
    logo: logoPath("jerusalem.png"),
  },
  ashdod: {
    id: "ashdod",
    name: "מכבי אשדוד",
    nameEn: "Maccabi Ashdod",
    logo: logoPath("ashdod.png"),
  },
  beersheva: {
    id: "beersheva",
    name: 'הפועל ב"ש',
    nameEn: "Hapoel Beer Sheva",
    logo: logoPath("beersheva.png"),
  },
  holon: {
    id: "holon",
    name: "הפועל חולון",
    nameEn: "Hapoel Holon",
    logo: logoPath("holon.png"),
  },
  "telaviv-hapoel": {
    id: "telaviv-hapoel",
    name: 'הפועל ת"א',
    nameEn: "Hapoel Tel Aviv",
    logo: logoPath("telaviv-hapoel.png"),
  },
  eilat: {
    id: "eilat",
    name: "הפועל אילת",
    nameEn: "Hapoel Eilat",
    logo: logoPath("eilat.png"),
  },
  haemek: {
    id: "haemek",
    name: "הפועל העמק",
    nameEn: "Hapoel HaEmek",
    logo: logoPath("haemek.png"),
  },
  "telaviv-maccabi": {
    id: "telaviv-maccabi",
    name: 'מכבי ת"א',
    nameEn: "Maccabi Tel Aviv",
    logo: logoPath("telaviv-maccabi.png"),
  },
  herzliya: {
    id: "herzliya",
    name: "בני הרצליה",
    nameEn: "Bnei Herzliya",
    logo: logoPath("herzliya.png"),
  },
  nesziona: {
    id: "nesziona",
    name: "נס ציונה",
    nameEn: "Nes Ziona",
    logo: logoPath("nesziona.png"),
  },
  ramatgan: {
    id: "ramatgan",
    name: "מכבי רמת גן",
    nameEn: "Maccabi Ramat Gan",
    logo: logoPath("ramatgan.png"),
  },
  kiryatata: {
    id: "kiryatata",
    name: "קריית אתא",
    nameEn: "Kiryat Ata",
    logo: logoPath("kiryatata.png"),
  },
  rishonlezion: {
    id: "rishonlezion",
    name: "ראשון לציון",
    nameEn: "Rishon LeZion",
    logo: logoPath("rishonlezion.png"),
  },
  galilelion: {
    id: "galilelion",
    name: "גליל עליון",
    nameEn: "Galil Elyon",
    logo: logoPath("galilelion.png"),
  },

  // BKT EuroCup 2026/27 opponents
  rostock: {
    id: "rostock",
    name: "רוסטוק סיוולבס",
    nameEn: "Rostock Seawolves",
    logo: logoPath("rostock.png"),
  },
  ljubljana: {
    id: "ljubljana",
    name: "צדביטה אולימפיה לובליאנה",
    nameEn: "Cedevita Olimpija Ljubljana",
    logo: logoPath("ljubljana.png"),
  },
  burgos: {
    id: "burgos",
    name: "סן פבלו בורגוס",
    nameEn: "San Pablo Burgos",
    logo: logoPath("burgos.png"),
  },
  riga: {
    id: "riga",
    name: "ריגה זלי",
    nameEn: "Riga Zelli",
    logo: logoPath("riga.png"),
  },
  lemans: {
    id: "lemans",
    name: "לה מאן סארת בסקט",
    nameEn: "Le Mans Sarthe Basket",
    logo: logoPath("lemans.png"),
  },
  aris: {
    id: "aris",
    name: "אריס סלוניקי",
    nameEn: "Aris Thessaloniki",
    logo: logoPath("aris.png"),
  },
  derthona: {
    id: "derthona",
    name: "דרתונה",
    nameEn: "Derthona",
    logo: logoPath("derthona.png"),
  },
};

export const HAPOEL_JERUSALEM_TEAM_ID = "jerusalem";
