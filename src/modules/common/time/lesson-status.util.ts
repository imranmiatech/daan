export type TimedClassStatus = 'upcoming' | 'live' | 'completed';

export function getTimedClassStatus(
  startsAt: Date,
  endsAt: Date,
  now = new Date(),
): TimedClassStatus {
  if (now < startsAt) {
    return 'upcoming';
  }

  if (now >= endsAt) {
    return 'completed';
  }

  return 'live';
}

export function getTimedClassStatusByDuration(
  startsAt: Date,
  durationMinutes: number,
  now = new Date(),
): TimedClassStatus {
  return getTimedClassStatus(
    startsAt,
    new Date(startsAt.getTime() + durationMinutes * 60 * 1000),
    now,
  );
}
