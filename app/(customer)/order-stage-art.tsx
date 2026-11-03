export type OrderArtStage = "received" | "in_progress" | "ready" | "completed";

/** Decorative only: the adjacent status text carries the order's meaning. */
export function OrderStageArt({
  stage,
  compact = false,
}: {
  stage: OrderArtStage;
  compact?: boolean;
}) {
  return (
    <svg
      key={stage}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 160 124"
      fill="none"
      strokeWidth={compact ? 4 : 3}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-stage={stage}
      className={`order-stage-art block shrink-0 stroke-ink ${compact ? "h-8 w-10" : "h-[110px] w-[140px]"}`}
    >
      <ellipse
        cx="80"
        cy="111"
        rx="53"
        ry="6"
        stroke="none"
        className="fill-tile"
      />

      {stage === "received" && (
        <g transform="translate(-5 6)">
          <g className="order-art-receipt">
            <path
              d="M43 13h65v88l-8-5-8 5-8-5-8 5-8-5-8 5-8-5-9 5V13Z"
              className="fill-paper"
            />
            <path d="M56 29h38" className="stroke-brand-red" strokeWidth="7" />
            <path
              d="M57 46h35m-35 12h24m-24 13h12"
              className="stroke-brand-blue"
            />
            <path d="M57 83h17" />
          </g>
          <g className="order-art-stamp">
            <path d="m101 62 29 8-7 30-29-7Z" className="fill-mustard" />
            <path
              d="m102 81 7 8 13-14"
              className="stroke-brand-blue"
              strokeWidth="5"
            />
          </g>
          <path
            d="m29 24-7-3m8 17-9 2m100-10 6-6"
            className="stroke-brand-red"
          />
        </g>
      )}

      {stage === "in_progress" && (
        <>
          <g className="order-art-steam stroke-brand-red">
            <path d="M51 43c-10-11 9-13 1-24" />
            <path d="M73 33c-9-10 10-13 2-24" />
            <path d="M95 39c-8-8 9-12 4-20" />
          </g>
          <g className="order-art-food">
            <path d="m47 56 9-10 10 7-8 10Z" className="fill-mustard" />
            <path
              d="M76 47c-1-11 9-17 16-12 0 9-5 15-16 12Z"
              className="fill-brand-blue"
            />
            <path
              d="M99 57c10-12 18-7 16-2-2 6-11 9-16 2Z"
              className="fill-brand-red"
            />
            <path d="m66 66 9-9 10 8-8 8Z" className="fill-mustard" />
          </g>
          <g className="order-art-wok">
            <path
              d="m111 72 32-21c6-4 12 4 6 8l-33 23"
              className="fill-brand-blue"
            />
            <path
              d="M24 70c5 28 23 36 47 36 24 0 42-8 47-36Z"
              className="fill-brand-blue"
            />
            <ellipse cx="71" cy="70" rx="47" ry="11" className="fill-cream" />
            <path
              d="M40 71c5-7 10-4 16 0s10 4 17 0 12-3 18 1 11 2 15-1"
              className="stroke-mustard"
              strokeWidth="5"
            />
            <path d="m48 88 8 5" className="stroke-paper" />
            <path d="m23 68-7-5" />
          </g>
        </>
      )}

      {stage === "ready" && (
        <>
          <g className="order-art-ready-rays stroke-brand-red">
            <path d="m28 39-9-7m112 7 9-7M24 61H12m124 0h12M39 20l-4-8m88 8 4-8" />
          </g>
          <g className="order-art-bag">
            <path d="M46 39h67l6 68H39Z" className="fill-mustard" />
            <path d="m46 39 10-9h47l10 9" className="fill-cream" />
            <path
              d="M62 47V31c0-24 34-24 34 0v16"
              className="stroke-brand-blue"
              strokeWidth="5"
            />
            <path d="m46 39 8 68m59-68-8 68" />
            <path d="M62 69h34l-5 17H67Z" className="fill-brand-red" />
            <path d="m72 60 15 11m-5-17 9 18" className="stroke-brand-blue" />
            <path d="M60 96h38" className="stroke-brand-red" />
          </g>
        </>
      )}

      {stage === "completed" && (
        <>
          <g className="order-art-bag">
            <path d="M32 46h63l5 60H26Z" className="fill-mustard" />
            <path
              d="M48 49V36c0-22 31-22 31 0v13"
              className="stroke-brand-blue"
              strokeWidth="5"
            />
            <path d="m32 46 7 60m56-60-7 60" />
            <path d="M46 69h33l-5 16H51Z" className="fill-brand-red" />
            <path d="m56 60 14 11m-5-17 9 17" className="stroke-brand-blue" />
          </g>
          <g className="order-art-thanks">
            <path
              d="m101 23 12 5 13-1 4 13 9 10-8 11-3 13-14-1-12 5-8-10-12-6 2-14-2-12 12-5Z"
              className="fill-cream"
            />
            <path
              d="m99 49 10 10 17-21"
              className="order-art-check stroke-brand-blue"
              strokeWidth="5"
            />
          </g>
          <g className="order-art-farewell stroke-brand-red">
            <path d="m138 83 8 4m-18 10 3 9M24 29l-7-5" />
          </g>
        </>
      )}
    </svg>
  );
}
