import { requireRole, type AuthRequest } from "./auth";
import { createClient } from "./supabase/server";
import { usingStub } from "./data/mode";
import { menuFixture } from "./data/menu";
import { ApiError } from "./errors";
import {
  menuItemSchema,
  categorySchema,
  type MenuEdit,
} from "./owner-menu-validation";
import type { MenuCategory, MenuItem } from "./types";
import type { Json } from "./database.types";

export type EditableItem = MenuItem & { sortOrder: number; version: string };
export type EditableCategory = Omit<MenuCategory, "items"> & {
  items: EditableItem[];
};
export type PriceChange = {
  id: string;
  item_size_id: string;
  old_price_cents: number;
  new_price_cents: number;
  changed_at: string;
};
function check(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "40001")
    throw new ApiError(
      409,
      "conflict",
      "This item changed. Reload before editing again.",
    );
  if (error.code === "23505")
    throw new ApiError(
      409,
      "duplicate",
      "That code or category name already exists.",
    );
  if (error.code === "23503")
    throw new ApiError(
      409,
      "in_use",
      "Move every item out of this category before removing it.",
    );
  if (["23514", "22023", "22P02"].includes(error.code ?? ""))
    throw new ApiError(
      400,
      "invalid",
      "Check the item details and prices. Existing sizes must be retained.",
    );
  throw new ApiError(
    503,
    "menu_unavailable",
    "The menu could not be saved or loaded. Please try again.",
  );
}
const stubGlobal = globalThis as unknown as {
  __fsxOwnerMenuState?: {
    versions: Map<string, string>;
    history: PriceChange[];
  };
};
const { versions, history: stubHistory } = (stubGlobal.__fsxOwnerMenuState ??= {
  versions: new Map<string, string>(),
  history: [],
});
export async function readOwnerMenu(
  request: AuthRequest,
): Promise<{ categories: EditableCategory[]; history: PriceChange[] }> {
  await requireRole(request, ["owner"]);
  if (usingStub())
    return {
      categories: menuFixture.map((c) => ({
        ...c,
        items: c.items.map((i, index) => ({
          ...i,
          sortOrder: index,
          version: versions.get(i.id) ?? "stub",
        })),
      })),
      history: stubHistory,
    };
  const db = await createClient();
  const [categories, items, sizes, history] = await Promise.all([
    db.from("menu_categories").select("*").order("sort_order").order("id"),
    db.from("menu_items").select("*").order("sort_order").order("id"),
    db.from("item_sizes").select("*").order("sort_order").order("id"),
    db
      .from("price_change_log")
      .select("id,item_size_id,old_price_cents,new_price_cents,changed_at")
      .order("changed_at", { ascending: false })
      .limit(200),
  ]);
  for (const result of [categories, items, sizes, history]) check(result.error);
  return {
    categories: (categories.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sort_order,
      items: (items.data ?? [])
        .filter((i) => i.category_id === c.id)
        .map((i) => ({
          id: i.id,
          code: i.code,
          name: i.name,
          description: i.description ?? "",
          isActive: i.is_active,
          isAvailable: i.is_available,
          isSpicyFlag: i.is_spicy_flag,
          isCatering: i.is_catering,
          sortOrder: i.sort_order,
          version: i.updated_at,
          sizes: (sizes.data ?? [])
            .filter((s) => s.menu_item_id === i.id)
            .map((s) => ({
              id: s.id,
              name: s.size_code,
              priceCents: s.price_cents,
            })),
        })),
    })),
    history: history.data ?? [],
  };
}
export async function saveOwnerItem(request: AuthRequest, raw: unknown) {
  await requireRole(request, ["owner"]);
  const parsed = menuItemSchema.safeParse(raw);
  if (!parsed.success)
    throw new ApiError(
      400,
      "invalid",
      parsed.error.issues[0]?.message ?? "Check item details.",
    );
  const item = parsed.data;
  if (usingStub()) return saveStub(item);
  const db = await createClient();
  const { error } = await db.rpc("owner_save_menu_item", {
    p_item: item as unknown as Json,
  });
  check(error);
}
function saveStub(edit: MenuEdit) {
  const category = menuFixture.find((c) => c.id === edit.categoryId);
  if (!category) throw new ApiError(400, "invalid", "Choose a category.");
  const oldCategory = menuFixture.find((c) =>
    c.items.some((i) => i.id === edit.id),
  );
  const old = oldCategory?.items.find((i) => i.id === edit.id);
  if (edit.id && (!old || edit.version !== (versions.get(edit.id) ?? "stub")))
    throw new ApiError(
      409,
      "conflict",
      "This item changed. Reload before editing again.",
    );
  if (old && old.code !== edit.code)
    throw new ApiError(
      400,
      "invalid",
      "Existing item codes cannot be changed.",
    );
  if (
    menuFixture.some((c) =>
      c.items.some((i) => i.code === edit.code && i.id !== edit.id),
    )
  )
    throw new ApiError(409, "duplicate", "That item code already exists.");
  if (old?.sizes.some((s) => !edit.sizes.some((n) => n.name === s.name)))
    throw new ApiError(400, "invalid", "Existing sizes must be retained.");
  const id = old?.id ?? crypto.randomUUID();
  const sizes = edit.sizes.map((s) => {
    const before = old?.sizes.find((v) => v.name === s.name);
    const sizeId = before?.id ?? crypto.randomUUID();
    if (before && before.priceCents !== s.price)
      stubHistory.unshift({
        id: crypto.randomUUID(),
        item_size_id: sizeId,
        old_price_cents: before.priceCents,
        new_price_cents: s.price,
        changed_at: new Date().toISOString(),
      });
    return { id: sizeId, name: s.name, priceCents: s.price };
  });
  if (oldCategory)
    oldCategory.items = oldCategory.items.filter((i) => i.id !== id);
  category.items.splice(Math.min(edit.sortOrder, category.items.length), 0, {
    ...edit,
    id,
    sizes,
  });
  versions.set(id, crypto.randomUUID());
}
export async function saveOwnerCategory(
  request: AuthRequest,
  raw: unknown,
  remove = false,
) {
  await requireRole(request, ["owner"]);
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success)
    throw new ApiError(
      400,
      "invalid",
      "Enter a category name and a nonnegative display order.",
    );
  const category = parsed.data;
  if (usingStub()) {
    const old = menuFixture.find((c) => c.id === category.id);
    if (remove) {
      if (!old || old.items.length)
        throw new ApiError(
          409,
          "in_use",
          "Move every item out of this category before removing it.",
        );
      menuFixture.splice(menuFixture.indexOf(old), 1);
    } else if (old) Object.assign(old, category);
    else menuFixture.push({ ...category, id: crypto.randomUUID(), items: [] });
    menuFixture.sort((a, b) => a.sortOrder - b.sortOrder);
    return;
  }
  const db = await createClient();
  if (remove && !category.id)
    throw new ApiError(400, "invalid", "Choose a category.");
  const result = remove
    ? await db
        .from("menu_categories")
        .delete()
        .eq("id", category.id!)
        .select("id")
        .single()
    : category.id
      ? await db
          .from("menu_categories")
          .update({ name: category.name, sort_order: category.sortOrder })
          .eq("id", category.id)
          .select("id")
          .single()
      : await db
          .from("menu_categories")
          .insert({ name: category.name, sort_order: category.sortOrder });
  check(result.error);
}
