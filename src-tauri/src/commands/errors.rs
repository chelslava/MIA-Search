use std::fmt;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(dead_code)]
pub enum CommandError {
    InvalidRequest(String),
    ValidationFailed(String),
    NotFound(String),
    PermissionDenied,
    InternalError(String),
    StateError(String),
    Cancelled,
}

impl fmt::Display for CommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidRequest(msg) => write!(f, "[COMMAND_INVALID_REQUEST] {msg}"),
            Self::ValidationFailed(msg) => write!(f, "[COMMAND_VALIDATION_FAILED] {msg}"),
            Self::NotFound(msg) => write!(f, "[COMMAND_NOT_FOUND] {msg}"),
            Self::PermissionDenied => write!(f, "[COMMAND_PERMISSION_DENIED] Permission denied"),
            Self::InternalError(msg) => write!(f, "[COMMAND_INTERNAL_ERROR] {msg}"),
            Self::StateError(msg) => write!(f, "[COMMAND_STATE_ERROR] {msg}"),
            Self::Cancelled => write!(f, "[COMMAND_CANCELLED] Operation cancelled"),
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
