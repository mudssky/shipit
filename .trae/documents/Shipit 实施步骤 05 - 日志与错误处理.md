# Shipit 实施步骤 05 - 日志与错误处理

## 目标
- 统一日志输出与错误处理策略，兼容 CLI 的 `-v/--verbose`。

## 日志
- 非 verbose：使用进度态（`start/succeed/fail`）。
- verbose：直接输出详细文本上下文。
- 模块：`src/utils/logger.ts`。

## 错误
- 统一异常类型并在失败时设置 `process.exitCode = 1`。
- 模块：`src/utils/errors.ts`。
 - 时机与范围：配置相关错误在命令的 `action` 中按需触发与捕获（懒加载），保证只在使用到对应配置段时才报错并输出统一格式。

## 提示质量
- 错误提示包含上下文与修复建议；与配置校验输出一致。
