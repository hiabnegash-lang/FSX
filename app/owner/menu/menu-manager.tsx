"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type {
  EditableCategory,
  EditableItem,
  PriceChange,
} from "@/lib/owner-menu";
import { formatCents } from "@/lib/money";
import { saveMenu } from "./actions";
const field =
  "block min-h-11 w-full rounded-md border border-muted bg-paper px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-paper px-4 py-2 font-semibold text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50";
const primary = button
  .replace("border-line", "border-brand-blue")
  .replace("bg-paper", "bg-brand-blue")
  .replace("text-brand-blue", "text-white");
const initial = { ok: false, message: "" };
const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  dateStyle: "medium",
  timeStyle: "short",
});
function ItemEditor({
  item,
  categories,
  history,
  onClose,
}: {
  item: EditableItem | null;
  categories: EditableCategory[];
  history: PriceChange[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(saveMenu, initial);
  const [sizes, setSizes] = useState(
    item?.sizes.map((s) => ({
      name: s.name,
      price: (s.priceCents / 100).toFixed(2),
    })) ?? [{ name: "regular", price: "" }],
  );
  const category = categories.find((c) =>
    c.items.some((i) => i.id === item?.id),
  );
  const changes = history.filter((h) =>
    item?.sizes.some((s) => s.id === h.item_size_id),
  );
  return (
    <section
      aria-labelledby="editor-title"
      className="rounded-lg border border-line bg-paper p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="editor-title" className="text-2xl font-bold">
          {item ? `Edit ${item.code}` : "New menu item"}
        </h2>
        <button className={button} onClick={onClose}>
          Close editor
        </button>
      </div>
      <p className="mb-5 mt-2 text-sm text-muted">
        Save to update your online menu. Past orders keep their original prices.
      </p>
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={item?.id ?? ""} />
        <input type="hidden" name="version" value={item?.version ?? ""} />
        <label className="grid gap-2 font-semibold">
          Item code
          <input
            className={field}
            name="code"
            required
            maxLength={4}
            pattern="[A-Z][0-9]{1,3}"
            placeholder="C22"
            defaultValue={item?.code}
            readOnly={!!item}
          />
          <span className="text-xs font-normal text-muted">
            Existing codes identify combo choices and spicy rules and cannot be
            changed.
          </span>
        </label>
        <label className="grid content-start gap-2 font-semibold">
          Category
          <select
            className={field}
            name="categoryId"
            defaultValue={category?.id}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 font-semibold sm:col-span-2">
          Name
          <input
            className={field}
            name="name"
            required
            maxLength={120}
            defaultValue={item?.name}
          />
        </label>
        <label className="grid gap-2 font-semibold sm:col-span-2">
          Description
          <textarea
            className={field}
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={item?.description}
          />
          <span className="text-xs font-normal text-muted">
            Include allergen information, such as “Contains peanuts.”
          </span>
        </label>
        <fieldset className="rounded-md border border-line p-4 sm:col-span-2">
          <legend className="px-1 font-bold">Size prices · USD</legend>
          <div className="grid gap-3">
            {sizes.map((size, index) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm">
                  Size
                  <select
                    name="size"
                    className={field}
                    value={size.name}
                    disabled={!!item?.sizes[index]}
                    onChange={(e) =>
                      setSizes(
                        sizes.map((s, i) =>
                          i === index ? { ...s, name: e.target.value } : s,
                        ),
                      )
                    }
                  >
                    {["regular", "sm", "lg", "S", "M", "L"].map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {!!item?.sizes[index] && (
                    <input type="hidden" name="size" value={size.name} />
                  )}
                </label>
                <label className="grid gap-1 text-sm">
                  Price ($)
                  <input
                    name="price"
                    className={`${field} tabular`}
                    inputMode="decimal"
                    required
                    pattern="[0-9]{1,7}(\.[0-9]{1,2})?"
                    value={size.price}
                    onChange={(e) =>
                      setSizes(
                        sizes.map((s, i) =>
                          i === index ? { ...s, price: e.target.value } : s,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3">
            {sizes.length < 6 && (
              <button
                type="button"
                className={button}
                onClick={() =>
                  setSizes([
                    ...sizes,
                    {
                      name: ["regular", "sm", "lg", "S", "M", "L"].find(
                        (name) => !sizes.some((s) => s.name === name),
                      )!,
                      price: "",
                    },
                  ])
                }
              >
                + Add size
              </button>
            )}
            {sizes.length > Math.max(1, item?.sizes.length ?? 0) && (
              <button
                type="button"
                className={button}
                onClick={() => setSizes(sizes.slice(0, -1))}
              >
                Remove new size
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Existing sizes are retained to protect order history.
          </p>
        </fieldset>
        <label className="grid gap-2 font-semibold">
          Display order
          <input
            name="sortOrder"
            className={field}
            type="number"
            min={0}
            max={10000}
            required
            defaultValue={item?.sortOrder ?? 0}
          />
          <span className="text-xs font-normal text-muted">
            Lower numbers appear first.
          </span>
        </label>
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-semibold">Availability</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input
              name="isAvailable"
              type="checkbox"
              defaultChecked={item?.isAvailable ?? true}
              className="size-5"
            />
            Available to order
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={item?.isActive ?? true}
              className="size-5"
            />
            On the menu (uncheck to archive)
          </label>
        </fieldset>
        <fieldset className="flex flex-wrap gap-x-6 sm:col-span-2">
          <legend className="mb-2 font-semibold">Item details</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input
              className="size-5"
              name="isSpicyFlag"
              type="checkbox"
              defaultChecked={item?.isSpicyFlag}
            />
            Show spicy symbol
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              className="size-5"
              name="isCatering"
              type="checkbox"
              defaultChecked={item?.isCatering}
            />
            Catering (40-minute lead time)
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4 sm:col-span-2">
          <button disabled={pending || (state.ok && !item)} className={primary}>
            {pending ? "Saving…" : "Save item"}
          </button>
          <p role={state.ok ? "status" : "alert"} className="text-sm">
            {state.message}
            {state.ok && !item
              ? " Close the editor to view or edit the new item."
              : ""}
          </p>
        </div>
      </form>
      {item && (
        <details className="mt-6 border-t border-line pt-4">
          <summary className="min-h-11 cursor-pointer font-semibold text-brand-blue">
            Price history · latest changes
          </summary>
          <p className="mb-3 text-xs text-muted">
            Central time. Up to the latest 200 changes across the menu.
          </p>
          {changes.length ? (
            <ul className="divide-y divide-line">
              {changes.map((h) => (
                <li key={h.id} className="py-3 text-sm">
                  <strong>
                    {item.sizes.find((s) => s.id === h.item_size_id)?.name}
                  </strong>{" "}
                  · {formatCents(h.old_price_cents)} →{" "}
                  {formatCents(h.new_price_cents)}
                  <time
                    className="mt-1 block text-muted"
                    dateTime={h.changed_at}
                  >
                    {clock.format(new Date(h.changed_at))}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              No recent price changes recorded for this item.
            </p>
          )}
        </details>
      )}
    </section>
  );
}
function CategoryEditor({ category }: { category?: EditableCategory }) {
  const [state, action, pending] = useActionState(saveMenu, initial);
  return (
    <form
      action={action}
      className="grid items-end gap-3 border-t border-line py-4 sm:grid-cols-[2fr_1fr_auto_auto]"
    >
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <label className="grid gap-1 text-sm font-semibold">
        {category ? "Category name" : "New category"}
        <input
          className={field}
          name="name"
          required
          maxLength={80}
          defaultValue={category?.name}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Display order
        <input
          className={field}
          type="number"
          name="sortOrder"
          required
          min={0}
          max={10000}
          defaultValue={category?.sortOrder ?? 0}
        />
      </label>
      <button
        className={button}
        name="kind"
        value="category"
        disabled={pending}
      >
        {category ? "Save category" : "Add category"}
      </button>
      {category && (
        <button
          className={button}
          name="kind"
          value="remove-category"
          disabled={pending || category.items.length > 0}
          title="Only empty categories can be removed"
        >
          Remove empty category
        </button>
      )}
      <p className="text-sm sm:col-span-4" role={state.ok ? "status" : "alert"}>
        {state.message}
      </p>
    </form>
  );
}
export default function MenuManager({
  categories,
  history,
}: {
  categories: EditableCategory[];
  history: PriceChange[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [categoryId, setCategoryId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const items = categories.flatMap((c) => c.items);
  const selectedItem = items.find((i) => i.id === selected) ?? null;
  const visible = categories
    .filter((c) => !categoryId || c.id === categoryId)
    .map((c) => ({
      ...c,
      items: c.items.filter(
        (i) =>
          `${i.code} ${i.name}`.toLowerCase().includes(query.toLowerCase()) &&
          (filter === "all" ||
            (filter === "archived"
              ? !i.isActive
              : filter === "soldout"
                ? i.isActive && !i.isAvailable
                : i.isActive)),
      ),
    }))
    .filter((c) => c.items.length);
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <nav
        aria-label="Owner navigation"
        className="mb-6 flex flex-wrap gap-3 text-sm"
      >
        <Link href="/owner" className={button}>
          Dashboard
        </Link>
        <Link href="/owner/orders" className={button}>
          Orders
        </Link>
        <Link
          href="/owner/menu"
          aria-current="page"
          className={`${button} border-brand-blue`}
        >
          Menu & prices
        </Link>
        <Link href="/owner/reports" className={button}>
          Reports
        </Link>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-brand-blue">
            Menciu&apos;s Chopstix · Owner
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Menu & prices</h1>
          <p className="mt-2 text-muted">
            Keep your online menu ready for the next order.
          </p>
        </div>
        <button
          className={primary}
          disabled={!categories.length}
          onClick={() => {
            setSelected(null);
            setCreating(true);
          }}
        >
          + Add item
        </button>
      </header>
      <dl className="my-6 grid grid-cols-3 divide-x divide-line border-y border-line bg-paper py-4">
        {[
          ["On the menu", items.filter((i) => i.isActive).length],
          [
            "Sold out",
            items.filter((i) => i.isActive && !i.isAvailable).length,
          ],
          ["Archived", items.filter((i) => !i.isActive).length],
        ].map(([label, count]) => (
          <div className="px-4" key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular">{count}</dd>
          </div>
        ))}
      </dl>
      {creating || selectedItem ? (
        <ItemEditor
          key={selectedItem?.id ?? "new"}
          item={selectedItem}
          categories={categories}
          history={history}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
        />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <label className="grid gap-1 text-sm font-semibold">
              Find an item
              <input
                className={field}
                type="search"
                placeholder="Search name or code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Category
              <select
                className={field}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Status
              <select
                className={field}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="active">On the menu</option>
                <option value="soldout">Sold out</option>
                <option value="archived">Archived</option>
                <option value="all">All items</option>
              </select>
            </label>
          </div>
          <p className="mb-4 text-sm text-muted">
            Sold-out items stay visible to customers. Archived items are hidden.
            Neither action removes past orders.
          </p>
          {!visible.length && (
            <section className="rounded-lg border border-line bg-paper p-8">
              <h2 className="text-xl font-bold">No matching items</h2>
              <p className="mt-2 text-muted">
                Try another search or status, or add your first category below.
              </p>
            </section>
          )}
          {visible.map((c) => (
            <section
              className="mb-6 overflow-hidden rounded-lg border border-line bg-paper"
              key={c.id}
            >
              <h2 className="border-b border-line bg-tile px-4 py-3 text-lg font-bold">
                {c.name}{" "}
                <span className="ml-2 text-sm font-normal text-muted">
                  {c.items.length} items
                </span>
              </h2>
              <ul className="divide-y divide-line">
                {c.items.map((i) => (
                  <li
                    key={i.id}
                    className="grid items-center gap-3 p-4 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"
                  >
                    <div>
                      <p className="text-xs font-bold text-brand-blue">
                        {i.code}
                      </p>
                      <h3 className="mt-1 font-sans text-base font-semibold">
                        {i.name}
                      </h3>
                    </div>
                    <div className="text-sm tabular">
                      {i.sizes.map((s) => (
                        <p key={s.id}>
                          {s.name !== "regular" && (
                            <span className="mr-2 text-muted">{s.name}</span>
                          )}
                          {formatCents(s.priceCents)}
                        </p>
                      ))}
                    </div>
                    <span
                      className={`w-fit rounded px-2 py-1 text-sm font-semibold ${!i.isActive ? "bg-tile" : i.isAvailable ? "bg-open text-open-ink" : "bg-tile-yellow text-tile-yellow-ink"}`}
                    >
                      {!i.isActive
                        ? "Archived"
                        : i.isAvailable
                          ? "Available"
                          : "Sold out"}
                    </span>
                    <button
                      className={button}
                      aria-label={`Edit ${i.code} ${i.name}`}
                      onClick={() => {
                        setCreating(false);
                        setSelected(i.id);
                      }}
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      <details className="mt-8 rounded-lg border border-line bg-paper p-5">
        <summary className="min-h-11 cursor-pointer text-lg font-bold">
          Manage categories
        </summary>
        <p className="mb-4 text-sm text-muted">
          Lower display orders appear first. Move all items, including archived
          items, before removing a category.
        </p>
        {categories.map((c) => (
          <CategoryEditor key={c.id} category={c} />
        ))}
        <CategoryEditor />
      </details>
    </main>
  );
}
