import "./rules.css";

function Rules({ onplay }) {
  return (
    <div className="rules-page">
      <div className="rules-card">
        <div className="character">
          <div className="face">🙂</div>
        </div>

        <h1>Nim Oyunu Kuralları</h1>

        <ul className="rules-list">
          <li>Oyun sabit sayıda çubukla başlar.</li>
          <li>Oyuncular sırayla hamle yapar.</li>
          <li>Bir oyuncu 1, 2 veya 3 çubuk alabilir.</li>
          <li>Son çubuğu alan oyuncu kazanır.</li>
        </ul>

        <button className="play-button" onClick={onplay}>
          <span>Start Playing →</span>
        </button>
      </div>
    </div>
  );
}

export default Rules;
