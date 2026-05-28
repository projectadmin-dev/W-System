module.exports = {
  apps: [{
    name: 'wsystem-1',
    script: './node_modules/.bin/next',
    args: 'dev --turbopack --port 3001',
    cwd: '/home/ubuntu/apps/wsystem-1/apps/web',
    env: {
      PORT: '3001',
      NEXT_PUBLIC_APP_URL: 'http://43.153.224.59:3001',
      NODE_ENV: 'development',
    },
    restart_delay: 5000,
    max_restarts: 3,
    watch: false,
  }]
};
