import { describe, expect, it } from "vitest";
import changelogText from "../../../../CHANGELOG.md?raw";
import { inline, parseChangelog } from "./changelog";

describe("inline", () => {
  it("splits text, code and links", () => {
    expect(inline("Use `VERSION` and [the guide](https://example.org/g) now.")).toEqual([
      { type: "text", text: "Use " },
      { type: "code", text: "VERSION" },
      { type: "text", text: " and " },
      { type: "link", text: "the guide", href: "https://example.org/g" },
      { type: "text", text: " now." },
    ]);
  });

  it("keeps links to this site and anchors, and turns every other address into plain text", () => {
    expect(inline("[a](/version)")).toEqual([{ type: "link", text: "a", href: "/version" }]);
    expect(inline("[a](#unreleased)")).toEqual([{ type: "link", text: "a", href: "#unreleased" }]);
    for (const bad of [
      "javascript:alert", "http://example.org", "//evil.example/x", "data:text/html,x", "ftp://x.org/y",
      "/\\evil.example", "/\\/evil.example", "/a\\b", "https://example.org/a\\b", "#a\\b",
    ]) {
      expect(inline(`[click](${bad})`), bad).toEqual([{ type: "text", text: "click" }]);
    }
  });

  it("leaves markup characters as text, for the template to escape", () => {
    expect(inline("<script>alert(1)</script> & more")).toEqual([{ type: "text", text: "<script>alert(1)</script> & more" }]);
  });

  it("handles an empty line and unmatched backticks", () => {
    expect(inline("")).toEqual([]);
    expect(inline("a ` b")).toEqual([{ type: "text", text: "a ` b" }]);
  });
});

const SAMPLE = `# Changelog

Intro text that precedes every release.

## [Unreleased]

No version has been published yet.

### Added
- First item with \`code\`.
- Second item that
  continues on a second line.

### Upgrade notes
None.

## [0.1.0] - 2027-02-01

### Fixed
- Something.
`;

describe("parseChangelog", () => {
  const releases = parseChangelog(SAMPLE);

  it("reads releases in order, with their date", () => {
    expect(releases.map((r) => r.name)).toEqual(["Unreleased", "0.1.0"]);
    expect(releases[0]?.date).toBeUndefined();
    expect(releases[1]?.date).toBe("2027-02-01");
  });

  it("ignores text before the first release", () => {
    expect(JSON.stringify(releases)).not.toContain("Intro text");
  });

  it("keeps the introduction of a release and its sections", () => {
    expect(releases[0]?.intro).toEqual([[{ type: "text", text: "No version has been published yet." }]]);
    expect(releases[0]?.sections.map((s) => s.title)).toEqual(["Added", "Upgrade notes"]);
    expect(releases[1]?.sections.map((s) => s.title)).toEqual(["Fixed"]);
  });

  it("reads list items, with formatting and continuation lines", () => {
    const items = releases[0]?.sections[0]?.items ?? [];
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual([{ type: "text", text: "First item with " }, { type: "code", text: "code" }, { type: "text", text: "." }]);
    expect(items[1]).toEqual([{ type: "text", text: "Second item that" }, { type: "text", text: " continues on a second line." }]);
  });

  it("keeps a plain line inside a section as one entry", () => {
    expect(releases[0]?.sections[1]?.items).toEqual([[{ type: "text", text: "None." }]]);
  });

  it("reads a tag after the date, such as YANKED, without merging the release into the previous one", () => {
    const r = parseChangelog("## [0.2.0] - 2027-03-01 [YANKED]\n\n### Fixed\n- A.\n\n## [0.1.0] - 2027-02-01\n\n### Fixed\n- B.\n");
    expect(r.map((x) => x.name)).toEqual(["0.2.0", "0.1.0"]);
    expect(r[0]).toMatchObject({ date: "2027-03-01", tag: "YANKED" });
    expect(r[1]?.tag).toBeUndefined();
  });

  it("does not turn link reference definitions at the foot of the file into entries", () => {
    const r = parseChangelog("## [0.1.0] - 2027-02-01\n\n### Fixed\n- B.\n\n[0.1.0]: https://example.org/releases/0.1.0\n[Unreleased]: https://example.org/compare/0.1.0...HEAD\n");
    expect(r[0]?.sections[0]?.items).toHaveLength(1);
  });

  it("returns nothing for text without a release heading", () => {
    expect(parseChangelog("just text")).toEqual([]);
    expect(parseChangelog("")).toEqual([]);
  });
});

describe("the repository changelog", () => {
  const releases = parseChangelog(changelogText);

  it("starts with the unreleased section", () => {
    expect(releases[0]?.name).toBe("Unreleased");
  });

  it("lists what was added", () => {
    const added = releases[0]?.sections.find((s) => s.title === "Added");
    expect(added?.items.length).toBeGreaterThan(3);
  });
});
