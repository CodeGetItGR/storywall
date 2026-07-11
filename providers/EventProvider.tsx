"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EventMemberResponseDto, EventResponseDto } from "@/lib/api/types";
import { useAuth } from "@/hooks/useAuth";
import { useMyEvents } from "@/hooks/useMyEvents";
import { useEvent } from "@/hooks/useEvent";

const ACTIVE_EVENT_KEY = "storywall.activeEventId";

interface EventContextValue {
  memberships: EventMemberResponseDto[];
  activeEvent: EventResponseDto | null;
  activeMember: EventMemberResponseDto | null;
  isLoading: boolean;
  setActiveEventId: (eventId: string) => void;
}

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data: memberships = [], isLoading: isLoadingMemberships } = useMyEvents();
  const [activeEventId, setActiveEventIdState] = useState<string | null>(null);

  // Restore the last-active event once memberships load, defaulting to the
  // first membership when nothing was previously selected (or the stored
  // id no longer matches any membership, e.g. after switching accounts).
  useEffect(() => {
    if (memberships.length === 0) return;

    const stored = typeof window !== "undefined" ? window.sessionStorage.getItem(ACTIVE_EVENT_KEY) : null;
    const restored = memberships.find((m) => m.eventId === stored);
    setActiveEventIdState((current) => {
      if (current && memberships.some((m) => m.eventId === current)) return current;
      return (restored ?? memberships[0]).eventId;
    });
  }, [memberships]);

  function setActiveEventId(eventId: string) {
    setActiveEventIdState(eventId);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ACTIVE_EVENT_KEY, eventId);
    }
  }

  const { data: activeEvent, isLoading: isLoadingEvent } = useEvent(activeEventId);

  const activeMember = useMemo(
    () => memberships.find((m) => m.eventId === activeEventId) ?? null,
    [memberships, activeEventId],
  );

  const value: EventContextValue = {
    memberships,
    activeEvent: activeEvent ?? null,
    activeMember,
    isLoading: isAuthenticated && (isLoadingMemberships || (Boolean(activeEventId) && isLoadingEvent)),
    setActiveEventId,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

function useEventContext(): EventContextValue {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
}

export function useActiveEvent(): EventResponseDto | null {
  return useEventContext().activeEvent;
}

export function useActiveMember(): EventMemberResponseDto | null {
  return useEventContext().activeMember;
}

export function useMyMemberships(): EventMemberResponseDto[] {
  return useEventContext().memberships;
}

export function useEventContextLoading(): boolean {
  return useEventContext().isLoading;
}

export function useEventSwitcher() {
  const { memberships, activeEvent, setActiveEventId, isLoading } = useEventContext();
  return { memberships, activeEvent, setActiveEventId, isLoading };
}
