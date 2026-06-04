// ============================================
// SIMULATION 2: Hidden State Evolution Lab
// "Memory Is a Vector"
// ============================================

(function () {
    'use strict';

    const canvas = document.getElementById('sim2Canvas');
    const ctx = canvas.getContext('2d');

    // Controls
    const hiddenSizeSlider = document.getElementById('sim2HiddenSize');
    const hiddenSizeVal = document.getElementById('sim2HiddenSizeVal');
    const activationSelect = document.getElementById('sim2Activation');
    const resetBtn = document.getElementById('sim2Reset');
    const noiseBtn = document.getElementById('sim2Noise');
    const stepBtn = document.getElementById('sim2Step');
    const autoBtn = document.getElementById('sim2Auto');
    const neuronValueEl = document.getElementById('sim2NeuronValue');
    const neuronLabelEl = document.getElementById('sim2NeuronLabel');
    const stepCountEl = document.getElementById('sim2StepCount');

    let hiddenSize = 8;
    let activation = 'tanh';
    let hiddenState = [];
    let timestep = 0;
    let history = [];
    let selectedNeuron = -1;
    let playing = false;
    let autoTimer = null;

    // Chart for neuron activations over time
    const chartCanvas = document.getElementById('sim2Chart');
    let chart = null;

    function initChart() {
        if (chart) chart.destroy();
        chart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 200 },
                scales: {
                    x: {
                        title: { display: true, text: 'Timestep', font: { size: 10 } },
                        ticks: { font: { size: 9 } }
                    },
                    y: {
                        title: { display: true, text: 'Activation', font: { size: 10 } },
                        min: -1.1,
                        max: 1.1,
                        ticks: { font: { size: 9 } }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { font: { size: 9 }, boxWidth: 10 }
                    }
                }
            }
        });
    }

    function activationFn(x) {
        if (activation === 'tanh') return Math.tanh(x);
        return Math.max(0, x); // ReLU
    }

    function initState() {
        hiddenState = new Array(hiddenSize).fill(0);
        timestep = 0;
        history = [hiddenState.slice()];
        selectedNeuron = -1;
        neuronValueEl.textContent = '—';
        neuronLabelEl.textContent = 'Click a neuron';
        stepCountEl.textContent = 'Step: 0';
        initChart();
        updateChart();
        draw();
    }

    function generateInput() {
        return Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * 2);
    }

    function stepForward(addNoise) {
        const input = generateInput();
        const W = Array.from({ length: hiddenSize }, (_, i) =>
            Array.from({ length: hiddenSize }, (_, j) =>
                Math.sin((i + 1) * (j + 1) * 0.7) * 0.3
            )
        );

        const newState = [];
        for (let i = 0; i < hiddenSize; i++) {
            let sum = input[i] * 0.5; // W_x * x_t
            for (let j = 0; j < hiddenSize; j++) {
                sum += W[i][j] * hiddenState[j]; // U * h_{t-1}
            }
            if (addNoise) sum += (Math.random() - 0.5) * 0.5;
            newState.push(activationFn(sum));
        }

        hiddenState = newState;
        timestep++;
        history.push(hiddenState.slice());
        stepCountEl.textContent = `Step: ${timestep}`;

        if (selectedNeuron >= 0 && selectedNeuron < hiddenSize) {
            neuronValueEl.textContent = hiddenState[selectedNeuron].toFixed(4);
        }

        updateChart();
        draw();
    }

    function updateChart() {
        if (!chart) return;

        const labels = history.map((_, i) => i.toString());
        const colors = [
            '#6366f1', '#ef4444', '#10b981', '#f59e0b',
            '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
            '#f97316', '#06b6d4', '#84cc16', '#a855f7'
        ];

        // Show up to 4 neurons on the chart
        const neuronsToShow = Math.min(4, hiddenSize);
        const datasets = [];
        for (let n = 0; n < neuronsToShow; n++) {
            datasets.push({
                label: `Neuron ${n}`,
                data: history.map(h => h[n]),
                borderColor: colors[n % colors.length],
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                pointRadius: history.length < 30 ? 2 : 0,
                tension: 0.3
            });
        }

        chart.data.labels = labels;
        chart.data.datasets = datasets;
        chart.update('none');
    }

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        draw();
    }

    function draw() {
        const W = canvas.width / window.devicePixelRatio;
        const H = canvas.height / window.devicePixelRatio;
        ctx.clearRect(0, 0, W, H);

        // Title
        ctx.font = '600 13px Inter, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText(`Hidden State Vector — Timestep ${timestep} (${activation.toUpperCase()})`, W / 2, 22);

        // Calculate grid layout
        const cols = Math.ceil(Math.sqrt(hiddenSize));
        const rows = Math.ceil(hiddenSize / cols);
        const padding = 30;
        const maxCellSize = Math.min(
            (W - padding * 2) / cols,
            (H - padding * 2 - 30) / rows,
            60
        );
        const cellSize = maxCellSize - 4;
        const gapX = (W - cols * cellSize) / (cols + 1);
        const gapY = (H - 30 - rows * cellSize) / (rows + 1);

        for (let i = 0; i < hiddenSize; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = gapX + col * (cellSize + gapX);
            const y = 35 + gapY + row * (cellSize + gapY);

            const val = hiddenState[i];

            // Color mapping: blue (negative) → white (zero) → red (positive)
            let r, g, b;
            if (val >= 0) {
                const t = Math.min(val, 1);
                r = Math.round(255);
                g = Math.round(255 * (1 - t * 0.7));
                b = Math.round(255 * (1 - t * 0.8));
            } else {
                const t = Math.min(-val, 1);
                r = Math.round(255 * (1 - t * 0.8));
                g = Math.round(255 * (1 - t * 0.6));
                b = Math.round(255);
            }

            // Draw cell
            ctx.beginPath();
            ctx.roundRect(x, y, cellSize, cellSize, 4);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fill();

            // Highlight selected neuron
            if (i === selectedNeuron) {
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Neuron index
            ctx.font = '500 9px "Fira Code", monospace';
            ctx.fillStyle = (Math.abs(val) > 0.5) ? '#fff' : '#374151';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(i.toString(), x + cellSize / 2, y + cellSize / 2 - 6);

            // Value
            ctx.font = '600 8px "Fira Code", monospace';
            ctx.fillText(val.toFixed(2), x + cellSize / 2, y + cellSize / 2 + 6);
        }

        // Color legend
        const legendY = H - 18;
        const legendW = 120;
        const legendH = 10;
        const legendX = W / 2 - legendW / 2;

        const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendW, 0);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, '#ef4444');

        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY, legendW, legendH);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY, legendW, legendH);

        ctx.font = '500 9px Inter, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText('-1', legendX - 10, legendY + 8);
        ctx.fillText('0', legendX + legendW / 2, legendY + 8);
        ctx.fillText('+1', legendX + legendW + 10, legendY + 8);
    }

    // Click on neuron
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const W = rect.width;
        const H = rect.height;

        const cols = Math.ceil(Math.sqrt(hiddenSize));
        const rows = Math.ceil(hiddenSize / cols);
        const maxCellSize = Math.min(
            (W - 60) / cols,
            (H - 60 - 30) / rows,
            60
        );
        const cellSize = maxCellSize - 4;
        const gapX = (W - cols * cellSize) / (cols + 1);
        const gapY = (H - 30 - rows * cellSize) / (rows + 1);

        for (let i = 0; i < hiddenSize; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = gapX + col * (cellSize + gapX);
            const y = 35 + gapY + row * (cellSize + gapY);

            if (mx >= x && mx <= x + cellSize && my >= y && my <= y + cellSize) {
                selectedNeuron = i;
                neuronValueEl.textContent = hiddenState[i].toFixed(4);
                neuronLabelEl.textContent = `Neuron ${i}`;
                draw();
                return;
            }
        }
    });

    // Controls
    hiddenSizeSlider.addEventListener('input', () => {
        hiddenSize = parseInt(hiddenSizeSlider.value);
        hiddenSizeVal.textContent = hiddenSize;
        initState();
    });

    activationSelect.addEventListener('change', () => {
        activation = activationSelect.value;
        initState();
    });

    resetBtn.addEventListener('click', () => {
        stopAuto();
        initState();
    });

    noiseBtn.addEventListener('click', () => {
        stepForward(true);
    });

    stepBtn.addEventListener('click', () => {
        stepForward(false);
    });

    function startAuto() {
        if (playing) return;
        playing = true;
        autoBtn.textContent = '⏸ Pause';
        autoTimer = setInterval(() => stepForward(false), 500);
    }

    function stopAuto() {
        playing = false;
        autoBtn.textContent = '▶ Auto';
        clearInterval(autoTimer);
    }

    autoBtn.addEventListener('click', () => {
        if (playing) {
            stopAuto();
        } else {
            startAuto();
        }
    });

    // Init
    window.addEventListener('resize', resizeCanvas);
    initState();
    setTimeout(resizeCanvas, 100);

})();
