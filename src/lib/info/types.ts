/** Shape of the static info pages (about, terms, privacy, help). Text is copied from the website. */
export type InfoBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'note'; text: string };

export type InfoSection = {
  number?: string;
  title: string;
  blocks: InfoBlock[];
};

export type InfoDoc = {
  title: string;
  subtitle?: string;
  updated?: string;
  sections: InfoSection[];
};
