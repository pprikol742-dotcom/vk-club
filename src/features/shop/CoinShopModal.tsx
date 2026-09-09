import React, { useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { Modal } from '../../components/modals/ClubModals';
import { supabase } from '../../lib/supabase';
import { Icon, ICONS, PACK_ICONS } from '../../components/ui/Icon';

export interface CoinPack {
  id: string;
  coins: number;
  votes: number;
  /** пометка «выгодно» */
  best?: boolean;
}

/** Базовый курс: 200 клабсов за 10 голосов. Дальше пакет выгоднее. */
export const COIN_PACKS: CoinPack[] = [
  { id: 'clubs_200',  coins: 200,  votes: 10 },
  { id: 'clubs_440',  coins: 440,  votes: 20 },
  { id: 'clubs_1200', coins: 1200, votes: 50, best: true },
  { id: 'clubs_2600', coins: 2600, votes: 100 },
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
      setError(err?.error_data?.error_msg ?? err?.message ?? 'Не удалось купить клабсы');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="Клабсы" onClose={onClose} width={430}>
      <div className="modal__body">
        <div className="shop__balance">
          <Icon className="shop__coin" src={ICONS.coin} fallback="🪙" />
          У тебя <b>{unlimited ? '∞' : coins}</b> клабсов
        </div>

        {unlimited ? (
          <div className="modal__hint" style={{ textAlign: 'center' }}>
            Клабсы не кончаются — покупать ничего не нужно.
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
                <Icon className="shop__img" src={PACK_ICONS[p.id]} fallback="💰" />
                <span className="shop__coins">
                  <Icon className="shop__coin" src={ICONS.coin} fallback="🪙" /> {p.coins}
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
