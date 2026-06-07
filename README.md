# 见白

一个轻量写作工作台。

它适合把一段素材慢慢拆成草稿、二稿和最终稿。页面分成多列，内容会自动保存在你自己的浏览器里，不需要登录，也不需要后端服务。

在线访问：

https://kanshao2077.github.io/jianbai/

<img width="4186" height="2248" alt="CleanShot 2026-06-07 at 14 41 05@2x" src="https://github.com/user-attachments/assets/760a044f-d753-4a50-9a37-1255f94b9687" />


## 它能做什么

- 多列写作：素材、草稿、修改稿、成稿分开写。
- 自动保存：内容存在浏览器本地，刷新页面也还在。
- 一键复制：点进某一列后，可以复制当前列内容。
- 一键清空：需要重写时，可以清掉本地保存的内容。
<img width="2564" height="2680" alt="CleanShot 2026-06-07 at 14 41 29@2x" src="https://github.com/user-attachments/assets/ffe110c0-9673-4af1-aa7c-08b9ba1385db" />


## 注意

内容只保存在当前浏览器里。

换电脑、换浏览器、清理浏览器数据，都可能导致内容丢失。重要内容写完后，及时复制到文档里保存。

## 本地运行

需要先安装 Node.js，建议 20 或以上版本。

```bash
npm install --no-package-lock
npm run dev
```

打开终端里显示的网址，就能在本地预览。

## 打包

```bash
npm run build
```

打包结果会生成在 `dist` 目录。

## 部署到 GitHub Pages

这个仓库已经带了 GitHub Pages 自动部署配置。

以后只要把代码推送到 `main` 分支，GitHub 会自动打包并发布到：

https://kanshao2077.github.io/jianbai/

## 来源

这个项目来自秒哒导出的源码包。

原应用链接：

https://www.miaoda.cn/projects/app-8cb8oymsg7wh
