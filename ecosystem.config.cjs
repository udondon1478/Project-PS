module.exports = {
  apps: [
    {
      name: 'booth-cron',
      script: 'src/scripts/booth-cron.ts',
      interpreter: 'node_modules/.bin/ts-node', // Use ts-node to run TypeScript directly
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
