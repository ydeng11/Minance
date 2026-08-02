import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CARD_FACE_IMAGE_MAP, generateCardFaceStyle } from "./cardStyles";

const PUBLIC_CARD_FACES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../public/card-faces"
);

test("every card face image referenced by the map exists on disk", () => {
  const entries = Object.entries(CARD_FACE_IMAGE_MAP);
  assert.ok(entries.length > 0, "card face image map should not be empty");

  for (const [cardName, url] of entries) {
    const fileName = url.replace(/^\/card-faces\//, "");
    assert.ok(
      existsSync(resolve(PUBLIC_CARD_FACES_DIR, fileName)),
      `${cardName} references ${url} but the file is missing — the card face renders as a broken image instead of filling the card`
    );
  }
});

test("Bilt preset cards render their real card face artwork", () => {
  const biltCards = [
    "Bilt Rewards Mastercard",
    "Bilt Blue Card",
    "Bilt Obsidian Card",
    "Bilt Palladium Card",
  ];

  for (const cardName of biltCards) {
    const style = generateCardFaceStyle(cardName);
    assert.ok(
      style.cardImageUrl,
      `${cardName} should resolve to its real card face artwork`
    );
    const fileName = style.cardImageUrl.replace(/^\/card-faces\//, "");
    assert.ok(
      existsSync(resolve(PUBLIC_CARD_FACES_DIR, fileName)),
      `${cardName} artwork ${style.cardImageUrl} must exist on disk`
    );
  }
});
