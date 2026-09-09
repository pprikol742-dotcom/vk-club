import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GiftEvent } from "../../lib/types";
import { giftIconUrl, splatIconUrl } from "../../lib/giftIcons";
import "../../styles/gift-fly.css";

const SMOKE_GIFT_IDS = new Set(["cigar", "hookah"]);
const STEAM_GIFT_IDS = new Set(["coffee", "chifir"]);
const SPLATTER_GIFT_IDS = new Set(["rotten_tomato", "egg"]);
/** Что летит по дуге вверх, как брошенное, а не плывёт по прямой. */
const THROWN_GIFT_IDS = new Set(["rotten_tomato", "egg", "snowball"]);

/** Сколько подарок летит и сколько потом лежит рядом с получателем. */
const FLY_MS = 900;
const LIFE_MS = 60_000;

type Point = { x: number; y: number };

/**
 * Ищем аватарку по vk_id внутри зала и отдаём её центр
 * в координатах слоя эффектов.
 */
function findPoint(root: HTMLElement, vkId: number | null | undefined): Point | null {
  if (vkId == null) return null;
  const el = root.parentElement?.querySelector<HTMLElement>(`[data-vk="${vkId}"]`);
  if (!el) return null;

  const box = el.getBoundingClientRect();
  const base = root.getBoundingClientRect();
  return {
    x: box.left - base.left + box.width / 2,
    y: box.top - base.top + box.height / 2,
  };
}

function FlyingGift({ gift, root }: { gift: GiftEvent; root: HTMLElement | null }) {
  const iconUrl = giftIconUrl(gift.gift_id);
  const [from, setFrom] = useState<Point | null>(null);
  const [to, setTo] = useState<Point | null>(null);
  const [landed, setLanded] = useState(false);

  useLayoutEffect(() => {
    if (!root) return;
    const a = findPoint(root, gift.from_vk_id);
    const b = findPoint(root, gift.to_vk_id);

    // Если кого-то из двоих в зале нет, подарок просто появляется у цели.
    setTo(b ?? a ?? { x: root.clientWidth / 2, y: root.clientHeight * 0.55 });
    setFrom(a ?? null);
  }, [root, gift.from_vk_id, gift.to_vk_id]);

  useEffect(() => {
    const t = setTimeout(() => setLanded(true), FLY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!to) return null;

  const dx = from ? from.x - to.x : 0;
  const dy = from ? from.y - to.y : -60;
  const thrown = THROWN_GIFT_IDS.has(gift.gift_id);

  const style = {
    left: to.x,
    top: to.y,
    "--from-x": `${dx}px`,
    "--from-y": `${dy}px`,
    "--fly-ms": `${FLY_MS}ms`,
  } as React.CSSProperties;

  return (
    <div
      className={
        "gift-fly" +
        (thrown ? " gift-fly--thrown" : "") +
        (landed ? " is-landed" : "")
      }
      style={style}
    >
      {/* хвост из искр, тает вместе с полётом */}
      {!landed && (
        <>
          <span className="gift-fly__spark" />
          <span className="gift-fly__spark" />
          <span className="gift-fly__spark" />
        </>
      )}

      <div className="gift-fly__body">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="gift-fly__icon" />
        ) : (
          <span className="gift-fly__icon gift-fly__icon--emoji">🎁</span>
        )}

        {SMOKE_GIFT_IDS.has(gift.gift_id) && landed && (
          <>
            <span className="smoke-wisp" />
            <span className="smoke-wisp" />
          </>
        )}
        {STEAM_GIFT_IDS.has(gift.gift_id) && landed && (
          <>
            <span className="steam-wisp" />
            <span className="steam-wisp" />
          </>
        )}
      </div>

      {/* вспышка в момент попадания */}
      {landed && <span className="gift-fly__burst" />}

      {/* помидор и яйцо оставляют кляксу на аватарке */}
      {landed && SPLATTER_GIFT_IDS.has(gift.gift_id) && (
        <img
          src={splatIconUrl(gift.gift_id as "rotten_tomato" | "egg")}
          alt=""
          className="gift-fly__splat"
        />
      )}
    </div>
  );
}

/**
 * Подарки летят от дарителя к получателю и остаются лежать рядом.
 * Через минуту тают — время жизни задаёт стор, здесь только плавное угасание.
 */
export function GiftFxLayer({ gifts }: { gifts: GiftEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => setRoot(ref.current), []);

  return (
    <div ref={ref} className="gift-layer">
      {gifts.map((g) => (
        <FlyingGift key={g.id} gift={g} root={root} />
      ))}
    </div>
  );
}

/** Столько живёт подарок в зале — для стора. */
export const GIFT_LIFETIME_MS = LIFE_MS;
