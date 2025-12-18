<!-- HTML -->
<div id="readme-widget">
        <div class="widget-label">READ<br>ME</div>
<div id="readme-overlay" class="hidden">
        <div id="readme-box">
            <button id="readme-close">횞</button>
            <h2>SYSTEM MANUAL</h2>

            <p>
                <strong>MISSION:</strong><br>
                Falling code fragments threaten the system integrity.<br>
                Type the commands exactly as they appear to neutralize them.
            </p>

            <p>
                <strong>PROTOCOL:</strong><br>
                Prevent fragments from reaching the bottom.<br>
                Maintain high accuracy for combo bonuses.
            </p>

            <div class="contact-info">
                <div style="color: #888; margin-bottom: 15px; font-size: 0.9rem;">SYSTEM ADMINISTRATOR CONTACT</div>


<!-- JS -->
const readmeWidget = document.getElementById('readme-widget');
            const readmeOverlay = document.getElementById('readme-overlay');
            const readmeClose = document.getElementById('readme-close');

            if (readmeWidget && readmeOverlay && readmeClose) {
                readmeWidget.addEventListener('click', () => {
                    readmeOverlay.classList.remove('hidden');
                    if (window.sfx) sfx.play('click');});