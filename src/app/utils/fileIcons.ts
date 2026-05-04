export interface FileIconConfig {
  icon: string;
  color: string;
}

const iconMap: Record<string, FileIconConfig> = {
  pdf: { icon: "📕", color: "#e53935" },
  doc: { icon: "📘", color: "#2196f3" },
  docx: { icon: "📘", color: "#2196f3" },
  xls: { icon: "📗", color: "#43a047" },
  xlsx: { icon: "📗", color: "#43a047" },
  ppt: { icon: "📙", color: "#ff5722" },
  pptx: { icon: "📙", color: "#ff5722" },
  txt: { icon: "📄", color: "#90a4ae" },
  md: { icon: "📝", color: "#2196f3" },
  json: { icon: "📋", color: "#f9a825" },
  js: { icon: "📜", color: "#f7df1e" },
  mjs: { icon: "📜", color: "#f7df1e" },
  ts: { icon: "📜", color: "#3178c6" },
  tsx: { icon: "📜", color: "#3178c6" },
  jsx: { icon: "📜", color: "#61dafb" },
  rs: { icon: "⚙️", color: "#dea584" },
  py: { icon: "🐍", color: "#3776ab" },
  java: { icon: "☕", color: "#007396" },
  c: { icon: "🔧", color: "#a8b9cc" },
  cpp: { icon: "🔧", color: "#00599c" },
  h: { icon: "🔧", color: "#a8b9cc" },
  css: { icon: "🎨", color: "#264de4" },
  scss: { icon: "🎨", color: "#cc6699" },
  sass: { icon: "🎨", color: "#cc6699" },
  less: { icon: "🎨", color: "#1d365d" },
  html: { icon: "🌐", color: "#e34c26" },
  htm: { icon: "🌐", color: "#e34c26" },
  xml: { icon: "📰", color: "#0060ac" },
  svg: { icon: "🖼️", color: "#ffb13b" },
  png: { icon: "🖼️", color: "#26a69a" },
  jpg: { icon: "🖼️", color: "#26a69a" },
  jpeg: { icon: "🖼️", color: "#26a69a" },
  gif: { icon: "🖼️", color: "#26a69a" },
  webp: { icon: "🖼️", color: "#26a69a" },
  ico: { icon: "🖼️", color: "#26a69a" },
  zip: { icon: "📦", color: "#f5a623" },
  rar: { icon: "📦", color: "#6c88c4" },
  "7z": { icon: "📦", color: "#f5a623" },
  tar: { icon: "📦", color: "#8b8b8b" },
  gz: { icon: "📦", color: "#8b8b8b" },
  exe: { icon: "⚡", color: "#00c853" },
  msi: { icon: "⚡", color: "#00c853" },
  dmg: { icon: "⚡", color: "#a8a8a8" },
  deb: { icon: "📦", color: "#0072c6" },
  rpm: { icon: "📦", color: "#fc0027" },
  apk: { icon: "📱", color: "#3ddc84" },
  ipa: { icon: "📱", color: "#a8a8a8" },
  mp3: { icon: "🎵", color: "#e91e63" },
  wav: { icon: "🎵", color: "#e91e63" },
  flac: { icon: "🎵", color: "#e91e63" },
  mp4: { icon: "🎬", color: "#e91e63" },
  mkv: { icon: "🎬", color: "#e91e63" },
  avi: { icon: "🎬", color: "#e91e63" },
  mov: { icon: "🎬", color: "#e91e63" },
  webm: { icon: "🎬", color: "#e91e63" },
  wmv: { icon: "🎬", color: "#e91e63" },
  log: { icon: "📋", color: "#90a4ae" },
  env: { icon: "🔐", color: "#f9a825" },
  toml: { icon: "📋", color: "#9c27b0" },
  yaml: { icon: "📋", color: "#f9a825" },
  yml: { icon: "📋", color: "#f9a825" },
  lock: { icon: "🔒", color: "#f9a825" },
  gitignore: { icon: "🔧", color: "#f4511e" },
  editorconfig: { icon: "🔧", color: "#ff9800" },
  gitattributes: { icon: "🔧", color: "#f4511e" },
  cargo: { icon: "📦", color: "#dea584" },
  cargo_toml: { icon: "📦", color: "#dea584" },
};

export function getFileIcon(
  extension: string | null | undefined,
  isDir: boolean
): FileIconConfig {
  if (isDir) {
    return { icon: "📁", color: "#ffc107" };
  }

  if (!extension) {
    return { icon: "📄", color: "#90a4ae" };
  }

  const ext = extension.toLowerCase().replace(/^\./, "");
  return iconMap[ext] || { icon: "📄", color: "#90a4ae" };
}
