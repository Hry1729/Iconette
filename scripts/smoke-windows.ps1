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
Stop-Process -Id $p.Id -Force
Write-Host 'Windows smoke test passed'
