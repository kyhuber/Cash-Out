import { describe, expect, it } from "vitest";
import {
  EMPTY_PARSED_SHIFT,
  JSON_FIELD_KEYS,
  localToday,
  pickTrackedFields,
  shiftHours,
  shiftSchema,
} from "./shift";
import { sanitizeParsed, type ParserWorkplace } from "./parse-shift";

const valid = {
  workplace_id: "3f1a8c2e-5b7d-4e19-9c3a-2d6f8b0e4a71",
  station: "Bar 309",
  shift_date: "2026-08-30",
  clock_in: "16:00",
  clock_out: "02:00",
  tips_cash: 40,
  tips_card: 180,
  tip_out: 35,
  optional_field_values: {},
  raw_input_text: "Lumen, four til close, 180 on cards and like 40 cash",
};

describe("shiftSchema", () => {
  it("accepts a well-formed overnight shift", () => {
    expect(shiftSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects equal clock times, matching shift_has_duration", () => {
    const r = shiftSchema.safeParse({
      ...valid,
      clock_in: "16:00",
      clock_out: "16:00",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "clock_out")).toBe(true);
  });

  it("requires a workplace", () => {
    expect(
      shiftSchema.safeParse({ ...valid, workplace_id: "" }).success,
    ).toBe(false);
  });

  it("rejects a date that isn't real", () => {
    expect(
      shiftSchema.safeParse({ ...valid, shift_date: "2026-02-30" }).success,
    ).toBe(false);
  });

  it("rejects negative tips", () => {
    expect(shiftSchema.safeParse({ ...valid, tips_cash: -5 }).success).toBe(
      false,
    );
  });

  it("rejects a 12-hour time", () => {
    expect(shiftSchema.safeParse({ ...valid, clock_in: "4pm" }).success).toBe(
      false,
    );
  });
});

describe("shiftSchema station handling", () => {
  it("normalises a blank station to null", () => {
    for (const blank of ["", "   ", null]) {
      const r = shiftSchema.safeParse({ ...valid, station: blank });
      expect(r.success, JSON.stringify(blank)).toBe(true);
      expect(r.data?.station).toBeNull();
    }
  });

  it("trims a station it keeps", () => {
    const r = shiftSchema.safeParse({ ...valid, station: "  Bar 309  " });
    expect(r.data?.station).toBe("Bar 309");
  });
});

describe("pickTrackedFields", () => {
  it("keeps only what the workplace tracks", () => {
    expect(
      pickTrackedFields(
        { total_sales: 1200, shift_type: "concert", guest_count: 90 },
        ["total_sales"],
      ),
    ).toEqual({ total_sales: 1200 });
  });

  it("drops blanks and nulls so a key means the user reported it", () => {
    expect(
      pickTrackedFields({ shift_type: "  ", notes: null, guest_count: 0 }, [
        "shift_type",
        "notes",
        "guest_count",
      ]),
    ).toEqual({ guest_count: 0 });
  });

  it("never puts a column-backed field in the JSON", () => {
    // tip_out has its own column; duplicating it here would let the two drift.
    expect(JSON_FIELD_KEYS).not.toContain("tip_out");
    expect(JSON_FIELD_KEYS).not.toContain("station");
    expect(
      pickTrackedFields({ tip_out: 35, station: "Bar 309" }, [
        "tip_out",
        "station",
      ]),
    ).toEqual({});
  });

  it("trims what it keeps", () => {
    expect(pickTrackedFields({ notes: "  busy  " }, ["notes"])).toEqual({
      notes: "busy",
    });
  });
});

describe("shiftHours", () => {
  it("counts an overnight shift once", () => {
    expect(shiftHours("16:00", "02:00")).toBe(10);
  });

  it("returns null rather than guessing at a malformed time", () => {
    expect(shiftHours("", "02:00")).toBeNull();
    expect(shiftHours("4pm", "02:00")).toBeNull();
  });
});

describe("localToday", () => {
  it("reads the local calendar date, not the UTC one", () => {
    // 20:00 on Aug 30 at UTC-7 is already Aug 31 in UTC. Using the UTC date
    // would file an evening shift into the wrong day, and possibly the wrong
    // pay period.
    const evening = new Date(2026, 7, 30, 20, 0, 0);
    expect(localToday(evening)).toBe("2026-08-30");
  });

  it("pads single-digit months and days", () => {
    expect(localToday(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

const lumen: ParserWorkplace = {
  id: "3f1a8c2e-5b7d-4e19-9c3a-2d6f8b0e4a71",
  name: "Lumen Field",
  optional_fields: ["total_sales", "tip_out", "station"],
  stations: ["Bar 309", "Moët Lounge"],
};

describe("sanitizeParsed", () => {
  const clean = (over: Partial<typeof EMPTY_PARSED_SHIFT>) =>
    sanitizeParsed({ ...EMPTY_PARSED_SHIFT, ...over }, [lumen]);

  it("drops a workplace id that isn't the user's", () => {
    expect(clean({ workplace_id: "someone-elses-id" }).workplace_id).toBeNull();
    expect(clean({ workplace_id: lumen.id }).workplace_id).toBe(lumen.id);
  });

  it("drops values for fields the workplace doesn't track", () => {
    const r = clean({
      workplace_id: lumen.id,
      guest_count: 90,
      notes: "busy",
      total_sales: 1200,
    });
    expect(r.guest_count).toBeNull();
    expect(r.notes).toBeNull();
    expect(r.total_sales).toBe(1200);
  });

  it("drops malformed times and dates rather than passing them through", () => {
    const r = clean({
      clock_in: "4pm",
      clock_out: "26:00",
      shift_date: "2026-02-30",
    });
    expect(r.clock_in).toBeNull();
    expect(r.clock_out).toBeNull();
    expect(r.shift_date).toBeNull();
  });

  it("rejects negative money", () => {
    expect(clean({ tips_card: -20 }).tips_card).toBeNull();
  });

  it("snaps a station onto the spelling already recorded there", () => {
    // The reason the field exists is comparing bars. "bar 309" landing beside
    // "Bar 309" would split one bar's tips across two rows and defeat that.
    const cases = ["bar 309", "BAR 309", "  Bar 309  "];
    for (const said of cases) {
      expect(clean({ workplace_id: lumen.id, station: said }).station).toBe(
        "Bar 309",
      );
    }
  });

  it("keeps a station it has not seen before", () => {
    expect(
      clean({ workplace_id: lumen.id, station: "North Bar" }).station,
    ).toBe("North Bar");
  });

  it("drops a station for a workplace that doesn't track one", () => {
    const noStation: ParserWorkplace = { ...lumen, optional_fields: ["notes"] };
    expect(
      sanitizeParsed(
        { ...EMPTY_PARSED_SHIFT, workplace_id: noStation.id, station: "Bar 309" },
        [noStation],
      ).station,
    ).toBeNull();
  });

  it("keeps an unsplit total only when there is no split", () => {
    expect(clean({ tips_total_unsplit: 220 }).tips_total_unsplit).toBe(220);
    expect(
      clean({ tips_total_unsplit: 220, tips_card: 180 }).tips_total_unsplit,
    ).toBeNull();
  });
});
