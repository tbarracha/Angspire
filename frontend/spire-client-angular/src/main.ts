import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

console.log('[UI] Angular main.ts running');

// Heartbeat
window.onmessage = (event) => {
  const msg = event.data?.pluginMessage;
  if (!msg) return;

  if (msg.type === '_debug/ping') {
    parent.postMessage(
      { pluginMessage: { type:'_debug/pong', seq: msg.seq, sentAt: msg.sentAt } },
      '*'
    );
  }
};

// Example resize trigger
(document.getElementById('resizeBtn') as HTMLButtonElement)?.addEventListener('click', () => {
  parent.postMessage(
    { pluginMessage: { type:'resize', width: 600, height: 400 } },
    '*'
  );
});

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
