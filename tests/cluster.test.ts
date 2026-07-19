import { describe, expect, it } from "vitest";
import { clusterDuplicates, findDuplicatePairs } from "../src/cluster.js";

describe("findDuplicatePairs", () => {
  it("only returns pairs within the threshold, closest first", () => {
    const hashes = new Map([
      ["a", 0b0000n],
      ["b", 0b0001n], // distance 1 from a
      ["c", 0b1111n], // distance 4 from a
    ]);
    const pairs = findDuplicatePairs(hashes, 2);
    expect(pairs).toEqual([{ a: "a", b: "b", distance: 1 }]);
  });
});

describe("clusterDuplicates", () => {
  it("groups transitively: A~B and B~C become one cluster even if A/C alone exceed the threshold", () => {
    const pairs = [
      { a: "A", b: "B", distance: 1 },
      { a: "B", b: "C", distance: 1 },
    ];
    const clusters = clusterDuplicates(pairs);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].sort()).toEqual(["A", "B", "C"]);
  });

  it("keeps unrelated pairs in separate clusters", () => {
    const pairs = [
      { a: "A", b: "B", distance: 1 },
      { a: "X", b: "Y", distance: 2 },
    ];
    const clusters = clusterDuplicates(pairs).map((c) => c.sort());
    expect(clusters).toHaveLength(2);
    expect(clusters).toContainEqual(["A", "B"]);
    expect(clusters).toContainEqual(["X", "Y"]);
  });

  it("omits files with no match", () => {
    expect(clusterDuplicates([])).toEqual([]);
  });
});
