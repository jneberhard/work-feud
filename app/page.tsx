"use client";

import { useMemo, useState } from "react";

type Answer = { text: string; points: number };
type Round = { question: string; answers: Answer[] };
type Team = { name: string; players: string[]; score: number };

const ROUNDS: Round[] = [
  {
    question: "Name something people do first thing on a workday.",
    answers: [
      { text: "Check email", points: 32 },
      { text: "Get coffee", points: 27 },
      { text: "Check the calendar", points: 18 },
      { text: "Say hello to the team", points: 13 },
      { text: "Make a to-do list", points: 10 },
    ],
  },
  {
    question: "Name something you might find in an office break room.",
    answers: [
      { text: "Coffee maker", points: 35 },
      { text: "Refrigerator", points: 25 },
      { text: "Microwave", points: 20 },
      { text: "Snacks", points: 12 },
      { text: "Mugs", points: 8 },
    ],
  },
  {
    question: "Name a reason someone might be late to a meeting.",
    answers: [
      { text: "Another meeting ran long", points: 38 },
      { text: "Lost track of time", points: 24 },
      { text: "Tech trouble", points: 19 },
      { text: "Traffic", points: 11 },
      { text: "Wrong room", points: 8 },
    ],
  },
  {
    question: "Name something that makes a great teammate.",
    answers: [
      { text: "Good communication", points: 31 },
      { text: "Reliable", points: 26 },
      { text: "Helpful", points: 21 },
      { text: "Positive attitude", points: 14 },
      { text: "Sense of humor", points: 8 },
    ],
  },
  {
    question: "Name something people look forward to on Friday.",
    answers: [
      { text: "The weekend", points: 41 },
      { text: "Leaving early", points: 22 },
      { text: "Happy hour", points: 17 },
      { text: "Casual clothes", points: 12 },
      { text: "No alarm tomorrow", points: 8 },
    ],
  },
];

const STARTING_TEAMS: Team[] = [
  {
    name: "The Brainstormers",
    players: ["Alex", "Jordan", "Taylor", "Morgan", "Casey"],
    score: 0,
  },
  {
    name: "Deadline Dynasty",
    players: ["Riley", "Cameron", "Avery", "Quinn", "Drew"],
    score: 0,
  },
];

function Logo() {
  return (
    <div className="brand" aria-label="Work Feud">
      <span className="brand-work">WORK</span>
      <span className="brand-feud">FEUD</span>
    </div>
  );
}

function TeamEditor({
  team,
  index,
  onChange,
}: {
  team: Team;
  index: number;
  onChange: (team: Team) => void;
}) {
  return (
    <section className={`team-editor team-${index + 1}`}>
      <div className="team-number">TEAM {index + 1}</div>
      <label>
        Team name
        <input
          value={team.name}
          onChange={(event) => onChange({ ...team, name: event.target.value })}
          maxLength={28}
        />
      </label>
      <div className="player-fields">
        {team.players.map((player, playerIndex) => (
          <label key={playerIndex}>
            Player {playerIndex + 1}
            <input
              value={player}
              onChange={(event) => {
                const players = [...team.players];
                players[playerIndex] = event.target.value;
                onChange({ ...team, players });
              }}
              maxLength={20}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [teams, setTeams] = useState<Team[]>(STARTING_TEAMS);
  const [roundIndex, setRoundIndex] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [strikes, setStrikes] = useState(0);
  const [activeTeam, setActiveTeam] = useState(0);
  const [roundAwarded, setRoundAwarded] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  const round = ROUNDS[roundIndex];
  const roundPoints = useMemo(
    () => revealed.reduce((sum, index) => sum + round.answers[index].points, 0),
    [revealed, round],
  );
  const gameFinished = roundIndex === ROUNDS.length - 1 && roundAwarded;

  const updateTeam = (index: number, team: Team) => {
    setTeams((current) => current.map((item, i) => (i === index ? team : item)));
  };

  const revealAnswer = (index: number) => {
    if (roundAwarded) return;
    setRevealed((current) =>
      current.includes(index) ? current : [...current, index],
    );
  };

  const awardRound = (teamIndex: number) => {
    if (roundAwarded || roundPoints === 0) return;
    setTeams((current) =>
      current.map((team, index) =>
        index === teamIndex ? { ...team, score: team.score + roundPoints } : team,
      ),
    );
    setRoundAwarded(true);
    setActiveTeam(teamIndex);
  };

  const nextRound = () => {
    if (roundIndex >= ROUNDS.length - 1) return;
    setRoundIndex((current) => current + 1);
    setRevealed([]);
    setStrikes(0);
    setRoundAwarded(false);
    setActiveTeam((current) => (current === 0 ? 1 : 0));
  };

  const resetGame = () => {
    setTeams((current) => current.map((team) => ({ ...team, score: 0 })));
    setRoundIndex(0);
    setRevealed([]);
    setStrikes(0);
    setRoundAwarded(false);
    setActiveTeam(0);
    setStarted(false);
  };

  if (!started) {
    return (
      <main className="setup-shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <header className="setup-header">
          <Logo />
          <div className="host-chip"><span /> HOST SETUP</div>
        </header>
        <section className="setup-intro">
          <p className="eyebrow">THE ULTIMATE OFFICE SHOWDOWN</p>
          <h1>Bring the survey board<br />to your <em>workplace.</em></h1>
          <p className="intro-copy">
            Set your teams, gather your coworkers, and get ready to find the
            most popular answers on the board.
          </p>
        </section>
        <div className="setup-grid">
          {teams.map((team, index) => (
            <TeamEditor
              key={index}
              team={team}
              index={index}
              onChange={(updated) => updateTeam(index, updated)}
            />
          ))}
        </div>
        <div className="setup-actions">
          <button
            className="primary-button"
            onClick={() => setStarted(true)}
            disabled={teams.some((team) => !team.name.trim())}
          >
            START THE SHOW <span aria-hidden="true">→</span>
          </button>
          <p>5 rounds · 10 players · bragging rights included</p>
        </div>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <Logo />
        <div className="round-label">ROUND {roundIndex + 1} <span>OF {ROUNDS.length}</span></div>
        <button className="reset-button" onClick={resetGame}>NEW GAME</button>
      </header>

      <section className="score-row" aria-label="Team scores">
        {teams.map((team, index) => (
          <button
            key={team.name}
            className={`score-card team-${index + 1} ${activeTeam === index ? "active" : ""}`}
            onClick={() => !roundAwarded && setActiveTeam(index)}
            aria-pressed={activeTeam === index}
          >
            <div>
              <span className="team-kicker">{activeTeam === index ? "IN CONTROL" : `TEAM ${index + 1}`}</span>
              <strong>{team.name || `Team ${index + 1}`}</strong>
              <small>{team.players.filter(Boolean).join(" · ")}</small>
            </div>
            <b>{team.score}</b>
          </button>
        ))}
      </section>

      <section className="board-wrap">
        <div className="board-lights" aria-hidden="true" />
        <div className="question-card">
          <span>SURVEY SAYS</span>
          <h1>{round.question}</h1>
        </div>
        <div className="answers-grid">
          {round.answers.map((answer, index) => {
            const isRevealed = revealed.includes(index);
            return (
              <button
                key={answer.text}
                className={`answer-tile ${isRevealed ? "revealed" : ""}`}
                onClick={() => revealAnswer(index)}
                aria-label={isRevealed ? `${answer.text}, ${answer.points} points` : `Reveal answer ${index + 1}`}
              >
                <span className="answer-number">{index + 1}</span>
                <span className="answer-text">{isRevealed ? answer.text : ""}</span>
                <strong>{isRevealed ? answer.points : ""}</strong>
              </button>
            );
          })}
        </div>
        <div className="round-status">
          <div className="strikes" aria-label={`${strikes} strikes`}>
            {[0, 1, 2].map((strike) => (
              <span key={strike} className={strike < strikes ? "shown" : ""}>×</span>
            ))}
          </div>
          <div className="round-bank"><span>ROUND BANK</span><strong>{roundPoints}</strong></div>
        </div>
      </section>

      <section className={`host-panel ${controlsOpen ? "open" : ""}`}>
        <button className="host-panel-toggle" onClick={() => setControlsOpen((value) => !value)}>
          <span>HOST CONTROLS</span><b>{controlsOpen ? "HIDE" : "SHOW"}</b>
        </button>
        {controlsOpen && (
          <div className="host-controls">
            <div className="control-group">
              <span>ANSWERS</span>
              <button onClick={() => setRevealed(round.answers.map((_, index) => index))}>REVEAL ALL</button>
              <button onClick={() => setRevealed([])} disabled={roundAwarded}>HIDE ALL</button>
            </div>
            <div className="control-group">
              <span>STRIKES</span>
              <button className="strike-button" onClick={() => setStrikes((value) => Math.min(3, value + 1))} disabled={strikes === 3 || roundAwarded}>+ STRIKE</button>
              <button onClick={() => setStrikes(0)} disabled={strikes === 0 || roundAwarded}>CLEAR</button>
            </div>
            <div className="control-group award-group">
              <span>AWARD {roundPoints} POINTS</span>
              {teams.map((team, index) => (
                <button key={team.name} onClick={() => awardRound(index)} disabled={roundPoints === 0 || roundAwarded}>
                  {team.name}
                </button>
              ))}
            </div>
            <button className="next-button" onClick={gameFinished ? resetGame : nextRound} disabled={!roundAwarded && !gameFinished}>
              {gameFinished ? "PLAY AGAIN" : roundIndex === ROUNDS.length - 1 ? "FINISH GAME" : "NEXT ROUND"} <span>→</span>
            </button>
          </div>
        )}
      </section>

      {gameFinished && (
        <div className="winner-banner" role="status">
          <span>🏆</span>
          <div><small>WORK-FEUD CHAMPIONS</small><strong>{teams[0].score >= teams[1].score ? teams[0].name : teams[1].name}</strong></div>
        </div>
      )}
    </main>
  );
}
