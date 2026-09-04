import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error("е заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** ызов edge function с автоматической подстановкой launchParams — см. lib/vkBridge.ts */
export async function callEdgeFunction<T = unknown>(
  name: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: payload });

  if (error) {
    // настоящий текст ошибки лежит в теле ответа, а не в error.message
    const ctx = (error as any)?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) throw new Error(String(body.error));
      } catch (e) {
        if (e instanceof Error && !e.message.includes("JSON")) throw e;
      }
    }
    throw error;
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}


