import { useCallback, useEffect, useState } from "react";
import "./styles/theme.css";
import { initVkBridge, getVkUserInfo, getLaunchParams } from "./lib/vkBridge";
import { callEdgeFunction, supabase } from "./lib/supabase";
import { useAppStore } from "./store/useAppStore";
import { ClubCreate } from "./features/club/ClubCreate";
import { ClubsScreen } from "./features/club/ClubsScreen";
import { ClubRoom } from "./features/room/ClubRoom";
import { DailyReward } from "./features/rewards/DailyReward";
import { SplashScreen } from "./features/splash/SplashScreen";
import { Modal, HelpModal } from "./components/modals/ClubModals";
import type { Club, Profile } from "./lib/types";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Таймаут (${ms / 1000} сек) на шаге: ${label}`)), ms),
    ),
  ]);
}

type Overlay = "create" | "reward" | "help" | null;

export default function App() {
  const profile = useAppStore((s) => s.profile);
  const club = useAppStore((s) => s.club);
  const setProfile = useAppStore((s) => s.setProfile);
  const setClub = useAppStore((s) => s.setClub);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState("Запускаем");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setStep("Связываемся с ВКонтакте");
        await withTimeout(initVkBridge(), 8000, "VKWebAppInit");

        setStep("Читаем профиль");
        const vkUser = await withTimeout(getVkUserInfo(), 8000, "VKWebAppGetUserInfo");

        setStep("Входим в игру");
        const { profile } = await withTimeout(
          callEdgeFunction<{ profile: Profile }>("verify-launch", {
            launchParams: getLaunchParams(),
            vkProfile: {
              first_name: vkUser.first_name,
              last_name: vkUser.last_name,
              photo_200: vkUser.photo_200,
            },
          }),
          8000,
          "verify-launch",
        );
        setProfile(profile);

        // приложение открыли из сообщества — сразу заходим в его клуб
        const launch = getLaunchParams();
        if (launch.vk_group_id) {
          setStep("Открываем клуб");
          const { data } = await supabase
            .from("clubs")
            .select("*")
            .eq("vk_group_id", Number(launch.vk_group_id))
            .maybeSingle();
          if (data) setClub(data as Club);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setReady(true);
      }
    })();
  }, [setProfile, setClub]);

  /** Заходим в выбранный клуб. */
  const enterClub = useCallback(
    async (clubId: string) => {
      if (entering) return;
      setEntering(true);
      try {
        const { data, error } = await supabase
          .from("clubs")
          .select("*")
          .eq("id", clubId)
          .maybeSingle();
        if (error) throw error;
        if (data) setClub(data as Club);
      } catch (e) {
        alert((e as Error).message);
      } finally {
        setEntering(false);
      }
    },
    [entering, setClub],
  );

  if (!ready) return <SplashScreen message={step} />;
  if (error) return <SplashScreen error={error} />;
  if (!profile) return <SplashScreen error="Не удалось авторизоваться через ВК" />;

  // в клубе
  if (club) return <ClubRoom onLeaveClub={() => setClub(null)} />;

  // витрина клубов
  return (
    <>
      <ClubsScreen
        votes={(profile as any).votes ?? 0}
        onEnter={enterClub}
        onCreate={() => setOverlay("create")}
        onHelp={() => setOverlay("help")}
      />

      <button className="daily-fab" title="Ежедневная награда" onClick={() => setOverlay("reward")}>
        🎁
      </button>

      {overlay === "create" && (
        <Modal title="Собственный клуб" width={520} onClose={() => setOverlay(null)}>
          <div className="modal__body">
            <ClubCreate
              onClubReady={(c: Club) => {
                setOverlay(null);
                setClub(c);
              }}
            />
          </div>
        </Modal>
      )}

      {overlay === "reward" && (
        <Modal title="Ежедневная награда" onClose={() => setOverlay(null)}>
          <div className="modal__body">
            <DailyReward />
          </div>
        </Modal>
      )}

      {overlay === "help" && <HelpModal onClose={() => setOverlay(null)} />}
    </>
  );
}
