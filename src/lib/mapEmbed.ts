/** Google Maps: поиск по адресу без отдельного API-ключа (встраиваемый режим). */
export function googleMapsEmbedUrl(address: string): string {
  const q = encodeURIComponent(address.trim() || "Москва");
  return `https://maps.google.com/maps?q=${q}&hl=ru&z=15&output=embed`;
}

/** Ссылка для href / десктоп / SSR: открывается в браузере без обязательного приложения Google Maps. */
export function mapsWebFallbackUrl(address: string): string {
  const q = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** @deprecated Используйте mapsWebFallbackUrl или openMapsPreferred */
export function googleMapsExternalUrl(address: string): string {
  return mapsWebFallbackUrl(address);
}

function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

/**
 * Открывает карты, предпочтительно нативные: iOS → Apple Maps, Android → geo: (приложение по умолчанию).
 * Иначе — поиск в Google Maps в новой вкладке.
 */
export function openMapsPreferred(address: string): void {
  const trimmed = address.trim();
  if (!trimmed) return;
  const q = encodeURIComponent(trimmed);
  if (typeof window === "undefined") return;
  const ua = navigator.userAgent || "";
  if (isIOS(ua)) {
    window.location.assign(`https://maps.apple.com/?q=${q}`);
    return;
  }
  if (isAndroid(ua)) {
    window.location.assign(`geo:0,0?q=${q}`);
    return;
  }
  window.open(mapsWebFallbackUrl(trimmed), "_blank", "noopener,noreferrer");
}
