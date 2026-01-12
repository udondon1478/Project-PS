module.exports = {
  apps: [
    {
      name: 'booth-cron',
      script: 'src/scripts/booth-cron.ts',
      interpreter: 'node_modules/.bin/tsx',
      interpreter_args: '--tsconfig tsconfig.json',
      cwd: './',
      exec_mode: 'fork', // Required for custom interpreter
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
