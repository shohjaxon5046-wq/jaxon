/**
 * Currency service for real-time USD/UZS exchange rate
 */
export async function fetchLiveExchangeRate(): Promise<number | null> {
  try {
    // Try Central Bank of Uzbekistan API first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const cbuRes = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (cbuRes.ok) {
      const data = await cbuRes.json();
      if (Array.isArray(data) && data[0]?.Rate) {
        const parsed = parseFloat(data[0].Rate);
        if (!isNaN(parsed) && parsed > 10000) {
          return Math.round(parsed);
        }
      }
    }
  } catch {
    // Fallback to open exchange rate API
    try {
      const fallbackRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data?.rates?.UZS) {
          const parsed = parseFloat(data.rates.UZS);
          if (!isNaN(parsed) && parsed > 10000) {
            return Math.round(parsed);
          }
        }
      }
    } catch {
      // Offline or network error
    }
  }

  return null;
}
