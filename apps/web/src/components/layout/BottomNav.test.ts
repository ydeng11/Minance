import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const bottomNavSource = readFileSync(join(process.cwd(), "src/components/layout/BottomNav.tsx"), "utf8");

test("bottom nav links meet the 44px mobile touch-target floor", () => {
  assert.match(bottomNavSource, /min-h-\[44px\]/);
  assert.match(bottomNavSource, /py-3/);
  assert.doesNotMatch(bottomNavSource, /py-1\.5/);
});

test("bottom nav exposes Explorer directly and reserves a More entry for secondary routes", () => {
  assert.match(bottomNavSource, /mnav-explorer/);
  assert.match(bottomNavSource, /mnav-more/);
});

test("bottom nav ties the More tray to the pathname instead of closing it from an effect", () => {
  assert.match(bottomNavSource, /const \[moreOpenPathname, setMoreOpenPathname\] = useState<string \| null>\(null\);/);
  assert.match(bottomNavSource, /const moreOpen = moreOpenPathname === pathname;/);
  assert.doesNotMatch(bottomNavSource, /useEffect\(\(\) => {\s*setMoreOpen\(false\);\s*}, \[pathname\]\);/s);
});
