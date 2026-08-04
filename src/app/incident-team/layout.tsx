import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import IncidentTeamSidebar from "./incident-team-sidebar";
import { PresenceTracker } from "@/components/shared/presence-tracker";
import { NotificationBell } from "@/components/shared/notification-bell";
import { SessionGuard } from "@/components/shared/session-guard";
import { SidebarCollapseProvider } from "@/components/shared/sidebar-collapse-context";
import { SidebarMainContent } from "@/components/shared/sidebar-main-content";

export default async function IncidentTeamLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  // A user who isn't (yet) a Macho can land on /incident-team/apply — show it
  // bare, without the incident-team chrome that implies they have access.
  if (session.user.role !== "ADMIN" && !session.user.isIncidentTeam) {
    return <div className="min-h-screen bg-[#fcfcf7]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#fef2f2]">
      <SessionGuard expectedRoles={["ADMIN"]} expectedFlag="isIncidentTeam" />
      <PresenceTracker isRider={false} />
      <SidebarCollapseProvider>
        <IncidentTeamSidebar user={{ name: session.user.name ?? "Macho", phone: session.user.phone ?? "", image: session.user.image }} />
        <div className="fixed top-4 right-4 z-50">
          <NotificationBell colorClass="text-[#7f1d1d]" buttonClassName="bg-[#fef2f2] shadow-md border border-[#fee2e2] hover:bg-[#fee2e2]" />
        </div>
        <SidebarMainContent>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarMainContent>
      </SidebarCollapseProvider>
    </div>
  );
}
