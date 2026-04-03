import type { InviteDoc } from "./inviteTypes";

/** Значение по умолчанию для `global.heartsColor` (редактор и merge). */
export const DEFAULT_HEARTS_COLOR = "#ffc7d4";

export function createDemoInvite(slug: string): InviteDoc {
  return {
    slug,
    audioUrl: "",
    global: {
      fontFamily: "serif",
      fontSizePx: 16,
      textColor: "rgba(255,255,255,0.92)",
      backgroundImage: "",
      overlayOpacity: 0.55,
      showBlockTitles: false,
      overlayAnimations: [
        { id: "demo-hearts", kind: "hearts", enabled: true, color: DEFAULT_HEARTS_COLOR },
        { id: "demo-letters", kind: "letters", enabled: false, text: "LOVE", color: "rgba(255,255,255,0.88)" },
      ],
      blockDefaults: {
        bgOpacity: 0.08,
        blurPx: 10,
        radiusPx: 24,
      },
    },
    blocks: [
      { kind: "nav", enabled: false },
      { kind: "calendar", enabled: false },
      { kind: "countdown", enabled: false, targetIso: "2026-09-18T12:00:00.000Z" },
      { kind: "palette", enabled: false, colors: ["#e2c9a7", "#8aa67d", "#2b2f36", "#ffffff"] },
      {
        kind: "names",
        enabled: true,
        bride: "МАГА",
        groom: "ЯКОРЬ",
        date: "18 | 09 | 2026",
      },
      { kind: "rsvp", enabled: false, question: "Вы сможете прийти?" },
      { kind: "message", enabled: false, prompt: "Оставьте сообщение" },
      { kind: "gifts", enabled: false, title: "Деньги в подарок" },
      {
        kind: "survey",
        enabled: false,
        questions: [
          { title: "Нужен ли трансфер?", options: [{ label: "Нет" }, { label: "Да" }] },
          {
            title: "Есть ли у вас аллергии?",
            options: [{ label: "Нет" }, { label: "Да" }],
          },
        ],
      },
      {
        kind: "schedule",
        enabled: false,
        items: [
          { time: "16:00", title: "Сбор гостей", text: "" },
          { time: "17:00", title: "Церемония", text: "" },
        ],
      },
      {
        kind: "video",
        enabled: true,
        videoUrl: "",
        shape: "circle",
        sizePct: 100,
      },
      {
        kind: "story",
        enabled: true,
        items: [
          { title: "Как познакомились", text: "Короткая история в 2–3 предложения." },
          { title: "Предложение", text: "Тут будет текст про предложение." },
        ],
      },
      {
        kind: "wishes",
        enabled: false,
        title: "Пожелания",
      },
      {
        kind: "wishesForm",
        enabled: false,
        title: "Оставьте пожелание",
        namePlaceholder: "Ваше имя",
        textPlaceholder: "Тёплые слова молодожёнам",
      },
      {
        kind: "map",
        enabled: true,
        address: "Москва, адрес места",
        eventTime: "10:00",
        eventDate: "26.12.2025",
        venueTitle: "Фуршет",
        venueSubtitle: "Банкетный зал",
        venueDescription:
          "После росписи вас доставят до банкетного зала двумя минивэнами. Именно здесь мы отметим наш незабываемый день.",
        mapBorderColor: "#2ec4b6",
      },
    ],
  };
}

