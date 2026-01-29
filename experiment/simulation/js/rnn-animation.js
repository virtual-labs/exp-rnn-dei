/**
 * RNN Hidden State Evolution Animation
 * Pure JavaScript implementation - no external libraries
 * 
 * This module creates an interactive visualization of how RNN hidden states
 * evolve as each character in a sequence is processed.
 */

const RNNAnimation = {
    // ============================================
    // State
    // ============================================
    
    container: null,
    isInitialized: false,
    
    // Animation state
    currentStep: 0,
    isPlaying: false,
    speed: 1,
    animationInterval: null,
    
    // Data
    characters: [],
    hiddenStates: [],
    hiddenSize: 10,
    
    // DOM references
    elements: {},
    
    // ============================================
    // Initialization
    // ============================================
    
    init: function(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('RNN Animation: Container not found');
            return;
        }
        
        // Load data based on current hyperparameters
        this.loadData();
        
        // Build the UI
        this.render();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('RNN Animation initialized');
    },
    
    loadData: function() {
        // Get current hyperparameters from main simulation state
        const epochs = typeof state !== 'undefined' ? state.epochs : 10;
        const lr = typeof state !== 'undefined' ? state.lr : 0.001;
        const startText = typeof state !== 'undefined' ? state.startText : 'ROMEO';
        
        // Get hidden state data
        const hiddenKey = `${epochs}_${lr}`;
        const hiddenData = typeof HIDDEN_STATES_DATA !== 'undefined' 
            ? HIDDEN_STATES_DATA[hiddenKey] 
            : null;
        
        if (hiddenData && hiddenData[startText]) {
            this.characters = hiddenData[startText].characters;
            this.hiddenStates = hiddenData[startText].hidden_states;
        } else {
            // Fallback to default data
            this.characters = ['R', 'O', 'M', 'E', 'O', ':', ' ', 'H'];
            this.hiddenStates = [];
            console.warn('RNN Animation: No data found for', hiddenKey, startText);
        }
    },
    
    // ============================================
    // Rendering
    // ============================================
    
    render: function() {
        this.container.innerHTML = `
            <div class="rnn-animation-header">
                <h2>Hidden State Evolution Animation</h2>
                <p>Watch how the RNN processes each character and updates its hidden state</p>
            </div>
            
            <!-- Controls -->
            <div class="rnn-controls">
                <div class="rnn-control-buttons">
                    <button class="rnn-btn rnn-btn-primary" id="rnnPlayBtn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Play</span>
                    </button>
                    <button class="rnn-btn rnn-btn-secondary" id="rnnResetBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        <span>Reset</span>
                    </button>
                </div>
                
                <div class="rnn-step-control">
                    <span class="rnn-step-label">Step</span>
                    <span class="rnn-step-value" id="rnnStepValue">1 / ${this.characters.length}</span>
                    <input type="range" class="rnn-step-slider" id="rnnStepSlider" 
                           min="0" max="${this.characters.length - 1}" value="0">
                </div>
                
                <div class="rnn-speed-control">
                    <span class="rnn-speed-label">Speed:</span>
                    <button class="rnn-speed-btn" data-speed="0.5">0.5x</button>
                    <button class="rnn-speed-btn active" data-speed="1">1x</button>
                    <button class="rnn-speed-btn" data-speed="2">2x</button>
                </div>
                
                <div class="rnn-status">
                    <div class="rnn-status-dot" id="rnnStatusDot"></div>
                    <span id="rnnStatusText">Ready</span>
                </div>
            </div>
            
            <!-- RNN Visualization -->
            <div class="rnn-visualization">
                <div class="rnn-viz-label">
                    <span>Sequence Unrolling</span>
                    <span class="rnn-viz-sublabel">Same RNN cell processes each character</span>
                </div>
                
                <div class="rnn-sequence-wrapper">
                    <div class="rnn-sequence" id="rnnSequence">
                        ${this.renderCells()}
                    </div>
                </div>
                
                <!-- Formula annotation -->
                <div class="rnn-formula-box">
                    <span class="rnn-formula-label">RNN Update Rule:</span>
                    <code class="rnn-formula-code">
                        h<sub>t</sub> = tanh(W<sub>hh</sub>h<sub>t-1</sub> + W<sub>xh</sub>x<sub>t</sub> + b)
                    </code>
                </div>
            </div>
            
            <!-- Step Explanation -->
            <div class="rnn-step-explanation" id="rnnExplanation">
                ${this.renderExplanation()}
            </div>
            
            <!-- Hidden State Heatmap -->
            <div class="rnn-heatmap-section">
                <div class="rnn-heatmap-container">
                    <div class="rnn-heatmap-header">
                        <h3>Hidden State Evolution</h3>
                        <span class="rnn-heatmap-subtitle">h<sub>t</sub> ∈ ℝ<sup>${this.hiddenSize}</sup></span>
                    </div>
                    
                    <div class="rnn-heatmap-wrapper">
                        <div class="rnn-heatmap-y-labels" id="rnnHeatmapYLabels">
                            ${this.renderYLabels()}
                        </div>
                        <div class="rnn-heatmap-grid" id="rnnHeatmapGrid" 
                             style="grid-template-columns: repeat(${this.characters.length}, 1fr)">
                            ${this.renderHeatmap()}
                        </div>
                    </div>
                    
                    <div class="rnn-heatmap-x-labels" id="rnnHeatmapXLabels"
                         style="grid-template-columns: repeat(${this.characters.length}, 1fr)">
                        ${this.renderXLabels()}
                    </div>
                    
                    <div class="rnn-heatmap-legend">
                        <span>-1</span>
                        <div class="rnn-legend-gradient"></div>
                        <span>+1</span>
                    </div>
                </div>
            </div>
        `;
        
        // Store element references
        this.cacheElements();
        
        // Apply initial state
        this.updateStep();
    },
    
    cacheElements: function() {
        this.elements = {
            playBtn: document.getElementById('rnnPlayBtn'),
            resetBtn: document.getElementById('rnnResetBtn'),
            stepValue: document.getElementById('rnnStepValue'),
            stepSlider: document.getElementById('rnnStepSlider'),
            speedBtns: document.querySelectorAll('.rnn-speed-btn'),
            statusDot: document.getElementById('rnnStatusDot'),
            statusText: document.getElementById('rnnStatusText'),
            sequence: document.getElementById('rnnSequence'),
            explanation: document.getElementById('rnnExplanation'),
            heatmapGrid: document.getElementById('rnnHeatmapGrid'),
            cells: document.querySelectorAll('.rnn-cell-wrapper'),
            arrows: document.querySelectorAll('.rnn-arrow-container'),
            heatmapCells: document.querySelectorAll('.rnn-heatmap-cell'),
            xLabels: document.querySelectorAll('.rnn-heatmap-x-label')
        };
    },
    
    renderCells: function() {
        let html = '';
        
        this.characters.forEach((char, index) => {
            // Render cell
            html += `
                <div class="rnn-sequence-item">
                    <div class="rnn-cell-wrapper" data-index="${index}">
                        <!-- Input -->
                        <div class="rnn-input-label">
                            <span class="rnn-var-name">x</span><span class="rnn-subscript">${index}</span>
                            <span> = </span>
                            <span class="rnn-char-value">"${char}"</span>
                        </div>
                        
                        <!-- Data flow arrow down -->
                        <div class="rnn-data-flow"></div>
                        
                        <!-- Main cell -->
                        <div class="rnn-cell-block">
                            <div class="rnn-processing-indicator"></div>
                            <div class="rnn-cell-title">RNN</div>
                            <div class="rnn-cell-subtitle">Shared Wts</div>
                            <div class="rnn-cell-operations">
                                <div class="rnn-operation">
                                    <span class="rnn-op-icon">📥</span>
                                    <span>Embed</span>
                                </div>
                                <div class="rnn-operation">
                                    <span class="rnn-op-icon">🔄</span>
                                    <span>tanh</span>
                                </div>
                                <div class="rnn-operation">
                                    <span class="rnn-op-icon">📤</span>
                                    <span>Linear</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Data flow arrow down -->
                        <div class="rnn-data-flow"></div>
                        
                        <!-- Output -->
                        <div class="rnn-output-label">
                            <span class="rnn-var-name">h</span><span class="rnn-subscript">${index}</span>
                            <span class="rnn-dim-info"> ∈ ℝ<span class="rnn-superscript">${this.hiddenSize}</span></span>
                        </div>
                        
                        <!-- Hidden state preview -->
                        ${this.renderHiddenPreview(index)}
                    </div>
                    
                    ${index < this.characters.length - 1 ? this.renderArrow(index) : ''}
                </div>
            `;
        });
        
        return html;
    },
    
    renderHiddenPreview: function(index) {
        if (!this.hiddenStates[index]) return '';
        
        const state = this.hiddenStates[index];
        let html = '<div class="rnn-hidden-preview">';
        
        for (let i = 0; i < Math.min(4, state.length); i++) {
            const value = state[i];
            const color = this.getHeatmapColor(value);
            html += `<div class="rnn-hidden-mini-cell" style="background-color: ${color}" title="h[${i}] = ${value.toFixed(3)}"></div>`;
        }
        
        html += '<span class="rnn-hidden-more">...</span></div>';
        return html;
    },
    
    renderArrow: function(index) {
        return `
            <div class="rnn-arrow-container" data-index="${index}">
                <svg width="80" height="32" class="rnn-arrow-svg">
                    <defs>
                        <linearGradient id="arrowGrad${index}" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.5"/>
                            <stop offset="50%" stop-color="#8b5cf6"/>
                            <stop offset="100%" stop-color="#a855f7" stop-opacity="0.5"/>
                        </linearGradient>
                    </defs>
                    
                    <!-- Main line -->
                    <line class="rnn-arrow-line" x1="5" y1="16" x2="65" y2="16" 
                          stroke="url(#arrowGrad${index})" stroke-width="3" stroke-linecap="round"/>
                    
                    <!-- Dashed overlay -->
                    <line class="rnn-arrow-dashes" x1="5" y1="16" x2="65" y2="16" 
                          stroke="#c7d2fe" stroke-width="2" stroke-dasharray="8 8"/>
                    
                    <!-- Arrow head -->
                    <polygon class="rnn-arrow-head" points="65,10 80,16 65,22" fill="url(#arrowGrad${index})"/>
                    
                    <!-- Particles -->
                    <circle class="rnn-arrow-particle" r="3" cx="5" cy="16"/>
                </svg>
                <div class="rnn-arrow-label">h<sub>t</sub> →</div>
            </div>
        `;
    },
    
    renderExplanation: function() {
        const char = this.characters[this.currentStep] || '';
        const step = this.currentStep;
        
        return `
            <div class="rnn-explanation-header">
                <span class="rnn-step-badge">Step ${step + 1}</span>
                <span class="rnn-step-char">Processing: "${char}"</span>
            </div>
            <p class="rnn-explanation-text">
                The RNN receives character <strong>x<sub>${step}</sub> = "${char}"</strong>
                ${step > 0 ? ` and previous hidden state <strong>h<sub>${step-1}</sub></strong>` : ''}
                , then computes new hidden state <strong>h<sub>${step}</sub></strong> using 
                shared weights. This hidden state captures context from all previous characters.
            </p>
        `;
    },
    
    renderYLabels: function() {
        let html = '';
        const displaySize = Math.min(8, this.hiddenSize);
        
        for (let i = 0; i < displaySize; i++) {
            html += `<div class="rnn-heatmap-y-label">h<sub>${i}</sub></div>`;
        }
        
        return html;
    },
    
    renderXLabels: function() {
        return this.characters.map((char, idx) => 
            `<div class="rnn-heatmap-x-label" data-index="${idx}">${char}</div>`
        ).join('');
    },
    
    renderHeatmap: function() {
        const displaySize = Math.min(8, this.hiddenSize);
        let html = '';
        
        this.characters.forEach((char, stepIdx) => {
            html += '<div class="rnn-heatmap-column">';
            
            for (let unitIdx = 0; unitIdx < displaySize; unitIdx++) {
                const value = this.hiddenStates[stepIdx] ? this.hiddenStates[stepIdx][unitIdx] : 0;
                const color = this.getHeatmapColor(value);
                
                html += `
                    <div class="rnn-heatmap-cell" 
                         data-step="${stepIdx}" 
                         data-unit="${unitIdx}"
                         style="background-color: ${color}"
                         title="h[${unitIdx}] at t=${stepIdx}: ${value.toFixed(3)}">
                        <span class="rnn-cell-value">${value.toFixed(2)}</span>
                    </div>
                `;
            }
            
            html += '</div>';
        });
        
        return html;
    },
    
    getHeatmapColor: function(value) {
        // value is between -1 and 1 (tanh output)
        const normalized = (value + 1) / 2; // 0 to 1
        
        let r, g, b;
        
        if (normalized < 0.5) {
            // Blue to white
            const t = normalized * 2;
            r = Math.round(59 + t * 196);
            g = Math.round(130 + t * 125);
            b = Math.round(246 - t * 30);
        } else {
            // White to orange
            const t = (normalized - 0.5) * 2;
            r = Math.round(255 - t * 20);
            g = Math.round(255 - t * 100);
            b = Math.round(216 - t * 180);
        }
        
        return `rgb(${r}, ${g}, ${b})`;
    },
    
    // ============================================
    // Event Listeners
    // ============================================
    
    setupEventListeners: function() {
        // Play/Pause button
        this.elements.playBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        });
        
        // Reset button
        this.elements.resetBtn.addEventListener('click', () => {
            this.reset();
        });
        
        // Step slider
        this.elements.stepSlider.addEventListener('input', (e) => {
            this.pause();
            this.currentStep = parseInt(e.target.value);
            this.updateStep();
        });
        
        // Speed buttons
        this.elements.speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);
                this.setSpeed(speed);
                
                // Update active state
                this.elements.speedBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },
    
    // ============================================
    // Animation Controls
    // ============================================
    
    play: function() {
        if (this.currentStep >= this.characters.length - 1) {
            this.currentStep = 0;
        }
        
        this.isPlaying = true;
        this.updatePlayButton();
        this.updateStatus();
        
        const interval = 1200 / this.speed;
        
        this.animationInterval = setInterval(() => {
            if (this.currentStep < this.characters.length - 1) {
                this.currentStep++;
                this.updateStep();
            } else {
                this.pause();
            }
        }, interval);
    },
    
    pause: function() {
        this.isPlaying = false;
        
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        
        this.updatePlayButton();
        this.updateStatus();
    },
    
    reset: function() {
        this.pause();
        this.currentStep = 0;
        this.updateStep();
    },
    
    setSpeed: function(speed) {
        this.speed = speed;
        
        // If playing, restart with new speed
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    },
    
    // ============================================
    // UI Updates
    // ============================================
    
    updateStep: function() {
        // Update step value display
        this.elements.stepValue.textContent = `${this.currentStep + 1} / ${this.characters.length}`;
        
        // Update slider
        this.elements.stepSlider.value = this.currentStep;
        
        // Update cell highlighting
        this.updateCellHighlighting();
        
        // Update arrow highlighting
        this.updateArrowHighlighting();
        
        // Update explanation
        this.elements.explanation.innerHTML = this.renderExplanation();
        
        // Update heatmap highlighting
        this.updateHeatmapHighlighting();
    },
    
    updateCellHighlighting: function() {
        const cells = document.querySelectorAll('.rnn-cell-wrapper');
        
        cells.forEach((cell, idx) => {
            if (idx === this.currentStep) {
                cell.classList.add('active');
            } else {
                cell.classList.remove('active');
            }
        });
    },
    
    updateArrowHighlighting: function() {
        const arrows = document.querySelectorAll('.rnn-arrow-container');
        
        arrows.forEach((arrow, idx) => {
            if (idx === this.currentStep) {
                arrow.classList.add('rnn-arrow-active');
            } else {
                arrow.classList.remove('rnn-arrow-active');
            }
        });
    },
    
    updateHeatmapHighlighting: function() {
        // Update heatmap cells
        const heatmapCells = document.querySelectorAll('.rnn-heatmap-cell');
        heatmapCells.forEach(cell => {
            const step = parseInt(cell.dataset.step);
            if (step === this.currentStep) {
                cell.classList.add('active');
            } else {
                cell.classList.remove('active');
            }
        });
        
        // Update x-labels
        const xLabels = document.querySelectorAll('.rnn-heatmap-x-label');
        xLabels.forEach((label, idx) => {
            if (idx === this.currentStep) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });
    },
    
    updatePlayButton: function() {
        const btn = this.elements.playBtn;
        
        if (this.isPlaying) {
            btn.classList.add('playing');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
                <span>Pause</span>
            `;
        } else {
            btn.classList.remove('playing');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                <span>Play</span>
            `;
        }
    },
    
    updateStatus: function() {
        if (this.isPlaying) {
            this.elements.statusDot.classList.add('active');
            this.elements.statusText.textContent = 'Processing sequence...';
        } else {
            this.elements.statusDot.classList.remove('active');
            this.elements.statusText.textContent = 'Ready';
        }
    },
    
    // ============================================
    // Public API
    // ============================================
    
    show: function() {
        if (!this.isInitialized) {
            this.init('rnnAnimationSection');
        } else {
            // Reload data in case hyperparameters changed
            this.loadData();
            this.render();
            this.setupEventListeners();
        }
        
        this.container.classList.remove('hidden');
        
        // Scroll to animation section
        setTimeout(() => {
            this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    },
    
    hide: function() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
        this.pause();
        this.currentStep = 0;
    },
    
    updateData: function() {
        this.loadData();
        if (this.isInitialized && !this.container.classList.contains('hidden')) {
            this.render();
            this.setupEventListeners();
        }
    }
};

// Make available globally
window.RNNAnimation = RNNAnimation;

console.log('RNN Animation module loaded');
