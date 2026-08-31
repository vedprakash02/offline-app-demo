fn main() {
    println!("cargo:rerun-if-env-changed=DEMO_TRIAL_MONTHS");
    tauri_build::build()
}
