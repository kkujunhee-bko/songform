module.exports = {
  apps: [
    {
      name: 'songform-server',
      script: 'src/index.js',        // server/src/index.js 기준
      cwd: './server',               // 실행 디렉토리
      instances: 1,
      autorestart: true,
      watch: false,                  // 프로덕션에서는 watch 비활성화
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 로그 설정
      out_file: './logs/server-out.log',
      error_file: './logs/server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
