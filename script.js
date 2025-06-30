// Předpřipravený příklad pro snadné testování
const EXAMPLE_PUZZLE = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0], [6, 0, 0, 1, 9, 5, 0, 0, 0], [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3], [4, 0, 0, 8, 0, 3, 0, 0, 1], [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0], [0, 0, 0, 4, 1, 9, 0, 0, 5], [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

class SudokuSolver {
    constructor() {
        this.boardElement = document.getElementById('sudoku-board');
        this.statusElement = document.getElementById('status-message');
        this.buttons = {
            step: document.getElementById('solve-step-btn'),
            fast: document.getElementById('solve-fast-btn'),
            clear: document.getElementById('clear-btn'),
            reset: document.getElementById('reset-btn')
        };
        
        // Interní stav aplikace
        this.wfcGrid = []; // 2D pole, kde každá buňka má pole možností
        this.domGrid = []; // 2D pole odkazů na HTML buňky
        this.activeCell = null; // Buňka, kterou uživatel právě upravuje
        this.isSolving = false;
        this.solveInterval = null;
        this.SOLVE_DELAY = 50; // Rychlost animace v ms

        this.init();
    }

    init() {
        this.createBoard();
        this.addEventListeners();
        this.reset(EXAMPLE_PUZZLE); // Načte příklad při spuštění
    }
    
    // Vytvoří 9x9 mřížku v HTML a uloží si reference
    createBoard() {
        this.boardElement.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            this.domGrid[i] = [];
            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell', `row-${i}`);
                cell.dataset.row = i;
                cell.dataset.col = j;
                this.boardElement.appendChild(cell);
                this.domGrid[i][j] = cell;
            }
        }
    }

    addEventListeners() {
        this.boardElement.addEventListener('click', this.handleCellClick.bind(this));
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        this.buttons.step.addEventListener('click', () => this.solve(false));
        this.buttons.fast.addEventListener('click', () => this.solve(true));
        this.buttons.clear.addEventListener('click', () => this.reset([]));
        this.buttons.reset.addEventListener('click', () => this.reset(EXAMPLE_PUZZLE));
    }
    
    // --- FUNKCE PRO INTERAKCI S UŽIVATELEM ---
    
    handleCellClick(event) {
        if (this.isSolving) return;
        const cell = event.target.closest('.cell');
        if (this.activeCell) {
            this.activeCell.classList.remove('active');
        }
        if (cell) {
            this.activeCell = cell;
            cell.classList.add('active');
        } else {
            this.activeCell = null;
        }
    }
    
    handleKeyPress(event) {
        if (!this.activeCell || this.isSolving) return;
        
        const r = parseInt(this.activeCell.dataset.row);
        const c = parseInt(this.activeCell.dataset.col);
        const num = parseInt(event.key);
        
        if (num >= 1 && num <= 9) {
            const initialGrid = this.getGridSnapshot();
            initialGrid[r][c] = num;
            this.reset(initialGrid); // Znovu načte a propaguje omezení
        } else if (event.key === '0' || event.key === 'Backspace' || event.key === 'Delete') {
            const initialGrid = this.getGridSnapshot();
            initialGrid[r][c] = 0;
            this.reset(initialGrid);
        }
    }
    
    getGridSnapshot() {
        const grid = Array(9).fill(0).map(() => Array(9).fill(0));
        for(let r=0; r<9; r++) {
            for(let c=0; c<9; c++) {
                if(this.wfcGrid[r][c].isGiven) {
                    grid[r][c] = this.wfcGrid[r][c].options[0];
                }
            }
        }
        return grid;
    }


    // --- ZÁKLADNÍ LOGIKA A ŘÍZENÍ STAVU ---
    
    reset(initialGrid = []) {
        clearInterval(this.solveInterval);
        this.isSolving = false;
        
        // 1. Inicializace WFC mřížky
        this.wfcGrid = [];
        for (let i = 0; i < 9; i++) {
            this.wfcGrid[i] = [];
            for (let j = 0; j < 9; j++) {
                const value = initialGrid[i]?.[j] || 0;
                this.wfcGrid[i][j] = {
                    options: value !== 0 ? [value] : [1, 2, 3, 4, 5, 6, 7, 8, 9],
                    isGiven: value !== 0
                };
            }
        }
        
        // 2. Propagace počátečních omezení
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.wfcGrid[r][c].isGiven) {
                    this.propagate(r, c, this.wfcGrid[r][c].options[0]);
                }
            }
        }
        
        this.render();
        this.updateControls();
        this.updateStatus("Zadejte čísla nebo spusťte řešení.", "ready");
    }

    render() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellData = this.wfcGrid[r][c];
                const cellElement = this.domGrid[r][c];
                cellElement.innerHTML = '';
                cellElement.className = 'cell'; // Reset tříd
                cellElement.classList.add(`row-${Math.floor(r/3)*3}`);

                if (cellData.options.length === 1) {
                    cellElement.textContent = cellData.options[0];
                    if (cellData.isGiven) {
                        cellElement.classList.add('pre-filled');
                    } else {
                        cellElement.classList.add('solved');
                    }
                } else {
                    const possibilitiesGrid = document.createElement('div');
                    possibilitiesGrid.className = 'possibilities-grid';
                    for (let i = 1; i <= 9; i++) {
                        const possibility = document.createElement('div');
                        possibility.textContent = cellData.options.includes(i) ? i : '';
                        possibilitiesGrid.appendChild(possibility);
                    }
                    cellElement.appendChild(possibilitiesGrid);
                }
            }
        }
    }
    
    updateControls() {
        this.buttons.step.disabled = this.isSolving;
        this.buttons.fast.disabled = this.isSolving;
        this.buttons.clear.disabled = this.isSolving;
        this.buttons.reset.disabled = this.isSolving;
    }

    updateStatus(message, type = '') {
        this.statusElement.textContent = message;
        this.statusElement.className = 'status';
        if (type) this.statusElement.classList.add(type);
    }
    
    
    // --- ALGORITMUS WAVE FUNCTION COLLAPSE ---
    
    solve(isFast) {
        if (this.isSolving) return;
        this.isSolving = true;
        this.updateControls();
        this.updateStatus("Řeším...", "ready");
        
        if (isFast) {
            while (this.solveStep());
        } else {
            this.solveInterval = setInterval(() => {
                if (!this.solveStep()) {
                    clearInterval(this.solveInterval);
                }
            }, this.SOLVE_DELAY);
        }
    }
    
    solveStep() {
        const nextCell = this.findLowestEntropyCell();
        
        if (!nextCell) {
            if (this.checkFailure()) {
                this.updateStatus("Chyba: Sudoku je neřešitelné!", "error");
            } else {
                this.updateStatus("Hotovo!", "solved");
            }
            this.isSolving = false;
            this.updateControls();
            return false; // Konec řešení
        }

        // Fáze 1: Kolaps
        const { r, c } = nextCell;
        const options = this.wfcGrid[r][c].options;
        const value = options[Math.floor(Math.random() * options.length)];
        this.wfcGrid[r][c].options = [value];
        
        // Fáze 2: Propagace
        this.propagate(r, c, value);
        this.render();
        return true; // Pokračujeme
    }

    findLowestEntropyCell() {
        let minEntropy = 10;
        let candidates = [];
        
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const entropy = this.wfcGrid[r][c].options.length;
                if (entropy > 1) {
                    if (entropy < minEntropy) {
                        minEntropy = entropy;
                        candidates = [{ r, c }];
                    } else if (entropy === minEntropy) {
                        candidates.push({ r, c });
                    }
                }
            }
        }
        
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        return null; // Všechny buňky zkolabovaly
    }

    propagate(r, c, value) {
        // Odebere možnost `value` ze všech "sousedních" buněk
        const peers = this.getPeers(r, c);
        for (const peer of peers) {
            const options = this.wfcGrid[peer.r][peer.c].options;
            const index = options.indexOf(value);
            if (index > -1) {
                options.splice(index, 1);
                // Pokud zbyde jen jedna možnost, propagujeme dál (rekurzivně)
                if (options.length === 1) {
                    this.propagate(peer.r, peer.c, options[0]);
                }
            }
        }
    }
    
    getPeers(r, c) {
        const peers = new Set();
        // Řádek a sloupec
        for (let i = 0; i < 9; i++) {
            if (i !== c) peers.add({ r, c: i });
            if (i !== r) peers.add({ r: i, c });
        }
        // 3x3 box
        const startRow = Math.floor(r / 3) * 3;
        const startCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const peerR = startRow + i;
                const peerC = startCol + j;
                if (peerR !== r || peerC !== c) {
                    peers.add({r: peerR, c: peerC});
                }
            }
        }
        // U Setu musíme manuálně přefiltrovat duplikáty, protože objekty se porovnávají referencí
        const uniquePeers = [];
        const seen = new Set();
        for (const peer of peers) {
            const key = `${peer.r},${peer.c}`;
            if (!seen.has(key)) {
                uniquePeers.push(peer);
                seen.add(key);
            }
        }
        return uniquePeers;
    }
    
    checkFailure() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.wfcGrid[r][c].options.length === 0) {
                    return true; // Našli jsme buňku bez možností -> chyba
                }
            }
        }
        return false;
    }
}

// Spuštění aplikace po načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    new SudokuSolver();
});