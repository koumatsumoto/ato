function update() {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}

export function initViewportHeight() {
  update();
  window.addEventListener("resize", update);
}
