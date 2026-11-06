#!/usr/bin/env node
// Builds the two SCRUM-98 Technical deliverables from a committed git ref:
//   FSX_Team9_SourceCode_v<N>.zip                one zip of the repository at that ref
//   FSX_Team9_CommitHistory_<Member>_v<N>.txt    one commit history per team member
//   FSX_Team9_CommitHistory_Summary_v<N>.txt     commit counts for the whole team
//
// Usage (from the repository root, after `git fetch --all --prune`):
//   npm run package:deliverables                              # origin/main, v1, ./deliverables
//   npm run package:deliverables -- --ref origin/dev --version 2 --out ../FinalDeliverables/SourceCode
//
// The zip comes from `git archive`, so it holds only committed files: no node_modules, no build
// output and no .env.local. The script still refuses to finish if the ref contains any .env file
// other than .env.example, or text that looks like a real key or password.
//
// Squash merges credit the PR author, and task branches are deleted after merging, so each member's
// history lists the commits they authored or co-authored on any remote branch, plus the log of
// their personal branch if one exists. A member with no commits gets a file that says so.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

export const MEMBERS = [
  {
    name: "Hiab",
    fullName: "Hiab Negash",
    emails: ["hiabnegash@gmail.com", "negashhiab@gmail.com"],
    branch: null,
  },
  {
    name: "Perry",
    fullName: "Perry Takyi",
    emails: ["perrytakyi03@gmail.com"],
    branch: "Perry-Takyi",
  },
  {
    name: "Jose",
    fullName: "Jose Vasquez",
    emails: ["jjvjr05@gmail.com"],
    branch: "Jose-Vasquez",
  },
  {
    name: "Noor",
    fullName: "Noor Elabhar",
    emails: ["noorelabhar@gmail.com"],
    branch: null,
  },
  {
    name: "Charles",
    fullName: "Charles Ezeribe",
    emails: [],
    branch: "Charles's-architecture",
  },
  {
    name: "Darrion",
    fullName: "Darrion Jackson",
    emails: [],
    branch: "Darrion-Jackson",
  },
  {
    name: "Ihsan",
    fullName: "Ihsan Kahlan",
    emails: [],
    branch: "Ihsan-Kahlan",
  },
  { name: "Quincy", fullName: "Quincy", emails: [], branch: "Quincy-Branch" },
];

// Patterns for values that must never ship. Names such as STRIPE_SECRET_KEY are fine; values are not.
export const SECRET_PATTERNS = [
  ["Stripe secret or restricted key", /\b(sk|rk)_(test|live)_[0-9A-Za-z]{10,}/],
  ["Stripe webhook secret", /\bwhsec_[0-9A-Za-z]{10,}/],
  ["Resend API key", /\bre_[0-9A-Za-z]{8,}_[0-9A-Za-z]{8,}/],
  ["Supabase access token", /\bsbp_[0-9a-f]{20,}/],
  [
    "JSON web token (Supabase key)",
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  ],
  ["Database URL with password", /postgres(ql)?:\/\/[^\s:@/]+:[^\s@/]{6,}@/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

export function forbiddenEnvFiles(paths) {
  return paths.filter(
    (p) => /(^|\/)\.env(\.|$)/.test(p) && !/(^|\/)\.env\.example$/.test(p),
  );
}

export function findSecrets(files) {
  const hits = [];
  for (const { path, text } of files)
    for (const [label, pattern] of SECRET_PATTERNS)
      if (pattern.test(text)) hits.push(`${path}: ${label}`);
  return hits;
}

function parseArgs(argv) {
  const args = { ref: "origin/main", version: "1", out: "deliverables" };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (!(key in args) || argv[i + 1] === undefined)
      throw new Error(`Unknown or incomplete option: ${argv[i]}`);
    args[key] = argv[i + 1];
  }
  if (!/^\d+$/.test(args.version))
    throw new Error("--version must be a whole number, for example 1 or 2.");
  return args;
}

const git = (...a) =>
  execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function memberHistory(member, ref, generatedAt) {
  const format = "--pretty=format:%h  %ad  %an <%ae>%n    %s";
  const lines = [
    `FSX Team 9: commit history for ${member.fullName}`,
    `Repository: https://github.com/hiabnegash-lang/FSX`,
    `Generated: ${generatedAt} from all remote branches (release ref ${ref})`,
    `Author emails: ${member.emails.length ? member.emails.join(", ") : "none recorded in git"}`,
    `Personal branch: ${member.branch ?? "none (task branches are deleted after their PR merges)"}`,
    "",
  ];
  let authored = 0;
  let coauthored = 0;
  if (member.emails.length) {
    const authorRegex = member.emails.map(escapeRegex).join("|");
    const own = git(
      "log",
      "--remotes",
      "--no-merges",
      "--date=short",
      "--perl-regexp",
      `--author=${authorRegex}`,
      "--shortstat",
      format,
    ).trim();
    authored = own
      ? git(
          "rev-list",
          "--remotes",
          "--no-merges",
          "--perl-regexp",
          `--author=${authorRegex}`,
        )
          .trim()
          .split("\n").length
      : 0;
    lines.push(`== Commits authored (${authored}) ==`, own || "(none)", "");
    // Commits that credit the member in a Co-authored-by line but were authored by someone else
    // (for example a squash merge of a PR they contributed to).
    const coList = git(
      "log",
      "--remotes",
      "--no-merges",
      "-i",
      "--perl-regexp",
      `--grep=^Co-authored-by:.*(${authorRegex})`,
      "--pretty=format:%h %ae",
    ).trim();
    const coOnly = coList
      ? coList
          .split("\n")
          .filter(
            (l) => !member.emails.some((e) => l.toLowerCase().endsWith(e)),
          )
      : [];
    coauthored = coOnly.length;
    const coText = coOnly.length
      ? git(
          "show",
          "--no-patch",
          "--date=short",
          format,
          ...coOnly.map((l) => l.split(" ")[0]),
        ).trim()
      : "";
    lines.push(
      `== Commits co-authored (credited in a Co-authored-by line, ${coauthored}) ==`,
      coText || "(none)",
      "",
    );
  } else {
    lines.push(
      "== Commits authored (0) ==",
      "No commits in this repository are authored by this member.",
      "",
    );
  }
  if (member.branch) {
    const remote = `origin/${member.branch}`;
    let branchLog;
    try {
      branchLog = git("log", "--date=short", format, remote).trim();
    } catch {
      branchLog = `(branch ${remote} was not found; run git fetch --all --prune)`;
    }
    lines.push(
      `== Log of personal branch ${member.branch} ==`,
      branchLog || "(empty)",
      "",
    );
  }
  return { text: lines.join("\n") + "\n", authored, coauthored };
}

function main() {
  const { ref, version, out } = parseArgs(process.argv.slice(2));
  git("rev-parse", "--verify", `${ref}^{commit}`);
  const sha = git("rev-parse", "--short", ref).trim();
  // -z: unquoted, NUL-separated names, so paths with spaces or non-ASCII characters survive.
  const paths = git("ls-tree", "-r", "-z", "--name-only", ref)
    .split("\0")
    .filter(Boolean);

  const envFiles = forbiddenEnvFiles(paths);
  if (envFiles.length)
    throw new Error(
      `Refusing to package: ${ref} contains ${envFiles.join(", ")}`,
    );
  const textFiles = paths.filter(
    (p) => !/\.(png|jpe?g|webp|gif|ico|pdf|woff2?|zip)$/i.test(p),
  );
  const hits = findSecrets(
    textFiles.map((p) => ({ path: p, text: git("show", `${ref}:${p}`) })),
  );
  if (hits.length)
    throw new Error(
      `Refusing to package: possible secrets in ${ref}:\n  ${hits.join("\n  ")}`,
    );

  const outDir = resolve(out);
  mkdirSync(outDir, { recursive: true });
  const zip = join(outDir, `FSX_Team9_SourceCode_v${version}.zip`);
  if (existsSync(zip)) rmSync(zip);
  git("archive", "--format=zip", "--prefix=FSX/", "-o", zip, ref);

  const generatedAt = new Date().toISOString().slice(0, 10);
  const summary = [
    "FSX Team 9: commit history summary",
    `Generated ${generatedAt}. Source code zip built from ${ref} at commit ${sha}.`,
    "",
    "Member      Authored  Co-authored  Personal branch",
  ];
  for (const member of MEMBERS) {
    const { text, authored, coauthored } = memberHistory(
      member,
      ref,
      generatedAt,
    );
    writeFileSync(
      join(outDir, `FSX_Team9_CommitHistory_${member.name}_v${version}.txt`),
      text,
    );
    summary.push(
      `${member.fullName.padEnd(16).slice(0, 16)}${String(authored).padStart(4)}${String(coauthored).padStart(12)}   ${member.branch ?? "-"}`,
    );
  }
  summary.push(
    "",
    "Squash merges credit the PR author; see each member's file for the commits.",
  );
  writeFileSync(
    join(outDir, `FSX_Team9_CommitHistory_Summary_v${version}.txt`),
    summary.join("\n") + "\n",
  );

  console.log(`Packaged ${ref} (${sha}) into ${outDir}:`);
  console.log(
    `  FSX_Team9_SourceCode_v${version}.zip (${paths.length} files, secret scan clean)`,
  );
  console.log(`  ${MEMBERS.length} member commit histories and a summary`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
