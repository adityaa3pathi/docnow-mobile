// Same relations and checks as the website's add-family-member form.
export const RELATIONS = ['Spouse', 'Child', 'Parent', 'Grand parent', 'Sibling', 'Friend', 'Native', 'Neighbour', 'Colleague', 'Others'] as const;
export const GENDERS = ['Male', 'Female', 'Other'] as const;

export interface PersonInput {
    name: string;
    relation: string;
    age: number;
    gender: string;
}

/** The first problem with the form as plain text, or null when it is fine to send. */
export function validatePerson(p: PersonInput): string | null {
    if (!p.name.trim()) return 'Please enter a name';
    if (!p.relation) return 'Please select a relation';
    if (!Number.isInteger(p.age) || p.age < 5) return 'Family member must be at least 5 years old';
    return null;
}

/** Self first, then by name. */
export function sortPeople<T extends { name: string; relation: string }>(list: T[]): T[] {
    const isSelf = (p: T) => p.relation?.toLowerCase() === 'self';
    return [...list].sort((a, b) => (isSelf(a) === isSelf(b) ? a.name.localeCompare(b.name) : isSelf(a) ? -1 : 1));
}
