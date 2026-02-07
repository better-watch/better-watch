"use client";

import Link from "next/link";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { MessageIcon } from "@/components/icons";

export function EventsHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      <span className="text-sm font-medium">Audit Log</span>

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
    </header>
  );
}
