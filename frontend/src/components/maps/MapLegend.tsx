const items = [
  ["#1a9850", "Good 0-50"],
  ["#ffd700", "Satisfactory 51-100"],
  ["#ff6b6b", "Moderate 101-200"],
  ["#ff4500", "Poor 201-300"],
  ["#8b0000", "Severe 300+"]
];

export function MapLegend() {
  return (
    <div className="map-legend" aria-label="AQI legend">
      {items.map(([color, label]) => (
        <div className="legend-item" key={label}>
          <span style={{ backgroundColor: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}

