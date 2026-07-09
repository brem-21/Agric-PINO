import Link from "next/link";
import { Leaf, Home } from "lucide-react";
import { BackButton } from "@/components/shared/back-button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fcfcf7] flex flex-col">
      <div className="bg-[#1c3a13] text-[#fcfcf7] py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          <span className="font-medium">Lorgric</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <p className="text-6xl mb-4">🌾</p>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Page not found</h1>
          <p className="text-sm text-[#1c3a13]/50 mt-2">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <BackButton />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1c3a13] px-5 py-2.5 text-sm font-medium text-[#fcfcf7] hover:bg-[#2a5219] transition-colors"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[#1c3a13]/40 pb-6">
        Lorgric · Northern Savannah Zone, Ghana
      </p>
    </div>
  );
}
