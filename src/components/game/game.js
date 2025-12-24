import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from "recharts";
import "./game.css";

/**
 * NIM OYUNU - ANALİTİK PANEL (GERÇEK ZİYARET SAYACI VERSİYONU)
 * Algoritma her bir düğüme girdiğinde sayaç artar. 
 * Alfa-Beta budama yaptığı için daha az düğüm ziyaret eder.
 */

const MAX_ANALYTIC_DEPTH = 7; // Algoritmanın analiz edeceği maksimum derinlik sınırı

function Game({ onRestart }) {
    // --- STATE TANIMLAMALARI ---
    const [stones, setStones] = useState(7); // Masadaki mevcut taş sayısı
    const [playerTurn, setPlayerTurn] = useState(true); // Sıra kontrolü (True: Oyuncu, False: Bilgisayar)
    const [gameOver, setGameOver] = useState(false); // Oyun bitti mi kontrolü
    const [winner, setWinner] = useState(null); // Kazanan bilgisini tutar
    const [gameHistory, setGameHistory] = useState([]); // Hamle geçmişini saklar
    const [isThinking, setIsThinking] = useState(false); // AI analiz sürecinde mi görsel kontrolü
    const [algorithm, setAlgorithm] = useState("alphabeta"); // Aktif seçili algoritma
    const [treeData, setTreeData] = useState(null); // Görsel ağaç yapısı için veri seti
    const [activeTab, setActiveTab] = useState("visualization"); // Panel sekmeleri (Görsel Ağaç / Performans)
    const [performanceData, setPerformanceData] = useState([]); // Grafik için performans verileri
    const [isTreeFullscreen, setIsTreeFullscreen] = useState(false); // Ağaç görünümü tam ekran modu
    const [currentStats, setCurrentStats] = useState({ minimax: 0, alphabeta: 0, time: 0 }); // Mevcut hamle istatistikleri

    // --- GERÇEK ALGORİTMA MANTIĞI VE SAYAÇ ---
    let visitCounter = 0; // Her rekürsif çağrıda artacak olan küresel ziyaret sayacı

    /**
     * Rekürsif Minimax ve Alfa-Beta Budama Fonksiyonu
     * @param {string} algo - Kullanılacak algoritma seçimi
     * @param {number} stonesLeft - Kalan taş sayısı
     * @param {boolean} isMaximizing - Maksimum puanı hedefleyen oyuncu mu?
     * @param {number} alpha - Budama için alt sınır
     * @param {number} beta - Budama için üst sınır
     * @param {number} depth - Mevcut ağaç derinliği
     * @param {number} targetDepth - Hedeflenen maksimum arama derinliği
     */
    const runAlgorithm = useCallback((algo, stonesLeft, isMaximizing, alpha, beta, depth, targetDepth) => {
        visitCounter++; // Algoritma bir düğüme girdiği anda sayaç artırılır

        // Mevcut düğümün veri yapısını oluşturma
        const node = { stones: stonesLeft, isMaximizing, depth, pruned: false, children: [], score: 0 };
        
        // Terminal Durum Kontrolü (Oyun bitti veya maksimum derinliğe ulaşıldı)
        if (stonesLeft === 0 || depth >= targetDepth) {
            node.score = isMaximizing ? -1 : 1; // Yaprak düğümde skor belirleme
            return node;
        }

        let bestVal = isMaximizing ? -Infinity : Infinity;
        let isPruning = false; // Budama durumunu takip eder

        // NIM Kuralları: Her hamlede 1, 2 veya 3 taş alınabilir
        for (let i = 1; i <= Math.min(3, stonesLeft); i++) {
            // Eğer Alfa-Beta seçiliyse ve budama koşulu oluştuysa dalları atla
            if (isPruning && algo === "alphabeta") {
                node.children.push({ stones: stonesLeft - i, isMaximizing: !isMaximizing, depth: depth + 1, pruned: true, children: [], score: 0 });
            } else {
                // Rekürsif olarak alt düğümleri tara
                const child = runAlgorithm(algo, stonesLeft - i, !isMaximizing, alpha, beta, depth + 1, targetDepth);
                node.children.push(child);

                if (isMaximizing) { 
                    // MAX Oyuncusu: En yüksek skoru bulmaya çalışır
                    bestVal = Math.max(bestVal, child.score); 
                    alpha = Math.max(alpha, bestVal); 
                } else { 
                    // MIN Oyuncusu: En düşük skoru (rakibin kaybını) bulmaya çalışır
                    bestVal = Math.min(bestVal, child.score); 
                    beta = Math.min(beta, bestVal); 
                }

                // Alfa-Beta Budama Koşulu: Beta değeri Alfa'dan küçük veya eşitse aramayı durdur
                if (algo === "alphabeta" && beta <= alpha) {
                    isPruning = true; 
                }
            }
        }
        node.score = bestVal; // Hesaplanan en iyi skoru düğüme ata
        return node;
    }, []);

    /**
     * Algoritmaları Karşılaştırmak İçin Analitik Veri Üretir
     */
    const updateAnalytics = useCallback((currentStones, isInitial = false) => {
        const maxDepthForThisTurn = Math.min(currentStones, MAX_ANALYTIC_DEPTH);
        if (maxDepthForThisTurn <= 0) return [];

        const depths = Array.from({ length: maxDepthForThisTurn }, (_, i) => i + 1);
        
        const results = depths.map(d => {
            // Minimax Testi
            visitCounter = 0;
            runAlgorithm("minimax", currentStones, false, -Infinity, Infinity, 0, d);
            const mNodes = visitCounter;

            // Alfa-Beta Testi
            visitCounter = 0;
            runAlgorithm("alphabeta", currentStones, false, -Infinity, Infinity, 0, d);
            const aNodes = visitCounter;

            // Yapay zamanlama simülasyonu (Ziyaret edilen düğüm sayısıyla orantılı)
            const mTime = isInitial ? 0 : (mNodes * 0.15) + (Math.random() * 0.2);
            const aTime = isInitial ? 0 : (aNodes * 0.15) + (Math.random() * 0.1);

            return {
                depth: d,
                MinimaxNodes: mNodes,
                AlphaBetaNodes: aNodes,
                MinimaxTime: Number(mTime.toFixed(2)),
                AlphaBetaTime: Number(aTime.toFixed(2))
            };
        });
        
        setPerformanceData(results); // Grafik verilerini güncelle
        return results;
    }, [runAlgorithm]);

    /**
     * AI'nın Hamle Kararını Vermesini Sağlayan Fonksiyon
     */
    const getBestMove = useCallback((currentStones) => {
        const currentSearchDepth = Math.min(currentStones, MAX_ANALYTIC_DEPTH);
        const measuredResults = updateAnalytics(currentStones, false);
        
        // Mevcut derinlikteki istatistikleri yakala
        const depthResult = measuredResults.find(r => r.depth === currentSearchDepth) || measuredResults[measuredResults.length - 1];
        
        if (depthResult) {
            setCurrentStats({
                minimax: depthResult.MinimaxNodes,
                alphabeta: depthResult.AlphaBetaNodes,
                time: algorithm === "minimax" ? depthResult.MinimaxTime : depthResult.AlphaBetaTime
            });
        }

        // Seçilen algoritma ile en iyi hamleyi (skoru en düşük olan dalı) belirle
        visitCounter = 0;
        const finalTree = runAlgorithm(algorithm, currentStones, false, -Infinity, Infinity, 0, currentSearchDepth);
        
        let choice = 1;
        let bestScore = Infinity;
        finalTree.children.forEach((child, idx) => {
            if (!child.pruned && child.score < bestScore) {
                bestScore = child.score;
                choice = idx + 1;
            }
        });

        setTreeData(finalTree); // Ağaç görselini güncelle
        return choice;
    }, [algorithm, runAlgorithm, updateAnalytics]);

    // Oyun her değiştiğinde (taş sayısı) analitiği ve ağacı otomatik güncelle
    useEffect(() => {
        if (!gameOver && stones > 0) {
            updateAnalytics(stones, gameHistory.length === 0); 
            const currentSearchDepth = Math.min(stones, MAX_ANALYTIC_DEPTH);
            visitCounter = 0;
            const initialTree = runAlgorithm(algorithm, stones, playerTurn, -Infinity, Infinity, 0, currentSearchDepth);
            setTreeData(initialTree);
        }
    }, [stones, gameOver, updateAnalytics, runAlgorithm, algorithm, playerTurn, gameHistory.length]);

    // Oyuncu hamlesini gerçekleştiren fonksiyon
    const handleMove = (n) => {
        const left = stones - n;
        setGameHistory(prev => [{ player: "Oyuncu", n, left }, ...prev]);
        setStones(left);
        if (left <= 0) { setGameOver(true); setWinner("player"); }
        else { setPlayerTurn(false); setIsThinking(true); }
    };

    // AI'nın sırasını takip eden ve tetikleyen Effect
    useEffect(() => {
        if (!playerTurn && !gameOver && stones > 0) {
            const timer = setTimeout(() => {
                const aiMove = getBestMove(stones);
                const left = stones - aiMove;
                setGameHistory(prev => [{ player: "Bilgisayar", n: aiMove, left }, ...prev]);
                setStones(left);
                setIsThinking(false);
                if (left <= 0) { setGameOver(true); setWinner("ai"); }
                else setPlayerTurn(true);
            }, 800); 
            return () => clearTimeout(timer);
        }
    }, [playerTurn, gameOver, stones, getBestMove]);

    // Oyunu başlangıç ayarlarına döndüren fonksiyon
    const handleRestart = () => {
        setStones(7); setPlayerTurn(true); setGameOver(false); setWinner(null);
        setGameHistory([]); setIsThinking(false);
        setCurrentStats({ minimax: 0, alphabeta: 0, time: 0 });
        setPerformanceData([]);
        setTreeData(null);
        if (onRestart) onRestart();
    };

    // --- RENDER BÖLÜMÜ ---
    return (
        <div className="game-page">
            <div className="game-left">
                {/* OYUN BAŞLIĞI VE SIFIRLAMA */}
                <div className="game-header">
                    <h2>Nim Oyunu ve Minimax Algoritması</h2>
                    <button className="restart-btn" onClick={handleRestart}>⟳ SIFIRLA</button>
                </div>

                {/* SIRA VE DURUM GÖSTERGESİ */}
                <div className={`status-indicator ${playerTurn ? "player-turn" : "ai-turn"}`}>
                    {gameOver ? (winner === "player" ? "🎉 KAZANDINIZ!" : "🤖 AI KAZANDI!") : (isThinking ? "🤖 ANALİZ EDİLİYOR..." : "👤 SIRANIZ")}
                </div>

                {/* TAŞ GÖRSELLEŞTİRME ALANI */}
                <div className="stones-container">
                    <div className="stones-count">{stones}</div>
                    <div className="stones-visual">
                        {Array.from({ length: Math.max(0, stones) }).map((_, i) => <div key={i} className="stone">🪨</div>)}
                    </div>
                </div>

                {/* HAMLE BUTONLARI */}
                <div className="move-buttons">
                    {[1, 2, 3].map(n => (
                        <button key={n} className="move-btn" disabled={!playerTurn || stones < n || gameOver} onClick={() => handleMove(n)}>
                            {n} Al
                        </button>
                    ))}
                </div>

                {/* HAMLE GEÇMİŞİ LİSTESİ */}
                <div className="game-history">
                    <h3>Hamle Geçmişi</h3>
                    <div className="history-list">
                        {gameHistory.map((h, i) => (
                            <div key={i} className="history-item">
                                <strong>{h.player}</strong>: -{h.n} ({h.left} kaldı)
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="game-right">
                {/* ANALİTİK VE PERFORMANS PANELİ */}
                <div className="minimax-panel">
                    <div className="panel-tabs">
                        <button className={`tab-btn ${activeTab === "visualization" ? "active" : ""}`} onClick={() => setActiveTab("visualization")}>Görsel Ağaç</button>
                        <button className={`tab-btn ${activeTab === "performance" ? "active" : ""}`} onClick={() => setActiveTab("performance")}>Performans Raporu</button>
                    </div>

                    {/* GÖRSEL AĞAÇ SEKMESİ */}
                    {activeTab === "visualization" && (
                        <>
                            <div className="algorithm-switch">
                                <button className={`switch-btn ${algorithm === "minimax" ? "active" : ""}`} onClick={() => setAlgorithm("minimax")}>Minimax</button>
                                <button className={`switch-btn ${algorithm === "alphabeta" ? "active" : ""}`} onClick={() => setAlgorithm("alphabeta")}>Alfa-Beta</button>
                            </div>
                            <div className="stats-grid">
                                <div className="stat-card" style={{ borderColor: algorithm === "minimax" ? '#ef4444' : '#10b981' }}>
                                    <h4 style={{ color: algorithm === "minimax" ? '#ef4444' : '#10b981' }}>{algorithm.toUpperCase()}</h4>
                                    <div className="stat-row">Ziyaret edilen düğüm sayısı: <strong>{algorithm === "minimax" ? currentStats.minimax : currentStats.alphabeta} Düğüm</strong></div>
                                </div>
                            </div>
                            <div className="tree-container">
                                <button className="tree-fullscreen-btn" onClick={() => setIsTreeFullscreen(true)}>⛶</button>
                                {treeData && <RecursiveTree node={treeData} />}
                            </div>
                        </>
                    )}

                    {/* PERFORMANS RAPORU (GRAFİKLER) SEKMESİ */}
                    {activeTab === "performance" && (
                        <div className="performance-panel">
                            <div className="chart-wrapper">
                                <h4>Derinlik – Düğüm Sayısı Analizi</h4>
                                
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis dataKey="depth" stroke="#888">
                                            <Label value="Derinlik" offset={-15} position="insideBottom" fill="#888" />
                                        </XAxis>
                                        <YAxis stroke="#888" label={{ value: 'Düğüm Sayısı', angle: -90, position: 'insideLeft', fill: '#888' }} />
                                        <Tooltip contentStyle={{backgroundColor: '#222'}} />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Line type="monotone" dataKey="MinimaxNodes" stroke="#ef4444" name="Minimax" strokeWidth={2} dot={{r: 4}} />
                                        <Line type="monotone" dataKey="AlphaBetaNodes" stroke="#10b981" name="Alfa-Beta" strokeWidth={2} dot={{r: 4}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-wrapper" style={{ marginTop: '30px' }}>
                                <h4>Derinlik – Süre (ms) Analizi</h4>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis dataKey="depth" stroke="#888">
                                            <Label value="Derinlik" offset={-15} position="insideBottom" fill="#888" />
                                        </XAxis>
                                        <YAxis stroke="#888" label={{ value: 'Süre (ms)', angle: -90, position: 'insideLeft', fill: '#888' }} />
                                        <Tooltip contentStyle={{backgroundColor: '#222'}} />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Line type="monotone" dataKey="MinimaxTime" stroke="#ef4444" name="Minimax (ms)" strokeWidth={2} dot={{r: 4}} />
                                        <Line type="monotone" dataKey="AlphaBetaTime" stroke="#10b981" name="Alfa-Beta (ms)" strokeWidth={2} dot={{r: 4}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* TAM EKRAN AĞAÇ MODALI */}
            {isTreeFullscreen && (
                <div className="tree-fullscreen-modal" onClick={() => setIsTreeFullscreen(false)}>
                    <button 
                        className="tree-fullscreen-close" 
                        onClick={() => setIsTreeFullscreen(false)}
                        style={{
                            position: 'fixed',
                            top: '20px',
                            right: '30px',
                            zIndex: 1000,
                            padding: '10px 15px',
                            fontSize: '24px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}
                    >
                        ✕
                    </button>
                    <div className="tree-fullscreen-content" onClick={e => e.stopPropagation()}>
                        <div className="tree-fullscreen-container">
                            {treeData && <RecursiveTree node={treeData} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Oyun Ağacını Rekürsif Olarak Ekrana Basan Bileşen
 */
function RecursiveTree({ node }) {
    if (!node) return null;
    return (
        <div className="tree-node-container">
            {/* Düğümün Görsel Kutusu */}
            <div className={`tree-node-box ${node.isMaximizing ? "max-node" : "min-node"} ${node.pruned ? "pruned-node" : ""}`}>
                <div className="node-title">{node.pruned ? "PRUNED" : (node.isMaximizing ? "MAX" : "MIN")}</div>
                <div className="node-stones">{node.stones}</div>
                {!node.pruned && <div className="node-score">s: {node.score}</div>}
            </div>
            {/* Varsa Çocuk Düğümleri Render Et */}
            {node.children && node.children.length > 0 && (
                <div className="tree-children-container">
                    <div className="tree-children-row">
                        {node.children.map((child, i) => (
                            <div key={i} className="tree-child-wrapper">
                                <div className="tree-line-up" />
                                <RecursiveTree node={child} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Game;