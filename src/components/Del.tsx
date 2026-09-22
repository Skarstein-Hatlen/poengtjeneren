import { useEffect, useState } from 'react';
import type { Land } from '../data/types';
import { tekst } from '../i18n';

interface Props {
  land: Land;
  /** Teksten som kopieres – lages først når knappen trykkes. */
  lag: () => string;
}

/** «Kopier»: resultatet som tre linjer tekst med lenke, klart til å limes inn i en gruppe. */
export default function Del({ land, lag }: Props) {
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    if (!kopiert) return;
    const t = setTimeout(() => setKopiert(false), 2000);
    return () => clearTimeout(t);
  }, [kopiert]);

  const kopier = async () => {
    try {
      await navigator.clipboard.writeText(lag());
      setKopiert(true);
    } catch {
      /* utklippstavlen kan være sperret – da skjer ingenting */
    }
  };

  return (
    <button type="button" className="lenke del" onClick={kopier} aria-live="polite">
      {kopiert ? `${tekst(land, 'kopiert')} ✓` : `${tekst(land, 'kopier')} ↗`}
    </button>
  );
}
