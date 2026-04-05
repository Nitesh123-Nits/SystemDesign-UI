/* ============================================================
   SystemDesign.Pro — Shared Guide Logic
   Dynamically unifies the UI of all technical guides
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    initSharedUI();
    initRetroEffects();
});

/**
 * Initializes the common UI elements (Header, Navigation, Assistant)
 */
function initSharedUI() {
    // 1. Inject Header
    const header = document.createElement('header');
    header.className = 'shared-header';
    header.innerHTML = `
        <a href="index.html" class="header-logo">
            <span class="logo-icon">🦾</span>
            <span class="logo-text">SystemDesign.Pro</span>
        </a>
        <div class="header-actions">
            <a href="index.html" class="back-btn">← Back to Dashboard</a>
        </div>
    `;
    document.body.prepend(header);

    // 2. Wrap existing content in a container if not already
    // (This helps with consistent padding and glassmorphism)
    /* 
    const bodyContent = Array.from(document.body.children).filter(el => el !== header);
    const container = document.createElement('main');
    container.className = 'guide-container';
    bodyContent.forEach(el => container.appendChild(el));
    document.body.appendChild(container);
    */

}

/**
 * Injects the retro background effects (Grid, Orbs, Scanlines)
 */
function initRetroEffects() {
    // 1. Orbs
    const orbs = document.createElement('div');
    orbs.className = 'bg-orbs';
    orbs.innerHTML = `
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
    `;
    document.body.appendChild(orbs);

    // 2. Grid
    const grid = document.createElement('div');
    grid.className = 'bg-grid-retro';
    document.body.appendChild(grid);

    // 3. Scanlines
    const scanline = document.createElement('div');
    scanline.className = 'crt-scanline';
    document.body.appendChild(scanline);
}

// Helper to prevent propagation (useful for interactive diagrams)
window.stopProp = function(e) {
    e.stopPropagation();
};
