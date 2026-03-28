function update() {
  document.documentElement.style.setProperty("--app-height", `${String(window.innerHeight)}px`);
}

export function initViewportHeight(): void {
  update();
  window.addEventListener("resize", update);
}
