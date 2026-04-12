/** Романтические веб-шрифты приглашения (10 вариантов, см. `inviteFontFamilies.ts` + `invite-fonts.css`). */
export type FontFamily =
  | "playfair"
  | "cormorant"
  | "greatVibes"
  | "parisienne"
  | "dancing"
  | "libreBaskerville"
  | "lora"
  | "cinzel"
  | "spectral"
  | "marckScript";

export type BlockKind =
  | "nav"
  | "calendar"
  | "countdown"
  | "palette"
  | "names"
  | "rsvp"
  | "message"
  | "text"
  | "gifts"
  | "survey"
  | "schedule"
  | "video"
  | "story"
  | "slides"
  | "map"
  | "wishes"
  | "wishesForm";

export type BlockStyle = {
  bgOpacity: number; // 0..1
  blurPx: number; // 0..30
  radiusPx: number; // 12..32
};

/** Заголовок секции и рамка карточки: переопределение на уровне блока */
export type BlockChrome = {
  /** undefined — как в global.showBlockTitles; true — всегда показать; false — скрыть */
  showTitle?: boolean;
  /** false — без обводки карточки; undefined/true — с рамкой */
  showBorder?: boolean;
};

/** Варианты появления блоков приглашения после задержки. */
export type BlocksRevealMode = "fade" | "slideUp" | "zoom" | "blur" | "cascade";

/** Режим фонового видео: паузы на кадре или интро один раз + петля хвоста. */
export type BackgroundVideoBehavior = "freezeAtPauses" | "introThenLoopTail";

export type GlobalStyle = {
  fontFamily: FontFamily;
  fontSizePx: number; // 14..22 typical
  textColor: string; // css color
  backgroundImage?: string; // url (later: asset id)
  /** Фоновое видео (если задано — показывается вместо картинки). Не связывается с фоновой музыкой. */
  backgroundVideoUrl?: string;
  /**
   * Секунды таймкода, на которых воспроизведение останавливается на кадре до ухода со страницы.
   * Пусто — видео зацикливается. Берётся первый достигнутый маркер по времени.
   * Используется при `backgroundVideoBehavior === "freezeAtPauses"` (или не задано).
   */
  backgroundVideoPauseAtSec?: number[];
  /**
   * `freezeAtPauses` — паузы на кадре по списку секунд.
   * `introThenLoopTail` — один раз от начала до `backgroundVideoLoopFromSec`, затем бесконечная петля от этой секунды до конца файла.
   */
  backgroundVideoBehavior?: BackgroundVideoBehavior;
  /**
   * Секунда, с которой начинается петля «хвоста» (после однократного проигрывания 0…этой секунды).
   * Имеет смысл при `introThenLoopTail`.
   */
  backgroundVideoLoopFromSec?: number;
  /** Звук фонового видео. По умолчанию выкл — не пересекается с фоновой музыкой и автозапуском. */
  backgroundVideoMuted?: boolean;
  /** Яркость фонового изображения, ~0.35…1.35 (1 = как в файле). */
  backgroundBrightness?: number;
  overlayOpacity: number; // 0..1
  /** Заголовки секций на публичной странице («Видео», «История»…). По умолчанию скрыты. */
  showBlockTitles?: boolean;
  /**
   * Задержка перед показом блоков при открытии приглашения (секунды). 0 — показать сразу.
   * Фон и рамка карточки остаются; скрывается только контент блоков до истечения времени.
   */
  blocksRevealDelaySec?: number;
  /** Как анимируется появление блоков после задержки (публичная страница и превью). */
  blocksRevealMode?: BlocksRevealMode;
  /** Длительность одной анимации появления блока, секунды (по умолчанию ~1.5). */
  blocksRevealDurationSec?: number;
  /**
   * Слои анимации между фоном и блоками (порядок = порядок наложения, последний выше).
   * Если undefined — используется миграция с `heartsSnow` / `heartsColor`.
   */
  overlayAnimations?: OverlayAnimation[];
  /** @deprecated сохранённые приглашения; мигрируется в overlayAnimations */
  heartsSnow?: boolean;
  /** @deprecated */
  heartsColor?: string;
  blockDefaults: BlockStyle;
};

/** Одна анимация фона: сердечки или падающие символы из заданной строки. */
export type OverlayAnimation =
  | {
      id: string;
      kind: "hearts";
      enabled?: boolean;
      color?: string;
    }
  | {
      id: string;
      kind: "letters";
      enabled?: boolean;
      /** Из этих символов (включая пробелы и emoji) случайно выбирается каждая «снежинка». */
      text: string;
      color?: string;
    };

export type NamesBlock = {
  kind: "names";
  enabled: boolean;
  bride: string;
  groom: string;
  date: string;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type NavBlock = {
  kind: "nav";
  enabled: boolean;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type CalendarBlock = {
  kind: "calendar";
  enabled: boolean;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type CountdownBlock = {
  kind: "countdown";
  enabled: boolean;
  targetIso?: string; // ISO date-time
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type PaletteBlock = {
  kind: "palette";
  enabled: boolean;
  colors: string[];
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type RsvpBlock = {
  kind: "rsvp";
  enabled: boolean;
  question?: string;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type MessageBlock = {
  kind: "message";
  enabled: boolean;
  prompt?: string;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

/** Свободный текст приглашения для гостей (формулировка, тёплые слова). */
export type TextBlock = {
  kind: "text";
  enabled: boolean;
  /** Подзаголовок блока, напр. «Приглашаем вас» */
  title?: string;
  /** Основной текст (несколько абзацев через Enter) */
  body: string;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type GiftsBlock = {
  kind: "gifts";
  enabled: boolean;
  title?: string;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type SurveyOption = { label: string };
export type SurveyQuestion = { title: string; options: SurveyOption[]; multiple?: boolean };

export type SurveyBlock = {
  kind: "survey";
  enabled: boolean;
  questions: SurveyQuestion[];
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type ScheduleItem = { time: string; title: string; text?: string };
export type ScheduleBlock = {
  kind: "schedule";
  enabled: boolean;
  items: ScheduleItem[];
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type VideoBlock = {
  kind: "video";
  enabled: boolean;
  videoUrl?: string;
  shape: "circle" | "square";
  sizePct: number; // 50..100 (width %)
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

/** Форма картинки в блоке «История» */
export type StoryImageShape = "square" | "circle" | "heart";

export type StoryItem = {
  title?: string;
  text: string;
  imageUrl?: string;
  /** Ширина картинки в % от карточки (40–100). По умолчанию 100. */
  imageWidthPct?: number;
  imageShape?: StoryImageShape;
};

export type StoryBlock = {
  kind: "story";
  enabled: boolean;
  items: StoryItem[];
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

/** Элемент слайдера: картинка и своя форма (как в «Истории»). */
export type SlideItem = {
  imageUrl?: string;
  shape: StoryImageShape;
  /** Ширина картинки в % от карточки слайда (40–100). По умолчанию 100. */
  imageWidthPct?: number;
};

/** Слайдер фото: горизонтальная или вертикальная прокрутка. */
export type SlidesBlock = {
  kind: "slides";
  enabled: boolean;
  orientation: "horizontal" | "vertical";
  items: SlideItem[];
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type MapBlock = {
  kind: "map";
  enabled: boolean;
  /** Адрес для карты и ссылки */
  address: string;
  /** Слева в шапке, напр. «10:00» */
  eventTime?: string;
  /** Слева под временем, напр. «26.12.2025» */
  eventDate?: string;
  /** Заголовок места справа */
  venueTitle?: string;
  /** Подзаголовок (золотистый акцент) */
  venueSubtitle?: string;
  /** Текст под заголовком (курсив) */
  venueDescription?: string;
  /** Цвет рамки вокруг карты (CSS), напр. #2ec4b6 */
  mapBorderColor?: string;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

/** Список пожеланий гостей (имя + текст), данные с сервера */
export type WishesBlock = {
  kind: "wishes";
  enabled: boolean;
  title?: string;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

/** Форма отправки пожелания */
export type WishesFormBlock = {
  kind: "wishesForm";
  enabled: boolean;
  title?: string;
  namePlaceholder?: string;
  textPlaceholder?: string;
} & BlockChrome & {
  style?: Partial<BlockStyle>;
};

export type InviteBlock =
  | NavBlock
  | CalendarBlock
  | CountdownBlock
  | PaletteBlock
  | NamesBlock
  | RsvpBlock
  | MessageBlock
  | TextBlock
  | GiftsBlock
  | SurveyBlock
  | ScheduleBlock
  | VideoBlock
  | StoryBlock
  | SlidesBlock
  | MapBlock
  | WishesBlock
  | WishesFormBlock;

export type InviteDoc = {
  slug: string;
  global: GlobalStyle;
  blocks: InviteBlock[];
  audioUrl?: string;
};

export function mergeBlockStyle(base: BlockStyle, override?: Partial<BlockStyle>): BlockStyle {
  return {
    bgOpacity: override?.bgOpacity ?? base.bgOpacity,
    blurPx: override?.blurPx ?? base.blurPx,
    radiusPx: override?.radiusPx ?? base.radiusPx,
  };
}

/** Заголовок секции блока: per-block или глобально */
export function blockShowsSectionTitle(b: InviteBlock, globalTitlesOn: boolean): boolean {
  if (b.showTitle === false) return false;
  if (b.showTitle === true) return true;
  return globalTitlesOn;
}

/** Рамка карточки (обводка) */
export function blockShowsBorder(b: InviteBlock): boolean {
  return b.showBorder !== false;
}

export function blockCardBorderClass(b: InviteBlock): string {
  return blockShowsBorder(b) ? "border border-white/10" : "border-0";
}

