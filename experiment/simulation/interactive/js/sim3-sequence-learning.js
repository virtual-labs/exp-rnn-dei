// ============================================
// SIMULATION 3: Toy Sequence Learning Playground
// "Watch RNN Learn Patterns"
// ============================================

(function () {
    'use strict';

    // Controls
    const taskSelect = document.getElementById('sim3Task');
    const lrSlider = document.getElementById('sim3Lr');
    const lrVal = document.getElementById('sim3LrVal');
    const hiddenSlider = document.getElementById('sim3Hidden');
    const hiddenVal = document.getElementById('sim3HiddenVal');
    const epochSlider = document.getElementById('sim3Epochs');
    const epochVal = document.getElementById('sim3EpochsVal');
    const startBtn = document.getElementById('sim3Start');
    const resetBtn = document.getElementById('sim3Reset');
    const statusDot = document.getElementById('sim3StatusDot');
    const statusText = document.getElementById('sim3StatusText');
    const inputStream = document.getElementById('sim3InputStream');
    const predBars = document.getElementById('sim3PredBars');

    let task = 'nextnum';
    let lr = 0.01;
    let hiddenSize = 8;
    let maxEpochs = 50;
    let training = false;
    let trainTimer = null;
    let epoch = 0;
    let lossHistory = [];

    // Chart
    const chartCanvas = document.getElementById('sim3LossChart');
    let lossChart = null;

    // ── Full vocabulary of all charpredict words ─────────────────────────────
    // HELLO, WORLD, LEARN, NEURAL, RECUR — collect every distinct letter, sorted
    const CHAR_VOCAB = [...new Set('HELLOWORLDLEARNNEURALRECUR'.split(''))].sort();

    // ── Full vocabulary of every grammar sentence ─────────────────────────────
    // "THE CAT SAT", "THE DOG RAN", "A BIRD ATE"
    // All chars including space, sorted
    const GRAMMAR_VOCAB = [...new Set('THE CAT SAT THE DOG RAN A BIRD ATE'.split(''))].sort();

    // ─────────────────────────────────────────────────────────────────────────
    // Task definitions
    // Each task exposes:
    //   generateSequence()              → array of tokens
    //   getLabels(seq)                  → display labels for the input strip
    //   getPredictionLabels(seq)        → ordered candidate next-token labels
    //   getCorrectIndex(seq, labels)    → index of the true next token in labels
    // ─────────────────────────────────────────────────────────────────────────
    const tasks = {
        nextnum: {
            name: 'Next Number Prediction',
            generateSequence: () => {
                const len = 10;
                const start = Math.floor(Math.random() * 5) + 1;
                return Array.from({ length: len }, (_, i) => start + i);
            },
            getLabels: (seq) => seq.map(v => v.toString()),
            // Show last-1 … last+4 so the correct answer (last+1) is always present
            getPredictionLabels: (seq) => {
                const last = seq[seq.length - 1];
                return Array.from({ length: 6 }, (_, i) => (last - 1 + i).toString());
            },
            getCorrectIndex: (seq, labels) => {
                const correctVal = (seq[seq.length - 1] + 1).toString();
                const idx = labels.indexOf(correctVal);
                return idx >= 0 ? idx : 0;
            }
        },

        repeat: {
            name: 'Repeating Pattern',
            generateSequence: () => {
                const patterns = [[1, 2, 3], [2, 4, 6], [1, 3, 5], [3, 1, 4]];
                const pat = patterns[Math.floor(Math.random() * patterns.length)];
                const result = [];
                for (let i = 0; i < 12; i++) result.push(pat[i % pat.length]);
                return result;
            },
            getLabels: (seq) => seq.map(v => v.toString()),
            getPredictionLabels: (seq) => {
                const unique = [...new Set(seq)].sort((a, b) => a - b);
                return unique.map(v => v.toString());
            },
            getCorrectIndex: (seq, labels) => {
                // The next element continues the same cyclic pattern
                const patLen = [...new Set(seq)].length;
                const nextVal = seq[seq.length % patLen].toString();
                const idx = labels.indexOf(nextVal);
                return idx >= 0 ? idx : 0;
            }
        },

        charpredict: {
            name: 'Character Prediction',
            generateSequence: () => {
                const words = ['HELLO', 'WORLD', 'LEARN', 'NEURAL', 'RECUR'];
                const word = words[Math.floor(Math.random() * words.length)];
                return word.split('');
            },
            getLabels: (seq) => seq,
            // BUG FIX: was chars.slice(0,8) → only A–H, missing N/U/R/L/W etc.
            // Now shows every letter that can appear in any of the five words.
            getPredictionLabels: (_seq) => [...CHAR_VOCAB],
            getCorrectIndex: (seq, labels) => {
                // We model predicting the last character given the preceding context.
                const target = seq[seq.length - 1];
                const idx = labels.indexOf(target);
                return idx >= 0 ? idx : 0;
            }
        },

        grammar: {
            name: 'Simple Grammar',
            generateSequence: () => {
                const subjects = ['THE CAT', 'THE DOG', 'A BIRD'];
                const verbs = [' SAT', ' RAN', ' ATE'];
                const subj = subjects[Math.floor(Math.random() * subjects.length)];
                const verb = verbs[Math.floor(Math.random() * verbs.length)];
                return (subj + verb).split('');
            },
            getLabels: (seq) => seq,
            // BUG FIX: was a hand-typed 9-char list missing many real letters.
            // Now derived from all possible grammar sentences automatically.
            getPredictionLabels: (_seq) => [...GRAMMAR_VOCAB],
            getCorrectIndex: (seq, labels) => {
                const target = seq[seq.length - 1];
                const idx = labels.indexOf(target);
                return idx >= 0 ? idx : 0;
            }
        }
    };

    let currentSequence = [];
    let currentPredLabels = [];
    // BUG FIX: correctIdx is fixed once when the sequence is generated.
    // Previously it was re-randomized every epoch inside simulatePredictions,
    // so the model could never converge to a single correct answer.
    let currentCorrectIdx = 0;

    // ─────────────────────────────────────────────────────────────────────────

    function initChart() {
        if (lossChart) lossChart.destroy();
        lossChart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Training Loss',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 100 },
                scales: {
                    x: {
                        title: { display: true, text: 'Epoch', font: { size: 10 } },
                        ticks: { font: { size: 9 }, maxTicksLimit: 10 }
                    },
                    y: {
                        title: { display: true, text: 'Loss', font: { size: 10 } },
                        ticks: { font: { size: 9 } },
                        min: 0
                    }
                },
                plugins: {
                    legend: {
                        labels: { font: { size: 9 }, boxWidth: 10 }
                    }
                }
            }
        });
    }

    function simulateLoss(epoch, maxEpochs, lr, hiddenSize) {
        const baseLoss = 2.5 * Math.exp(-epoch * lr * 3 / hiddenSize * 8) + 0.05;
        const noise = (Math.random() - 0.5) * 0.15 * Math.exp(-epoch * 0.05);
        const capacityBonus = Math.max(0, (4 - hiddenSize) * 0.1);
        return Math.max(0.01, baseLoss + noise + capacityBonus);
    }

    /**
     * Simulate prediction probabilities that converge toward correctIdx.
     * correctIdx is passed in as a stable, deterministic value — it does NOT
     * change between epochs, so training reliably converges to one answer.
     */
    function simulatePredictions(epoch, maxEpochs, n, correctIdx) {
        const probs = new Array(n);
        // Confidence grows from ~10% at epoch 0 to ~95% at maxEpochs
        const confidence = Math.min(0.95, 0.10 + 0.85 * (epoch / maxEpochs));
        const remaining = 1 - confidence;

        for (let i = 0; i < n; i++) {
            if (i === correctIdx) {
                probs[i] = confidence + (Math.random() - 0.5) * 0.04;
            } else {
                probs[i] = remaining / (n - 1) + (Math.random() - 0.5) * 0.02;
            }
            probs[i] = Math.max(0.001, probs[i]);
        }

        // Normalize so they sum to 1
        const sum = probs.reduce((a, b) => a + b, 0);
        return probs.map(p => p / sum);
    }

    function renderInputStream() {
        const labels = tasks[task].getLabels(currentSequence);
        let html = '';
        labels.forEach((label, i) => {
            const style = i === labels.length - 1 ? 'color:#6366f1;font-weight:700;' : '';
            html += `<span style="${style}">${label}</span>`;
            if (i < labels.length - 1) html += ' → ';
        });
        inputStream.innerHTML = html;
    }

    function renderPredictions(probs, labels, correctIdx) {
        const maxProb = Math.max(...probs);
        const indexed = probs.map((p, i) => ({
            label: labels[i],
            prob: p,
            isCorrect: i === correctIdx
        }));
        // Sort highest probability first
        indexed.sort((a, b) => b.prob - a.prob);

        let html = '';
        indexed.forEach(({ label, prob, isCorrect }) => {
            const pct = (prob * 100).toFixed(1);
            const isTop = prob === maxProb;
            // Green when model correctly picks the right answer; indigo otherwise
            const barColor = isTop && isCorrect ? '#22c55e' : isTop ? '#6366f1' : '#d1d5db';
            const textColor = isTop ? (isCorrect ? '#16a34a' : '#6366f1') : '#6b7280';
            const tag = isCorrect ? ' ✓' : '';

            html += `
                <div class="pred-bar-row">
                    <span class="pred-bar-label" style="color:${textColor}">${label}${tag}</span>
                    <div class="pred-bar-track">
                        <div class="pred-bar-fill" style="width:${pct}%;background:${barColor}"></div>
                    </div>
                    <span class="pred-bar-value">${pct}%</span>
                </div>
            `;
        });
        predBars.innerHTML = html;
    }

    function resetSim() {
        stopTraining();
        epoch = 0;
        lossHistory = [];

        currentSequence  = tasks[task].generateSequence();
        currentPredLabels = tasks[task].getPredictionLabels(currentSequence);
        // Fix the correct index once — it stays constant across all training epochs
        currentCorrectIdx = tasks[task].getCorrectIndex(currentSequence, currentPredLabels);

        renderInputStream();

        const uniformProbs = currentPredLabels.map(() => 1 / currentPredLabels.length);
        renderPredictions(uniformProbs, currentPredLabels, currentCorrectIdx);

        statusText.textContent = 'Ready';
        statusDot.classList.remove('running');
        epochVal.textContent = `0/${maxEpochs}`;
        initChart();
    }

    function trainStep() {
        if (epoch >= maxEpochs) {
            stopTraining();
            statusText.textContent = 'Training Complete';
            return;
        }

        epoch++;
        const loss = simulateLoss(epoch, maxEpochs, lr, hiddenSize);
        lossHistory.push(loss);

        lossChart.data.labels.push(epoch.toString());
        lossChart.data.datasets[0].data.push(loss);
        lossChart.update('none');

        // Use the stable correctIdx — convergence is now deterministic
        const probs = simulatePredictions(epoch, maxEpochs, currentPredLabels.length, currentCorrectIdx);
        renderPredictions(probs, currentPredLabels, currentCorrectIdx);

        epochVal.textContent = `${epoch}/${maxEpochs}`;

        if (epoch > maxEpochs * 0.7 && loss < 0.1 && hiddenSize > 12) {
            statusText.textContent = `Epoch ${epoch} — Possible overfitting`;
        } else {
            statusText.textContent = `Epoch ${epoch} — Loss: ${loss.toFixed(4)}`;
        }
    }

    function startTraining() {
        if (training) return;
        if (epoch >= maxEpochs) resetSim();
        training = true;
        startBtn.textContent = '⏸ Pause';
        statusDot.classList.add('running');
        trainTimer = setInterval(trainStep, 150);
    }

    function stopTraining() {
        training = false;
        startBtn.textContent = '▶ Start Training';
        statusDot.classList.remove('running');
        clearInterval(trainTimer);
    }

    // ── Event listeners ───────────────────────────────────────────────────────
    taskSelect.addEventListener('change', () => { task = taskSelect.value; resetSim(); });
    lrSlider.addEventListener('input', () => { lr = parseFloat(lrSlider.value); lrVal.textContent = lr.toFixed(3); });
    hiddenSlider.addEventListener('input', () => { hiddenSize = parseInt(hiddenSlider.value); hiddenVal.textContent = hiddenSize; });
    epochSlider.addEventListener('input', () => { maxEpochs = parseInt(epochSlider.value); epochVal.textContent = `${epoch}/${maxEpochs}`; });
    startBtn.addEventListener('click', () => { if (training) stopTraining(); else startTraining(); });
    resetBtn.addEventListener('click', resetSim);

    // Init
    resetSim();

})();
