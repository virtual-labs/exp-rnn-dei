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

    // Task definitions
    const tasks = {
        nextnum: {
            name: 'Next Number Prediction',
            generateSequence: () => {
                const len = 10;
                const start = Math.floor(Math.random() * 5) + 1;
                return Array.from({ length: len }, (_, i) => start + i);
            },
            getLabels: (seq) => seq.map(v => v.toString()),
            getPredictionLabels: (seq) => {
                const last = seq[seq.length - 1];
                return Array.from({ length: 5 }, (_, i) => (last + i).toString());
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
            getPredictionLabels: (seq) => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                // Show top likely chars
                return chars.slice(0, 8);
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
            getPredictionLabels: (seq) => {
                return [' ', 'A', 'B', 'C', 'D', 'E', 'R', 'S', 'T'];
            }
        }
    };

    let currentSequence = [];
    let currentPredictions = [];

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
        // Simulate a decreasing loss with some noise
        const baseLoss = 2.5 * Math.exp(-epoch * lr * 3 / hiddenSize * 8) + 0.05;
        const noise = (Math.random() - 0.5) * 0.15 * Math.exp(-epoch * 0.05);
        const capacityBonus = Math.max(0, (4 - hiddenSize) * 0.1); // smaller hidden = worse
        return Math.max(0.01, baseLoss + noise + capacityBonus);
    }

    function simulatePredictions(epoch, maxEpochs, labels) {
        const n = labels.length;
        const correctIdx = Math.floor(Math.random() * n);
        const probs = [];
        const confidence = Math.min(0.95, epoch / maxEpochs + 0.1);

        for (let i = 0; i < n; i++) {
            if (i === correctIdx) {
                probs.push(confidence);
            } else {
                probs.push((1 - confidence) / (n - 1) + Math.random() * 0.05);
            }
        }

        // Normalize
        const sum = probs.reduce((a, b) => a + b, 0);
        return probs.map(p => p / sum);
    }

    function renderInputStream() {
        const labels = tasks[task].getLabels(currentSequence);
        let html = '';
        labels.forEach((label, i) => {
            const highlightClass = i === labels.length - 1 ? 'color: #6366f1; font-weight: 700;' : '';
            html += `<span style="${highlightClass}">${label}</span>`;
            if (i < labels.length - 1) html += ' → ';
        });
        inputStream.innerHTML = html;
    }

    function renderPredictions(probs, labels) {
        let html = '';
        const maxProb = Math.max(...probs);

        // Sort by probability descending
        const indexed = probs.map((p, i) => ({ label: labels[i], prob: p }));
        indexed.sort((a, b) => b.prob - a.prob);

        indexed.forEach(({ label, prob }) => {
            const pct = (prob * 100).toFixed(1);
            const isTop = prob === maxProb;
            const color = isTop ? '#6366f1' : '#d1d5db';
            const textColor = isTop ? '#6366f1' : '#6b7280';

            html += `
                <div class="pred-bar-row">
                    <span class="pred-bar-label" style="color:${textColor}">${label}</span>
                    <div class="pred-bar-track">
                        <div class="pred-bar-fill" style="width:${pct}%;background:${color}"></div>
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
        currentSequence = tasks[task].generateSequence();
        currentPredictions = [];
        renderInputStream();

        const predLabels = tasks[task].getPredictionLabels(currentSequence);
        const uniformProbs = predLabels.map(() => 1 / predLabels.length);
        renderPredictions(uniformProbs, predLabels);

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

        // Update chart
        lossChart.data.labels.push(epoch.toString());
        lossChart.data.datasets[0].data.push(loss);
        lossChart.update('none');

        // Update predictions
        const predLabels = tasks[task].getPredictionLabels(currentSequence);
        const probs = simulatePredictions(epoch, maxEpochs, predLabels);
        renderPredictions(probs, predLabels);

        epochVal.textContent = `${epoch}/${maxEpochs}`;

        // Detect overfitting visual indicator
        if (epoch > maxEpochs * 0.7 && loss < 0.1 && hiddenSize > 12) {
            statusText.textContent = `Epoch ${epoch} — Possible overfitting`;
        } else {
            statusText.textContent = `Epoch ${epoch} — Loss: ${loss.toFixed(4)}`;
        }
    }

    function startTraining() {
        if (training) return;
        if (epoch >= maxEpochs) {
            resetSim();
        }
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

    // Event listeners
    taskSelect.addEventListener('change', () => {
        task = taskSelect.value;
        resetSim();
    });

    lrSlider.addEventListener('input', () => {
        lr = parseFloat(lrSlider.value);
        lrVal.textContent = lr.toFixed(3);
    });

    hiddenSlider.addEventListener('input', () => {
        hiddenSize = parseInt(hiddenSlider.value);
        hiddenVal.textContent = hiddenSize;
    });

    epochSlider.addEventListener('input', () => {
        maxEpochs = parseInt(epochSlider.value);
        epochVal.textContent = `${epoch}/${maxEpochs}`;
    });

    startBtn.addEventListener('click', () => {
        if (training) {
            stopTraining();
        } else {
            startTraining();
        }
    });

    resetBtn.addEventListener('click', resetSim);

    // Init
    resetSim();

})();
