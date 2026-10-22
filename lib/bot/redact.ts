/**
 * Rule-based checks that run before any AI call, so contact details never
 * leave the server and the most serious words are caught even if the AI
 * service is down.
 */

const PHONE = /(?:\+?\d[\s().-]?){7,}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const LINK = /\b(?:https?:\/\/|www\.)\S+/gi;

export function redactContacts(text: string): { cleaned: string; found: string[] } {
  const found: string[] = [];
  let cleaned = text;
  // String.match resets the global regex each call; RegExp.test would not.
  if (cleaned.match(EMAIL)) found.push("an email address");
  if (cleaned.match(LINK)) found.push("a link");
  if (cleaned.replace(EMAIL, "").replace(LINK, "").match(PHONE)) found.push("a phone number");
  cleaned = cleaned.replace(EMAIL, "[hidden]").replace(LINK, "[hidden]").replace(PHONE, "[hidden]");
  return { cleaned, found };
}

/**
 * Words that always send a message to the safeguarding lead, whatever the AI
 * says. This list is a safety net, not the main check; the safeguarding lead
 * should own and extend it, including in each partner language.
 */
const URGENT_PATTERNS = [
  /\bkill (?:my ?self|me)\b/i,
  /\bsuicid/i,
  /\bself[- ]?harm/i,
  /\bhurt(?:ing)? my ?self\b/i,
  /\bwant to die\b/i,
  /\babus(?:e|ed|ing)\b/i,
  /\b(?:hits?|hitting|beats?|beating|beat) me\b/i,
  /\btouch(?:ed|es|ing)? me\b/i,
  /\bnot safe at home\b/i,
  /\bscared to go home\b/i,
  /\brap(?:e|ed)\b/i,
  /\bforced? (?:me )?to marry\b/i,
];

export function hasUrgentWords(text: string): boolean {
  return URGENT_PATTERNS.some((p) => p.test(text));
}
