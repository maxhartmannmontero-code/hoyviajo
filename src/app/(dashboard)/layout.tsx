import { Sidebar } from "@/components/sidebar";
import { MaskProvider } from "@/lib/mask-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MaskProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </MaskProvider>
  );
}
