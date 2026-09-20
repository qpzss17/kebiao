# 我的课表 · 托盘常驻 安装脚本（一次性运行，可重复运行）
# 作用：把 pc-reminder.ps1 / kebiao-tray.ps1 / 图标 复制到 %LOCALAPPDATA%\kebiao，
#      并加入"开机自启"（登录时静默启动托盘）+ 开始菜单快捷方式。
$ErrorActionPreference = 'Stop'
chcp 65001 > $null 2>&1

$Src  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dir  = Join-Path $env:LOCALAPPDATA 'kebiao'
$Log  = Join-Path $Dir 'install.log'
if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir | Out-Null }

function Say([string]$m) {
  Write-Host $m
  try { Add-Content -Path $Log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) -Encoding UTF8 } catch {}
}

# 卸载：删掉「启动」文件夹里的"我的课表（后台常驻）.lnk"，再右键托盘图标选"退出"
# 先停掉正在运行的托盘，否则它占着文件复制不进去
$old = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'kebiao-tray\.ps1' })
foreach ($r in $old) { try { Stop-Process -Id $r.ProcessId -Force; Say "停止旧托盘 PID $($r.ProcessId)" } catch {} }
if ($old.Count) { Start-Sleep -Milliseconds 800 }

foreach ($f in @('pc-reminder.ps1', 'pc-reminder.vbs', 'kebiao-tray.ps1', 'kebiao-tray.vbs', 'icon-192.png')) {
  $s = Join-Path $Src $f
  if (Test-Path $s) { Copy-Item $s -Destination $Dir -Force; Say "复制 $f" } else { Say "缺少 $f（跳过）" }
}
# 托盘/快捷方式的图标：从 png 生成一个 .ico
$Ico = Join-Path $Dir 'kebiao.ico'
try {
  Add-Type -AssemblyName System.Drawing
  $bmp = New-Object System.Drawing.Bitmap (Join-Path $Dir 'icon-192.png')
  $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
  $fs = [IO.File]::Create($Ico); $icon.Save($fs); $fs.Close()
  $bmp.Dispose()
  Say "生成图标 kebiao.ico"
} catch { $Ico = "$env:SystemRoot\System32\shell32.dll,14" ; Say "生成图标失败，改用系统图标" }

$sh = New-Object -ComObject WScript.Shell
function Make-Shortcut([string]$path, [string]$target, [string]$argLine, [string]$desc) {
  $sc = $sh.CreateShortcut($path)
  $sc.TargetPath = $target
  $sc.Arguments = $argLine
  $sc.WorkingDirectory = $Dir
  $sc.Description = $desc
  $sc.IconLocation = $Ico
  $sc.Save()
  Say "快捷方式 $path"
}

$Vbs = Join-Path $Dir 'kebiao-tray.vbs'
$Wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
$startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
$programs = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
Make-Shortcut (Join-Path $startup '我的课表（后台常驻）.lnk') $Wscript "`"$Vbs`"" '登录时自动在右下角显示课表图标'
Make-Shortcut (Join-Path $programs '我的课表（后台常驻）.lnk') $Wscript "`"$Vbs`"" '启动课表托盘'
Say '已加入开机自启 + 开始菜单快捷方式'
Start-Process $Wscript -ArgumentList "`"$Vbs`"" | Out-Null
Say '完成：右下角应出现课表图标'
