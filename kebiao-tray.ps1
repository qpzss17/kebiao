# 我的课表 · 托盘常驻（Windows 版）
# 在通知区域（右下角小图标）常驻：双击图标或右键「打开课表」立刻打开网页版课表；
# 每天 20:30 自动调用 pc-reminder.ps1 检查明天有没有早八。
# 与任务计划程序里的 kebiao-reminder 共用 notified 标记文件，同一晚只会提醒一次。
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Dir     = Join-Path $env:LOCALAPPDATA 'kebiao'
$Ps1     = Join-Path $Dir 'pc-reminder.ps1'
$IconPng = Join-Path $Dir 'icon-192.png'
$NextTxt = Join-Path $Dir 'next.txt'
$Log     = Join-Path $Dir 'tray.log'
$Url     = 'https://qpzss17.github.io/kebiao/'

function Log([string]$msg) {
  try { Add-Content -Path $Log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg) -Encoding UTF8 } catch {}
}

# 已经有一个托盘在跑就不再开第二个
$created = $false
$script:mutex = New-Object System.Threading.Mutex($false, 'Local\kebiao-tray', [ref]$created)
if (-not $created) { Log '已有托盘实例在运行，本次退出'; exit 0 }

# 优先复用 Edge 安装 PWA 时留下的快捷方式（带 app-id，能把已开窗口调到前台）
function Find-AppShortcut {
  $roots = @(
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'),
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data\Default')
  )
  $sh = New-Object -ComObject WScript.Shell
  foreach ($r in $roots) {
    if (-not (Test-Path $r)) { continue }
    foreach ($f in (Get-ChildItem $r -Filter *.lnk -Recurse -ErrorAction SilentlyContinue)) {
      try {
        $sc = $sh.CreateShortcut($f.FullName)
        if ($sc.Arguments -match 'qpzss17\.github\.io' -and $sc.Arguments -match 'app-id') {
          if (Test-Path $sc.TargetPath) { return $sc }
        }
      } catch {}
    }
  }
  return $null
}

function Open-Kebiao {
  $sc = Find-AppShortcut
  if ($sc) {
    Start-Process -FilePath $sc.TargetPath -ArgumentList $sc.Arguments | Out-Null
    return
  }
  foreach ($exe in @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe")) {
    if (Test-Path $exe) { Start-Process -FilePath $exe -ArgumentList "--app=$Url" | Out-Null; return }
  }
  Start-Process $Url | Out-Null
}

# 静默跑一次提醒脚本刷新 next.txt（只更新托盘文字，不弹通知）；带 -WithNotify 时正常弹通知
function Run-Reminder([switch]$WithNotify) {
  if (-not (Test-Path $Ps1)) { return }
  $a = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', "`"$Ps1`"")
  if (-not $WithNotify) { $a += '-Quiet' }
  Start-Process powershell.exe -ArgumentList $a -WindowStyle Hidden | Out-Null
}

function Get-Tooltip {
  $t = '我的课表（点击打开）'
  try {
    if (Test-Path $NextTxt) {
      $line = ([IO.File]::ReadAllLines($NextTxt, [Text.Encoding]::UTF8) | Where-Object { $_.Trim() } | Select-Object -First 1)
      if ($line) {
        $line = $line.Trim()
        if ($line.Length -gt 50) { $line = $line.Substring(0, 50) }
        $t = "我的课表 · $line"
      }
    }
  } catch {}
  return $t
}

$ni = New-Object System.Windows.Forms.NotifyIcon
$ni.Icon = [System.Drawing.SystemIcons]::Application
if (Test-Path $IconPng) {
  try {
    # 读进内存后立刻释放文件句柄，否则图片文件会被一直占用，下次更新复制不进去
    $bmp = New-Object System.Drawing.Bitmap $IconPng
    $ni.Icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
    $bmp.Dispose()
  } catch {}
}
$ni.Visible = $true
$ni.Text = Get-Tooltip

$cm = New-Object System.Windows.Forms.ContextMenuStrip
$menuOpen = $cm.Items.Add('打开课表')
$menuNow  = $cm.Items.Add('立即检查明天')
$menuSync = $cm.Items.Add('刷新提示')
[void] $cm.Items.Add('-')
$menuQuit = $cm.Items.Add('退出（不再常驻）')
$ni.ContextMenuStrip = $cm

$script:lastRun  = $null   # 今晚是否已跑过提醒
$script:lastSync = $null   # 上次刷新 next.txt 的时间

$menuOpen.add_Click({ Open-Kebiao })
$menuNow.add_Click({
  $script:lastRun = (Get-Date).Date
  Run-Reminder -WithNotify
})
$menuSync.add_Click({
  $script:lastSync = $null
  Run-Reminder
})
$menuQuit.add_Click({
  $ni.Visible = $false
  $ni.Dispose()
  [System.Windows.Forms.Application]::Exit()
})

$ni.add_MouseDoubleClick({ Open-Kebiao })
$ni.add_BalloonTipClicked({ Open-Kebiao })

function Tick {
  $now = Get-Date
  if ($null -eq $script:lastSync -or ($now - $script:lastSync).TotalMinutes -ge 60) {
    $script:lastSync = $now
    Run-Reminder
  }
  # 20:30 后跑一次早八检查；next.txt 里的日期由 pc-reminder.ps1 决定，标记文件保证一晚只提醒一次
  if ($script:lastRun -ne $now.Date -and $now.Hour -ge 20 -and $now.TimeOfDay.TotalMinutes -ge (20 * 60 + 30) -and $now.TimeOfDay.TotalHours -lt 23) {
    $script:lastRun = $now.Date
    Run-Reminder -WithNotify
    Log '触发 20:30 早八检查'
  }
  $ni.Text = Get-Tooltip
}

$tm = New-Object System.Windows.Forms.Timer
$tm.Interval = 30000
$tm.add_Tick({ Tick })
$tm.Start()
Log '托盘已启动'
Tick
[System.Windows.Forms.Application]::Run()
$ni.Visible = $false
$ni.Dispose()
