use crate::{core::models::SearchProfile, storage::presets_store::ProfilesStore, AppState};
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn profiles_list(state: State<'_, AppState>) -> Result<Vec<SearchProfile>, String> {
    profiles_list_inner(&state.profiles)
}

#[tauri::command]
pub fn profiles_save(
    state: State<'_, AppState>,
    profile: SearchProfile,
) -> Result<SearchProfile, String> {
    profiles_save_inner(&state.profiles, profile)
}

#[tauri::command]
pub fn profiles_delete(state: State<'_, AppState>, profile_id: String) -> Result<bool, String> {
    profiles_delete_inner(&state.profiles, profile_id)
}

fn profiles_list_inner(profiles: &Mutex<ProfilesStore>) -> Result<Vec<SearchProfile>, String> {
    let store = profiles
        .lock()
        .map_err(|_| "profiles lock poisoned".to_string())?;
    Ok(store.list())
}

fn profiles_save_inner(
    profiles: &Mutex<ProfilesStore>,
    profile: SearchProfile,
) -> Result<SearchProfile, String> {
    let mut store = profiles
        .lock()
        .map_err(|_| "profiles lock poisoned".to_string())?;
    let saved = store.save(profile);
    store.persist()?;
    Ok(saved)
}

fn validate_profile_id(profile_id: &str) -> Result<(), String> {
    if profile_id.is_empty() {
        return Err("profile_id cannot be empty".to_string());
    }
    if profile_id.len() > 64 {
        return Err("profile_id exceeds maximum length of 64 characters".to_string());
    }
    if !profile_id
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        return Err(
            "profile_id must contain only alphanumeric characters, dashes, or underscores"
                .to_string(),
        );
    }
    Ok(())
}

fn profiles_delete_inner(
    profiles: &Mutex<ProfilesStore>,
    profile_id: String,
) -> Result<bool, String> {
    validate_profile_id(&profile_id)?;
    let mut store = profiles
        .lock()
        .map_err(|_| "profiles lock poisoned".to_string())?;
    let deleted = store.delete(&profile_id);
    if deleted {
        store.persist()?;
    }
    Ok(deleted)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::persistence::with_test_data_dir;
    use std::sync::Mutex;

    #[test]
    fn profiles_inner_commands_flow() {
        with_test_data_dir(|| {
            let profiles = Mutex::new(ProfilesStore::default());
            assert!(profiles_list_inner(&profiles).expect("list").is_empty());

            let saved = profiles_save_inner(
                &profiles,
                SearchProfile {
                    name: "dev".to_string(),
                    ..SearchProfile::default()
                },
            )
            .expect("save");
            assert!(!saved.id.is_empty());
            assert_eq!(profiles_list_inner(&profiles).expect("list").len(), 1);
            assert!(profiles_delete_inner(&profiles, saved.id).expect("delete"));
        });
    }

    #[test]
    fn validate_profile_id_rejects_invalid_ids() {
        assert!(validate_profile_id("").is_err());
        assert!(validate_profile_id(&"x".repeat(65)).is_err());
        assert!(validate_profile_id("../etc/passwd").is_err());
        assert!(validate_profile_id("test;rm -rf /").is_err());

        assert!(validate_profile_id("valid-id-123").is_ok());
        assert!(validate_profile_id("profile_name").is_ok());
        assert!(validate_profile_id("ABC123").is_ok());
    }
}
