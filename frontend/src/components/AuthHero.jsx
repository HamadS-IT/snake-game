const FEATURES = [
  { icon: "🎨", text: "Snake shifts color with every bite" },
  { icon: "👾", text: "Enemy snakes hunt you as you grow" },
  { icon: "⚡", text: "Power mode turns predator into prey" },
  { icon: "🏆", text: "Climb the global leaderboard" },
];

export default function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="auth-hero-logo">🐍</div>
      <h1 className="brand-text">SNAKE</h1>
      <p className="auth-hero-tag">Chase the glow. Outlast the swarm. Own the board.</p>
      <ul className="auth-features">
        {FEATURES.map((f) => (
          <li key={f.text}>
            <span className="auth-feature-icon">{f.icon}</span>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
