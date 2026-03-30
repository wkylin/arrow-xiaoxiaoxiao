# 箭阵消消消

这是一个已经改成 `Vite + React` 结构的竖屏 H5 小游戏原型。

## 版权与使用说明

这个源码仓默认不对外授权，也不是一个可自由复用的开源项目。

- 仓库代码、玩法设计、视觉表现和文案默认保留全部权利。
- 未经书面许可，不允许复制、修改、二次发布、商用或部署衍生版本。
- 具体约束见根目录 [LICENSE](./LICENSE)。

当前推荐结构已经是“私有源码仓 + 公共发布仓”，详细说明见 [docs/private-source-pages-plan.md](./docs/private-source-pages-plan.md)。

## 技术栈

- `Vite`
- `React`
- 原生 `Web Audio API`
- 纯 CSS 粒子/飘字反馈

## 构建配置

- 已新增 `vite.config.js`，启用 `@vitejs/plugin-react`。
- 开发服务器与预览服务器都开启了 `host: true`，方便手机同局域网调试竖屏 H5。
- `build.target` 设为 `es2020`，兼顾现代移动端浏览器。

## 当前玩法

- `经典连锁`：计时冲分，达标自动升关并补时。
- `爆爽闯关`：更像爆款闯关玩法，需要同时打够分数并收集星钻。
- `无尽模式`：没有倒计时和步数上限，支持自定义 `4×4` 到 `12×12` 棋盘，也支持 `随机种子 / 每日挑战码`，同一码可反复挑战同一盘。
- 狂热（FEVER）：能量满后进入更宽松、高收益状态。
- 特殊格：`◆ 星钻`、`+ 续航`、`⚡ 电核`。

## 难度等级

- `入门级`：默认 `4×4` 方盘，`2` 格起消，特殊格更多，适合先摸清规则。
- `简单`：默认 `5×5` 方盘，规则更宽松，适合稳定上手。
- `中等难度`：默认 `7×7` 方盘，标准体验，数值最均衡。
- `较难`：默认 `8×8` 方盘，普通状态要更长路径，资源更少。
- `特难`：默认 `10×10` 方盘，目标更高、特殊格更少，适合极限挑战。

所有预设难度都使用方形棋盘来平衡横向与纵向路径空间；除了棋盘尺寸，还会同步调整目标分数、时间/步数、特殊格密度和重组成本。无尽模式额外开放 `4×4` 到 `12×12` 的自定义棋盘尺寸，方便练手和挑战大盘。

## 挑战码规则

- 仅 `无尽模式` 开放挑战种子、随机新盘和每日挑战。
- `同一码 + 同难度 + 同棋盘尺寸` 会生成同一盘面，适合反复练习或分享给朋友。
- `随机新盘` 也会生成一条当前挑战码，记下后可再输入复盘。
- `今日挑战码` 固定为 `DAY-YYYYMMDD`，例如 `DAY-20260329`。
- `复制挑战码` 可以直接把当前盘码发给别人；`二维码分享` 会弹出扫码卡片，并自动带上当前无尽配置、棋盘尺寸和挑战码。
- 二维码弹层里还可以继续 `复制链接` 或走系统分享。
- 打开分享链接或扫码后，会直接进入同一张无尽盘面。
- 如果玩家操作顺序也一致，整局随机补牌过程也会保持一致。

## 页面信息架构

- 首屏只保留：当前目标、棋盘、核心操作，让玩家一眼就知道“先点格子开始玩”。
- 完整说明、模式切换、难度切换、挑战码与分享全部收进底部抽屉，需要时再打开。
- 首次进入会弹出一个 `3 秒上手` 轻量引导层，只讲 3 句话：点起点、看数字、够格数就消除。
- 主界面持续保留一条极短规则条和一个 `怎么玩？` 入口，避免玩家迷路，又不打断游玩节奏。

## 项目结构

- `index.html`：Vite 入口 HTML。
- `src/main.js`：React 挂载入口。
- `src/App.js`：页面主入口，只负责拼装页面和派发状态。
- `src/useArrowGame.js`：游戏主 hook，保留核心状态流与交互主流程。
- `src/gameCore.js`：纯算法与数值配置。
- `src/game/session.js`：本地存档、挑战码、分享链接、启动态组装。
- `src/game/hints.js`：提示链路与轻量异步辅助。
- `src/game/effects.js`：音效、粒子、飘字与棋盘震动特效。
- `src/game/clearResolution.js`：清除结算、升级、预览描述与失败收口。
- `src/game/gameSetup.js`：开局状态构建、模式切换、棋盘尺寸与种子切换。
- `src/game/share.js`：挑战码复制、系统分享、分享弹层开关。
- `src/ui/helpers.js`：UI 格式化与棋盘尺寸样式工具。
- `src/ui/sections.js`：页面各功能区块组件。
- `src/ui/components/`：基础 UI 组件、棋盘格组件、二维码弹层组件。
- `src/qrCode.js`：本地二维码生成逻辑。
- `src/styles.css`：样式与动画。

## 本地运行

先安装依赖：

```bash
pnpm install
```

开发模式：

```bash
pnpm dev
```

打包：

```bash
pnpm build
```

预览打包结果：

```bash
pnpm preview
```

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy-pages.yml` 工作流。

- 源码仓：`wkylin/arrow-xiaoxiaoxiao-src`
- 站点仓：`wkylin/arrow-xiaoxiaoxiao-site`
- 推送到源码仓 `main` 分支后，会自动构建并把 `dist/` 发布到站点仓的 `gh-pages` 分支。
- 源码仓需要配置一个仓库 Secret：`PUBLIC_SITE_PAT`
- 这个 Token 需要对 `wkylin/arrow-xiaoxiaoxiao-site` 拥有写权限。
- 站点仓的 Pages Source 需要切到 `Deploy from a branch`，并选择 `gh-pages` 分支的 `/ (root)`。
- `vite.config.ts` 已改为相对 `base`，适合直接挂在 GitHub Pages 项目路径下。

## 源码保护建议

如果你准备长期做这个项目，建议不要继续把开发主仓放在 public。

- 开发主仓改为 `private`
- 新建一个全新的 `public` 仓，只放打包后的静态产物
- Pages 只从公共发布仓发布
- 详细迁移步骤见 [docs/private-source-pages-plan.md](./docs/private-source-pages-plan.md)
