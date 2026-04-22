module.exports = {
  apps: [
    {
      name: 'wsystem-1',
      cwd: '/home/ubuntu/apps/wsystem-1/apps/web',
      script: 'npx',
      args: 'next start --port 3001',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        NEXT_PUBLIC_PORT: '3001',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '/home/ubuntu/apps/wsystem-1/.env.local',
      log_file: '/home/ubuntu/apps/wsystem-1/pm2.log',
      time: true,
    },
  ],
};
