import './style.css';
import { StarField } from './starfield';
import { createView } from './views/create';
import { viewPage } from './views/view';

function getRoute(): 'create' | 'view' {
  const params = new URLSearchParams(window.location.search);
  return params.has('d') ? 'view' : 'create';
}

function init() {
  const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  const starField = new StarField(bgCanvas);
  starField.start();

  const app = document.getElementById('app')!;
  const route = getRoute();

  if (route === 'create') {
    createView(app);
  } else {
    viewPage(app);
  }
}

init();
