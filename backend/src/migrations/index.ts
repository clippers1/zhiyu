import * as migration_20260919_034612_initial_content_platform from './20260919_034612_initial_content_platform';

export const migrations = [
  {
    up: migration_20260919_034612_initial_content_platform.up,
    down: migration_20260919_034612_initial_content_platform.down,
    name: '20260919_034612_initial_content_platform'
  },
];
