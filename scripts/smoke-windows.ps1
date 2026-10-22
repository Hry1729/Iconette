# Launch the built exe, make sure it stays alive, then grab a screenshot.
$ErrorActionPreference = 'Stop'
$exe = 'src-tauri/target/release/iconette.exe'
$p = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 20
if ($p.HasExited) { Write-Error "App exited early with code $($p.ExitCode)" }
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
[System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$bmp.Save("$PWD/smoke-windows.png")
# Global Alt+Space should pop the quick window (best effort: synthesized keys may not reach the hotkey)
try {
  Add-Type -Namespace W -Name K -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, System.UIntPtr e);'
  [W.K]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero); [W.K]::keybd_event(0x20, 0, 0, [System.UIntPtr]::Zero)
  [W.K]::keybd_event(0x20, 0, 2, [System.UIntPtr]::Zero); [W.K]::keybd_event(0x12, 0, 2, [System.UIntPtr]::Zero)
  Start-Sleep -Seconds 3
  $bq = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  [System.Drawing.Graphics]::FromImage($bq).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
  $bq.Save("$PWD/smoke-windows-quick.png")
} catch { Write-Host "quick window capture skipped: $_" }
if ($p.HasExited) { Write-Error "App exited after the quick-window shortcut with code $($p.ExitCode)" }
Stop-Process -Id $p.Id -Force
# Open the NSIS installer (no install) and capture its welcome page
$setup = Get-ChildItem 'src-tauri/target/release/bundle/nsis/Iconette_*-setup.exe' | Select-Object -First 1
if ($setup) {
  $ip = Start-Process -FilePath $setup.FullName -PassThru
  Start-Sleep -Seconds 8
  $bmp2 = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  [System.Drawing.Graphics]::FromImage($bmp2).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
  $bmp2.Save("$PWD/smoke-windows-installer.png")
  Stop-Process -Id $ip.Id -Force -ErrorAction SilentlyContinue
}
Write-Host 'Windows smoke test passed'
