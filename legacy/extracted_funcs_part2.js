function handleDrop(index) {
            const word = state.activeWords[index];

            // Remove from DOM
            if (word.el.parentNode) word.el.parentNode.removeChild(word.el);

            // Remove from array
            state.activeWords.splice(index, 1);

            // Reset Target if dropped
            if (state.targetId === word.id) {
                state.targetId = null;
                updateTargetDisplay('');
            }

            // Logic
            state.lives--;
            state.combo = 0;
            updateHUD();

            // Visual Feedback
            els.hud.lives.style.opacity = 0.5;
            setTimeout(() => els.hud.lives.style.opacity = 1, 200);

            if (state.lives <= 0) {
                gameOver(false);
            }
        }

function gameOver(victory = false) {
            state.isPlaying = false;
            state.isPaused = false;

            // Calculate Stats
            const durationMin = (Date.now() - state.startTime) / 60000;
            const wpm = durationMin > 0 ? Math.round((state.correctCharsTyped / 5) / durationMin) : 0;
            const accuracy = state.totalCharsTyped > 0 ? Math.round((state.correctCharsTyped / state.totalCharsTyped) * 100) : 0;

            // Update Result Screen
            els.result.title.textContent = victory ? "MISSION COMPLETE" : "SYSTEM FAILURE";
            els.result.title.style.color = victory ? "var(--success-color)" : "var(--danger-color)";
            els.result.title.style.textShadow = victory ? "0 0 20px var(--success-color)" : "0 0 20px var(--danger-color)";

            els.result.score.textContent = state.score;
            els.result.combo.textContent = state.maxCombo;
            els.result.wpm.textContent = wpm;
            els.result.acc.textContent = accuracy + "%";

            els.screens.result.classList.remove('hidden');

            // Submit Score
            if (state.userId) {
                els.result.status.textContent = "UPLOADING DATA...";
                try {
                    const res = await fetch(`${API_BASE}/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: state.userId,
                            score: state.score,
                            wpm: wpm,
                            accuracy: accuracy,
                            difficulty: state.difficulty.toLowerCase(),
                            pack: state.pack.toLowerCase()
                        })
                    });
                    const data = await res.json();
                    if (data.ok) {
                        els.result.status.textContent = "UPLOAD COMPLETE. CHECK RANKING.";
                    } else {
                        els.result.status.textContent = "UPLOAD FAILED.";
                    }
                } catch (e) {
                    console.error(e);
                    els.result.status.textContent = "SERVER ERROR. DATA NOT SAVED.";
                }
            } else {
                els.result.status.textContent = "OFFLINE MODE. DATA NOT SAVED.";
            }
        }

function renderLeaderboard(list) {
            if (!list || list.length === 0) {
                els.controls.leaderboard.innerHTML = '<div style="text-align:center; color:#666;">NO DATA FOUND. BE THE FIRST.</div>';
                return;
            }

            let html = '<table>';
            html += '<tr><th>RANK</th><th>AGENT</th><th style="text-align:right;">SCORE</th><th style="text-align:right;">WPM</th></tr>';

            list.forEach((item, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                const nameStyle = rank <= 3 ? 'color:var(--primary-neon); font-weight:bold; font-size: 1.1em;' : 'color:var(--primary-neon);';

                html += `<tr>
            <td class="${rankClass}" style="font-weight:bold;">#${rank}</td>
            <td style="${nameStyle}">${item.nickname}</td>
            <td style="text-align:right; font-family:var(--font-code); color:#fff;">${item.score}</td>
            <td style="text-align:right; font-family:var(--font-code); color:#888;">${item.wpm}</td>
        </tr>`;
            });
            html += '</table>';

            els.controls.leaderboard.innerHTML = html;
        }

