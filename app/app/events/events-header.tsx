"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { MessageIcon } from "@/components/icons";

export function EventsNewHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
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
      <ThemeToggle />
    </header>
  );
}
