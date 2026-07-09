// Open-Meteo API — free, no API key required
// Docs: https://open-meteo.com/en/docs

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  icon: string;
  isDay: boolean;
  uvIndex: number;
  precipitation: number;
  precipitationProbability: number;
  forecast: DayForecast[];
}

export interface DayForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitationSum: number;
  weatherCode: number;
  description: string;
  icon: string;
}

// WMO Weather Code mappings
export function getWeatherDescription(code: number): { description: string; icon: string } {
  const codes: Record<number, { description: string; icon: string }> = {
    0: { description: "Clear sky", icon: "☀️" },
    1: { description: "Mainly clear", icon: "🌤️" },
    2: { description: "Partly cloudy", icon: "⛅" },
    3: { description: "Overcast", icon: "☁️" },
    45: { description: "Fog", icon: "🌫️" },
    48: { description: "Depositing rime fog", icon: "🌫️" },
    51: { description: "Light drizzle", icon: "🌦️" },
    53: { description: "Moderate drizzle", icon: "🌦️" },
    55: { description: "Dense drizzle", icon: "🌧️" },
    61: { description: "Slight rain", icon: "🌧️" },
    63: { description: "Moderate rain", icon: "🌧️" },
    65: { description: "Heavy rain", icon: "🌧️" },
    71: { description: "Slight snow", icon: "🌨️" },
    73: { description: "Moderate snow", icon: "🌨️" },
    75: { description: "Heavy snow", icon: "❄️" },
    80: { description: "Slight showers", icon: "🌦️" },
    81: { description: "Moderate showers", icon: "🌧️" },
    82: { description: "Violent showers", icon: "⛈️" },
    95: { description: "Thunderstorm", icon: "⛈️" },
    96: { description: "Thunderstorm with hail", icon: "⛈️" },
    99: { description: "Thunderstorm with heavy hail", icon: "⛈️" },
  };
  return codes[code] ?? { description: "Unknown", icon: "🌡️" };
}

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lon.toString());
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,uv_index"
  );
  url.searchParams.set(
    "hourly",
    "precipitation_probability"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
  );
  url.searchParams.set("timezone", "Africa/Accra");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!res.ok) throw new Error("Failed to fetch weather data");

  const data = await res.json();
  const current = data.current;
  const daily = data.daily;

  const { description, icon } = getWeatherDescription(current.weather_code);

  // Get current hour's precipitation probability
  const currentHourIndex = new Date().getHours();
  const precipProb = data.hourly?.precipitation_probability?.[currentHourIndex] ?? 0;

  const forecast: DayForecast[] = (daily.time as string[]).slice(1, 6).map(
    (date: string, i: number) => {
      const { description: desc, icon: ic } = getWeatherDescription(daily.weather_code[i + 1]);
      return {
        date,
        maxTemp: Math.round(daily.temperature_2m_max[i + 1]),
        minTemp: Math.round(daily.temperature_2m_min[i + 1]),
        precipitationSum: daily.precipitation_sum[i + 1],
        weatherCode: daily.weather_code[i + 1],
        description: desc,
        icon: ic,
      };
    }
  );

  return {
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    humidity: current.relative_humidity_2m,
    windSpeed: Math.round(current.wind_speed_10m),
    weatherCode: current.weather_code,
    description,
    icon,
    isDay: current.is_day === 1,
    uvIndex: current.uv_index ?? 0,
    precipitation: current.precipitation ?? 0,
    precipitationProbability: precipProb,
    forecast,
  };
}

export function getAgricultureAdvice(weather: WeatherData): string {
  const { temperature, humidity, precipitationProbability, uvIndex } = weather;

  if (precipitationProbability > 70) {
    return "High chance of rain. Delay harvest if possible and cover stored produce.";
  }
  if (temperature > 38) {
    return "Extreme heat alert. Irrigate early morning, cover delicate crops, transport produce only in the evening.";
  }
  if (temperature > 32 && humidity > 70) {
    return "Hot and humid — ideal for fungal disease. Monitor crops closely and ensure good ventilation.";
  }
  if (uvIndex > 8) {
    return "Very high UV. Harvest tomatoes and peppers in the morning for best quality.";
  }
  if (humidity < 30) {
    return "Very dry conditions. Increase irrigation frequency to prevent wilting.";
  }
  return "Conditions are suitable for farming activities. Good day for harvesting and transport.";
}
