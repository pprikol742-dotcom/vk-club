import { useState } from "react";
import type { GiftEvent } from "../../lib/types";
import { giftIconUrl, splatIconUrl } from "../../lib/giftIcons";

const SMOKE_GIFT_IDS = new Set(["cigar", "hookah"]);
const STEAM_GIFT_IDS = new Set(["coffee", "chifir"]);
const SPLATTER_GIFT_IDS = new Set(["rotten_tomato", "egg"]);

function GiftFxItem({ gift, style }: { gift: GiftEvent; style?: React.CSSProperties }) {
  const iconUrl = giftIconUrl(gift.gift_id);

  if (gift.gift_id === "beer_bottle") {
    return <BeerBottleFx style={style} />;
  }

  return (
    <div className="gift-fx" style={{ position: "absolute", ...style }}>
      {iconUrl && (
        <img src={iconUrl} alt="" style={{ width: 34, height: 34, objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} />
      )}
      {SMOKE_GIFT_IDS.has(gift.gift_id) && (
        <>
          <span className="smoke-wisp" />
          <span className="smoke-wisp" />
        </>
      )}
      {STEAM_GIFT_IDS.has(gift.gift_id) && (
        <>
          <span className="steam-wisp" />
          <span className="steam-wisp" />
        </>
      )}
      {SPLATTER_GIFT_IDS.has(gift.gift_id) && (
        <img
          src={splatIconUrl(gift.gift_id as "rotten_tomato" | "egg")}
          alt=""
          style={{ position: "absolute", top: -6, left: -6, width: 46, height: 46, objectFit: "contain", opacity: 0.95 }}
        />
      )}
    </div>
  );
}

/** Пиво: долетает до пульта, открывается, пробка падает и остаётся лежать рядом. */
function BeerBottleFx({ style }: { style?: React.CSSProperties }) {
  const [landed, setLanded] = useState(false);
  const iconUrl = giftIconUrl("beer_bottle");

  return (
    <div style={{ position: "absolute", ...style }}>
      <div
        className={`beer-gift${landed ? " landed" : ""}`}
        style={{ "--beer-from-x": "-140px", "--beer-from-y": "-30px" } as React.CSSProperties}
        onAnimationEnd={(e) => {
          if (e.animationName === "beer-fly") setLanded(true);
        }}
      >
        {iconUrl && <img src={iconUrl} alt="" style={{ width: 22, height: 34, objectFit: "contain" }} />}
        <span className="beer-fizz" />
        <span className="beer-cap">⚪</span>
      </div>
    </div>
  );
}

export function GiftFxLayer({ gifts }: { gifts: GiftEvent[] }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 5 }}>
      {gifts.map((g, i) => {
        const offsetX = 20 + ((i * 37) % 220);
        const offsetY = -70 + ((i * 23) % 20);
        return <GiftFxItem key={g.id} gift={g} style={{ left: offsetX, top: offsetY }} />;
      })}
    </div>
  );
}
