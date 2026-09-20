# 课表早八提醒（Windows 版）
# 每天被任务计划程序/托盘调用一次：从 GitHub Pages 下载 seed.js，判断明天第一节是否 08:30 前上课，
# 是就弹一条 Windows 通知。没网时用上次缓存的课表。
# 参数：-Today 2026-09-20 指定"今天"用于测试；-Force 无论是否早八都弹；-Quiet 只刷新 next.txt 不弹通知。
param(
  [string]$Today = '',
  [switch]$Force,
  [switch]$Quiet
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Url   = 'https://qpzss17.github.io/kebiao/seed.js'
$Dir   = Join-Path $env:LOCALAPPDATA 'kebiao'
$Cache = Join-Path $Dir 'seed.cache.js'
$Log   = Join-Path $Dir 'reminder.log'
$Next  = Join-Path $Dir 'next.txt'
$Early = 8 * 60 + 30
$DayNames = '周一', '周二', '周三', '周四', '周五', '周六', '周日'

if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir | Out-Null }

# "今天"是哪天：测试时可指定。明天上什么课全部由这两个值推出来
if ($Today) { $baseDate = [datetime]::ParseExact($Today, 'yyyy-MM-dd', $null) } else { $baseDate = (Get-Date).Date }
$tomorrow = $baseDate.AddDays(1)
$Flag = Join-Path $Dir ("notified-{0}.flag" -f $tomorrow.ToString('yyyy-MM-dd'))

# 托盘和计划任务都会调用本脚本：今晚已经提醒过就直接静默退出，不用浪费一次网络请求
if (-not $Force -and -not $Quiet -and (Test-Path $Flag)) { exit 0 }

function Log([string]$msg) {
  try { Add-Content -Path $Log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg) -Encoding UTF8 } catch {}
}

function Notify([string]$title, [string]$text) {
  if ($Quiet) { return }
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $ni = New-Object System.Windows.Forms.NotifyIcon
  $ni.Icon = [System.Drawing.SystemIcons]::Information
  $ni.Visible = $true
  $ni.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Warning
  $ni.BalloonTipTitle = $title
  $ni.BalloonTipText = $text
  $ni.ShowBalloonTip(12000)
  $end = (Get-Date).AddSeconds(13)
  while ((Get-Date) -lt $end) {
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 150
  }
  $ni.Visible = $false
  $ni.Dispose()
}

function StrField([string]$txt, [string]$key) {
  $m = [regex]::Match($txt, "$key\s*:\s*'([^']*)'"); if ($m.Success) { $m.Groups[1].Value } else { '' }
}
function NumField([string]$txt, [string]$key, [int]$def) {
  $m = [regex]::Match($txt, "$key\s*:\s*(\d+)"); if ($m.Success) { [int]$m.Groups[1].Value } else { $def }
}
function ToMin([string]$t) { $p = $t.Split(':'); [int]$p[0] * 60 + [int]$p[1] }
function Fmt([int]$mins) { '{0:D2}:{1:D2}' -f [int][Math]::Floor($mins / 60), ($mins % 60) }
function MondayOf([datetime]$d) { $d.Date.AddDays(-((([int]$d.DayOfWeek + 6) % 7))) }

# 与 app.js / GitHub Action 里的 parseWl 保持同一套语法：1-16、3,6-9、5-7单
function ParseWl([string]$text, [int]$maxw) {
  $set = New-Object 'System.Collections.Generic.HashSet[int]'
  foreach ($raw0 in ($text -split '[,，、;；\s]+')) {
    $tok = ($raw0 -replace '[本次周]', '').Trim()
    if (-not $tok) { continue }
    $odd = $null
    $pm = [regex]::Match($tok, '[（(]?([单双])[)）]?$')
    if ($pm.Success) { $odd = ($pm.Groups[1].Value -eq '单'); $tok = $tok.Substring(0, $pm.Index).Trim() }
    $rm = [regex]::Match($tok, '^(\d+)(?:[-~—](\d+))?$')
    if (-not $rm.Success) { continue }
    $a = [int]$rm.Groups[1].Value
    if ($rm.Groups[2].Success) { $b = [int]$rm.Groups[2].Value } else { $b = $a }
    $a = [Math]::Max(1, [Math]::Min($a, $maxw))
    $b = [Math]::Max(1, [Math]::Min($b, $maxw))
    for ($w = [Math]::Min($a, $b); $w -le [Math]::Max($a, $b); $w++) {
      if ($null -eq $odd -or ((($w % 2) -eq 1) -eq $odd)) { [void]$set.Add($w) }
    }
  }
  return ,$set
}

$raw = $null
try {
  $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 25
  $raw = $resp.Content
  [IO.File]::WriteAllText($Cache, $raw, (New-Object Text.UTF8Encoding $true))
} catch {
  Log "下载失败，改用缓存：$($_.Exception.Message)"
}
if (-not $raw -and (Test-Path $Cache)) { $raw = [IO.File]::ReadAllText($Cache, [Text.Encoding]::UTF8) }
if (-not $raw) { Notify '课表提醒' '既没连上网络也没有缓存的课表数据，稍后再试。'; exit 1 }

$head = $raw
$cIdx = $raw.IndexOf('courses:')
if ($cIdx -gt 0) { $head = $raw.Substring(0, $cIdx) }

$startTxt = StrField $head 'start'
$weeks = NumField $head 'weeks' 20
$days = NumField $head 'days' 5
$pmBlock = [regex]::Match($head, "periods\s*:\s*\[([\s\S]*?)\]")
$times = @()
if ($pmBlock.Success) {
  foreach ($m in [regex]::Matches($pmBlock.Groups[1].Value, "(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})")) {
    $times += , @($m.Groups[1].Value, $m.Groups[2].Value)
  }
}
if (-not $startTxt -or -not $times.Count) { Notify '课表提醒' '课表数据读不出学期或节次时间。'; exit 1 }

$courses = @()
foreach ($line in ($raw -split "`n")) {
  $t = $line.Trim()
  if (-not $t.StartsWith('{ name:')) { continue }
  $wlTxt = StrField $t 'wl'
  if (-not $wlTxt) { $wlTxt = "1-$weeks" }
  $courses += [pscustomobject]@{
    name    = StrField $t 'name'
    teacher = StrField $t 'teacher'
    loc     = StrField $t 'loc'
    day     = NumField $t 'day' 1
    start   = NumField $t 'start' 1
    wl      = $wlTxt
    wset    = ParseWl $wlTxt $weeks
  }
}

$anchor = [datetime]::ParseExact($startTxt, 'yyyy-MM-dd', $null)
$spanDays = [int]([TimeSpan](($tomorrow.Date) - (MondayOf $anchor))).Days
$week = [int][Math]::Floor($spanDays / 7) + 1
$isoDay = (([int]$tomorrow.DayOfWeek + 6) % 7) + 1
$when = "$($tomorrow.ToString('M月d日')) $($DayNames[$isoDay - 1])"

$list = @()
if ($week -ge 1 -and $week -le $weeks -and $isoDay -le $days) {
  foreach ($c in $courses) {
    if ($c.day -ne $isoDay) { continue }
    if (-not $c.wset.Contains($week)) { continue }
    $sMin = 0
    if ($c.start -ge 1 -and $c.start -le $times.Count) { $sMin = ToMin $times[$c.start - 1][0] } else { $sMin = ($c.start - 1) * 60 }
    $list += [pscustomobject]@{ Min = $sMin; C = $c }
  }
  $list = @($list | Sort-Object Min)
}

# 把结果写进 next.txt，第一行给托盘悬停用，其余是明天全天课次
$lines = @()
if (-not $list.Count) {
  $lines += "$when 没有课"
} else {
  $f = $list[0]
  $head1 = "$when · 最早 $(Fmt $f.Min) $($f.C.name)"
  if ($f.C.loc) { $head1 += " · $($f.C.loc)" }
  $head1 += " · 全天 $($list.Count) 节"
  $lines += $head1
  foreach ($it in $list) {
    $l = "$(Fmt $it.Min) $($it.C.name)"
    if ($it.C.loc) { $l += "  @ $($it.C.loc)" }
    if ($it.C.teacher) { $l += "  $($it.C.teacher)" }
    $lines += $l
  }
}
try { [IO.File]::WriteAllLines($Next, $lines, (New-Object Text.UTF8Encoding $true)) } catch {}

Log "第 $week 周 $when 共 $($list.Count) 节，最早 $(if($list.Count){Fmt $list[0].Min}else{'无课'})"
if ($Quiet) { exit 0 }

if (-not $list.Count) {
  if ($Force) { Notify '明天不用早起' "$when 没有课" }
  exit 0
}

$first = $list[0]
$timeTxt = Fmt $first.Min
$body = "$when · $($first.C.name) $timeTxt 上课"
if ($first.C.loc) { $body += " · $($first.C.loc)" }
if ($first.C.teacher) { $body += " · $($first.C.teacher)" }
$body += " · 全天共 $($list.Count) 节"

if (Test-Path $Flag) { exit 0 }   # 上一步下载期间另一个入口已经提醒过了

if ($first.Min -le $Early) {
  Notify "明天有早八 $timeTxt" $body
  Log '已弹早八通知'
  if (-not $Force) { Set-Content -Path $Flag -Value (Get-Date -Format 'HH:mm:ss') -Encoding UTF8 }
} elseif ($Force) {
  Notify "明天第一节 $timeTxt" $body
  Log 'force 通知'
} else {
  Log "明天第一节 $($timeTxt) 不算早八，静默"
  if (-not $Force) { Set-Content -Path $Flag -Value (Get-Date -Format 'HH:mm:ss') -Encoding UTF8 }
}
