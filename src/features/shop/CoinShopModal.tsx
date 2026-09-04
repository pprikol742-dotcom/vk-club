import React, { useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { Modal } from '../../components/modals/ClubModals';
import { supabase } from '../../lib/supabase';

export interface CoinPack {
  id: string;
  coins: number;
  votes: number;
  /** пометка «выгодно» */
  best?: boolean;
}

/** Базовый курс: 50 монет за 5 голосов, дальше выгоднее. */
export const COIN_PACKS: CoinPack[] = [
  { id: 'coins_50',   coins: 50,   votes: 5 },
  { id: 'coins_120',  coins: 120,  votes: 10 },
  { id: 'coins_350',  coins: 350,  votes: 25, best: true },
  { id: 'coins_800',  coins: 800,  votes: 50 },
];

export const CoinShopModal: React.FC<{
  vkId: number;
  coins: number;
  unlimited?: boolean;
  onClose: () => void;
  onBought?: (coins: number) => void;
}> = ({ vkId, coins, unlimited, onClose, onBought }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = async (pack: CoinPack) => {
    setBusy(pack.id);
    setError(null);
    try {
      // заявка: по ней сервер сверит оплату
      const { data: order, error: orderErr } = await supabase
        .from('coin_orders')
        .insert({ vk_id: vkId, pack: pack.id, coins: pack.coins, votes: pack.votes })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const res: any = await bridge.send('VKWebAppShowOrderBox', {
        type: 'item',
        item: `${pack.id}:${order.id}`,
      });

      if (res?.success) {
        const { data, error } = await supabase.rpc('credit_coins', {
          p_vk_id: vkId,
          p_coins: pack.coins,
          p_order: String(order.id),
        });
        if (error) throw error;
        onBought?.(data as number);
        onClose();
      }
    } catch (e) {
      const err = e as any;
      setError(err?.error_data?.error_msg ?? err?.message ?? 'Не удалось купить монеты');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="Монеты" onClose={onClose} width={430}>
      <div className="modal__body">
        <div className="shop__balance">
          У тебя <b>{unlimited ? '∞' : coins}</b> монет
        </div>

        {unlimited ? (
          <div className="modal__hint" style={{ textAlign: 'center' }}>
            Монеты не кончаются — покупать ничего не нужно.
          </div>
        ) : (
          <div className="shop__grid">
            {COIN_PACKS.map((p) => (
              <button
                key={p.id}
                className={'shop__pack' + (p.best ? ' is-best' : '')}
                disabled={!!busy}
                onClick={() => buy(p)}
              >
                {p.best && <span className="shop__badge">выгодно</span>}
                <span className="shop__coins">
                  <i className="gift__coin" /> {p.coins}
                </span>
                <span className="shop__price">
                  {busy === p.id ? '…' : `${p.votes} голосов`}
                </span>
              </button>
            ))}
          </div>
        )}

        {error && <div className="modal__hint">{error}</div>}
      </div>
    </Modal>
  );
};
