document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('sudoku-board');
    const solveBtn = document.getElementById('solve-btn');
    const solveFastBtn = document.getElementById('solve-fast-btn');
    const resetBtn = document.getElementById('reset-btn');

    // 0 znamená prázdnou buňku
    const initialPuzzle = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];

    let cells_wfc; // 2D pole, kde každá buňka obsahuje pole možných čísel
    let intervalId = null;

    function initialize() {
        cells_wfc = [];
        for (let i = 0; i < 9; i++) {
            cells_wfc[i] = [];
            for (let j = 0; j < 9; j++) {
                if (initialPuzzle[i][j] !== 0) {
                    // Předvyplněná buňka má jen jednu možnost
                    cells_wfc[i][j] = [initialPuzzle[i][j]];
                } else {
                    // Prázdná buňka má všechny možnosti
                    cells_wfc[i][j] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                }
            }
        }
        // První propagace omezení z předvyplněných čísel
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (cells_wfc[i][j].length === 1) {
                    propagateConstraints(i, j, cells_wfc[i][j][0]);
                }
            }
        }
        renderBoard();
        solveBtn.disabled = false;
        solveFastBtn.disabled = false;
        if (intervalId) clearInterval(intervalId);
    }

    function renderBoard() {
        boardElement.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const rowClass = `row-${i}`;
            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell', rowClass);
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                if (cells_wfc[i][j].length === 1) {
                    cell.textContent = cells_wfc[i][j][0];
                    if (initialPuzzle[i][j] !== 0) {
                        cell.classList.add('given');
                    } else {
                        cell.classList.add('solved');
                    }
                } else {
                    cell.textContent = '';
                }
                boardElement.appendChild(cell);
            }
        }
    }
    
    // Najde buňku s nejmenším počtem možností (entropií), ale > 1
    function findLowestEntropyCell() {
        let minEntropy = 10;
        let cellCoords = null;
        const candidates = [];

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const entropy = cells_wfc[i][j].length;
                if (entropy > 1 && entropy < minEntropy) {
                    minEntropy = entropy;
                    // našli jsme novou nejnižší entropii, resetujeme kandidáty
                    candidates.length = 0; 
                    candidates.push({ r: i, c: j });
                } else if (entropy > 1 && entropy === minEntropy) {
                    // našli jsme další buňku se stejnou nejnižší entropií
                    candidates.push({ r: i, c: j });
                }
            }
        }
        // Pokud existují kandidáti, vybereme jednoho náhodně
        if (candidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * candidates.length);
            cellCoords = candidates[randomIndex];
        }
        return cellCoords;
    }

    // "Zkolabuje" buňku na jednu náhodnou hodnotu z jejích možností
    function collapseCell(r, c) {
        const options = cells_wfc[r][c];
        const randomValue = options[Math.floor(Math.random() * options.length)];
        cells_wfc[r][c] = [randomValue];
        return randomValue;
    }

    // Propaguje omezení po zkolabování buňky
    function propagateConstraints(r, c, value) {
        const affectedCells = [];
        // Řádek
        for (let j = 0; j < 9; j++) {
            if (j !== c) {
                if (removeOption(r, j, value)) affectedCells.push({r, c: j});
            }
        }
        // Sloupec
        for (let i = 0; i < 9; i++) {
            if (i !== r) {
                if (removeOption(i, c, value)) affectedCells.push({r: i, c});
            }
        }
        // 3x3 box
        const startRow = Math.floor(r / 3) * 3;
        const startCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const newRow = startRow + i;
                const newCol = startCol + j;
                if (newRow !== r || newCol !== c) {
                     if (removeOption(newRow, newCol, value)) affectedCells.push({r: newRow, c: newCol});
                }
            }
        }
        return affectedCells;
    }

    // Pomocná funkce pro odebrání možnosti z buňky
    function removeOption(r, c, value) {
        const options = cells_wfc[r][c];
        const index = options.indexOf(value);
        if (index > -1) {
            options.splice(index, 1);
            // Pokud po odebrání zbývá jen jedna možnost, musíme propagovat dál!
            if (options.length === 1) {
                propagateConstraints(r, c, options[0]);
            }
            return true; // Možnost byla odebrána
        }
        return false; // Možnost nebyla nalezena
    }

    function highlightCell(r, c, className, duration = 500) {
        const cellElement = boardElement.querySelector(`[data-row='${r}'][data-col='${c}']`);
        if(cellElement) {
            cellElement.classList.add(className);
            setTimeout(() => cellElement.classList.remove(className), duration);
        }
    }
    
    function solveStep() {
        const cellToCollapse = findLowestEntropyCell();
        if (!cellToCollapse) {
            console.log("Hotovo!");
            if (intervalId) clearInterval(intervalId);
            solveBtn.disabled = true;
            solveFastBtn.disabled = true;
            return false; // Konec řešení
        }

        const { r, c } = cellToCollapse;
        highlightCell(r, c, 'collapsed');
        
        const collapsedValue = collapseCell(r, c);
        const affected = propagateConstraints(r, c, collapsedValue);
        
        affected.forEach(aff => highlightCell(aff.r, aff.c, 'propagated'));
        
        setTimeout(renderBoard, 300);
        return true; // Pokračujeme
    }

    solveBtn.addEventListener('click', () => {
        if(intervalId) clearInterval(intervalId);
        solveBtn.disabled = true; // Zabráníme vícenásobnému klikání
        intervalId = setInterval(() => {
            if (!solveStep()) {
                clearInterval(intervalId);
            }
        }, 600); // Rychlost animace
    });
    
    solveFastBtn.addEventListener('click', () => {
        if(intervalId) clearInterval(intervalId);
        solveBtn.disabled = true;
        solveFastBtn.disabled = true;
        while(findLowestEntropyCell()){
            const { r, c } = findLowestEntropyCell();
            const value = collapseCell(r, c);
            propagateConstraints(r, c, value);
        }
        renderBoard();
        console.log("Hotovo (rychle)!");
    });

    resetBtn.addEventListener('click', initialize);

    // První inicializace
    initialize();
});