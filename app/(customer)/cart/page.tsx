"use client";

import Link from "next/link";
import { useState } from "react";
import { menuItems, resolveSize, validateSelection } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import { useCart } from "../cart-provider";
import { ItemCustomization } from "../item-customization";
import { CartTotals } from "../cart-totals";
import { btnPrimary, btnQuiet, orderPanel, quantityButton } from "@/lib/ui";
import { sizeLabel } from "@/lib/menu-display";
import { CheckoutSteps } from "../checkout-steps";

export default function Page() {
  const cart = useCart();
  const [editing, setEditing] = useState<string | null>(null);
  function focusAfterUpdate(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  const button = `${btnQuiet} text-brand-blue`;
  const destructiveButton = `${btnQuiet} text-brand-red-dark`;
  return (
    <main className="px-4 py-8 text-base leading-relaxed text-ink sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <p className="font-bold text-brand-red">Fresh from our kitchen</p>
        <h1 className="mt-2 font-heading text-4xl font-black sm:text-5xl text-brand-blue">
          Your cart
        </h1>
        <Link
          id="continue-browsing"
          href="/menu"
          className={`${btnQuiet} mt-3 -ml-3 text-brand-blue`}
        >
          Continue browsing
        </Link>
        {!cart.ready ? (
          <p
            role="status"
            className="mt-6 rounded-xl border-2 border-line bg-paper p-6"
          >
            Restoring your cart…
          </p>
        ) : cart.lines.length === 0 ? (
          <section
            aria-labelledby="empty-cart-heading"
            className={`${orderPanel} mt-8 max-w-2xl p-6 sm:p-10`}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 80 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-5 h-20 w-24 text-brand-blue"
            >
              <path
                d="M14 28h52c-3 19-12 26-26 26S17 47 14 28Z"
                className="fill-tile-yellow"
              />
              <path d="m31 9 19 21m-8-25 14 25M23 59h34M20 20h40" />
            </svg>
            <h2
              id="empty-cart-heading"
              className="text-3xl font-bold text-brand-blue"
            >
              Something delicious starts here.
            </h2>
            <p className="mt-3 text-lg">
              Your cart is empty. Browse the menu to add your favorites.
            </p>
            <Link href="/menu" className={`${btnPrimary} mt-5`}>
              Explore the menu
            </Link>
          </section>
        ) : (
          <>
            <CheckoutSteps current="cart" />
            <div className="mt-8 grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
              <section aria-labelledby="cart-items-heading" className="min-w-0">
                <h2
                  id="cart-items-heading"
                  className="mb-4 text-2xl font-bold text-brand-blue"
                >
                  Your meal
                </h2>
                <ul className="divide-y-2 divide-line overflow-hidden rounded-card border-2 border-ink bg-paper">
                  {cart.lines.map((line, index) => {
                    const hit = resolveSize(cart.menu, line.sizeId);
                    const error = validateSelection(line, cart.menu);
                    const name = hit?.item.name ?? "Unavailable item";
                    return (
                      <li key={line.id} className="min-w-0 p-4 sm:p-6">
                        <article
                          id={`cart-entry-${line.id}`}
                          tabIndex={-1}
                          aria-labelledby={`cart-line-${line.id}`}
                          className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 break-words">
                            <h2
                              id={`cart-line-${line.id}`}
                              className="min-w-0 flex-1 basis-48 text-xl font-bold text-brand-blue sm:text-2xl"
                            >
                              {hit && (
                                <span className="mb-2 mr-2 inline-block rounded-md border border-ink bg-tile px-2 py-0.5 align-middle font-mono text-sm text-ink">
                                  {hit.item.code}
                                </span>
                              )}{" "}
                              {name}
                            </h2>
                            <p className="ml-auto shrink-0 text-right text-2xl font-bold text-brand-red tabular-nums">
                              {hit
                                ? formatCents(
                                    hit.size.priceCents * line.quantity,
                                  )
                                : "Price unavailable"}
                            </p>
                          </div>
                          {hit && (
                            <p className="mt-1 text-base text-muted">
                              {hit.size.name !== "regular" &&
                                `Size: ${sizeLabel(hit.size.name)} · `}
                              {formatCents(hit.size.priceCents)} each
                            </p>
                          )}
                          {line.components.length > 0 && (
                            <p className="mt-2 text-base">
                              Half orders:{" "}
                              {line.components
                                .map(
                                  (code) =>
                                    `${code} — ${menuItems(cart.menu).find((item) => item.code === code)?.name ?? "Unavailable"}`,
                                )
                                .join(" + ")}
                            </p>
                          )}
                          {line.spicy && (
                            <p className="mt-2 inline-block rounded-md border border-brand-red-dark px-2 text-sm font-bold text-brand-red-dark">
                              Make it spicy
                            </p>
                          )}
                          {line.instructions && (
                            <p className="mt-2 break-words rounded-lg bg-cream px-3 py-2 text-base">
                              Instructions: {line.instructions}
                            </p>
                          )}
                          {error && (
                            <p
                              role="alert"
                              className="mt-3 rounded-lg border-2 border-brand-red-dark p-3 text-base font-semibold text-brand-red-dark"
                            >
                              {error} Edit or remove this line before checkout.
                            </p>
                          )}
                          {editing === line.id && hit ? (
                            <ItemCustomization
                              key={line.id}
                              item={hit.item}
                              initial={line}
                              focusOnMount
                              onSave={(selection) => {
                                cart.edit(line.id, selection);
                                setEditing(null);
                                focusAfterUpdate(`cart-edit-${line.id}`);
                              }}
                              onCancel={() => {
                                setEditing(null);
                                focusAfterUpdate(`cart-edit-${line.id}`);
                              }}
                            />
                          ) : (
                            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                              <div
                                role="group"
                                aria-label={`Quantity for ${name}, line ${index + 1}`}
                                className="inline-flex shrink-0 items-center rounded-xl border-2 border-ink bg-cream p-0.5"
                              >
                                <button
                                  type="button"
                                  className={quantityButton}
                                  disabled={line.quantity <= 1 || !!error}
                                  aria-label={`Decrease quantity for ${name}, line ${index + 1}`}
                                  onClick={() =>
                                    cart.edit(line.id, {
                                      ...line,
                                      quantity: line.quantity - 1,
                                    })
                                  }
                                >
                                  −
                                </button>
                                <span className="min-w-10 px-1 text-center text-lg font-bold tabular-nums">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  className={quantityButton}
                                  disabled={
                                    line.quantity >= 50 ||
                                    !!error ||
                                    cart.ordersOpen === false
                                  }
                                  aria-label={`Increase quantity for ${name}, line ${index + 1}`}
                                  onClick={() =>
                                    cart.edit(line.id, {
                                      ...line,
                                      quantity: line.quantity + 1,
                                    })
                                  }
                                >
                                  +
                                </button>
                              </div>
                              <button
                                id={`cart-edit-${line.id}`}
                                type="button"
                                className={button}
                                disabled={!hit}
                                aria-label={`Edit ${name}, line ${index + 1}`}
                                onClick={() => setEditing(line.id)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={destructiveButton}
                                aria-label={`Remove ${name}, line ${index + 1}`}
                                onClick={() => {
                                  cart.remove(line.id);
                                  const neighbor =
                                    cart.lines[index + 1] ??
                                    cart.lines[index - 1];
                                  focusAfterUpdate(
                                    neighbor
                                      ? `cart-entry-${neighbor.id}`
                                      : "continue-browsing",
                                  );
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <aside
                aria-labelledby="cart-summary-heading"
                className={`${orderPanel} min-w-0 p-5 sm:p-6 lg:sticky lg:top-32`}
              >
                <p className="text-sm font-bold uppercase tracking-wide text-brand-red">
                  Pickup only
                </p>
                <h2
                  id="cart-summary-heading"
                  className="mb-6 mt-1 text-3xl font-bold text-brand-blue"
                >
                  Your order
                </h2>
                <CartTotals
                  subtotalCents={cart.subtotalCents}
                  taxRateBps={cart.settings?.taxRateBps ?? null}
                />
                <button
                  type="button"
                  className={`${destructiveButton} mt-3 w-full`}
                  onClick={() => {
                    cart.clear();
                    setEditing(null);
                    focusAfterUpdate("continue-browsing");
                  }}
                >
                  Clear cart
                </button>
                {cart.lines.some((line) =>
                  validateSelection(line, cart.menu),
                ) || cart.subtotalCents === null ? (
                  <button
                    type="button"
                    disabled
                    className={`${btnPrimary} mt-4 min-h-14 w-full text-lg`}
                  >
                    Checkout unavailable — review cart
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className={`${btnPrimary} mt-4 min-h-14 w-full text-lg`}
                  >
                    Continue to checkout <span aria-hidden="true">→</span>
                  </Link>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
