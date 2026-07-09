import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SignOutButton } from "@/components/shared/signout-button";
import { Button } from "@/components/ui/button";
import { Clock, XCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getDashboardPath } from "@/lib/dashboard-path";

export default async function AdminPendingPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const request = await prisma.adminRequest.findUnique({
    where: { userId: session.user.id },
  });

  // No application on file — nothing to show here.
  if (!request) redirect(getDashboardPath(session.user.role));

  const dashboardPath = getDashboardPath(session.user.role);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              request.status === "REJECTED" ? "bg-red-100" : request.status === "APPROVED" ? "bg-[#d3fa99]" : "bg-[#d3fa99]"
            }`}
          >
            {request.status === "REJECTED" ? (
              <XCircle className="h-9 w-9 text-red-600" />
            ) : request.status === "APPROVED" ? (
              <CheckCircle className="h-9 w-9 text-[#1c3a13]" />
            ) : (
              <Clock className="h-9 w-9 text-[#1c3a13]" />
            )}
          </div>

          {request.status === "REJECTED" && (
            <>
              <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Application not approved</h1>
              <p className="text-sm text-[#1c3a13]/60">
                Your admin application was reviewed and not approved. You still have full access to your account
                as a customer.
              </p>
              {request.reviewNotes && (
                <div className="w-full rounded-xl bg-[#eeeee9] p-3 text-left text-sm text-[#1c3a13]/70">
                  <p className="text-xs font-medium text-[#1c3a13]/50 uppercase mb-1">Reviewer notes</p>
                  {request.reviewNotes}
                </div>
              )}
            </>
          )}

          {request.status === "APPROVED" && (
            <>
              <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">You&apos;re approved!</h1>
              <p className="text-sm text-[#1c3a13]/60">
                Your admin application has been approved. Log out and back in to pick up your new admin access.
              </p>
            </>
          )}

          {request.status === "PENDING" && (
            <>
              <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Application under review</h1>
              <p className="text-sm text-[#1c3a13]/60">
                Thanks for applying, {session.user.name?.split(" ")[0]}. An existing admin is reviewing your
                Ghana Card and photo. In the meantime you have full access to your account as a customer —
                you&apos;ll be notified as soon as a decision is made.
              </p>
            </>
          )}

          <div className="flex items-center gap-1.5 text-xs text-[#1c3a13]/40">
            <ShieldCheck className="h-3.5 w-3.5" />
            Applied {formatDate(request.createdAt)}
          </div>

          {request.status === "APPROVED" ? (
            <SignOutButton className="mt-2 w-full justify-center rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]" />
          ) : (
            <Button asChild className="mt-2 w-full rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
              <Link href={dashboardPath}>Back to my account</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
