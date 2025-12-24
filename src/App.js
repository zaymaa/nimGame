import { useEffect, useState } from "react";
import Intro from "./components/intro/intro";
import Rules from "./components/rules/rules";
import Game from "./components/game/game";
import "./App.css";

function App() {
  const [page, setPage] = useState("intro");

  useEffect(() => {
    if (page === "intro") {
      const timer = setTimeout(() => {
        setPage("rules");
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [page]);

  const handleRestart = () => {
    setPage("rules");
  };

  return (
    <div className="app-container">
      {page === "intro" && <Intro />}
      {page === "rules" && <Rules onplay={() => setPage("game")} />}
      {page === "game" && <Game onRestart={handleRestart} />}
    </div>
  );
}

export default App;
