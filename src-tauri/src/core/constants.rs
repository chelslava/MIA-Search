pub const MAX_INDEX_ENTRIES: usize = 1_000_000;
pub const MAX_INDEX_SIZE_MB: usize = 500;
pub const ENTRY_OVERHEAD_BYTES: usize = 512;

pub const MAX_REGEX_PATTERN_LENGTH: usize = 512;
pub const MAX_WILDCARD_COUNT: usize = 32;
pub const REGEX_CACHE_SIZE: usize = 64;

pub const MAX_QUERY_LENGTH: usize = 1024;
pub const MAX_ROOTS: usize = 50;
pub const MAX_EXTENSIONS: usize = 20;
pub const MAX_EXCLUDE_PATHS: usize = 50;
pub const MAX_EXCLUDE_PATH_LENGTH: usize = 256;

pub const MAX_SCAN_WORKERS: usize = 12;
pub const BATCH_SIZE: usize = 100;
pub const FIRST_BATCH_SIZE: usize = 20;
