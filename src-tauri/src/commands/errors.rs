use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CommandError {
    InvalidRequest(String),
    ValidationFailed(String),
    NotFound(String),
    PermissionDenied,
    InternalError(String),
    StateError(String),
    Cancelled,
}

impl CommandError {
    pub fn to_string(&self) -> String {
        match self {
            Self::InvalidRequest(msg) => format!("[COMMAND_INVALID_REQUEST] {msg}"),
            Self::ValidationFailed(msg) => format!("[COMMAND_VALIDATION_FAILED] {msg}"),
            Self::NotFound(msg) => format!("[COMMAND_NOT_FOUND] {msg}"),
            Self::PermissionDenied => "[COMMAND_PERMISSION_DENIED] Permission denied".to_string(),
            Self::InternalError(msg) => format!("[COMMAND_INTERNAL_ERROR] {msg}"),
            Self::StateError(msg) => format!("[COMMAND_STATE_ERROR] {msg}"),
            Self::Cancelled => "[COMMAND_CANCELLED] Operation cancelled".to_string(),
        }
    }
}

impl From<String> for CommandError {
    fn from(s: String) -> Self {
        Self::InternalError(s)
    }
}

impl From<&str> for CommandError {
    fn from(s: &str) -> Self {
        Self::InternalError(s.to_string())
    }
}
