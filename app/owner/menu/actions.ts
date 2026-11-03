"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { saveOwnerCategory, saveOwnerItem } from "@/lib/owner-menu";
import { ApiError } from "@/lib/errors";
export type SaveState = { ok: boolean; message: string };
export async function saveMenu(
  _previous: SaveState,
  form: FormData,
): Promise<SaveState> {
  try {
    const request = { headers: await headers() };
    const text = (key: string) => String(form.get(key) ?? "");
    const kind = text("kind");
    if (kind === "category" || kind === "remove-category")
      await saveOwnerCategory(
        request,
        {
          id: text("id") || undefined,
          name: text("name"),
          sortOrder: text("sortOrder"),
        },
        kind === "remove-category",
      );
    else
      await saveOwnerItem(request, {
        id: text("id") || undefined,
        version: text("version") || undefined,
        categoryId: text("categoryId"),
        code: text("code"),
        name: text("name"),
        description: text("description"),
        sortOrder: text("sortOrder"),
        isAvailable: form.has("isAvailable"),
        isActive: form.has("isActive"),
        isSpicyFlag: form.has("isSpicyFlag"),
        isCatering: form.has("isCatering"),
        sizes: form
          .getAll("size")
          .map((name, index) => ({
            name: String(name),
            price: String(form.getAll("price")[index] ?? ""),
          })),
      });
    revalidatePath("/owner/menu");
    revalidatePath("/menu");
    revalidatePath("/api/menu");
    return { ok: true, message: "Saved. Your customer menu is up to date." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : "Could not save. Please try again.",
    };
  }
}
