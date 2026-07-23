export function aqiColor(aqi: number): string {
  if (aqi <= 50) return "#1a9850";
  if (aqi <= 100) return "#ffd700";
  if (aqi <= 200) return "#ff6b6b";
  if (aqi <= 300) return "#ff4500";
  return "#8b0000";
}

export function categoryForAqi(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  return "Severe";
}

