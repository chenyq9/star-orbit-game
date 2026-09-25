# STAR ORBIT

一款仅包含三个精制关卡的 Android 轨道谜题游戏。玩法严格基于 `circle.html`、`circle3.html`、`circle4.html`：旋转离散圆轨，天体通过轨道交点换轨，恢复稳定构型。

## 可解性

每关先定义规范终局，再施加固定、可逆的旋转序列生成初始盘面。逆序回放必然恢复终局，因此显示的是“保证解步数上界”，不是未经证明的最优步数。验证脚本位于 `tools/verify3.js`。

## 构建

推送到 `main` 后，GitHub Actions 自动执行 `./gradlew assembleDebug` 并上传 APK artifact。
