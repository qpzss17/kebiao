' 我的课表 · 托盘常驻静默启动器
' 用 wscript 跑 powershell，不出现任何黑色命令行窗口
Dim sh, dir, ps1
Set sh = CreateObject("WScript.Shell")
dir = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\kebiao\"
ps1 = dir & "kebiao-tray.ps1"
If Not CreateObject("Scripting.FileSystemObject").FileExists(ps1) Then WScript.Quit 1
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """", 0, False
