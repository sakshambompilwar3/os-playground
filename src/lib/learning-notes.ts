import { BANKERS_NOTES } from "./bankers-notes";

export const learningNotes = BANKERS_NOTES.map((c) => ({
  t: c.t,
  b: c.b,
}));
