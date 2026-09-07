/**
 * The ten lines the koi chases, kept out of UnderwaterScene.tsx so the copy can be
 * edited without opening a file full of shader source.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PLACEHOLDER COPY — replace all ten `text` values.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * These are deliberately not brand lines. Writing those isn't mine to do, and copy
 * invented by an agent should never be able to reach production by accident, so they
 * are left obviously unwritten instead of plausibly wrong.
 *
 * Practical notes for whatever replaces them:
 *
 *   - Short. Each line is a target the koi swims to, and it holds for under four
 *     seconds before dissolving. Six words is comfortable; twelve is too many to read
 *     before it goes.
 *   - The order matters only for rhythm. Messages alternate top and bottom slot by
 *     index, so consecutive lines never appear in the same place.
 *   - Emptying this array turns the section back into a wordless scene. Adding or
 *     removing entries is safe — nothing depends on there being exactly ten.
 */
export const SEA_MESSAGES: string[] = [
  "First line goes here",
  "Second line goes here",
  "Third line goes here",
  "Fourth line goes here",
  "Fifth line goes here",
  "Sixth line goes here",
  "Seventh line goes here",
  "Eighth line goes here",
  "Ninth line goes here",
  "Tenth line goes here",
];

/**
 * Seconds of empty water after one message has finished dissolving before the next
 * appears.
 *
 * Measured from the end of the dissolve, not from the previous message's birth, which
 * is what takes the deadline off the koi: it has as long as it needs to swim over, so
 * its speed is a matter of what looks right rather than of what the clock allows. The
 * full cycle is therefore the swim, plus the dissolve, plus this.
 */
export const MESSAGE_GAP = 10;
/** How long a message takes to resolve out of the water as it appears. */
export const MESSAGE_FADE_IN = 0.55;
/** How long it takes to dissolve once the koi reaches it. */
export const MESSAGE_DISSOLVE = 0.9;
