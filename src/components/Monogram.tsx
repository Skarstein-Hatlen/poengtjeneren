import type { Program } from '../data/types';

/** Mørk eller lys tekst, avhengig av hvor lys bakgrunnsfargen er. */
function tekstFarge(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#141413' : '#ffffff';
}

/** Programmets logo, eller et monogram i merkefargen hvis ingen logo er lagt inn. */
export default function Monogram({ program }: { program: Program }) {
  if (program.logo) return <img className="logo" src={program.logo} alt="" />;
  return (
    <span className="monogram" style={{ background: program.farge, color: tekstFarge(program.farge) }} aria-hidden="true">
      {program.kortnavn.charAt(0)}
    </span>
  );
}
