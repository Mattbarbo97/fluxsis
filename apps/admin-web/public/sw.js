self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
self.addEventListener("fetch", () => {
  // Passthrough — sem cache offline por enquanto, só o necessário
  // pra atender os critérios de instalação do navegador.
});
