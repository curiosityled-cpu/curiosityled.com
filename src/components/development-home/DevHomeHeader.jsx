import React from "react";
import "./duskHero.css";

/**
 * The Dusk Gym masthead for My Development — a dim weight room at dusk under a
 * heavy vignette, the headline in condensed uppercase over it, the three live
 * counts riding a hairline rule and a streak dial drawing itself in.
 */
export default function DevHomeHeader({
  activeJourneys = 0,
  activeLearning = 0,
  sessionsThisWeek = 0,
  onSettingsClick,
}) {
  return (
    <section className="dusk-hero">
      <img
        src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/4fd2976db4b7319a6c162928ab229c89_generated_31673b59.jpg"
        alt="Dim weight room at dusk"
      />

      <div className="dusk-copy">
        <p className="dusk-eyebrow">Your learning space</p>
        <h1 className="dusk-title">Keep growing, one moment at a time.</h1>
        <p className="dusk-desc">
          Your journeys, courses and experiences in one place — with the next useful step
          already picked out.
        </p>
      </div>

      <div className="dusk-right">
        <div className="dusk-stats">
          <div className="dusk-stat">
            <span className="dusk-num">{activeJourneys}</span>
            <span className="dusk-label">Journeys</span>
          </div>
          <div className="dusk-stat">
            <span className="dusk-num">{activeLearning}</span>
            <span className="dusk-label">Learning</span>
          </div>
          <div className="dusk-stat">
            <span className="dusk-num">{sessionsThisWeek}</span>
            <span className="dusk-label">Practice</span>
          </div>
        </div>

        <div className="dusk-dial" aria-hidden="true">
          <svg viewBox="0 0 58 58">
            <circle className="dusk-track" cx="29" cy="29" r="22" />
            <circle className="dusk-arc" cx="29" cy="29" r="22" />
          </svg>
        </div>
      </div>

      {onSettingsClick && (
        <button className="dusk-settings" type="button" onClick={onSettingsClick}>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 4h12M4 8h8M6 12h4" />
            <circle cx="5" cy="4" r="1.2" fill="#1b1d21" />
            <circle cx="10" cy="8" r="1.2" fill="#1b1d21" />
            <circle cx="7" cy="12" r="1.2" fill="#1b1d21" />
          </svg>
          Settings
        </button>
      )}
    </section>
  );
}