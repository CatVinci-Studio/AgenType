use base64::Engine;
use enigo::{Enigo, KeyboardControllable};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[tauri::command]
fn insert_text(text: String) -> Result<(), String> {
    let mut enigo = Enigo::new();
    enigo.key_sequence(&text);
    Ok(())
}

#[tauri::command]
fn trigger_screenshot() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("screencapture")
            .args(["-i", "-c"])
            .status()
            .map_err(|error| format!("failed to launch screenshot tool: {error}"))?;
        if !status.success() {
            return Err("screenshot tool exited with a failure".to_string());
        }
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        let status = Command::new("explorer.exe")
            .arg("ms-screenclip:")
            .status()
            .map_err(|error| format!("failed to launch screenshot tool: {error}"))?;
        if !status.success() {
            return Err("screenshot tool exited with a failure".to_string());
        }
        return Ok(());
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    Err("screenshot capture is not supported on this platform".to_string())
}

#[tauri::command]
fn system_ocr(image_base64: String) -> Result<String, String> {
    let image_path = write_temp_image(&image_base64)?;
    let result = perform_system_ocr(&image_path);
    if let Err(error) = fs::remove_file(&image_path) {
        eprintln!("failed to cleanup temp image: {error}");
    }
    result
}

fn write_temp_image(image_base64: &str) -> Result<PathBuf, String> {
    let engine = base64::engine::general_purpose::STANDARD;
    let bytes = engine
        .decode(image_base64)
        .map_err(|error| format!("invalid base64 image: {error}"))?;
    let mut path = std::env::temp_dir();
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("time error: {error}"))?
        .as_millis();
    path.push(format!("agentype-ocr-{suffix}.png"));
    fs::write(&path, bytes).map_err(|error| format!("failed to write temp image: {error}"))?;
    Ok(path)
}

fn perform_system_ocr(image_path: &PathBuf) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        return macos_ocr(image_path);
    }

    #[cfg(target_os = "windows")]
    {
        return windows_ocr(image_path);
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = image_path;
        Err("system OCR is not supported on this platform".to_string())
    }
}

#[cfg(target_os = "macos")]
fn macos_ocr(image_path: &PathBuf) -> Result<String, String> {
    let script = r#"
import Vision
import AppKit
import Foundation

let imagePath = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: imagePath) else {
  exit(1)
}
var rect = CGRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
  exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

let results = request.results as? [VNRecognizedTextObservation] ?? []
let text = results.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
print(text)
"#;

    let mut script_path = std::env::temp_dir();
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("time error: {error}"))?
        .as_millis();
    script_path.push(format!("agentype-ocr-{suffix}.swift"));
    fs::write(&script_path, script)
        .map_err(|error| format!("failed to write swift script: {error}"))?;

    let output = Command::new("swift")
        .arg(&script_path)
        .arg(image_path)
        .output()
        .map_err(|error| format!("failed to run swift: {error}"))?;

    if let Err(error) = fs::remove_file(&script_path) {
        eprintln!("failed to cleanup temp script: {error}");
    }

    if !output.status.success() {
        return Err("macOS OCR failed to run".to_string());
    }

    String::from_utf8(output.stdout).map_err(|error| format!("OCR output error: {error}"))
}

#[cfg(target_os = "windows")]
fn windows_ocr(image_path: &PathBuf) -> Result<String, String> {
    let script = r#"
$ErrorActionPreference = 'Stop'
$path = $args[0]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine,Windows.Media.Ocr,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataWriter,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null

$bytes = [System.IO.File]::ReadAllBytes($path)
$stream = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
$writer = [Windows.Storage.Streams.DataWriter]::new($stream)
$writer.WriteBytes($bytes)
$writer.StoreAsync().GetAwaiter().GetResult() | Out-Null
$stream.Seek(0)

$decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()
$softwareBitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($engine -eq $null) {
  throw 'OCR engine unavailable'
}
$result = $engine.RecognizeAsync($softwareBitmap).GetAwaiter().GetResult()
$result.Text
"#;

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            script,
            image_path.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|error| format!("failed to run powershell: {error}"))?;

    if !output.status.success() {
        return Err("Windows OCR failed to run".to_string());
    }

    String::from_utf8(output.stdout).map_err(|error| format!("OCR output error: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            }

            let salt_path = app
                .path()
                .app_local_data_dir()
                .map_err(|error| error.to_string())?
                .join("salt.txt");
            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            insert_text,
            trigger_screenshot,
            system_ocr
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
