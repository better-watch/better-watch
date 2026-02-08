"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { MessageIcon } from "@/components/icons";
import { ClockIcon } from "lucide-react";

export function EventsNewHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <div className="ml-auto flex items-center gap-2">

      <Button
        asChild
        className="ml-auto h-8 px-2 md:h-fit md:px-2"
        variant="outline"
      >
        <Link href="/chat">
          <MessageIcon size={16} />
          <span className="md:sr-only">Chat</span>
        </Link>
      </Button>
      <Button
          asChild
          className="h-8 px-2 md:ml-auto md:h-fit md:px-2"
          variant="outline"
        >
          <Link href="/timeline">
            <ClockIcon size={16} />
            <span className="md:sr-only">Timeline</span>
          </Link>
        </Button>
      <ThemeToggle />
      </div>
    </header>
  );
}
