import { describe, expect, it } from "vitest";
import { extractJsonFromText } from "@/lib/utils/json";

describe("extractJsonFromText", () => {
  it("parses a plain JSON object", () => {
    expect(extractJsonFromText('{"ok":true}')).toEqual({ ok: true });
  });

  it("parses a fenced ChatGPT JSON response", () => {
    expect(extractJsonFromText('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });
});
