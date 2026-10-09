// Shaniwar Wada's Dilli Darwaza (bastions + pointed-arch gate) under the Bhagwa Jari Patka.
// Keep in sync with app/icon.svg.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#7c2d12" />
      <path d="M16 4v11.2" stroke="#fde7cf" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M16.4 4.2 23 6l-3.6 1.4L23 8.8l-6.6 1.6z" fill="#fb923c" />
      <path
        fill="#fde7cf"
        fillRule="evenodd"
        d="M4 27V13h1.6v-1.4h1.6V13h1.6v-1.4h1.6V13H12v2.2h1.4v-1.4h1.8v1.4h1.6v-1.4h1.8v1.4H20V13h1.6v-1.4h1.6V13h1.6v-1.4h1.6V13H28v14zm9.2 0v-5.4c0-2 1.3-3.6 2.8-4.6 1.5 1 2.8 2.6 2.8 4.6V27z"
      />
    </svg>
  );
}
