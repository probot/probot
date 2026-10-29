import { describe, expect, it } from "vitest";

import { getLog } from "../../src/helpers/get-log.js";

describe("getLog", () => {
  it("uses the documented logger defaults", async () => {
    const log = await getLog();

    expect(log.level).toBe("info");
    expect(log.bindings().name).toBe("probot");
  });
});
