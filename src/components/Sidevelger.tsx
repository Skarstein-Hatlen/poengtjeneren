import { useEffect, useRef, useState } from 'react';

export interface Side {
  id: string;
  tekst: string;
  href: string;
  aktiv: boolean;
  velg: () => void;
}

interface Props {
  sider: Side[];
  /** Knappeteksten når ingen av sidene er valgt (personvern, utvidelse). */
  meny: string;
}

/**
 * Sidene i en nedtrekksmeny på mobil, i samme rad som kortvelgeren. På større skjermer vises lenkene
 * i stedet (styrt av CSS), så begge ligger i DOM-en.
 */
export default function Sidevelger({ sider, meny }: Props) {
  const [apen, setApen] = useState(false);
  const rot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apen) return;
    const klikk = (e: MouseEvent) => {
      if (!rot.current?.contains(e.target as Node)) setApen(false);
    };
    const tast = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setApen(false);
    };
    document.addEventListener('mousedown', klikk);
    document.addEventListener('keydown', tast);
    return () => {
      document.removeEventListener('mousedown', klikk);
      document.removeEventListener('keydown', tast);
    };
  }, [apen]);

  const aktiv = sider.find((s) => s.aktiv);

  return (
    <div className={`sidevelger${apen ? ' apen' : ''}${aktiv ? ' har-aktiv' : ''}`} ref={rot}>
      <button type="button" className="sidevelger-knapp" aria-haspopup="true" aria-expanded={apen} onClick={() => setApen((v) => !v)}>
        {aktiv?.tekst ?? meny}
        <span className="kortvelger-pil" aria-hidden="true" />
      </button>
      {apen && (
        <ul className="sidevelger-liste">
          {sider.map((s) => (
            <li key={s.id}>
              <a
                href={s.href}
                className={s.aktiv ? 'aktiv' : undefined}
                aria-current={s.aktiv ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setApen(false);
                  s.velg();
                }}
              >
                {s.tekst}
                {s.aktiv && (
                  <span className="kv-hake" aria-hidden="true">
                    ✓
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
