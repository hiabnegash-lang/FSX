import { z } from "zod";

// Parse decimal text, never binary floating-point dollars. PostgreSQL integer bounds apply.
export const dollarsToCents = z
  .string()
  .trim()
  .regex(
    /^\d{1,7}(\.\d{1,2})?$/,
    "Enter dollars with at most two decimal places.",
  )
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  })
  .pipe(z.number().int().positive().max(2147483647));
const identifier = z.string().min(1).max(100);
const RESERVED_CODES = new Set(["G7", "G8"]);
export const menuItemSchema = z
  .object({
    id: identifier.optional(),
    version: z.string().max(100).optional(),
    categoryId: identifier,
    code: z
      .string()
      .trim()
      .regex(
        /^[A-Z]\d{1,3}$/,
        "Enter a code like A1 or G11: one capital letter, then 1 to 3 digits.",
      )
      // The printed menu has no G7 or G8 (see CLAUDE.md). Checkout already refuses them as
      // Combination Plate halves, so a new item with either code could never be ordered as one.
      .refine(
        (code) => !RESERVED_CODES.has(code),
        "G7 and G8 are not used on the printed menu. Choose another code.",
      ),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000),
    sortOrder: z.coerce.number().int().min(0).max(10000),
    isAvailable: z.boolean(),
    isActive: z.boolean(),
    isSpicyFlag: z.boolean(),
    isCatering: z.boolean(),
    sizes: z
      .array(
        z.object({
          name: z.enum(["regular", "sm", "lg", "S", "M", "L"]),
          price: dollarsToCents,
        }),
      )
      .min(1)
      .max(6),
  })
  .refine(
    (value) =>
      new Set(value.sizes.map((s) => s.name)).size === value.sizes.length,
    "Each size must be unique.",
  );
export type MenuEdit = z.output<typeof menuItemSchema>;
export const categorySchema = z.object({
  id: identifier.optional(),
  name: z.string().trim().min(1).max(80),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});
