import type { BlockKind } from "@/lib/inviteTypes";

export function publicBlockLabel(kind: BlockKind | string): string {
  switch (kind) {
    case "nav":
      return "Меню";
    case "calendar":
      return "Календарь";
    case "countdown":
      return "Таймер";
    case "palette":
      return "Палитра";
    case "names":
      return "Имена";
    case "rsvp":
      return "RSVP";
    case "message":
      return "Сообщение";
    case "text":
      return "Текст приглашения";
    case "gifts":
      return "Подарки";
    case "survey":
      return "Опрос";
    case "schedule":
      return "Расписание";
    case "video":
      return "Видео";
    case "story":
      return "История";
    case "slides":
      return "Слайдер";
    case "map":
      return "Карта";
    case "wishes":
      return "Пожелания";
    case "wishesForm":
      return "Отправка пожелания";
    default:
      return String(kind);
  }
}
