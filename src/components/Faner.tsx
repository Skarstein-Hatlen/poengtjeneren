interface Fane {
  id: string;
  tekst: string;
  /** Adressen når fanen er en egen side. Uten adresse bytter fanen bare innholdet på siden. */
  href?: string;
  aktiv: boolean;
  velg: () => void;
}

/** Fanene øverst på en side med flere deler (Kampanjer, Kort, Planlegger) – samme rad overalt. */
export default function Faner({ navn, faner }: { navn: string; faner: Fane[] }) {
  return (
    <nav className="faner" aria-label={navn}>
      {faner.map((f) =>
        f.href ? (
          <a
            key={f.id}
            href={f.href}
            aria-current={f.aktiv ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              f.velg();
            }}
          >
            {f.tekst}
          </a>
        ) : (
          <button key={f.id} type="button" aria-pressed={f.aktiv} onClick={f.velg}>
            {f.tekst}
          </button>
        ),
      )}
    </nav>
  );
}
