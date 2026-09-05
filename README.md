# 白色小狗桌面宠物

一个基于 Electron 的透明 Linux 桌面宠物。小狗可以拖动、漫游、互动，并使用同一套 150×150 画布播放待机、行走和动作帧。

## 使用的开源组件

- Electron：透明置顶窗口、拖拽和桌面集成。
- 原生 JavaScript / HTML / CSS：没有引入 React、Vue 等运行时。
- ImageMagick：开发阶段裁切、统一尺寸和校正透明 PNG。
- electron-builder：生成 Electron 的 Linux 解包目录。
- dpkg-deb：把解包目录、应用图标和 `.desktop` 文件打成 Debian 包。

没有引入 BongoCat 运行时。BongoCat 更适合作为键盘/鼠标状态动画组件；本项目的动作来自现有小狗素材，直接复用会增加适配层而不会改善桌宠识别或打包。

## 启动与测试

```bash
npm install
npm start
npm test
```

测试覆盖素材路径、统一 150×150 画布、动作帧、窗口边界、Codex 桌宠清单和 Debian 打包配置。

## 生成 Debian 安装包

```bash
npm run dist
```

输出为 `dist/puppy-desktop-pet-1.0.0.deb`。流程先用本地 Electron 生成 `dist/linux-unpacked`，再用仓库内的 `tools/build-deb.sh` 生成 Debian 包，因此不依赖远程下载 fpm。安装包包含：

- `/opt/puppy-desktop-pet/`：Electron 应用。
- `/usr/share/applications/puppy-desktop-pet.desktop`：应用菜单入口。
- `/usr/share/icons/hicolor/256x256/apps/puppy-desktop-pet.png`：由主图生成的应用图标。

安装：

```bash
sudo dpkg -i dist/puppy-desktop-pet-1.0.0.deb
```

## Codex 自定义桌宠

仓库中的 `custom-pet/puppy/` 是 Codex v2 桌宠资源，包含 `pet.json` 和经过透明边缘清理的 `spritesheet.webp`。安装到当前用户的 Codex 桌宠目录：

```bash
sh tools/install-codex-pet.sh
```

默认安装到 `/home/kylin/.codex/pets/puppy/`；如果设置了 `CODEX_HOME`，则安装到对应的 `$CODEX_HOME/pets/puppy/`。安装后在 Codex 的设置 → 宠物中选择“白色小狗”。

Codex 桌宠浮层支持点击后的紧凑控制面板；完整 Quick Chat 输入面板由 Codex 宿主能力开关控制，不能通过自定义 `pet.json` 强行启用。

## 素材约束

趴下、握手和休息帧会先裁切角色，再统一缩放到 150×150 画布，避免动作帧看起来比其他状态大一圈。休息帧也经过颜色校正，与其余小狗素材保持一致的白色毛发观感。
