import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const viewControllerSource = readFileSync(join(process.cwd(), "src/components/view/ViewController.tsx"), "utf8");

test("view controller clears dependent state inline when unregistering a view", () => {
  assert.match(
    viewControllerSource,
    /const registerView = useCallback\(\(nextView: ViewRegistration \| null\) => {\s*setView\(nextView\);\s*if \(!nextView\) {\s*setActions\(null\);\s*setIsViewOpen\(false\);\s*}\s*}, \[\]\);/s
  );
  assert.doesNotMatch(
    viewControllerSource,
    /useEffect\(\(\) => {\s*if \(!view\) {\s*setActions\(null\);\s*setIsViewOpen\(false\);\s*}\s*}, \[view\]\);/s
  );
});
