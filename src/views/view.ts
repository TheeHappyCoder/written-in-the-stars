import type { ConstellationData } from '../data';
import { decode, splitSentences } from '../data';
import { generateConstellation, normalizePositions } from '../constellation';
import { ConstellationRenderer } from '../renderer';

const THEME_CLASS: Record<ConstellationData['theme'], string> = {
  gold: '',
  rose: 'theme-rose',
  arctic: 'theme-arctic',
  aurora: 'theme-aurora',
};

export function viewPage(app: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('d');

  if (!encoded) {
    showError(app);
    return;
  }

  const data = decode(encoded);
  if (!data) {
    showError(app);
    return;
  }

  document.documentElement.className = THEME_CLASS[data.theme] || '';

  const sentences = splitSentences(data.message);
  // Normalize custom positions to ensure they fit within safe bounds
  const customPos = data.pos && data.pos.length === sentences.length
    ? normalizePositions(data.pos)
    : undefined;
  const constellation = generateConstellation(sentences, window.innerWidth, window.innerHeight, customPos);

  const now = new Date();
  const isValentines = now.getMonth() === 1 && now.getDate() === 14;
  const footerMessage = isValentines
    ? "Happy Valentine's Day"
    : 'Written in the stars, meant for you';

  app.innerHTML = `
    <div class="view-page">
      <canvas id="constellation-canvas"></canvas>

      <div class="view-intro" id="view-intro">
        <p class="intro-from">${escapeHtml(data.from)} wrote you a constellation</p>
      </div>

      <div class="view-hint hidden" id="view-hint">
        <p>tap the brightest star to begin</p>
      </div>

      <div class="view-footer hidden" id="view-footer">
        <p class="footer-valentine">${footerMessage}</p>
        <p class="footer-names">To ${escapeHtml(data.to)}, with love from ${escapeHtml(data.from)}</p>
        <div class="footer-actions">
          <button type="button" class="footer-btn" id="btn-show-card">read the full message</button>
          <span class="footer-dot">&#183;</span>
          <a href="${window.location.origin}${window.location.pathname}?replyTo=${encodeURIComponent(data.from)}" class="footer-btn">write ${escapeHtml(data.from)} back</a>
          <span class="footer-dot">&#183;</span>
          <a href="${window.location.origin}${window.location.pathname}" class="footer-btn">write your own</a>
        </div>
      </div>

      <div class="completion-overlay hidden" id="completion-overlay">
        <div class="completion-card">
          <div class="completion-flourish">&#10022;</div>
          <div class="completion-message">
            ${sentences.map(s => `<p>${escapeHtml(s)}</p>`).join('')}
          </div>
          <div class="completion-divider"></div>
          <p class="completion-tagline">${footerMessage}</p>
          <p class="completion-names">To ${escapeHtml(data.to)}, with love from ${escapeHtml(data.from)}</p>
          <a href="${window.location.origin}${window.location.pathname}?replyTo=${encodeURIComponent(data.from)}" class="completion-reply">Write ${escapeHtml(data.from)} back</a>
          <button type="button" class="completion-dismiss" id="completion-dismiss">see your constellation</button>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('constellation-canvas') as HTMLCanvasElement;
  const intro = document.getElementById('view-intro')!;
  const hint = document.getElementById('view-hint')!;
  const footer = document.getElementById('view-footer')!;
  const completionOverlay = document.getElementById('completion-overlay')!;
  const completionDismiss = document.getElementById('completion-dismiss')!;

  const renderer = new ConstellationRenderer(canvas);
  renderer.setConstellation(constellation, () => {
    // onRevealComplete: all stars visible, show hint
    hint.classList.remove('hidden');
    hint.classList.add('fade-in');
    setTimeout(() => {
      hint.classList.add('fade-out');
      setTimeout(() => hint.classList.add('hidden'), 1000);
      footer.classList.remove('hidden');
      footer.classList.add('fade-in');
    }, 3000);
  }, () => {
    // onAllRead: all stars tapped — show the completion card after a beat
    setTimeout(() => {
      footer.classList.add('hidden');
      hint.classList.add('hidden');
      completionOverlay.classList.remove('hidden');
      completionOverlay.classList.add('fade-in');
    }, 1500);
  });

  const btnShowCard = document.getElementById('btn-show-card')!;

  // Dismiss completion card to see the full constellation behind it
  completionDismiss.addEventListener('click', () => {
    completionOverlay.classList.add('fade-out');
    completionOverlay.classList.remove('fade-in');
    setTimeout(() => {
      completionOverlay.classList.add('hidden');
      completionOverlay.classList.remove('fade-out');
      footer.classList.remove('hidden');
      footer.classList.add('fade-in');
      footer.classList.remove('fade-out');
    }, 1000);
  });

  // Re-show the completion card from footer
  btnShowCard.addEventListener('click', () => {
    footer.classList.add('fade-out');
    footer.classList.remove('fade-in');
    setTimeout(() => {
      footer.classList.add('hidden');
      footer.classList.remove('fade-out');
      completionOverlay.classList.remove('hidden');
      completionOverlay.classList.add('fade-in');
      completionOverlay.classList.remove('fade-out');
    }, 500);
  });

  // Sequence: intro text -> pause -> start revealing stars
  setTimeout(() => {
    intro.classList.add('fade-out');
    setTimeout(() => {
      intro.classList.add('hidden');
      renderer.startRenderLoop();
      renderer.startRevealSequence(1000);
    }, 1000);
  }, 3000);
}

function showError(app: HTMLElement) {
  app.innerHTML = `
    <div class="view-error">
      <h1>This constellation couldn't be found</h1>
      <p>The link may be incomplete or expired.</p>
      <a href="${window.location.origin}${window.location.pathname}">Write a new constellation</a>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
