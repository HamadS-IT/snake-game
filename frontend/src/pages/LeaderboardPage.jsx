import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { api } from "../api/client";

const MEDALS = ["🥇", "🥈", "🥉"];
const PAGE_SIZE = 10;

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [best, setBest] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.leaderboard(10).then(setLeaderboard).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    api
      .myScores(PAGE_SIZE, historyPage * PAGE_SIZE)
      .then((data) => {
        setBest(data.best);
        setHistory({ items: data.history, total: data.total });
      })
      .catch((err) => setError(err.message));
  }, [historyPage]);

  const totalPages = history ? Math.max(1, Math.ceil(history.total / PAGE_SIZE)) : 1;

  return (
    <div className="page leaderboard-page">
      <NavBar active="leaderboard" />

      <h1 className="page-title">Leaderboard</h1>

      {error && <p className="error">{error}</p>}

      {best !== null && (
        <div className="stat-card">
          <div className="stat-card-icon">🏆</div>
          <div className="stat-card-body">
            <span className="stat-card-label">Your Best Score</span>
            <span className="stat-card-value">{best.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Top 10 Players</h2>
        {leaderboard ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Best Score</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={entry.username} className={i < 3 ? "top-row" : ""}>
                    <td>{MEDALS[i] || i + 1}</td>
                    <td>{entry.username}</td>
                    <td className="mono">{entry.points}</td>
                    <td className="mono">{entry.level_reached}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Loading...</p>
        )}
      </div>

      <div className="panel">
        <h2 className="panel-title">My History{history ? ` (${history.total})` : ""}</h2>
        {history ? (
          <>
            <ul className="history-list">
              {history.items.map((s) => (
                <li key={s.id}>
                  <span>{new Date(s.created_at).toLocaleString()}</span>
                  <span className="mono">
                    {s.points} pts · level {s.level_reached}
                  </span>
                </li>
              ))}
              {history.items.length === 0 && (
                <li className="muted">No games played yet.</li>
              )}
            </ul>
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                  disabled={historyPage === 0}
                >
                  Prev
                </button>
                <span className="pagination-label">
                  Page {historyPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={historyPage >= totalPages - 1}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="muted">Loading...</p>
        )}
      </div>
    </div>
  );
}
