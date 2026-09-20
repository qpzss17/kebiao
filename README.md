# 课表 PWA

线上地址：**https://qpzss17.github.io/kebiao/** （仓库 `qpzss17/kebiao`，改完代码重新上传同名文件即覆盖更新）

个人自用课程表。纯静态文件，无构建步骤，数据只存在手机本地（localStorage）。
做成 PWA 是因为：iPhone 上免签名、不过期、不用开发者账号（$99/年），代价是不能发本地推送通知。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 页面骨架：周课表 / 今日 / 管理三个视图 + 课程编辑弹层 |
| `styles.css` | 浅色 + 深色主题，iOS 安全区适配，≥860px 宽屏（电脑）布局 |
| `app.js` | 全部逻辑与数据读写（无框架、无依赖） |
| `sw.js` | 离线缓存：网络优先，离线回退缓存 |
| `manifest.webmanifest` | 桌面图标、全屏启动、主题色 |
| `tools/gen-icon.py` | 重新生成 `icons/*.png`（只用 Python 标准库） |
| `tools/pc-reminder.ps1` + `.vbs` | 电脑版早八通知，由任务计划程序或托盘在每天 20:30 调用；结果写 `next.txt` |
| `tools/kebiao-tray.ps1` + `.vbs` | Windows 托盘常驻：右键/双击秒开网页课表，到点自己跑提醒（只在今天没提醒过时弹通知） |
| `tools/install-tray.ps1` | 一键安装/更新托盘：复制到 `%LOCALAPPDATA%\kebiao`、生成 `kebiao.ico`、写入"登录时自动启动" |

## 本地预览

```bash
py -m http.server 8765      # Windows 上 python 命令是商店占位符，用 py
```

打开 `http://127.0.0.1:8765`。注意：本地地址无法「添加到主屏幕」，也无法在手机上访问，仅用于调试。

## 部署到 GitHub Pages（免费，得到 https 地址）

1. 注册 github.com 账号，新建**公开**仓库，例如 `kebiao`。
2. 在本目录执行：

```bash
git init
git add .
git commit -m "课表 PWA"
git branch -M main
git remote add origin https://github.com/<你的用户名>/kebiao.git
git push -u origin main
```

3. 仓库页面 → Settings → Pages → Build and deployment → Source 选 **Deploy from a branch** → Branch 选 `main` / `/ (root)` → Save。
4. 等约一分钟，访问 `https://<你的用户名>.github.io/kebiao/`。

改完代码只需 `git add . && git commit -m "..." && git push`，手机上重新打开页面即生效。

## 安装到 iPhone

1. 用 **Safari**（微信/Chrome 内打开无效）访问上面的 https 地址。
2. 点底部工具栏的 **分享** 按钮 → 向上滑找到 **添加到主屏幕** → 完成。
3. 桌面图标启动后全屏无地址栏，可离线打开。

## 电脑版（Windows）

同一个网址就是电脑版，不需要另做一份程序：

1. 用 **Edge**（或 Chrome）打开 https://qpzss17.github.io/kebiao/ 。
2. 首次打开会自动载入 `seed.js` 里的课表，不用点任何按钮。
3. 装成桌面应用：地址栏右侧 **…（三个点）→ 应用 → 将此站点安装为应用**，勾选"固定到任务栏"，就有独立窗口和桌面图标，关掉浏览器也能从图标启动、离线可用。
4. 可选：**右下角常驻托盘图标**（见「早八提醒」第 4 条），双击图标即开课表，比开机自动打开整个窗口更省内存。

宽屏（≥860px）下的排版与手机不同：内容居中限宽、课表七列铺开、编辑框变成居中弹窗、按 **Esc** 可关闭弹窗。

## 手机与电脑的数据

两边各存一份 localStorage，**互不同步**，这是刻意设计（避免为了同步去搭账号）。规则很简单：

- 改课表只改 `seed.js` → 上传到仓库 → 另一台设备点 **管理 → 数据 → 载入预设课表**。
- 新设备（含浏览器新建配置文件）第一次打开会自动用 `seed.js` 建表，无需操作。
- 在某一台上单独手动改的课，不会出现在另一台上；`seed.js` 才是主副本。
- 提醒是三路的：iPhone 用 Bark 推送，电脑用 Windows 通知，两边都读同一份 `seed.js`。

## 使用要点

- **开学日期**决定第几周：管理页里改「开学」日期即可，周次自动重算。
- 周课表**点空白格子**可直接新增该星期、该节次的课；**点课程块**编辑。
- 「上课周次」一栏支持不连续写法：`1-16`、`3,6-9,12-16`、`5-7单,8-16`（单=单周，双=双周）。
- 课程多时改 `seed.js` 批量录入，上传后在手机「管理 → 数据 → 载入预设课表」一次覆盖。
- 节次时间（第 N 节几点上课）现在以 `seed.js` 的 `semester.periods` 为准，载入预设课表时会一并同步。
- 换手机前：管理页 → 导出备份（用系统分享存到「文件」或发给自己），新设备导入即可。

## 早八提醒

四处，互相独立，判断标准都是"明天第一节是否 08:30 前上课"：

1. **App 内提示**：「今天」页顶部会显示明天第一节是几点，08:30 前开始标红「明天有早八」，没课显示「明天不用早起」。纯本地计算，离线可用。
2. **iPhone 推送（Bark）**：`.github/workflows/morning-reminder.yml` 每天北京时间 20:30（`cron: 30 12 * * *` UTC）跑一次，读仓库里的 `seed.js` 判断，是早八就推一条通知。
   - 需要在仓库 Settings → Secrets and variables → Actions 里新建名为 `BARK` 的 Secret，值填 Bark App 里显示的完整网址（`https://api.day.app/xxxxx`）。
   - 没配 Secret 时任务会失败并给出提示；不推「没课」的日子，只在真有早八时打扰。
   - 想立刻验证：Actions → 早八提醒 → Run workflow，勾上 `force` 可无视节次强制发一条。
3. **电脑推送（Windows）**：`tools/pc-reminder.ps1` + `tools/pc-reminder.vbs`，由任务计划程序（或下面的托盘）在每天 20:30 调用。
   - 运行时从 `https://qpzss17.github.io/kebiao/seed.js` 下载课表（与手机同一份数据），失败则用 `%LOCALAPPDATA%\kebiao\seed.cache.js` 缓存。
   - 实际安装位置：`%LOCALAPPDATA%\kebiao\`，任务名 `kebiao-reminder`，日志 `%LOCALAPPDATA%\kebiao\reminder.log`。
   - 手动测试：`powershell -ExecutionPolicy Bypass -File pc-reminder.ps1 -Today 2026-09-20 -Force`（`-Force` 无视是否早八都弹）。
   - 卸载：`schtasks /delete /tn kebiao-reminder /f`。
   - 局限：20:30 电脑必须开着且未睡眠，否则那次不补发；专注助手/静音时段会吞掉横幅。
4. **电脑托盘常驻（Windows）**：`tools/kebiao-tray.ps1` + `tools/kebiao-tray.vbs`，由 `tools/install-tray.ps1` 安装并加入"登录时自动启动"。
   - 右下角课表图标：双击或右键「打开课表」直接用 Edge 的应用窗口打开网页版（复用 Edge 留下的带 `app-id` 快捷方式，已开时会调到前台）；悬停文字是 `next.txt` 第一行（明天最早一节课）。
   - 右键「立即检查明天」= 马上跑一次 `pc-reminder.ps1` 并弹通知；「刷新提示」只更新 `next.txt`；「退出（不再常驻）」结束托盘进程。
   - 自带定时器：60 分钟刷新一次 `next.txt`（静默 `-Quiet`，不弹通知），20:30–23:00 之间触发一次带通知的检查。
   - **只改变电脑端**：网页代码没有任何改动，托盘是独立的本地脚本。
   - 与任务计划程序共用 `%LOCALAPPDATA%\kebiao\notified-<明天日期>.flag`，同一晚只会弹一次；两个入口谁先跑谁写标记。`-Force` 会跳过标记但不写标记。
   - 单实例：全局互斥锁 `Local\kebiao-tray`，第二次启动会记一行日志后退出。
   - 卸载：右键托盘图标选「退出（不再常驻）」，再删除 `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\我的课表（后台常驻）.lnk`；`%LOCALAPPDATA%\kebiao\` 里的文件可一并删除。
   - 注意：`.ps1` 必须存成 **带 BOM 的 UTF-8**，否则 PowerShell 5.1 会把中文读成乱码；`icon-192.png` 读入后必须 `Dispose()`，否则文件被占用、下次更新复制不进去。

> 三套解析（`app.js`、workflow 里的 Python、`pc-reminder.ps1`）共用 `seed.js` 的同一套约定：每行一个 `{ name:` 课块、`periods` 数组、`wl` 周次串（`1-16`、`3,6-9`、`5-7单`）。改格式要三处一起改，否则某一台设备的判断会悄悄失真。

## 已知限制

- iOS 网页应用自身不能发本地推送，所以提醒靠 GitHub Actions + Bark 这条外部链路；Bark 的推送到达依赖网络。
- **开机自启时可能显示旧代码**：PWA 在断网状态启动时，Service Worker 只能回退到缓存里的旧 `app.js`，而旧版不认识 `wList/wl` 字段，会把所有周次的课全画在同一列（表现为"课挤成一条一条的窄条、换周次没反应"）。已做三层缓解：`inWeek` 现在会直接解析 `wl` 兜底；`sw.js` 的 `CACHE` 名随发布递增以淘汰旧缓存；页面若离线启动，会在网络恢复时自动 `location.reload()`。手动救急：联网后在应用窗口按 **Ctrl+F5**。**改完数据结构时必须同步递增 `sw.js` 里的 `CACHE` 和 `app.js` 里的 `BUILD`。**
- 管理页底部会显示「本机代码版本 `<BUILD>` · N 门课」，排查"某台设备行为不对"时先看这个数字是否和最新 `BUILD` 一致。
- 若把课程数据只存在一台设备，跨设备不会自动同步——这是刻意选择，避免为了同步去搭账号系统。
