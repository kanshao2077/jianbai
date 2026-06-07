import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = parseInt(process.env.PORT || process.env.DEPLOY_RUN_PORT || '5000', 10);
const DIST_DIR = 'dist';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = createServer((req, res) => {
  // 健康检查端点
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // 处理静态文件
  let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // 移除查询参数
  filePath = filePath.split('?')[0];
  
  // 安全检查：防止目录遍历
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 检查文件是否存在
  if (!existsSync(filePath)) {
    // SPA: 所有未找到的路由返回 index.html
    filePath = join(DIST_DIR, 'index.html');
  }

  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] 见白写作工具已启动，端口: ${PORT}`);
  console.log(`[Server] 访问地址: http://localhost:${PORT}`);
});

// 保持进程活跃
process.on('SIGTERM', () => {
  console.log('[Server] 收到 SIGTERM 信号，准备关闭...');
  server.close(() => {
    console.log('[Server] 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] 收到 SIGINT 信号，准备关闭...');
  server.close(() => {
    console.log('[Server] 服务器已关闭');
    process.exit(0);
  });
});

// 防止未捕获的异常导致进程退出
process.on('uncaughtException', (err) => {
  console.error('[Server] 未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] 未处理的 Promise 拒绝:', reason);
});
