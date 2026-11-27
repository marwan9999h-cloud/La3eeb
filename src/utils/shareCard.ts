import { Player } from '../types';
import { rankPlayers } from './ranking';

/**
 * Share card: turns the final game results into a branded image that can be
 * shared to WhatsApp/TikTok/Instagram or downloaded as a PNG.
 * The model builder is pure and unit-tested; the canvas renderer is thin.
 */

export const SHARE_CARD_URL = 'laa3eeb.vercel.app';
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

const COLOR_BG = '#0B0D0C';
const COLOR_CARD = '#131815';
const COLOR_CARD_INNER = '#171E1A';
const COLOR_BORDER = '#212823';
const COLOR_GREEN = '#22C55E';
const COLOR_TEXT = '#EEF2EF';
const COLOR_MUTED = '#8FA095';

export interface ShareCardRow {
  rankLabel: string;
  name: string;
  score: number;
  isChampion: boolean;
}

export interface GameOverShareModel {
  isTie: boolean;
  championNames: string[];
  championScore: number;
  championLine: string;
  roundsLine: string;
  rows: ShareCardRow[];
  footerUrl: string;
}

/** Arabic-aware pluralization for the rounds count. */
export function arabicRoundsLabel(n: number): string {
  const count = Math.max(0, Math.floor(typeof n === 'number' && !isNaN(n) ? n : 0));
  if (count === 0) return 'من غير جولات';
  if (count === 1) return 'جولة واحدة';
  if (count === 2) return 'جولتين';
  if (count >= 3 && count <= 10) return `${count} جولات`;
  return `${count} جولة`;
}

function medal(rank: number): string {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return `${rank + 1}`;
}

/** Pure data for the final-results share card. */
export function buildGameOverShareModel(
  players: Player[],
  totalRounds: number,
  maxRows = 5
): GameOverShareModel {
  const ranked = rankPlayers(players || []);
  const champions = ranked.filter((rp) => rp.rank === 0);
  const isTie = champions.length > 1;
  const championNames = champions.map((c) => c.player.name);
  const championScore = champions[0]?.player.score ?? 0;

  const championLine = isTie
    ? `تعادل في المركز الأول: ${championNames.join(' و ')}`
    : championNames.length === 1
      ? `${championNames[0]} بطل القعدة`
      : 'لا يوجد بطل بعد';

  return {
    isTie,
    championNames,
    championScore,
    championLine,
    roundsLine: `لعبتوا ${arabicRoundsLabel(totalRounds)}`,
    rows: ranked.slice(0, Math.max(1, maxRows)).map(({ player, rank }) => ({
      rankLabel: medal(rank),
      name: player.name,
      score: player.score,
      isChampion: rank === 0,
    })),
    footerUrl: SHARE_CARD_URL,
  };
}

const FONT_STACK = `'Cairo', 'Plus Jakarta Sans', system-ui, sans-serif`;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  startSize: number,
  maxWidth: number,
  minSize = 28
): number {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

/** Renders the model to a PNG blob using an in-memory canvas. */
export async function renderGameOverShareCard(
  model: GameOverShareModel
): Promise<Blob> {
  try {
    await (document as Document).fonts?.ready;
  } catch {
    // fonts API unavailable: draw with fallbacks
  }

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D غير متاح على الجهاز ده');

  const W = SHARE_CARD_WIDTH;
  const cx = W / 2;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Background + glow
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, SHARE_CARD_HEIGHT);
  const glow = ctx.createRadialGradient(cx, 240, 40, cx, 240, 700);
  glow.addColorStop(0, 'rgba(34,197,94,0.22)');
  glow.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, SHARE_CARD_HEIGHT);

  // Top brand bar
  ctx.fillStyle = COLOR_GREEN;
  ctx.fillRect(0, 0, W, 14);

  // Logo
  ctx.font = `88px ${FONT_STACK}`;
  ctx.fillText('⚽', cx, 130);
  ctx.fillStyle = COLOR_TEXT;
  ctx.font = `900 72px ${FONT_STACK}`;
  ctx.fillText('خَمِّن اللاعب', cx, 226);
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText(`لعبة تخمين كورة للصحاب • ${model.roundsLine}`, cx, 292);

  // Champion hero card
  const heroY = 350;
  const heroH = 340;
  ctx.fillStyle = COLOR_CARD;
  roundRect(ctx, 60, heroY, W - 120, heroH, 36);
  ctx.fill();
  ctx.strokeStyle = COLOR_GREEN;
  ctx.lineWidth = 5;
  roundRect(ctx, 60, heroY, W - 120, heroH, 36);
  ctx.stroke();
  ctx.fillStyle = COLOR_GREEN;
  ctx.fillRect(60, heroY, W - 120, 10);

  ctx.font = `84px ${FONT_STACK}`;
  ctx.fillText(model.isTie ? '🤝' : '🏆', cx, heroY + 78);

  ctx.fillStyle = COLOR_MUTED;
  ctx.font = `700 32px ${FONT_STACK}`;
  ctx.fillText(model.isTie ? 'المركز الأول مشترك!' : 'بطل القعدة', cx, heroY + 140);

  const names = model.isTie ? model.championNames.join(' و ') : model.championNames[0] || '—';
  ctx.fillStyle = COLOR_GREEN;
  const nameSize = fitFontSize(ctx, names, 900, 76, W - 240);
  ctx.font = `900 ${nameSize}px ${FONT_STACK}`;
  ctx.fillText(names, cx, heroY + 212);

  ctx.fillStyle = COLOR_TEXT;
  ctx.font = `900 52px ${FONT_STACK}`;
  ctx.fillText(`${model.championScore} نقطة`, cx, heroY + 288);

  // Leaderboard rows
  let y = heroY + heroH + 46;
  ctx.textAlign = 'right';
  const rowH = 96;
  const rowGap = 20;
  model.rows.forEach((row) => {
    ctx.fillStyle = row.isChampion ? '#15231A' : COLOR_CARD_INNER;
    roundRect(ctx, 60, y, W - 120, rowH, 26);
    ctx.fill();
    ctx.strokeStyle = row.isChampion ? 'rgba(34,197,94,0.45)' : COLOR_BORDER;
    ctx.lineWidth = 3;
    roundRect(ctx, 60, y, W - 120, rowH, 26);
    ctx.stroke();

    const midY = y + rowH / 2;
    // Medal on the right edge (RTL: first = rightmost)
    ctx.font = `52px ${FONT_STACK}`;
    ctx.fillText(row.rankLabel, W - 130, midY);

    ctx.fillStyle = COLOR_TEXT;
    const rowNameSize = fitFontSize(ctx, row.name, 800, 44, W - 560);
    ctx.font = `800 ${rowNameSize}px ${FONT_STACK}`;
    ctx.fillText(row.name, W - 210, midY);

    ctx.textAlign = 'left';
    ctx.fillStyle = row.isChampion ? COLOR_GREEN : COLOR_TEXT;
    ctx.font = `900 46px ${FONT_STACK}`;
    ctx.fillText(`${row.score}`, 130, midY);
    ctx.fillStyle = COLOR_MUTED;
    ctx.font = `600 24px ${FONT_STACK}`;
    ctx.fillText('نقطة', 130, midY + 36);
    ctx.textAlign = 'right';

    y += rowH + rowGap;
  });

  // Footer call-to-action pill
  ctx.textAlign = 'center';
  const pillY = SHARE_CARD_HEIGHT - 130;
  ctx.fillStyle = COLOR_GREEN;
  roundRect(ctx, cx - 420, pillY, 840, 92, 46);
  ctx.fill();
  ctx.fillStyle = COLOR_BG;
  ctx.font = `900 40px ${FONT_STACK}`;
  ctx.fillText(`العبوها مع صحابكم 👈 ${model.footerUrl}`, cx, pillY + 50);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('فشل تجهيز صورة الكارت'));
    }, 'image/png');
  });
}

/* ---------- Daily challenge share card ---------- */

export interface DailyShareModel {
  score: number;
  total: number;
  streak: number;
  streakLine: string;
  headline: string;
  scoreLine: string;
  footerUrl: string;
}

/** Headline for a finished daily challenge. */
export function dailyHeadline(score: number, total: number): string {
  if (total <= 0) return 'تحدي اليوم خلص ⚽';
  if (score >= total) return 'علامة كاملة في تحدي اليوم! 🔥';
  if (score === total - 1) return 'قريب من العلامة الكاملة 👏';
  if (score <= 0) return 'التحدي كان صعب النهارده 😅';
  return 'تحدي اليوم خلص ⚽';
}

/** Pure data for the daily-challenge share card. */
export function buildDailyShareModel(
  score: number,
  total: number,
  streak: number
): DailyShareModel {
  const safeScore = Math.max(0, Math.floor(score || 0));
  const safeTotal = Math.max(0, Math.floor(total || 0));
  const safeStreak = Math.max(0, Math.floor(streak || 0));
  const streakLine =
    safeStreak >= 2
      ? `🔥 سلسلة: ${safeStreak} أيام ورا بعض`
      : safeStreak === 1
        ? '🔥 أول يوم في السلسلة'
        : 'ابدأ سلسلتك النهارده';
  return {
    score: safeScore,
    total: safeTotal,
    streak: safeStreak,
    streakLine,
    headline: dailyHeadline(safeScore, safeTotal),
    scoreLine: `${safeScore} من ${safeTotal} إجابات صح`,
    footerUrl: SHARE_CARD_URL,
  };
}

/** Renders the daily-challenge model to a PNG blob. */
export async function renderDailyShareCard(model: DailyShareModel): Promise<Blob> {
  try {
    await (document as Document).fonts?.ready;
  } catch {
    // fonts API unavailable: draw with fallbacks
  }

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D غير متاح على الجهاز ده');

  const W = SHARE_CARD_WIDTH;
  const cx = W / 2;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, SHARE_CARD_HEIGHT);
  const glow = ctx.createRadialGradient(cx, 420, 40, cx, 420, 780);
  glow.addColorStop(0, 'rgba(34,197,94,0.22)');
  glow.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, SHARE_CARD_HEIGHT);

  ctx.fillStyle = COLOR_GREEN;
  ctx.fillRect(0, 0, W, 14);

  ctx.font = `80px ${FONT_STACK}`;
  ctx.fillText('⚽', cx, 140);
  ctx.fillStyle = COLOR_TEXT;
  ctx.font = `900 66px ${FONT_STACK}`;
  ctx.fillText('خَمِّن اللاعب', cx, 232);
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = `800 40px ${FONT_STACK}`;
  ctx.fillText('تحدي اليوم 🔥', cx, 304);

  // Score hero
  const heroY = 380;
  const heroH = 420;
  ctx.fillStyle = COLOR_CARD;
  roundRect(ctx, 60, heroY, W - 120, heroH, 36);
  ctx.fill();
  ctx.strokeStyle = COLOR_GREEN;
  ctx.lineWidth = 5;
  roundRect(ctx, 60, heroY, W - 120, heroH, 36);
  ctx.stroke();
  ctx.fillStyle = COLOR_GREEN;
  ctx.fillRect(60, heroY, W - 120, 10);

  ctx.fillStyle = COLOR_MUTED;
  const headSize = fitFontSize(ctx, model.headline, 800, 44, W - 220);
  ctx.font = `800 ${headSize}px ${FONT_STACK}`;
  ctx.fillText(model.headline, cx, heroY + 84);

  ctx.fillStyle = COLOR_GREEN;
  ctx.font = `900 190px ${FONT_STACK}`;
  ctx.fillText(`${model.score}/${model.total}`, cx, heroY + 220);

  ctx.fillStyle = COLOR_TEXT;
  ctx.font = `700 42px ${FONT_STACK}`;
  ctx.fillText(model.scoreLine, cx, heroY + 340);

  // Streak band
  const bandY = heroY + heroH + 56;
  ctx.fillStyle = COLOR_CARD_INNER;
  roundRect(ctx, 60, bandY, W - 120, 120, 30);
  ctx.fill();
  ctx.strokeStyle = COLOR_BORDER;
  ctx.lineWidth = 3;
  roundRect(ctx, 60, bandY, W - 120, 120, 30);
  ctx.stroke();
  ctx.fillStyle = COLOR_TEXT;
  ctx.font = `800 44px ${FONT_STACK}`;
  ctx.fillText(model.streakLine, cx, bandY + 62);

  // Footer pill
  const pillY = SHARE_CARD_HEIGHT - 150;
  ctx.fillStyle = COLOR_GREEN;
  roundRect(ctx, cx - 460, pillY, 920, 96, 48);
  ctx.fill();
  ctx.fillStyle = COLOR_BG;
  ctx.font = `900 38px ${FONT_STACK}`;
  ctx.fillText(`جرب تحدي النهارده 👈 ${model.footerUrl}`, cx, pillY + 52);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('فشل تجهيز صورة الكارت'));
    }, 'image/png');
  });
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/** Shares the PNG through the native sheet when possible, otherwise downloads it. */
export async function shareOrDownloadCard(
  blob: Blob,
  filename = 'la3eeb-result.png'
): Promise<ShareOutcome> {
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
    };
    if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: 'خَمِّن اللاعب ⚽',
        text: `خَمِّن اللاعب ⚽ ${SHARE_CARD_URL}`,
      });
      return 'shared';
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'cancelled';
    // fall through to download
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
