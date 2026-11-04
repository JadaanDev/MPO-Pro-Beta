use std::process::Command;

pub fn is_mpopro_local_mapped() -> bool {
    let hosts_path = r"C:\Windows\System32\drivers\etc\hosts";
    if let Ok(content) = std::fs::read_to_string(hosts_path) {
        return content.contains("mpobeta.local");
    }
    false
}

fn encode_base64_utf16le(script: &str) -> String {
    let utf16_bytes: Vec<u8> = script
        .encode_utf16()
        .flat_map(|u| u.to_le_bytes())
        .collect();

    const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in utf16_bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };

        out.push(B64[(b0 >> 2) as usize] as char);
        out.push(B64[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        if chunk.len() > 1 {
            out.push(B64[(((b1 & 0x0f) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(B64[(b2 & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

pub fn trigger_elevation() -> Result<String, String> {
    // Self-contained elevated PowerShell script:
    // 1. Reads Windows hosts file
    // 2. Appends 127.0.0.1 mpobeta.local if missing
    // 3. Flushes DNS resolver cache
    // Encoded in Base64 UTF-16LE to completely eliminate quote escaping and argument binding exceptions
    let inner_script = "$hosts = \"$env:SystemRoot\\System32\\drivers\\etc\\hosts\"; if (Test-Path $hosts) { $c = Get-Content $hosts -Raw; if ($c -notmatch '\\bmpobeta\\.local\\b') { Add-Content -Path $hosts -Value \"`r`n# MPO-pro Beta Overlay Domain Alias`r`n127.0.0.1`tmpobeta.local\" } }; Clear-DnsClientCache";
    let encoded = encode_base64_utf16le(inner_script);

    let ps_command = format!(
        "Start-Process powershell.exe -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', '{}' -Verb RunAs",
        encoded
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_command])
        .output()
        .map_err(|e| format!("Failed to spawn elevation prompt: {}", e))?;

    if output.status.success() {
        Ok("UAC prompt triggered. Approve in Windows to register mpobeta.local".to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("UAC trigger failed: {}", err))
    }
}

pub fn trigger_deactivation() -> Result<String, String> {
    // Elevated PowerShell script to cleanly purge mpobeta.local and flush DNS cache
    let inner_script = "$hosts = \"$env:SystemRoot\\System32\\drivers\\etc\\hosts\"; if (Test-Path $hosts) { $lines = Get-Content $hosts | Where-Object { $_ -notmatch 'mpobeta\\.local' -and $_ -notmatch 'MPO-pro Beta Overlay Domain Alias' }; Set-Content -Path $hosts -Value $lines -Force }; Clear-DnsClientCache";
    let encoded = encode_base64_utf16le(inner_script);

    let ps_command = format!(
        "Start-Process powershell.exe -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', '{}' -Verb RunAs",
        encoded
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_command])
        .output()
        .map_err(|e| format!("Failed to spawn deactivation prompt: {}", e))?;

    if output.status.success() {
        Ok("UAC prompt triggered. mpobeta.local deactivated".to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("UAC trigger failed: {}", err))
    }
}
