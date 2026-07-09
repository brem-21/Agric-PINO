"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleLoadingScreen, type LoadingRole } from "./role-loading-screen";

interface SignOutButtonProps {
  className?: string;
  iconOnly?: boolean;
}

export function SignOutButton({ className, iconOnly = false }: SignOutButtonProps) {
  const { data: session } = useSession();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAnim, setShowAnim] = useState(false);

  const role = (session?.user?.role ?? "BUYER") as LoadingRole;

  function handleConfirm() {
    setShowConfirm(false);
    setShowAnim(true);
  }

  function handleDone() {
    signOut({ callbackUrl: "/auth/login" });
  }

  return (
    <>
      {showAnim && (
        <RoleLoadingScreen role={role} mode="logout" onDone={handleDone} />
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm" showClose={false}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeee9] flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-[#1c3a13]" />
              </div>
              <DialogTitle>Sign out of Lorgric?</DialogTitle>
            </div>
            <DialogDescription>
              You&apos;ll need to sign back in to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Stay signed in
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="sm"
        className={className}
        onClick={() => setShowConfirm(true)}
        aria-label="Sign out"
        title={iconOnly ? "Sign out" : undefined}
      >
        <LogOut className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-2"} />
        {!iconOnly && "Sign Out"}
      </Button>
    </>
  );
}
