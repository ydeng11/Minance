import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MarkdownRenderer } from "./MarkdownRenderer";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function textContent(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function hasTag(html: string, tagName: string): boolean {
  return new RegExp(`<${tagName}(\\s|>|\\/|$)`).test(html);
}

function render(el: React.ReactElement): string {
  return renderToString(el);
}

/* ------------------------------------------------------------------ */
/*  Basic inline rendering                                              */
/* ------------------------------------------------------------------ */

test("renders plain text", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "Hello world." }));
  assert.ok(textContent(html).includes("Hello world."));
});

test("renders bold text with <strong>", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "Total: **$1,234**" }));
  assert.ok(hasTag(html, "strong"), "expected <strong> tag");
  assert.ok(textContent(html).includes("$1,234"));
});

test("renders italic text with <em>", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "A *notable* expense" }));
  assert.ok(hasTag(html, "em"), "expected <em> tag");
  assert.ok(textContent(html).includes("notable"));
});

test("renders inline code with <code>", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "Run `npm test`" }));
  assert.ok(hasTag(html, "code"), "expected <code> tag");
  assert.ok(textContent(html).includes("npm test"));
});

test("renders headings at correct levels", () => {
  const html = render(
    React.createElement(MarkdownRenderer, { content: "# Big\n\n## Section\n\n### Sub" })
  );
  assert.ok(hasTag(html, "h1"), "expected h1");
  assert.ok(hasTag(html, "h2"), "expected h2");
  assert.ok(hasTag(html, "h3"), "expected h3");
  assert.ok(textContent(html).includes("Big"));
  assert.ok(textContent(html).includes("Section"));
  assert.ok(textContent(html).includes("Sub"));
});

test("renders unordered lists", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "- One\n- Two" }));
  assert.ok(hasTag(html, "ul"), "expected <ul>");
  assert.ok(textContent(html).includes("One"));
  assert.ok(textContent(html).includes("Two"));
});

test("renders ordered lists", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "1. First\n2. Second" }));
  assert.ok(hasTag(html, "ol"), "expected <ol>");
  assert.ok(textContent(html).includes("First"));
});

/* ------------------------------------------------------------------ */
/*  Table rendering                                                     */
/* ------------------------------------------------------------------ */

test("renders GFM tables as <table>", () => {
  const html = render(
    React.createElement(MarkdownRenderer, {
      content: "| A | B |\n|---|---|\n| 1 | 2 |"
    })
  );
  assert.ok(hasTag(html, "table"), "expected <table>");
  assert.ok(hasTag(html, "th"), "expected <th>");
  assert.ok(hasTag(html, "td"), "expected <td>");
  assert.ok(textContent(html).includes("1"));
});

test("renders table with bold inline", () => {
  const html = render(
    React.createElement(MarkdownRenderer, {
      content: "| Item | Total |\n|------|-------|\n| **Rent** | **$100** |"
    })
  );
  assert.ok(hasTag(html, "table"), "expected table");
  assert.ok(hasTag(html, "strong"), "expected bold in table");
  assert.ok(textContent(html).includes("Rent"));
  assert.ok(textContent(html).includes("$100"));
});

/* ------------------------------------------------------------------ */
/*  Overflow button — server-side check (ResizeObserver only runs       */
/*  client-side, so button is absent from SSR)                          */
/* ------------------------------------------------------------------ */

test("expand button does not render server-side", () => {
  const html = render(
    React.createElement(MarkdownRenderer, {
      content: [
        "| A | B | C | D | E |",
        "|---|---|---|---|---|",
        "| 1 | 2 | 3 | 4 | 5 |"
      ].join("\n")
    })
  );
  // Without ResizeObserver the widget cannot know it's overflowing,
  // so the button must be absent from SSR output.
  assert.ok(!html.includes("Expand table"), "no expand button in SSR");
  // Table still renders
  assert.ok(hasTag(html, "table"), "table still renders server-side");
});

/* ------------------------------------------------------------------ */
/*  URL sanitisation                                                    */
/* ------------------------------------------------------------------ */

test("allows safe http links", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "[go](https://example.com)" }));
  assert.ok(hasTag(html, "a"), "expected anchor");
  // URL is href="https://example.com/" with trailing slash from URL constructor
  assert.ok(html.includes('https://example.com'), "expected example.com in href");
});

test("allows relative links", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "[go](/path)" }));
  assert.ok(hasTag(html, "a"), "expected anchor");
  assert.ok(html.includes('href="/path"'));
});

test("rejects javascript: links", () => {
  const html = render(
    React.createElement(MarkdownRenderer, { content: "[bad](javascript:alert(1))" })
  );
  // Should not render as a link
  assert.ok(!hasTag(html, "a"), "no anchor for javascript: URI");
  // The text should still appear as plain text
  assert.ok(textContent(html).includes("bad"));
});

test("rejects data: links", () => {
  const html = render(
    React.createElement(MarkdownRenderer, { content: "[x](data:text/html,<script>)" })
  );
  assert.ok(!hasTag(html, "a"), "no anchor for data: URI");
});

/* ------------------------------------------------------------------ */
/*  Token coalescence — no char-by-char spans                          */
/* ------------------------------------------------------------------ */

test("coalesces consecutive plain text into a single span", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "Hello world" }));
  // Count <span> tags that wrap plain text
  const plainSpans = html.match(/<span>/g) || [];
  assert.ok(plainSpans.length <= 1, "expected at most one plain <span> wrapper");
});

test("mixed bold+plain has separate spans but not per-character", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "before **bold** after" }));
  // Each character is NOT individually wrapped. Count the number of
  // word-characters between tags to confirm they are coalesced.
  const singleCharPattern = /<span>[a-zA-Z0-9]<\/span>/g;
  const singleChars = html.match(singleCharPattern);
  assert.ok(singleChars === null || singleChars.length === 0,
    `no single-character spans, got ${singleChars?.length}: ${html}`);
});

/* ------------------------------------------------------------------ */
/*  Empty / edge-case handling                                          */
/* ------------------------------------------------------------------ */

test("handles empty content", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "" }));
  assert.equal(textContent(html).trim(), "");
});

test("handles whitespace-only content", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "   \n\n  \n" }));
  assert.equal(textContent(html).trim(), "");
});

test("handles bold-italic gracefully", () => {
  const html = render(React.createElement(MarkdownRenderer, { content: "***really***" }));
  assert.ok(textContent(html).includes("really"));
});

/* ------------------------------------------------------------------ */
/*  Full realistic response — no raw JSON, no pipe wall                 */
/* ------------------------------------------------------------------ */

test("renders the full recurring-expenses response without raw JSON or pipe text", () => {
  // This fixture mirrors what the API returns — trailing JSON and all
  const content = [
    "Here's a breakdown of your recurring expenses over the last 6 months (Feb–Jul 2026):",
    "",
    "**Active recurring rules (total recurring spend: $14,410.54):**",
    "",
    "| Expense | Cadence | Amount | 6-Month Total |",
    "|---|---|---|---|",
    "| 🏠 **Rent** (Sunset Apartments) | Monthly | $1,850 | **$11,100** |",
    "| 🛒 **Groceries** (Market pattern) | Weekly | ~$135 | **~$3,510** |",
    "| 💡 **Electric Bill** (Fixture Energy) | Monthly | $100 | **$600** |",
    "| 📺 **Streaming** (Stream Box) | Monthly | $15.99 | **Paused** |",
    "| 🏦 **Annual Insurance** | Yearly | $720 | Not due yet (next: Apr 2027) |",
    "",
    "**Other recurring patterns detected (not yet set as rules):**",
    "",
    "- **Green Market** — ~$150/month (groceries)",
    "- **Neighborhood Foods** — ~$170/month (groceries)",
    "- **Cafe Brisk** — ~$60/month (dining)",
    "- **Broker Transfer** — ~$750/month (investments)",
    "- **Savings Transfer** — ~$400/biweekly (savings)",
    "",
    "**Key takeaway:** Your recurring expenses (rent, groceries, utilities) make up **~70% of your total spending** ($14,410 of $20,705).",
    "",
    "{ \"answer\": \"Over the last 6 months, your recurring expenses totaled $14,410.54...\", \"summary\": \"Recurring expenses of $14,410.54 make up ~70% of total spending over 6 months\", \"key_points\": [\"Rent: $1,850/month ($11,100 total)\", \"Groceries: ~$135/week\"], \"highlights\": [\"70% of spending is recurring\", \"Streaming is paused\"] }"
  ].join("\n");

  const html = render(React.createElement(MarkdownRenderer, { content }));
  const text = textContent(html);

  // 1. No raw JSON visible
  assert.ok(!text.includes('"answer"'), "raw JSON answer field not visible");
  assert.ok(!text.includes('"summary"'), "raw JSON summary field not visible");
  assert.ok(!text.includes('"key_points"'), "raw JSON key_points not visible");
  assert.ok(!text.includes('"$14,410.54..."'), "trailing JSON text not visible");

  // 2. No pipe-delimited wall
  assert.ok(!text.includes("| 🏠"), "pipes stripped — table rendered as <table>");

  // 3. Table becomes real <table>
  assert.ok(hasTag(html, "table"), "table rendered as HTML table");
  assert.ok(hasTag(html, "th"), "table headers rendered");
  assert.ok(hasTag(html, "td"), "table cells rendered");

  // 4. Content from the markdown part is present
  assert.ok(text.includes("$14,410.54"), "total spend visible");
  assert.ok(text.includes("Sunset Apartments"), "merchant details visible");
  assert.ok(text.includes("70%"), "percentage visible");

  // 5. Bold rendered
  assert.ok(hasTag(html, "strong"), "bold tags rendered");
  assert.ok(text.includes("Active recurring rules"), "bold text content visible");
  assert.ok(text.includes("Key takeaway"), "bold text content visible");
});

/* ------------------------------------------------------------------ */
/*  Trailing JSON fixture — adapter level test                          */
/* ------------------------------------------------------------------ */

test("trailing JSON in answer does not crash MarkdownRenderer", () => {
  // Even if the trailing JSON doesn't get stripped (e.g. the adapter handles
  // it but the renderer should still be resilient), the renderer must not
  // crash or show the JSON as formatted content.
  const content = "Hello world.\n{ \"answer\": \"Bye\" }";
  const html = render(React.createElement(MarkdownRenderer, { content }));
  // Should not crash; JSON block at end is parsed as paragraph text but
  // since it contains a lone pipe-less { } it'll be a paragraph.
  assert.ok(textContent(html).includes("Hello"));
  // The JSON text may appear as a paragraph — that's fine, adapter should
  // strip it. But it must not crash.
});

/* ------------------------------------------------------------------ */
/*  Unsafe link in table does not render                               */
/* ------------------------------------------------------------------ */

test("javascript: links in table cells are not rendered as anchors", () => {
  const content = "| Link |\n|------|\n| [bad](javascript:void(0)) |";
  const html = render(React.createElement(MarkdownRenderer, { content }));
  assert.ok(!hasTag(html, "a"), "no anchor for javascript: URI in table");
  // Text still appears
  assert.ok(textContent(html).includes("bad"));
});
