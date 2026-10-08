import { NextResponse } from "next/server";

// Stub — implemented in T25 against the API contract in docs/api.md.
export async function POST() {
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Not implemented yet." } },
    { status: 501 },
  );
}
