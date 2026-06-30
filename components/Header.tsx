import Link from "next/link";
import AuthStatus from "./AuthStatus";

export default function Header() {
  return (
    <header className="border-b-2 border-ink-line bg-ink/95 sticky top-0 z-30 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true">
            <path
              d="M2 4c0-1.1.9-2 2-2h22c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H12l-6 6v-6H4c-1.1 0-2-.9-2-2V4z"
              fill="#E7E4DA"
              stroke="#15130F"
              strokeWidth="1.5"
            />
            <line
              x1="4"
              y1="20"
              x2="26"
              y2="2"
              stroke="#E2402B"
              strokeWidth="2.5"
              className="transition-all group-hover:stroke-[#3FA9A0]"
            />
          </svg>
          <span className="font-display text-2xl tracking-wide text-paper">
            BubbleBlaster
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-paper/80 hover:text-seal transition-colors">
            Blaster
          </Link>
          <Link
            href="/history"
            className="text-paper/80 hover:text-seal transition-colors"
          >
            Historico
          </Link>
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
