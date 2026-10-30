import type { ScreenshotMetadata } from "@snapvisor/util";

// Shared with `@snapvisor/vitest`, so both SDKs report a story the same way.
export { hasPlay, mergeTags } from "@snapvisor/util/browser";

/**
 * Build the story metadata object that is attached to a screenshot.
 *
 * @param story - The story shape (id, tags, play flag).
 * @param storyMode - The Storybook mode name (e.g. "dark", "mobile") as defined in `parameters.argos.modes`
 */
export function getStoryMetadata(
  story: {
    id: string;
    tags?: string[];
    play?: boolean;
  },
  storyMode?: string | null,
): ScreenshotMetadata["story"] {
  return {
    id: story.id,
    tags: story.tags ?? [],
    mode: storyMode ?? undefined,
    play: Boolean(story.play),
  };
}
