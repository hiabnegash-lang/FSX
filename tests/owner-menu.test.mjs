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
function setup(role = "owner", existingFixture, sharedGlobal = {}) {
  const calls = [];
  const fixture = existingFixture ?? [
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
    { crypto, Map, Date, globalThis: sharedGlobal },
  );
  return { service, calls, fixture, sharedGlobal };
}

test("menu fixture survives separate page/action module loads", () => {
  const sharedGlobal = {};
  const path = new URL("../lib/data/menu.ts", import.meta.url);
  const actionMenu = loadModule(
    path,
    {},
    { globalThis: sharedGlobal },
  ).menuFixture;
  actionMenu[0].items[0].name = "Edited across runtimes";
  actionMenu.push({
    id: "demo-category",
    name: "New category",
    sortOrder: 99,
    items: [],
  });
  const pageMenu = loadModule(
    path,
    {},
    { globalThis: sharedGlobal },
  ).menuFixture;
  assert.equal(pageMenu[0].items[0].name, "Edited across runtimes");
  assert.equal(pageMenu.at(-1).id, "demo-category");
});

test("hot-reloaded stub store keeps orders while refreshing its menu reference", async () => {
  const sharedGlobal = {};
  const path = new URL("../lib/data/stub.ts", import.meta.url);
  const first = loadModule(
    path,
    { "./menu": { menuFixture: [{ id: "old" }] } },
    { globalThis: sharedGlobal, crypto },
  ).stubStore;
  const order = await first.insertOrder({});
  const currentMenu = [{ id: "current" }];
  const second = loadModule(
    path,
    { "./menu": { menuFixture: currentMenu } },
    { globalThis: sharedGlobal, crypto },
  ).stubStore;
  assert.equal((await second.getOrder(order.id)).id, order.id);
  assert.equal((await second.getMenu())[0].id, "current");
});

test("separate owner service loads share item versions and price history", async () => {
  const first = setup();
  await first.service.saveOwnerItem({}, edit);
  const created = (await first.service.readOwnerMenu({})).categories[0]
    .items[0];
  const second = setup("owner", first.fixture, first.sharedGlobal);
  assert.equal(
    (await second.service.readOwnerMenu({})).categories[0].items[0].version,
    created.version,
  );
  await second.service.saveOwnerItem(
    {},
    {
      ...edit,
      id: created.id,
      version: created.version,
      sizes: [{ name: "regular", price: "2.25" }],
    },
  );
  const reread = await first.service.readOwnerMenu({});
  assert.equal(reread.categories[0].items[0].sizes[0].priceCents, 225);
  assert.equal(reread.history[0].new_price_cents, 225);
});
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

test("item codes G7 and G8 are refused with a clear message; other codes still pass", () => {
  for (const code of ["G7", "G8"]) {
    const result = validation.menuItemSchema.safeParse({ ...edit, code });
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /G7 and G8/);
  }
  for (const code of ["G6", "G9", "G11", "G70", "A7"])
    assert.equal(
      validation.menuItemSchema.safeParse({ ...edit, code }).success,
      true,
      code,
    );
  const malformed = validation.menuItemSchema.safeParse({
    ...edit,
    code: "g7",
  });
  assert.equal(malformed.success, false);
  assert.match(malformed.error.issues[0].message, /one capital letter/);
});

function liveSetup(dbError) {
  const db = {
    rpc: async () => ({ error: dbError }),
    from: () => {
      const chain = {
        delete: () => chain,
        update: () => chain,
        insert: async () => ({ error: dbError }),
        eq: () => chain,
        select: () => chain,
        single: async () => ({ error: dbError }),
      };
      return chain;
    },
  };
  return loadModule(
    new URL("../lib/owner-menu.ts", import.meta.url),
    {
      "./auth": { requireRole: async () => {} },
      "./supabase/server": { createClient: async () => db },
      "./data/mode": { usingStub: () => false },
      "./data/menu": { menuFixture: [] },
      "./errors": errors,
      "./owner-menu-validation": validation,
    },
    { crypto, Map, Date, globalThis: {} },
  );
}

test("live item save into a missing category says so, not 'move every item out'", async () => {
  const service = liveSetup({ code: "23503" });
  await assert.rejects(service.saveOwnerItem({}, edit), (error) => {
    assert.equal(error.status, 400);
    assert.equal(error.code, "invalid");
    assert.match(error.message, /category no longer exists/);
    assert.doesNotMatch(error.message, /Move every item/);
    return true;
  });
});

test("live category removal with items still reports the category as in use", async () => {
  const service = liveSetup({ code: "23503" });
  await assert.rejects(
    service.saveOwnerCategory(
      {},
      { id: "category", name: "Appetizers", sortOrder: 0 },
      true,
    ),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, "in_use");
      assert.match(error.message, /Move every item out/);
      return true;
    },
  );
});

test("stub item save into a missing category uses the same message as live", async () => {
  const { service } = setup();
  await assert.rejects(
    service.saveOwnerItem({}, { ...edit, categoryId: "gone" }),
    /category no longer exists/,
  );
});
