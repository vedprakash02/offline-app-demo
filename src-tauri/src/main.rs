// Windows par release mode me extra console window na khule, isiliye yeh zaroori hai
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    vidya_prabandh_demo_lib::run()
}
