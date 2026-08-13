import test from "node:test";
import assert from "node:assert/strict";
test("envprobe", () => {
  console.log("DATABASE_URL=" + JSON.stringify(process.env.DATABASE_URL));
  console.log("NODE_ENV=" + JSON.stringify(process.env.NODE_ENV));
  assert.ok(true);
});
