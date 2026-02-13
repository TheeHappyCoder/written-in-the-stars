import type { ConstellationData } from '../data';
import { decode, splitSentences } from '../data';
import { generateConstellation } from '../constellation';
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
  const constellation = generateConstellation(sentences, window.innerWidth, window.innerHeight);

  app.innerHTML = `
    <div class="view-page">
      <canvas id="constellation-canvas"></canvas>

      <div class="view-intro" id="view-intro">
        <p class="intro-from">${escapeHtml(data.from)} wrote you a constellation</p>
      </div>

      <div class="view-hint hidden" id="view-hint">
        <p>touch the stars to read the message</p>
      </div>

      <div class="view-footer hidden" id="view-footer">
        <p class="footer-valentine">Happy Valentine's Day</p>
        <p class="footer-names">To ${escapeHtml(data.to)}, with love from ${escapeHtml(data.from)}</p>
        <a href="${window.location.origin}${window.location.pathname}" class="footer-create">Write your own constellation</a>
      </div>
    </div>
  `;

  const canvas = document.getElementById('constellation-canvas') as HTMLCanvasElement;
  const intro = document.getElementById('view-intro')!;
  const hint = document.getElementById('view-hint')!;
  const footer = document.getElementById('view-footer')!;

  const renderer = new ConstellationRenderer(canvas);
  renderer.setConstellation(constellation, () => {
    hint.classList.remove('hidden');
    hint.classList.add('fade-in');
    setTimeout(() => {
      footer.classList.remove('hidden');
      footer.classList.add('fade-in');
    }, 2000);
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
