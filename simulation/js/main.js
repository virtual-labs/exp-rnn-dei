/**
 * RNN Simulation - Main JavaScript
 * Handles cell execution, step state management, and dynamic output based on hyperparameters
 */

// ============================================
// Configuration
// ============================================

const CONFIG = {
    executionDelay: 1500, // 1.5 second delay for realistic execution simulation
    chartAnimationDuration: 1000,
    totalSteps: 9,
    // Cell numbers where hyperparameters are set (epochs/lr at cell 3, startText at cell 8)
    hyperparamCell: 3,
    startTextCell: 8
};

// ============================================
// State Management
// ============================================

const state = {
    currentStep: 1,
    completedSteps: new Set(),
    runningStep: null,
    charts: {},
    isRunningAll: false,
    // Hyperparameters
    epochs: 15,
    lr: 0.001,
    startText: 'ROMEO'
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    stepItems: document.querySelectorAll('.step-item'),
    cells: document.querySelectorAll('.notebook-cell'),
    downloadBtn: document.getElementById('downloadBtn'),
    resetBtn: document.getElementById('resetBtn'),
    completionMessage: document.getElementById('completionMessage'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    // Dropdowns
    epochsSelect: document.getElementById('epochsSelect'),
    lrSelect: document.getElementById('lrSelect'),
    startTextSelect: document.getElementById('startTextSelect'),
    // Dynamic output elements
    trainingLog: document.getElementById('trainingLog'),
    generatedText: document.getElementById('generatedText'),
    codeEpochs: document.getElementById('codeEpochs'),
    codeLr: document.getElementById('codeLr'),
    codeStartText: document.getElementById('codeStartText'),
    outputEpochs: document.getElementById('outputEpochs'),
    outputLr: document.getElementById('outputLr')
};

// ============================================
// Helper Functions
// ============================================

function getDataKey() {
    return `${state.epochs}_${state.lr}_${state.startText}`;
}

function getCurrentData() {
    const key = getDataKey();
    return EXPERIMENT_DATA[key] || null;
}

function updateCodeDisplay() {
    if (elements.codeEpochs) elements.codeEpochs.textContent = state.epochs;
    if (elements.codeLr) elements.codeLr.textContent = state.lr;
    
    const startTextDisplay = {
        'ROMEO': '"ROMEO: HELLO! "',
        'JULIET': '"JULIET:"',
        'KING': '"KING:"'
    };
    if (elements.codeStartText) elements.codeStartText.textContent = startTextDisplay[state.startText] || state.startText;
}

function updateOutputDisplay() {
    if (elements.outputEpochs) elements.outputEpochs.textContent = state.epochs;
    if (elements.outputLr) elements.outputLr.textContent = state.lr;
}

// ============================================
// Step Management
// ============================================

function updateStepState(stepNumber, status) {
    const stepItem = document.querySelector(`.step-item[data-step="${stepNumber}"]`);
    const cell = document.querySelector(`.notebook-cell[data-step="${stepNumber}"]`);
    
    if (!stepItem) return;
    
    stepItem.classList.remove('active', 'running', 'completed');
    if (cell) {
        cell.classList.remove('running', 'completed');
    }
    
    switch (status) {
        case 'active':
            stepItem.classList.add('active');
            break;
        case 'running':
            stepItem.classList.add('running');
            if (cell) cell.classList.add('running');
            state.runningStep = stepNumber;
            break;
        case 'completed':
            stepItem.classList.add('completed');
            if (cell) cell.classList.add('completed');
            state.completedSteps.add(stepNumber);
            break;
    }
}

function setNextStepActive() {
    const nextStep = Math.min(state.currentStep + 1, CONFIG.totalSteps);
    if (!state.completedSteps.has(nextStep)) {
        updateStepState(nextStep, 'active');
        state.currentStep = nextStep;
    }
}

// Check if all previous cells have been run
function canRunCell(cellNumber) {
    for (let i = 1; i < cellNumber; i++) {
        if (!state.completedSteps.has(i)) {
            return false;
        }
    }
    return true;
}

// Reset cells from a given step onwards
function resetFromStep(fromStep) {
    // Destroy charts if resetting steps that contain them
    if (fromStep <= 7 && state.charts.lossChart) {
        state.charts.lossChart.destroy();
        state.charts.lossChart = null;
    }
    if (fromStep <= 9 && state.charts.hiddenStateChart) {
        state.charts.hiddenStateChart.destroy();
        state.charts.hiddenStateChart = null;
    }
    
    // Reset steps from fromStep to the end
    for (let i = fromStep; i <= CONFIG.totalSteps; i++) {
        state.completedSteps.delete(i);
        
        const stepItem = document.querySelector(`.step-item[data-step="${i}"]`);
        const cell = document.querySelector(`.notebook-cell[data-step="${i}"]`);
        
        if (stepItem) {
            stepItem.classList.remove('active', 'running', 'completed');
        }
        
        if (cell) {
            cell.classList.remove('running', 'completed');
            const output = cell.querySelector('.cell-output');
            const runBtn = cell.querySelector('.run-btn');
            
            if (output) output.classList.add('hidden');
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.classList.remove('running');
                runBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    Run
                `;
            }
        }
    }
    
    // Set appropriate step as active
    if (fromStep > 1 && state.completedSteps.has(fromStep - 1)) {
        state.currentStep = fromStep;
        updateStepState(fromStep, 'active');
    } else {
        state.currentStep = fromStep;
        updateStepState(fromStep, 'active');
    }
    
    // Hide completion message
    elements.completionMessage.classList.add('hidden');
}

// Update run button states based on dependencies
function updateRunButtonStates() {
    elements.cells.forEach((cell, index) => {
        const cellNumber = index + 1;
        const runBtn = cell.querySelector('.run-btn');
        
        if (!runBtn) return;
        
        // Skip if already completed
        if (state.completedSteps.has(cellNumber)) {
            return;
        }
        
        // Check if can run this cell
        if (canRunCell(cellNumber)) {
            runBtn.disabled = false;
            runBtn.title = '';
        } else {
            runBtn.disabled = true;
            runBtn.title = 'Run previous cells first';
        }
    });
}

// ============================================
// Cell Execution
// ============================================

async function executeCell(cellNumber) {
    const cell = document.querySelector(`.notebook-cell[data-cell="${cellNumber}"]`);
    const stepNumber = parseInt(cell.dataset.step);
    const output = cell.querySelector('.cell-output');
    const runBtn = cell.querySelector('.run-btn');
    
    // Check if already completed
    if (state.completedSteps.has(stepNumber)) {
        return;
    }
    
    // Check if can run (all previous cells completed)
    if (!canRunCell(cellNumber)) {
        alert(`Please run all previous cells first before running Step ${cellNumber}.`);
        return;
    }
    
    // Update UI to show running state
    updateStepState(stepNumber, 'running');
    runBtn.classList.add('running');
    runBtn.disabled = true;
    runBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="spinning">
            <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
        </svg>
        Running...
    `;
    
    const spinner = runBtn.querySelector('.spinning');
    if (spinner) {
        spinner.style.animation = 'spin 1s linear infinite';
    }
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, CONFIG.executionDelay));
    
    // Update dynamic content based on cell
    if (cellNumber === 3) {
        // Hyperparameters step
        updateOutputDisplay();
    } else if (cellNumber === 6) {
        // Training step
        updateTrainingOutput();
    } else if (cellNumber === 8) {
        // Text generation step
        updateGeneratedText();
    }
    
    // Show output
    output.classList.remove('hidden');
    
    // Render charts if needed
    if (cellNumber === 7) {
        renderLossChart();
    } else if (cellNumber === 9) {
        renderHiddenStateChart();
    }
    
    // Update UI to show completed state
    updateStepState(stepNumber, 'completed');
    runBtn.classList.remove('running');
    runBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Done
    `;
    runBtn.disabled = true;
    
    // Update run button states for other cells
    updateRunButtonStates();
    
    if (state.completedSteps.size === CONFIG.totalSteps) {
        showCompletionMessage();
    } else {
        setNextStepActive();
    }
}

// ============================================
// Dynamic Output Updates
// ============================================

function updateTrainingOutput() {
    const data = getCurrentData();
    if (!data || !elements.trainingLog) return;
    
    if (data.training_log) {
        elements.trainingLog.textContent = data.training_log;
    } else {
        // Generate from arrays
        let log = '';
        for (let i = 0; i < data.train_losses.length; i++) {
            log += `Epochs ${i+1}/${data.epochs} | Train Loss: ${data.train_losses[i].toFixed(4)} | Val Loss: ${data.val_losses[i].toFixed(4)}\n`;
        }
        elements.trainingLog.textContent = log.trim();
    }
}

function updateGeneratedText() {
    const data = getCurrentData();
    if (!data || !elements.generatedText) return;
    
    elements.generatedText.textContent = data.generated_text || 'No generated text available for this configuration.';
}

// ============================================
// Hyperparameter Change Handlers
// ============================================

function handleEpochsChange(newValue) {
    const oldValue = state.epochs;
    state.epochs = parseInt(newValue);
    updateCodeDisplay();
    
    // If hyperparameter cell (3) has been run, reset from cell 3 onwards
    if (state.completedSteps.has(CONFIG.hyperparamCell)) {
        resetFromStep(CONFIG.hyperparamCell);
    }
}

function handleLrChange(newValue) {
    const oldValue = state.lr;
    state.lr = parseFloat(newValue);
    updateCodeDisplay();
    
    // If hyperparameter cell (3) has been run, reset from cell 3 onwards
    if (state.completedSteps.has(CONFIG.hyperparamCell)) {
        resetFromStep(CONFIG.hyperparamCell);
    }
}

function handleStartTextChange(newValue) {
    const oldValue = state.startText;
    state.startText = newValue;
    updateCodeDisplay();
    
    // If startText cell (8) has been run, reset from cell 8 onwards
    if (state.completedSteps.has(CONFIG.startTextCell)) {
        resetFromStep(CONFIG.startTextCell);
    }
}

// ============================================
// Download Functionality
// ============================================

function downloadExperiment() {
    // Download the experiment PDF
    const link = document.createElement('a');
    link.href = './assets/Exp6_Recurrent_Neural_Networks.pdf';
    link.download = 'RNN_Experiment.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================
// Reset Functionality
// ============================================

function resetSimulation() {
    if (!confirm('Are you sure you want to reset the entire experiment?')) {
        return;
    }
    
    state.currentStep = 1;
    state.completedSteps.clear();
    state.runningStep = null;
    state.isRunningAll = false;
    
    // Destroy charts
    Object.values(state.charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    state.charts = {};
    
    // Reset step items
    elements.stepItems.forEach((item, index) => {
        item.classList.remove('active', 'running', 'completed');
        if (index === 0) {
            item.classList.add('active');
        }
    });
    
    // Reset cells
    elements.cells.forEach(cell => {
        cell.classList.remove('running', 'completed');
        const output = cell.querySelector('.cell-output');
        const runBtn = cell.querySelector('.run-btn');
        
        if (output) output.classList.add('hidden');
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.classList.remove('running');
            runBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                Run
            `;
        }
    });
    
    // Hide completion message
    elements.completionMessage.classList.add('hidden');
    
    // Update code display with current hyperparameters
    updateCodeDisplay();
    
    // Update button states - only first cell should be enabled
    updateRunButtonStates();
    
    // Hide and reset RNN Animation
    if (typeof RNNAnimation !== 'undefined') {
        RNNAnimation.hide();
    }
}

// ============================================
// Completion Message
// ============================================

function showCompletionMessage() {
    elements.completionMessage.classList.remove('hidden');
    elements.completionMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Trigger RNN Hidden State Animation
    if (typeof RNNAnimation !== 'undefined') {
        RNNAnimation.show();
    }
}

// ============================================
// Chart Rendering
// ============================================

function renderLossChart() {
    const ctx = document.getElementById('lossChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (state.charts.lossChart) {
        state.charts.lossChart.destroy();
    }
    
    const data = getCurrentData();
    if (!data) return;
    
    const epochs = Array.from({length: data.epochs}, (_, i) => i + 1);
    
    state.charts.lossChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: epochs,
            datasets: [
                {
                    label: 'Train Loss',
                    data: data.train_losses,
                    borderColor: '#1f77b4',
                    backgroundColor: 'rgba(31, 119, 180, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#1f77b4',
                    pointStyle: 'circle'
                },
                {
                    label: 'Validation Loss',
                    data: data.val_losses,
                    borderColor: '#ff7f0e',
                    backgroundColor: 'rgba(255, 127, 14, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#ff7f0e',
                    pointStyle: 'circle'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: CONFIG.chartAnimationDuration
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Training vs Validation Loss',
                    color: '#212529',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    labels: {
                        color: '#495057'
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Epoch',
                        color: '#495057'
                    },
                    ticks: {
                        color: '#6c757d'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Loss',
                        color: '#495057'
                    },
                    ticks: {
                        color: '#6c757d'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

function renderHiddenStateChart() {
    const ctx = document.getElementById('hiddenStateChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (state.charts.hiddenStateChart) {
        state.charts.hiddenStateChart.destroy();
    }
    
    // Get real hidden state data from HIDDEN_STATES_DATA
    const hiddenKey = `${state.epochs}_${state.lr}`;
    const hiddenData = HIDDEN_STATES_DATA[hiddenKey];
    
    if (!hiddenData || !hiddenData[state.startText]) {
        console.warn(`No hidden state data for ${hiddenKey}_${state.startText}`);
        return;
    }
    
    const startTextData = hiddenData[state.startText];
    const chars = startTextData.characters;
    const hiddenStates = startTextData.hidden_states;
    
    // Only use 4 colors for 4 units (matching the reference graph)
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];
    
    // Create datasets from real hidden state data - only first 4 units
    const datasets = [];
    for (let unit = 0; unit < 4; unit++) {
        const data = hiddenStates.map(h => h[unit]);
        datasets.push({
            label: `Unit ${unit}`,
            data: data,
            borderColor: colors[unit],
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0,  // Straight lines (no curve)
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: colors[unit]
        });
    }
    
    state.charts.hiddenStateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chars,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: CONFIG.chartAnimationDuration
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Hidden state evolution for a short sequence',
                    color: '#212529',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'right',
                    labels: {
                        color: '#495057',
                        boxWidth: 12
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time step (character)',
                        color: '#495057'
                    },
                    ticks: {
                        color: '#6c757d'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Hidden unit value',
                        color: '#495057'
                    },
                    ticks: {
                        color: '#6c757d'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

// ============================================
// Mobile Menu
// ============================================

function createMobileMenuButton() {
    const existingBtn = document.querySelector('.mobile-menu-btn');
    if (existingBtn) return;
    
    const btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.innerHTML = '☰ Steps';
    btn.addEventListener('click', toggleMobileMenu);
    document.body.appendChild(btn);
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.step-sidebar');
    sidebar.classList.toggle('open');
}

function handleResize() {
    const sidebar = document.querySelector('.step-sidebar');
    if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
        const mobileBtn = document.querySelector('.mobile-menu-btn');
        if (mobileBtn) mobileBtn.style.display = 'none';
    } else {
        createMobileMenuButton();
        const mobileBtn = document.querySelector('.mobile-menu-btn');
        if (mobileBtn) mobileBtn.style.display = 'block';
    }
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
    // Run buttons on individual cells
    elements.cells.forEach((cell, index) => {
        const runBtn = cell.querySelector('.run-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => executeCell(index + 1));
        }
    });
    
    // Reset button
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', resetSimulation);
    }
    
    // Download button
    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', downloadExperiment);
    }
    
    // Hyperparameter dropdowns with reset logic
    if (elements.epochsSelect) {
        elements.epochsSelect.addEventListener('change', (e) => {
            handleEpochsChange(e.target.value);
        });
    }
    
    if (elements.lrSelect) {
        elements.lrSelect.addEventListener('change', (e) => {
            handleLrChange(e.target.value);
        });
    }
    
    if (elements.startTextSelect) {
        elements.startTextSelect.addEventListener('change', (e) => {
            handleStartTextChange(e.target.value);
        });
    }
    
    // Step item clicks (scroll to cell)
    elements.stepItems.forEach(item => {
        item.addEventListener('click', () => {
            const stepNumber = parseInt(item.dataset.step);
            const targetCell = document.querySelector(`.notebook-cell[data-step="${stepNumber}"]`);
            if (targetCell) {
                targetCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (window.innerWidth <= 768) {
                document.querySelector('.step-sidebar').classList.remove('open');
            }
        });
    });
    
    // Window resize
    window.addEventListener('resize', handleResize);
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.step-sidebar');
            const mobileBtn = document.querySelector('.mobile-menu-btn');
            if (!sidebar.contains(e.target) && !mobileBtn?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// ============================================
// Initialization
// ============================================

function init() {
    // Set first step as active
    updateStepState(1, 'active');
    
    // Initialize event listeners
    initEventListeners();
    
    // Handle responsive design
    handleResize();
    
    // Update code display with initial values
    updateCodeDisplay();
    
    // Initialize run button states - only first cell enabled initially
    updateRunButtonStates();
    
    console.log('RNN Simulation initialized successfully');
    console.log('Available configurations:', Object.keys(EXPERIMENT_DATA));
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
