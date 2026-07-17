"use client";

import { type FormEvent, useMemo, useState } from "react";

type Answer = { text: string; points: number };
type Round = { question: string; answers: Answer[] };
type Team = { name: string; players: string[]; score: number };
type GamePhase = "faceoff" | "play" | "complete";
type FeedbackTone = "neutral" | "correct" | "strike";

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
    players: [],
    score: 0,
  },
  {
    name: "Deadline Dynasty",
    players: [],
    score: 0,
  },
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "another",
  "get",
  "make",
  "of",
  "on",
  "the",
  "to",
]);

function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemToken(token: string) {
  return token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token;
}

function answersMatch(guess: string, boardAnswer: string) {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedBoard = normalizeAnswer(boardAnswer);

  if (!normalizedGuess || !normalizedBoard) return false;
  if (normalizedGuess === normalizedBoard) return true;
  if (
    normalizedGuess.length >= 4 &&
    (normalizedBoard.includes(normalizedGuess) || normalizedGuess.includes(normalizedBoard))
  ) {
    return true;
  }

  const guessTokens = normalizedGuess
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map(stemToken);
  const boardTokens = normalizedBoard
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map(stemToken);

  return (
    guessTokens.length > 0 &&
    guessTokens.every((token) => boardTokens.includes(token))
  );
}

function Logo() {
  return (
    <div className="brand" aria-label="Work Feud">
      <span className="brand-work">WORK</span>
      <span className="brand-feud">FEUD</span>
    </div>
  );
}

function TeamCard({
  team,
  index,
  onNameChange,
}: {
  team: Team;
  index: number;
  onNameChange: (name: string) => void;
}) {
  return (
    <section className={`team-editor team-${index + 1}`}>
      <div className="team-card-heading">
        <div className="team-number">TEAM {index + 1}</div>
        <span>{team.players.length} {team.players.length === 1 ? "PLAYER" : "PLAYERS"}</span>
      </div>
      <label>
        Team name
        <input
          value={team.name}
          onChange={(event) => onNameChange(event.target.value)}
          maxLength={28}
        />
      </label>
      {team.players.length > 0 ? (
        <ol className="assigned-players">
          {team.players.map((player, playerIndex) => (
            <li key={`${player}-${playerIndex}`}>
              <span>{playerIndex + 1}</span>{player}
            </li>
          ))}
        </ol>
      ) : (
        <div className="team-empty">Players will appear here after the random draw.</div>
      )}
    </section>
  );
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [teams, setTeams] = useState<Team[]>(STARTING_TEAMS);
  const [roster, setRoster] = useState<string[]>([]);
  const [playerDraft, setPlayerDraft] = useState("");
  const [teamsDrawn, setTeamsDrawn] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [strikes, setStrikes] = useState(0);
  const [activeTeam, setActiveTeam] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("faceoff");
  const [roundAwarded, setRoundAwarded] = useState(false);
  const [faceOffTeam, setFaceOffTeam] = useState(0);
  const [faceOffPoints, setFaceOffPoints] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState(
    `${STARTING_TEAMS[0].name} gives the first face-off answer. No strike can be given.`,
  );
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("neutral");
  const [controlsOpen, setControlsOpen] = useState(true);

  const round = ROUNDS[roundIndex];
  const boardPoints = useMemo(
    () => revealed.reduce((sum, index) => sum + round.answers[index].points, 0),
    [revealed, round],
  );
  const gameFinished =
    roundIndex === ROUNDS.length - 1 && phase === "complete" && roundAwarded;

  const updateTeamName = (index: number, name: string) => {
    setTeams((current) =>
      current.map((team, teamIndex) =>
        teamIndex === index ? { ...team, name } : team,
      ),
    );
  };

  const clearTeamDraw = () => {
    setTeams((current) =>
      current.map((team) => ({ ...team, players: [], score: 0 })),
    );
    setTeamsDrawn(false);
  };

  const addPlayers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const names = playerDraft
      .split(/[,\n]/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setRoster((current) => [...current, ...names]);
    setPlayerDraft("");
    clearTeamDraw();
  };

  const removePlayer = (playerIndex: number) => {
    setRoster((current) => current.filter((_, index) => index !== playerIndex));
    clearTeamDraw();
  };

  const drawTeams = () => {
    if (roster.length < 2) return;
    const shuffled = [...roster];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    const teamPlayers: [string[], string[]] = [[], []];
    shuffled.forEach((player, index) => teamPlayers[index % 2].push(player));
    setTeams((current) =>
      current.map((team, index) => ({
        ...team,
        players: teamPlayers[index],
        score: 0,
      })),
    );
    setTeamsDrawn(true);
  };

  const awardPoints = (teamIndex: number, points: number) => {
    setTeams((current) =>
      current.map((team, index) =>
        index === teamIndex ? { ...team, score: team.score + points } : team,
      ),
    );
  };

  const completeRound = (message: string) => {
    setPhase("complete");
    setRoundAwarded(false);
    setFeedback(`${message} Host: choose which team receives the board total.`);
    setFeedbackTone("neutral");
  };

  const awardRound = (teamIndex: number) => {
    if (phase !== "complete" || roundAwarded) return;
    awardPoints(teamIndex, boardPoints);
    setRoundAwarded(true);
    setActiveTeam(teamIndex);
    setFeedback(`${teams[teamIndex].name} receives the ${boardPoints} round points.`);
    setFeedbackTone("correct");
  };

  const addStrike = () => {
    if (phase !== "play") return;
    const nextStrikes = Math.min(3, strikes + 1);
    setStrikes(nextStrikes);
    setFeedbackTone("strike");
    if (nextStrikes === 3) {
      completeRound(`Three strikes. The round is over for ${teams[activeTeam].name}.`);
    } else {
      setFeedback(`No match. Strike ${nextStrikes} for ${teams[activeTeam].name}.`);
    }
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedGuess = guess.trim();
    if (!submittedGuess || phase === "complete") return;

    const matchedIndex = round.answers.findIndex((answer) =>
      answersMatch(submittedGuess, answer.text),
    );
    const isAlreadyRevealed = matchedIndex >= 0 && revealed.includes(matchedIndex);
    const isAvailableMatch = matchedIndex >= 0 && !isAlreadyRevealed;
    const matchedAnswer = isAvailableMatch ? round.answers[matchedIndex] : null;
    setGuess("");

    if (phase === "faceoff") {
      const answeringTeam = faceOffTeam;
      const earnedPoints = matchedAnswer?.points ?? 0;

      if (matchedAnswer) {
        setRevealed((current) => [...current, matchedIndex]);
        setFeedbackTone("correct");
      } else {
        setFeedbackTone("neutral");
      }

      if (answeringTeam === 0) {
        setFaceOffPoints([earnedPoints, null]);
        setFaceOffTeam(1);
        setActiveTeam(1);
        setFeedback(
          `${matchedAnswer ? `${matchedAnswer.text} is worth ${earnedPoints}. ` : isAlreadyRevealed ? "That answer is already showing. " : "No match. "}${teams[1].name} now gives its strike-free face-off answer.`,
        );
        return;
      }

      const firstTeamPoints = faceOffPoints[0] ?? 0;
      const scores: [number, number] = [firstTeamPoints, earnedPoints];
      setFaceOffPoints(scores);
      const controllingTeam = scores[1] > scores[0] ? 1 : 0;
      setActiveTeam(controllingTeam);
      setPhase("play");
      setStrikes(0);

      if (scores[0] === scores[1]) {
        setFeedback(
          `The face-off is tied at ${scores[0]}. ${teams[0].name} takes control and answers until three strikes.`,
        );
      } else {
        setFeedback(
          `${teams[controllingTeam].name} wins the face-off ${Math.max(...scores)}-${Math.min(...scores)}. Their answers now build the round bank until three strikes.`,
        );
      }
      return;
    }

    if (matchedAnswer) {
      const nextRevealed = [...revealed, matchedIndex];
      setRevealed(nextRevealed);
      setFeedbackTone("correct");
      if (nextRevealed.length === round.answers.length) {
        completeRound(
          `${matchedAnswer.text} is worth ${matchedAnswer.points}. ${teams[activeTeam].name} cleared the board!`,
        );
      } else {
        setFeedback(
          `${matchedAnswer.text} adds ${matchedAnswer.points} points to the round bank. ${teams[activeTeam].name} goes again.`,
        );
      }
      return;
    }

    if (isAlreadyRevealed) {
      const nextStrikes = Math.min(3, strikes + 1);
      setStrikes(nextStrikes);
      setFeedbackTone("strike");
      if (nextStrikes === 3) {
        completeRound(`That answer was already on the board. Three strikes ends the round.`);
      } else {
        setFeedback(`That answer is already on the board. Strike ${nextStrikes}.`);
      }
      return;
    }

    addStrike();
  };

  const nextRound = () => {
    if (roundIndex >= ROUNDS.length - 1) return;
    const nextIndex = roundIndex + 1;
    const startingTeam = 0;
    setRoundIndex(nextIndex);
    setRevealed([]);
    setStrikes(0);
    setPhase("faceoff");
    setRoundAwarded(false);
    setFaceOffTeam(startingTeam);
    setFaceOffPoints([null, null]);
    setActiveTeam(startingTeam);
    setGuess("");
    setFeedbackTone("neutral");
    setFeedback(
      `${teams[startingTeam].name} gives the first face-off answer. No strike can be given.`,
    );
  };

  const resetGame = () => {
    setTeams((current) => current.map((team) => ({ ...team, score: 0 })));
    setRoundIndex(0);
    setRevealed([]);
    setStrikes(0);
    setPhase("faceoff");
    setRoundAwarded(false);
    setFaceOffTeam(0);
    setFaceOffPoints([null, null]);
    setActiveTeam(0);
    setGuess("");
    setFeedbackTone("neutral");
    setFeedback(`${teams[0].name} gives the first face-off answer. No strike can be given.`);
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
            Add everyone who is playing, then let the draw create two balanced,
            completely random teams before the showdown begins.
          </p>
        </section>
        <section className="roster-builder">
          <div className="roster-heading">
            <div>
              <span>STEP 1</span>
              <h2>Build the player roster</h2>
            </div>
            <b>{roster.length} {roster.length === 1 ? "PLAYER" : "PLAYERS"}</b>
          </div>
          <form className="roster-form" onSubmit={addPlayers}>
            <label htmlFor="player-names">Player names</label>
            <textarea
              id="player-names"
              value={playerDraft}
              onChange={(event) => setPlayerDraft(event.target.value)}
              placeholder="Enter one name, or paste several separated by commas or new lines"
              rows={2}
            />
            <button type="submit" disabled={!playerDraft.trim()}>ADD PLAYER{playerDraft.includes(",") || playerDraft.includes("\n") ? "S" : ""}</button>
          </form>
          {roster.length > 0 ? (
            <div className="roster-list" aria-label="Player roster">
              {roster.map((player, index) => (
                <span className="player-chip" key={`${player}-${index}`}>
                  {player}
                  <button onClick={() => removePlayer(index)} aria-label={`Remove ${player}`} type="button">x</button>
                </span>
              ))}
            </div>
          ) : (
            <p className="roster-empty">No players yet. Add as many as you need.</p>
          )}
          <div className="draw-row">
            <p>The draw always keeps team sizes as even as possible.</p>
            <button className="draw-button" onClick={drawTeams} disabled={roster.length < 2} type="button">
              {teamsDrawn ? "RESHUFFLE TEAMS" : "RANDOMLY DRAW 2 TEAMS"}
            </button>
          </div>
        </section>
        <div className="team-draw-label"><span>STEP 2</span> REVIEW THE DRAW</div>
        <div className="setup-grid">
          {teams.map((team, index) => (
            <TeamCard
              key={index}
              team={team}
              index={index}
              onNameChange={(name) => updateTeamName(index, name)}
            />
          ))}
        </div>
        <div className="setup-actions">
          <button
            className="primary-button"
            onClick={() => {
              setStarted(true);
              setFeedback(
                `${teams[0].name} gives the first face-off answer. No strike can be given.`,
              );
            }}
            disabled={
              !teamsDrawn ||
              teams.some((team) => !team.name.trim() || team.players.length === 0)
            }
          >
            START THE SHOW <span aria-hidden="true">-&gt;</span>
          </button>
          <p>
            {!teamsDrawn
              ? "Add players and draw teams to unlock the game"
              : `${roster.length} players / ${teams[0].players.length} vs ${teams[1].players.length} / 5 rounds`}
          </p>
        </div>
      </main>
    );
  }

  const activeKicker =
    phase === "faceoff" ? "FACE-OFF ANSWER" : phase === "play" ? "IN CONTROL" : "ROUND COMPLETE";

  return (
    <main className="game-shell">
      <header className="game-header">
        <Logo />
        <div className="round-label">ROUND {roundIndex + 1} <span>OF {ROUNDS.length}</span></div>
        <button className="reset-button" onClick={resetGame}>NEW GAME</button>
      </header>

      <section className="score-row" aria-label="Team scores">
        {teams.map((team, index) => (
          <article
            key={team.name}
            className={`score-card team-${index + 1} ${activeTeam === index ? "active" : ""}`}
            aria-label={`${team.name}: ${team.score} points`}
          >
            <div>
              <span className="team-kicker">{activeTeam === index ? activeKicker : `TEAM ${index + 1}`}</span>
              <strong>{team.name || `Team ${index + 1}`}</strong>
              <small>{team.players.filter(Boolean).join(" / ")}</small>
            </div>
            <b>{team.score}</b>
          </article>
        ))}
      </section>

      <div className="faceoff-score" aria-label="Face-off scores">
        <span>FIRST ANSWERS - NO STRIKES</span>
        <b>{teams[0].name}: {faceOffPoints[0] ?? "--"}</b>
        <i />
        <b>{teams[1].name}: {faceOffPoints[1] ?? "--"}</b>
      </div>

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
              <div
                key={answer.text}
                className={`answer-tile ${isRevealed ? "revealed" : ""}`}
                aria-label={isRevealed ? `${answer.text}, ${answer.points} points` : `Hidden answer ${index + 1}`}
              >
                <span className="answer-number">{index + 1}</span>
                <span className="answer-text">{isRevealed ? answer.text : ""}</span>
                <strong>{isRevealed ? answer.points : ""}</strong>
              </div>
            );
          })}
        </div>

        <form className={`answer-entry ${feedbackTone}`} onSubmit={submitAnswer}>
          <div className="answer-entry-heading">
            <span>{phase === "faceoff" ? "FACE-OFF" : phase === "play" ? "TEAM ANSWER" : "ROUND OVER"}</span>
            <strong>{phase === "complete" ? "Ready for the next round" : `${teams[activeTeam].name} is answering`}</strong>
          </div>
          <div className="answer-input-row">
            <label htmlFor="team-answer">Enter the team&apos;s answer</label>
            <input
              id="team-answer"
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              placeholder="Type an answer..."
              autoComplete="off"
              autoFocus
              disabled={phase === "complete"}
            />
            <button type="submit" disabled={!guess.trim() || phase === "complete"}>CHECK ANSWER</button>
          </div>
          <p role="status" aria-live="polite">{feedback}</p>
        </form>

        <div className="round-status">
          <div className="strikes" aria-label={`${strikes} strikes`}>
            {[0, 1, 2].map((strike) => (
              <span key={strike} className={strike < strikes ? "shown" : ""}>X</span>
            ))}
          </div>
          <div className="round-bank"><span>BOARD TOTAL</span><strong>{boardPoints}</strong></div>
        </div>
      </section>

      <section className={`host-panel ${controlsOpen ? "open" : ""}`}>
        <button className="host-panel-toggle" onClick={() => setControlsOpen((value) => !value)}>
          <span>HOST OVERRIDES</span><b>{controlsOpen ? "HIDE" : "SHOW"}</b>
        </button>
        {controlsOpen && (
          <div className="host-controls gameplay-controls">
            <div className="control-group">
              <span>BOARD</span>
              <button
                onClick={() => setRevealed(round.answers.map((_, index) => index))}
                disabled={phase !== "complete" || roundAwarded}
              >
                REVEAL ALL
              </button>
            </div>
            <div className="control-group">
              <span>MANUAL CALL</span>
              <button className="strike-button" onClick={addStrike} disabled={phase !== "play"}>+ STRIKE</button>
              <button onClick={() => completeRound("The host ended this round.")} disabled={phase === "complete"}>END ROUND</button>
            </div>
            <div className="control-group award-group">
              <span>AWARD {boardPoints} ROUND POINTS</span>
              {teams.map((team, index) => (
                <button
                  key={team.name}
                  onClick={() => awardRound(index)}
                  disabled={phase !== "complete" || roundAwarded}
                >
                  {team.name}
                </button>
              ))}
            </div>
            <div className="rules-note">
              <b>HOW CONTROL WORKS</b>
              <span>Answers build the bank. After the round, the host awards that full total to one team.</span>
            </div>
            <button
              className="next-button"
              onClick={gameFinished ? resetGame : nextRound}
              disabled={phase !== "complete" || !roundAwarded}
            >
              {gameFinished ? "PLAY AGAIN" : "NEXT ROUND"} <span>-&gt;</span>
            </button>
          </div>
        )}
      </section>

      {gameFinished && (
        <div className="winner-banner" role="status">
          <span aria-hidden="true">WIN</span>
          <div>
            <small>WORK-FEUD CHAMPIONS</small>
            <strong>{teams[0].score >= teams[1].score ? teams[0].name : teams[1].name}</strong>
          </div>
        </div>
      )}
    </main>
  );
}
