import { Link, useLocation } from "wouter";

const NAV = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Account Deletion", href: "/delete-account" },
  { label: "Terms of Use", href: "/terms" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-6 flex-wrap">
          <span className="text-lg font-semibold tracking-tight">MacroCarry</span>
          <nav className="flex gap-1 flex-wrap">
            {NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location === href
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-10">{children}</div>
      </main>

      <footer className="border-t mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 text-sm text-muted-foreground flex flex-wrap gap-4 justify-between">
          <span>© {new Date().getFullYear()} MacroCarry. All rights reserved.</span>
          <span>Questions? Email <a href="mailto:privacy@macrocarry.app" className="underline hover:text-foreground">privacy@macrocarry.app</a></span>
        </div>
      </footer>
    </div>
  );
}
