import prisma from "./prisma";

export interface DeliverySettings {
  start: string; // e.g. "08:00"
  end: string;   // e.g. "18:00"
  quietHoursEnabled: boolean;
  allowedDays: number[]; // 0: Sunday, 1: Monday, ..., 6: Saturday
  minDelay: number;
  maxDelay: number;
}

export const DAY_NAMES = [
  { day: 1, name: "Pazartesi", short: "Pzt" },
  { day: 2, name: "Salı", short: "Sal" },
  { day: 3, name: "Çarşamba", short: "Çar" },
  { day: 4, name: "Perşembe", short: "Per" },
  { day: 5, name: "Cuma", short: "Cum" },
  { day: 6, name: "Cumartesi", short: "Cmt" },
  { day: 0, name: "Pazar", short: "Paz" },
];

export async function getDeliverySettings(): Promise<DeliverySettings> {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, any> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const start = String(
      settingsMap["delivery_window_start"] ||
      settingsMap["quiet_hours_start"] ||
      "08:00"
    ).trim();

    const end = String(
      settingsMap["delivery_window_end"] ||
      settingsMap["quiet_hours_end"] ||
      "18:00"
    ).trim();

    const quietHoursEnabled =
      settingsMap["quiet_hours_enabled"] !== "false" &&
      settingsMap["quiet_hours_enabled"] !== false;

    let allowedDays: number[] = [1, 2, 3, 4, 5, 6, 0];
    if (settingsMap["allowed_days"]) {
      try {
        const parsed = typeof settingsMap["allowed_days"] === "string"
          ? JSON.parse(settingsMap["allowed_days"])
          : settingsMap["allowed_days"];
        if (Array.isArray(parsed) && parsed.length > 0) {
          allowedDays = parsed.map(Number);
        }
      } catch (e) {
        // fallback
      }
    }

    const minDelay = Number(settingsMap["min_delay"]) || 5;
    const maxDelay = Number(settingsMap["max_delay"]) || 15;

    return {
      start: start.length === 5 ? start : "08:00",
      end: end.length === 5 ? end : "18:00",
      quietHoursEnabled,
      allowedDays,
      minDelay,
      maxDelay,
    };
  } catch (err) {
    console.error("[Delivery Window] Error fetching settings:", err);
    return {
      start: "08:00",
      end: "18:00",
      quietHoursEnabled: true,
      allowedDays: [1, 2, 3, 4, 5, 6, 0],
      minDelay: 5,
      maxDelay: 15,
    };
  }
}

export function isDeliveryWindowOpen(settings: {
  start: string;
  end: string;
  allowedDays: number[];
  quietHoursEnabled?: boolean;
}): {
  isOpen: boolean;
  reason?: string;
  currentHourMinute: string;
  currentDay: number;
  start: string;
  end: string;
} {
  const now = new Date();
  // Türkiye Saati (Europe/Istanbul) kontrolü
  const trTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );

  const hours = String(trTime.getHours()).padStart(2, "0");
  const minutes = String(trTime.getMinutes()).padStart(2, "0");
  const currentHourMinute = `${hours}:${minutes}`;
  const currentDay = trTime.getDay(); // 0: Pazar, 1: Pazartesi...

  // 1. Check Allowed Days
  if (Array.isArray(settings.allowedDays) && !settings.allowedDays.includes(currentDay)) {
    const dayObj = DAY_NAMES.find((d) => d.day === currentDay);
    const dayName = dayObj ? dayObj.name : `Gün ${currentDay}`;
    return {
      isOpen: false,
      reason: `Bugün (${dayName}) izin verilen gönderim günleri dışındadır (Örn. Pazar Koruması).`,
      currentHourMinute,
      currentDay,
      start: settings.start,
      end: settings.end,
    };
  }

  // 2. If quiet hours guard is disabled, always allow
  if (settings.quietHoursEnabled === false) {
    return {
      isOpen: true,
      currentHourMinute,
      currentDay,
      start: settings.start,
      end: settings.end,
    };
  }

  // 3. Check Delivery Window Time Interval
  const start = settings.start || "08:00";
  const end = settings.end || "18:00";

  let isOpen = false;
  if (start <= end) {
    // Normal daytime window: e.g. 08:00 - 18:00
    isOpen = currentHourMinute >= start && currentHourMinute < end;
  } else {
    // Window crossing midnight: e.g. 20:00 - 04:00
    isOpen = currentHourMinute >= start || currentHourMinute < end;
  }

  return {
    isOpen,
    reason: isOpen
      ? undefined
      : `Sessiz saatler devrede (${currentHourMinute} TR). İzin verilen aralık: ${start} - ${end}.`,
    currentHourMinute,
    currentDay,
    start,
    end,
  };
}
