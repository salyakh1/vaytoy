/** Google Maps: поиск по адресу без отдельного API-ключа (встраиваемый режим). */
export function googleMapsEmbedUrl(address: string): string {
  const q = encodeURIComponent(address.trim() || "Москва");
  return `https://maps.google.com/maps?q=${q}&hl=ru&z=15&output=embed`;
}

export function googleMapsExternalUrl(address: string): string {
  const q = encodeURIComponent(address.trim());
  return `https://maps.google.com/?q=${q}`;
}
