import type { ConstellationData } from '../data';
import { splitSentences, buildShareURL } from '../data';
import { generateConstellation } from '../constellation';
import { ConstellationRenderer } from '../renderer';

const THEMES = [
  { id: 'gold', label: 'Warm Gold', class: '' },
  { id: 'rose', label: 'Rose Quartz', class: 'theme-rose' },
  { id: 'arctic', label: 'Arctic Blue', class: 'theme-arctic' },
  { id: 'aurora', label: 'Aurora', class: 'theme-aurora' },
] as const;

export function createView(app: HTMLElement) {
  app.innerHTML = `
    <div class="create-page">
      <div class="create-content">
        <h1 class="create-title">Write someone a constellation</h1>
        <p class="create-subtitle">Your words become stars. Each sentence, a point of light in their sky.</p>

        <form class="create-form" id="create-form">
          <div class="form-row">
            <div class="form-field">
              <label for="field-to">To</label>
              <input type="text" id="field-to" placeholder="Their name" maxlength="50" required />
            </div>
            <div class="form-field">
              <label for="field-from">From</label>
              <input type="text" id="field-from" placeholder="Your name" maxlength="50" required />
            </div>
          </div>

          <div class="form-field">
            <label for="field-message">Your message</label>
            <textarea id="field-message" placeholder="Write from the heart. Each sentence becomes a star..." rows="5" required></textarea>
            <div class="char-hint" id="star-count">0 stars</div>
          </div>

          <div class="form-field">
            <label>Color theme</label>
            <div class="theme-picker" id="theme-picker">
              ${THEMES.map(
                (t, i) => `
                <button type="button" class="theme-btn${i === 0 ? ' active' : ''}" data-theme="${t.id}" title="${t.label}">
                  <span class="theme-dot theme-dot-${t.id}"></span>
                  <span class="theme-label">${t.label}</span>
                </button>`
              ).join('')}
            </div>
          </div>

          <button type="submit" class="btn-create" id="btn-create">
            Create Constellation
          </button>
        </form>
      </div>

      <div class="create-preview" id="create-preview">
        <canvas id="preview-canvas"></canvas>
      </div>

      <div class="share-panel hidden" id="share-panel">
        <div class="share-panel-inner">
          <h2>Your constellation is ready</h2>
          <p class="share-subtitle">Share this link and they'll see a sky written just for them.</p>
          <div class="share-link-box">
            <input type="text" id="share-url" readonly />
            <button type="button" class="btn-copy" id="btn-copy">Copy</button>
          </div>
          <div class="share-actions">
            <button type="button" class="btn-share" id="btn-share">Share</button>
            <button type="button" class="btn-preview" id="btn-preview">Preview</button>
          </div>
          <button type="button" class="btn-back" id="btn-back">Write another</button>
        </div>
      </div>
    </div>
  `;

  let selectedTheme: ConstellationData['theme'] = 'gold';
  let previewRenderer: ConstellationRenderer | null = null;

  const form = document.getElementById('create-form') as HTMLFormElement;
  const fieldTo = document.getElementById('field-to') as HTMLInputElement;
  const fieldFrom = document.getElementById('field-from') as HTMLInputElement;
  const fieldMessage = document.getElementById('field-message') as HTMLTextAreaElement;
  const starCount = document.getElementById('star-count')!;
  const themePicker = document.getElementById('theme-picker')!;
  const sharePanel = document.getElementById('share-panel')!;
  const shareUrl = document.getElementById('share-url') as HTMLInputElement;
  const btnCreate = document.getElementById('btn-create')!;
  const btnCopy = document.getElementById('btn-copy')!;
  const btnShare = document.getElementById('btn-share')!;
  const btnPreview = document.getElementById('btn-preview')!;
  const btnBack = document.getElementById('btn-back')!;
  const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;

  function updatePreview() {
    const text = fieldMessage.value.trim();
    const sentences = text ? splitSentences(text) : [];
    const count = sentences.length;
    starCount.textContent = `${count} star${count !== 1 ? 's' : ''}`;

    if (count > 0 && previewCanvas) {
      const constellation = generateConstellation(sentences, previewCanvas.offsetWidth, previewCanvas.offsetHeight);
      if (!previewRenderer) {
        previewRenderer = new ConstellationRenderer(previewCanvas);
        previewRenderer.startRenderLoop();
      }
      previewRenderer.setConstellation(constellation);
      // Reveal all immediately for preview
      for (let i = 0; i <= constellation.stars.length; i++) {
        setTimeout(() => {
          if (previewRenderer) {
            // Access internal state to set revealed count for preview
            (previewRenderer as unknown as { state: { revealedCount: number } }).state.revealedCount = i;
          }
        }, i * 100);
      }
    }
  }

  fieldMessage.addEventListener('input', updatePreview);

  themePicker.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.theme-btn') as HTMLElement;
    if (!btn) return;
    themePicker.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const theme = btn.dataset.theme as ConstellationData['theme'];
    selectedTheme = theme;
    document.documentElement.className = THEMES.find(t => t.id === theme)?.class || '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data: ConstellationData = {
      to: fieldTo.value.trim(),
      from: fieldFrom.value.trim(),
      message: fieldMessage.value.trim(),
      theme: selectedTheme,
    };

    const url = buildShareURL(data);
    shareUrl.value = url;
    sharePanel.classList.remove('hidden');
    btnCreate.classList.add('hidden');

    if (!navigator.share) {
      btnShare.classList.add('hidden');
    }
  });

  btnCopy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrl.value);
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy'; }, 2000);
  });

  btnShare.addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'Someone wrote you a constellation',
        text: `${fieldFrom.value.trim()} wrote a constellation for ${fieldTo.value.trim()}`,
        url: shareUrl.value,
      });
    } catch {
      // User cancelled
    }
  });

  btnPreview.addEventListener('click', () => {
    window.open(shareUrl.value, '_blank');
  });

  btnBack.addEventListener('click', () => {
    sharePanel.classList.add('hidden');
    btnCreate.classList.remove('hidden');
  });
}
