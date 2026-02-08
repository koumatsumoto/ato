import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50" style={{ minHeight: "var(--app-height)" }}>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
