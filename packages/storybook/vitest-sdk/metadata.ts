import type { ArgosAttachment } from "@snapvisor/playwright";
import type { ScreenshotMetadata } from "@snapvisor/util/browser";
import { server } from "vitest/browser";

/**
 * Read the metadata `@snapvisor/vitest` wrote next to a screenshot, back
 * through Vitest's built-in `readFile` browser command.
 */
export async function readMetadata(
  attachments: ArgosAttachment[],
): Promise<ScreenshotMetadata> {
  const metadata = attachments.find((attachment) =>
    attachment.path.endsWith(".png.argos.json"),
  );
  if (!metadata) {
    throw new Error("No screenshot metadata attachment found");
  }
  return JSON.parse(await server.commands.readFile(metadata.path));
}
