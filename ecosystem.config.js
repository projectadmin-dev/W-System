module.exports = {
  apps: [
    {
      name: 'wsystem-1',
      cwd: '/home/ubuntu/apps/wsystem-1/apps/web',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        NEXT_PUBLIC_PORT: '3001',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/dev/null',
      out_file: '/dev/null',
      log_file: '/home/ubuntu/apps/wsystem-1/pm2.log',
      time: true,
    },
  ],
};
