pub fn copy_text(text: &str) -> Result<(), String> {
  copy_text_with(text, |text| {
    let mut clipboard = arboard::Clipboard::new().map_err(|error| error.to_string())?;
    clipboard.set_text(text.to_string()).map_err(|error| error.to_string())
  })
}

fn copy_text_with(text: &str, writer: impl FnOnce(&str) -> Result<(), String>) -> Result<(), String> {
  writer(text)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn copy_text_with_runs_writer() {
    assert!(copy_text_with("abc", |_text| Ok(())).is_ok());
  }

  #[test]
  fn copy_text_with_propagates_error() {
    let result = copy_text_with("abc", |_text| Err("clipboard unavailable".to_string()));
    assert_eq!(result.unwrap_err(), "clipboard unavailable");
  }
}
