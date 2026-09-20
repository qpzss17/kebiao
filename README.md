# 课表 PWA

个人自用课程表。纯静态文件，无构建步骤，数据只存在手机本地（localStorage）。
做成 PWA 是因为：iPhone 上免签名、不过期、不用开发者账号（$99/年），代价是不能发本地推送通知。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 页面骨架：周课表 / 今日 / 管理三个视图 + 课程编辑弹层 |
| `styles.css` | 浅色 + 深色主题，iOS 安全区适配 |
| `app.js` | 全部逻辑与数据读写（无框架、无依赖） |
| `sw.js` | 离线缓存：网络优先，离线回退缓存 |
| `manifest.webmanifest` | 桌面图标、全屏启动、主题色 |
| `tools/gen-icon.py` | 重新生成 `icons/*.png`（只用 Python 标准库） |

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

## 使用要点

- **开学日期**决定第几周：管理页里改「开学」日期即可，周次自动重算。
- 周课表**点空白格子**可直接新增该星期、该节次的课；**点课程块**编辑。
- 单周/双周课程在表单里选「周次类型」。
- 节次时间（第 N 节几点上课）在管理页可逐条改，影响「今日」视图的进行中判断与倒计时。
- 换手机前：管理页 → 导出备份（用系统分享存到「文件」或发给自己），新设备导入即可。

## 已知限制

- iOS 网页应用不能发本地推送，所以不会在上课前弹通知；「今日」页会显示下一节倒计时，需要自己点开看。
- 若把课程数据只存在一台设备，跨设备不会自动同步——这是刻意选择，避免为了同步去搭账号系统。
- 修改 `styles.css` / `app.js` 后如果页面没更新，重开一次即可；`sw.js` 采用网络优先策略，不会长期卡在旧版本。
