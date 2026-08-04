import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SavePayload = {
  id?: string;
  tail_number: string;
  name: string | null;
  base_type: string;
  data: unknown;
};

export const listAircraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("aircraft")
      .select("*")
      .order("tail_number");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAircraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SavePayload) => input)
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      tail_number: data.tail_number,
      name: data.name,
      base_type: data.base_type,
      data: data.data as never,
    };
    if (data.id) {
      const { data: out, error } = await context.supabase
        .from("aircraft")
        .update(row)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return out;
    }
    const { data: out, error } = await context.supabase
      .from("aircraft")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const deleteAircraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("aircraft").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFlights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("flights")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      aircraft_id: string | null;
      title: string | null;
      flight_date: string | null;
      data: unknown;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      aircraft_id: data.aircraft_id,
      title: data.title,
      flight_date: data.flight_date,
      data: data.data as never,
    };
    if (data.id) {
      const { data: out, error } = await context.supabase
        .from("flights")
        .update(row)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return out;
    }
    const { data: out, error } = await context.supabase
      .from("flights")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const deleteFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("flights").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAirports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("airports").select("*").order("icao");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { icao: string; name: string | null; elevation_ft: number }) => input)
  .handler(async ({ data, context }) => {
    const { data: out, error } = await context.supabase
      .from("airports")
      .upsert(
        {
          user_id: context.userId,
          icao: data.icao.toUpperCase(),
          name: data.name,
          elevation_ft: data.elevation_ft,
        },
        { onConflict: "user_id,icao" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const deleteAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("airports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type MetarInfo = {
  icao: string;
  ok: boolean;
  message?: string | undefined;
  raw?: string | undefined;
  tempC?: number | undefined;
  dewpointC?: number | undefined;
  windDir?: number | null | undefined;
  windSpeedKt?: number | undefined;
  altimInHg?: number | undefined;
  elevationFtReported?: number | undefined;
  observedAt?: string | undefined;
  taf?: string | undefined;
};

export const fetchWeather = createServerFn({ method: "POST" })
  .inputValidator((input: { icaos: string[] }) => input)
  .handler(async ({ data }): Promise<MetarInfo[]> => {
    const ids = data.icaos
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z0-9]{3,4}$/.test(s));
    if (!ids.length) return [];

    const out: MetarInfo[] = [];
    let metars: Record<string, unknown>[] = [];
    let tafs: Record<string, unknown>[] = [];
    try {
      const res = await fetch(
        `https://aviationweather.gov/api/data/metar?ids=${ids.join(",")}&format=json`,
        { headers: { accept: "application/json" } },
      );
      if (res.ok) metars = (await res.json()) as Record<string, unknown>[];
    } catch {
      metars = [];
    }
    try {
      const res = await fetch(
        `https://aviationweather.gov/api/data/taf?ids=${ids.join(",")}&format=json`,
        { headers: { accept: "application/json" } },
      );
      if (res.ok) tafs = (await res.json()) as Record<string, unknown>[];
    } catch {
      tafs = [];
    }

    for (const icao of ids) {
      const m = metars.find((x) => String(x["icaoId"]).toUpperCase() === icao);
      const t = tafs.find((x) => String(x["icaoId"]).toUpperCase() === icao);
      if (!m) {
        out.push({ icao, ok: false, message: `No current report found for ${icao}. Enter values manually.` });
        continue;
      }
      const altimRaw = Number(m["altim"]);
      // aviationweather.gov reports altimeter in hPa for JSON output.
      const altimInHg = Number.isFinite(altimRaw)
        ? altimRaw > 100
          ? altimRaw / 33.8639
          : altimRaw
        : undefined;
      const wdir = m["wdir"];
      out.push({
        icao,
        ok: true,
        raw: typeof m["rawOb"] === "string" ? m["rawOb"] : undefined,
        tempC: Number.isFinite(Number(m["temp"])) ? Number(m["temp"]) : undefined,
        dewpointC: Number.isFinite(Number(m["dewp"])) ? Number(m["dewp"]) : undefined,
        windDir: typeof wdir === "number" ? wdir : null,
        windSpeedKt: Number.isFinite(Number(m["wspd"])) ? Number(m["wspd"]) : undefined,
        altimInHg,
        elevationFtReported: Number.isFinite(Number(m["elev"]))
          ? Math.round(Number(m["elev"]) * 3.28084)
          : undefined,
        observedAt: typeof m["reportTime"] === "string" ? m["reportTime"] : undefined,
        taf: t && typeof t["rawTAF"] === "string" ? (t["rawTAF"] as string) : undefined,
      });
    }
    return out;
  });