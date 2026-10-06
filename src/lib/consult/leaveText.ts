/** The note shown after leave is added, from how many booked consultations it overlaps. */
export function conflictMessage(count: number): string {
  if (count <= 0) return 'Your leave is added. No patients were booked in this time.';
  return `Your leave is added. ${count} ${count === 1 ? 'patient has' : 'patients have'} already booked in this time. Please contact the Docnow team about them.`;
}
