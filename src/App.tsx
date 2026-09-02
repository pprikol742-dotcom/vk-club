import { useEffect, useState } from "react";
import "./styles/theme.css";
import { initVkBridge, getVkUserInfo, getLaunchParams } from "./lib/vkBridge";
import { callEdgeFunction, supabase } from "./lib/supabase";
import { useAppStore } from "./store/useAppStore";
import { ClubCreate } from "./features/club/ClubCreate";
import { ClubRoom } from "./features/room/ClubRoom";
import { DailyReward } from "./features/rewards/DailyReward";
import { SplashScreen } from "./features/splash/SplashScreen";
import type { Club, Profile } from "./lib/types";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Таймаут (${ms / 1000} сек) на шаге: ${label}`)), ms),
    ),
  ]);
}

export default function App() {
  const profile = useAppStore((s) => s.profile);
  const club = useAppStore((s) => s.club);
  const setProfile = useAppStore((s) => s.setProfile);
  const setClub = useAppStore((s) => s.setClub);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState("Init");

  useEffect(() => {
    (async () => {
      try {
        setStep("VKWebAppInit");
        await withTimeout(initVkBridge(), 8000, "VKWebAppInit");

        setStep("VKWebAppGetUserInfo");
        const vkUser = await withTimeout(getVkUserInfo(), 8000, "VKWebAppGetUserInfo");

        setStep("verify-launch");
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

        const launch = getLaunchParams();
        if (launch.vk_group_id) {
          setStep("Loading club");
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

  if (!ready) return <SplashScreen step={step} />;
  if (error) return <Centered>Ошибка: {error}</Centered>;
  if (!profile) return <Centered>Не удалось авторизоваться через VK</Centered>;

  if (!club) {
    return (
      <>
        <DailyReward />
        <ClubCreate onClubReady={setClub} />
      </>
    );
  }

  return <ClubRoom />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-primary)", textAlign: "center", padding: 16 }}>
      {children}
    </div>
  );
}
