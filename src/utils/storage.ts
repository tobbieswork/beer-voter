export function getVisitedEvents(): string[] {
  try {
    const data = localStorage.getItem('beervote_visited_events');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addVisitedEvent(eventId: string) {
  try {
    const events = getVisitedEvents();
    if (!events.includes(eventId)) {
      events.push(eventId);
      localStorage.setItem('beervote_visited_events', JSON.stringify(events));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getPinToken(eventId: string): string | null {
  try {
    return localStorage.getItem(`beervote_pin_token_${eventId}`);
  } catch {
    return null;
  }
}

export function savePinToken(eventId: string, token: string) {
  try {
    localStorage.setItem(`beervote_pin_token_${eventId}`, token);
  } catch {
    // Storage full, ignore
  }
}

export function clearPinToken(eventId: string) {
  try {
    localStorage.removeItem(`beervote_pin_token_${eventId}`);
  } catch {
    // Ignore
  }
}
