import { useCallback, useRef, useState } from "react";
import { COMPONENT_LIBRARY } from "../../domain/component-library.js";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import type { EventLogEntry } from "../components/event-log.js";

interface UseEventLogResult {
  appendEvent: (text: string) => void;
  eventEntries: EventLogEntry[];
  resetEvents: (nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => void;
}

const useEventLog = (): UseEventLogResult => {
  const [eventEntries, setEventEntries] = useState<EventLogEntry[]>([]);
  const counterRef = useRef(0);

  const appendEvent = useCallback((text: string) => {
    counterRef.current += 1;
    const id = `event-${counterRef.current}`;

    setEventEntries((prev) => [...prev, { id, text }]);
  }, []);

  const resetEvents = useCallback((nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => {
    counterRef.current = 0;
    const entries: EventLogEntry[] = [];

    nodes.forEach((node) => {
      counterRef.current += 1;
      entries.push({
        id: `event-${counterRef.current}`,
        text: `Component placed: ${COMPONENT_LIBRARY[node.componentType].label}`,
      });
    });

    edges.forEach((edge) => {
      counterRef.current += 1;
      entries.push({
        id: `event-${counterRef.current}`,
        text: `Connection created: ${edge.source} → ${edge.target}`,
      });
    });

    setEventEntries(entries);
  }, []);

  return { appendEvent, eventEntries, resetEvents };
};

export { useEventLog };
