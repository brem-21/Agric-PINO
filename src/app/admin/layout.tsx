import { auth } from "@/lib/auth";
import AdminSidebar from "./admin-sidebar";
import { NotificationBell } from "@/components/shared/notification-bell";
import { SessionGuard } from "@/components/shared/session-guard";
import { SidebarCollapseProvider } from "@/components/shared/sidebar-collapse-context";
import { SidebarMainContent } from "@/components/shared/sidebar-main-content";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // A customer with a pending/rejected admin application can land on
  // /admin/pending — show it bare, without the admin chrome that implies
  // they have admin access.
  if (session?.user.role !== "ADMIN") {
    return <div className="min-h-screen bg-[#fcfcf7]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#fcfcf7]">
      <SessionGuard expectedRoles={["ADMIN"]} />
      <SidebarCollapseProvider>
        <AdminSidebar />
        <div className="fixed top-4 right-4 z-50">
          <NotificationBell colorClass="text-[#1c3a13]" buttonClassName="bg-[#fcfcf7] shadow-md border border-[#eeeee9] hover:bg-[#eeeee9]" />
        </div>
        <SidebarMainContent>{children}</SidebarMainContent>
      </SidebarCollapseProvider>
    </div>
  );
}
