import { handwritingProfileService } from "./handwriting-profile.service";
import type { HandwritingProfile } from "../domain/handwriting-profile.types";

const registeredFonts = new Map<string, Promise<FontFace>>();

export function getHandwritingFontFamily(profileId: string) {
  return `KreativHandwriting-${profileId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export async function registerHandwritingFont(
  profile: HandwritingProfile,
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("Fonts can only be registered in the browser.");
  }

  if (!profile.fontBlob || profile.status !== "ready") {
    throw new Error("This profile does not have a generated font.");
  }

  const family = getHandwritingFontFamily(profile.id);

  let fontPromise = registeredFonts.get(family);

  if (!fontPromise) {
    fontPromise = profile.fontBlob
      .arrayBuffer()
      .then((buffer) => new FontFace(family, buffer).load())
      .then((fontFace) => {
        document.fonts.add(fontFace);
        return fontFace;
      });

    registeredFonts.set(family, fontPromise);

    fontPromise.catch(() => {
      registeredFonts.delete(family);
    });
  }

  await fontPromise;

  return family;
}

export async function loadHandwritingFonts() {
  const profiles = await handwritingProfileService.getAll();

  const options: { value: string; label: string }[] = [];

  await Promise.all(
    profiles.map(async (profile) => {
      if (profile.status !== "ready" || !profile.fontBlob) return;

      try {
        const family = await registerHandwritingFont(profile);

        options.push({
          value: family,
          label: `${profile.name} (Handwriting)`,
        });
      } catch (error) {
        console.error(
          `Unable to load handwriting font for "${profile.name}":`,
          error,
        );
      }
    }),
  );

  return options.sort((a, b) => a.label.localeCompare(b.label));
}
