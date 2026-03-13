import { Bell, User } from "lucide-react";

function Header({ title }) {
  return (
    <header className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
        {title}
      </h1>
      <div className="flex items-center gap-4">
        <button
          className="p-2 rounded-lg hover:bg-white/80 transition-colors"
          aria-label="알림"
        >
          <Bell size={22} strokeWidth={2} style={{ color: "var(--color-text)" }} />
        </button>
        <button
          className="w-10 h-10 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="프로필"
        >
          <User size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

export default Header;
