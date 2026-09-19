import * as migration_20260919_034612_initial_content_platform from './20260919_034612_initial_content_platform';
import * as migration_20260919_042202_beta3_feedback_maintenance from './20260919_042202_beta3_feedback_maintenance';
import * as migration_20260919_145935_beta13_source_learning from './20260919_145935_beta13_source_learning';

export const migrations = [
  {
    up: migration_20260919_034612_initial_content_platform.up,
    down: migration_20260919_034612_initial_content_platform.down,
    name: '20260919_034612_initial_content_platform',
  },
  {
    up: migration_20260919_042202_beta3_feedback_maintenance.up,
    down: migration_20260919_042202_beta3_feedback_maintenance.down,
    name: '20260919_042202_beta3_feedback_maintenance',
  },
  {
    up: migration_20260919_145935_beta13_source_learning.up,
    down: migration_20260919_145935_beta13_source_learning.down,
    name: '20260919_145935_beta13_source_learning'
  },
];
