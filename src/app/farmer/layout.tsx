import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import FarmerSidebar from "./farmer-sidebar";
import { PresenceTracker } from "@/components/shared/presence-tracker";
import { NotificationBell } from "@/components/shared/notification-bell";
import { SessionGuard } from "@/components/shared/session-guard";
import { SidebarCollapseProvider } from "@/components/shared/sidebar-collapse-context";
import { SidebarMainContent } from "@/components/shared/sidebar-main-content";

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || session.user.role !== "FARMER") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-[#fcfcf7]">
      <SessionGuard expectedRoles={["FARMER"]} />
      <PresenceTracker isRider={false} />
      <SidebarCollapseProvider>
        <FarmerSidebar user={{ name: session.user.name ?? "Farmer", phone: session.user.phone ?? "", image: session.user.image }} />
        <div className="fixed top-4 right-4 z-50">
          <NotificationBell colorClass="text-[#1c3a13]" buttonClassName="bg-[#fcfcf7] shadow-md border border-[#eeeee9] hover:bg-[#eeeee9]" />
        </div>
        <SidebarMainContent>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarMainContent>
      </SidebarCollapseProvider>
    </div>
  );
}
