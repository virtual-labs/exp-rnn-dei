// ============================================
// SIMULATION 1: Time Unrolling Simulator
// "One Cell, Many Timesteps"
// ============================================

(function () {
    'use strict';

    const canvas = document.getElementById('sim1Canvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('sim1Tooltip');

    // Controls
    const playBtn = document.getElementById('sim1Play');
    const stepBtn = document.getElementById('sim1Step');
    const resetBtn = document.getElementById('sim1Reset');
    const seqSlider = document.getElementById('sim1SeqLen');
    const seqVal = document.getElementById('sim1SeqLenVal');
    const inputTypeSelect = document.getElementById('sim1InputType');
    const statusDot = document.getElementById('sim1StatusDot');
    const statusText = document.getElementById('sim1StatusText');
    const stepCountEl = document.getElementById('sim1StepCount');

    let seqLen = 5;
    let currentStep = -1; // -1 = not started
    let playing = false;
    let animFrame = null;
    let animTimer = null;
    let inputType = 'numbers';

    // Input data generators
    const inputGenerators = {
        numbers: (len) => Array.from({ length: len }, (_, i) => (i + 1).toString()),
        characters: (len) => 'HELLO WORLD RNN'.slice(0, len).split(''),
        onehot: (len) => Array.from({ length: len }, (_, i) => `e${i}`)
    };

    // Simulated hidden states (tanh outputs)
    function generateHiddenStates(len) {
        const states = [Array(4).fill(0)];
        for (let t = 0; t < len; t++) {
            const prev = states[states.length - 1];
            const next = prev.map((v, i) => {
                const noise = (Math.sin((t + 1) * (i + 1) * 1.7) * 0.3 + Math.cos((t + 1) * (i + 2) * 0.9) * 0.2);
                return Math.tanh(v * 0.5 + noise + 0.3);
            });
            states.push(next);
        }
        return states;
    }

    let inputs = [];
    let hiddenStates = [];

    function initData() {
        inputs = inputGenerators[inputType](seqLen);
        hiddenStates = generateHiddenStates(seqLen);
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

        if (seqLen === 0) return;

        const cellW = 70;
        const cellH = 50;
        const gap = Math.min(100, (W - 80) / seqLen - cellW + 80);
        const totalW = seqLen * cellW + (seqLen - 1) * (gap - cellW + cellW);
        const startX = Math.max(40, (W - (seqLen * (cellW + 20))) / 2);
        const centerY = H / 2;

        // Draw title
        ctx.font = '600 13px Inter, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText('RNN Unrolled Through Time — Same Weights at Every Step', W / 2, 25);

        for (let t = 0; t < seqLen; t++) {
            const x = startX + t * (cellW + 20);
            const y = centerY - cellH / 2;
            const isActive = t <= currentStep;
            const isCurrent = t === currentStep;

            // Hidden state arrow from previous cell
            if (t > 0) {
                const prevX = startX + (t - 1) * (cellW + 20) + cellW;
                const arrowY = centerY;
                const arrowEndX = x;

                ctx.beginPath();
                ctx.moveTo(prevX, arrowY);
                ctx.lineTo(arrowEndX, arrowY);
                ctx.strokeStyle = isActive ? '#3b82f6' : '#d1d5db';
                ctx.lineWidth = isActive ? 2.5 : 1.5;
                ctx.stroke();

                // Arrow head
                ctx.beginPath();
                ctx.moveTo(arrowEndX - 6, arrowY - 4);
                ctx.lineTo(arrowEndX, arrowY);
                ctx.lineTo(arrowEndX - 6, arrowY + 4);
                ctx.strokeStyle = isActive ? '#3b82f6' : '#d1d5db';
                ctx.lineWidth = isActive ? 2.5 : 1.5;
                ctx.stroke();

                // "hₜ" label on arrow
                if (isActive) {
                    ctx.font = '500 10px Inter, sans-serif';
                    ctx.fillStyle = '#3b82f6';
                    ctx.textAlign = 'center';
                    ctx.fillText(`h${t - 1}`, (prevX + arrowEndX) / 2, arrowY - 8);
                }
            }

            // RNN Cell box
            const boxRadius = 8;
            ctx.beginPath();
            ctx.roundRect(x, y, cellW, cellH, boxRadius);

            if (isCurrent) {
                ctx.fillStyle = '#6366f1';
                ctx.fill();
                ctx.strokeStyle = '#4f46e5';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Glow effect
                ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            } else if (isActive) {
                ctx.fillStyle = '#eef2ff';
                ctx.fill();
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else {
                ctx.fillStyle = '#f9fafb';
                ctx.fill();
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // "RNN" label inside cell
            ctx.font = '700 13px Inter, sans-serif';
            ctx.fillStyle = isCurrent ? '#ffffff' : (isActive ? '#6366f1' : '#9ca3af');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RNN', x + cellW / 2, centerY);

            // Input arrow (bottom → cell)
            const inputY = centerY + cellH / 2 + 40;
            ctx.beginPath();
            ctx.moveTo(x + cellW / 2, inputY);
            ctx.lineTo(x + cellW / 2, y + cellH);
            ctx.strokeStyle = isActive ? '#10b981' : '#d1d5db';
            ctx.lineWidth = isActive ? 2 : 1;
            ctx.stroke();

            // Input arrow head
            ctx.beginPath();
            ctx.moveTo(x + cellW / 2 - 4, y + cellH + 6);
            ctx.lineTo(x + cellW / 2, y + cellH);
            ctx.lineTo(x + cellW / 2 + 4, y + cellH + 6);
            ctx.strokeStyle = isActive ? '#10b981' : '#d1d5db';
            ctx.stroke();

            // Input label
            ctx.font = '600 11px "Fira Code", monospace';
            ctx.fillStyle = isActive ? '#10b981' : '#9ca3af';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`x${t + 1}`, x + cellW / 2, inputY + 4);

            // Input value
            ctx.font = '500 10px "Fira Code", monospace';
            ctx.fillStyle = isActive ? '#059669' : '#d1d5db';
            ctx.fillText(inputs[t] || '', x + cellW / 2, inputY + 18);

            // Output arrow (cell → top)
            const outputY = centerY - cellH / 2 - 40;
            ctx.beginPath();
            ctx.moveTo(x + cellW / 2, y);
            ctx.lineTo(x + cellW / 2, outputY);
            ctx.strokeStyle = isActive ? '#8b5cf6' : '#d1d5db';
            ctx.lineWidth = isActive ? 2 : 1;
            ctx.stroke();

            // Output arrow head
            ctx.beginPath();
            ctx.moveTo(x + cellW / 2 - 4, outputY + 6);
            ctx.lineTo(x + cellW / 2, outputY);
            ctx.lineTo(x + cellW / 2 + 4, outputY + 6);
            ctx.strokeStyle = isActive ? '#8b5cf6' : '#d1d5db';
            ctx.stroke();

            // Output label
            ctx.font = '600 11px "Fira Code", monospace';
            ctx.fillStyle = isActive ? '#8b5cf6' : '#9ca3af';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`h${t + 1}`, x + cellW / 2, outputY - 4);

            // Timestep label below input
            ctx.font = '500 10px Inter, sans-serif';
            ctx.fillStyle = isCurrent ? '#6366f1' : '#9ca3af';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`t=${t + 1}`, x + cellW / 2, inputY + 34);
        }

        // Weight sharing annotation
        if (currentStep >= 1) {
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillStyle = '#6366f1';
            ctx.textAlign = 'center';
            ctx.fillText('⟵ Same weights W, U, b shared across all timesteps ⟶', W / 2, H - 15);
        }
    }

    // Mouse hover for tooltip
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const W = rect.width;
        const H = rect.height;
        const cellW = 70;
        const startX = Math.max(40, (W - (seqLen * (cellW + 20))) / 2);
        const centerY = H / 2;
        const cellH = 50;

        let found = false;
        for (let t = 0; t < seqLen; t++) {
            const x = startX + t * (cellW + 20);
            const y = centerY - cellH / 2;
            if (mx >= x && mx <= x + cellW && my >= y && my <= y + cellH && t <= currentStep) {
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY - 30) + 'px';
                tooltip.textContent = `hₜ = tanh(W·x${t + 1} + U·h${t} + b)`;
                found = true;
                break;
            }
        }
        if (!found) {
            tooltip.style.display = 'none';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });

    // Controls
    seqSlider.addEventListener('input', () => {
        seqLen = parseInt(seqSlider.value);
        seqVal.textContent = seqLen;
        resetSim();
    });

    inputTypeSelect.addEventListener('change', () => {
        inputType = inputTypeSelect.value;
        resetSim();
    });

    function stepForward() {
        if (currentStep < seqLen - 1) {
            currentStep++;
            stepCountEl.textContent = `Step: ${currentStep + 1}/${seqLen}`;
            draw();
        } else {
            stopPlaying();
        }
    }

    function startPlaying() {
        if (currentStep >= seqLen - 1) {
            currentStep = -1;
        }
        playing = true;
        playBtn.textContent = '⏸ Pause';
        statusDot.classList.add('running');
        statusText.textContent = 'Running';

        animTimer = setInterval(() => {
            stepForward();
            if (currentStep >= seqLen - 1) {
                stopPlaying();
                statusText.textContent = 'Complete';
            }
        }, 800);
    }

    function stopPlaying() {
        playing = false;
        playBtn.textContent = '▶ Play';
        statusDot.classList.remove('running');
        if (currentStep >= seqLen - 1) {
            statusText.textContent = 'Complete';
        } else {
            statusText.textContent = 'Paused';
        }
        clearInterval(animTimer);
    }

    function resetSim() {
        stopPlaying();
        currentStep = -1;
        statusText.textContent = 'Ready';
        stepCountEl.textContent = 'Step: 0';
        initData();
        draw();
    }

    playBtn.addEventListener('click', () => {
        if (playing) {
            stopPlaying();
        } else {
            startPlaying();
        }
    });

    stepBtn.addEventListener('click', () => {
        stopPlaying();
        stepForward();
    });

    resetBtn.addEventListener('click', resetSim);

    // Init
    window.addEventListener('resize', resizeCanvas);
    initData();
    setTimeout(resizeCanvas, 100);

})();
