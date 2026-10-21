import konfig from '../data/varsler.json';
import type { Folger } from './folger';

// Push-varsler når satsen går opp hos en butikk brukeren følger. Uten innlogging: nettleseren gir en push-adresse,
// og den lagres sammen med butikklista i Supabase (src/data/varsler.json). scripts/send-varsler.mjs sender hver natt.

const NOKKEL = 'pointmaxing.varsler';

/** Satt opp når Supabase-adressen, den offentlige nøkkelen og VAPID-nøkkelen finnes. */
export const varslerKonfigurert = Boolean(konfig.supabaseUrl && konfig.anonKey && konfig.vapidPublic);

export function stotterPush(): boolean {
  return varslerKonfigurert && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** iPhone og iPad får bare push når siden er lagt på Hjem-skjermen. */
export function trengerHjemskjerm(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installert = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return varslerKonfigurert && ios && !installert;
}

export function erAbonnert(): boolean {
  try {
    return localStorage.getItem(NOKKEL) === '1';
  } catch {
    return false;
  }
}

const butikkListe = (f: Folger) => Object.entries(f).flatMap(([land, ider]) => (ider ?? []).map((id) => `${land}:${id}`));

async function rpc(navn: string, body: Record<string, unknown>) {
  const svar = await fetch(`${konfig.supabaseUrl}/rest/v1/rpc/${navn}`, {
    method: 'POST',
    headers: { apikey: konfig.anonKey, Authorization: `Bearer ${konfig.anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!svar.ok) throw new Error(`${navn}: ${svar.status}`);
}

/** VAPID-nøkkelen (base64url) som bytes, slik pushManager.subscribe vil ha den. */
function nokkelBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raa = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raa, (c) => c.charCodeAt(0));
}

async function lagre(abonnement: PushSubscription, f: Folger) {
  const j = abonnement.toJSON();
  await rpc('lagre_abonnement', { p_endpoint: abonnement.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_butikker: butikkListe(f) });
}

/** Ber om tillatelse, lager push-abonnementet og lagrer det med butikkene. false hvis brukeren sa nei. */
export async function slaPaa(f: Folger): Promise<boolean> {
  if (!stotterPush()) return false;
  if ((await Notification.requestPermission()) !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const abonnement =
    (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: nokkelBytes(konfig.vapidPublic) as BufferSource }));
  await lagre(abonnement, f);
  try {
    localStorage.setItem(NOKKEL, '1');
  } catch {
    /* lagring er bare en bekvemmelighet */
  }
  return true;
}

/** Ny butikkliste til et abonnement som finnes (når brukeren følger eller slutter å følge en butikk). */
export async function oppdaterAbonnement(f: Folger): Promise<void> {
  if (!stotterPush() || !erAbonnert()) return;
  const reg = await navigator.serviceWorker.ready;
  const abonnement = await reg.pushManager.getSubscription();
  if (abonnement) await lagre(abonnement, f);
}

/** Slår av: sletter abonnementet hos oss og i nettleseren. */
export async function slaAv(): Promise<void> {
  if (stotterPush()) {
    const reg = await navigator.serviceWorker.ready;
    const abonnement = await reg.pushManager.getSubscription();
    if (abonnement) {
      await rpc('slett_abonnement', { p_endpoint: abonnement.endpoint }).catch(() => undefined);
      await abonnement.unsubscribe();
    }
  }
  try {
    localStorage.removeItem(NOKKEL);
  } catch {
    /* ingenting å rydde */
  }
}
