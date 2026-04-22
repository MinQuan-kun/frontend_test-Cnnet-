import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Activity, Radio, Clock3, Gauge, Gamepad2, Zap, Database, History } from 'lucide-react';
import { ballSquareGraphqlApi } from '../api/graphqlClient';

const MAX_LOGS = 100;

const formatMs = (value) => `${Number(value || 0).toFixed(2)} ms`;

const style = document.createElement('style');
style.textContent = `
  @keyframes highlightPulse {
    0% { background-color: rgba(124, 58, 242, 0); }
    50% { background-color: rgba(124, 58, 242, 0.3); }
    100% { background-color: rgba(124, 58, 242, 0); }
  }
  .highlight-update { animation: highlightPulse 1s ease-in-out; }
`;
document.head.appendChild(style);

const GameDemoPage = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [errors, setErrors] = useState(0);
  const [lastError, setLastError] = useState('');

  const [graphqlLogs, setGraphqlLogs] = useState([]);
  const [graphqlLeaderboard, setGraphqlLeaderboard] = useState([]);
  const [graphqlErrors, setGraphqlErrors] = useState(0);
  const [graphqlLastError, setGraphqlLastError] = useState('');
  const [matchSaved, setMatchSaved] = useState(null);
  const [recentGraphQLMatches, setRecentGraphQLMatches] = useState([]);
  const [leaderboardUpdated, setLeaderboardUpdated] = useState(false);
  const [pollTrigger, setPollTrigger] = useState(0);

  // Player info state for 1v1 mode
  const [redPlayer, setRedPlayer] = useState(() => ({
    id: localStorage.getItem('redPlayerId') || `red_${Date.now()}`,
    name: localStorage.getItem('redPlayerName') || 'Red Player'
  }));

  const [bluePlayer, setBluePlayer] = useState(() => ({
    id: localStorage.getItem('bluePlayerId') || `blue_${Date.now()}`,
    name: localStorage.getItem('bluePlayerName') || 'Blue Player'
  }));

  const [tempRedName, setTempRedName] = useState(redPlayer.name);
  const [tempBlueName, setTempBlueName] = useState(bluePlayer.name);
  const [showPlayerForm, setShowPlayerForm] = useState(false);

  // Sync temp names when players loaded from localStorage
  useEffect(() => {
    setTempRedName(redPlayer.name);
    setTempBlueName(bluePlayer.name);
    console.log(`📍 Players loaded from localStorage: 🔴 ${redPlayer.id} (${redPlayer.name}) | 🔵 ${bluePlayer.id} (${bluePlayer.name})`);
  }, []);

  // Save 2-player setup
  const handleSave2Players = () => {
    const newRed = { ...redPlayer, name: tempRedName };
    const newBlue = { ...bluePlayer, name: tempBlueName };

    setRedPlayer(newRed);
    setBluePlayer(newBlue);
    localStorage.setItem('redPlayerId', newRed.id);
    localStorage.setItem('redPlayerName', newRed.name);
    localStorage.setItem('bluePlayerId', newBlue.id);
    localStorage.setItem('bluePlayerName', newBlue.name);
    setShowPlayerForm(false);

    console.log(`📤 Sending setup-2players to game frame: 🔴 RED: ${newRed.id} (${newRed.name}) | 🔵 BLUE: ${newBlue.id} (${newBlue.name})`);

    // Notify game frame with both players
    const frame = document.querySelector('iframe[title="Ball Square TT"]');
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage({
        source: 'frontend_game_demo',
        type: 'setup-2players',
        redPlayer: newRed,
        bluePlayer: newBlue,
      }, '*');
    } else {
      console.error('❌ Game frame not found or contentWindow not accessible');
    }
  };

  const gameUrl =
    import.meta.env.VITE_BALL_GAME_URL ||
    'http://localhost:4000/Ball_Square_TT/';

  useEffect(() => {
    const handleTelemetry = (event) => {
      const data = event?.data;
      if (!data || data.source !== 'ball_square_tt') return;

      if (data.type === 'telemetry-log') {
        const logEntry = {
          id: `${Date.now()}_${Math.random()}`,
          ts: new Date().toLocaleTimeString('vi-VN'),
          eventType: data.eventType,
          rttMs: Number(data.rttMs || 0),
          note: data.payload?.note || '',
          redPct: Number(data.payload?.redPct || 0),
          bluePct: Number(data.payload?.bluePct || 0),
          bounceCount: Number(data.payload?.bounceCount || 0),
        };

        setLogs((prev) => [logEntry, ...prev].slice(0, MAX_LOGS));
      }

      if (data.type === 'telemetry-summary') {
        setSummary(data.summary || null);
      }

      if (data.type === 'telemetry-error') {
        setErrors((value) => value + 1);
        setLastError(data.message || 'Telemetry error');
      }

      // Capture match result when game ends
      if (data.type === 'telemetry-end') {
        const matchResult = data.payload || {};
        const winner = matchResult.redPct > matchResult.bluePct ? 0 : matchResult.bluePct > matchResult.redPct ? 1 : -1;

        // Use player info from game frame if available, otherwise from state
        const red = data.redPlayer || redPlayer;
        const blue = data.bluePlayer || bluePlayer;

        console.log(`🏁 Match ended. Using player IDs: 🔴 RED: ${red.id} (${red.name}) [${data.redPlayer ? 'FROM GAME' : 'FROM FRONTEND'}] | 🔵 BLUE: ${blue.id} (${blue.name}) [${data.bluePlayer ? 'FROM GAME' : 'FROM FRONTEND'}]`);

        // Show visual feedback immediately
        setMatchSaved({
          winner,
          redPct: matchResult.redPct,
          bluePct: matchResult.bluePct,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          redName: red.name,
          blueName: blue.name,
        });

        // Auto clear notification after 3s
        setTimeout(() => setMatchSaved(null), 3000);

        // Save match result for BOTH players
        const saveResultAsync = async () => {
          try {
            // Save RED player result
            const redInput = {
              playerId: red.id,
              winner: winner === 0 ? "RED" : winner === 1 ? "BLUE" : "DRAW",
              redTerritory: matchResult.redPct || 0,
              blueTerritory: matchResult.bluePct || 0,
              duration: matchResult.duration || 0,
              skills: matchResult.skills || [],
            };
            console.log('📤 [1/2] Sending RED player mutation:', redInput);
            const redResult = await ballSquareGraphqlApi.saveMatchResult(redInput);
            console.log('✅ [1/2] RED player result saved:', { ...redInput, response: redResult });

            // Save BLUE player result
            const blueInput = {
              playerId: blue.id,
              winner: winner === 1 ? "RED" : winner === 0 ? "BLUE" : "DRAW",
              redTerritory: matchResult.redPct || 0,
              blueTerritory: matchResult.bluePct || 0,
              duration: matchResult.duration || 0,
              skills: matchResult.skills || [],
            };
            console.log('📤 [2/2] Sending BLUE player mutation:', blueInput);
            const blueResult = await ballSquareGraphqlApi.saveMatchResult(blueInput);
            console.log('✅ [2/2] BLUE player result saved:', { ...blueInput, response: blueResult });
            
            // Refresh leaderboard immediately after saving both results
            setPollTrigger(prev => prev + 1); 

            // Add to local UI history for clarity
            const newMatch = {
              id: Date.now().toString(),
              winner: winner === 0 ? "RED" : winner === 1 ? "BLUE" : "DRAW",
              redName: red.name,
              blueName: blue.name,
              redPct: Number(matchResult.redPct) || 0,
              bluePct: Number(matchResult.bluePct) || 0,
              bounces: matchResult.bounceCount || 0,
              duration: matchResult.duration || 0,
              timestamp: new Date().toLocaleTimeString('vi-VN'),
            };
            setRecentGraphQLMatches(prev => [newMatch, ...prev].slice(0, 5));
          } catch (err) {
            console.error('❌ Failed to save match result:', err.message || err);
            console.error('Full error:', err);
          }
        };
        saveResultAsync();
      }
    };

    window.addEventListener('message', handleTelemetry);
    return () => window.removeEventListener('message', handleTelemetry);
  }, []);

  useEffect(() => {
    const askSummary = () => {
      const frame = document.querySelector('iframe[title="Ball Square TT"]');
      if (!frame?.contentWindow) return;
      frame.contentWindow.postMessage({ source: 'frontend_game_demo', type: 'request-telemetry-summary' }, '*');
    };

    const id = setInterval(askSummary, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pollGraphQL = async () => {
      const startedAt = performance.now();

      try {
        const leaderboardResponse = await ballSquareGraphqlApi.fetchLeaderboard(5);
        const leaderboardRttMs = performance.now() - startedAt;
        const rows = leaderboardResponse?.data?.leaderboard || [];
        const topPlayer = rows[0] || null;

        const leaderboardLog = {
          id: `${Date.now()}_${Math.random()}`,
          ts: new Date().toLocaleTimeString('vi-VN'),
          eventType: 'leaderboard_query',
          rttMs: leaderboardRttMs,
          note: topPlayer
            ? `Top ${topPlayer.playerName} | ${Number(topPlayer.winRate || 0).toFixed(1)}% win rate`
            : 'No leaderboard data',
          rows: rows.length,
        };

        if (cancelled) return;

        setGraphqlLeaderboard(rows);
        setGraphqlLogs((prev) => [leaderboardLog, ...prev].slice(0, MAX_LOGS));

        // Highlight leaderboard when updated
        setLeaderboardUpdated(true);
        setTimeout(() => setLeaderboardUpdated(false), 1000);

        setGraphqlLastError('');
      } catch (error) {
        if (cancelled) return;
        setGraphqlErrors((value) => value + 1);
        setGraphqlLastError(error.message || 'GraphQL query error');
      }
    };

    pollGraphQL();
    const id = setInterval(pollGraphQL, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollTrigger]);

  const gRPCStats = useMemo(() => {
    if (logs.length === 0) {
      return { avgRtt: 0, minRtt: 0, maxRtt: 0 };
    }

    const values = logs.map((item) => item.rttMs);
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      avgRtt: total / values.length,
      minRtt: Math.min(...values),
      maxRtt: Math.max(...values),
    };
  }, [logs]);

  const graphqlStats = useMemo(() => {
    if (graphqlLogs.length === 0) {
      return { avgRtt: 0, minRtt: 0, maxRtt: 0 };
    }

    const values = graphqlLogs.map((item) => item.rttMs);
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      avgRtt: total / values.length,
      minRtt: Math.min(...values),
      maxRtt: Math.max(...values),
    };
  }, [graphqlLogs]);

  const graphqlLeader = graphqlLeaderboard[0] || null;
  const graphqlRunnerUp = graphqlLeaderboard[1] || null;
  const graphqlLeadMargin = graphqlLeader && graphqlRunnerUp
    ? Math.max(Number(graphqlLeader.wins || 0) - Number(graphqlRunnerUp.wins || 0), 0)
    : null;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <nav className="bg-[#0d1225]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 hover:bg-white/10 rounded-xl transition-all" title="Quay lại">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-cyan-400" />
              <h1 className="text-lg font-bold">
                Ball Square TT <span className="text-cyan-300">1v1 Match</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <span className="text-red-300 font-semibold">🔴 {redPlayer.name}</span>
            </div>
            <div className="text-slate-500">vs</div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <span className="text-blue-300 font-semibold">🔵 {bluePlayer.name}</span>
            </div>
            <button
              onClick={() => setShowPlayerForm(!showPlayerForm)}
              className="ml-2 px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded text-xs transition-all"
            >
              {showPlayerForm ? 'Close' : 'Setup'}
            </button>
          </div>
        </div>

        {/* 2-Player Setup Form */}
        {showPlayerForm && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-cyan-500/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RED Player */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-sm font-bold text-red-300 mb-3">🔴 RED Player</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Player ID</label>
                    <input
                      type="text"
                      value={redPlayer.id}
                      onChange={(e) => setRedPlayer({ ...redPlayer, id: e.target.value })}
                      placeholder="red_player_id"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Player Name</label>
                    <input
                      type="text"
                      value={tempRedName}
                      onChange={(e) => setTempRedName(e.target.value)}
                      placeholder="Red player name"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* BLUE Player */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-sm font-bold text-blue-300 mb-3">🔵 BLUE Player</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Player ID</label>
                    <input
                      type="text"
                      value={bluePlayer.id}
                      onChange={(e) => setBluePlayer({ ...bluePlayer, id: e.target.value })}
                      placeholder="blue_player_id"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Player Name</label>
                    <input
                      type="text"
                      value={tempBlueName}
                      onChange={(e) => setTempBlueName(e.target.value)}
                      placeholder="Blue player name"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave2Players}
              className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg text-sm font-semibold transition-all"
            >
              Start Match
            </button>
          </div>
        )}
      </nav>

      {/* Match Saved Notification */}
      {matchSaved && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-pulse">
          <div className={`rounded-xl px-6 py-3 flex items-center gap-3 shadow-lg border`}
            style={{
              backgroundColor: matchSaved.winner === 0 ? 'rgba(220, 38, 38, 0.15)' : matchSaved.winner === 1 ? 'rgba(37, 99, 235, 0.15)' : 'rgba(249, 115, 22, 0.15)',
              borderColor: matchSaved.winner === 0 ? 'rgb(220, 38, 38)' : matchSaved.winner === 1 ? 'rgb(37, 99, 235)' : 'rgb(249, 115, 22)',
            }}>
            <span className="text-2xl">
              {matchSaved.winner === 0 ? '🔴' : matchSaved.winner === 1 ? '🔵' : '🤝'}
            </span>
            <div className="text-sm">
              <p className="font-bold">
                {matchSaved.winner === 0
                  ? `${matchSaved.redName} WIN!`
                  : matchSaved.winner === 1
                    ? `${matchSaved.blueName} WIN!`
                    : 'DRAW!'}
              </p>
              <p className="text-xs opacity-75">
                {matchSaved.redName} vs {matchSaved.blueName} • {matchSaved.redPct.toFixed(0)}% vs {matchSaved.bluePct.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1800px] mx-auto p-6 flex flex-row gap-6">
        <section className="bg-[#111827]/80 rounded-2xl border border-white/10 overflow-hidden resize-x flex-shrink-0 w-[40%] min-w-[25%] max-w-[75%]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">Game Frame</p>
            <a href={gameUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200">
              Open standalone
            </a>
          </div>
          <iframe title="Ball Square TT" src={gameUrl} className="w-full h-[78vh] bg-black" allow="fullscreen" />
        </section>

        <aside className="flex-1 min-w-[300px] max-w-[50vw] resize-x space-y-4 max-h-[82vh] overflow-auto pr-2">
          <div className="bg-[#111827]/80 rounded-2xl border border-cyan-500/30 p-4 space-y-3 sticky top-0">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" /> gRPC Metrics
            </h2>
            <MetricRow label="Events" value={logs.length} />
            <MetricRow label="Errors" value={errors} />
            <MetricRow label="Avg RTT" value={formatMs(gRPCStats.avgRtt)} />
            <MetricRow label="Min RTT" value={formatMs(gRPCStats.minRtt)} />
            <MetricRow label="Max RTT" value={formatMs(gRPCStats.maxRtt)} />
            {lastError && <p className="text-[11px] text-rose-400 break-all">⚠️ {lastError}</p>}
          </div>

          <div className="bg-[#111827]/80 rounded-2xl border border-cyan-500/30 p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> gRPC Summary
            </h2>
            {summary ? (
              <div className="space-y-2 text-xs text-slate-300">
                <MetricRow label="Session" value={summary.sessionId?.slice(0, 8) || '-'} />
                <MetricRow label="Total events" value={summary.totalEvents} />
                <MetricRow label="Bounce" value={summary.bounceEvents} />
                <MetricRow label="Skill" value={summary.skillEvents} />
                <MetricRow label="Match end" value={summary.endEvents} />
                <MetricRow label="Events/s" value={Number(summary.eventsPerSecond || 0).toFixed(2)} />
              </div>
            ) : (
              <p className="text-xs text-slate-500">Chơi game để xem summary...</p>
            )}
          </div>

          <div className="bg-[#111827]/80 rounded-2xl border border-cyan-500/30 p-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-cyan-400" /> gRPC Logs
            </h2>
            <div className="max-h-[25vh] overflow-auto space-y-2 pr-1 resize-y min-h-[100px]">
              {logs.length === 0 && <p className="text-xs text-slate-500">Chưa có log...</p>}
              {logs.slice(0, 20).map((log) => (
                <div key={log.id} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-bold text-cyan-300">{log.eventType}</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock3 className="w-3 h-3" />
                      {log.ts}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">RTT {log.rttMs.toFixed(1)}ms</p>
                  <p className="text-slate-500 text-[10px]">
                    🔴 {log.redPct.toFixed(0)}% 🔵 {log.bluePct.toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <aside className="flex-1 min-w-[300px] max-w-[50vw] resize-x space-y-4 max-h-[82vh] overflow-auto pr-2">
          <div className="bg-[#111827]/80 rounded-2xl border border-violet-500/30 p-4 space-y-3 sticky top-0">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" /> GraphQL Metrics
            </h2>
            <MetricRow label="Queries" value={graphqlLogs.length} />
            <MetricRow label="Errors" value={graphqlErrors} />
            <MetricRow label="Avg RTT" value={formatMs(graphqlStats.avgRtt)} />
            <MetricRow label="Min RTT" value={formatMs(graphqlStats.minRtt)} />
            <MetricRow label="Max RTT" value={formatMs(graphqlStats.maxRtt)} />
            {graphqlLastError && <p className="text-[11px] text-rose-400 break-all">⚠️ {graphqlLastError}</p>}
          </div>

          <div className="bg-[#111827]/80 rounded-2xl border border-violet-500/30 p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-400" /> Post-Match Results (Saved to DB)
            </h2>
            <div className="space-y-2 max-h-[30vh] overflow-auto resize-y pr-1 min-h-[100px]">
              {recentGraphQLMatches.length === 0 && <p className="text-xs text-slate-500">Chưa có trận nào được lưu...</p>}
              {recentGraphQLMatches.map(m => (
                <div key={m.id} className={`rounded-lg border p-2 text-xs ${m.winner === 'RED' ? 'bg-red-500/10 border-red-500/30' : m.winner === 'BLUE' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                  <div className="flex justify-between font-bold mb-1">
                    <span className={m.winner === 'RED' ? 'text-red-400' : m.winner === 'BLUE' ? 'text-blue-400' : 'text-orange-400'}>
                      {m.winner === 'RED' ? `🔴 ${m.redName} WIN` : m.winner === 'BLUE' ? `🔵 ${m.blueName} WIN` : '🤝 DRAW'}
                    </span>
                    <span className="text-slate-500 font-normal">{m.timestamp}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Lãnh thổ: <span className="text-red-300">{(m.redPct || 0).toFixed(0)}%</span> - <span className="text-blue-300">{(m.bluePct || 0).toFixed(0)}%</span></span>
                    <span className="text-slate-400">Va chạm: {m.bounces} lần</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111827]/80 rounded-2xl border border-violet-500/30 p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <History className="w-4 h-4 text-violet-400" /> Leaderboard
            </h2>
            {graphqlLeader ? (
              <div className="space-y-3 text-xs text-slate-300">
                <div className={`rounded-xl border border-violet-400/30 bg-violet-500/10 p-4 space-y-2 ${leaderboardUpdated ? 'highlight-update' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-violet-300">Leading now</p>
                      <p className="text-lg font-bold text-white break-all">
                        {graphqlLeader.playerName || graphqlLeader.playerId || '-'}
                      </p>
                    </div>
                    <div className="rounded-full bg-violet-400/20 px-3 py-1 text-[11px] font-semibold text-violet-200 whitespace-nowrap">
                      #{graphqlLeader.rank || 1}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <MetricRow label="Wins" value={graphqlLeader.wins || 0} />
                    <MetricRow label="Win rate" value={`${Number(graphqlLeader.winRate || 0).toFixed(1)}%`} />
                    <MetricRow label="Matches" value={graphqlLeader.totalMatches || 0} />
                    <MetricRow label="Avg territory" value={`${Number(graphqlLeader.avgTerritory || 0).toFixed(1)}%`} />
                  </div>

                  <div className="pt-2 text-[11px] text-violet-400 font-medium">
                    Player #{graphqlLeader.rank || 1} on Leaderboard
                  </div>
                </div>

                <div className="space-y-2">
                  <MetricRow label="Players tracked" value={graphqlLeaderboard.length} />
                  <MetricRow label="Runner-up" value={graphqlRunnerUp?.playerName || graphqlRunnerUp?.playerId || '-'} />
                  <MetricRow
                    label="Lead margin"
                    value={graphqlLeadMargin !== null ? `${graphqlLeadMargin} wins ahead` : 'N/A'}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Đang chờ GraphQL query đầu tiên...</p>
            )}
          </div>

          <div className="bg-[#111827]/80 rounded-2xl border border-violet-500/30 p-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-violet-400" /> GraphQL Logs
            </h2>
            <div className="max-h-[25vh] overflow-auto space-y-2 pr-1 resize-y min-h-[100px]">
              {graphqlLogs.length === 0 && <p className="text-xs text-slate-500">Chưa có log...</p>}
              {graphqlLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-bold text-violet-300">{log.eventType}</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock3 className="w-3 h-3" />
                      {log.ts}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">RTT {log.rttMs.toFixed(1)}ms</p>
                  <p className="text-slate-500 text-[10px]">Rows {log.rows}</p>
                  <p className="text-slate-500 text-[10px]">{log.note}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

const MetricRow = ({ label, value }) => (
  <div className="flex justify-between text-xs">
    <span className="text-slate-400">{label}</span>
    <span className="text-slate-200 font-semibold">{value}</span>
  </div>
);

export default GameDemoPage;
