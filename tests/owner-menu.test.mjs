import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";
const require = createRequire(import.meta.url);
const validation = loadModule(
  new URL("../lib/owner-menu-validation.ts", import.meta.url),
  { zod: require("zod") },
);
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), {
  "next/server": require("next/server"),
});
const edit = {
  categoryId: "category",
  code: "A2",
  name: "Egg roll",
  description: "",
  sortOrder: 0,
  isAvailable: true,
  isActive: true,
  isSpicyFlag: false,
  isCatering: false,
  sizes: [{ name: "regular", price: "1.51" }],
};
test("prices accept exact positive decimal dollars and reject malformed or free prices", () => {
  for (const [value, expected] of [
    ["1.51", 151],
    ["0.01", 1],
    ["12.9", 1290],
    ["12", 1200],
  ])
    assert.equal(validation.dollarsToCents.parse(value), expected);
  for (const value of [
    "0",
    "-1",
    "1.001",
    "1e3",
    "NaN",
    "",
    "1,000",
    "99999999",
  ])
    assert.equal(validation.dollarsToCents.safeParse(value).success, false);
  assert.equal(
    validation.menuItemSchema.safeParse({
      ...edit,
      sizes: [edit.sizes[0], edit.sizes[0]],
    }).success,
    false,
  );
});
function setup(role = "owner") {
  const calls = [];
  const fixture = [
    { id: "category", name: "Appetizers", sortOrder: 0, items: [] },
  ];
  const service = loadModule(
    new URL("../lib/owner-menu.ts", import.meta.url),
    {
      "./auth": {
        requireRole: async () => {
          if (role !== "owner")
            throw new errors.ApiError(403, "forbidden", "Owner required");
        },
      },
      "./supabase/server": {
        createClient: async () => {
          calls.push("db");
          throw Error("Unexpected live DB");
        },
      },
      "./data/mode": { usingStub: () => true },
      "./data/menu": { menuFixture: fixture },
      "./errors": errors,
      "./owner-menu-validation": validation,
    },
    { crypto, Map, Date },
  );
  return { service, calls, fixture };
}
test("all menu operations reject staff before reading or mutating", async () => {
  const { service, calls, fixture } = setup("staff");
  await assert.rejects(service.readOwnerMenu({}), { status: 403 });
  await assert.rejects(service.saveOwnerItem({}, edit), { status: 403 });
  await assert.rejects(
    service.saveOwnerCategory({}, { name: "New", sortOrder: 0 }),
    { status: 403 },
  );
  assert.equal(calls.length, 0);
  assert.equal(fixture[0].items.length, 0);
});
test("owner can create, change price, mark sold out, archive and restore; stale edits fail", async () => {
  const { service } = setup();
  await service.saveOwnerItem({}, edit);
  let data = await service.readOwnerMenu({});
  const created = data.categories[0].items[0];
  const update = {
    ...edit,
    id: created.id,
    version: created.version,
    isAvailable: false,
    isActive: false,
    sizes: [{ name: "regular", price: "1.99" }],
  };
  await service.saveOwnerItem({}, update);
  data = await service.readOwnerMenu({});
  assert.equal(data.categories[0].items[0].sizes[0].priceCents, 199);
  assert.equal(data.categories[0].items[0].isActive, false);
  assert.equal(data.categories[0].items[0].isAvailable, false);
  assert.equal(data.history[0].old_price_cents, 151);
  assert.equal(data.history[0].new_price_cents, 199);
  await assert.rejects(service.saveOwnerItem({}, update), { status: 409 });
  await service.saveOwnerItem(
    {},
    {
      ...update,
      version: data.categories[0].items[0].version,
      isActive: true,
      isAvailable: true,
    },
  );
  await assert.rejects(
    service.saveOwnerCategory(
      {},
      { id: "category", name: "Appetizers", sortOrder: 0 },
      true,
    ),
    { status: 409 },
  );
});
