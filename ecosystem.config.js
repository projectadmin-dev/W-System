module.exports = {
  apps: [
    {
      name: 'wsystem-1-staging',
      cwd: '/home/ubuntu/apps/wsystem-1/apps/web',
      script: '/home/ubuntu/apps/wsystem-1/node_modules/.bin/next',
      args: 'dev --port 3001 --hostname 0.0.0.0',
      env: {
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_ENV: 'staging',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
      },
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};