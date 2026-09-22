import type { Butikk, Land } from '../data/types';
import { SPRAK, tekst } from '../i18n';

interface Props {
  land: Land;
  butikk: Butikk;
  folger: boolean;
  onToggle: () => void;
}

/**
 * «Følg butikk» uten e-post: en stjerne som lagres i nettleseren. Utvidelsen leser listen
 * og varsler når satsen går opp; RSS-strømmen gir det samme til dem som vil ha det i en leser.
 */
export default function Folg({ land, butikk, folger, onToggle }: Props) {
  return (
    <div className="folg">
      <button type="button" className={`lenke folg-knapp${folger ? ' aktiv' : ''}`} aria-pressed={folger} onClick={onToggle}>
        <span aria-hidden="true">{folger ? '★' : '☆'}</span> {tekst(land, folger ? 'folger' : 'folg', { butikk: butikk.navn })}
      </button>
      <span className="muted">
        {' · '}
        {tekst(land, 'folgForklaring')}
        {' · '}
        <a href={`/${SPRAK[land].sti}/${butikk.id}/feed.xml`}>RSS</a>
      </span>
    </div>
  );
}
