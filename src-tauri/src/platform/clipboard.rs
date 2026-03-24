pub fn copy_text(text: &str) -> Result<(), String> {
  let mut clipboard = arboard::Clipboard::new().map_err(|error| error.to_string())?;
  clipboard.set_text(text.to_string()).map_err(|error| error.to_string())
}
