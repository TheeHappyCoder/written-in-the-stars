import type { ConstellationData } from '../data';
import { buildShareURL } from '../data';
import { generateConstellation, normalizePositions } from '../constellation';
import { ConstellationRenderer } from '../renderer';

const THEMES = [
  { id: 'gold', label: 'Warm Gold', class: '' },
  { id: 'rose', label: 'Rose Quartz', class: 'theme-rose' },
  { id: 'arctic', label: 'Arctic Blue', class: 'theme-arctic' },
  { id: 'aurora', label: 'Aurora', class: 'theme-aurora' },
] as const;

const TOUR_SHOWN_KEY = 'wis-tour-shown';

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
            <label for="field-sentence">Add a sentence (press Enter)</label>
            <div class="sentence-input-row">
              <input type="text" id="field-sentence" placeholder="Write something from the heart..." maxlength="200" />
              <button type="button" class="btn-add-sentence" id="btn-add">Add</button>
            </div>
          </div>

          <div class="form-field">
            <label>Your stars <span id="star-count">(1 star)</span></label>
            <div class="sentence-list" id="sentence-list"></div>
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
        <div class="preview-toolbar" id="preview-toolbar">
          <button type="button" class="preview-tool-btn" id="btn-drag-toggle" title="Drag stars to rearrange">
            <span class="tool-icon">&#9995;</span> Arrange stars
          </button>
          <button type="button" class="preview-tool-btn" id="btn-mobile-toggle" title="Preview on mobile">
            <span class="tool-icon">&#128241;</span> Mobile view
          </button>
          <button type="button" class="preview-tool-btn hidden" id="btn-reset-positions" title="Reset to heart shape">
            <span class="tool-icon">&#10227;</span> Reset
          </button>
        </div>
        <div class="preview-frame" id="preview-frame">
          <canvas id="preview-canvas"></canvas>
        </div>
        <div class="drag-hint hidden" id="drag-hint">Drag any star to rearrange your constellation</div>
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

    <div class="tour-overlay" id="tour-overlay">
      <div class="tour-card">
        <div class="tour-icon">&#10022;</div>
        <h2 class="tour-title">Write a constellation</h2>
        <div class="tour-steps">
          <div class="tour-step">
            <span class="tour-step-num">1</span>
            <span class="tour-step-text"><strong>Type a sentence</strong> and press Enter. Each sentence becomes a star in their night sky.</span>
          </div>
          <div class="tour-step">
            <span class="tour-step-num">2</span>
            <span class="tour-step-text"><strong>Add as many as you like.</strong> More sentences, more stars, a bigger constellation.</span>
          </div>
          <div class="tour-step">
            <span class="tour-step-num">3</span>
            <span class="tour-step-text"><strong>Share the link.</strong> They'll watch their constellation form and discover your words hidden in the stars.</span>
          </div>
        </div>
        <button type="button" class="btn-tour-start" id="btn-tour-start">Start writing</button>
      </div>
    </div>
  `;

  // State
  let selectedTheme: ConstellationData['theme'] = 'gold';
  let previewRenderer: ConstellationRenderer | null = null;
  let customPositions: [number, number][] | null = null;
  let dragMode = false;
  let mobilePreview = false;
  const sentences: string[] = ['You are the reason I look up at the stars'];

  const form = document.getElementById('create-form') as HTMLFormElement;
  const fieldTo = document.getElementById('field-to') as HTMLInputElement;
  const fieldFrom = document.getElementById('field-from') as HTMLInputElement;
  const fieldSentence = document.getElementById('field-sentence') as HTMLInputElement;
  const btnAdd = document.getElementById('btn-add')!;
  const sentenceListEl = document.getElementById('sentence-list')!;
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
  const previewFrame = document.getElementById('preview-frame')!;
  const tourOverlay = document.getElementById('tour-overlay')!;
  const btnTourStart = document.getElementById('btn-tour-start')!;
  const btnDragToggle = document.getElementById('btn-drag-toggle')!;
  const btnMobileToggle = document.getElementById('btn-mobile-toggle')!;
  const btnResetPositions = document.getElementById('btn-reset-positions')!;
  const dragHint = document.getElementById('drag-hint')!;

  // Tour
  if (localStorage.getItem(TOUR_SHOWN_KEY)) {
    tourOverlay.classList.add('hidden');
  }

  btnTourStart.addEventListener('click', () => {
    tourOverlay.classList.add('fade-out');
    setTimeout(() => {
      tourOverlay.classList.add('hidden');
      fieldSentence.focus();
    }, 500);
    localStorage.setItem(TOUR_SHOWN_KEY, '1');
  });

  // Render sentence list
  function renderSentences() {
    starCount.textContent = `(${sentences.length} star${sentences.length !== 1 ? 's' : ''})`;

    if (sentences.length === 0) {
      sentenceListEl.innerHTML = '<div class="sentence-empty">No stars yet. Type a sentence above and press Enter.</div>';
    } else {
      sentenceListEl.innerHTML = sentences.map((s, i) => `
        <div class="sentence-chip">
          <span class="sentence-number">${i + 1}</span>
          <span class="sentence-text">${escapeHtml(s)}</span>
          <button type="button" class="sentence-remove" data-index="${i}" title="Remove">&times;</button>
        </div>
      `).join('');
    }

    updatePreview();
  }

  // Remove sentence
  sentenceListEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.sentence-remove') as HTMLElement;
    if (!btn) return;
    const idx = parseInt(btn.dataset.index!, 10);
    sentences.splice(idx, 1);
    renderSentences();
  });

  // Add sentence
  function addSentence() {
    const text = fieldSentence.value.trim();
    if (!text) return;
    sentences.push(text);
    fieldSentence.value = '';
    renderSentences();
    fieldSentence.focus();
  }

  fieldSentence.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSentence();
    }
  });

  btnAdd.addEventListener('click', addSentence);

  // Preview
  function updatePreview() {
    if (sentences.length > 0 && previewCanvas) {
      // If sentence count changed, clear custom positions (they no longer match)
      if (customPositions && customPositions.length !== sentences.length) {
        customPositions = null;
        btnResetPositions.classList.add('hidden');
      }

      const constellation = generateConstellation(
        sentences,
        previewCanvas.offsetWidth,
        previewCanvas.offsetHeight,
        customPositions ?? undefined
      );
      if (!previewRenderer) {
        previewRenderer = new ConstellationRenderer(previewCanvas);
        previewRenderer.startRenderLoop();
        if (dragMode) {
          previewRenderer.enableDrag((positions) => {
            customPositions = positions;
            btnResetPositions.classList.remove('hidden');
          });
        }
      }
      previewRenderer.setConstellation(constellation);
      for (let i = 0; i <= constellation.stars.length; i++) {
        setTimeout(() => {
          if (previewRenderer) {
            (previewRenderer as unknown as { state: { revealedCount: number } }).state.revealedCount = i;
          }
        }, i * 100);
      }
    }
  }

  // Drag toggle
  btnDragToggle.addEventListener('click', () => {
    dragMode = !dragMode;
    btnDragToggle.classList.toggle('active', dragMode);
    if (dragMode) {
      dragHint.classList.remove('hidden');
      setTimeout(() => dragHint.classList.add('hidden'), 3000);
      if (previewRenderer) {
        previewRenderer.enableDrag((positions) => {
          customPositions = positions;
          btnResetPositions.classList.remove('hidden');
        });
      }
    } else {
      dragHint.classList.add('hidden');
      if (previewRenderer) {
        previewRenderer.disableDrag();
      }
    }
  });

  // Reset positions
  btnResetPositions.addEventListener('click', () => {
    customPositions = null;
    btnResetPositions.classList.add('hidden');
    updatePreview();
  });

  // Mobile preview toggle
  btnMobileToggle.addEventListener('click', () => {
    mobilePreview = !mobilePreview;
    btnMobileToggle.classList.toggle('active', mobilePreview);
    previewFrame.classList.toggle('mobile-frame', mobilePreview);
    // Give the browser a frame to re-layout, then resize the renderer
    requestAnimationFrame(() => {
      if (previewRenderer) {
        previewRenderer.triggerResize();
      }
      updatePreview();
    });
  });

  // Theme picker
  themePicker.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.theme-btn') as HTMLElement;
    if (!btn) return;
    themePicker.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const theme = btn.dataset.theme as ConstellationData['theme'];
    selectedTheme = theme;
    document.documentElement.className = THEMES.find(t => t.id === theme)?.class || '';
    updatePreview();
  });

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (sentences.length === 0) {
      fieldSentence.focus();
      return;
    }

    const data: ConstellationData = {
      to: fieldTo.value.trim(),
      from: fieldFrom.value.trim(),
      message: sentences.join('\n'),
      theme: selectedTheme,
    };

    // Include custom positions if the user arranged stars
    if (customPositions && customPositions.length === sentences.length) {
      // Normalize to safe bounds, then round for compact URLs
      const normalized = normalizePositions(customPositions);
      data.pos = normalized.map(([x, y]) => [
        Math.round(x * 1000) / 1000,
        Math.round(y * 1000) / 1000,
      ]);
    }

    if (!data.to || !data.from) {
      if (!data.to) fieldTo.focus();
      else fieldFrom.focus();
      return;
    }

    const url = buildShareURL(data);
    shareUrl.value = url;
    sharePanel.classList.remove('hidden');
    btnCreate.classList.add('hidden');

    if (!navigator.share) {
      btnShare.classList.add('hidden');
    }
  });

  // Copy
  btnCopy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrl.value);
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy'; }, 2000);
  });

  // Share (Web Share API)
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

  // Preview button
  btnPreview.addEventListener('click', () => {
    window.open(shareUrl.value, '_blank');
  });

  // Back
  btnBack.addEventListener('click', () => {
    sharePanel.classList.add('hidden');
    btnCreate.classList.remove('hidden');
  });

  // Pre-fill "To" field if this is a reply
  const urlParams = new URLSearchParams(window.location.search);
  const replyTo = urlParams.get('replyTo');
  if (replyTo) {
    fieldTo.value = replyTo;
    fieldSentence.focus();
  }

  // Initial render with default sentence
  renderSentences();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
