import './styles/base.css';
import './styles/components.css';
import { slides } from './slides/index.js';
import { applyTheme } from './theme.js';

const params = new URLSearchParams(location.search);
const role = params.has('presenter') ? 'presenter'
  : params.get('view') === 'preview' ? 'preview'
  : 'main';

document.body.classList.add(`role-${role}`);
const theme = applyTheme();

if (role === 'presenter') {
  import('./presenter/presenter.js').then((m) => m.start(slides));
} else {
  import('./engine/deck.js').then((m) => m.start(slides, role, theme));
}
