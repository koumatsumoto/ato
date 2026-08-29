import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="bg-[#85cfae]" style={{ minHeight: "var(--app-height)" }}>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-5 sm:py-7">{children}</main>
    </div>
  );
}
